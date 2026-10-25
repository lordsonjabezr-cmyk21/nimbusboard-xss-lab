import test from "node:test";
import assert from "node:assert/strict";

const API = "http://127.0.0.1:4000";

test("GET /health returns status and DB health", async () => {
  const res = await fetch(`${API}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(typeof data.mode, "string");
  assert.equal(data.database.ok, true);
  assert.equal(data.database.ready, true);
});

test("POST /api/auth/login validates credentials and sets token", async () => {
  // Successful login as Ari (admin)
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "ari", password: "AriAdmin2026!" })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.username, "ari");
  assert.equal(data.user.role, "admin");

  // Failed login
  const badRes = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "ari", password: "WrongPassword!" })
  });
  assert.equal(badRes.status, 401);
});

test("Server-side RBAC enforces role permissions on admin routes", async () => {
  // Unauthenticated request should be 401
  const anonRes = await fetch(`${API}/api/admin/feedback`);
  assert.equal(anonRes.status, 401);

  // Regular user (Mira) should be 403 Forbidden
  const userRes = await fetch(`${API}/api/admin/feedback`, {
    headers: { Authorization: "Bearer token-mira" }
  });
  assert.equal(userRes.status, 403);

  // Moderator (Noah) should be allowed (200)
  const modRes = await fetch(`${API}/api/admin/feedback`, {
    headers: { Authorization: "Bearer token-noah" }
  });
  assert.equal(modRes.status, 200);

  // Admin (Ari) should be allowed (200)
  const adminRes = await fetch(`${API}/api/admin/feedback`, {
    headers: { Authorization: "Bearer token-ari" }
  });
  assert.equal(adminRes.status, 200);
});

test("Kanban Tasks API allows listing, creating, and moving tasks", async () => {
  const listRes = await fetch(`${API}/api/tasks`);
  assert.equal(listRes.status, 200);
  const tasks = await listRes.json();
  assert.ok(Array.isArray(tasks));
  assert.ok(tasks.length >= 4);

  // Create task
  const createRes = await fetch(`${API}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Automated Test Task",
      description: "Testing sprint workflow",
      status: "todo",
      priority: "high",
      assignee_name: "Mira"
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.title, "Automated Test Task");

  // Move status
  const moveRes = await fetch(`${API}/api/tasks/${created.id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "in_progress" })
  });
  assert.equal(moveRes.status, 200);
  const updated = await moveRes.json();
  assert.equal(updated.status, "in_progress");
});

test("Support feedback dispatches event to local OOB listener", async () => {
  const res = await fetch(`${API}/api/support`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Security Tester",
      email: "tester@example.com",
      message: "Blind XSS verification probe",
      category: "security"
    })
  });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.id);
});

test("Category 1 — Reflected endpoints behave according to LAB_MODE", async () => {
  const health = await (await fetch(`${API}/health`)).json();
  const isVuln = health.mode === "vulnerable";

  const res = await fetch(`${API}/api/challenges/reflected/search?q=<b>probe</b>`);
  assert.equal(res.status, 200);
  const data = await res.json();

  if (isVuln) {
    assert.ok(data.rendered.includes("<b>probe</b>"));
  } else {
    assert.ok(data.rendered.includes("&lt;b&gt;probe&lt;/b&gt;"));
  }
});

test("Category 4 — Mutation XSS endpoint responds with sanitization comparison", async () => {
  const payload = '<math><annotation-xml encoding="text/html"><style><!--</style><img src=x onerror=1>';
  const res = await fetch(`${API}/api/challenges/mutation/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(typeof data.sanitized === "string");
});

test("Category 7 — CSP header verification", async () => {
  const res = await fetch(`${API}/api/challenges/csp/weak-header?q=test`);
  const csp = res.headers.get("content-security-policy");
  assert.ok(csp);
  const health = await (await fetch(`${API}/health`)).json();
  if (health.mode === "vulnerable") {
    assert.ok(csp.includes("'unsafe-inline'"));
  } else {
    assert.ok(csp.includes("script-src 'self'"));
  }
});

test("Category 9 — Markdown parser endpoint handles HTML and link schemes", async () => {
  const res = await fetch(`${API}/api/challenges/markdown/scheme-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown: "[Test](javascript:alert(1))" })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.rendered);
});

test("Category 10 — Encoding and Filter endpoints handle bypass checks", async () => {
  const health = await (await fetch(`${API}/health`)).json();
  const isVuln = health.mode === "vulnerable";

  if (isVuln) {
    // Direct script tag or single-decode is blocked by WAF filter (403)
    const blockedRes = await fetch(`${API}/api/challenges/encoding/double-decode?input=%253Cscript%253E`);
    assert.equal(blockedRes.status, 403);

    // Double-encoded input bypasses filter (200) and decodes to <script>
    const bypassRes = await fetch(`${API}/api/challenges/encoding/double-decode?input=%25253Cscript%25253E`);
    assert.equal(bypassRes.status, 200);
    const data = await bypassRes.json();
    assert.ok(data.output.includes("<script>"));
  } else {
    // In fixed mode, input is safely contextually encoded rather than relying on brittle blacklists
    const res = await fetch(`${API}/api/challenges/encoding/double-decode?input=%25253Cscript%25253E`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.output.includes("&lt;") || !data.output.includes("<script>"));
  }
});

test("GraphQL endpoint executes queries and mutations", async () => {
  const query = `query { posts { id title body author_name } }`;
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.ok(result.data.posts);
  assert.ok(result.data.posts.length > 0);
});

test("Flags and Scoreboard verification", async () => {
  // Scoreboard
  const sbRes = await fetch(`${API}/lab/scoreboard`);
  assert.equal(sbRes.status, 200);
  const sb = await sbRes.json();
  assert.equal(sb.categories.length, 10);

  // Submit correct flag
  const submitRes = await fetch(`${API}/lab/flags/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "reflected",
      flag: "FLAG{xss_reflected_context_bypass}"
    })
  });
  assert.equal(submitRes.status, 200);
  const submitData = await submitRes.json();
  assert.equal(submitData.accepted, true);

  // Submit invalid flag
  const badSubmit = await fetch(`${API}/lab/flags/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "reflected", flag: "FLAG{invalid}" })
  });
  assert.equal(badSubmit.status, 400);
});

test("POST /lab/reset restores database to initial seeds", async () => {
  const res = await fetch(`${API}/lab/reset`, { method: "POST" });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);

  // Verify posts are reset to initial 2
  const posts = await (await fetch(`${API}/api/posts`)).json();
  assert.equal(posts.length, 2);
});

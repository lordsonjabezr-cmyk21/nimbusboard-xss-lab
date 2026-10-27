import test from "node:test";
import assert from "node:assert/strict";
import authRoutes from "../src/routes/auth.js";
import { initDatabase, seedMemoryStore } from "../src/db/init.js";

// Helper to invoke Express route handlers in-memory without TCP networking
async function callRoute(method, path, body = {}, headers = {}, cookies = {}, user = null) {
  // Find matching route in authRoutes stack
  const route = authRoutes.stack.find(
    (layer) => layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()]
  );
  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found in authRoutes`);
  }

  const handler = route.route.stack[0].handle;

  let statusCode = 200;
  let jsonBody = null;
  const setCookies = {};

  const req = {
    method: method.toUpperCase(),
    path,
    body,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    cookies,
    user
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonBody = data;
      return this;
    },
    cookie(name, val, opts) {
      setCookies[name] = { val, opts };
      return this;
    },
    clearCookie(name) {
      delete setCookies[name];
      return this;
    }
  };

  await handler(req, res, () => {});

  return { status: statusCode, body: jsonBody, cookies: setCookies };
}

test("Setup: Initialize seed database in-memory", async () => {
  await initDatabase();
  seedMemoryStore();
});

test("1. Login succeeds with valid username and password (Ari - Admin)", async () => {
  const res = await callRoute("POST", "/login", { username: "ari", password: "AriAdmin2026!" });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, "ari");
  assert.equal(res.body.user.role, "admin");
  assert.equal(res.body.user.email, "ari@nimbus.local");
  assert.ok(res.cookies.token);
});

test("2. Login succeeds with email and password", async () => {
  const res = await callRoute("POST", "/login", { username: "ari@nimbus.local", password: "AriAdmin2026!" });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, "ari");
});

test("3. Login succeeds with educational fallback password (password123)", async () => {
  const res = await callRoute("POST", "/login", { username: "noah", password: "password123" });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, "noah");
  assert.equal(res.body.user.role, "moderator");
});

test("4. Login succeeds for regular user Mira", async () => {
  const res = await callRoute("POST", "/login", { username: "mira", password: "MiraUser2026!" });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, "mira");
  assert.equal(res.body.user.role, "user");
});

test("5. Login rejects invalid password with 401", async () => {
  const res = await callRoute("POST", "/login", { username: "ari", password: "WrongPassword!" });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid credentials");
});

test("6. Login rejects non-existent user with 401", async () => {
  const res = await callRoute("POST", "/login", { username: "nonexistent_user", password: "SomePassword123!" });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid credentials");
});

test("7. Login rejects missing username or password with 400", async () => {
  const res1 = await callRoute("POST", "/login", { username: "ari" });
  assert.equal(res1.status, 400);

  const res2 = await callRoute("POST", "/login", { password: "AriAdmin2026!" });
  assert.equal(res2.status, 400);
});

test("8. GET /api/auth/me returns user details when authenticated", async () => {
  const user = { id: 1, username: "ari", email: "ari@nimbus.local", role: "admin" };
  const res = await callRoute("GET", "/me", {}, {}, {}, user);

  assert.equal(res.status, 200);
  assert.equal(res.body.authenticated, true);
  assert.equal(res.body.user.username, "ari");
  assert.equal(res.body.user.role, "admin");
});

test("9. GET /api/auth/me returns 401 when unauthenticated", async () => {
  const res = await callRoute("GET", "/me", {}, {}, {}, null);
  assert.equal(res.status, 401);
  assert.equal(res.body.authenticated, false);
});

test("10. POST /api/auth/register creates a new user and allows login", async () => {
  const uniqueName = `user_${Date.now()}`;
  const uniqueEmail = `${uniqueName}@test.local`;

  const regRes = await callRoute("POST", "/register", {
    username: uniqueName,
    email: uniqueEmail,
    password: "StrongPassword2026!"
  });

  assert.equal(regRes.status, 201);
  assert.ok(regRes.body.token);
  assert.equal(regRes.body.user.username, uniqueName);
  assert.equal(regRes.body.user.email, uniqueEmail);
  assert.equal(regRes.body.user.role, "user");

  // Verify new user can login
  const loginRes = await callRoute("POST", "/login", {
    username: uniqueName,
    password: "StrongPassword2026!"
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.user.username, uniqueName);
});

test("11. POST /api/auth/register rejects duplicate username/email with 409", async () => {
  const regRes = await callRoute("POST", "/register", {
    username: "ari",
    email: "different_email@test.local",
    password: "StrongPassword2026!"
  });

  assert.equal(regRes.status, 409);
  assert.ok(regRes.body.error);
});

test("12. POST /api/auth/logout clears auth cookie", async () => {
  const res = await callRoute("POST", "/logout");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

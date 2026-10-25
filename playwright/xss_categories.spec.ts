import { test, expect } from "@playwright/test";

// Helper to determine active lab mode from the running server
async function getLabMode(page) {
  const res = await page.request.get("http://127.0.0.1:4000/health");
  const data = await res.json();
  return data.mode; // "vulnerable" or "fixed"
}

test.describe("NimbusBoard 10 XSS Training Categories Verification", () => {

  // ==========================================
  // Category 1 — Reflected XSS
  // ==========================================
  test("CAT-01 / XSS-REFL-01: Search query reflection in HTML body context", async ({ page }) => {
    const mode = await getLabMode(page);
    const marker = "<b>refl_body_probe</b>";
    await page.goto(`/search?q=${encodeURIComponent(marker)}`);

    if (mode === "vulnerable") {
      // In vulnerable mode, unescaped HTML creates a <b> DOM node
      const boldElement = page.locator(".search-results-heading b");
      await expect(boldElement).toHaveCount(1);
      await expect(boldElement).toHaveText("refl_body_probe");
    } else {
      // In fixed mode, contextual encoding displays the tags as literal text without DOM tags
      const boldElement = page.locator(".search-results-heading b");
      await expect(boldElement).toHaveCount(0);
      await expect(page.locator(".search-results-heading")).toContainText("refl_body_probe");
    }
  });

  test("CAT-01 / XSS-REFL-02: Search share link attribute context", async ({ page }) => {
    const mode = await getLabMode(page);
    const attrPayload = 'test" data-marker="attr_probe';
    await page.goto(`/search?q=${encodeURIComponent(attrPayload)}`);

    const shareLink = page.locator("#share-link");
    await expect(shareLink).toBeVisible();

    if (mode === "vulnerable") {
      // Vulnerable mode allows attribute breakout; data-marker attribute exists
      const markerVal = await shareLink.getAttribute("data-marker");
      expect(markerVal).toBe("attr_probe");
    } else {
      // Fixed mode properly encodes attribute and prevents breakout
      const markerVal = await shareLink.getAttribute("data-marker");
      expect(markerVal).toBeNull();
    }
  });

  // ==========================================
  // Category 2 — Stored XSS
  // ==========================================
  test("CAT-02 / XSS-STOR-01: Post and comment rich content rendering", async ({ page }) => {
    const mode = await getLabMode(page);
    await page.goto("/");

    // Publish post with HTML marker
    const markerTitle = `Stored Test ${Date.now()}`;
    const markerBody = "<i>stored_rich_content_marker</i>";
    await page.locator('input[placeholder*="Sprint Goals"]').fill(markerTitle);
    await page.locator('textarea[placeholder*="Share an update"]').fill(markerBody);

    // Wait for the POST request to complete
    const [res] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/posts") && r.status() === 201),
      page.getByRole("button", { name: "Publish Update" }).click()
    ]);
    expect(res.ok()).toBeTruthy();

    const postItem = page.locator(".post-item", { hasText: markerTitle });
    await expect(postItem).toBeVisible();

    if (mode === "vulnerable") {
      // In vulnerable mode, <i> tag is parsed into DOM
      await expect(postItem.locator(".post-body i")).toHaveCount(1);
    } else {
      // In fixed mode, <i> tag is rendered as literal text
      await expect(postItem.locator(".post-body i")).toHaveCount(0);
      await expect(postItem.locator(".post-body")).toContainText("stored_rich_content_marker");
    }
  });

  test("CAT-02 / XSS-STOR-02: User profile biography across multiple views", async ({ page }) => {
    const mode = await getLabMode(page);
    await page.goto("/profile");

    // Authenticate as Ari (Admin) who can update profile
    await page.getByRole("button", { name: /Ari \(Admin\)/ }).click();

    // Wait for bio input to be ready
    const bioTextarea = page.locator("#bio-input");
    await expect(bioTextarea).toBeVisible();

    const bioPayload = "<u>profile_bio_underline</u>";
    await bioTextarea.fill(bioPayload);
    await page.getByRole("button", { name: "Save Biography" }).click();

    await expect(page.getByText(/Biography updated successfully/i)).toBeVisible();
    const bioBox = page.locator(".profile-bio");

    if (mode === "vulnerable") {
      await expect(bioBox.locator("u")).toHaveCount(1);
    } else {
      await expect(bioBox.locator("u")).toHaveCount(0);
      await expect(bioBox).toContainText("profile_bio_underline");
    }
  });

  // ==========================================
  // Category 3 — DOM-based XSS
  // ==========================================
  test("CAT-03 / XSS-DOM-01: URL fragment flowing into DOM innerHTML sink", async ({ page }) => {
    const mode = await getLabMode(page);
    await page.goto("/preview#<b>dom_fragment_probe</b>");

    const output = page.locator("#preview-output");
    await expect(output).toBeVisible();

    if (mode === "vulnerable") {
      // Hash reaches innerHTML directly
      await expect(output.locator("b")).toHaveCount(1);
      await expect(output.locator("b")).toHaveText("dom_fragment_probe");
    } else {
      // Hash reaches safe textContent
      await expect(output.locator("b")).toHaveCount(0);
      await expect(output).toContainText("<b>dom_fragment_probe</b>");
    }
  });

  test("CAT-03 / XSS-DOM-02: Live preview postMessage messaging sink", async ({ page }) => {
    const mode = await getLabMode(page);
    await page.goto("/preview");
    const output = page.locator("#preview-output");
    await expect(output).toBeVisible();

    // Dispatch a postMessage to current window once listener is active
    await page.evaluate(() => {
      window.postMessage("<em>postmessage_dom_probe</em>", "*");
    });

    if (mode === "vulnerable") {
      await expect(output.locator("em")).toHaveCount(1);
    } else {
      await expect(output.locator("em")).toHaveCount(0);
    }
  });

  // ==========================================
  // Category 4 — Mutation XSS
  // ==========================================
  test("CAT-04 / XSS-MUT-01: MathML/SVG namespace discrepancy test", async ({ page }) => {
    const mode = await getLabMode(page);
    const payload = '<math><annotation-xml encoding="text/html"><style><!--</style><img src=x onerror=1>';

    const res = await page.request.post("http://127.0.0.1:4000/api/challenges/mutation/parse", {
      data: { payload }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    if (mode === "vulnerable") {
      expect(data.safe).toBe(false);
      expect(data.warning).toContain("LAB ONLY");
    } else {
      expect(data.safe).toBe(true);
      expect(data.sanitized).not.toContain("onerror");
    }
  });

  test("CAT-04 / XSS-MUT-02: Naive regex sanitizer innerHTML roundtrip", async ({ page }) => {
    const mode = await getLabMode(page);
    const html = '<div title="test" onfocus="test">content</div>';

    const res = await page.request.post("http://127.0.0.1:4000/api/challenges/mutation/roundtrip", {
      data: { html }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    if (mode === "vulnerable") {
      expect(data.safe).toBe(false);
    } else {
      expect(data.safe).toBe(true);
      expect(data.filtered).not.toContain("onfocus");
    }
  });

  // ==========================================
  // Category 5 — Blind XSS
  // ==========================================
  test("CAT-05 / XSS-BLIND-01: Support ticket feedback viewed in admin queue with local OOB listener", async ({ page }) => {
    const mode = await getLabMode(page);

    // 1. Submit support ticket
    await page.goto("/support");
    const testMsg = `Blind XSS Probe ${Date.now()}: <strong>blind_ticket_marker</strong>`;
    await page.locator('input').first().fill("Security Tester");
    await page.locator('input[type="email"]').fill("tester@example.com");
    await page.locator('textarea[placeholder*="Describe"]').fill(testMsg);
    await page.getByRole("button", { name: "Submit Support Request" }).click();
    await expect(page.getByText(/submitted!/i)).toBeVisible();

    // 2. View in Admin console as Ari (admin)
    await page.getByRole("button", { name: /Ari \(Admin\)/ }).click();
    await page.getByRole("button", { name: "Admin & Mod" }).click();
    const queueItem = page.locator(".admin-feedback-body", { hasText: "blind_ticket_marker" }).first();
    await expect(queueItem).toBeVisible();

    if (mode === "vulnerable") {
      await expect(queueItem.locator("strong")).toHaveCount(1);
    } else {
      await expect(queueItem.locator("strong")).toHaveCount(0);
      await expect(queueItem).toContainText("blind_ticket_marker");
    }
  });

  test("CAT-05 / XSS-BLIND-02: Internal email notification template preview", async ({ page }) => {
    const mode = await getLabMode(page);
    // Render email template preview route
    const res = await page.request.get("http://127.0.0.1:4000/api/email-preview/1/render", {
      headers: { Authorization: "Bearer token-ari" }
    });
    expect(res.ok()).toBeTruthy();
    const html = await res.text();

    if (mode === "vulnerable") {
      expect(html).toContain('<div id="email-content">');
      expect(html).not.toContain("Content-Security-Policy");
    } else {
      expect(html).toContain('meta http-equiv="Content-Security-Policy"');
    }
  });

  // ==========================================
  // Category 6 — Self-XSS Awareness
  // ==========================================
  test("CAT-06 / XSS-SELF-01: DevTools console warning demonstration", async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on("console", (msg) => consoleLogs.push(msg.text()));

    await page.goto("/");
    await page.waitForTimeout(500);
    // DevTools protective warning should be logged on mount
    const hasWarning = consoleLogs.some((l) => l.includes("STOP!") || l.includes("Self-XSS"));
    expect(hasWarning).toBeTruthy();
  });

  test("CAT-06 / XSS-SELF-02: Self-XSS education endpoint returns security guidelines", async ({ page }) => {
    const res = await page.request.get("http://127.0.0.1:4000/api/challenges/self/console");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.warning).toContain("Stop!");
    expect(data.education).toContain("Self-XSS");
  });

  // ==========================================
  // Category 7 — CSP and Filter Behavior
  // ==========================================
  test("CAT-07 / XSS-CSP-01: Weak route-specific CSP header analysis", async ({ page }) => {
    const mode = await getLabMode(page);
    const res = await page.request.get("http://127.0.0.1:4000/api/challenges/csp/weak-header?q=test");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toBeDefined();

    if (mode === "vulnerable") {
      expect(csp).toContain("'unsafe-inline'");
    } else {
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    }
  });

  test("CAT-07 / XSS-CSP-02: Nonce-based CSP policy and configuration check", async ({ page }) => {
    const mode = await getLabMode(page);
    const res = await page.request.get("http://127.0.0.1:4000/api/challenges/csp/nonce-test");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toContain("nonce-");

    if (mode === "vulnerable") {
      // Vulnerable mode reuses predictable static nonce
      expect(csp).toContain("nonce-static-lab-nonce-12345");
    } else {
      // Fixed mode uses cryptographically random nonce and object-src none
      expect(csp).toContain("object-src 'none'");
      expect(csp).not.toContain("static-lab-nonce-12345");
    }
  });

  // ==========================================
  // Category 8 — Modern Framework XSS
  // ==========================================
  test("CAT-08 / XSS-FW-01: React dangerouslySetInnerHTML escape hatch simulation", async ({ page }) => {
    const mode = await getLabMode(page);
    const payload = '<b>fw_escape_hatch</b><img src=x onerror=alert(1)>';

    const res = await page.request.post("http://127.0.0.1:4000/api/challenges/framework/dangerously-set-html", {
      data: { content: payload }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    if (mode === "vulnerable") {
      expect(data.safe).toBe(false);
      expect(data.htmlProp.__html).toContain("onerror=alert(1)");
    } else {
      expect(data.safe).toBe(true);
      expect(data.htmlProp.__html).not.toContain("onerror");
    }
  });

  test("CAT-08 / XSS-FW-02: Dynamic href protocol validation (javascript:)", async ({ page }) => {
    const mode = await getLabMode(page);
    const payload = "javascript:alert(1)";

    const res = await page.request.post("http://127.0.0.1:4000/api/challenges/framework/javascript-href", {
      data: { url: payload }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    if (mode === "vulnerable") {
      expect(data.safe).toBe(false);
      expect(data.href).toBe("javascript:alert(1)");
    } else {
      expect(data.safe).toBe(true);
      expect(data.href).not.toBe("javascript:alert(1)");
    }
  });

  // ==========================================
  // Category 9 — Markdown and Rich-Text XSS
  // ==========================================
  test("CAT-09 / XSS-MD-01: Markdown raw HTML passthrough", async ({ page }) => {
    const mode = await getLabMode(page);
    const md = 'Hello **markdown** <b class="raw-html-marker">raw</b>';

    const res = await page.request.post("http://127.0.0.1:4000/api/challenges/markdown/passthrough", {
      data: { markdown: md }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    if (mode === "vulnerable") {
      expect(data.safe).toBe(false);
      expect(data.rendered).toContain('class="raw-html-marker"');
    } else {
      expect(data.safe).toBe(true);
      expect(data.rendered).toContain("<strong>markdown</strong>");
    }
  });

  test("CAT-09 / XSS-MD-02: Markdown link scheme allowlist validation", async ({ page }) => {
    const mode = await getLabMode(page);
    const md = "[Malicious Link](javascript:alert(1))";

    const res = await page.request.post("http://127.0.0.1:4000/api/challenges/markdown/scheme-links", {
      data: { markdown: md }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    if (mode === "vulnerable") {
      expect(data.safe).toBe(false);
      expect(data.rendered).toContain('href="javascript:alert(1)"');
    } else {
      expect(data.safe).toBe(true);
      expect(data.rendered).not.toContain('href="javascript:alert(1)"');
    }
  });

  // ==========================================
  // Category 10 — Encoding, Polyglots, and Filters
  // ==========================================
  test("CAT-10 / XSS-ENC-01: Inconsistent normalization and double-decoding", async ({ page }) => {
    const mode = await getLabMode(page);
    // Double-encoded <script> tag
    const res = await page.request.get("http://127.0.0.1:4000/api/challenges/encoding/double-decode?input=%25253Cscript%25253E");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    if (mode === "vulnerable") {
      expect(data.safe).toBe(false);
      expect(data.output).toContain("<script>");
    } else {
      expect(data.safe).toBe(true);
      expect(data.output).not.toContain("<script>");
    }
  });

  test("CAT-10 / XSS-ENC-02: Naive non-recursive blacklist filter bypass", async ({ page }) => {
    const mode = await getLabMode(page);
    const nested = "<scr<script>ipt>nested_script</script>";

    const res = await page.request.get(`http://127.0.0.1:4000/api/challenges/encoding/script-strip?input=${encodeURIComponent(nested)}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    if (mode === "vulnerable") {
      expect(data.safe).toBe(false);
      // Single-pass removal of inner <script> leaves outer <script>
      expect(data.filtered).toContain("<script>");
    } else {
      expect(data.safe).toBe(true);
      expect(data.filtered).not.toContain("<script>");
    }
  });

});

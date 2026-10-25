import { chromium } from "@playwright/test";

interface SmokeResult {
  name: string;
  category: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details: string;
}

async function runSmokeTests() {
  console.log("================================================================================");
  console.log("             NIMBUSBOARD XSS LAB — AUTOMATED PLAYWRIGHT SMOKE TEST               ");
  console.log("================================================================================\n");

  const results: SmokeResult[] = [];
  const startTime = Date.now();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. API Health Check
    let t0 = Date.now();
    try {
      const res = await page.request.get("http://127.0.0.1:4000/health");
      const data = await res.json();
      results.push({
        name: "API Health & DB Connectivity",
        category: "Infrastructure",
        status: data.ok && data.database?.ready ? "PASS" : "FAIL",
        durationMs: Date.now() - t0,
        details: `Mode: ${data.mode}, DB: ${data.database?.provider}, Uptime: ${Math.round(data.uptime)}s`
      });
    } catch (err: any) {
      results.push({
        name: "API Health & DB Connectivity",
        category: "Infrastructure",
        status: "FAIL",
        durationMs: Date.now() - t0,
        details: err.message
      });
    }

    // 2. OOB Listener Check
    t0 = Date.now();
    try {
      const res = await page.request.get("http://127.0.0.1:5000/");
      const html = await res.text();
      const ok = res.status() === 200 && html.includes("Local OOB Listener");
      results.push({
        name: "OOB Callback Listener",
        category: "Infrastructure",
        status: ok ? "PASS" : "FAIL",
        durationMs: Date.now() - t0,
        details: ok ? "Service responsive on 127.0.0.1:5000 (Local-only mode)" : "Service unreachable"
      });
    } catch (err: any) {
      results.push({
        name: "OOB Callback Listener",
        category: "Infrastructure",
        status: "FAIL",
        durationMs: Date.now() - t0,
        details: err.message
      });
    }

    // 3. Frontend App Shell & Safety Banner
    t0 = Date.now();
    try {
      await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
      const banner = await page.waitForSelector(".safety-banner", { timeout: 6000 });
      const bannerText = await banner.textContent();
      results.push({
        name: "Frontend App Shell & Safety Banner",
        category: "UI Foundation",
        status: bannerText?.includes("INTENTIONALLY VULNERABLE") ? "PASS" : "FAIL",
        durationMs: Date.now() - t0,
        details: bannerText?.trim().slice(0, 75) || ""
      });
    } catch (err: any) {
      results.push({
        name: "Frontend App Shell & Safety Banner",
        category: "UI Foundation",
        status: "FAIL",
        durationMs: Date.now() - t0,
        details: err.message
      });
    }

    // 4. Team Feed & Kanban Navigation
    t0 = Date.now();
    try {
      await page.click('button:has-text("Kanban Board")');
      await page.waitForSelector(".kanban-board", { timeout: 4000 });
      const columns = await page.locator(".kanban-column").count();
      results.push({
        name: "Kanban Navigation & Columns Render",
        category: "Product Features",
        status: columns === 4 ? "PASS" : "FAIL",
        durationMs: Date.now() - t0,
        details: `Rendered ${columns} workflow lanes (To Do, In Progress, In Review, Done)`
      });
    } catch (err: any) {
      results.push({
        name: "Kanban Navigation & Columns Render",
        category: "Product Features",
        status: "FAIL",
        durationMs: Date.now() - t0,
        details: err.message
      });
    }

    // 5. Search Reflection Smoke Test
    t0 = Date.now();
    try {
      await page.goto("http://127.0.0.1:3000/search?q=smoke_search_term");
      const heading = await page.waitForSelector(".search-results-heading", { timeout: 4000 });
      const text = await heading.textContent();
      results.push({
        name: "Search Route Query Reflection",
        category: "Category 1 / Reflected",
        status: text?.includes("smoke_search_term") ? "PASS" : "FAIL",
        durationMs: Date.now() - t0,
        details: `Search header output contains reflected probe parameter`
      });
    } catch (err: any) {
      results.push({
        name: "Search Route Query Reflection",
        category: "Category 1 / Reflected",
        status: "FAIL",
        durationMs: Date.now() - t0,
        details: err.message
      });
    }

    // 6. Live Preview DOM Rendering Smoke Test
    t0 = Date.now();
    try {
      await page.goto("http://127.0.0.1:3000/preview#smoke_hash_probe");
      const output = await page.waitForSelector("#preview-output", { timeout: 4000 });
      const text = await output.textContent();
      results.push({
        name: "Live Preview URL Hash Sink",
        category: "Category 3 / DOM-based",
        status: text?.includes("smoke_hash_probe") ? "PASS" : "FAIL",
        durationMs: Date.now() - t0,
        details: `DOM preview sink processed location.hash payload`
      });
    } catch (err: any) {
      results.push({
        name: "Live Preview URL Hash Sink",
        category: "Category 3 / DOM-based",
        status: "FAIL",
        durationMs: Date.now() - t0,
        details: err.message
      });
    }

    // 7. Role Switching & RBAC Smoke Test
    t0 = Date.now();
    try {
      await page.goto("http://127.0.0.1:3000/admin");
      // Switch to Ari (Admin)
      await page.click('button:has-text("Ari (Admin)")');
      const adminHeader = await page.waitForSelector('h2:has-text("Moderation & Administrative Console")', { timeout: 4000 });
      results.push({
        name: "Client Role Switch & Admin Panel Access",
        category: "Authentication & RBAC",
        status: adminHeader ? "PASS" : "FAIL",
        durationMs: Date.now() - t0,
        details: `Switched active session to Ari (Admin) and accessed privileged administration console`
      });
    } catch (err: any) {
      results.push({
        name: "Client Role Switch & Admin Panel Access",
        category: "Authentication & RBAC",
        status: "FAIL",
        durationMs: Date.now() - t0,
        details: err.message
      });
    }

    // 8. Scoreboard & Flag Registry Verification
    t0 = Date.now();
    try {
      await page.click('button:has-text("Lab & Scoreboard")');
      const heading = await page.waitForSelector('h1:has-text("NimbusBoard XSS Training Laboratory")', { timeout: 4000 });
      results.push({
        name: "Scoreboard Challenge Registry",
        category: "Lab & Scoreboard",
        status: heading ? "PASS" : "FAIL",
        durationMs: Date.now() - t0,
        details: `Verified scoreboard interface and training curriculum registry rendered`
      });
    } catch (err: any) {
      results.push({
        name: "Scoreboard Challenge Registry",
        category: "Lab & Scoreboard",
        status: "FAIL",
        durationMs: Date.now() - t0,
        details: err.message
      });
    }

    await browser.close();
  } catch (err: any) {
    console.error("Critical failure during smoke test execution:", err);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }

  // Print Structured Console Report Table
  console.log(
    "+-----+------------------------------------------+-------------------------+--------+----------+"
  );
  console.log(
    "| #   | Test Check Description                   | Target Area             | Status | Duration |"
  );
  console.log(
    "+-----+------------------------------------------+-------------------------+--------+----------+"
  );

  let passedCount = 0;
  results.forEach((r, idx) => {
    if (r.status === "PASS") passedCount++;
    const idxStr = String(idx + 1).padEnd(3);
    const nameStr = r.name.padEnd(40).slice(0, 40);
    const catStr = r.category.padEnd(23).slice(0, 23);
    const statusStr = r.status === "PASS" ? "\x1b[32mPASS\x1b[0m  " : "\x1b[31mFAIL\x1b[0m  ";
    const durStr = `${r.durationMs}ms`.padStart(8);
    console.log(`| ${idxStr} | ${nameStr} | ${catStr} | ${statusStr} | ${durStr} |`);
  });

  console.log(
    "+-----+------------------------------------------+-------------------------+--------+----------+\n"
  );

  console.log("Detailed Results:");
  results.forEach((r, idx) => {
    console.log(`  [${idx + 1}] ${r.name}: ${r.status} — ${r.details}`);
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nSmoke Test Summary: ${passedCount}/${results.length} checks passed in ${totalTime}s.`);

  if (passedCount !== results.length) {
    console.error("\x1b[31mSmoke test suite failed!\x1b[0m");
    process.exit(1);
  } else {
    console.log("\x1b[32mAll smoke checks passed successfully!\x1b[0m\n");
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

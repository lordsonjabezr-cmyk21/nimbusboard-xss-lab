import { test, expect } from "@playwright/test";

test("board loads and shows safety banner and feed heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/INTENTIONALLY VULNERABLE TRAINING LAB/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Publish an update" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team Feed & Discussion" })).toBeVisible();
});

test("navigation tabs switch between views seamlessly", async ({ page }) => {
  await page.goto("/");

  // Navigate to Kanban
  await page.getByRole("button", { name: "Kanban Board" }).click();
  await expect(page.getByRole("heading", { name: "Sprint Kanban Board" })).toBeVisible();
  await expect(page.getByText("📋 To Do")).toBeVisible();
  await expect(page.getByText("⚡ In Progress")).toBeVisible();
  await expect(page.getByText("🔍 In Review")).toBeVisible();
  await expect(page.getByText("✅ Done")).toBeVisible();

  // Navigate to Search
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("heading", { name: "Search Workspace & Team Knowledge" })).toBeVisible();

  // Navigate to Live Preview
  await page.getByRole("button", { name: "Live Preview" }).click();
  await expect(page.getByRole("heading", { name: "Live Comment & Markdown Preview" })).toBeVisible();

  // Navigate to Support
  await page.getByRole("button", { name: "Support" }).click();
  await expect(page.getByRole("heading", { name: "Submit Support Request" })).toBeVisible();

  // Navigate to Lab & Scoreboard
  await page.getByRole("button", { name: "🎯 Lab & Scoreboard" }).click();
  await expect(page.getByText("NimbusBoard XSS Training Laboratory")).toBeVisible();
  await expect(page.getByText("01 Reflected")).toBeVisible();
  await expect(page.getByText("10 Encoding & Polyglots")).toBeVisible();
});

test("role switching updates session and respects server-side authorization", async ({ page }) => {
  await page.goto("/");

  // Switch to Mira (regular user)
  await page.getByRole("button", { name: /Mira \(User\)/ }).click();
  await page.getByRole("button", { name: "Admin & Mod" }).click();
  await expect(page.getByText("Access Denied: Server-Side Authorization Enforced")).toBeVisible();

  // Switch to Ari (admin)
  await page.getByRole("button", { name: /Ari \(Admin\)/ }).click();
  await page.getByRole("button", { name: "Admin & Mod" }).click();
  await expect(page.getByRole("heading", { name: "Moderation & Administrative Console" })).toBeVisible();
  await expect(page.getByText("ADMIN CONSOLE")).toBeVisible();
});

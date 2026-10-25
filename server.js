import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config, isVulnerable, validateConfig, isTrainingProfile } from "./src/config.js";
import { logger, requestLogger } from "./src/logger.js";
import { checkDbHealth } from "./src/db/pool.js";
import { initDatabase } from "./src/db/init.js";
import { authenticate } from "./src/middleware/auth.js";
import { setCsp } from "./src/middleware/csp.js";

// Validate environment configuration and reject insecure settings
validateConfig();

if (config.ephemeralSecretGenerated) {
  logger.warn("No JWT_SECRET provided. Ephemeral cryptographically random secret generated for this session.");
}
if (isTrainingProfile() && config.allowDevTokens) {
  logger.warn("TRAINING PROFILE ACTIVE: Development authentication shortcuts (token-ari, token-noah, token-mira) are enabled for local educational use. Do not expose to public networks.");
}

import authRoutes from "./src/routes/auth.js";
import postsRoutes from "./src/routes/posts.js";
import tasksRoutes from "./src/routes/tasks.js";
import usersRoutes from "./src/routes/users.js";
import supportRoutes from "./src/routes/support.js";
import adminRoutes from "./src/routes/admin.js";
import emailPreviewRoutes from "./src/routes/emailPreview.js";
import categoriesRoutes from "./src/routes/categories.js";
import graphqlRoutes from "./src/routes/graphql.js";
import labRoutes from "./src/routes/lab.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.disable("x-powered-by");

// CORS configuration for local React frontend
app.use(cors({
  origin: ["http://127.0.0.1:3000", "http://localhost:3000"],
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: "128kb" }));
app.use(express.urlencoded({ extended: false, limit: "128kb" }));
app.use(requestLogger);

// Global security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Authentication middleware
app.use(authenticate);

// Static uploads serving with defense-in-depth against SVG active content
app.use("/uploads", express.static(config.uploadDir, {
  setHeaders: (res, filePath) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (filePath.endsWith(".svg")) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Content-Disposition", "inline");
    }
  }
}));

// Health and readiness probe
app.get("/health", async (_req, res) => {
  const dbHealth = await checkDbHealth();
  res.json({
    ok: true,
    name: "NimbusBoard Lab API",
    profile: config.profile,
    mode: config.mode,
    hints: config.hints,
    devTokensEnabled: config.allowDevTokens,
    database: dbHealth,
    uptime: process.uptime()
  });
});

// Mount modular API routers
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/feedback", supportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/email-preview", emailPreviewRoutes);
app.use("/api/challenges", categoriesRoutes);
app.use("/graphql", graphqlRoutes);
app.use("/lab", labRoutes);

// Legacy routes for backwards-compatibility & direct server-rendered verification
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const legacyPage = (title, body, extraHead = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · NimbusBoard Lab</title><link rel="stylesheet" href="/style.css">${extraHead}</head><body><header><div class="brand">☁ NimbusBoard</div><nav><a href="/">Board</a><a href="/search">Search</a><a href="/preview">Live preview</a><a href="/support">Support</a><a href="/admin">Admin</a><a href="/lab/payloads">Payload lab</a></nav></header><main><div class="notice">INTENTIONALLY VULNERABLE TRAINING LAB · MODE: ${config.mode.toUpperCase()} · LOCAL USE ONLY</div>${body}</main><footer>INTENTIONALLY VULNERABLE · Authorized local training only · Never expose this lab to a network.</footer><script src="/app.js" defer></script></body></html>`;

app.get("/search", (req, res) => {
  setCsp(res, { weak: true });
  const q = String(req.query.q || "");
  const heading = isVulnerable() ? q : esc(q);
  res.type("html").send(legacyPage("Search", `<section class="panel"><h1>Search workspace</h1><form><input name="q" value="${isVulnerable() ? q : esc(q)}" placeholder="Search posts and people"><button>Search</button></form><h2>Results for: ${heading}</h2><p>${q ? "No matching items found." : "Enter a search term to get started."}</p><p class="muted">Training route: reflected input and attribute context (XSS-REFL-01, XSS-REFL-02).</p></section>`));
});

app.get("/share", (req, res) => {
  setCsp(res, { weak: true });
  const term = String(req.query.term || "board");
  const href = isVulnerable() ? `/search?q=${term}` : `/search?q=${encodeURIComponent(term)}`;
  res.type("html").send(legacyPage("Share search", `<section class="panel"><h1>Share this search</h1><p>Send your teammates this saved search:</p><a id="share-link" href="${href}">Open shared search</a><p class="muted">Inspect the generated href and how the parameter is encoded.</p></section>`));
});

app.get("/preview", (req, res) => {
  setCsp(res, { weak: true });
  const fragment = String(req.query.demo || "");
  res.type("html").send(legacyPage("Live preview", `<section class="panel"><h1>Comment composer</h1><label>Markdown / comment<textarea id="preview-input" rows="5" placeholder="Type a comment…"></textarea></label><h2>Live preview</h2><div id="preview-output" class="preview">${isVulnerable() ? fragment : esc(fragment)}</div><p class="muted">DOM exercise: inspect app.js for location.hash and postMessage sinks.</p><p><a href="/preview#hello">Load fragment example</a></p></section>`));
});

app.get("/support", (_req, res) => {
  setCsp(res);
  res.type("html").send(legacyPage("Support", `<section class="panel"><h1>Contact support</h1><p>Report a problem to the NimbusBoard team.</p><form id="feedback-form"><label>Message<textarea name="message" rows="5" required maxlength="2000"></textarea></label><button>Send report</button></form><p id="feedback-status" aria-live="polite"></p><p class="muted">Submissions appear in the local admin queue. Callback events go only to the lab listener.</p></section>`));
});

app.get("/admin", async (_req, res) => {
  setCsp(res);
  res.type("html").send(legacyPage("Admin", `<section class="panel"><h1>Admin console</h1><p>Training-only feedback review queue.</p><div id="feedback-list"><p>Loading feedback items...</p></div><p><a href="http://127.0.0.1:5000/">Open local callback listener</a></p></section>`));
});

app.get("/lab/payloads", (req, res) => {
  if (!config.hints) return res.status(404).type("html").send(legacyPage("Not available", "<section class=panel><h1>Payload reference disabled</h1></section>"));
  setCsp(res);
  res.type("html").send(legacyPage("Payload lab", `<section class="panel"><h1>Payload lab</h1><p>Use harmless proof-of-execution and DOM-mutation tests only inside this local environment.</p><ul><li><b>Reflected:</b> HTML body, quoted attribute, and URL encoding contexts.</li><li><b>Stored:</b> persisted comment rendered in the feed and admin queue.</li><li><b>DOM:</b> URL fragment as a source and HTML insertion as a sink.</li><li><b>CSP:</b> compare route response headers and browser console violations.</li><li><b>Fixed mode:</b> confirm input appears as literal text and does not create executable nodes.</li></ul><p>Full category exercises and reporting templates are in <code>docs/LABS/</code>.</p></section>`));
});

app.get("/style.css", (_req, res) => res.type("text/css").send(`
:root{font-family:Inter,system-ui,sans-serif;color:#172033;background:#f4f6fb}*{box-sizing:border-box}body{margin:0}header{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:16px 5%;background:#fff;border-bottom:1px solid #dce2ec;flex-wrap:wrap}.brand{font-weight:800;font-size:1.2rem}nav{display:flex;gap:14px;flex-wrap:wrap}a{color:#3559a8}main{max-width:1050px;margin:24px auto;padding:0 18px}.notice{background:#fff0d8;color:#7d3c00;border:1px solid #f0c77f;padding:10px 14px;border-radius:8px;font-weight:800;font-size:.85rem}.hero{padding:24px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.panel,.post{background:white;border:1px solid #dce2ec;border-radius:12px;padding:20px;margin:14px 0}.post{margin:10px 0;padding:14px}h1{margin-top:8px}label{display:block;font-weight:600;margin:12px 0}input,textarea{display:block;width:100%;padding:10px;margin-top:6px;border:1px solid #bcc6d7;border-radius:7px;font:inherit}button{background:#284f9c;color:white;border:0;border-radius:7px;padding:10px 16px;font-weight:700;cursor:pointer}.preview{min-height:70px;border:1px dashed #b5bfd0;border-radius:8px;padding:12px;overflow-wrap:anywhere}.muted,small{color:#667085}footer{text-align:center;padding:24px;color:#7d3c00;font-weight:800;font-size:.85rem}@media(max-width:720px){.grid{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}}
`));

app.get("/app.js", (_req, res) => {
  res.type("application/javascript").send(`
const fixed = ${JSON.stringify(!isVulnerable())};
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const postForm = document.querySelector("#post-form");
postForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(postForm));
  await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  location.reload();
});
const feedbackForm = document.querySelector("#feedback-form");
feedbackForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(feedbackForm));
  const r = await fetch("/api/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  document.querySelector("#feedback-status").textContent = r.ok ? "Report sent." : "Could not send report.";
  feedbackForm.reset();
});
const input = document.querySelector("#preview-input"), output = document.querySelector("#preview-output");
input?.addEventListener("input", () => {
  if (fixed) output.textContent = input.value;
  else output.innerHTML = input.value;
});
// VULN: XSS-DOM-01 (location.hash reaches an HTML sink without server round-trip)
if (output && location.hash) {
  const v = decodeURIComponent(location.hash.slice(1));
  if (fixed) output.textContent = v;
  else output.innerHTML = v;
}
// VULN: XSS-DOM-02 (postMessage receiver without origin validation)
window.addEventListener("message", e => {
  if (!fixed) {
    if (output && typeof e.data === "string") output.innerHTML = e.data;
  } else {
    // Fixed: check origin and use textContent
    if (e.origin === window.location.origin && output && typeof e.data === "string") {
      output.textContent = e.data;
    }
  }
});
  `);
});

// Default root redirect or landing
app.get("/", (_req, res) => {
  setCsp(res);
  res.type("html").send(legacyPage("Board", `
    <section class="hero">
      <h1>Your team's shared workspace</h1>
      <p>Ideas, updates, and project notes in one place.</p>
      <p><a href="http://127.0.0.1:3000" style="display:inline-block;padding:8px 16px;background:#284f9c;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">Open NimbusBoard React App &rarr;</a></p>
    </section>
    <section class="panel">
      <h2>API Service Active</h2>
      <p>API is running on port ${config.port}. React Single Page App runs on <code>http://127.0.0.1:3000</code>.</p>
    </section>
  `));
});

// Centralized error handler
app.use((err, _req, res, _next) => {
  logger.error("Unhandled server error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// Initialize database and start listening
await initDatabase();

app.listen(config.port, config.host, () => {
  logger.info(`NimbusBoard API running on http://${config.host}:${config.port} (mode: ${config.mode})`);
});

export default app;

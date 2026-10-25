import express from "express";
import { isVulnerable } from "../config.js";
import { dbQuery } from "../db/pool.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

// GET /api/email-preview - List simulated internal notification emails
router.get("/", requireRole("moderator", "admin"), async (_req, res) => {
  const result = await dbQuery("SELECT * FROM emails ORDER BY id DESC");
  res.json(result.rows);
});

// GET /api/email-preview/:id/render - Render HTML preview
router.get("/:id/render", requireRole("moderator", "admin"), async (req, res) => {
  const id = Number(req.params.id);
  const result = await dbQuery("SELECT * FROM emails WHERE id = $1", [id]);
  const email = result.rows[0];
  if (!email) return res.status(404).send("Email not found");

  if (isVulnerable()) {
    // VULN: XSS-BLIND-02 - Email preview rendered directly into un-sandboxed HTML view
    res.type("html").send(`
      <!doctype html>
      <html>
        <head><title>Preview: ${esc(email.subject)}</title></head>
        <body style="font-family:sans-serif;padding:16px;">
          <div style="border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:12px;">
            <strong>To:</strong> ${esc(email.recipient_email)}<br>
            <strong>Subject:</strong> ${esc(email.subject)}
          </div>
          <div id="email-content">${email.body_html}</div>
        </body>
      </html>
    `);
  } else {
    // FIXED: Strict text encoding and sandboxed rendering
    res.type("html").send(`
      <!doctype html>
      <html>
        <head>
          <title>Preview: ${esc(email.subject)}</title>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
        </head>
        <body style="font-family:sans-serif;padding:16px;">
          <div style="border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:12px;">
            <strong>To:</strong> ${esc(email.recipient_email)}<br>
            <strong>Subject:</strong> ${esc(email.subject)}
          </div>
          <div id="email-content" style="white-space:pre-wrap;">${esc(email.body_html)}</div>
        </body>
      </html>
    `);
  }
});

export default router;

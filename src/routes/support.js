import express from "express";
import { config, isVulnerable, isAllowedOobUrl } from "../config.js";
import { dbQuery } from "../db/pool.js";
import { logger } from "../logger.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

// POST /api/support - Submit feedback/support ticket
router.post("/", async (req, res) => {
  const name = String(req.body.name || (req.user ? req.user.username : "Guest")).slice(0, 100);
  const email = String(req.body.email || (req.user ? req.user.email : "guest@example.com")).slice(0, 100);
  const message = String(req.body.message || "").slice(0, 2000);
  const category = String(req.body.category || "general").slice(0, 50);

  if (!message.trim()) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  // VULN: XSS-BLIND-01 - User input stored in database and later reviewed by admin/moderator
  const insertRes = await dbQuery(
    "INSERT INTO feedback (name, email, message, category, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *",
    [name, email, message, category]
  );
  const item = insertRes.rows[0];

  // Also queue a notification email for Category 5 Blind XSS exercise 2 (email preview workflow)
  await dbQuery(
    "INSERT INTO emails (recipient_email, subject, body_html, status) VALUES ($1, $2, $3, 'queued')",
    [
      "support-team@nimbus.local",
      `New Ticket: ${category} from ${name}`,
      `<div class="ticket-digest"><p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p><strong>Category:</strong> ${esc(category)}</p><div class="message-body">${isVulnerable() ? message : esc(message)}</div></div>`
    ]
  );

  // Local-only OOB callback: sends only fixed event metadata, never browser secrets or external URLs
  if (isAllowedOobUrl(config.oobUrl)) {
    try {
      await fetch(config.oobUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "feedback-submitted", id: item.id })
      });
    } catch (err) {
      logger.warn("Local OOB callback dispatch failed or listener offline", { error: err.message });
    }
  } else {
    logger.warn("Disallowed OOB callback URL rejected: Destination must be local loopback or lab container", { url: config.oobUrl });
  }

  res.status(201).json({
    ok: true,
    id: item.id,
    message: "Feedback submitted successfully"
  });
});

// GET /api/support/tickets - Restricted to moderators and admins
router.get("/tickets", requireRole("moderator", "admin"), async (_req, res) => {
  const result = await dbQuery("SELECT * FROM feedback ORDER BY id DESC");
  const items = result.rows.map(item => ({
    ...item,
    // VULN: XSS-BLIND-01 - Rendered raw in vulnerable mode; escaped in fixed mode
    safe_message: isVulnerable() ? item.message : esc(item.message)
  }));
  res.json(items);
});

export default router;

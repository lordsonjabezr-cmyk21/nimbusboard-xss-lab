import express from "express";
import { isVulnerable } from "../config.js";
import { dbQuery } from "../db/pool.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

// GET /api/admin/feedback - Review queue for moderators and administrators
router.get("/feedback", requireRole("moderator", "admin"), async (_req, res) => {
  const result = await dbQuery("SELECT * FROM feedback ORDER BY id DESC");
  const items = result.rows.map(f => ({
    ...f,
    // VULN: XSS-BLIND-01 - Content viewed by privileged user
    safe_message: isVulnerable() ? f.message : esc(f.message)
  }));
  res.json(items);
});

// GET /api/admin/audit-logs - Admin only audit log
router.get("/audit-logs", requireRole("admin"), async (_req, res) => {
  const result = await dbQuery("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50");
  res.json(result.rows);
});

// DELETE /api/admin/comments/:id - Moderator/Admin comment moderation
router.delete("/comments/:id", requireRole("moderator", "admin"), async (req, res) => {
  const id = Number(req.params.id);
  await dbQuery("DELETE FROM comments WHERE id = $1", [id]);
  await dbQuery("INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)", [
    req.user.username,
    "DELETE_COMMENT",
    `Deleted comment id ${id}`
  ]);
  res.json({ ok: true, deletedId: id });
});

// GET /api/admin/stats - Overview metrics
router.get("/stats", requireRole("admin"), async (_req, res) => {
  const users = await dbQuery("SELECT COUNT(*) AS count FROM users");
  const posts = await dbQuery("SELECT COUNT(*) AS count FROM posts");
  const comments = await dbQuery("SELECT COUNT(*) AS count FROM comments");
  const feedback = await dbQuery("SELECT COUNT(*) AS count FROM feedback");

  res.json({
    usersCount: Number(users.rows[0]?.count || 0),
    postsCount: Number(posts.rows[0]?.count || 0),
    commentsCount: Number(comments.rows[0]?.count || 0),
    feedbackCount: Number(feedback.rows[0]?.count || 0)
  });
});

export default router;

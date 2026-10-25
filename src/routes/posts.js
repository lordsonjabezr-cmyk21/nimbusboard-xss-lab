import express from "express";
import { dbQuery } from "../db/pool.js";
import { isVulnerable } from "../config.js";

const router = express.Router();

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

// GET /api/posts
router.get("/", async (_req, res) => {
  const postsRes = await dbQuery("SELECT * FROM posts ORDER BY id DESC");
  const posts = postsRes.rows;

  const commentsRes = await dbQuery("SELECT * FROM comments ORDER BY id ASC");
  const comments = commentsRes.rows;

  const result = posts.map(post => ({
    ...post,
    // VULN: XSS-STOR-01 - Raw body served in vulnerable mode; escaped in fixed mode
    safe_body: isVulnerable() ? post.body : esc(post.body),
    comments: comments.filter(c => c.post_id === post.id).map(c => ({
      ...c,
      safe_body: isVulnerable() ? c.body : esc(c.body)
    }))
  }));

  res.json(result);
});

// GET /api/posts/:id
router.get("/:id", async (req, res) => {
  const postId = Number(req.params.id);
  const postRes = await dbQuery("SELECT * FROM posts WHERE id = $1", [postId]);
  const post = postRes.rows[0];
  if (!post) return res.status(404).json({ error: "Post not found" });

  const commentsRes = await dbQuery("SELECT * FROM comments WHERE post_id = $1 ORDER BY id ASC", [postId]);
  res.json({
    ...post,
    safe_body: isVulnerable() ? post.body : esc(post.body),
    comments: commentsRes.rows.map(c => ({
      ...c,
      safe_body: isVulnerable() ? c.body : esc(c.body)
    }))
  });
});

// POST /api/posts
router.post("/", async (req, res) => {
  const author = req.user ? req.user.username : (String(req.body.author || "Guest").slice(0, 80));
  const userId = req.user ? req.user.id : null;
  const title = String(req.body.title || "Project Note").slice(0, 200);
  const body = String(req.body.body || "").slice(0, 4000);
  const tags = String(req.body.tags || "").slice(0, 200);

  if (!body.trim()) {
    return res.status(400).json({ error: "Post body cannot be empty" });
  }

  // VULN: XSS-STOR-01 - Content is stored directly in DB without normalization or sanitation
  const insertRes = await dbQuery(
    "INSERT INTO posts (user_id, author_name, title, body, tags) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [userId, author, title, body, tags]
  );
  const newPost = insertRes.rows[0];

  res.status(201).json({
    ...newPost,
    safe_body: isVulnerable() ? newPost.body : esc(newPost.body),
    comments: []
  });
});

// POST /api/posts/:id/comments
router.post("/:id/comments", async (req, res) => {
  const postId = Number(req.params.id);
  const author = req.user ? req.user.username : (String(req.body.author || "Guest").slice(0, 80));
  const userId = req.user ? req.user.id : null;
  const body = String(req.body.body || "").slice(0, 2000);

  if (!body.trim()) {
    return res.status(400).json({ error: "Comment body cannot be empty" });
  }

  const insertRes = await dbQuery(
    "INSERT INTO comments (post_id, user_id, author_name, body) VALUES ($1, $2, $3, $4) RETURNING *",
    [postId, userId, author, body]
  );
  const newComment = insertRes.rows[0];

  res.status(201).json({
    ...newComment,
    safe_body: isVulnerable() ? newComment.body : esc(newComment.body)
  });
});

export default router;

import express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { config, isVulnerable } from "../config.js";
import { dbQuery } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Multer storage with safe sanitization of filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".gif", ".svg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("Invalid file extension. Allowed: PNG, JPG, JPEG, GIF, SVG"));
    }
    cb(null, true);
  }
});

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

// GET /api/users - List team members
router.get("/", async (_req, res) => {
  const result = await dbQuery("SELECT id, username, email, role, bio, avatar_url FROM users ORDER BY id ASC");
  const users = result.rows.map(u => ({
    ...u,
    // VULN: XSS-STOR-02 - User biography rendered raw in vulnerable mode; escaped in fixed mode
    safe_bio: isVulnerable() ? u.bio : esc(u.bio)
  }));
  res.json(users);
});

// GET /api/users/:id - Single user profile
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const result = await dbQuery("SELECT id, username, email, role, bio, avatar_url FROM users WHERE id = $1", [id]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    ...user,
    safe_bio: isVulnerable() ? user.bio : esc(user.bio)
  });
});

// PUT /api/users/:id/profile - Update biography and display name
router.put("/:id/profile", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You can only update your own profile" });
  }

  const bio = String(req.body.bio || "").slice(0, 1000);
  // VULN: XSS-STOR-02 - Profile bio stored directly and later rendered across multiple user views
  const result = await dbQuery("UPDATE users SET bio = $1 WHERE id = $2 RETURNING id, username, email, role, bio, avatar_url", [bio, id]);
  const updated = result.rows[0];

  res.json({
    ...updated,
    safe_bio: isVulnerable() ? updated.bio : esc(updated.bio)
  });
});

import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const serverPurify = DOMPurify(window);

// POST /api/users/avatar - Upload avatar image
router.post("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No avatar file uploaded" });
  }

  // Sanitize active content from SVG files to prevent stored script execution
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext === ".svg") {
    try {
      const filePath = path.join(config.uploadDir, req.file.filename);
      const rawSvg = fs.readFileSync(filePath, "utf-8");
      const cleanSvg = serverPurify.sanitize(rawSvg, {
        USE_PROFILES: { svg: true, svgFilters: true }
      });
      fs.writeFileSync(filePath, cleanSvg, "utf-8");
    } catch (err) {
      return res.status(400).json({ error: "Failed to process SVG avatar" });
    }
  }

  const avatarUrl = `/uploads/${req.file.filename}`;
  await dbQuery("UPDATE users SET avatar_url = $1 WHERE id = $2", [avatarUrl, req.user.id]);

  res.json({
    ok: true,
    avatar_url: avatarUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});

export default router;

import express from "express";
import bcrypt from "bcryptjs";
import { dbQuery } from "../db/pool.js";
import { generateToken, requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/auth/users - List fictional accounts for training switcher
router.get("/users", async (_req, res) => {
  const result = await dbQuery("SELECT id, username, email, role, bio, avatar_url FROM users ORDER BY id ASC");
  res.json(result.rows);
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const result = await dbQuery("SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)", [username]);
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken(user);
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 8 * 3600 * 1000 });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      bio: user.bio,
      avatar_url: user.avatar_url
    }
  });
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false, user: null });
  }
  res.json({ authenticated: true, user: req.user });
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true, message: "Logged out" });
});

export default router;

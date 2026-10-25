import express from "express";
import { dbQuery } from "../db/pool.js";

const router = express.Router();

// GET /api/tasks - Kanban task list
router.get("/", async (_req, res) => {
  const result = await dbQuery("SELECT * FROM tasks ORDER BY id ASC");
  res.json(result.rows);
});

// POST /api/tasks - Create new task card
router.post("/", async (req, res) => {
  const title = String(req.body.title || "").slice(0, 200);
  const description = String(req.body.description || "").slice(0, 2000);
  const status = String(req.body.status || "todo").slice(0, 50);
  const priority = String(req.body.priority || "medium").slice(0, 20);
  const assignee = String(req.body.assignee_name || "Mira").slice(0, 100);

  if (!title.trim()) {
    return res.status(400).json({ error: "Task title is required" });
  }

  const result = await dbQuery(
    "INSERT INTO tasks (title, description, status, priority, assignee_name) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [title, description, status, priority, assignee]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /api/tasks/:id/status - Update Kanban card column
router.put("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "todo");
  const allowed = ["todo", "in_progress", "review", "done"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const result = await dbQuery("UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
  if (!result.rows.length) {
    return res.status(404).json({ error: "Task not found" });
  }
  res.json(result.rows[0]);
});

export default router;

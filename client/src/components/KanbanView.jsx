import React, { useState, useEffect } from "react";
import { apiGetTasks, apiCreateTask, apiUpdateTaskStatus } from "../api.js";

const COLUMNS = [
  { key: "todo", title: "📋 To Do" },
  { key: "in_progress", title: "⚡ In Progress" },
  { key: "review", title: "🔍 In Review" },
  { key: "done", title: "✅ Done" }
];

export function KanbanView({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState(currentUser ? currentUser.username : "Mira");

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await apiGetTasks();
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await apiCreateTask({ title, description, priority, assignee_name: assignee, status: "todo" });
      setTitle("");
      setDescription("");
      setShowModal(false);
      await loadTasks();
    } catch (err) {
      alert("Failed to create task: " + err.message);
    }
  };

  const handleMove = async (task, direction) => {
    const colOrder = ["todo", "in_progress", "review", "done"];
    const currentIndex = colOrder.indexOf(task.status);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < colOrder.length) {
      const nextStatus = colOrder[nextIndex];
      try {
        await apiUpdateTaskStatus(task.id, nextStatus);
        await loadTasks();
      } catch (err) {
        alert("Failed to update status: " + err.message);
      }
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>Sprint Kanban Board</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + New Task
        </button>
      </div>

      {showModal && (
        <div className="card" style={{ border: "2px solid #2563eb", marginBottom: "20px" }}>
          <h3>Create Task</h3>
          <form onSubmit={handleCreate}>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <div className="grid-2">
              <div>
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label>Assignee</label>
                <input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button type="submit" className="btn-primary">Save Task</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="kanban-column">
              <h3 style={{ fontSize: "1rem", marginBottom: "12px", color: "#334155" }}>
                {col.title} ({colTasks.length})
              </h3>
              {colTasks.map((t) => (
                <div key={t.id} className="kanban-card">
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>
                    {t.title}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "8px" }}>
                    {t.description}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                    <span style={{ color: "#2563eb", fontWeight: "bold" }}>@{t.assignee_name}</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {col.key !== "todo" && (
                        <button
                          onClick={() => handleMove(t, -1)}
                          className="btn-secondary"
                          style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                          title="Move Left"
                        >
                          ◀
                        </button>
                      )}
                      {col.key !== "done" && (
                        <button
                          onClick={() => handleMove(t, 1)}
                          className="btn-secondary"
                          style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                          title="Move Right"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

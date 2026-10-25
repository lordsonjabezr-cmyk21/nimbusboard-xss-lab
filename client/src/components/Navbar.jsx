import React from "react";

export function Navbar({ activeTab, setActiveTab, currentUser, onSelectUser, onLogout }) {
  const users = [
    { username: "ari", name: "Ari (Admin)", role: "admin", token: "token-ari" },
    { username: "noah", name: "Noah (Mod)", role: "moderator", token: "token-noah" },
    { username: "mira", name: "Mira (User)", role: "user", token: "token-mira" },
  ];

  return (
    <header className="app-header">
      <div className="brand">
        <span>☁️</span>
        <span>NimbusBoard</span>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-btn ${activeTab === "feed" ? "active" : ""}`}
          onClick={() => setActiveTab("feed")}
        >
          Team Feed
        </button>
        <button
          className={`nav-btn ${activeTab === "kanban" ? "active" : ""}`}
          onClick={() => setActiveTab("kanban")}
        >
          Kanban Board
        </button>
        <button
          className={`nav-btn ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          Search
        </button>
        <button
          className={`nav-btn ${activeTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          Live Preview
        </button>
        <button
          className={`nav-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>
        <button
          className={`nav-btn ${activeTab === "support" ? "active" : ""}`}
          onClick={() => setActiveTab("support")}
        >
          Support
        </button>
        <button
          className={`nav-btn ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => setActiveTab("admin")}
        >
          Admin & Mod
        </button>
        <button
          className={`nav-btn ${activeTab === "lab" ? "active" : ""}`}
          onClick={() => setActiveTab("lab")}
          style={{ fontWeight: "bold", color: "#b45309" }}
        >
          🎯 Lab & Scoreboard
        </button>
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Role:</span>
        {users.map((u) => {
          const isActive = currentUser?.username === u.username;
          return (
            <button
              key={u.username}
              onClick={() => onSelectUser(u)}
              className={`btn-secondary role-tag role-${u.role}`}
              style={{
                padding: "5px 10px",
                cursor: "pointer",
                border: isActive ? "2px solid #2563eb" : "1px solid #cbd5e1",
                fontWeight: isActive ? "bold" : "normal"
              }}
            >
              {isActive ? "● " : ""}{u.name}
            </button>
          );
        })}
      </div>
    </header>
  );
}

import React from "react";

export function Navbar({ activeTab, setActiveTab, currentUser, onSelectUser, onLogout, onOpenLogin }) {
  const users = [
    { username: "ari", name: "Ari (Admin)", role: "admin", token: "token-ari" },
    { username: "noah", name: "Noah (Mod)", role: "moderator", token: "token-noah" },
    { username: "mira", name: "Mira (User)", role: "user", token: "token-mira" },
  ];

  return (
    <header className="app-header">
      <div className="brand" style={{ cursor: "pointer" }} onClick={() => setActiveTab("feed")}>
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

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {/* Fast Role Switcher (Educational Shortcuts) */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Role:</span>
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

        {/* Authentication State & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "4px" }}>
          {currentUser ? (
            <>
              <div
                className="user-badge"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#f1f5f9",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1"
                }}
              >
                <span style={{ fontSize: "0.9rem" }}>👤</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b" }}>{currentUser.username}</span>
                <span className={`role-tag role-${currentUser.role}`} style={{ fontSize: "0.65rem" }}>
                  {currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenLogin}
                className="btn-secondary"
                style={{
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  cursor: "pointer"
                }}
                title="Switch account or sign in with credentials"
              >
                Switch
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="btn-secondary"
                style={{
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  color: "#dc2626",
                  borderColor: "#fca5a5"
                }}
                title="Sign out of current account"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="btn-primary"
              style={{
                padding: "6px 14px",
                fontSize: "0.85rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <span>🔑</span>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

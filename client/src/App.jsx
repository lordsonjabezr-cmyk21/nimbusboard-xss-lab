import React, { useState, useEffect } from "react";
import { SafetyBanner } from "./components/SafetyBanner.jsx";
import { Navbar } from "./components/Navbar.jsx";
import { FeedView } from "./components/FeedView.jsx";
import { KanbanView } from "./components/KanbanView.jsx";
import { SearchView } from "./components/SearchView.jsx";
import { LivePreviewView } from "./components/LivePreviewView.jsx";
import { ProfileView } from "./components/ProfileView.jsx";
import { SupportView } from "./components/SupportView.jsx";
import { AdminView } from "./components/AdminView.jsx";
import { LabScoreboardView } from "./components/LabScoreboardView.jsx";
import { apiGetStatus, apiResetLab, apiGetMe } from "./api.js";

function getTabFromPath() {
  const p = window.location.pathname.toLowerCase();
  if (p.startsWith("/preview")) return "preview";
  if (p.startsWith("/search")) return "search";
  if (p.startsWith("/support")) return "support";
  if (p.startsWith("/admin")) return "admin";
  if (p.startsWith("/kanban")) return "kanban";
  if (p.startsWith("/profile")) return "profile";
  if (p.startsWith("/lab")) return "lab";
  return "feed";
}

export function App() {
  const [activeTab, setActiveTabState] = useState(getTabFromPath);
  const [mode, setMode] = useState(null);
  const [hints, setHints] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => {
    const t = localStorage.getItem("token");
    if (t === "token-ari") return { id: 1, username: "ari", role: "admin", email: "ari@nimbus.local" };
    if (t === "token-noah") return { id: 2, username: "noah", role: "moderator", email: "noah@nimbus.local" };
    if (t === "token-mira") return { id: 3, username: "mira", role: "user", email: "mira@nimbus.local" };
    return { id: 3, username: "mira", email: "mira@nimbus.local", role: "user" };
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const targetPath = tab === "feed" ? "/" : `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  };

  useEffect(() => {
    const onPopState = () => {
      setActiveTabState(getTabFromPath());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    // Self-XSS Awareness: DevTools console warning
    console.log(
      "%c⚠️ STOP!",
      "color: red; font-size: 32px; font-weight: bold; -webkit-text-stroke: 1px black;"
    );
    console.log(
      "%cThis is a browser feature intended for developers. If someone told you to copy and paste code here to unlock features or get flags, it is a Self-XSS attack (Category 6). Do not execute unknown scripts in the console.",
      "font-size: 14px; color: #1e3a8a; line-height: 1.5;"
    );

    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const s = await apiGetStatus();
      setMode(s.mode || "vulnerable");
      setHints(s.hints !== false);
    } catch {
      // Fallback
      setMode("vulnerable");
    }
  };

  const handleSelectUser = (u) => {
    localStorage.setItem("token", u.token);
    setCurrentUser({ id: u.username === "ari" ? 1 : u.username === "noah" ? 2 : 3, username: u.username, role: u.role, email: `${u.username}@nimbus.local` });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
  };

  const handleReset = async () => {
    if (confirm("Reset the lab database to initial seed state?")) {
      try {
        await apiResetLab();
        localStorage.removeItem("nimbus_solved");
        alert("Lab state successfully reset to initial seeds!");
        window.location.reload();
      } catch (err) {
        alert("Reset failed: " + err.message);
      }
    }
  };

  if (!mode) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#64748b" }}>
        <p>Loading NimbusBoard Training Lab...</p>
      </div>
    );
  }

  return (
    <div>
      <SafetyBanner mode={mode} hints={hints} onReset={handleReset} />
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === "feed" && <FeedView mode={mode} currentUser={currentUser} />}
        {activeTab === "kanban" && <KanbanView currentUser={currentUser} />}
        {activeTab === "search" && <SearchView mode={mode} />}
        {activeTab === "preview" && <LivePreviewView mode={mode} />}
        {activeTab === "profile" && <ProfileView mode={mode} currentUser={currentUser} />}
        {activeTab === "support" && <SupportView currentUser={currentUser} />}
        {activeTab === "admin" && <AdminView mode={mode} currentUser={currentUser} />}
        {activeTab === "lab" && <LabScoreboardView mode={mode} hintsEnabled={hints} />}
      </main>

      <footer className="footer">
        <div><strong>NimbusBoard Security Training Environment</strong> · Authorized local education only.</div>
        <div style={{ marginTop: "4px", fontSize: "0.8rem" }}>
          Mode: <strong>{mode.toUpperCase()}</strong> · Never expose this application to the public internet.
        </div>
      </footer>
    </div>
  );
}

export default App;

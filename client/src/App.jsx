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
import { LoginModal } from "./components/LoginModal.jsx";
import { apiGetStatus, apiResetLab, apiGetMe, apiLogout } from "./api.js";

function getTabFromPath() {
  const p = window.location.pathname.toLowerCase();
  if (p.startsWith("/login")) return "login";
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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const t = localStorage.getItem("token");
    if (t === "logged-out") return null;
    if (t === "token-ari") return { id: 1, username: "ari", role: "admin", email: "ari@nimbus.local" };
    if (t === "token-noah") return { id: 2, username: "noah", role: "moderator", email: "noah@nimbus.local" };
    if (t === "token-mira") return { id: 3, username: "mira", role: "user", email: "mira@nimbus.local" };
    const saved = localStorage.getItem("nimbus_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    // Default initial user for lab training environment
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
    verifySession();
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

  const verifySession = async () => {
    const t = localStorage.getItem("token");
    if (t === "logged-out") {
      setCurrentUser(null);
      return;
    }
    // If it's a dev token, keep local representation
    if (t === "token-ari" || t === "token-noah" || t === "token-mira") {
      return;
    }
    // Otherwise check with backend if JWT or cookie is active
    try {
      const data = await apiGetMe();
      if (data && data.authenticated && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem("nimbus_user", JSON.stringify(data.user));
      }
    } catch {
      // Not authenticated or network down
    }
  };

  const handleSelectUser = (u) => {
    localStorage.setItem("token", u.token);
    const userObj = {
      id: u.username === "ari" ? 1 : u.username === "noah" ? 2 : 3,
      username: u.username,
      role: u.role,
      email: `${u.username}@nimbus.local`
    };
    localStorage.setItem("nimbus_user", JSON.stringify(userObj));
    setCurrentUser(userObj);
  };

  const handleLoginSuccess = (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("nimbus_user", JSON.stringify(user));
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    if (activeTab === "login") {
      setActiveTab("feed");
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {}
    localStorage.setItem("token", "logged-out");
    localStorage.removeItem("nimbus_user");
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
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <main className="main-content">
        {!currentUser && activeTab !== "login" && (
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              padding: "12px 18px",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.2rem" }}>ℹ️</span>
              <span style={{ fontSize: "0.9rem", color: "#475569" }}>
                You are currently browsing as <strong>Guest</strong>. Sign in to update your profile, post updates, or access moderation tools.
              </span>
            </div>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="btn-primary"
              style={{ padding: "6px 14px", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Sign In
            </button>
          </div>
        )}

        {activeTab === "login" && (
          <LoginModal
            embedded={true}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        {activeTab === "feed" && <FeedView mode={mode} currentUser={currentUser} />}
        {activeTab === "kanban" && <KanbanView currentUser={currentUser} />}
        {activeTab === "search" && <SearchView mode={mode} />}
        {activeTab === "preview" && <LivePreviewView mode={mode} />}
        {activeTab === "profile" && <ProfileView mode={mode} currentUser={currentUser} />}
        {activeTab === "support" && <SupportView currentUser={currentUser} />}
        {activeTab === "admin" && <AdminView mode={mode} currentUser={currentUser} />}
        {activeTab === "lab" && <LabScoreboardView mode={mode} hintsEnabled={hints} />}
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

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

import React, { useState } from "react";
import { apiLogin, apiRegister } from "../api.js";

export function LoginModal({ isOpen, onClose, onLoginSuccess, embedded = false }) {
  const [tab, setTab] = useState("login"); // "login" or "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen && !embedded) return null;

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setEmail("");
    setConfirmPassword("");
    setError(null);
    setSuccessMsg(null);
  };

  const handleSwitchTab = (newTab) => {
    setTab(newTab);
    setError(null);
    setSuccessMsg(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiLogin(username.trim(), password);
      setSuccessMsg("Login successful! Welcome back.");
      setTimeout(() => {
        onLoginSuccess(res.user, res.token);
        if (onClose) onClose();
      }, 300);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!username.trim() || !email.trim() || !password) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRegister(username.trim(), email.trim(), password);
      setSuccessMsg("Account created successfully!");
      setTimeout(() => {
        onLoginSuccess(res.user, res.token);
        if (onClose) onClose();
      }, 500);
    } catch (err) {
      setError(err.message || "Registration failed. Username or email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const fillTrainingCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  const quickLoginAs = async (u, p) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    setLoading(true);
    try {
      const res = await apiLogin(u, p);
      onLoginSuccess(res.user, res.token);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || "Quick login failed.");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div
      className="card"
      style={{
        maxWidth: "460px",
        width: "100%",
        margin: embedded ? "20px auto" : "0",
        padding: "28px",
        position: "relative",
        boxShadow: embedded ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        borderRadius: "12px",
        background: "#ffffff"
      }}
    >
      {!embedded && onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "1.4rem",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "4px 8px",
            lineHeight: 1
          }}
          aria-label="Close"
        >
          &times;
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "6px" }}>☁️</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1e3a8a", margin: "0 0 6px 0" }}>
          {tab === "login" ? "Sign In to NimbusBoard" : "Create Account"}
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
          {tab === "login"
            ? "Access your shared team workspace and security lab"
            : "Register a new training workspace account"}
        </p>
      </div>

      {/* Mode Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          marginBottom: "20px",
          gap: "8px"
        }}
      >
        <button
          type="button"
          onClick={() => handleSwitchTab("login")}
          style={{
            flex: 1,
            padding: "10px",
            background: "none",
            border: "none",
            borderBottom: tab === "login" ? "2px solid #2563eb" : "2px solid transparent",
            color: tab === "login" ? "#2563eb" : "#64748b",
            fontWeight: tab === "login" ? "700" : "500",
            cursor: "pointer"
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => handleSwitchTab("register")}
          style={{
            flex: 1,
            padding: "10px",
            background: "none",
            border: "none",
            borderBottom: tab === "register" ? "2px solid #2563eb" : "2px solid transparent",
            color: tab === "register" ? "#2563eb" : "#64748b",
            fontWeight: tab === "register" ? "700" : "500",
            cursor: "pointer"
          }}
        >
          Register
        </button>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <div
          role="alert"
          style={{
            background: "#fee2e2",
            border: "1px solid #f87171",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          style={{
            background: "#dcfce7",
            border: "1px solid #86efac",
            color: "#166534",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sign In Form */}
      {tab === "login" ? (
        <form onSubmit={handleLoginSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
              Username or Email
            </label>
            <input
              type="text"
              name="username"
              id="login-username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ari or ari@nimbus.local"
              required
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.95rem"
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "10px 40px 10px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "0.95rem"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: "#64748b",
                  padding: "4px"
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: "4px"
            }}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>

          {/* Quick Fill / Training Shortcuts */}
          <div
            style={{
              marginTop: "24px",
              padding: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px"
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
              🧪 Educational Training Accounts (1-Click Fill)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                type="button"
                onClick={() => quickLoginAs("ari", "AriAdmin2026!")}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  textAlign: "left"
                }}
              >
                <span><strong>Ari</strong> (Admin) &middot; <code style={{ fontSize: "0.75rem", color: "#64748b" }}>AriAdmin2026!</code></span>
                <span className="role-tag role-admin">ADMIN</span>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs("noah", "NoahMod2026!")}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  textAlign: "left"
                }}
              >
                <span><strong>Noah</strong> (Mod) &middot; <code style={{ fontSize: "0.75rem", color: "#64748b" }}>NoahMod2026!</code></span>
                <span className="role-tag role-moderator">MOD</span>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs("mira", "MiraUser2026!")}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  textAlign: "left"
                }}
              >
                <span><strong>Mira</strong> (User) &middot; <code style={{ fontSize: "0.75rem", color: "#64748b" }}>MiraUser2026!</code></span>
                <span className="role-tag role-user">USER</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Registration Form */
        <form onSubmit={handleRegisterSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
              Username
            </label>
            <input
              type="text"
              name="reg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex"
              required
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.95rem"
              }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
              Email Address
            </label>
            <input
              type="email"
              name="reg-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex@nimbus.local"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.95rem"
              }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
              Password
            </label>
            <input
              type="password"
              name="reg-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.95rem"
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
              Confirm Password
            </label>
            <input
              type="password"
              name="reg-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.95rem"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: "4px"
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "16px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {content}
    </div>
  );
}

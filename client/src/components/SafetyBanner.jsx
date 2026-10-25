import React from "react";

export function SafetyBanner({ mode, hints, onReset }) {
  const isVuln = mode === "vulnerable";

  return (
    <div className="safety-banner">
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span>⚠️ INTENTIONALLY VULNERABLE TRAINING LAB</span>
        <span>·</span>
        <span>MODE: <span className={`mode-pill ${isVuln ? "mode-vulnerable" : "mode-fixed"}`}>{mode.toUpperCase()}</span></span>
        <span>·</span>
        <span>HINTS: {hints ? "ON" : "OFF"}</span>
        <span>·</span>
        <span>LOCAL USE ONLY</span>
      </div>
      <div>
        <button
          onClick={onReset}
          className="btn-secondary"
          style={{ padding: "4px 10px", fontSize: "0.75rem", background: "white" }}
          title="Reset database to predictable seed state"
        >
          🔄 Reset Lab State
        </button>
      </div>
    </div>
  );
}

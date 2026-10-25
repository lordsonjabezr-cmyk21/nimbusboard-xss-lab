import React, { useState, useEffect } from "react";
import { apiGetScoreboard, apiGetHints, apiSubmitFlag, apiGetChallenges } from "../api.js";

export function LabScoreboardView({ mode, hintsEnabled }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("reflected");
  const [hints, setHints] = useState([]);
  const [flagInput, setFlagInput] = useState("");
  const [flagFeedback, setFlagFeedback] = useState(null);
  const [solvedList, setSolvedList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nimbus_solved") || "[]");
    } catch {
      return [];
    }
  });

  // Interactive challenge test states
  const [testPayload, setTestPayload] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [runningTest, setRunningTest] = useState(false);

  useEffect(() => {
    loadScoreboard();
    loadCategoryHints(selectedCat);
  }, [selectedCat]);

  const loadScoreboard = async () => {
    try {
      const data = await apiGetScoreboard();
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Failed to load scoreboard", err);
    }
  };

  const loadCategoryHints = async (catId) => {
    try {
      const res = await apiGetHints(catId);
      setHints(res.hints || []);
    } catch {
      setHints(["Hints are disabled or unavailable."]);
    }
  };

  const handleFlagSubmit = async (e) => {
    e.preventDefault();
    if (!flagInput.trim()) return;
    try {
      const res = await apiSubmitFlag(selectedCat, flagInput.trim());
      if (res.accepted) {
        setFlagFeedback({ ok: true, text: `🎉 ${res.message} (+${res.points} pts)` });
        const updated = Array.from(new Set([...solvedList, selectedCat]));
        setSolvedList(updated);
        localStorage.setItem("nimbus_solved", JSON.stringify(updated));
        setFlagInput("");
      } else {
        setFlagFeedback({ ok: false, text: "❌ Invalid flag. Re-check the challenge context." });
      }
    } catch (err) {
      setFlagFeedback({ ok: false, text: "❌ " + err.message });
    }
  };

  const executeChallengeTest = async (endpoint, method = "GET", body = null) => {
    setRunningTest(true);
    setTestResult(null);
    try {
      const opts = {
        method,
        headers: { "Content-Type": "application/json" }
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(endpoint, opts);
      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      setTestResult({ ok: res.ok, status: res.status, data });
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    } finally {
      setRunningTest(false);
    }
  };

  const totalScore = solvedList.length * 100;

  return (
    <div>
      {/* Scoreboard overview card */}
      <div className="card" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", margin: 0 }}>NimbusBoard XSS Training Laboratory</h1>
            <p style={{ opacity: 0.9, marginTop: "4px" }}>
              10 Training Categories · 20+ Graded Test Scenarios · Vulnerable & Fixed Mode Comparison
            </p>
          </div>
          <div style={{ textAlign: "right", background: "rgba(255,255,255,0.15)", padding: "10px 18px", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Total Progress</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>{totalScore} / 1000 pts</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>{solvedList.length} of 10 Solved</div>
          </div>
        </div>
      </div>

      {/* Category selector pills */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginBottom: "16px" }}>
        {[
          { id: "reflected", label: "01 Reflected" },
          { id: "stored", label: "02 Stored" },
          { id: "dom", label: "03 DOM" },
          { id: "mutation", label: "04 Mutation (mXSS)" },
          { id: "blind", label: "05 Blind XSS" },
          { id: "self", label: "06 Self-XSS" },
          { id: "csp", label: "07 CSP & Filters" },
          { id: "framework", label: "08 Modern Framework" },
          { id: "markdown", label: "09 Markdown & Rich-Text" },
          { id: "encoding", label: "10 Encoding & Polyglots" }
        ].map((cat) => {
          const isSolved = solvedList.includes(cat.id);
          const isSelected = selectedCat === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setSelectedCat(cat.id); setFlagFeedback(null); setTestResult(null); }}
              className={`btn-secondary ${isSelected ? "active" : ""}`}
              style={{
                whiteSpace: "nowrap",
                fontWeight: isSelected ? "bold" : "normal",
                border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                background: isSelected ? "#eff6ff" : "white"
              }}
            >
              {isSolved ? "✅ " : "⭕ "}
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid-2">
        {/* Left Column: Interactive Exercise Sandbox */}
        <div>
          <div className="card">
            <h3>Category Exercise Details: {selectedCat.toUpperCase()}</h3>

            {selectedCat === "reflected" && (
              <div>
                <p><strong>XSS-REFL-01:</strong> Search Query Body Context (<code>/api/challenges/reflected/search?q=...</code>)</p>
                <p><strong>XSS-REFL-02:</strong> Quoted Attribute Context (<code>/api/challenges/reflected/share?term=...</code>)</p>
                <div style={{ marginTop: "12px" }}>
                  <label>Search Reflection Probe</label>
                  <input
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    placeholder='e.g. <b>search_marker</b> or " onmouseover="test"'
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-primary"
                      onClick={() => executeChallengeTest(`/api/challenges/reflected/search?q=${encodeURIComponent(testPayload)}`)}
                      disabled={runningTest}
                    >
                      Test XSS-REFL-01 (Body)
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => executeChallengeTest(`/api/challenges/reflected/share?term=${encodeURIComponent(testPayload)}`)}
                      disabled={runningTest}
                    >
                      Test XSS-REFL-02 (Attr)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedCat === "stored" && (
              <div>
                <p><strong>XSS-STOR-01:</strong> Team Feed Post/Comment Rich Content</p>
                <p><strong>XSS-STOR-02:</strong> User Profile Biography rendered across cards and popovers</p>
                <div style={{ marginTop: "12px" }}>
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Stored content is persisted in PostgreSQL. Observe how the same stored value is rendered in vulnerable vs fixed mode.
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => executeChallengeTest("/api/posts")}
                  >
                    Inspect Stored Posts Endpoint
                  </button>
                </div>
              </div>
            )}

            {selectedCat === "dom" && (
              <div>
                <p><strong>XSS-DOM-01:</strong> <code>location.hash</code> flowing to <code>innerHTML</code> sink</p>
                <p><strong>XSS-DOM-02:</strong> <code>window.postMessage</code> receiver with missing origin check</p>
                <div style={{ marginTop: "12px" }}>
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    DOM XSS occurs strictly inside the client without reaching the server. Test on the <strong>Live Preview</strong> tab!
                  </p>
                  <a href="/preview#<b>DOM_MARKER</b>" className="btn-secondary" style={{ display: "inline-block", padding: "6px 12px" }}>
                    Test Hash Sink in Preview
                  </a>
                </div>
              </div>
            )}

            {selectedCat === "mutation" && (
              <div>
                <p><strong>XSS-MUT-01:</strong> Parser-Sanitizer MathML/SVG Namespace Mismatch</p>
                <p><strong>XSS-MUT-02:</strong> Naive Regex Sanitizer with innerHTML Parser Roundtrip</p>
                <div style={{ marginTop: "12px" }}>
                  <label>Mutation HTML Payload</label>
                  <textarea
                    rows={3}
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    placeholder='<math><annotation-xml encoding="text/html"><style><!--</style><img src=x onerror=alert(1)>'
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-primary"
                      onClick={() => executeChallengeTest("/api/challenges/mutation/parse", "POST", { payload: testPayload })}
                    >
                      Test XSS-MUT-01 (MathML)
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => executeChallengeTest("/api/challenges/mutation/roundtrip", "POST", { html: testPayload })}
                    >
                      Test XSS-MUT-02 (Roundtrip)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedCat === "blind" && (
              <div>
                <p><strong>XSS-BLIND-01:</strong> Support Feedback Ticket viewed in privileged Admin Queue</p>
                <p><strong>XSS-BLIND-02:</strong> Email Notification Preview Template Workflow</p>
                <div style={{ marginTop: "12px" }}>
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Submit a message via the Support tab. A safe local-only callback will trigger on <code>http://127.0.0.1:5000</code>.
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => executeChallengeTest("/api/challenges/blind/feedback")}
                  >
                    Check Feedback Queue
                  </button>
                </div>
              </div>
            )}

            {selectedCat === "self" && (
              <div>
                <p><strong>XSS-SELF-01:</strong> Developer Console Paste Social Engineering</p>
                <p><strong>XSS-SELF-02:</strong> Malicious Bookmarklet Drag-and-Drop</p>
                <div style={{ marginTop: "12px" }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      console.log("%cSTOP!", "color:red;font-size:36px;font-weight:bold;");
                      console.log("%cThis is a browser feature intended for developers. Pasting code here can compromise your session (Self-XSS).", "font-size:14px;color:#333;");
                      alert("Self-XSS defensive warning printed in browser DevTools console! Open F12 to inspect.");
                    }}
                  >
                    Trigger DevTools Console Warning
                  </button>
                </div>
              </div>
            )}

            {selectedCat === "csp" && (
              <div>
                <p><strong>XSS-CSP-01:</strong> Weak Route CSP Header (<code>'unsafe-inline'</code>)</p>
                <p><strong>XSS-CSP-02:</strong> Static Nonce Reuse & Missing <code>base-uri</code></p>
                <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                  <a
                    href="/api/challenges/csp/weak-header?q=<b>CSP_TEST</b>"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                    style={{ textDecoration: "none" }}
                  >
                    Open Weak CSP Route (XSS-CSP-01)
                  </a>
                  <a
                    href="/api/challenges/csp/nonce-test?script=console.log('Nonce executed')"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ textDecoration: "none" }}
                  >
                    Open Nonce Route (XSS-CSP-02)
                  </a>
                </div>
              </div>
            )}

            {selectedCat === "framework" && (
              <div>
                <p><strong>XSS-FW-01:</strong> React <code>dangerouslySetInnerHTML</code> Escape Hatch</p>
                <p><strong>XSS-FW-02:</strong> Dynamic Href Protocol Injection (<code>javascript:</code>)</p>
                <div style={{ marginTop: "12px" }}>
                  <label>Test URL or Markup</label>
                  <input
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    placeholder='javascript:alert(1) or <b onmouseover=...>'
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-primary"
                      onClick={() => executeChallengeTest("/api/challenges/framework/dangerously-set-html", "POST", { content: testPayload })}
                    >
                      Test React dangerouslySetInnerHTML
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => executeChallengeTest("/api/challenges/framework/javascript-href", "POST", { url: testPayload })}
                    >
                      Test Dynamic Href Scheme
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedCat === "markdown" && (
              <div>
                <p><strong>XSS-MD-01:</strong> Markdown Raw HTML Passthrough</p>
                <p><strong>XSS-MD-02:</strong> Markdown Link Scheme Validation (<code>[click](javascript:...)</code>)</p>
                <div style={{ marginTop: "12px" }}>
                  <label>Markdown Input</label>
                  <textarea
                    rows={3}
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    placeholder="[Click me](javascript:alert(1)) or <img src=x onerror=alert(1)>"
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-primary"
                      onClick={() => executeChallengeTest("/api/challenges/markdown/passthrough", "POST", { markdown: testPayload })}
                    >
                      Test Raw HTML Passthrough
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => executeChallengeTest("/api/challenges/markdown/scheme-links", "POST", { markdown: testPayload })}
                    >
                      Test Link Scheme
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedCat === "encoding" && (
              <div>
                <p><strong>XSS-ENC-01:</strong> Inconsistent Normalization & Double-Decoding</p>
                <p><strong>XSS-ENC-02:</strong> Naive Blacklist Filter Keyword Stripping</p>
                <div style={{ marginTop: "12px" }}>
                  <label>Encoded / Nested Input</label>
                  <input
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    placeholder="%253Cscript%253E or <scr<script>ipt>"
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-primary"
                      onClick={() => executeChallengeTest(`/api/challenges/encoding/double-decode?input=${encodeURIComponent(testPayload)}`)}
                    >
                      Test Double Decode
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => executeChallengeTest(`/api/challenges/encoding/script-strip?input=${encodeURIComponent(testPayload)}`)}
                    >
                      Test Script Stripping
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Test result output box */}
            {testResult && (
              <div style={{ marginTop: "16px", padding: "12px", background: "#0f172a", color: "#f8fafc", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.85rem", overflowX: "auto" }}>
                <div style={{ color: "#38bdf8", marginBottom: "6px" }}>Response Status: {testResult.status || 200}</div>
                <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Hints & Flag Submission */}
        <div>
          {/* Hints card */}
          <div className="card">
            <h3>Training Hints</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "12px" }}>
              Guidance for analyzing source, transformation, and browser sink:
            </p>
            <ul style={{ paddingLeft: "20px", fontSize: "0.9rem", lineHeight: "1.6" }}>
              {hints.map((h, i) => (
                <li key={i} style={{ marginBottom: "6px" }}>{h}</li>
              ))}
            </ul>
          </div>

          {/* Flag submission card */}
          <div className="card" style={{ border: "2px solid #3b82f6" }}>
            <h3>Submit Challenge Flag</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "12px" }}>
              Category: <strong>{selectedCat.toUpperCase()}</strong>
            </p>
            <form onSubmit={handleFlagSubmit}>
              <label>Flag Code (e.g. <code>FLAG&#123;...&#125;</code>)</label>
              <input
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                placeholder="FLAG{xss_...}"
                required
              />
              <button type="submit" className="btn-primary" style={{ width: "100%" }}>
                Submit Flag
              </button>
            </form>

            {flagFeedback && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  borderRadius: "6px",
                  background: flagFeedback.ok ? "#ecfdf5" : "#fef2f2",
                  color: flagFeedback.ok ? "#065f46" : "#991b1b",
                  border: `1px solid ${flagFeedback.ok ? "#a7f3d0" : "#fecaca"}`,
                  fontWeight: "bold",
                  fontSize: "0.9rem"
                }}
              >
                {flagFeedback.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

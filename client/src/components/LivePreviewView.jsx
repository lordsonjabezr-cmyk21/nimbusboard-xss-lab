import React, { useState, useEffect, useRef } from "react";

export function LivePreviewView({ mode }) {
  const [content, setContent] = useState("");
  const outputRef = useRef(null);

  const isVuln = mode === "vulnerable";

  // VULN: XSS-DOM-01 - URL hash reaches innerHTML sink
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash && outputRef.current) {
        const raw = decodeURIComponent(window.location.hash.slice(1));
        if (isVuln) {
          outputRef.current.innerHTML = raw;
        } else {
          outputRef.current.textContent = raw;
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [isVuln]);

  // VULN: XSS-DOM-02 - postMessage receiver with missing origin check
  useEffect(() => {
    const handleMessage = (e) => {
      if (!outputRef.current) return;
      if (mode === "vulnerable") {
        // Vulnerable: no origin check, writes straight to innerHTML
        if (typeof e.data === "string") {
          outputRef.current.innerHTML = e.data;
        }
      } else {
        // Fixed: strict origin check and safe textContent
        if (e.origin === window.location.origin && typeof e.data === "string") {
          outputRef.current.textContent = e.data;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [mode]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (!outputRef.current) return;
    if (isVuln) {
      outputRef.current.innerHTML = val;
    } else {
      outputRef.current.textContent = val;
    }
  };

  const handleTriggerPostMessage = () => {
    window.postMessage("<b>Test Message from postMessage</b>", "*");
  };

  return (
    <div>
      <div className="card">
        <h2>Live Comment & Markdown Preview (DOM XSS Lab)</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "16px" }}>
          Demonstrates client-side DOM sources and sinks: <code>location.hash</code> (XSS-DOM-01) and <code>window.postMessage</code> (XSS-DOM-02).
        </p>

        <label>Comment Composer</label>
        <textarea
          id="preview-input"
          rows={5}
          value={content}
          onChange={handleInputChange}
          placeholder="Type HTML or markdown to preview in real-time..."
        />

        <div style={{ margin: "16px 0" }}>
          <h4>Live Preview Output Container</h4>
          <div
            id="preview-output"
            ref={outputRef}
            className="preview-box"
          />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
          <a
            href="#<b>Hash%20Payload%20Test</b>"
            className="btn-secondary"
            style={{ textDecoration: "none", fontSize: "0.85rem", padding: "6px 12px" }}
          >
            Load URL Hash Example (XSS-DOM-01)
          </a>
          <button
            onClick={handleTriggerPostMessage}
            className="btn-secondary"
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            Simulate postMessage Dispatch (XSS-DOM-02)
          </button>
        </div>
      </div>
    </div>
  );
}

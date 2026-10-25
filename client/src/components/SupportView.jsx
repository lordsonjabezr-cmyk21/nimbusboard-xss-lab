import React, { useState } from "react";
import { apiSubmitSupport } from "../api.js";

export function SupportView({ currentUser }) {
  const [name, setName] = useState(currentUser ? currentUser.username : "Guest");
  const [email, setEmail] = useState(currentUser ? currentUser.email : "guest@example.com");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      const res = await apiSubmitSupport({ name, email, category, message });
      setStatus({
        ok: true,
        text: `Ticket #${res.id} submitted! Viewable by moderators and administrators. Safe local OOB event dispatched to http://127.0.0.1:5000.`
      });
      setMessage("");
    } catch (err) {
      setStatus({ ok: false, text: "Error submitting ticket: " + err.message });
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Submit Support Request (Blind XSS Lab - XSS-BLIND-01)</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "16px" }}>
          User feedback submitted here is stored and reviewed later in privileged queues (Admin console and Email digest).
          A local-only callback listener at port 5000 records workflow verification events.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div>
              <label>Your Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label>Your Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <label>Inquiry Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="general">General Support</option>
            <option value="billing">Account & Billing</option>
            <option value="feature">Feature Request</option>
            <option value="security">Security Vulnerability Report</option>
          </select>

          <label>Message Content</label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue or feedback in detail..."
            required
            maxLength={2000}
          />

          <button type="submit" className="btn-primary">
            Submit Support Request
          </button>
        </form>

        {status && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "6px",
              background: status.ok ? "#ecfdf5" : "#fef2f2",
              color: status.ok ? "#065f46" : "#991b1b",
              border: `1px solid ${status.ok ? "#a7f3d0" : "#fecaca"}`
            }}
          >
            {status.text}
          </div>
        )}

        <div style={{ marginTop: "24px", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
          <h4>Local OOB Listener Workflow</h4>
          <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
            The backend dispatches a fixed event payload <code>&#123; "event": "feedback-submitted", "id": ... &#125;</code> to the local listener (<code>http://127.0.0.1:5000/</code>). Check the listener console to confirm the workflow trigger.
          </p>
        </div>
      </div>
    </div>
  );
}

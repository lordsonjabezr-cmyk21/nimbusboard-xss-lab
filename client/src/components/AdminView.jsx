import React, { useState, useEffect } from "react";
import { apiGetAdminFeedback, apiGetAuditLogs, apiGetEmails, apiDeleteComment, apiGetPosts } from "../api.js";

export function AdminView({ mode, currentUser }) {
  const [feedback, setFeedback] = useState([]);
  const [emails, setEmails] = useState([]);
  const [posts, setPosts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("feedback");
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);

  const isVuln = mode === "vulnerable";
  const isPrivileged = currentUser && (currentUser.role === "moderator" || currentUser.role === "admin");

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const [feedbackData, emailsData, postsData] = await Promise.all([
        apiGetAdminFeedback().catch(err => { throw err; }),
        apiGetEmails().catch(() => []),
        apiGetPosts().catch(() => [])
      ]);
      setFeedback(feedbackData);
      setEmails(emailsData);
      setPosts(postsData);

      if (currentUser?.role === "admin") {
        const logs = await apiGetAuditLogs().catch(() => []);
        setAuditLogs(logs);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await apiDeleteComment(commentId);
      await loadData();
    } catch (err) {
      alert("Error deleting comment: " + err.message);
    }
  };

  if (!isPrivileged) {
    return (
      <div className="card" style={{ border: "2px solid #ef4444" }}>
        <h2 style={{ color: "#b91c1c" }}>🔒 Access Denied: Server-Side Authorization Enforced</h2>
        <p style={{ margin: "12px 0", color: "#64748b" }}>
          This administrative review area is restricted to users with <strong>moderator</strong> or <strong>admin</strong> roles.
          Current role: <code>{currentUser ? currentUser.role : "unauthenticated"}</code>.
        </p>
        <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Use the role switcher in the top navigation bar to select <strong>Noah (Moderator)</strong> or <strong>Ari (Admin)</strong>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Moderation & Administrative Console</h2>
          <span className={`role-tag role-${currentUser.role}`}>{currentUser.role.toUpperCase()} CONSOLE</span>
        </div>

        <div style={{ display: "flex", gap: "8px", margin: "16px 0", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
          <button
            className={`btn-secondary ${activeSubTab === "feedback" ? "active" : ""}`}
            onClick={() => setActiveSubTab("feedback")}
          >
            Support Queue (XSS-BLIND-01)
          </button>
          <button
            className={`btn-secondary ${activeSubTab === "emails" ? "active" : ""}`}
            onClick={() => setActiveSubTab("emails")}
          >
            Email Preview Digest (XSS-BLIND-02)
          </button>
          <button
            className={`btn-secondary ${activeSubTab === "moderation" ? "active" : ""}`}
            onClick={() => setActiveSubTab("moderation")}
          >
            Comment Moderation
          </button>
          {currentUser.role === "admin" && (
            <button
              className={`btn-secondary ${activeSubTab === "audit" ? "active" : ""}`}
              onClick={() => setActiveSubTab("audit")}
            >
              Audit Logs
            </button>
          )}
        </div>

        {loading ? (
          <p>Loading queue data...</p>
        ) : authError ? (
          <div style={{ color: "#ef4444" }}>Authorization Error: {authError}</div>
        ) : (
          <div>
            {/* Tab 1: Feedback review queue (XSS-BLIND-01) */}
            {activeSubTab === "feedback" && (
              <div>
                <h3>Support & Feedback Review Queue</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "12px" }}>
                  Demonstrates Blind XSS where an unprivileged submission is inspected by a privileged reviewer.
                </p>
                {feedback.length === 0 ? (
                  <p>No feedback submissions in queue.</p>
                ) : (
                  feedback.map((item) => (
                    <div key={item.id} className="card" style={{ background: "#f8fafc", marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#64748b" }}>
                        <span>From: <strong>{item.name}</strong> ({item.email})</span>
                        <span>Category: <strong>{item.category}</strong> · {new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ marginTop: "8px" }}>
                        <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Message Body:</label>
                        {/* VULN: XSS-BLIND-01 - User content rendered unsafely in admin view in vulnerable mode */}
                        {isVuln ? (
                          <div
                            className="admin-feedback-body"
                            dangerouslySetInnerHTML={{ __html: item.message }}
                            style={{ padding: "8px", background: "white", borderRadius: "6px", border: "1px solid #e2e8f0" }}
                          />
                        ) : (
                          <div
                            className="admin-feedback-body"
                            style={{ padding: "8px", background: "white", borderRadius: "6px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}
                          >
                            {item.safe_message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Email notification preview (XSS-BLIND-02) */}
            {activeSubTab === "emails" && (
              <div>
                <h3>Simulated Notification Email Previews</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "12px" }}>
                  Internal email notification templates rendered for review (XSS-BLIND-02).
                </p>
                {emails.length === 0 ? (
                  <p>No queued notification emails.</p>
                ) : (
                  emails.map((em) => (
                    <div key={em.id} className="card" style={{ background: "#f8fafc", marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <h4>{em.subject}</h4>
                        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>To: {em.recipient_email}</span>
                      </div>
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", overflow: "hidden" }}>
                        <iframe
                          title={`Email ${em.id}`}
                          src={`/api/email-preview/${em.id}/render`}
                          style={{ width: "100%", height: "180px", border: 0, background: "white" }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Comment moderation */}
            {activeSubTab === "moderation" && (
              <div>
                <h3>Comment Moderation Queue</h3>
                {posts.flatMap(p => p.comments || []).length === 0 ? (
                  <p>No comments to moderate.</p>
                ) : (
                  posts.flatMap(p => (p.comments || []).map(c => ({ ...c, postTitle: p.title }))).map((c) => (
                    <div key={c.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>{c.author_name}</strong> on <em>"{c.postTitle}"</em>:
                        <div style={{ color: "#475569", marginTop: "4px" }}>{c.safe_body}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Audit Logs (Admin only) */}
            {activeSubTab === "audit" && currentUser.role === "admin" && (
              <div>
                <h3>System Audit Trail</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                      <th style={{ padding: "8px" }}>Time</th>
                      <th style={{ padding: "8px" }}>Actor</th>
                      <th style={{ padding: "8px" }}>Action</th>
                      <th style={{ padding: "8px" }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px", color: "#64748b" }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                        <td style={{ padding: "8px", fontWeight: "bold" }}>{log.actor}</td>
                        <td style={{ padding: "8px" }}><code>{log.action}</code></td>
                        <td style={{ padding: "8px" }}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { apiGetUsers, apiUpdateProfile, apiUploadAvatar } from "../api.js";

export function ProfileView({ mode, currentUser }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [bioInput, setBioInput] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  const isVuln = mode === "vulnerable";

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const data = await apiGetUsers();
      setUsers(data);
      const target = currentUser ? data.find(u => u.username === currentUser.username) || data[0] : data[0];
      if (target) {
        setSelectedUser(target);
        setBioInput(target.bio || "");
      }
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setBioInput(u.bio || "");
    setStatusMsg("");
  };

  const handleSaveBio = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const updated = await apiUpdateProfile(selectedUser.id, { bio: bioInput });
      setSelectedUser(updated);
      setStatusMsg("Biography updated successfully.");
      await loadUsers();
    } catch (err) {
      setStatusMsg("Error updating bio: " + err.message);
    }
  };

  const handleUploadAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append("avatar", avatarFile);
    try {
      await apiUploadAvatar(formData);
      setStatusMsg("Avatar uploaded successfully.");
      await loadUsers();
    } catch (err) {
      setStatusMsg("Avatar upload failed: " + err.message);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Team Member Profiles & Biography (XSS-STOR-02)</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "16px" }}>
          User biographies are rendered across user cards and mention popovers. In vulnerable mode, bio HTML is rendered raw.
        </p>

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => handleSelectUser(u)}
              className={`btn-secondary ${selectedUser?.id === u.id ? "active" : ""}`}
              style={{ fontWeight: selectedUser?.id === u.id ? "bold" : "normal" }}
            >
              {u.username} ({u.role})
            </button>
          ))}
        </div>

        {selectedUser && (
          <div className="grid-2">
            <div>
              <h3>Edit Profile: @{selectedUser.username}</h3>
              <form onSubmit={handleSaveBio}>
                <label>Biography</label>
                <textarea
                  id="bio-input"
                  rows={4}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Tell the team about your role and background..."
                />
                <button type="submit" className="btn-primary">
                  Save Biography
                </button>
              </form>

              <hr style={{ margin: "20px 0", borderColor: "#e2e8f0" }} />

              <h4>Upload Profile Avatar</h4>
              <form onSubmit={handleUploadAvatar} style={{ marginTop: "10px" }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files[0])}
                />
                <button type="submit" className="btn-secondary">
                  Upload Avatar
                </button>
              </form>

              {statusMsg && (
                <p style={{ marginTop: "12px", color: statusMsg.includes("Error") ? "red" : "green", fontWeight: 600 }}>
                  {statusMsg}
                </p>
              )}
            </div>

            <div>
              <h3>Profile Card Preview</h3>
              <div className="card" style={{ background: "#f8fafc", border: "1px solid #cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: "bold" }}>
                    {selectedUser.username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ margin: 0 }}>@{selectedUser.username}</h4>
                    <span className={`role-tag role-${selectedUser.role}`}>{selectedUser.role}</span>
                  </div>
                </div>

                <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Rendered Biography:</label>
                {/* VULN: XSS-STOR-02 - Profile bio rendered directly in vulnerable mode */}
                {isVuln ? (
                  <div
                    className="profile-bio"
                    dangerouslySetInnerHTML={{ __html: selectedUser.bio }}
                    style={{ padding: "8px", background: "white", borderRadius: "6px", minHeight: "60px", border: "1px solid #e2e8f0" }}
                  />
                ) : (
                  <div
                    className="profile-bio"
                    style={{ padding: "8px", background: "white", borderRadius: "6px", minHeight: "60px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}
                  >
                    {selectedUser.bio}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

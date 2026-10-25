// NimbusBoard API Client

const API_BASE = "";

export async function fetchJson(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errorData.error || errorData.message || `Request failed with ${res.status}`);
  }
  return res.json();
}

// Authentication
export const apiLogin = (username, password) =>
  fetchJson("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });

export const apiGetMe = () =>
  fetchJson("/api/auth/me");

export const apiLogout = () =>
  fetchJson("/api/auth/logout", { method: "POST" });

export const apiGetUsers = () =>
  fetchJson("/api/auth/users");

// Posts & Comments
export const apiGetPosts = () =>
  fetchJson("/api/posts");

export const apiCreatePost = (data) =>
  fetchJson("/api/posts", { method: "POST", body: JSON.stringify(data) });

export const apiAddComment = (postId, data) =>
  fetchJson(`/api/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(data) });

// Kanban Tasks
export const apiGetTasks = () =>
  fetchJson("/api/tasks");

export const apiCreateTask = (data) =>
  fetchJson("/api/tasks", { method: "POST", body: JSON.stringify(data) });

export const apiUpdateTaskStatus = (id, status) =>
  fetchJson(`/api/tasks/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });

// User Profile & Avatars
export const apiGetUserProfile = (id) =>
  fetchJson(`/api/users/${id}`);

export const apiUpdateProfile = (id, data) =>
  fetchJson(`/api/users/${id}/profile`, { method: "PUT", body: JSON.stringify(data) });

export const apiUploadAvatar = async (formData) => {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/users/avatar", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    credentials: "include"
  });
  if (!res.ok) throw new Error("Avatar upload failed");
  return res.json();
};

// Support & Admin
export const apiSubmitSupport = (data) =>
  fetchJson("/api/support", { method: "POST", body: JSON.stringify(data) });

export const apiGetAdminFeedback = () =>
  fetchJson("/api/admin/feedback");

export const apiGetAuditLogs = () =>
  fetchJson("/api/admin/audit-logs");

export const apiDeleteComment = (id) =>
  fetchJson(`/api/admin/comments/${id}`, { method: "DELETE" });

// Email Previews
export const apiGetEmails = () =>
  fetchJson("/api/email-preview");

// Category Lab & Scoreboard
export const apiGetChallenges = () =>
  fetchJson("/api/challenges/registry");

export const apiGetHints = (category) =>
  fetchJson(`/lab/hints/${category}`);

export const apiGetScoreboard = () =>
  fetchJson("/lab/scoreboard");

export const apiSubmitFlag = (category, flag) =>
  fetchJson("/lab/flags/submit", { method: "POST", body: JSON.stringify({ category, flag }) });

export const apiResetLab = () =>
  fetchJson("/lab/reset", { method: "POST" });

export const apiGetStatus = () =>
  fetchJson("/lab/status");

import React, { useState, useEffect } from "react";
import { apiGetPosts, apiCreatePost, apiAddComment } from "../api.js";

export function FeedView({ mode, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState(currentUser ? currentUser.username : "Guest");
  const [commentInputs, setCommentInputs] = useState({});
  const [loading, setLoading] = useState(true);

  const isVuln = mode === "vulnerable";

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await apiGetPosts();
      setPosts(data);
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await apiCreatePost({ title, body, author });
      setTitle("");
      setBody("");
      await loadPosts();
    } catch (err) {
      alert("Error publishing post: " + err.message);
    }
  };

  const handleAddComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;
    try {
      await apiAddComment(postId, { body: text, author: currentUser ? currentUser.username : "Guest" });
      setCommentInputs({ ...commentInputs, [postId]: "" });
      await loadPosts();
    } catch (err) {
      alert("Error adding comment: " + err.message);
    }
  };

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: "12px" }}>Publish an update</h2>
        <form onSubmit={handleCreatePost}>
          <div className="grid-2">
            <div>
              <label>Post Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sprint Goals or Security Review"
                maxLength={200}
              />
            </div>
            <div>
              <label>Author Display Name</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>
          <label>Update Body</label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share an update with your team..."
            maxLength={4000}
          />
          <button type="submit" className="btn-primary">
            Publish Update
          </button>
        </form>
      </div>

      <h2 style={{ margin: "24px 0 12px 0" }}>Team Feed & Discussion</h2>

      {loading ? (
        <p>Loading posts...</p>
      ) : posts.length === 0 ? (
        <p>No posts available.</p>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="card post-item">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <h3 style={{ color: "#1e3a8a" }}>{post.title}</h3>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                By <strong>{post.author_name}</strong> · {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* VULN: XSS-STOR-01 - Stored XSS rendered via dangerouslySetInnerHTML in vulnerable mode */}
            {isVuln ? (
              <div
                className="post-body"
                dangerouslySetInnerHTML={{ __html: post.body }}
                style={{ marginBottom: "16px", lineHeight: "1.6" }}
              />
            ) : (
              <div className="post-body" style={{ marginBottom: "16px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {post.safe_body}
              </div>
            )}

            {/* Comments list */}
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", marginTop: "12px" }}>
              <h4 style={{ fontSize: "0.9rem", color: "#475569", marginBottom: "8px" }}>
                Comments ({post.comments?.length || 0})
              </h4>
              {post.comments?.map((c) => (
                <div key={c.id} style={{ borderBottom: "1px solid #e2e8f0", padding: "6px 0", fontSize: "0.9rem" }}>
                  <strong>{c.author_name}:</strong>{" "}
                  {isVuln ? (
                    <span dangerouslySetInnerHTML={{ __html: c.body }} />
                  ) : (
                    <span>{c.safe_body}</span>
                  )}
                </div>
              ))}

              {/* Add comment */}
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <input
                  style={{ marginBottom: 0 }}
                  placeholder="Write a comment..."
                  value={commentInputs[post.id] || ""}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                />
                <button
                  className="btn-secondary"
                  onClick={() => handleAddComment(post.id)}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

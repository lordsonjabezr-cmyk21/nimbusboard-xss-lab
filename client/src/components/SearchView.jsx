import React, { useState, useEffect } from "react";

export function SearchView({ mode }) {
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  });
  const [submittedQuery, setSubmittedQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  });

  const isVuln = mode === "vulnerable";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q && q !== query) {
      setQuery(q);
      setSubmittedQuery(q);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSubmittedQuery(query);
  };

  const shareHref = isVuln
    ? `/search?q=${submittedQuery}`
    : `/search?q=${encodeURIComponent(submittedQuery)}`;

  return (
    <div>
      <div className="card">
        <h2>Search Workspace & Team Knowledge</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "16px" }}>
          Training route for reflected XSS: tests input reflection in HTML body context and quoted attribute context.
        </p>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
          <input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, tasks, and users..."
            style={{ marginBottom: 0 }}
          />
          <button type="submit" className="btn-primary" style={{ whiteSpace: "nowrap" }}>
            Search
          </button>
        </form>
      </div>

      {submittedQuery && (
        <div className="card">
          <div className="search-results-heading">
            {isVuln ? (
              <div
                dangerouslySetInnerHTML={{ __html: `<h2>Results for: ${submittedQuery}</h2>` }}
              />
            ) : (
              <h2>Results for: {submittedQuery}</h2>
            )}
          </div>

          <p style={{ color: "#64748b", margin: "12px 0" }}>
            No matching items found for your query.
          </p>

          <div style={{ marginTop: "20px", padding: "14px", background: "#f8fafc", borderRadius: "8px" }}>
            <h4>Share this search (Attribute Context - XSS-REFL-02)</h4>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "8px" }}>
              Test how attribute breakout characters like <code>" onmouseover="...</code> are handled in the generated link:
            </p>
            {/* VULN: XSS-REFL-02 - Unencoded attribute injection in vulnerable mode */}
            {isVuln ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: `<a id="share-link" href="${shareHref}" class="btn-secondary" style="display:inline-block;padding:6px 12px;text-decoration:none;">🔗 Open Saved Search</a>`
                }}
              />
            ) : (
              <a
                id="share-link"
                href={shareHref}
                className="btn-secondary"
                style={{ display: "inline-block", padding: "6px 12px", textDecoration: "none" }}
              >
                🔗 Open Saved Search
              </a>
            )}
            <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#64748b" }}>
              Link target: <code>{shareHref}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

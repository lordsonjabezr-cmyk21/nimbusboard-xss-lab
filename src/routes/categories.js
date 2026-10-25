import express from "express";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { isVulnerable } from "../config.js";
import { setCsp, generateNonce } from "../middleware/csp.js";

const router = express.Router();
const window = new JSDOM("").window;
const serverPurify = DOMPurify(window);

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

// ==========================================
// Category Registry metadata
// ==========================================
export const CATEGORY_REGISTRY = [
  {
    id: "reflected",
    category: "Category 1 — Reflected XSS",
    exercises: [
      { id: "XSS-REFL-01", title: "Search Query Body Reflection", route: "/api/challenges/reflected/search", context: "HTML Body Context" },
      { id: "XSS-REFL-02", title: "Shared Search Link Attribute Context", route: "/api/challenges/reflected/share", context: "Quoted Attribute & URL Context" }
    ]
  },
  {
    id: "stored",
    category: "Category 2 — Stored XSS",
    exercises: [
      { id: "XSS-STOR-01", title: "Team Feed Post & Comment Storage", route: "/api/challenges/stored/feed", context: "Stored Rich-Content" },
      { id: "XSS-STOR-02", title: "User Profile Biography Cross-View Rendering", route: "/api/challenges/stored/profile", context: "Stored Multi-View Profile" }
    ]
  },
  {
    id: "dom",
    category: "Category 3 — DOM-based XSS",
    exercises: [
      { id: "XSS-DOM-01", title: "URL Fragment / Hash DOM Sink", route: "/preview#...", context: "Client-Side location.hash to innerHTML" },
      { id: "XSS-DOM-02", title: "Live Preview postMessage Receiver", route: "/preview", context: "Cross-Window Messaging Sink" }
    ]
  },
  {
    id: "mutation",
    category: "Category 4 — Mutation XSS",
    exercises: [
      { id: "XSS-MUT-01", title: "Namespace Mismatch & MathML Nesting", route: "/api/challenges/mutation/parse", context: "Parser-Sanitizer Namespace Discrepancy" },
      { id: "XSS-MUT-02", title: "Custom Regex Sanitizer innerHTML Roundtrip", route: "/api/challenges/mutation/roundtrip", context: "Regex Sanitization vs Browser DOM Parsing" }
    ]
  },
  {
    id: "blind",
    category: "Category 5 — Blind XSS",
    exercises: [
      { id: "XSS-BLIND-01", title: "Support Ticket Moderation Review Queue", route: "/api/challenges/blind/feedback", context: "Internal Privileged Review Queue" },
      { id: "XSS-BLIND-02", title: "Email Notification Preview Workflow", route: "/api/email-preview/1/render", context: "Internal Email Template Rendering" }
    ]
  },
  {
    id: "self",
    category: "Category 6 — Self-XSS and Social Engineering",
    exercises: [
      { id: "XSS-SELF-01", title: "DevTools Console Paste Simulation", route: "/api/challenges/self/console", context: "Developer Console Social Engineering" },
      { id: "XSS-SELF-02", title: "Malicious Bookmarklet Drag-and-Drop", route: "/api/challenges/self/bookmarklet", context: "Browser Address Bar / Bookmarklet Flow" }
    ]
  },
  {
    id: "csp",
    category: "Category 7 — CSP and Filter Behavior",
    exercises: [
      { id: "XSS-CSP-01", title: "Weak Route-Specific CSP Header ('unsafe-inline')", route: "/api/challenges/csp/weak-header", context: "Permissive CSP Policy Analysis" },
      { id: "XSS-CSP-02", title: "Predictable Nonce & Missing Base-URI Policy", route: "/api/challenges/csp/nonce-test", context: "Nonce Reuse & CSP Misconfiguration" }
    ]
  },
  {
    id: "framework",
    category: "Category 8 — Modern Framework XSS",
    exercises: [
      { id: "XSS-FW-01", title: "React dangerouslySetInnerHTML Escape Hatch", route: "/api/challenges/framework/dangerously-set-html", context: "Client Framework HTML Injection" },
      { id: "XSS-FW-02", title: "Dynamic Href / javascript: Protocol Injection", route: "/api/challenges/framework/javascript-href", context: "Unvalidated Dynamic Link Scheme" }
    ]
  },
  {
    id: "markdown",
    category: "Category 9 — Markdown and Rich-Text XSS",
    exercises: [
      { id: "XSS-MD-01", title: "Markdown Unsafe Raw HTML Passthrough", route: "/api/challenges/markdown/passthrough", context: "Markdown Renderer HTML Parsing" },
      { id: "XSS-MD-02", title: "Markdown Link Scheme Protocol Validation", route: "/api/challenges/markdown/scheme-links", context: "Markdown URI Scheme Allowlist" }
    ]
  },
  {
    id: "encoding",
    category: "Category 10 — Encoding, Polyglots, and WAF Filters",
    exercises: [
      { id: "XSS-ENC-01", title: "Inconsistent Normalization & Double-Decoding", route: "/api/challenges/encoding/double-decode", context: "Multiple Decode Pass Filter Bypass" },
      { id: "XSS-ENC-02", title: "Naive Non-Recursive Blacklist Filter Bypass", route: "/api/challenges/encoding/script-strip", context: "Incomplete Keyword Stripping" }
    ]
  }
];

// GET /api/challenges/registry - Full challenge metadata
router.get("/registry", (_req, res) => {
  res.json(CATEGORY_REGISTRY);
});

// ==========================================
// Category 1 — Reflected XSS
// ==========================================
// VULN: XSS-REFL-01 - Search reflection in HTML body context
router.get("/reflected/search", (req, res) => {
  const query = String(req.query.q || "");
  setCsp(res, { weak: true });
  
  if (isVulnerable()) {
    // Vulnerable: raw string interpolation into HTML body
    const rendered = `<div class="search-result"><h3>Results for: ${query}</h3><p>0 results found.</p></div>`;
    res.json({ query, rendered, safe: false, context: "HTML_BODY" });
  } else {
    // Fixed: contextual HTML entity encoding
    const rendered = `<div class="search-result"><h3>Results for: ${esc(query)}</h3><p>0 results found.</p></div>`;
    res.json({ query, rendered, safe: true, context: "HTML_BODY" });
  }
});

// VULN: XSS-REFL-02 - Attribute context reflection in share link
router.get("/reflected/share", (req, res) => {
  const term = String(req.query.term || "");
  setCsp(res, { weak: true });

  if (isVulnerable()) {
    // Vulnerable: raw reflection inside quoted attribute allows breakout
    const shareHtml = `<a id="share-link" href="/search?q=${term}" title="${term}">Share Search</a>`;
    res.json({ term, shareHtml, safe: false, context: "ATTRIBUTE_AND_URL" });
  } else {
    // Fixed: strict URL encoding and HTML attribute escaping
    const safeUrl = `/search?q=${encodeURIComponent(term)}`;
    const shareHtml = `<a id="share-link" href="${esc(safeUrl)}" title="${esc(term)}">Share Search</a>`;
    res.json({ term, shareHtml, safe: true, context: "ATTRIBUTE_AND_URL" });
  }
});

// ==========================================
// Category 4 — Mutation XSS
// ==========================================
// VULN: XSS-MUT-01 - Parser-sanitizer namespace discrepancy (MathML / SVG nesting)
router.post("/mutation/parse", (req, res) => {
  const payload = String(req.body.payload || "");

  if (isVulnerable()) {
    // LAB-ONLY DEMO: Deliberately misconfigured sanitizer rule allowing MathML nesting
    // without normalizing foreign content namespace transitions
    const relaxedPurify = DOMPurify(window);
    const sanitized = relaxedPurify.sanitize(payload, {
      ADD_TAGS: ["math", "annotation-xml", "style"],
      ADD_ATTR: ["encoding"]
    });
    res.json({
      original: payload,
      sanitized,
      warning: "LAB ONLY: Misconfigured sanitizer allows MathML namespace mutation",
      safe: false
    });
  } else {
    // FIXED: Maintained default DOMPurify configuration with strict namespace isolation
    const sanitized = serverPurify.sanitize(payload);
    res.json({
      original: payload,
      sanitized,
      safe: true
    });
  }
});

// VULN: XSS-MUT-02 - Custom regex sanitizer followed by innerHTML roundtrip
router.post("/mutation/roundtrip", (req, res) => {
  const rawHtml = String(req.body.html || "");

  if (isVulnerable()) {
    // Vulnerable: Custom regex filter that strips onerror/onload attributes superficially
    // Browser parser re-interprets malformed quotes / entity boundaries into valid attributes on roundtrip
    const filtered = rawHtml.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "");
    res.json({
      input: rawHtml,
      filtered,
      note: "Vulnerable: Naive regex sanitizer is susceptible to DOM parser mutation on roundtrip",
      safe: false
    });
  } else {
    // Fixed: Standard parser-level DOMPurify sanitization
    const sanitized = serverPurify.sanitize(rawHtml);
    res.json({
      input: rawHtml,
      filtered: sanitized,
      safe: true
    });
  }
});

// ==========================================
// Category 6 — Self-XSS Awareness
// ==========================================
router.get("/self/console", (_req, res) => {
  res.json({
    warning: "Stop! If someone told you to copy and paste code here to unlock a feature or hack an account, it is a scam.",
    education: "Pastes into the developer console run with full user session privileges (Self-XSS). NimbusBoard logs a protective warning in DevTools."
  });
});

// ==========================================
// Category 7 — CSP & Filter Behavior
// ==========================================
// VULN: XSS-CSP-01 - Weak route-specific CSP
router.get("/csp/weak-header", (req, res) => {
  if (isVulnerable()) {
    setCsp(res, { weak: true });
    res.type("html").send(`
      <!doctype html>
      <html>
        <head><title>Weak CSP Test</title></head>
        <body>
          <h1>Weak CSP Test Route</h1>
          <p>CSP: <code>${res.getHeader("Content-Security-Policy")}</code></p>
          <div id="target">${req.query.q || "No query parameter provided."}</div>
        </body>
      </html>
    `);
  } else {
    setCsp(res, { weak: false });
    res.type("html").send(`
      <!doctype html>
      <html>
        <head><title>Strict CSP Route</title></head>
        <body>
          <h1>Strict CSP Route</h1>
          <p>CSP: <code>${res.getHeader("Content-Security-Policy")}</code></p>
          <div id="target">${esc(req.query.q || "No query parameter provided.")}</div>
        </body>
      </html>
    `);
  }
});

// VULN: XSS-CSP-02 - Nonce-based CSP test
router.get("/csp/nonce-test", (req, res) => {
  const nonce = generateNonce();
  setCsp(res, { nonce });
  const scriptContent = req.query.script || 'console.log("Safe script executed with nonce");';

  res.type("html").send(`
    <!doctype html>
    <html>
      <head>
        <title>Nonce CSP Test</title>
      </head>
      <body>
        <h1>Nonce-Based CSP Test</h1>
        <p>Current Nonce: <code>${nonce}</code></p>
        <p>CSP Header: <code>${res.getHeader("Content-Security-Policy")}</code></p>
        <script nonce="${nonce}">${isVulnerable() ? scriptContent : esc(scriptContent)}</script>
      </body>
    </html>
  `);
});

// ==========================================
// Category 8 — Modern Framework XSS
// ==========================================
// VULN: XSS-FW-01 - React dangerouslySetInnerHTML bypass simulation
router.post("/framework/dangerously-set-html", (req, res) => {
  const content = String(req.body.content || "");
  if (isVulnerable()) {
    // Returns unescaped HTML intended for __html prop in React
    res.json({
      htmlProp: { __html: content },
      safe: false,
      context: "React dangerouslySetInnerHTML without sanitization"
    });
  } else {
    // Sanitized HTML using DOMPurify
    res.json({
      htmlProp: { __html: serverPurify.sanitize(content) },
      safe: true,
      context: "React dangerouslySetInnerHTML sanitized with DOMPurify"
    });
  }
});

// VULN: XSS-FW-02 - Dynamic href protocol injection (javascript:)
router.post("/framework/javascript-href", (req, res) => {
  const userUrl = String(req.body.url || "");
  
  if (isVulnerable()) {
    // Allows javascript: URI schemes
    res.json({
      href: userUrl,
      safe: false,
      context: "Unvalidated URL in dynamic anchor href"
    });
  } else {
    // Rejects non-http/https/mailto schemes
    const isValid = /^(https?:\/\/|mailto:|\/)/i.test(userUrl);
    const safeHref = isValid ? userUrl : "#invalid-protocol";
    res.json({
      href: safeHref,
      safe: true,
      context: "Validated URL scheme allowing only http, https, mailto or relative paths"
    });
  }
});

// ==========================================
// Category 9 — Markdown & Rich-Text XSS
// ==========================================
// VULN: XSS-MD-01 - Raw HTML passthrough in Markdown
router.post("/markdown/passthrough", (req, res) => {
  const md = String(req.body.markdown || "");

  if (isVulnerable()) {
    // Raw HTML passthrough enabled in markdown parser
    const rendered = marked.parse(md, { gfm: true, breaks: true });
    res.json({ markdown: md, rendered, safe: false });
  } else {
    // Fixed: parse and sanitize with DOMPurify
    const rawRendered = marked.parse(md, { gfm: true, breaks: true });
    const sanitized = serverPurify.sanitize(rawRendered);
    res.json({ markdown: md, rendered: sanitized, safe: true });
  }
});

// VULN: XSS-MD-02 - Markdown link scheme protocol injection
router.post("/markdown/scheme-links", (req, res) => {
  const md = String(req.body.markdown || "");

  if (isVulnerable()) {
    // Allows javascript: in markdown links [click](javascript:...)
    const rendered = marked.parse(md);
    res.json({ markdown: md, rendered, safe: false });
  } else {
    // Fixed: strict link sanitizer rejecting javascript: and data:
    const raw = marked.parse(md);
    const sanitized = serverPurify.sanitize(raw, {
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
    res.json({ markdown: md, rendered: sanitized, safe: true });
  }
});

// ==========================================
// Category 10 — Encoding, Polyglots & Filters
// ==========================================
// VULN: XSS-ENC-01 - Inconsistent normalization and double-decoding
router.get("/encoding/double-decode", (req, res) => {
  const rawInput = String(req.query.input || "");

  if (isVulnerable()) {
    // Step 1: Decode once
    let decodedOnce = rawInput;
    try { decodedOnce = decodeURIComponent(rawInput); } catch {}

    // Step 2: Naive blacklist filter check
    const blocked = /<script/i.test(decodedOnce);
    if (blocked) {
      return res.status(403).json({ error: "Blocked by WAF filter: <script tag detected", safe: false });
    }

    // Step 3: Flaw! Decoded a second time before output rendering
    let decodedTwice = decodedOnce;
    try { decodedTwice = decodeURIComponent(decodedOnce); } catch {}

    res.json({
      input: rawInput,
      output: decodedTwice,
      note: "Vulnerable: Double decoding allowed %253Cscript to bypass filter",
      safe: false
    });
  } else {
    // Fixed: Single canonical decode and contextual HTML escaping
    let decoded = rawInput;
    try { decoded = decodeURIComponent(rawInput); } catch {}

    res.json({
      input: rawInput,
      output: esc(decoded),
      note: "Fixed: Canonical single decode and context-aware HTML entity encoding",
      safe: true
    });
  }
});

// VULN: XSS-ENC-02 - Naive non-recursive blacklist filter bypass
router.get("/encoding/script-strip", (req, res) => {
  const input = String(req.query.input || "");

  if (isVulnerable()) {
    // Vulnerable: Non-recursive replace of <script> and </script> once
    const filtered = input.replace(/<script[^>]*>/gi, "").replace(/<\/script>/gi, "");
    res.json({
      input,
      filtered,
      note: "Vulnerable: Single-pass stripping allows nested <scr<script>ipt> bypass",
      safe: false
    });
  } else {
    // Fixed: Context-aware HTML entity encoding
    res.json({
      input,
      filtered: esc(input),
      note: "Fixed: Escaping characters rather than relying on naive tag stripping",
      safe: true
    });
  }
});

export default router;

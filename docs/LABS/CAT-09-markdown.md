# Category 09 — Markdown & Rich-Text XSS

## Overview
Markdown is designed to allow arbitrary inline HTML by default. When applications convert Markdown into HTML (using parsers like Marked, Markdown-it, or Showdown) and render the output without sanitization, any HTML tags or malicious link schemes embedded within the Markdown will execute in the user's browser.

In NimbusBoard, Category 9 explores:
1. **Raw HTML Passthrough in Markdown Renderers** (`XSS-MD-01`)
2. **Markdown Link Scheme Allowlist Bypass (`javascript:`)** (`XSS-MD-02`)

---

## Exercise 1: XSS-MD-01 — Raw HTML Passthrough

### Vulnerability Context
- **Target Endpoint**: `POST /api/challenges/markdown/render`
- **Route Handler**: [src/routes/categories.js](file:///c:/nimbusboard-xss-lab/src/routes/categories.js)
- **Concept**: Many Markdown parsers do not sanitize HTML tags by default.

### Vulnerable Code Pattern
```javascript
// src/routes/categories.js
const rawHtml = marked.parse(content);
if (isVulnerable()) {
  // Vulnerable: marked output returned directly with embedded raw HTML
  res.json({ ok: true, html: rawHtml });
} else {
  // Fixed: DOMPurify sanitizes the generated HTML
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  res.json({ ok: true, html: cleanHtml });
}
```

### Demonstration Payload
- **Probe**: `## Sprint Update\n<b id="md-probe">formatted bold text</b>`

### Expected Behavior
- **Vulnerable Mode**: The embedded HTML tag `<b id="md-probe">` passes through directly into the generated HTML.
- **Fixed Mode**: In fixed mode, raw unsafe tags or script elements are stripped or sanitized.

---

## Exercise 2: XSS-MD-02 — Markdown Link Scheme Allowlists

### Vulnerability Context
- **Target Endpoint**: `POST /api/challenges/markdown/render`
- **Concept**: Markdown standard link syntax `[Click Here](javascript:alert(1))` compiles into `<a href="javascript:alert(1)">`.

### Remediation Pattern
A robust Markdown pipeline must:
1. Parse Markdown into HTML.
2. Validate link protocols against a strict allowlist (`http:`, `https:`, `mailto:`, relative `/`).
3. Sanitize the result with DOMPurify:
```javascript
DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'ul', 'li', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i
});
```

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-09"
```

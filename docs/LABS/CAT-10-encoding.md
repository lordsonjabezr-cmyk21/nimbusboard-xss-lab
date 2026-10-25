# Category 10 — Encoding, Polyglots, & WAF Filter Behavior

## Overview
Web Application Firewalls (WAFs) and naive application filters often rely on string pattern matching or regular expressions. When decoding order is inconsistent or filters make flawed normalization assumptions, attackers can bypass inspection while still achieving execution in the target browser.

In NimbusBoard, Category 10 explores:
1. **Double-Decoding Filter Bypass & Inconsistent Normalization** (`XSS-ENC-01`)
2. **Naive Non-Recursive Blocklist Filter Bypass** (`XSS-ENC-02`)

---

## Exercise 1: XSS-ENC-01 — Inconsistent Normalization & Double-Decoding

### Vulnerability Context
- **Target Endpoint**: `GET /api/challenges/encoding/test?input=...`
- **Route Handler**: [src/routes/categories.js](file:///c:/nimbusboard-xss-lab/src/routes/categories.js)
- **Concept**: A filter checks user input for `<script>` *after* a single URL-decode, but the downstream component or view performs a *second* URL-decode before rendering or processing.

### Vulnerable Code Pattern
```javascript
// src/routes/categories.js
const firstDecode = decodeURIComponent(rawInput);
if (firstDecode.includes("<script>")) {
  return res.status(400).json({ error: "WAF blocked forbidden tag" });
}

if (isVulnerable()) {
  // Vulnerable: performs double-decode downstream
  const secondDecode = decodeURIComponent(firstDecode);
  res.json({ ok: true, processed: secondDecode });
} else {
  // Fixed: no redundant decode; canonicalizes once and validates
  res.json({ ok: true, processed: firstDecode });
}
```

### Demonstration Payload
- **Probe**: `%25253Cscript%25253E`
- **Mechanism**:
  1. Express parses query transport: `%25253Cscript%25253E` &rarr; `%253Cscript%253E`.
  2. First decode check: `%253Cscript%253E` &rarr; `%3Cscript%3E` (Does **not** contain literal `<script>`, so filter passes!).
  3. Vulnerable second decode: `%3Cscript%3E` &rarr; `<script>` (Executes!).

---

## Exercise 2: XSS-ENC-02 — Naive Non-Recursive Tag Stripping

### Vulnerability Context
- **Target Endpoint**: `POST /api/challenges/filter/test`
- **Concept**: The application attempts to strip `<script>` tags using a simple non-recursive string replacement: `input.replace(/<script>/gi, "")`.

### Vulnerable Code Pattern
```javascript
// src/routes/categories.js
if (isVulnerable()) {
  // Flawed: non-recursive replacement strips only the exact match once
  filtered = input.replace(/<script>/gi, "");
} else {
  // Fixed: full AST sanitization with DOMPurify
  filtered = DOMPurify.sanitize(input);
}
```

### Demonstration Payload
- **Probe**: `<scr<script>ipt>alert(1)</script>`
- **Mechanism**: The inner `<script>` is removed by the filter:
  `<scr` + `[REMOVED]` + `ipt>` &rarr; `<script>`!
  The surrounding characters recombine to form a valid tag.

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-10"
```

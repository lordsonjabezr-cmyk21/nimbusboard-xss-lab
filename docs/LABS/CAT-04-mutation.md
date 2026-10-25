# Category 04 — Mutation XSS (mXSS) & Parser Regressions

## Overview
Mutation XSS occurs when an application passes seemingly benign markup through an HTML sanitizer or parser, but subsequent browser re-parsing (such as assigning the sanitized string to `innerHTML` or transitioning between XML/HTML/SVG/MathML namespaces) causes the browser to mutate the DOM structure, resurrecting an executable script or tag.

In NimbusBoard, Category 4 explores:
1. **MathML/SVG Namespace Discrepancy** (`XSS-MUT-01`)
2. **Naive Regex Sanitizer Roundtrip Flaws** (`XSS-MUT-02`)

---

## Exercise 1: XSS-MUT-01 — MathML / SVG Namespace Transitions

### Vulnerability Context
- **Target Endpoint**: `POST /api/challenges/mutation/test`
- **Route Handler**: [src/routes/categories.js](file:///c:/nimbusboard-xss-lab/src/routes/categories.js)
- **Concept**: In HTML5, `<math>` and `<svg>` elements use foreign namespaces with different parser rules. If an insecure sanitizer fails to track namespace state, closing tags inside foreign objects can cause the outer parser to break back into standard HTML unexpectedly.

### Demonstration Payload
- **Probe**: `<math><mtext><table><mglyph><style><!--</style><img src=x onerror=1>`

### Expected Behavior
- **Vulnerable Mode**: The insecure parser configuration strips obvious script tags but allows namespace switching markup through, resulting in an unescaped DOM tree.
- **Fixed Mode**: Production DOMPurify (&ge; 3.0) with strict namespace parsing strips or neutralizes invalid namespace transitions, setting `mutated: false`.

---

## Exercise 2: XSS-MUT-02 — Custom Regex Sanitizer Roundtrip Flaw

### Vulnerability Context
- **Target Endpoint**: `POST /api/challenges/mutation/test`
- **Concept**: Attempting to sanitize HTML using naive regex string replacements (e.g., stripping `<script>`) rather than a full DOM-tree sanitizer.

### Vulnerable Code Pattern
```javascript
// src/routes/categories.js
if (isVulnerable()) {
  // Flawed regex sanitizer: only replaces lowercase <script> once
  sanitized = input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, "");
} else {
  sanitized = DOMPurify.sanitize(input, { RETURN_TRUSTED_TYPE: false });
}
```

### Demonstration Payload
- **Probe**: `<img src="x" onerror="alert(1)">` or `<a href="javascript:alert(1)">`

### Expected Behavior
- **Vulnerable Mode**: The regex sanitizer only looks for `<script>` tags, completely missing attribute-based execution vectors like `onerror` or `onload`.
- **Fixed Mode**: Full AST-based sanitization strips dangerous attributes and dangerous event handlers completely.

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-04"
```

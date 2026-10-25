# Solutions — Category 09: Markdown & Rich-Text XSS

## Challenge 1: XSS-MD-01 (Markdown Raw HTML Passthrough)

### 1. Root Cause Analysis
The Markdown specification allows inline HTML elements by design. When an application compiles Markdown to HTML using a library like `marked` (`marked.parse(content)`), embedded HTML tags like `<img src=x onerror=...>` or `<b>` are emitted directly into the output.

### 2. Harmless Proof of Concept
Send markdown with embedded HTML tags to `POST /api/challenges/markdown/render`:
```json
{
  "content": "## Release Notes\n<b id=\"md-probe\">Markdown Bold Probe</b>"
}
```
In vulnerable mode, `html` contains the raw tag `<b id="md-probe">`.

### 3. Remediation Diff
```diff
--- a/src/routes/categories.js
+++ b/src/routes/categories.js
@@ -165,3 +165,2 @@
-  const output = isVulnerable() ? marked.parse(content) : DOMPurify.sanitize(marked.parse(content));
+  const parsed = marked.parse(content);
+  const output = DOMPurify.sanitize(parsed);
```
Always pipe the output of Markdown parsers through an HTML sanitizer like DOMPurify before serving or rendering it in the browser.

---

## Challenge 2: XSS-MD-02 (Markdown Link Scheme Validation)

### 1. Root Cause Analysis
Standard Markdown link syntax allows any protocol scheme to be specified inside the parentheses:
```markdown
[Click to download report](javascript:alert(1))
```
`marked.parse` compiles this into:
```html
<p><a href="javascript:alert(1)">Click to download report</a></p>
```

### 2. Remediation Diff
Configure DOMPurify with an explicit allowed URI regular expression:
```javascript
const clean = DOMPurify.sanitize(marked.parse(content), {
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i
});
```
Any link starting with `javascript:`, `data:`, or `vbscript:` will have its `href` attribute stripped.

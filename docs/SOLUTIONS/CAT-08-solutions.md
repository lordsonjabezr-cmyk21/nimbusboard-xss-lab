# Solutions — Category 08: Modern Frameworks & React Trust Boundaries

## Challenge 1: XSS-FW-01 (React `dangerouslySetInnerHTML`)

### 1. Root Cause Analysis
React protects against XSS by default when using JSX expression syntax `{data}` because it automatically encodes strings before inserting them into the DOM. However, when developers use `dangerouslySetInnerHTML={{ __html: data }}`, React deliberately disables its auto-escaping mechanism.

### 2. Harmless Proof of Concept
Submit rich text markup to `POST /api/challenges/framework/render`:
```json
{
  "html": "<b id=\"fw-bold-probe\">React Test</b>"
}
```
In vulnerable mode, `#fw-bold-probe` is created directly as a DOM element.

### 3. Remediation Diff
```diff
--- a/src/routes/categories.js
+++ b/src/routes/categories.js
@@ -130,3 +130,1 @@
-  rendered = isVulnerable() ? rawInput : esc(rawInput);
+  rendered = DOMPurify.sanitize(rawInput);
```
Avoid `dangerouslySetInnerHTML` whenever possible. If rendering HTML is necessary, sanitize the input with DOMPurify beforehand.

---

## Challenge 2: XSS-FW-02 (Dynamic `href` Protocol Validation)

### 1. Root Cause Analysis
Developers often assume that passing a URL into a React anchor tag `<a href={targetUrl}>Link</a>` is safe because React auto-escapes attribute strings. However, HTML entity encoding does **not** stop the execution of pseudo-protocols like `javascript:alert(1)`. When the user clicks the link, the browser resolves the `javascript:` URI scheme and executes the code.

### 2. Harmless Proof of Concept
Pass `javascript:console.log('XSS')` into the link renderer endpoint. The generated markup is:
```html
<a href="javascript:console.log('XSS')">External Resource</a>
```

### 3. Remediation Diff
```diff
--- a/src/routes/categories.js
+++ b/src/routes/categories.js
@@ -145,3 +145,5 @@
-  const safeHref = isVulnerable() ? url : (url.startsWith("http") ? url : "#");
+  const isSafe = /^https?:\/\//i.test(url) || url.startsWith("/") || url.startsWith("mailto:");
+  const safeHref = isSafe ? url : "#";
```
Always validate user-controlled URLs against an explicit scheme allowlist (`http`, `https`, `mailto`, or relative `/`) before assigning them to `href` or `src` attributes.

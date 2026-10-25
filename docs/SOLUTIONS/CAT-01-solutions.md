# Solutions — Category 01: Reflected XSS

## Challenge 1: XSS-REFL-01 (HTML Body Context)

### 1. Root Cause Analysis
The search view reads the `q` query parameter and renders it inside `.search-results-heading` using React's `dangerouslySetInnerHTML`. Because user input contains raw HTML tags, the browser treats them as markup rather than text.

### 2. Harmless Proof of Concept
Navigate to:
```
http://127.0.0.1:3000/search?q=%3Cb%3Erefl_body_probe%3C%2Fb%3E
```
Inspect `.search-results-heading` in DevTools. A bold `<b>` tag appears in the DOM tree.

### 3. Remediation Diff
```diff
--- a/client/src/components/SearchView.jsx
+++ b/client/src/components/SearchView.jsx
@@ -53,3 +53,1 @@
-  <div dangerouslySetInnerHTML={{ __html: `<h2>Results for: ${submittedQuery}</h2>` }} />
+  <h2>Results for: {submittedQuery}</h2>
```
Using standard JSX curly brace interpolation `{submittedQuery}` automatically HTML-encodes `<`, `>`, `&`, `"`, and `'`.

---

## Challenge 2: XSS-REFL-02 (Quoted Attribute Context)

### 1. Root Cause Analysis
The share link feature generates an `<a>` tag with `href="${shareHref}"`. In vulnerable mode, `submittedQuery` is appended without URL-encoding. Supplying a double quote `"` terminates the `href` attribute early, allowing injection of new HTML attributes (e.g., `data-marker` or `onmouseover`).

### 2. Harmless Proof of Concept
Navigate to:
```
http://127.0.0.1:3000/search?q=test%22%20data-marker=%22attr_probe
```
Inspect `#share-link` in DevTools. The anchor tag contains:
```html
<a id="share-link" href="/search?q=test" data-marker="attr_probe">🔗 Open Saved Search</a>
```

### 3. Remediation Diff
```diff
--- a/client/src/components/SearchView.jsx
+++ b/client/src/components/SearchView.jsx
@@ -24,3 +24,2 @@
-  const shareHref = isVuln
-    ? `/search?q=${submittedQuery}`
-    : `/search?q=${encodeURIComponent(submittedQuery)}`;
+  const shareHref = `/search?q=${encodeURIComponent(submittedQuery)}`;
```
Using `encodeURIComponent()` converts `"` to `%22`, keeping it safely encapsulated inside the attribute value.

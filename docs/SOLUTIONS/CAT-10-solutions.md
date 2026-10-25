# Solutions — Category 10: Encoding, Polyglots, & WAF Filters

## Challenge 1: XSS-ENC-01 (Inconsistent Normalization & Double-Decoding)

### 1. Root Cause Analysis
A WAF or API gateway inspects user input after a single decoding step. If the backend or rendering component performs an additional `decodeURIComponent()` call on the input later in the request lifecycle, an attacker can supply double-URL-encoded characters (`%253C` &rarr; `%3C` &rarr; `<`) to bypass the inspection stage.

### 2. Harmless Proof of Concept
Send a triple-encoded probe over HTTP:
```bash
curl "http://127.0.0.1:4000/api/challenges/encoding/test?input=%25253Cscript%25253E"
```
1. In transport, Express decodes `%2525` to `%25`, yielding `%253Cscript%253E`.
2. The WAF checks `decodeURIComponent("%253Cscript%253E")`, which produces `%3Cscript%3E`. This string does **not** equal literal `<script>`, so the filter passes!
3. The vulnerable component executes a second decode on `%3Cscript%3E`, yielding `<script>`.

### 3. Remediation Diff
```diff
--- a/src/routes/categories.js
+++ b/src/routes/categories.js
@@ -190,3 +190,1 @@
-  const second = isVulnerable() ? decodeURIComponent(first) : first;
+  const second = first;
```
Enforce strict canonicalization: decode user input exactly once upon receipt, then apply validation or encoding. Never decode user input multiple times.

---

## Challenge 2: XSS-ENC-02 (Naive Non-Recursive Filter Stripping)

### 1. Root Cause Analysis
The application attempts to neutralize script tags using a non-recursive string replacement:
```javascript
input.replace(/<script>/gi, "")
```
If an attacker embeds a `<script>` tag inside another `<script>` tag (e.g. `<scr<script>ipt>`), removing the inner tag causes the outer characters to collapse together:
`<scr` + `[REMOVED]` + `ipt>` &rarr; `<script>`!

### 2. Harmless Proof of Concept
Submit the nested probe to `POST /api/challenges/filter/test`:
```json
{
  "input": "<scr<script>ipt>console.log(1)</script>"
}
```
In vulnerable mode, `filtered` evaluates to `<script>console.log(1)</script>`.

### 3. Remediation Diff
```diff
--- a/src/routes/categories.js
+++ b/src/routes/categories.js
@@ -210,3 +210,1 @@
-  output = isVulnerable() ? input.replace(/<script>/gi, "") : DOMPurify.sanitize(input);
+  output = DOMPurify.sanitize(input);
```
Never use non-recursive regular expressions for HTML sanitation. Always parse markup into an abstract syntax tree (AST) using a validated sanitizer like DOMPurify.

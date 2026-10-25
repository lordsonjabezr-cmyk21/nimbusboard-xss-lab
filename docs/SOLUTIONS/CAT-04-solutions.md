# Solutions — Category 04: Mutation XSS (mXSS)

## Challenge 1: XSS-MUT-01 (MathML / SVG Namespace Transitions)

### 1. Root Cause Analysis
Browser HTML parsers transition into foreign XML namespaces when encountering `<svg>` or `<math>` elements. In naive or outdated sanitizers, comments or style tags inside foreign elements (like `<math><mtext><table><mglyph><style><!--</style><img src=x onerror=1>`) cause the browser to switch namespaces during parsing, resulting in tags that were safe during serialization becoming executable during deserialization.

### 2. Harmless Proof of Concept
Send the namespace transition payload to `POST /api/challenges/mutation/test`:
```bash
curl -X POST http://127.0.0.1:4000/api/challenges/mutation/test \
  -H "Content-Type: application/json" \
  -d '{"input":"<math><mtext><table><mglyph><style><!--</style><img src=x onerror=1>"}'
```
In vulnerable mode, `mutated: true` is returned.

### 3. Remediation Diff
```diff
--- a/src/routes/categories.js
+++ b/src/routes/categories.js
@@ -45,3 +45,4 @@
-  sanitized = insecureSanitize(input);
+  sanitized = DOMPurify.sanitize(input, {
+    USE_PROFILES: { html: true, svg: false, mathMl: false }
+  });
```
Enforce modern DOMPurify (&ge; 3.0) with strict namespace profiles to prevent unexpected namespace breakouts.

---

## Challenge 2: XSS-MUT-02 (Custom Regex Sanitizer Roundtrip Flaw)

### 1. Root Cause Analysis
Attempting to strip `<script>` tags using regular expressions like `input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, "")` leaves attribute-based event handlers (`onerror`, `onload`, `onmouseover`) completely unmitigated.

### 2. Harmless Proof of Concept
Send an event handler probe to the mutation test endpoint:
```json
{
  "input": "<img src=\"x\" onerror=\"console.log('XSS')\">"
}
```
The regex leaves the `<img src="x" onerror="...">` tag untouched.

### 3. Remediation Diff
```diff
--- a/src/routes/categories.js
+++ b/src/routes/categories.js
@@ -55,3 +55,1 @@
-  sanitized = input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, "");
+  sanitized = DOMPurify.sanitize(input);
```
Never use regular expressions to sanitize markup. Always rely on an established AST-based sanitizer.

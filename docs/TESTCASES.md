# NimbusBoard 5-Tier Testing Ladder & Challenge Registry

This document defines the 5-tier verification methodology and the comprehensive test registry covering all 10 XSS training categories and 20 distinct exercises implemented in NimbusBoard.

---

## The 5-Tier Verification Ladder

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 5: Automated End-to-End Browser Regression (Playwright)           │
│         - Dual-mode verification (Vulnerable execution vs Fixed safety)│
├────────────────────────────────────────────────────────────────────────┤
│ TIER 4: Impact Chain & Trust Boundary Analysis                         │
│         - Multi-role privilege crossing & safe OOB callback listener   │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 3: Sanitizer, Parser, & CSP Resilience Evaluation                 │
│         - Namespace mutation, regex bypasses, double decoding, CSP     │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 2: Context-Aware Syntactic Breakdown                              │
│         - HTML body, quoted attribute, URL-valued attribute, DOM sinks │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 1: Basic Ingress Probe & Echo Detection                           │
│         - Parameter reflection, stored input echo, DOM sink reach      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Comprehensive Challenge Registry (20 Exercises)

| Cat | Challenge ID | Route / Interface | Ingress Parameter / Source | Sink / Execution Context | Vulnerable Behavior | Fixed Remediation | Automated Test Reference |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | `XSS-REFL-01` | `/search` | `?q=` | `.search-results-heading` (`innerHTML`) | Unescaped HTML tags parsed into live DOM | Entity encoded; tags rendered as plain text | `playwright/xss_categories.spec.ts` (L15) |
| **01** | `XSS-REFL-02` | `/search` | `?q=` | `#share-link` (`href="..."`) | Double-quote attribute breakout into custom attributes | URL component encoded (`encodeURIComponent`) | `playwright/xss_categories.spec.ts` (L33) |
| **02** | `XSS-STOR-01` | `/` (Team Feed) | `POST /api/posts` | `.post-body` | Unsanitized markup rendered in shared team feed | Escaped text or sanitized safe subset | `playwright/xss_categories.spec.ts` (L55) |
| **02** | `XSS-STOR-02` | `/profile` | `PUT /api/users/profile` | `.profile-bio` across views | Bio HTML tags rendered in author header and detail | Contextual HTML escaping in all views | `playwright/xss_categories.spec.ts` (L85) |
| **03** | `XSS-DOM-01` | `/preview` | `window.location.hash` | `#preview-output` (`innerHTML`) | Fragment sliced and assigned directly to `innerHTML` | Sunk via `element.textContent` | `playwright/xss_categories.spec.ts` (L114) |
| **03** | `XSS-DOM-02` | `/preview` | `window.postMessage` | `#preview-output` (`innerHTML`) | Accepts arbitrary cross-window messages to `innerHTML` | Enforces origin check and uses `textContent` | `playwright/xss_categories.spec.ts` (L132) |
| **04** | `XSS-MUT-01` | `/lab` | `POST /api/challenges/mutation/test` | MathML/SVG namespace transition | Re-parsing unclosed XML namespaces alters DOM tree | Strict DOMPurify sanitizer with safe namespace options | `playwright/xss_categories.spec.ts` (L153) |
| **04** | `XSS-MUT-02` | `/lab` | `POST /api/challenges/mutation/test` | Regex replacement roundtrip | Regex-based sanitization mutated by subsequent innerHTML parse | Standard AST-based sanitizer (DOMPurify) | `playwright/xss_categories.spec.ts` (L172) |
| **05** | `XSS-BLIND-01`| `/support` & `/admin`| `POST /api/support` | Admin feedback queue & OOB listener | Ticket content rendered raw in privileged admin session | Contextual entity encoding before admin rendering | `playwright/xss_categories.spec.ts` (L193) |
| **05** | `XSS-BLIND-02`| `/admin` | `GET /api/email-preview/:id` | Email preview sandbox | Email digest HTML embeds unescaped ticket body | Escaped HTML and sandboxed iframe preview | `playwright/xss_categories.spec.ts` (L219) |
| **06** | `XSS-SELF-01` | `/` (DevTools) | Console script paste | Browser developer tools | Users lured into executing attacker scripts in console | Prominent console warning with visual stop notice | `playwright/xss_categories.spec.ts` (L239) |
| **06** | `XSS-SELF-02` | `/api/challenges`| API guidelines probe | Educational awareness endpoint | Lack of awareness of browser paste guards | Structured educational guidelines on DevTools defenses | `playwright/xss_categories.spec.ts` (L250) |
| **07** | `XSS-CSP-01` | `/search` | Response header `Content-Security-Policy` | Browser script execution engine | Weak CSP with `'unsafe-inline'` permits inline execution | Strict policy removing `'unsafe-inline'` and wildcard `*` | `playwright/xss_categories.spec.ts` (L261) |
| **07** | `XSS-CSP-02` | `/api/challenges/csp/test` | Response header `Content-Security-Policy` | Nonce directive & `base-uri` | Missing `base-uri` and static/reused nonce | Cryptographically random per-request nonce, `base-uri 'self'` | `playwright/xss_categories.spec.ts` (L275) |
| **08** | `XSS-FW-01` | `/lab` | `POST /api/challenges/framework/render` | React JSX rendering pipeline | `dangerouslySetInnerHTML` bypasses React's escaping | Standard JSX interpolation `{text}` | `playwright/xss_categories.spec.ts` (L294) |
| **08** | `XSS-FW-02` | `/lab` | Dynamic link prop | `<a href={target}>` | `javascript:` URL executes script on click | Protocol validation allows only `http:`, `https:` | `playwright/xss_categories.spec.ts` (L313) |
| **09** | `XSS-MD-01` | `/lab` | `POST /api/challenges/markdown/render` | Marked parser output | HTML tags allowed through Markdown renderer unescaped | Sanitized with DOMPurify or HTML passthrough disabled | `playwright/xss_categories.spec.ts` (L335) |
| **09** | `XSS-MD-02` | `/lab` | `POST /api/challenges/markdown/render` | Markdown link syntax `[link](url)` | Markdown accepts `javascript:` scheme in links | Scheme allowlist permits only safe protocols | `playwright/xss_categories.spec.ts` (L354) |
| **10** | `XSS-ENC-01` | `/lab` | `GET /api/challenges/encoding/test` | Query parameter parser | Multi-pass URL decoding bypasses single-pass WAF check | Single-pass decoding followed by contextual validation | `playwright/xss_categories.spec.ts` (L376) |
| **10** | `XSS-ENC-02` | `/lab` | `POST /api/challenges/filter/test` | Regex string replacement | Non-recursive regex replacement (`<script>`) bypassed | Multi-pass recursive sanitization or AST parser | `playwright/xss_categories.spec.ts` (L392) |

---

## Test Execution Commands

```bash
# 1. Run full Playwright 20-category suite (Dual Mode)
npx playwright test playwright/xss_categories.spec.ts

# 2. Run Playwright basic smoke tests
npx playwright test playwright/basic.spec.ts

# 3. Run Node.js unit and integration tests
npm test

# 4. Run standalone programmatic smoke test runner
node --experimental-strip-types scripts/smoke_test_playwright.ts

# 5. Run safe blind-XSS callback check
# PowerShell:
powershell -ExecutionPolicy Bypass -File scripts/oob_listener_check.ps1
# POSIX Shell:
./scripts/oob_listener_check.sh

# 6. Reset database to predictable seed state
# PowerShell:
powershell -ExecutionPolicy Bypass -File scripts/reset.ps1
# POSIX Shell:
./scripts/reset.sh
```

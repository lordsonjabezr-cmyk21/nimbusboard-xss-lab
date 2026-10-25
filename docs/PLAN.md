# NimbusBoard 21-Day Structured Practice Curriculum

This curriculum provides a 21-day training roadmap for cybersecurity students, penetration testers, and application security engineers mastering modern web application security and XSS defense.

---

## Curriculum Overview

- **Week 1 (Days 1–7)**: Foundations, Context-Aware Analysis, Stored & DOM Sinks (Categories 1, 2, 3)
- **Week 2 (Days 8–14)**: Parsers, Sanitizers, Blind Workflows, CSP, & Awareness (Categories 4, 5, 6, 7)
- **Week 3 (Days 15–21)**: Modern Frameworks, Markdown, Normalization, & Full Remediation (Categories 8, 9, 10, Automation)

---

## Week 1: Core Fundamentals & Contexts

### Day 1: Architecture, Trust Boundaries, & Local Lab Setup
- **Objectives**: Spin up NimbusBoard via Docker Compose; inspect service topology (`frontend`, `api`, `oob-listener`, `db`).
- **Hands-on Lab**: Verify health on `:4000/health`, UI on `:3000`, listener on `:5000`. Test database reset script (`scripts/reset.ps1` or `scripts/reset.sh`).
- **Key Concepts**: Loopback-only security boundaries, internal bridge networks, stateless vs stateful reset.

### Day 2: HTTP Sources, Transports, & Output Contexts
- **Objectives**: Map input ingress points across REST parameters, query strings, headers, and bodies.
- **Hands-on Lab**: Intercept requests with Burp Suite / browser network tab. Trace `?q=` input through the Express router to the response.
- **Key Concepts**: Source-to-sink mapping, unescaped reflection, reflected XSS mechanics.

### Day 3: Category 1 — Reflected XSS in HTML Body Context
- **Objectives**: Exploit and analyze `XSS-REFL-01` in `/search`.
- **Hands-on Lab**: Provide benign proof probe `<b>refl_body_probe</b>`. Observe DOM creation in vulnerable mode vs entity encoding in fixed mode.
- **Key Concepts**: HTML parsing tree, browser rendering engine, entity encoding (`&lt;`, `&gt;`).

### Day 4: Category 1 — Reflected XSS in Quoted Attribute Context
- **Objectives**: Analyze attribute breakouts in `XSS-REFL-02` (`/search` shared link).
- **Hands-on Lab**: Inject delimiter breakout payload `test" data-marker="attr_probe` into the `href` attribute.
- **Key Concepts**: Quoted attribute delimiters, event injection (`onmouseover`), URL component encoding (`encodeURIComponent`).

### Day 5: Category 2 — Stored XSS in Collaboration Feed
- **Objectives**: Analyze persistence and retrieval across team sessions in `XSS-STOR-01`.
- **Hands-on Lab**: Post an update containing formatted markup. Observe how stored data persists in PostgreSQL and affects other simulated team members.
- **Key Concepts**: Second-order/stored XSS, database storage integrity, output encoding on retrieval.

### Day 6: Category 2 — Multi-View Profile Persistence
- **Objectives**: Investigate field rendering across multiple views in `XSS-STOR-02`.
- **Hands-on Lab**: Update user biography as Ari (Admin). Verify rendering in profile view, author badge, and post headers.
- **Key Concepts**: Inconsistent view rendering, sanitization at write vs read time.

### Day 7: Category 3 — DOM-based XSS via URL Fragments
- **Objectives**: Trace client-side execution flows in `XSS-DOM-01` (`/preview#fragment`).
- **Hands-on Lab**: Inspect `client/src/components/LivePreviewView.jsx`. Trace `window.location.hash` directly to `outputRef.current.innerHTML`.
- **Key Concepts**: DOM sinks, client runtime vs server rendering, `element.textContent` vs `element.innerHTML`.

---

## Week 2: Advanced Sinks, Parsers, & Defenses

### Day 8: Category 3 — DOM-based XSS via Cross-Window Messaging
- **Objectives**: Inspect HTML5 `postMessage` event handlers in `XSS-DOM-02`.
- **Hands-on Lab**: Dispatch messages via `window.postMessage(...)` in DevTools console. Test missing origin validation in vulnerable mode vs strict `event.origin` check in fixed mode.
- **Key Concepts**: `event.origin` verification, structured message schemas, cross-origin trust boundaries.

### Day 9: Category 4 — Mutation XSS (mXSS) & Parser Discrepancies
- **Objectives**: Understand browser HTML/MathML/SVG namespace switching in `XSS-MUT-01`.
- **Hands-on Lab**: Submit MathML/SVG payloads to `/api/challenges/mutation/test`. Compare browser re-serialization behavior.
- **Key Concepts**: Foreign object namespaces, browser HTML5 spec parsing quirks, sanitizer regressions.

### Day 10: Category 4 — Regex Sanitization Roundtrip Regressions
- **Objectives**: Evaluate why regular expressions cannot safely parse or sanitize HTML (`XSS-MUT-02`).
- **Hands-on Lab**: Test nested and malformed markup against regex replacements. Observe how browser DOM re-parsing recreates tags.
- **Key Concepts**: Regular languages vs context-free grammars, AST-based sanitizers vs regex string replacement.

### Day 11: Category 5 — Blind XSS in Privileged Support Queues
- **Objectives**: Investigate unprivileged submissions rendered in privileged consoles (`XSS-BLIND-01`).
- **Hands-on Lab**: Submit a support ticket as Mira (User). Switch session to Ari (Admin) and observe how the admin queue renders the message. Verify local callback on `:5000`.
- **Key Concepts**: Cross-privilege boundary crossing, safe OOB event listeners, non-exfiltrating verification.

### Day 12: Category 5 — Internal Email Preview Sandboxing
- **Objectives**: Analyze email digest templates and iframe sandboxes in `XSS-BLIND-02`.
- **Hands-on Lab**: Query `/api/email-preview/:id`. Verify sandboxing attributes (`sandbox="allow-same-origin"` vs strictly isolated views).
- **Key Concepts**: HTML email rendering risks, iframe sandboxing policies, defense-in-depth in internal tooling.

### Day 13: Category 6 — Self-XSS & Social Engineering Awareness
- **Objectives**: Study developer tools console paste attacks in `XSS-SELF-01` & `XSS-SELF-02`.
- **Hands-on Lab**: Open browser DevTools on `/`. Observe the high-contrast `⚠️ STOP!` warning. Query the guidelines endpoint for browser paste protection mechanisms.
- **Key Concepts**: Social engineering vectors, console paste guards (`allow pasting`), user education.

### Day 14: Category 7 — Content Security Policy (CSP) Directives & Weaknesses
- **Objectives**: Analyze route-specific CSP response headers in `XSS-CSP-01`.
- **Hands-on Lab**: Intercept CSP headers on `/search`. Compare weak policies containing `'unsafe-inline'` against hardened production headers.
- **Key Concepts**: `script-src`, `object-src`, `default-src`, inline script execution barriers.

---

## Week 3: Frameworks, Normalization, & Full Verification

### Day 15: Category 7 — Nonce-based CSP & Base-URI Hijacking
- **Objectives**: Examine nonce configuration and `<base>` tag manipulation in `XSS-CSP-02`.
- **Hands-on Lab**: Inspect `/api/challenges/csp/test`. Compare static/reused nonces with dynamic per-request nonces. Test the importance of `base-uri 'self'`.
- **Key Concepts**: Cryptographic nonces, nonce reuse flaws, base tag redirection attacks.

### Day 16: Category 8 — Modern Frameworks & React Escape Hatches
- **Objectives**: Investigate React rendering mechanics in `XSS-FW-01` and `XSS-FW-02`.
- **Hands-on Lab**: Compare standard JSX interpolation `{text}` with `dangerouslySetInnerHTML`. Test dynamic anchor tags with `javascript:` URI schemes.
- **Key Concepts**: Virtual DOM auto-escaping, unsafe escape hatches, client-side protocol allowlists.

### Day 17: Category 9 — Markdown Parsers & Link Scheme Allowlists
- **Objectives**: Analyze rich text rendering and Markdown engines in `XSS-MD-01` and `XSS-MD-02`.
- **Hands-on Lab**: Render markdown containing raw HTML tags and link schemes (`[click](javascript:alert(1))`). Observe DOMPurify integration and URL scheme validation.
- **Key Concepts**: Markdown-to-HTML compilation, HTML passthrough settings, URI allowlists (`http`, `https`, `mailto`).

### Day 18: Category 10 — Multi-Pass Decoding & Normalization Flaws
- **Objectives**: Exploit double-decoding filter bypasses in `XSS-ENC-01`.
- **Hands-on Lab**: Send multi-pass encoded payloads (`%25253Cscript%25253E`) to `/api/challenges/encoding/test`. Trace how WAFs that decode once are bypassed by downstream re-decoding.
- **Key Concepts**: Canonicalization order, premature validation, multi-pass decoding defects.

### Day 19: Category 10 — Naive Non-Recursive Blocklist Filters
- **Objectives**: Analyze token stripping flaws in `XSS-ENC-02`.
- **Hands-on Lab**: Test nested tokens (`<scr<script>ipt>`) against naive regex replacements.
- **Key Concepts**: Blocklists vs allowlists, recursive token reconstruction, parser differential.

### Day 20: Automated Playwright Dual-Mode Regression Testing
- **Objectives**: Automate browser verification across both `vulnerable` and `fixed` modes.
- **Hands-on Lab**: Run `npx playwright test playwright/xss_categories.spec.ts`. Verify that tests prove execution in vulnerable mode and prove safe remediation in fixed mode.
- **Key Concepts**: Automated browser testing, positive assertions, negative assertions, regression pipelines.

### Day 21: Full Workbench Assessment & Capstone Remediation Report
- **Objectives**: Conduct an end-to-end audit of NimbusBoard.
- **Hands-on Lab**: Reset database to clean seeds via `scripts/reset.ps1`. Execute smoke test runner `node --experimental-strip-types scripts/smoke_test_playwright.ts`. Document comprehensive verification evidence and CVSS metrics.
- **Key Concepts**: Security audit reporting, CVSS scoring, executive summaries, remediation sign-off.

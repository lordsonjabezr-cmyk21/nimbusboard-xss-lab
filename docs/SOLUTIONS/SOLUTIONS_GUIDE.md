# NimbusBoard Official Solutions & Defense Guide

This directory contains complete step-by-step solutions, root-cause analyses, harmless verification procedures, and defensive remediation code diffs for all 10 training categories in NimbusBoard.

---

## Solutions Index

1. [Category 01: Reflected XSS Solutions](./CAT-01-solutions.md) — HTML Body Reflection & Quoted Attribute Breakout
2. [Category 02: Stored XSS Solutions](./CAT-02-solutions.md) — Post Content & User Profile Persistence
3. [Category 03: DOM-based XSS Solutions](./CAT-03-solutions.md) — URL Hash Sinks & Cross-Window Messaging
4. [Category 04: Mutation XSS Solutions](./CAT-04-solutions.md) — MathML/SVG Namespace & Custom Regex Flaws
5. [Category 05: Blind XSS Solutions](./CAT-05-solutions.md) — Support Feedback Queues & Email Digest Sandbox
6. [Category 06: Self-XSS Solutions](./CAT-06-solutions.md) — Console Paste Injection & Social Engineering Defenses
7. [Category 07: CSP & Filter Solutions](./CAT-07-solutions.md) — Unsafe-Inline Policies & Nonce Configuration
8. [Category 08: Modern Frameworks Solutions](./CAT-08-solutions.md) — React Escape Hatches & URL Scheme Validation
9. [Category 09: Markdown Solutions](./CAT-09-solutions.md) — Raw HTML Passthrough & Link Scheme Allowlists
10. [Category 10: Encoding & Filters Solutions](./CAT-10-solutions.md) — Double-Decoding & Non-Recursive Tag Stripping

---

## Flag Capture Architecture

Each challenge has a unique, cryptographically verifiable flag registered in the backend flag database. In `vulnerable` mode, analyzing the vulnerability reveals the flag submission key, which can be claimed via the **Lab & Scoreboard** tab (`/lab`) or via the API:

```bash
curl -X POST http://127.0.0.1:4000/lab/flags/submit \
  -H "Content-Type: application/json" \
  -d '{"challengeId":"reflected","flag":"FLAG{refl_xss_mastered_2026}"}'
```

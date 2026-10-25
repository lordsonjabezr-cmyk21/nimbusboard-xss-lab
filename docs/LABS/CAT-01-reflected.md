# Category 01 — Reflected Cross-Site Scripting (Reflected XSS)

## Overview
Reflected XSS occurs when an application receives untrusted input in an HTTP request and immediately embeds that input in the HTTP response without adequate validation, contextual encoding, or sanitization.

In NimbusBoard, Category 1 explores two distinct reflection contexts:
1. **HTML Body Context** (`XSS-REFL-01`)
2. **Quoted Attribute Context** (`XSS-REFL-02`)

---

## Exercise 1: XSS-REFL-01 — Search Query Reflection in HTML Body

### Vulnerability Context
- **Target Route**: `/search?q=USER_QUERY`
- **Component**: [client/src/components/SearchView.jsx](file:///c:/nimbusboard-xss-lab/client/src/components/SearchView.jsx)
- **Sink**: `dangerouslySetInnerHTML={{ __html: \`<h2>Results for: \${submittedQuery}</h2>\` }}`

### Vulnerable Code Pattern
```jsx
// client/src/components/SearchView.jsx
{isVuln ? (
  <div dangerouslySetInnerHTML={{ __html: `<h2>Results for: ${submittedQuery}</h2>` }} />
) : (
  <h2>Results for: {submittedQuery}</h2>
)}
```

### Demonstration Payload
- **Probe**: `<b>refl_body_probe</b>`
- **Full URL**: `http://127.0.0.1:3000/search?q=%3Cb%3Erefl_body_probe%3C%2Fb%3E`

### Expected Behavior
- **Vulnerable Mode**: The browser parser evaluates `<b>`, creating a live bold element in the DOM inside `.search-results-heading`.
- **Fixed Mode**: React's standard JSX `{submittedQuery}` interpolates the string as plain text. The literal characters `<b>refl_body_probe</b>` are displayed safely without creating new DOM nodes.

---

## Exercise 2: XSS-REFL-02 — Quoted Attribute Context Breakout in Share Links

### Vulnerability Context
- **Target Route**: `/search?q=USER_QUERY` (Share link section)
- **Component**: [client/src/components/SearchView.jsx](file:///c:/nimbusboard-xss-lab/client/src/components/SearchView.jsx)
- **Sink**: `<a id="share-link" href="${shareHref}">`

### Vulnerable Code Pattern
```jsx
// client/src/components/SearchView.jsx
const shareHref = isVuln
  ? `/search?q=${submittedQuery}`
  : `/search?q=${encodeURIComponent(submittedQuery)}`;

{isVuln ? (
  <div dangerouslySetInnerHTML={{
    __html: `<a id="share-link" href="${shareHref}">🔗 Open Saved Search</a>`
  }} />
) : (
  <a id="share-link" href={shareHref}>🔗 Open Saved Search</a>
)}
```

### Demonstration Payload
- **Probe**: `test" data-marker="attr_probe`
- **Breakout Mechanism**: The leading `"` terminates the `href` attribute, allowing additional attributes (such as `data-marker` or event handlers) to be injected directly onto the `<a>` element.

### Expected Behavior
- **Vulnerable Mode**: The attribute is broken; inspecting `#share-link` in DevTools reveals the injected attribute `data-marker="attr_probe"`.
- **Fixed Mode**: `encodeURIComponent()` converts `"` to `%22`, preserving attribute boundaries. `data-marker` is null.

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-01"
```

# Category 08 — Modern Framework XSS & React Trust Boundaries

## Overview
Modern frontend frameworks like React, Vue, and Angular provide automatic contextual encoding by default when interpolating data in templates (e.g. `{userInput}`). However, XSS vulnerabilities frequently occur when developers utilize framework "escape hatches" or fail to validate URL-valued attributes.

In NimbusBoard, Category 8 explores:
1. **React's `dangerouslySetInnerHTML` Escape Hatch** (`XSS-FW-01`)
2. **Dynamic `href` Protocol Validation (`javascript:`)** (`XSS-FW-02`)

---

## Exercise 1: XSS-FW-01 — React `dangerouslySetInnerHTML`

### Vulnerability Context
- **Target Endpoint**: `POST /api/challenges/framework/render`
- **Concept**: React explicitly prefixes this property with `dangerously` to signal that it bypasses the virtual DOM's auto-escaping pipeline and directly injects markup into the DOM.

### Vulnerable Code Pattern
```jsx
// Flawed usage: passing unsanitized external data directly to dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: apiResponse.description }} />
```

### Remediation
```jsx
// Safe alternatives:
// 1. Standard React text interpolation (auto-escaped):
<div>{apiResponse.description}</div>

// 2. If rich HTML is mandatory, sanitize with DOMPurify:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(apiResponse.description) }} />
```

---

## Exercise 2: XSS-FW-02 — Dynamic Link Protocol Validation (`javascript:`)

### Vulnerability Context
- **Target Endpoint**: `POST /api/challenges/framework/render`
- **Concept**: React auto-escapes string values passed to attributes like `href="..."`. However, entity-encoding `javascript:alert(1)` does **not** neutralize it, because the browser decodes attribute entities before evaluating the URL scheme when clicked!

### Code Comparison
```javascript
// Vulnerable: trusts any user-provided URL string
const safeUrl = isVulnerable() ? rawUrl : (isSafeScheme(rawUrl) ? rawUrl : "#");

function isSafeScheme(url) {
  try {
    const parsed = new URL(url, "http://127.0.0.1");
    return ["http:", "https:", "mailto:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### Demonstration Payload
- **Probe**: `javascript:alert(1)`

### Expected Behavior
- **Vulnerable Mode**: The anchor tag is created with `href="javascript:alert(1)"`. Clicking it triggers script execution.
- **Fixed Mode**: Protocol validation rejects the unsafe scheme, reverting the link to a safe placeholder `#` or `about:blank`.

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-08"
```

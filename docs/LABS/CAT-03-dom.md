# Category 03 — DOM-Based Cross-Site Scripting (DOM XSS)

## Overview
DOM-based XSS occurs when an application contains client-side JavaScript that processes data from an untrusted source (such as `location.hash` or `window.postMessage`) and writes that data to an execution sink in the Document Object Model (DOM) such as `innerHTML` without safe sanitization.

In NimbusBoard, Category 3 explores:
1. **URL Fragment Flowing into DOM Sink** (`XSS-DOM-01`)
2. **Unvalidated Cross-Window postMessage Sink** (`XSS-DOM-02`)

---

## Exercise 1: XSS-DOM-01 — URL Fragment (`location.hash`) Sink

### Vulnerability Context
- **Target Route**: `/preview#USER_PAYLOAD`
- **Component**: [client/src/components/LivePreviewView.jsx](file:///c:/nimbusboard-xss-lab/client/src/components/LivePreviewView.jsx)
- **Source**: `window.location.hash`
- **Sink**: `outputRef.current.innerHTML`

### Vulnerable Code Pattern
```javascript
// client/src/components/LivePreviewView.jsx
useEffect(() => {
  const handleHash = () => {
    if (window.location.hash && outputRef.current) {
      const raw = decodeURIComponent(window.location.hash.slice(1));
      if (isVuln) {
        outputRef.current.innerHTML = raw;
      } else {
        outputRef.current.textContent = raw;
      }
    }
  };
  handleHash();
  window.addEventListener("hashchange", handleHash);
}, [isVuln]);
```

### Demonstration Payload
- **Probe**: `<b>dom_hash_probe</b>`
- **URL**: `http://127.0.0.1:3000/preview#%3Cb%3Edom_hash_probe%3C%2Fb%3E`

### Expected Behavior
- **Vulnerable Mode**: The string following `#` is sliced, decoded, and written directly into `innerHTML`, creating a live `<b>` DOM node.
- **Fixed Mode**: The safe property `textContent` is used instead, rendering the fragment as literal text.

---

## Exercise 2: XSS-DOM-02 — Live Preview postMessage Messaging Sink

### Vulnerability Context
- **Target Route**: `/preview`
- **Component**: [client/src/components/LivePreviewView.jsx](file:///c:/nimbusboard-xss-lab/client/src/components/LivePreviewView.jsx)
- **Source**: HTML5 `message` event (`e.data`)
- **Sink**: `outputRef.current.innerHTML`

### Vulnerable Code Pattern
```javascript
// client/src/components/LivePreviewView.jsx
useEffect(() => {
  const handleMessage = (e) => {
    if (!outputRef.current) return;
    if (mode === "vulnerable") {
      // Vulnerable: no origin check, writes straight to innerHTML
      if (typeof e.data === "string") {
        outputRef.current.innerHTML = e.data;
      }
    } else {
      // Fixed: strict origin check and safe textContent
      if (e.origin === window.location.origin && typeof e.data === "string") {
        outputRef.current.textContent = e.data;
      }
    }
  };
  window.addEventListener("message", handleMessage);
}, [mode]);
```

### Demonstration Payload
- **Probe**: `<em>postmessage_dom_probe</em>`
- **Console Dispatch**: `window.postMessage("<em>postmessage_dom_probe</em>", "*")`

### Expected Behavior
- **Vulnerable Mode**: Any cross-window message from any origin is written to `innerHTML`, creating an `<em>` element.
- **Fixed Mode**: Strict origin verification (`e.origin === window.location.origin`) is enforced and output is assigned to `textContent`.

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-03"
```

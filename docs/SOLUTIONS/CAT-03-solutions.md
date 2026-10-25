# Solutions — Category 03: DOM-Based XSS

## Challenge 1: XSS-DOM-01 (URL Fragment `location.hash` to `innerHTML`)

### 1. Root Cause Analysis
In `LivePreviewView.jsx`, a `hashchange` event listener reads `window.location.hash`, decodes it, and assigns it directly to `outputRef.current.innerHTML`. Because this execution takes place entirely within client-side JavaScript, server-side WAFs and filters are completely bypassed.

### 2. Harmless Proof of Concept
Navigate to:
```
http://127.0.0.1:3000/preview#%3Cb%3Edom_hash_probe%3C%2Fb%3E
```
Inspect `#preview-output`. A bold element `<b>dom_hash_probe</b>` is created directly in the DOM tree.

### 3. Remediation Diff
```diff
--- a/client/src/components/LivePreviewView.jsx
+++ b/client/src/components/LivePreviewView.jsx
@@ -15,3 +15,1 @@
-  outputRef.current.innerHTML = raw;
+  outputRef.current.textContent = raw;
```
`textContent` writes plain text safely without invoking the browser's HTML parser.

---

## Challenge 2: XSS-DOM-02 (`postMessage` Messaging Sink)

### 1. Root Cause Analysis
A `message` event listener on `window` accepts incoming cross-window messages and writes `e.data` directly to `outputRef.current.innerHTML` without verifying the sender's origin (`e.origin`). An attacker can embed the application in an `<iframe>` on any third-party domain and dispatch malicious messages via `targetWindow.postMessage(...)`.

### 2. Harmless Proof of Concept
In the browser DevTools console on `/preview`:
```javascript
window.postMessage("<em>postmessage_dom_probe</em>", "*");
```
Inspect `#preview-output`. An `<em>` element appears.

### 3. Remediation Diff
```diff
--- a/client/src/components/LivePreviewView.jsx
+++ b/client/src/components/LivePreviewView.jsx
@@ -37,3 +37,4 @@
-  outputRef.current.innerHTML = e.data;
+  if (e.origin === window.location.origin && typeof e.data === "string") {
+    outputRef.current.textContent = e.data;
+  }
```
Always verify that `e.origin` matches the trusted origin before acting on message data, and use safe sinks like `textContent`.

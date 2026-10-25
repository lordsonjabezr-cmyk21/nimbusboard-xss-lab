# Category 06 — Self-XSS & Social Engineering Awareness

## Overview
Self-XSS (or Console Paste Injection) is a social engineering attack where a victim is tricked into copying and pasting malicious JavaScript into their browser developer tools console or address bar. Attackers often promise free premium perks, administrative tokens, or cheats to persuade the user.

In NimbusBoard, Category 6 explores:
1. **Developer Tools Console Warning Demonstration** (`XSS-SELF-01`)
2. **Browser Paste Guard Architecture & Education** (`XSS-SELF-02`)

---

## Exercise 1: XSS-SELF-01 — High-Visibility Console Warning

### Implementation Context
- **Component**: [client/src/App.jsx](file:///c:/nimbusboard-xss-lab/client/src/App.jsx)
- **Concept**: Prominent warning banners printed to the browser console to dissuade users from executing untrusted scripts.

### Code Implementation
```javascript
// client/src/App.jsx
useEffect(() => {
  console.log(
    "%c⚠️ STOP!",
    "color: red; font-size: 32px; font-weight: bold; -webkit-text-stroke: 1px black;"
  );
  console.log(
    "%cThis is a browser feature intended for developers. If someone told you to copy and paste code here to unlock features or get flags, it is a Self-XSS attack (Category 6). Do not execute unknown scripts in the console.",
    "font-size: 14px; color: #1e3a8a; line-height: 1.5;"
  );
}, []);
```

### Verification
Open DevTools (`F12` or `Ctrl+Shift+I`) on `http://127.0.0.1:3000/`. Observe the high-contrast `⚠️ STOP!` warning banner in the console.

---

## Exercise 2: XSS-SELF-02 — Modern Browser Paste Guard Architecture

### Implementation Context
- **Target Endpoint**: `GET /api/challenges/self-xss/guidelines`
- **Concept**: Modern Chromium-based browsers (Chrome, Edge, Brave) and Firefox implement built-in paste guards requiring users to type `allow pasting` before multi-line scripts can be executed.

### Educational Guidelines
1. **Never copy-paste unfamiliar code**: Scripts executed in the console run in the context of the user's active authenticated session.
2. **Same-Origin Access**: A script running in the console can access `localStorage`, DOM cookies not marked `HttpOnly`, and make authenticated API calls on behalf of the user.
3. **Defense-in-Depth**: Storing session tokens in `HttpOnly`, `SameSite=Strict` cookies prevents client-side scripts from reading session identifiers even if a user pastes malicious code.

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-06"
```

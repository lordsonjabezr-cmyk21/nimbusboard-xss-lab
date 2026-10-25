# Solutions — Category 06: Self-XSS & Social Engineering Awareness

## Challenge 1: XSS-SELF-01 (Console Warning Demonstration)

### 1. Attack Scenario
An attacker approaches a victim on a social platform (Discord, Slack, LinkedIn) claiming:
> "To unlock admin tools and access hidden lab flags, press F12, open the Console tab, paste this script, and hit Enter."

The script reads `localStorage` or makes authenticated requests to administrative endpoints using the victim's session.

### 2. Defense Implementation
NimbusBoard outputs a high-visibility, stylized security warning in the console when the app starts:
```javascript
// client/src/App.jsx
console.log(
  "%c⚠️ STOP!",
  "color: red; font-size: 32px; font-weight: bold; -webkit-text-stroke: 1px black;"
);
console.log(
  "%cThis is a browser feature intended for developers. If someone told you to copy and paste code here to unlock features or get flags, it is a Self-XSS attack (Category 6). Do not execute unknown scripts in the console.",
  "font-size: 14px; color: #1e3a8a; line-height: 1.5;"
);
```

---

## Challenge 2: XSS-SELF-02 (Browser Paste Guard Guidelines)

### 1. Browser Security Mechanisms
Modern browsers implement multi-layered paste defenses:
- **DevTools Paste Warnings**: In Chrome and Edge, pasting a script into the console triggers a warning dialog: `Warning: Don't paste code into the DevTools Console that you don't understand or haven't reviewed yourself. This could allow attackers to steal your identity or take control of your computer.`
- **Typing Confirmation**: Users must manually type `allow pasting` before multi-line inputs can be run.

### 2. Defense-in-Depth for Developers
1. **Never store sensitive session credentials in `localStorage`**:
   `localStorage` is accessible to any script executing on the origin.
2. **Use `HttpOnly` Cookies**:
   Set `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict`. Even if a user pastes a script into the console, `document.cookie` cannot read the `HttpOnly` token.

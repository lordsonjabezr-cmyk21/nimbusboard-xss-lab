# NimbusBoard Security Boundaries & Training Safety Policy

NimbusBoard is engineered specifically for authorized, ethical cybersecurity training. It contains intentionally vulnerable code patterns alongside their production-grade fixes. To prevent accidental misuse, leakage, or collateral risk, strict architectural and operational guardrails are permanently enforced.

---

## 1. Network Isolation & Loopback Binding

1. **Strict Loopback Binding (`127.0.0.1`)**:
   - All host-published container ports (`3000`, `4000`, `5000`) are explicitly bound to `127.0.0.1` in [docker-compose.yml](file:///c:/nimbusboard-xss-lab/docker-compose.yml).
   - Under no circumstances should port bindings be changed to `0.0.0.0` or deployed to publicly accessible IP addresses or cloud instances.

2. **Internal-Only Database Network**:
   - The PostgreSQL database service (`db`) does **not** publish any port to the host system.
   - It communicates exclusively across the isolated Docker bridge network `lab-net` with the backend `api` container.

3. **No Outbound Network Exfiltration**:
   - The application does not communicate with external third-party servers, public CDNs, or external webhook services.
   - All JavaScript libraries (React, Vite, DOMPurify, Marked) and CSS stylesheets are bundled locally.

---

## 2. Local Callback Listener Architecture (Blind XSS Safety)

Blind XSS training exercises frequently require demonstrating that an unprivileged user can trigger an action inside a privileged reviewer's session. In real-world attacks, adversaries use out-of-band (OOB) listeners to steal session tokens or credentials.

NimbusBoard completely eliminates credential theft risk through a **fixed metadata callback architecture**:

1. **Rejection of Arbitrary URLs**:
   - The backend and frontend never accept external callback URLs from user input.
   - The target callback destination is hardcoded to the internal Docker service: `http://oob-listener:5000/callback`.

2. **Fixed Event Payload Format**:
   - The OOB listener accepts **only** structured, harmless JSON metadata:
     ```json
     {
       "event": "feedback-submitted",
       "id": 12
     }
     ```
   - It strictly rejects arbitrary payloads, cookies, session identifiers, local storage dumps, or base64 blobs.

3. **In-Memory Volatile Log**:
   - The callback listener stores received pings in an in-memory array capped at recent events.
   - Restarting or invoking `POST /reset` instantly flushes all history.

---

## 3. Harmless Demonstration Markers Policy

When developing automated test cases or demonstrating vulnerability reproduction:

- **Harmless Proof-of-Concept Markers Only**:
  Acceptable demonstration markers include:
  - Benign DOM elements (e.g. `<b id="injected">probe</b>`, `<span class="marker">test</span>`)
  - Benign styling changes (e.g. `<u class="test-probe">underline</u>`)
  - Safe browser dialogs (e.g. `alert("XSS")`)
  - Harmless console logging (e.g. `console.log("XSS-REFL-01 triggered")`)

- **Prohibited Payload Patterns**:
  - Never execute real credential stealing code (e.g., `document.cookie` exfiltration).
  - Never attempt keylogging, form field harvesting, or session hijacking scripts.
  - Never generate or deploy wormable self-propagating scripts.
  - Never target third-party domains or external infrastructure.

---

## 4. Self-XSS & Social Engineering Awareness (Category 6)

Social engineering attacks frequently trick victims into copying and pasting JavaScript into their browser developer tools console (Console Paste Injection / Self-XSS).

NimbusBoard implements proactive user education:
- A high-visibility `⚠️ STOP!` warning is logged to the developer console upon application initialization in [client/src/App.jsx](file:///c:/nimbusboard-xss-lab/client/src/App.jsx).
- The warning informs users that pasting scripts from untrusted parties is an attack vector designed to compromise client sessions.
- The educational API endpoint `/api/challenges/self-xss/guidelines` details modern browser defenses, such as Chrome/Edge DevTools paste guards and `allow pasting` prompts.

---

## 5. Ethical Guidelines & Legal Notice

NimbusBoard is developed solely for legitimate educational training, penetration testing practice in controlled sandbox environments, and application security engineering defense verification.

Unauthorized scanning, exploitation, or attacking of computer systems without explicit, prior written authorization from the system owner is illegal and unethical. Use this workbench exclusively within the provided local loopback environment.

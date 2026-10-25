# Solutions — Category 05: Blind XSS

## Challenge 1: XSS-BLIND-01 (Support Ticket Queue & OOB Verification)

### 1. Root Cause Analysis
Unprivileged users submit feedback tickets via `POST /api/support`. In `AdminView.jsx`, administrators review tickets in the Support Queue where ticket messages are rendered via `dangerouslySetInnerHTML`. Because the user has no direct feedback that their payload succeeded, it is "blind" until an administrator reviews the queue.

### 2. Harmless Proof of Concept & OOB Verification
1. Submit feedback as Mira (User):
   ```bash
   curl -X POST http://127.0.0.1:4000/api/support \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer token-mira" \
     -d '{"message":"<b id=\"blind-poc\">Urgent issue</b>"}'
   ```
2. Verify that the local OOB callback listener recorded the submission:
   ```bash
   curl http://127.0.0.1:5000/
   ```
3. Open `/admin` as Ari (Admin). In vulnerable mode, `#blind-poc` is rendered into the privileged queue.

### 3. Remediation Diff
```diff
--- a/client/src/components/AdminView.jsx
+++ b/client/src/components/AdminView.jsx
@@ -102,3 +102,1 @@
-  <div className="feedback-body" dangerouslySetInnerHTML={{ __html: item.message }} />
+  <div className="feedback-body">{item.message}</div>
```
Always contextually encode user messages before displaying them in administrative back-office tools.

---

## Challenge 2: XSS-BLIND-02 (Internal Notification Email Preview Sandbox)

### 1. Root Cause Analysis
System notification emails generated from support submissions are previewed in the administrative console via `/api/email-preview/:id`. In vulnerable mode, the email digest embeds unescaped HTML directly in the parent window.

### 2. Remediation Diff
```diff
--- a/src/routes/emailPreview.js
+++ b/src/routes/emailPreview.js
@@ -35,3 +35,2 @@
-  <div class="email-body">${email.body_html}</div>
+  <iframe sandbox srcdoc="${esc(email.body_html)}" style="width:100%;border:none;"></iframe>
```
Using an `<iframe>` with the `sandbox` attribute (omitting `allow-scripts` and `allow-same-origin`) completely isolates the email content from the parent application session.

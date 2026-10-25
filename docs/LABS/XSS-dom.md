# DOM-based XSS Lab

**Routes:** `/preview` and the URL fragment preview.

**Objective:** trace a client-side source to a DOM sink without relying on server reflection.

**Evidence:** show that fragment-only input changes the DOM while the server request remains unchanged.

**Fix challenge:** use `textContent` for plain text; avoid parsing untrusted input as HTML.

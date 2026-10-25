# Stored XSS Lab

**Routes:** `/`, `/api/posts`, `/support`, `/admin`

**Objective:** follow user content through storage and into multiple views, including the admin feedback queue.

**Evidence:** show the submitted value, stored API object, and rendered DOM.

**Fix challenge:** use text rendering by default; use a maintained sanitizer only if product requirements demand a limited subset of HTML.

# Reflected XSS Lab

**Routes:** `/search?q=...`, `/share?term=...`

**Objective:** map a request parameter to the resulting DOM and distinguish text, attribute, and URL contexts.

**Evidence:** request/response pair, rendered DOM, browser console, and a screenshot of the resulting behavior.

**Fix challenge:** run with `LAB_MODE=fixed`; ensure output is encoded for the exact context and link parameters are URL-encoded.

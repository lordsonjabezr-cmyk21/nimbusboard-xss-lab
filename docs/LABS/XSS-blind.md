# Blind XSS Workflow Lab

**Routes:** `/support`, `/admin`, local listener on port 5000.

**Objective:** demonstrate that a submission is later reviewed in an internal view and confirm a local callback event.

**Safety:** listener events contain only a fixed event name and generated numeric ID; the scaffold does not exfiltrate secrets.

**Fix challenge:** render submitted feedback as text and keep admin views isolated from unsafe HTML.

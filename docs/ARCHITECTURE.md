# NimbusBoard Architecture & Trust Boundary Specification

NimbusBoard is a production-grade, self-contained educational training laboratory designed for mastering Cross-Site Scripting (XSS) discovery, exploitation principles, and defensive remediation in modern web architectures.

---

## 1. System Topology & Service Layout

The platform runs as four orchestrated services connected via an internal Docker bridge network (`lab-net`). All host-facing ports are strictly bound to loopback (`127.0.0.1`), ensuring zero external network exposure.

```
+--------------------------------------------------------------------------------------------------+
| HOST SYSTEM (127.0.0.1 Only)                                                                     |
|                                                                                                  |
|   +-----------------------+     +------------------------+     +-------------------------------+ |
|   |   React + Vite SPA    |     |   Node.js / Express    |     |   Local OOB Event Listener    | |
|   |   (Port 3000)         |     |   REST API & GraphQL   |     |   (Port 5000)                 | |
|   |                       |     |   (Port 4000)          |     |                               | |
|   +-----------+-----------+     +-----------+------------+     +---------------+---------------+ |
|               |                             |                                  |                 |
+---------------|-----------------------------|----------------------------------|-----------------+
| DOCKER BRIDGE NETWORK (`lab-net`)           |                                  |
|               |                             |                                  |
|               +-------- HTTP Proxy ---------+                                  |
|                                             |                                  |
|                                             +------- HTTP Post (Event Meta) ---+
|                                             |
|                                 +-----------+-----------+
|                                 |   PostgreSQL 16 DB    |
|                                 |   (Port 5432 - NO     |
|                                 |    HOST PUBLISHING)   |
|                                 +-----------------------+
+--------------------------------------------------------------------------------------------------+
```

### Service Registry

| Service Name | Container Name | Port Mapping | Description |
| :--- | :--- | :--- | :--- |
| `frontend` | `nimbusboard-xss-lab-frontend-1` | `127.0.0.1:3000 -> 3000` | Single-page collaboration app built with React 19 and Vite 6. Proxies API requests to `api:4000`. |
| `api` | `nimbusboard-xss-lab-api-1` | `127.0.0.1:4000 -> 4000` | Node.js Express backend serving REST endpoints, GraphQL schema, session authentication, and challenge routes. |
| `oob-listener`| `nimbusboard-xss-lab-oob-listener-1` | `127.0.0.1:5000 -> 5000` | Local-only callback receptor for safe Blind-XSS verification. Accepts fixed event metadata only. |
| `db` | `nimbusboard-xss-lab-db-1` | *None* (Internal 5432) | PostgreSQL 16 relational database storing user records, team posts, comments, kanban tasks, emails, and flags. |

---

## 2. Trust Boundaries & Server-Side RBAC

Client-side UI visibility toggling does **not** constitute security. NimbusBoard enforces role-based access control (RBAC) at the Express API layer using cryptographically verified JSON Web Tokens (`jsonwebtoken`) or structured session bearer tokens.

```
+-----------------------------------------------------------------------------+
|                               TRUST TIERS                                   |
+-------------------+-------------------------------------+-------------------+
| Role              | Seed Account & Credentials          | Authorizations    |
+-------------------+-------------------------------------+-------------------+
| Administrator     | Ari (`ari` / `password123`)          | Full system       |
|                   | Token: `token-ari`                  | Audit logs, users |
|                   |                                     | Queue moderation  |
+-------------------+-------------------------------------+-------------------+
| Moderator         | Noah (`noah` / `password123`)       | Queue moderation  |
|                   | Token: `token-noah`                 | Feedback review   |
|                   |                                     | Comment deletion  |
+-------------------+-------------------------------------+-------------------+
| Standard User     | Mira (`mira` / `password123`)       | Feed posting      |
|                   | Token: `token-mira`                 | Task management   |
|                   |                                     | Profile editing   |
+-------------------+-------------------------------------+-------------------+
| Unauthenticated   | Public Visitor                      | Health probes     |
|                   | (No credentials)                    | Login / Register  |
|                   |                                     | Reflected routes  |
+-------------------+-------------------------------------+-------------------+
```

### Authorization Enforcement Mechanism
All privileged API routes (`/api/admin/*`, `/api/support/tickets`) invoke the `requireRole("admin")` or `requireRole("moderator", "admin")` middleware in [src/middleware/auth.js](file:///c:/nimbusboard-xss-lab/src/middleware/auth.js). Attempts by standard users (Mira) or unauthenticated clients to access privileged endpoints yield HTTP `403 Forbidden` with structured JSON audit records.

---

## 3. Data Flow & Sink Architecture

Input flows from untrusted browser sources through transport, storage, and retrieval before reaching execution sinks:

```
[ Untrusted Input Source ]
       │
       ▼
[ Express API Router ] ─────── (Input Validation / LAB_MODE Filter Check)
       │
       ▼
[ PostgreSQL Database ] ────── (Stored in relational tables)
       │
       ▼
[ Express Response ] ───────── (Contextual Encoding vs Raw Output depending on LAB_MODE)
       │
       ▼
[ React Component / DOM Sink ]
       │
       ├─► Vulnerable Mode: innerHTML / dangerouslySetInnerHTML / javascript: href
       └─► Fixed Mode: textContent / contextual html entities / safe scheme allowlist
```

### Core Sink Taxonomies

1. **HTML Body Context**: Search query reflections (`XSS-REFL-01`), team feed post bodies (`XSS-STOR-01`), and ticket descriptions.
2. **Quoted Attribute Context**: Shared search links (`XSS-REFL-02`), markdown image URLs (`XSS-MD-02`), and dynamic anchor tags (`XSS-FW-02`).
3. **Client-Side DOM Sinks**: `location.hash` parsed directly into `innerHTML` (`XSS-DOM-01`) and unvalidated `postMessage` event handlers (`XSS-DOM-02`).
4. **Internal Review Sinks**: Privileged moderation queue (`XSS-BLIND-01`) and email digest previewers (`XSS-BLIND-02`).

---

## 4. Reset & Persistence Engine

NimbusBoard uses a transactional seed restoration pipeline implemented in [src/db/init.js](file:///c:/nimbusboard-xss-lab/src/db/init.js):
- Truncates all transactional tables (`posts`, `comments`, `tasks`, `feedback`, `emails`, `audit_logs`).
- Resets PostgreSQL auto-incrementing identity sequences (`RESTART IDENTITY CASCADE`).
- Re-populates deterministic fictional records from [src/db/seed.sql](file:///c:/nimbusboard-xss-lab/src/db/seed.sql).
- In environments without PostgreSQL, an in-memory database mock seamlessly serves identical relational data structures.
- Restores lab flags, hints availability, and challenge scoreboards instantly.

# NimbusBoard — Production-Grade XSS Training Laboratory & Security Workbench

NimbusBoard is a self-contained educational training laboratory designed for cybersecurity students, penetration testers, and application security engineers. It simulates a modern full-stack team collaboration application (featuring team feeds, a Kanban sprint board, live previewers, user profile administration, support ticketing, and an interactive training scoreboard) while providing rigorous, browser-verified training across ten classic and modern Cross-Site Scripting (XSS) vulnerability categories.

> [!WARNING]
> **LOCAL TRAINING USE ONLY**: This software is intentionally vulnerable when operated in vulnerable training mode. It is designed strictly for local educational exercises on loopback (`127.0.0.1`). Never deploy or expose this laboratory to public networks, production clusters, or multi-tenant hosting environments.

---

## 1. Project Purpose & Educational Scope

NimbusBoard bridges the gap between synthetic "toy" XSS benchmarks and realistic full-stack architectures. Students and engineers can practice discovering, exploiting, and remedying XSS flaws across diverse contexts:
- Raw HTML body vs. quoted HTML attribute breakout.
- Multi-view stored markup rendering in team feeds and profile cards.
- Client-side DOM sources (`location.hash`, `window.postMessage`) and sinks.
- Foreign content namespace switching (MathML / SVG) in mutation XSS.
- Asynchronous Blind XSS review workflows with an isolated local Out-of-Band (OOB) listener.
- Social engineering developer console paste attacks (Self-XSS).
- Content Security Policy (CSP) header analysis, `unsafe-inline`, and nonce reuse.
- Modern frontend framework escape hatches (`dangerouslySetInnerHTML`, `javascript:` URI schemes).
- Markdown parser raw HTML passthrough and protocol allowlisting.
- Multi-pass encoding, double-decoding, and naive non-recursive regex bypasses.

---

## 2. Technology Stack & Architecture Overview

The lab consists of four modular services communicating over an isolated Docker bridge network (`lab-net`):

```
+-------------------------------------------------------------------------+
|                               HOST MACHINE                              |
|                                                                         |
|  Browser / Client          Browser / Admin           Playwright Suite   |
|         │                         │                         │           |
|         ▼                         ▼                         ▼           |
|  127.0.0.1:3000            127.0.0.1:4000            127.0.0.1:5000     |
+─────────┼─────────────────────────┼─────────────────────────┼───────────+
          │                         │                         │
┌─────────▼───────────────┐ ┌───────▼───────────────┐ ┌───────▼───────────┐
│     frontend            │ │         api           │ │   oob-listener    │
│  (React 18 / Vite 6)    │ │  (Express 4 / Node 22)│ │(Express 4 / Node) │
│  Client SPA & UI Views  │ │ REST, GraphQL, Auth   │ │ Safe Event Log    │
└─────────────────────────┘ └───────┬───────────────┘ └───────────────────┘
                                    │
                            ┌───────▼───────────────┐
                            │          db           │
                            │ (PostgreSQL 16-Alpine)│
                            │ Isolated (no host port│
                            └───────────────────────┘
```

- **Frontend Client**: React 18, Vite 6 Single Page Application (`127.0.0.1:3000`).
- **Backend API**: Node.js 22, Express 4.21.2, Helmet, DOMPurify, JSDOM, Marked, JSONWebToken, Pg (`127.0.0.1:4000`).
- **Database**: PostgreSQL 16 Alpine on internal Docker network `db:5432` with automated schema migrations and seed scripts. (Includes an in-memory test store fallback for offline test execution when `DATABASE_URL` is omitted).
- **OOB Callback Listener**: Minimal event listener (`127.0.0.1:5000`) for capturing simulated Blind XSS callback notifications without exfiltrating secrets.
- **Testing Engine**: Node.js native test runner (`node --test`), Playwright E2E browser automation.

---

## 3. Prerequisites & Required Software

- **Docker Desktop** or **Docker Engine & Docker Compose v2** (for containerized deployment).
- **Node.js &ge; 20.x** and **npm &ge; 10.x** (for running local test scripts or development).

---

## 4. Repository Setup & Environment Configuration

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nimbusboard-xss-lab
   ```

2. **Initialize your local environment file**:
   The repository provides a sanitized template (`.env.example`). Copy it to `.env`:
   ```bash
   # POSIX Shell
   cp .env.example .env

   # PowerShell
   Copy-Item .env.example .env
   ```

3. **Inspect the configuration variables in `.env`**:
   | Variable | Default Value | Description |
   | :--- | :--- | :--- |
   | `LAB_MODE` | `vulnerable` | Switches between `vulnerable` (intentional training flaws) and `fixed` (secure defenses). |
   | `LAB_HINTS` | `on` | Enables (`on`) or disables (`off`) hint endpoints and reference payloads. |
   | `LAB_PROFILE` | `training` | Sets environment profile (`training` or `production`). In `production`, dev token shortcuts are disabled and strong JWT secret is required. |
   | `ALLOW_DEV_TOKENS` | `true` | Allows training shortcuts (`token-ari`, `token-noah`, `token-mira`) only when `LAB_PROFILE=training`. |
   | `JWT_SECRET` | *(empty)* | Optional in training mode (ephemeral random secret generated automatically). Required in production mode (&ge; 32 characters). |
   | `PORT` | `4000` | Backend API port. |
   | `HOST` | `127.0.0.1` | Host binding for local API server. |
   | `DATABASE_URL` | `postgres://postgres:postgres@db:5432/nimbusboard` | PostgreSQL connection string. |
   | `OOB_URL` | `http://127.0.0.1:5000/callback` | Callback URL for Blind XSS simulation. Must resolve to loopback or lab container. |

---

## 5. Docker Build & Startup Commands

Start all containers in detached mode with automated service builds:

```bash
# Build images and launch services
docker compose up -d --build
```

Check the status of running containers:
```bash
docker compose ps
```

Verify service readiness via the health check endpoint:
```bash
# Verify API and PostgreSQL connectivity
curl -s http://127.0.0.1:4000/health
```

Expected health check response:
```json
{
  "ok": true,
  "name": "NimbusBoard Lab API",
  "profile": "training",
  "mode": "vulnerable",
  "hints": true,
  "devTokensEnabled": true,
  "database": {
    "ok": true,
    "provider": "postgresql",
    "ready": true
  }
}
```

Stop the containers when finished:
```bash
docker compose down
```

---

## 6. Application URLs & Local Port Mapping

All external service bindings are strictly mapped to `127.0.0.1` (loopback only):

| Service | Local URL | Port Binding | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend SPA** | [http://127.0.0.1:3000](http://127.0.0.1:3000) | `127.0.0.1:3000:3000` | React web application and challenge scoreboard |
| **Backend REST & GraphQL API** | [http://127.0.0.1:4000](http://127.0.0.1:4000) | `127.0.0.1:4000:4000` | Primary application and challenge API |
| **API Health Probe** | [http://127.0.0.1:4000/health](http://127.0.0.1:4000/health) | `127.0.0.1:4000` | Service health, mode, and database status |
| **OOB Callback Listener** | [http://127.0.0.1:5000](http://127.0.0.1:5000) | `127.0.0.1:5000:5000` | Local event callback inspector (Blind XSS) |
| **PostgreSQL Database** | Internal network only | None (No host port) | Data storage strictly isolated on `lab-net` |

---

## 7. Selecting Vulnerable and Fixed Modes

### Mode Descriptions
- **`vulnerable` mode**: Intentionally renders unencoded user inputs, enables raw markdown passthrough, permissive CSP with `'unsafe-inline'`, MathML namespace mutations, and dynamic href links. Used for vulnerability discovery, exploitation practice, and capturing category flags.
- **`fixed` mode**: Implements contextual output encoding, strict DOMPurify AST sanitization, URL scheme allowlisting (`http:`, `https:`, `mailto:`), nonce-based CSP, and sandboxed rendering. Used for verifying remediation efficacy.

### Switching Modes

#### Method 1: Via `.env` File (Recommended)
Edit `LAB_MODE` in `.env`:
```ini
LAB_MODE=fixed
```
Restart the API service:
```bash
docker compose up -d api
```

#### Method 2: Via Environment Variable (PowerShell)
```powershell
$env:LAB_MODE="fixed"
docker compose up -d api

# Switch back
$env:LAB_MODE="vulnerable"
docker compose up -d api
```

#### Method 3: Via Environment Variable (POSIX Shell)
```bash
LAB_MODE=fixed docker compose up -d api
```

---

## 8. Training Accounts & Authentication

The lab includes three pre-configured educational accounts with role-based access control (RBAC):

| Username | Role | Fictional Training Password | Training Dev Token | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `ari` | **Admin** | `AriAdmin2026!` | `token-ari` | Full administrative console, audit log inspection, comment deletion, user management |
| `noah` | **Moderator** | `NoahMod2026!` | `token-noah` | Support ticket review queue, moderation digest, comment deletion |
| `mira` | **User** | `MiraUser2026!` | `token-mira` | Team feed updates, comment creation, Kanban task management, personal bio |

### Authentication Modes
1. **Interactive UI Role Switcher**: Click the user buttons in the top navigation bar to switch sessions instantly using educational dev tokens.
2. **Standard REST API Login**:
   ```bash
   curl -X POST http://127.0.0.1:4000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"ari","password":"AriAdmin2026!"}'
   ```
3. **Hardened Production Profile**:
   If `LAB_PROFILE=production` is set, dev tokens are strictly disabled and requests must provide a cryptographically valid JWT signed with `JWT_SECRET`.

---

## 9. Running Backend & Integration Tests

The test suite runs using Node.js native test runner and includes tests for API routes, database operations, RBAC enforcement, and JWT configuration security.

```bash
# Run all unit, security, and integration tests
npm test
```

Specific test suites:
- `tests/api.test.js`: Core REST API routes, GraphQL queries, RBAC enforcement, and challenge endpoints.
- `tests/auth_security.test.js`: JWT secret validation, rejection of missing/known secrets, dev token profile gating, expired token handling, and invalid signature verification.
- `tests/smoke.test.js`: Rapid baseline health check and state reset test.

---

## 10. Running Playwright E2E Tests in Both Modes

Playwright browser tests verify real browser rendering and exploit execution in vulnerable mode, and confirm neutralization in fixed mode.

### Running in Vulnerable Mode:
```bash
# 1. Set mode to vulnerable
# Edit .env: LAB_MODE=vulnerable
docker compose up -d api

# 2. Reset database state
powershell -ExecutionPolicy Bypass -File scripts/reset.ps1   # Windows
./scripts/reset.sh                                          # Linux / macOS

# 3. Execute browser test suite
npm run test:browser
```

### Running in Fixed Mode:
```bash
# 1. Set mode to fixed
# Edit .env: LAB_MODE=fixed
docker compose up -d api

# 2. Reset database state
powershell -ExecutionPolicy Bypass -File scripts/reset.ps1   # Windows
./scripts/reset.sh                                          # Linux / macOS

# 3. Execute browser test suite
npm run test:browser
```

To run individual Playwright specifications:
```bash
# Run all 10 XSS category challenge tests
npx playwright test playwright/xss_categories.spec.ts

# Run UI navigation and RBAC browser tests
npx playwright test playwright/basic.spec.ts
```

---

## 11. Resetting Database & Training State

Reset the PostgreSQL database to its initial clean seed state at any time:

### Via PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/reset.ps1
```

### Via POSIX Shell:
```bash
./scripts/reset.sh
```

### Via HTTP API:
```bash
curl -X POST http://127.0.0.1:4000/lab/reset \
  -H "Authorization: Bearer token-ari"
```

---

## 12. Inspecting Logs & Troubleshooting

### Inspecting Container Logs
```bash
# View combined logs across all services
docker compose logs -f

# View backend API logs
docker compose logs -f api

# View PostgreSQL container logs
docker compose logs -f db

# View OOB callback listener logs
docker compose logs -f oob-listener
```

### Common Issues & Solutions

1. **Port Already in Use (`EADDRINUSE`)**:
   - Verify no background process is occupying ports `3000`, `4000`, or `5000`.
   - On Windows: `netstat -ano | findstr :4000` and `taskkill /F /PID <PID>`.
2. **PostgreSQL Container Unhealthy**:
   - Ensure Docker has sufficient memory allocated.
   - Run `docker compose restart db` and check health with `docker compose ps`.
3. **Missing or Insecure Secret Startup Failure**:
   - In production profile (`LAB_PROFILE=production`), `JWT_SECRET` must be set and must not match known default strings.
   - Ensure `JWT_SECRET` is at least 32 characters long.

---

## 13. Safety Boundaries & Local-Only Deployment Policy

- **Loopback Binding**: Services publish exclusively to `127.0.0.1`. Do not bind services to `0.0.0.0` on public host network interfaces.
- **Isolated Database**: Port `5432` is not published to the host and is reachable only by containers on `lab-net`.
- **Restricted OOB Listener**: The OOB listener accepts only predetermined event names (`feedback-submitted`, `blind-probe`, `ticket-created`, `ping`). It does not execute scripts, fetch remote URLs, or log sensitive user data.
- **Outbound Request Protection**: Backend rejects outbound requests to any destination outside loopback or internal lab containers.
- **Upload Hardening**: Uploaded SVG avatars are sanitized with DOMPurify and served with `Content-Security-Policy: default-src 'none'; sandbox` to prevent script execution.

---

## 14. Known Limitations & Outstanding Security Findings

1. **Educational Vulnerabilities**: In `vulnerable` mode, the application deliberately contains exploitable XSS patterns (Category 1 through 10). These are by design for authorized educational purposes and must not be "fixed" in vulnerable mode.
2. **Ephemeral Secret Tokens**: In local training mode when `JWT_SECRET` is left blank, an ephemeral random secret is generated in memory. User login sessions will expire upon server restart.
3. **In-Memory Fallback**: When running unit tests outside of Docker without a configured PostgreSQL database, the app falls back to an in-memory data store. In production or Docker testing, PostgreSQL is strictly required and verified via `/health`.

---

## 15. Reproducing Published Test Evidence

Raw test execution logs and verification evidence are archived in [`docs/test-evidence/`](./docs/test-evidence/):
- `docs/test-evidence/npm-test-vulnerable.log`: Output of `npm test` in vulnerable mode (22/22 passed).
- `docs/test-evidence/playwright-vulnerable.log`: Output of `npm run test:browser` in vulnerable mode (23/23 passed).
- `docs/test-evidence/npm-test-fixed.log`: Output of `npm test` in fixed mode (22/22 passed).
- `docs/test-evidence/playwright-fixed.log`: Output of `npm run test:browser` in fixed mode (23/23 passed).
- `docs/test-evidence/smoke-test-playwright.log`: Output of `smoke_test_playwright.ts` (8/8 checks passed).

To reproduce and re-generate all test evidence locally:
```bash
# 1. Run secret scan
node scripts/secret_scan.js

# 2. Test vulnerable mode
# Set LAB_MODE=vulnerable in .env, then:
docker compose up -d api
powershell -ExecutionPolicy Bypass -File scripts/reset.ps1
npm test
npm run test:browser

# 3. Test fixed mode
# Set LAB_MODE=fixed in .env, then:
docker compose up -d api
powershell -ExecutionPolicy Bypass -File scripts/reset.ps1
npm test
npm run test:browser
```

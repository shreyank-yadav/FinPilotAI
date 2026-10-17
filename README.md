# FinPilot AI

**FinPilot AI — AI-Powered Personal Finance Management System** is a college-project prototype for reviewing personal finances in an India-first workspace. It provides transaction, budget, savings-goal, asset, and liability management; monthly dashboard calculations; a Python analytics service; and an optional, server-configured AI Advisor.

The project has two separate data modes. **Demo Mode** stores synthetic records in browser local storage. **Account Mode** uses authenticated API requests and MongoDB records scoped to the signed-in user. The application does not connect to banks, transfer funds, or place investment orders.

## Features

- Email/password registration, login, session restoration, logout, and profile-name editing.
- India-formatted INR overview with recorded monthly income, expenses, savings rate, budget progress, recent transactions, and net worth when assets/liabilities are recorded.
- Create, edit, and delete transactions, budgets, savings goals, assets, and liabilities; goal contributions update the saved amount.
- Current-month category spending and monthly cash-flow history.
- Forecast and insight views backed by the analytics service for account records; the forecast requires at least three recorded transaction months.
- Optional provider-backed Advisor using relevant authenticated records, deterministic monthly/net-worth calculations, an out-of-scope backend gate, and Markdown-rendered answers.
- JSON export of the active workspace. Backend CSV preview/commit endpoints exist, but CSV import is not available in the browser UI.
- Responsive dark interface, INR formatting, and educational-use notices.

## Architecture

See [System Architecture](docs/ARCHITECTURE.md) for component responsibilities, data flows, entity relationships, security boundaries, Mermaid diagrams, and limitations. The formal requirements are in [Software Requirements Specification](docs/SRS.md).

```text
frontend/   React + TypeScript + Vite dashboard
backend/    Express + TypeScript REST API, auth, MongoDB, Advisor provider adapter
analytics/  FastAPI service for transparent summaries and estimates
docs/       SRS and system architecture
```

The browser calls the backend. The backend accesses MongoDB and calls analytics or the configured LLM provider when needed. Provider credentials remain in server environment configuration.

## Technology stack

| Area | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Recharts, Lucide React, custom safe Markdown renderer |
| Backend | Node.js, Express 4, TypeScript, Mongoose, Zod, bcryptjs, JSON Web Tokens, Helmet, express-rate-limit |
| Database | MongoDB |
| Analytics | Python, FastAPI, Pydantic, Pandas, NumPy; scikit-learn is installed but no trained model is loaded or claimed |
| Tests | Node.js test runner, pytest, MongoDB-backed backend integration tests |

## Prerequisites

- Windows 10/11 with PowerShell.
- Node.js 20 or later and npm.
- Python 3.10 or later with the Windows `py` launcher.
- MongoDB Community Server running locally, or access to a MongoDB deployment.
- A unique, strong `JWT_SECRET` for real account authentication.
- Optional AI provider key to enable live Advisor responses. The app does not include or supply a key.

## Setup on Windows PowerShell

Run commands from the repository root (`FinPilotAI`).

### 1. Install Node dependencies

```powershell
npm install
```

### 2. Configure the backend

Create a local backend environment file from the safe template:

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Generate a JWT secret locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated 64-character value into `JWT_SECRET` in `backend/.env`. Do not paste it into source files, documentation, screenshots, or chat. The backend rejects a missing/short secret and, outside tests, rejects placeholders, whitespace, or values without lowercase, uppercase, numeric, and non-alphanumeric characters.

The example MongoDB URI points to `mongodb://127.0.0.1:27017/finpilot`. Change `MONGODB_URI` only if your MongoDB instance uses a different address/database. Configure `FRONTEND_ORIGIN` to the trusted browser origin when it differs from `http://localhost:5173`.

### 3. Start MongoDB

Install MongoDB Community Server and start its Windows service. Check its status in PowerShell:

```powershell
Get-Service MongoDB
```

If the service is stopped, run PowerShell as Administrator and start it:

```powershell
Start-Service MongoDB
```

For a remote MongoDB deployment, set `MONGODB_URI` in `backend/.env` to its connection string and ensure network access and database credentials are configured there. Never commit `.env` files.

### 4. Set up the analytics service

```powershell
py -3 -m venv analytics/.venv
& .\analytics\.venv\Scripts\python.exe -m pip install -r analytics/requirements.txt
```

`analytics/.env.example` documents the analytics variables, but the FastAPI code does not automatically load `.env` files. For local development, no analytics key is required. If you enable `ANALYTICS_API_KEY`, set the same value in the backend's `backend/.env` and in the analytics process environment before starting it. For example, in the analytics terminal:

```powershell
$env:ANALYTICS_API_KEY = '<same locally generated value as backend/.env>'
```

Do not put a real key in this README or source control.

### 5. Configure the optional AI Advisor

To enable live answers, configure the backend only:

```dotenv
LLM_PROVIDER=google
LLM_MODEL=gemini-2.5-flash
LLM_API_KEY=<your provider key>
```

Keep the key private in `backend/.env`; the frontend does not receive it. Google Gemini is the configured provider format. An OpenAI-compatible provider can be selected with `LLM_PROVIDER=openai`, with optional `LLM_BASE_URL`. Without a valid key, the API returns an unavailable/configuration response; no successful answer is fabricated.

### 6. Start the services

Start MongoDB first. Then open separate PowerShell terminals at the repository root and run these commands:

**Terminal 1 — analytics**

```powershell
& .\analytics\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir analytics --host 127.0.0.1 --port 8000
```

**Terminal 2 — backend**

```powershell
npm run dev:backend
```

`backend/.env` is loaded by the backend's dotenv configuration. The backend listens on port `4000` by default.

**Terminal 3 — frontend**

```powershell
npm run dev:frontend
```

Open <http://localhost:5173>. Health checks are <http://localhost:4000/health> and <http://127.0.0.1:8000/health>. The browser uses `VITE_API_BASE_URL` when provided and otherwise calls `http://localhost:4000`; no frontend `.env.example` is currently provided.

## Tests and production build

From the repository root:

```powershell
npm run test:frontend
npm run test:backend
& .\analytics\.venv\Scripts\python.exe -m pytest analytics/tests
npm run build
```

The root `npm run test:analytics` script is also present and invokes `py -m pytest analytics/tests`; use it when pytest is installed for the Python interpreter selected by the `py` launcher. Backend integration tests connect to `FINPILOT_TEST_MONGODB_URI` if set, otherwise `mongodb://127.0.0.1:27017/finpilot_auth_test`, and drop that test database after running. Use only a disposable test database; never point the test URI at production or valuable data.

`npm run build` runs the frontend build followed by the backend TypeScript build. The frontend script first runs `tsc --noEmit`, then Vite creates the production bundle.

To start the compiled backend locally after a successful build, run `npm --workspace backend start` from the repository root with `backend/.env` configured. To preview the frontend bundle, run `npm --workspace frontend run preview`; Vite serves it locally (default port `4173`). Set `VITE_API_BASE_URL` in the build environment before `npm run build` if the API is not at `http://localhost:4000`. These commands support local preview; production HTTPS, reverse proxy, process supervision, database operations, and hosting configuration are not included in the repository.

## Troubleshooting

- **Authentication reports missing configuration:** Confirm `backend/.env` exists, contains a generated strong `JWT_SECRET`, and restart Express. The example file intentionally leaves the secret blank.
- **MongoDB is unavailable:** Check `Get-Service MongoDB`, start the service if needed, verify `MONGODB_URI`, and check `http://localhost:4000/health`. Demo Mode does not require account persistence.
- **Forecast or insights fail:** Start the analytics service and verify it responds at `http://127.0.0.1:8000/health`. If `ANALYTICS_API_KEY` is set, the backend and analytics process values must match. The Python service does not load its `.env.example` automatically.
- **CORS errors:** Set `FRONTEND_ORIGIN` in `backend/.env` to the exact frontend origin, then restart the backend.
- **Provider unavailable:** The Advisor requires a configured backend `LLM_API_KEY` for live model responses. Check the provider, model, key authorization, and provider quota without placing credentials in frontend files.
- **Port conflict:** Change the backend `PORT` or Uvicorn `--port`; update `VITE_API_BASE_URL` before rebuilding if the browser API URL changes.
- **Vite reports `spawn EPERM` during build on Windows:** Check that the project is in a writable/trusted directory and that endpoint protection/security policy permits Node/esbuild child processes. You can run the frontend type check separately with `npm --workspace frontend exec tsc -- --noEmit`. Do not delete `node_modules` as a first troubleshooting step.

## API overview

All user-specific backend routes require `Authorization: Bearer <JWT>` unless noted. Request bodies are JSON and are validated with Zod.

| Routes | Purpose |
|---|---|
| `GET /health` | Backend/database status; unauthenticated |
| `POST /api/auth/register`, `POST /api/auth/login` | Account registration and login |
| `POST /api/auth/demo` | Demo acknowledgement endpoint |
| `GET /api/profile`, `PATCH /api/profile` | Read profile and update display name |
| `/api/transactions` | List, create, edit, and delete transactions |
| `/api/budgets` | List, create, edit, and delete monthly category budgets |
| `/api/goals` | List, create, edit, delete goals; `POST /:id/contributions` adds to saved amount |
| `/api/assets`, `/api/liabilities` | List, create, edit, and delete account assets/liabilities |
| `GET /api/recurring` | Read stored recurring-payment records |
| `GET /api/dashboard` | Monthly totals, budget progress, net worth totals, recent transactions |
| `GET /api/forecast`, `GET /api/insights`, `GET /api/health-score` | Analytics-backed forecasts/insights and recorded monthly indicators |
| `POST /api/advisor` | Authenticated, rate-limited, topic-restricted AI Advisor |
| `GET /api/export` | Export the authenticated user's profile and financial records |
| `POST /api/import/preview`, `POST /api/import/commit` | Validated import preview and confirmed transaction import; no browser import workflow |

The analytics service exposes `GET /health` and POST routes `/summaries`, `/forecast`, `/categorize`, `/recurring`, `/what-if`, `/emergency-fund`, and `/unusual-spending`. The backend currently calls `/summaries`, `/forecast`, `/recurring`, and `/unusual-spending` as part of implemented flows. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for inputs and behavior.

## Screenshots

Screenshots are not included in the repository yet. Suggested captures for a project submission:

- `[Add screenshot: Overview dashboard in clearly labeled Demo Mode]`
- `[Add screenshot: Transactions and budget progress]`
- `[Add screenshot: Assets, liabilities, and recorded net worth]`
- `[Add screenshot: Advisor answer and out-of-scope response]`

Use synthetic/demo data in submitted screenshots; do not capture secrets or personal financial information.

## Security notes

- Passwords are hashed with bcryptjs (cost factor 12). JWTs expire after 12 hours.
- MongoDB records are queried using the authenticated user's `userId`; tests cover cross-user access attempts.
- The browser stores the account token in local storage. This is convenient for a prototype but is more exposed to successful same-origin script injection than a secure HttpOnly-cookie session.
- The backend uses Helmet, deliberate CORS origins, request validation, and rate limits for authentication and Advisor endpoints. The analytics shared-key check is optional; it is not a replacement for user authentication.
- No encryption-at-rest or end-to-end encryption is implemented by the application. Secure MongoDB configuration, TLS/HTTPS, backups, and production operations remain deployment responsibilities.
- No bank connection, bank credential collection, payment transfer, or investment-order workflow exists.

## Current limitations and future scope

- The AI Advisor requires the user to configure a provider key. Chat history is held in frontend state and is not persisted across reloads.
- Financial scope enforcement uses deterministic topic/intent rules before provider calls. Unusual wording can be refused; this is not a semantic classifier.
- Forecasts are transparent historical baselines, not guaranteed outcomes or trained-model predictions. Analytics reports insufficient-history limitations.
- Category assignment is a keyword baseline; no trained categorization model is loaded.
- CSV import backend endpoints exist, but no CSV selection/preview/confirmation UI is implemented.
- Recurring-payment storage currently has a read endpoint; recurring pattern detection comes from transaction analysis.
- No bank aggregation/provider integration, deployment manifests, CI pipeline, or admin console is included.
- Future work could add authorized data-provider connections, stronger cookie-based sessions, persistent Advisor history, an import UI, model evaluation, and production deployment automation.

## License

No license has been specified in this repository. Add a license file before redistributing the project under explicit terms.

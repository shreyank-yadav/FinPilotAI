# Software Requirements Specification

## FinPilot AI — AI-Powered Personal Finance Management System

| Document field | Value |
|---|---|
| Document version | 1.0 |
| Status | Project specification for implemented prototype |
| Date | 18 October 2026 |
| Prepared by | [Student Name — fill in] |
| Institution / department | [Institution and department — fill in] |
| Course / guide | [Course and project guide — fill in] |
| Project title | FinPilot AI — AI-Powered Personal Finance Management System |

> This specification describes the implementation present in this repository. Bracketed title-page fields are intentionally left for the student to complete. Unimplemented items are marked as limitations or future scope.

## Abstract

FinPilot AI is an India-first personal finance management prototype. It helps users record income and expenses, create monthly category budgets and savings goals, maintain asset and liability records, and review current financial indicators. The system includes a React-based dashboard, a TypeScript REST API, MongoDB persistence for authenticated accounts, and a Python analytics service that provides transparent summaries and estimates. An optional AI Advisor can answer supported questions using a minimum relevant subset of the signed-in user's records. Synthetic Demo Mode is separate from account data. The system does not connect to a bank, move money, or place investment orders.

## 1. Introduction

### 1.1 Purpose

This SRS defines the functional and quality requirements, user roles, interfaces, data constraints, and acceptance criteria for FinPilot AI. It is intended for implementation review, college project evaluation, testing, and future maintenance.

### 1.2 Intended audience

- Students and project evaluators.
- Developers maintaining the frontend, backend, or analytics service.
- Testers reviewing authentication, financial calculations, and account isolation.
- Technical interviewers seeking a concise explanation of system scope and limitations.

### 1.3 Product perspective

FinPilot AI is a standalone web application made of a browser frontend, an Express API, MongoDB, and a Python analytics API. The backend may call an external LLM provider when the Advisor is configured. The frontend does not connect directly to MongoDB, analytics, or the LLM provider.

### 1.4 Definitions

| Term | Meaning |
|---|---|
| Account Mode | Signed-in mode whose financial records are stored in MongoDB and scoped to the authenticated user. |
| Demo Mode | Synthetic sample workspace stored separately in browser local storage. |
| INR | Indian rupee, the current product currency and dashboard display currency. |
| Net worth | Sum of recorded asset values minus sum of recorded liability values. |
| Analytics service | FastAPI service that performs transparent summaries and baseline calculations from request payloads. |
| Advisor | Optional LLM-backed interface that receives an in-scope question and relevant financial context selected by the backend. |
| In-scope question | A personal-finance or FinPilot feature/workflow question permitted by the backend's deterministic phrase/intent matcher. |

## 2. Problem statement and proposed solution

### 2.1 Problem statement

Personal financial information is often split across transaction lists, category budgets, goals, and balance notes. Without a consolidated view, users may find it difficult to compare monthly income with spending, notice budget progress, understand net worth, or estimate cash flow. A conversational interface can also appear authoritative while lacking access to the user's actual records, creating a risk of fabricated personal financial figures.

### 2.2 Proposed solution

FinPilot AI provides a single dashboard for explicitly recorded financial data, supported CRUD workflows, deterministic financial totals, and transparent analytics estimates. Account records are accessed through authenticated owner-scoped API routes. The Advisor's backend retrieves only relevant user-owned records, computes key figures deterministically, and rejects unrelated requests before database retrieval or provider calls. The demo workspace supports exploration without a bank connection or MongoDB writes.

## 3. Project objectives and scope

### 3.1 Objectives

1. Provide a clear monthly view of recorded income, spending, savings rate, budget progress, and net worth.
2. Support create, read, update, and delete operations for transactions, budgets, savings goals, assets, and liabilities.
3. Keep synthetic Demo Mode records separate from authenticated MongoDB records.
4. Provide transparent, limitation-aware forecasting and spending analysis through the analytics service.
5. Offer optional AI explanations grounded in relevant user-authorized records while restricting requests to the product's financial and feature scope.
6. Provide authenticated profile editing and data export.

### 3.2 In scope

- Email/password registration and login, token-based session restoration, and logout.
- INR-oriented personal finance records and dashboard views.
- Transactions, budgets, goals and contributions, assets, liabilities, and recorded net worth.
- Forecast, health indicators, and insights available through existing backend and analytics routes.
- Optional Gemini or OpenAI-compatible Advisor provider integration.
- Profile display-name editing and JSON data export.
- Validated backend CSV preview/commit endpoints (API only).
- Local development on Windows PowerShell.

### 3.3 Out of scope

- Bank account linking, open-banking/AA integration, credential collection, bank SMS scraping, or automatic transaction synchronization.
- Payments, fund transfers, bill payment, investment trading, or order placement.
- Professional financial, tax, legal, or investment advice.
- A trained or personalized machine-learning model, vector search, embeddings, or RAG.
- CSV upload and confirmation controls in the current browser UI.
- Persistent Advisor conversation history, an administrator console, and production deployment automation.

## 4. Functional requirements

“Shall” statements describe required observable behavior for the current product scope. Requirements marked API-only identify backend capability that is not exposed as a complete user-interface workflow.

### 4.1 Authentication and workspace mode

| ID | Requirement |
|---|---|
| FR-01 | The system shall allow a visitor to create an account with a name, email address, and password that meet server validation rules. |
| FR-02 | The system shall hash passwords before storage and shall not return password hashes in profile or export responses. |
| FR-03 | The system shall allow a registered user to log in with valid credentials and return a signed, expiring JWT. |
| FR-04 | The system shall reject invalid credentials and missing/invalid authentication configuration with an appropriate safe error response. |
| FR-05 | The frontend shall restore an existing session after browser refresh by validating the stored token through the profile API, and shall provide logout by removing the session from browser storage. |
| FR-06 | The system shall keep Demo Mode records in a distinct browser storage store and shall not write demo changes to MongoDB. |
| FR-07 | Every private account route shall require a valid token and restrict data access to the authenticated user. |

### 4.2 Transactions and budgets

| ID | Requirement |
|---|---|
| FR-08 | An authenticated user shall be able to list, create, edit, and delete income/expense transactions with description, amount, type, category, and date. |
| FR-09 | The system shall validate transaction fields and reject invalid amounts, types, dates, and text lengths. |
| FR-10 | An authenticated user shall be able to list, create, edit, and delete monthly category budgets. |
| FR-11 | The system shall calculate budget spending from expense transactions in the relevant month, matching the category, and present used/remaining progress. |
| FR-12 | A user shall be able to search/filter the transaction list using the implemented transaction-page search control. |

### 4.3 Savings goals

| ID | Requirement |
|---|---|
| FR-13 | An authenticated user shall be able to list, create, edit, and delete savings goals with a name, target, saved amount, and optional target date. |
| FR-14 | An authenticated user shall be able to add a positive contribution to a goal; the stored saved amount shall increase by that contribution. |
| FR-15 | The system shall reject invalid goal amounts and prevent an update or contribution from affecting another user's goal. |

### 4.4 Assets, liabilities, and financial calculations

| ID | Requirement |
|---|---|
| FR-16 | An authenticated user shall be able to list, create, edit, and delete assets in supported categories: bank savings, cash, investments, property, and vehicles. |
| FR-17 | An authenticated user shall be able to list, create, edit, and delete liabilities in supported categories: home loans, personal loans, and credit-card debt. |
| FR-18 | The system shall calculate recorded net worth as total recorded assets minus total recorded liabilities. |
| FR-19 | The Overview shall show an empty/not-recorded state when an authenticated account has no asset or liability records rather than substituting invented balances. |
| FR-20 | The dashboard shall calculate current-month income, expense spending, net cash flow, savings rate when income exists, category spending, and budget progress from the applicable workspace records. |
| FR-21 | Financial amounts shall be displayed in INR with Indian number formatting. Month-based account calculations shall use Asia/Kolkata calendar boundaries where implemented by the backend. |

### 4.5 Forecast, insights, and analytics

| ID | Requirement |
|---|---|
| FR-22 | The system shall provide a cash-flow forecast based on recorded monthly income and spending history when the account has sufficient recorded history. |
| FR-23 | The forecast shall identify its baseline method, uncertainty, assumptions, and data limitations; it shall not be presented as guaranteed. |
| FR-24 | The system shall provide monthly summaries, recurring-payment pattern estimates, unusual-spending review prompts, and current budget/goal insights where the relevant service is available. |
| FR-25 | The system shall state when records or history are insufficient and shall not describe a statistical unusual-spending prompt as fraud detection. |
| FR-26 | The analytics service shall validate request data and expose the implemented summary, forecast, category, recurring, what-if, emergency-fund, unusual-spending, and health endpoints. |

### 4.6 AI Advisor

| ID | Requirement |
|---|---|
| FR-27 | The authenticated Advisor shall accept in-scope questions about the user's supported financial records or FinPilot AI features. |
| FR-28 | The backend shall apply a deterministic topic/intent scope gate before querying financial records or calling an LLM provider. Clearly unrelated or unsupported questions shall receive the fixed product-scope response. |
| FR-29 | For an accepted request, the backend shall retrieve only relevant records belonging to the authenticated user and shall calculate financial totals deterministically where supported. |
| FR-30 | The Advisor shall not invent personal financial values; its prompt shall distinguish recorded facts from estimates and educational information and treat transaction descriptions as untrusted input. |
| FR-31 | The Advisor shall support configured Gemini and OpenAI-compatible provider formats, return a clear unavailable response without a configured key, and map timeouts/provider errors to safe responses. |
| FR-32 | The frontend shall render assistant Markdown including headings, emphasis, paragraphs, line breaks, lists, code, and tables using safe React rendering. |
| FR-33 | The system shall rate-limit Advisor requests. The current backend limit is 12 requests per minute per limiter key. |

### 4.7 Profile, export, and import endpoints

| ID | Requirement |
|---|---|
| FR-34 | A signed-in user shall be able to read the current profile and edit the profile display name subject to length validation. |
| FR-35 | A user shall be able to export data for the currently active workspace; account export shall include only records owned by the authenticated account. |
| FR-36 | The backend shall provide validated CSV transaction preview and confirmed-commit endpoints with duplicate detection. This requirement is API-only because the browser import workflow is not implemented. |
| FR-37 | Settings shall identify the unavailable browser CSV import workflow rather than presenting a nonfunctional import control. |

## 5. Non-functional requirements

| ID | Quality area | Requirement |
|---|---|---|
| NFR-01 | Security | Passwords shall be bcrypt-hashed; private routes shall require a valid signed token; ownership shall be enforced on every user-specific read or mutation. |
| NFR-02 | Security | Production authentication shall require an explicitly configured strong `JWT_SECRET`; no hard-coded production fallback shall be used. Secrets shall remain server-side and out of committed source files. |
| NFR-03 | Security | The backend shall validate JSON inputs, apply deliberate CORS and Helmet headers, rate-limit sensitive endpoints, and avoid logging credentials, tokens, API keys, or financial request bodies. |
| NFR-04 | Privacy | Demo data and account data shall remain separated. Analytics and LLM requests shall receive only the fields needed for the requested operation. |
| NFR-05 | Reliability | If MongoDB, analytics, or the configured provider is unavailable, the affected operation shall return a useful safe error or limitation without exposing internal secrets. |
| NFR-06 | Accuracy | Personal financial facts shall be calculated from stored/selected records. Estimates shall state their assumptions; missing values/history shall not be replaced with fabricated data. |
| NFR-07 | Usability | The responsive interface shall retain the dark theme, provide INR/Indian date presentation, and expose useful loading, error, validation, and empty states for implemented workflows. |
| NFR-08 | Maintainability | Frontend, API, and analytics responsibilities shall remain separated; API contracts shall use JSON and explicit validation schemas. |
| NFR-09 | Performance | For typical college-demo datasets on a local development machine, ordinary dashboard and CRUD interactions should remain responsive. No measured latency benchmark or production SLA is currently defined. |
| NFR-10 | Portability | The documented development workflow shall run on Windows with PowerShell, Node.js/npm, Python, and MongoDB. |
| NFR-11 | Accessibility | Interactive controls should use labels, semantic buttons/forms, and visible status/error text so assistive technologies can identify their purpose and state. |

## 6. User roles and use cases

### 6.1 Roles

| Role | Permissions and constraints |
|---|---|
| Visitor | Can view landing/authentication pages and choose to enter the synthetic Demo Mode. No account records are available until authentication. |
| Demo user | Can explore synthetic records and local demo workflows. Changes are saved only in that browser's separate demo store; demo values do not represent a linked account. |
| Registered user | Can manage and export only their own MongoDB-backed finance records and request supported Advisor responses after authentication. |
| External provider/service | Gemini/OpenAI-compatible provider and analytics API are system integrations, not interactive application roles. They receive only the requests sent by the backend. |

No administrator role or administrative interface is implemented.

### 6.2 Use cases

#### UC-01 — Register and sign in

- **Actor:** Visitor.
- **Preconditions:** MongoDB is reachable; a valid `JWT_SECRET` is configured.
- **Main flow:** User submits registration details; the backend validates input, hashes the password, stores the user, and returns a JWT/profile; the frontend saves the session and loads account data.
- **Alternate flow:** Invalid fields, duplicate email, missing MongoDB, or invalid auth configuration produces a safe error and no account session.
- **Postcondition:** An authenticated account session is active in the browser.

#### UC-02 — Review or update a transaction

- **Actor:** Demo user or registered user.
- **Preconditions:** The selected workspace is active; account mode has a valid session.
- **Main flow:** User creates, edits, filters, or deletes a transaction. Demo mode updates its browser store; account mode calls the owner-scoped API. Overview values refresh from that workspace's records.
- **Postcondition:** The transaction is persisted in the active data store and does not cross workspace/user boundaries.

#### UC-03 — Manage budgets and goals

- **Actor:** Demo user or registered user.
- **Main flow:** User creates/edits/deletes a category budget or goal. Budget progress is based on same-period expense transactions. A goal contribution increases its saved amount.
- **Postcondition:** Updated values display in the active workspace and survive refresh according to its storage mode.

#### UC-04 — Record an asset or liability

- **Actor:** Demo user or registered user.
- **Main flow:** User selects a supported kind and enters a positive value. The system stores it in the active workspace and recomputes recorded totals.
- **Postcondition:** When balance records exist, net worth is displayed as recorded assets less recorded liabilities. When none exist in the account, the UI shows the not-recorded empty state.

#### UC-05 — Review forecast or insights

- **Actor:** Registered user (account analysis); demo user (synthetic/demo view where offered).
- **Preconditions:** Analytics service is available for analytics-backed account results.
- **Main flow:** Backend selects the authenticated user's transactions, submits the required bounded payload to analytics, and returns results with limitations. Insufficient history is represented explicitly.
- **Alternate flow:** Analytics unavailable returns an error; insufficient records return a limitation rather than a fabricated forecast.

#### UC-06 — Ask the Advisor

- **Actor:** Registered user.
- **Preconditions:** Valid session; provider key configured for a live AI response.
- **Main flow:** Backend authenticates and validates the question, applies rate limit and topic gate, selects only relevant owner-scoped records, computes supported totals, then either returns a deterministic top-spending answer or calls the configured provider. The frontend renders the answer as Markdown.
- **Alternate flow:** Out-of-scope question returns the fixed refusal before data retrieval/provider call; missing provider key or provider failure returns a safe configuration/error state.
- **Postcondition:** No provider key or another user's data is exposed; chat remains in frontend memory and is not persisted.

#### UC-07 — Edit profile and export data

- **Actor:** Registered user (profile); demo or registered user (active workspace export).
- **Main flow:** Signed-in user edits their name through `PATCH /api/profile` or requests JSON export. Backend export filters each financial collection by the authenticated user ID.
- **Postcondition:** The profile name is updated or an export of only the active workspace is generated.

## 7. Functional workflows

### 7.1 Account request

1. Browser sends credentials to the Express API.
2. Express validates request data and verifies environment/database readiness.
3. For registration, Express bcrypt-hashes the password and saves the user; for login, it compares hashes.
4. Express signs a 12-hour JWT using the configured secret.
5. Browser stores the token in local storage and uses it in the `Authorization` header for account requests.
6. The backend re-verifies the token and resolves the user on each protected request.

### 7.2 Financial-record update

1. User enters data in the frontend form; client-side validation supplies immediate feedback.
2. Account Mode sends JSON to the relevant API route; Demo Mode writes to its separate local storage store.
3. Express applies Zod validation and either writes the document with authenticated `userId` or returns a safe validation/error result.
4. The active workspace refreshes and recalculates affected dashboard or progress values.

### 7.3 Advisor request

1. Browser submits an authenticated question to `POST /api/advisor`.
2. Middleware authenticates the user and rate limiting applies.
3. Backend validates question length and checks deterministic scope before any record query.
4. An unsupported question receives the fixed scope response without MongoDB retrieval or provider request.
5. A supported request retrieves only relevant records using authenticated user ID and period filters.
6. Backend computes deterministic aggregates where appropriate. A current-month top-category question is answered without calling an LLM.
7. Otherwise the configured provider receives the question and minimum selected context; backend validates provider output and maps errors.
8. Frontend renders assistant text as safe Markdown. History remains ephemeral in browser memory.

## 8. External interface requirements

### 8.1 User interface

The UI is a React single-page application optimized for desktop and mobile browser widths. It provides landing/authentication, Overview, Transactions, Budgets, Goals, Assets & Liabilities, Forecast, Insights, AI Advisor, and Settings/profile views. Currency display is INR. Demo mode is labeled; account mode shows record-based values.

### 8.2 Backend API

The backend uses JSON REST over HTTP in local development. Private endpoints use a bearer JWT. Implemented route groups are:

| Route group | Methods and purpose |
|---|---|
| `/health` | `GET`; backend and MongoDB connection status |
| `/api/auth/register`, `/api/auth/login`, `/api/auth/demo` | `POST`; registration, login, demo acknowledgement |
| `/api/profile` | `GET`, `PATCH`; profile read and name update |
| `/api/transactions` and `/api/transactions/:id` | `GET`, `POST`, `PATCH`, `DELETE`; user transactions |
| `/api/budgets` and `/api/budgets/:id` | `GET`, `POST`, `PATCH`, `DELETE`; monthly budgets |
| `/api/goals`, `/api/goals/:id`, `/api/goals/:id/contributions` | CRUD, plus contribution `POST` |
| `/api/assets`, `/api/assets/:id`; `/api/liabilities`, `/api/liabilities/:id` | CRUD |
| `/api/recurring` | `GET`; stored recurring-payment records |
| `/api/dashboard` | `GET`; monthly overview data |
| `/api/forecast`, `/api/insights`, `/api/health-score` | `GET`; forecast/insights/recorded indicators |
| `/api/advisor` | `POST`; authenticated, rate-limited and scope-restricted question |
| `/api/export` | `GET`; current account export |
| `/api/import/preview`, `/api/import/commit` | `POST`; API-only validated CSV-derived transaction data preview and confirmed write |

Express JSON request body limit is 1 MB. Validation errors return HTTP 400, unauthorized requests return HTTP 401, and cross-owner record operations return not found.

### 8.3 Analytics API

FastAPI exposes `GET /health` and `POST /summaries`, `/forecast`, `/categorize`, `/recurring`, `/what-if`, `/emergency-fund`, and `/unusual-spending`. Pydantic validates requests. Optional `ANALYTICS_API_KEY` protection uses the `x-api-key` header; if no key is configured, the service accepts calls without a key.

### 8.4 LLM provider interface

The backend adapter supports Google Gemini `generateContent` and an OpenAI-compatible `chat/completions` endpoint. The provider name, model, optional base URL, and key are configured on the backend. No LLM key is included in the repository template.

## 9. Technology and software requirements

| Layer | Implemented technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Recharts, Lucide React, custom Markdown renderer |
| Backend | Node.js, Express 4, TypeScript, Mongoose, Zod, bcryptjs, jsonwebtoken, Helmet, express-rate-limit, dotenv |
| Persistence | MongoDB |
| Analytics | Python, FastAPI, Pydantic, Pandas, NumPy; scikit-learn is a declared dependency but no trained model is loaded |
| Frontend/backend test tools | Node.js built-in test runner and TypeScript build |
| Analytics test tools | pytest and FastAPI TestClient/httpx |
| Supported local setup | Windows PowerShell, Node.js 20+, npm, Python 3.10+, MongoDB |

The root npm workspace contains the frontend and backend. The analytics service has a separate Python requirements file and is launched independently.

## 10. Data requirements and constraints

### 10.1 Data ownership

- Account financial documents contain the authenticated user's Mongo ObjectId in `userId`.
- Demo records are held separately in browser local storage and are never written to MongoDB.
- The analytics service receives request-scoped payloads and does not connect to MongoDB.
- Account export includes profile and financial document data filtered by the authenticated user.

### 10.2 Field and validation constraints

| Data | Current constraints |
|---|---|
| User name | Required; trimmed; 1–80 characters |
| Email | Valid email; maximum 254 characters; lowercased for account lookup; unique MongoDB index |
| Password | 8–100 characters at API validation; bcrypt hash stored; JWT secret separately requires at least 32 characters and production strength checks |
| Transaction | Description 1–160 chars; amount positive and at most 1,000,000,000; type `income` or `expense`; category 1–60 chars; date parsed as a date; optional merchant up to 100 chars |
| Budget | Category 1–60 chars; positive monthly limit up to 1,000,000,000 |
| Goal | Name 1–100 chars; positive target up to 1,000,000,000; saved amount nonnegative and at most 1,000,000,000; optional target date |
| Asset | Name 1–100 chars; positive value up to 1,000,000,000,000; kind is bank-savings, cash, investment, property, or vehicle |
| Liability | Name 1–100 chars; positive value up to 1,000,000,000,000; kind is home-loan, personal-loan, or credit-card |
| Advisor question | Trimmed; 2–1,200 characters; authenticated; scope-gated and rate-limited |
| Analytics transaction | Positive amount up to 1,000,000,000; type income/expense; category 1–60 chars; description 1–160 chars; date string validated/parsed by calculation logic |

All currency figures are treated as INR in current frontend/dashboard flows. Multi-currency conversion, exchange rates, tax treatment, and financial-account reconciliation are not implemented.

### 10.3 Storage and retention

The application does not define an automated retention or backup policy. Account data remains in MongoDB until removed through available routes or database administration. Demo data remains in the current browser's local storage until cleared by the user/browser. Advisor messages are not stored by the application backend.

## 11. Assumptions, limitations, and future scope

### 11.1 Assumptions

- A user enters accurate records or uses synthetic demo data; no bank feed validates them.
- MongoDB, API ports, CORS origin, and service environment variables are correctly configured by the operator.
- A configured external LLM provider may process the question and selected financial context under its own service terms.
- INR and India calendar behavior are the current supported product defaults.

### 11.2 Current limitations

- No real financial institution connection, bank credential collection, payment execution, or investment trading.
- Session token is stored in browser local storage; HttpOnly cookie sessions and CSRF protections are not implemented.
- The application does not implement encryption at rest or end-to-end encryption.
- Advisor scope is a deterministic phrase/intent matcher; uncommon valid financial phrasing may be denied.
- The Advisor provider is optional; without a key, live model answers are unavailable. Chat history is not persisted.
- Analytics methods are transparent baseline/rule calculations. No trained model is loaded; forecasts are not guaranteed.
- CSV import is available as backend endpoints only, without a frontend upload/preview/confirmation flow.
- The `Recurring` collection has a read endpoint; recurring payment pattern insights are inferred separately from transactions.
- No deployment manifests, CI pipeline, admin console, formal license, or production service-level objective is included.

### 11.3 Future scope

- Add an authorized data-provider integration with user consent, scoped token storage, and reconciliation controls.
- Build an in-browser CSV import workflow with robust parsing, preview, error reporting, and explicit confirmation.
- Move session management to secure HttpOnly cookies and add CSRF/session rotation/revocation controls.
- Persist chat history with explicit retention controls and maintainable user deletion/export behavior.
- Evaluate analytics quality on representative data and add opt-in trained models only with documented validation and limitations.
- Add localization, configurable currencies, accessibility review, CI automation, deployment manifests, observability, backup/restore procedures, and performance benchmarks.

## 12. Acceptance criteria

| ID | Acceptance criterion |
|---|---|
| AC-01 | With MongoDB and a valid `JWT_SECRET`, registration/login issue a session; invalid credentials are rejected; session restoration and logout work. |
| AC-02 | Requests without a valid account token cannot access private records; another user cannot read, edit, or delete the first user's records. |
| AC-03 | Transaction, budget, goal, asset, and liability CRUD updates only the active user/workspace and validates input. |
| AC-04 | Goal contributions increase the saved amount by the submitted contribution; goal edits and deletes persist. |
| AC-05 | Monthly income, expense, category, savings-rate, and budget calculations match the selected workspace's dated records and India month boundaries. |
| AC-06 | Net worth equals recorded asset total minus recorded liability total; an account with no records shows the not-recorded state instead of invented balances. |
| AC-07 | When transaction history is insufficient, the forecast API/UI exposes the limitation; sufficient history uses the analytics baseline and states that it is an estimate. |
| AC-08 | In-scope Advisor requests retrieve only authenticated-user data; deterministic top-spending output agrees with current-month expense-category totals. |
| AC-09 | Out-of-scope Advisor requests return the fixed scope message before database financial retrieval and before any LLM-provider call. |
| AC-10 | A missing AI provider key produces a clear unavailable response; a provider error does not expose a secret or provider response body. |
| AC-11 | Advisor Markdown displays semantic headings, emphasis, paragraphs, lists, line breaks, and safe code/table blocks without rendering raw HTML. |
| AC-12 | Account JSON export contains only that user's data; the backend import endpoint requires validated rows and explicit confirmation before committing. |
| AC-13 | Demo Mode changes remain in browser storage across refresh and do not appear in MongoDB account collections. |

## 13. References within the repository

- [Project README and PowerShell setup](../README.md)
- [Backend API and models](../backend/src/server.ts)
- [Advisor financial calculations](../backend/src/advisorFinance.ts)
- [Advisor scope matcher](../backend/src/advisorScope.ts)
- [Analytics service](../analytics/app/main.py)
- [Backend tests](../backend/src/server.test.ts)
- [Analytics tests](../analytics/tests/test_analytics.py)

## License

No license has been specified in this repository. A license must be selected and added separately if redistribution terms are required.

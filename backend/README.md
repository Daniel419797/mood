# Mood Tracker Backend

REST API for the MindfulMorsel mood and eating tracker.

## What the backend owns

- Email/password registration and login
- Google sign-in
- Access-token authentication
- Rotating HttpOnly refresh sessions
- Profile name changes
- Password changes for password-based accounts
- Account deletion
- Mood log create/list/update/delete
- Eating log create/list/update/delete
- Server-side record ownership
- Dashboard aggregation
- Behavioral pattern analysis

Behavioral analysis runs on the server so every client receives the same calculation and the browser no longer has to download an arbitrary subset of private logs just to calculate insights.

## Behavioral analytics

The analytics engine now has four complementary layers.

### 1. Binary repeated-pattern analysis

Daily trigger/control comparisons still cover relationships such as high stress versus junk food, short sleep versus low mood, workload versus stress, skipped meals, large portions, and night eating.

For each analyzable relationship the service reports pattern consistency, trigger and comparison outcome rates, signed rate difference, a 95% rate-difference confidence interval, phi association strength, and a two-sided Fisher exact-test p-value. The categorical-pattern family uses conservative multiplicity correction before strong evidence is assigned.

### 2. Continuous-variable analysis

The engine keeps the original numeric information where possible instead of reducing every variable to a threshold. It calculates Pearson and Spearman correlations for continuous day-level measures such as mood, stress, energy, sleep hours, workload level, hunger, food-quality share, and night-eating share.

Each Pearson estimate includes a 95% Fisher-z confidence interval. P-values inside the continuous-correlation family are controlled using Benjamini-Hochberg false-discovery-rate adjustment.

### 3. Confounder-adjusted multivariable models

Multiple linear regression estimates adjusted same-day associations for mood, stress, and energy while holding other recorded variables constant. Linear-model uncertainty uses HC3 heteroskedasticity-robust standard errors, 95% confidence intervals, FDR-adjusted coefficient p-values, standardized coefficients, model fit metrics, and variance-inflation factors.

A multivariable logistic model estimates the odds of a junk-food day while adjusting for stress, mood, sleep, and workload. It reports odds ratios, 95% confidence intervals, adjusted p-values, convergence state, pseudo-R², and collinearity diagnostics.

### 4. Lagged analysis

The service evaluates one-calendar-day temporal relationships, including sleep to next-day mood/stress/energy, stress to next-day mood/food choice, workload to next-day mood/stress, food choice to next-day mood, and night eating to next-day energy.

Lagged results use Pearson/Spearman estimates, 95% confidence intervals, and FDR adjustment. Temporal ordering improves interpretation but still does not establish causality.

### Inference safeguards

The API returns an inference-quality report containing tracked-day coverage, paired-data coverage, model warnings, multiplicity method, uncertainty method, and explicit limitations. It labels analyses as limited, exploratory, or research-oriented based on data sufficiency and stability.

The system never labels itself clinically validated. Clinical-grade validity cannot be created by statistical code alone; it requires external validation, protocol review, and prospective evidence.

The user-configurable threshold is a pattern consistency display threshold, not a statistical-significance threshold. Below-threshold relationships can still appear as emerging patterns rather than being silently hidden. After seven distinct tracked days, continuous estimates may be surfaced as clearly labeled preliminary early signals even when the sample is still too small for emerging/strong evidence labels.

## Stack

- Node.js 24
- Express 5
- TypeScript
- PostgreSQL
- Prisma ORM
- Zod
- bcrypt
- JWT access tokens

## Local setup

1. Copy backend/.env.example to backend/.env.
2. Run npm install.
3. Run npm run prisma:deploy.
4. Run npm run dev.

Set the frontend NEXT_PUBLIC_API_URL to http://localhost:4000/api/v1 for local development. The backend defaults to port 4000.

## API used by the frontend

Public/session routes:

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/oauth/google?redirect=<frontend-origin>
- GET /api/v1/auth/oauth/google/callback
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

Authenticated routes:

- GET /api/v1/auth/me
- PATCH /api/v1/auth/me
- DELETE /api/v1/auth/me
- GET /api/v1/moods
- POST /api/v1/moods
- PATCH /api/v1/moods/:id
- DELETE /api/v1/moods/:id
- GET /api/v1/eating
- POST /api/v1/eating
- PATCH /api/v1/eating/:id
- DELETE /api/v1/eating/:id
- GET /api/v1/analytics/insights?range=30d&threshold=60
- GET /api/v1/analytics/dashboard?range=30d&threshold=60

Analytics ranges are 7d, 30d, or all. The threshold is an integer from 40 to 95.

Operational routes:

- GET /health
- GET /ready

Protected API requests use Authorization: Bearer <access-token>. Refresh tokens are stored only in an HttpOnly cookie and are never returned to frontend JavaScript.

## Google OAuth

Configure the Google OAuth web client to redirect to http://localhost:4000/api/v1/auth/oauth/google/callback locally and the public backend HTTPS callback in production. Set PUBLIC_API_URL, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET, and include the frontend origin in CORS_ORIGIN.

## Production cookie settings

For a Vercel frontend and a backend hosted on a different site/domain, use NODE_ENV=production, COOKIE_SECURE=true, COOKIE_SAME_SITE=none, and TRUST_PROXY=true. For same-site subdomains, use the strictest SameSite value that still supports the deployment topology.

## Verification

Run npm run typecheck, npm test, and npm run build from the backend directory.

## Food-category compatibility

The client-facing food categories are `Healthy`, `Junk`, `Neutral`, and `Skipped`.

The historical database enum still contains `Sugary` so old records remain readable without a destructive enum migration. New API writes reject `Sugary`, and dashboard/analytics output normalizes any legacy `Sugary` row into `Junk`.

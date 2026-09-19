# MindfulMorsel

MindfulMorsel is a full-stack mood and eating-pattern tracker designed to help users understand relationships between emotional state, sleep, stress, energy, workload, hunger, and eating behaviour.

The project goes beyond simple logging. It combines descriptive dashboard analytics with a server-side statistical inference engine that can surface repeated patterns, continuous correlations, adjusted multivariable relationships, and one-day lagged effects while explicitly avoiding causal or clinical claims that the data cannot support.

> MindfulMorsel is an observational self-awareness tool. It is not clinically validated, does not diagnose medical or mental-health conditions, and does not establish causation.

## Core capabilities

### Mood and behaviour tracking

Users can record:

- mood score and mood label;
- stress level;
- energy level;
- sleep duration;
- workload;
- notes;
- meal type;
- food category;
- portion rating;
- hunger before eating;
- time of day;
- meal description.

All user records are stored off-chain in PostgreSQL and are scoped to the authenticated user.

### Dashboard

The dashboard supports 7-day, 30-day, and all-time ranges and provides:

- total mood and eating logs;
- tracked-day count;
- most common mood;
- most common food category;
- daily mood-score trend;
- daily stress trend;
- eating-frequency chart;
- meals grouped by stress level;
- top behavioural insights.

The dashboard data is calculated on the backend from the complete requested range rather than from an arbitrary client-side sample.

### Behavioural insights

The backend analytics engine has four complementary layers.

#### 1. Binary trigger/control analysis

Repeated behavioural patterns are compared against non-trigger days rather than using raw overlap percentages alone.

Examples include:

- high stress vs junk food;
- short sleep vs low mood;
- short sleep vs high stress;
- high workload vs stress;
- high workload vs mood;
- stress vs energy;
- low energy vs food choice;
- low mood vs food choice;
- stress vs skipped meals;
- stress vs large/binge portions;
- night eating vs junk food;
- healthy-meal days vs mood.

For eligible patterns, the engine calculates:

- trigger outcome rate;
- comparison outcome rate;
- signed rate difference;
- 95% rate-difference confidence interval;
- Phi association strength;
- two-sided Fisher exact-test p-value;
- multiple-testing correction;
- pattern consistency;
- evidence classification.

The user's threshold setting is a **pattern-consistency display threshold**, not a statistical-significance threshold. After 7 distinct tracked days, preliminary continuous signals can be shown even when no categorical pattern is strong enough to pass the display filter.

#### 2. Continuous-variable analysis

Where numeric information is available, the engine preserves it instead of reducing everything to binary thresholds.

It calculates:

- Pearson correlation;
- Spearman rank correlation;
- Fisher-z 95% confidence intervals;
- raw p-values;
- Benjamini-Hochberg false-discovery-rate adjusted p-values.

Continuous analyses include relationships among mood, stress, sleep, energy, workload, hunger, meal-quality share, and night-eating share.

#### 3. Confounder-adjusted multivariable models

MindfulMorsel uses multivariable models to estimate associations while holding other recorded variables constant.

Linear models are currently used for outcomes such as:

- mood;
- stress;
- energy.

They report:

- coefficient estimates;
- standardized coefficients;
- HC3 heteroskedasticity-robust standard errors;
- 95% confidence intervals;
- FDR-adjusted p-values;
- variance-inflation factors;
- R²;
- adjusted R²;
- RMSE;
- model warnings.

A multivariable logistic model also estimates the odds of a junk-food day while adjusting simultaneously for stress, mood, sleep, and workload.

It reports:

- adjusted odds ratios;
- 95% odds-ratio confidence intervals;
- FDR-adjusted p-values;
- convergence status;
- pseudo-R²;
- VIF diagnostics;
- sample-quality warnings.

#### 4. One-day lagged analysis

The engine also evaluates consecutive-day relationships such as:

- sleep → next-day mood;
- sleep → next-day stress;
- sleep → next-day energy;
- stress → next-day mood;
- stress → next-day food choice;
- workload → next-day stress;
- workload → next-day mood;
- food choice → next-day mood;
- night eating → next-day energy.

Lagged results include Pearson and Spearman estimates, confidence intervals, and FDR-adjusted significance testing.

Temporal ordering can strengthen interpretation, but it still does not prove causation.

## Evidence and inference safeguards

The API returns an inference-quality report alongside advanced analytics.

It includes:

- number of tracked days;
- number of complete mood days;
- number of paired mood/eating days;
- number of continuous tests;
- number of lagged tests;
- number of regression models;
- multiplicity-control method;
- regression uncertainty method;
- confidence level;
- model warnings;
- methodological limitations.

Analysis may be described internally as:

- `limited`;
- `exploratory`;
- `research-oriented`.

The API always reports:

```text
clinicalValidated: false
```

Clinical validity requires external protocol design, prospective validation, expert review, and evidence outside the software implementation itself.

## Architecture

```text
Browser
  |
  v
Next.js frontend
  |
  | HTTPS / JSON
  v
Express API
  |
  +--> Authentication and session management
  |
  +--> Mood and eating CRUD
  |
  +--> Dashboard aggregation
  |
  +--> Behavioural analytics
  |      |
  |      +--> Binary trigger/control analysis
  |      +--> Pearson / Spearman correlation
  |      +--> Confidence intervals
  |      +--> Linear regression
  |      +--> Logistic regression
  |      +--> Confounder adjustment
  |      +--> One-day lagged analysis
  |      +--> Multiple-testing correction
  |
  v
PostgreSQL
```

The frontend consumes the analytics API. Statistical inference is not duplicated in the browser.

## Technology stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn-style UI components
- Recharts
- React Hook Form
- Zod
- Axios
- date-fns
- Lucide icons

### Backend

- Node.js 24
- Express 5
- TypeScript
- PostgreSQL
- Prisma 7
- Zod
- bcryptjs
- JSON Web Tokens
- HttpOnly refresh cookies
- Helmet
- CORS
- Express rate limiting
- Vitest

## Repository structure

```text
mood/
├── src/
│   ├── app/                  # Next.js routes and pages
│   ├── components/           # UI and analytics presentation
│   ├── lib/                  # Frontend utilities and API client
│   ├── services/             # Frontend API services
│   └── types/                # Shared frontend DTO definitions
│
├── backend/
│   ├── prisma/               # Prisma schema and migrations
│   ├── src/
│   │   ├── lib/
│   │   │   ├── analytics.ts
│   │   │   ├── advancedAnalytics.ts
│   │   │   └── statistics.ts
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.ts
│   ├── tests/
│   └── docs/
│
└── README.md
```

## Local development

### Prerequisites

Install:

- Node.js 24 for the backend;
- npm;
- PostgreSQL.

### 1. Clone the repository

```bash
git clone https://github.com/Daniel419797/mood.git
cd mood
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
npm install
```

Configure `backend/.env`.

Minimum local values:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mood_tracker
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/mood_tracker

JWT_SECRET=replace-with-at-least-64-random-characters
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=30

CORS_ORIGIN=http://localhost:3000
COOKIE_NAME=mood_refresh
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
TRUST_PROXY=false

PUBLIC_API_URL=http://localhost:4000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 4. Prepare the database

From `backend/`:

```bash
npm run prisma:deploy
```

For local schema development:

```bash
npm run prisma:migrate
```

### 5. Start the backend

From `backend/`:

```bash
npm run dev
```

The API runs on:

```text
http://localhost:4000
```

### 6. Configure the frontend

Create or update the frontend environment file:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### 7. Start the frontend

From the repository root:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Authentication

MindfulMorsel supports:

- email/password registration;
- email/password login;
- Google sign-in;
- short-lived access tokens;
- rotating refresh sessions;
- HttpOnly refresh cookies;
- profile updates;
- password changes for password-based accounts;
- complete account deletion.

Protected frontend requests use:

```text
Authorization: Bearer <access-token>
```

The refresh token is not exposed to frontend JavaScript.

## API overview

Base prefix:

```text
/api/v1
```

### Authentication

```text
POST   /auth/register
POST   /auth/login
GET    /auth/oauth/google
GET    /auth/oauth/google/callback
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
PATCH  /auth/me
DELETE /auth/me
```

### Mood logs

```text
GET    /moods
POST   /moods
PATCH  /moods/:id
DELETE /moods/:id
```

### Eating logs

```text
GET    /eating
POST   /eating
PATCH  /eating/:id
DELETE /eating/:id
```

### Analytics

```text
GET /analytics/dashboard?range=30d&threshold=60
GET /analytics/insights?range=30d&threshold=60
```

Supported ranges:

```text
7d
30d
all
```

The pattern threshold accepts integer values from 40 to 95.

### Operational endpoints

```text
GET /health
GET /ready
```

## Dashboard chart semantics

### Mood Score Trend

Mood and stress logs are grouped by calendar day. The chart displays:

- daily average mood score;
- daily average stress level.

Both use the 1–5 scale captured by the mood form.

### Eating Frequency

The eating-frequency chart counts logged meals by food category for the selected range.

Categories exposed to users are:

- Healthy;
- Junk;
- Neutral;
- Skipped.

Older records created with the retired `Sugary` category are preserved for backward compatibility but are normalized to `Junk` in the UI and analytics. New writes cannot create `Sugary` records.

### Meal Categories by Stress Level

This chart is descriptive rather than inferential.

For each day containing both mood and eating data:

1. the day's mood entries are used to calculate average stress;
2. average stress is bucketed from 1 to 5;
3. meals from that same day are counted by food category;
4. the dashboard renders a fixed 1–5 stress scale so the meaning of the x-axis stays consistent;
5. the stacked bars show the number of Healthy, Junk, Neutral, and Skipped entries at each stress level.

Inferential stress/food relationships are calculated separately by the behavioural analytics engine.

## Testing and verification

### Frontend

```bash
npm run lint
npm run build
```

### Backend

From `backend/`:

```bash
npm run typecheck
npm test
npm run build
npm audit
```

The backend test suite covers validation, behavioural analytics, advanced analytics, and statistical primitives.

## Production configuration

For a frontend and backend hosted on different sites, configure the backend with secure cross-site cookies:

```env
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
TRUST_PROXY=true
```

Also configure:

- `DATABASE_URL`;
- `DIRECT_URL`;
- a strong `JWT_SECRET`;
- the production frontend origin in `CORS_ORIGIN`;
- the public backend HTTPS origin in `PUBLIC_API_URL`;
- Google OAuth credentials when Google sign-in is enabled.

The frontend must point `NEXT_PUBLIC_API_URL` to the production backend's `/api/v1` endpoint.

## Security notes

The backend includes:

- server-side record ownership checks;
- password hashing;
- rotating refresh sessions;
- HttpOnly refresh cookies;
- Helmet security headers;
- explicit CORS configuration;
- rate limiting;
- request validation with Zod;
- database-backed user isolation;
- account deletion support.

Do not commit production secrets or local `.env` files.

## Statistical interpretation

A statistically significant association is not the same as a meaningful behavioural effect, and neither establishes causation.

Results can be affected by:

- small sample sizes;
- incomplete logging;
- self-reporting bias;
- missing confounders;
- repeated measurements from a single person;
- day-level aggregation;
- irregular logging;
- behavioural changes caused by tracking itself.

The application therefore presents confidence intervals, effect sizes, sample sizes, evidence labels, and warnings rather than treating a single p-value as proof.

## Project status

The current implementation includes the full frontend, backend persistence, authentication, dashboard aggregation, and advanced behavioural analytics pipeline.

The analytics architecture is suitable for product-level and research-oriented exploratory analysis when sufficient data is available. It should not be represented as a clinically validated diagnostic system without an external validation programme.

## Additional documentation

Backend-specific implementation details are available in:

```text
backend/README.md
backend/docs/BACKEND_SPEC.md
```

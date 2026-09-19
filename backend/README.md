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

The analytics engine groups logs by calendar day and compares repeated conditions across comparable days. It evaluates relationships involving stress, sleep, mood, workload, energy, meal timing, food category, skipped meals, and portion size.

For each analyzable relationship, the service reports pattern consistency, trigger and comparison outcome rates, signed rate difference (lift), phi association strength, and a two-sided Fisher exact-test p-value. The p-value is conservatively adjusted for the number of tested relationships before strong evidence is assigned.

Strong evidence requires sufficient trigger/comparison observations, meaningful association strength, and an adjusted p-value at or below 0.05. Other useful relationships are labeled emerging. Results are observational associations and do not claim causation.

The user-configurable threshold is a pattern consistency threshold, not a statistical-significance threshold. Patterns below that display threshold can still be returned as emerging patterns rather than being silently hidden.

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

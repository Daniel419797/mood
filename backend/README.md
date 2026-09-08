# Mood Tracker Backend

Small REST API built specifically for the existing MindfulMorsel frontend.

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

The frontend already calculates dashboard statistics and behavioral insights from the user's mood/eating logs, so those calculations are intentionally not duplicated in this backend.

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

```bash
cp .env.example .env
npm install
npm run prisma:deploy
npm run dev
```

Frontend:

```text
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Backend defaults to port `4000`.

## API used by the frontend

Public/session routes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/oauth/google?redirect=<frontend-origin>`
- `GET /api/v1/auth/oauth/google/callback`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

Authenticated routes:

- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `DELETE /api/v1/auth/me`
- `GET /api/v1/moods`
- `POST /api/v1/moods`
- `PATCH /api/v1/moods/:id`
- `DELETE /api/v1/moods/:id`
- `GET /api/v1/eating`
- `POST /api/v1/eating`
- `PATCH /api/v1/eating/:id`
- `DELETE /api/v1/eating/:id`

Operational routes:

- `GET /health`
- `GET /ready`

Protected API requests use `Authorization: Bearer <access-token>`. Refresh tokens are stored only in an HttpOnly cookie and are never returned to frontend JavaScript.

## Google OAuth

Create a Google OAuth web client and configure this authorized redirect URI:

```text
http://localhost:4000/api/v1/auth/oauth/google/callback
```

For production, use the public backend HTTPS origin instead.

Set:

```text
PUBLIC_API_URL=https://api.example.com
GOOGLE_CLIENT_ID=<google client id>
GOOGLE_CLIENT_SECRET=<google client secret>
```

The frontend origin must also appear in `CORS_ORIGIN`.

## Production cookie settings

For a Vercel frontend and a backend hosted on a different site/domain, use:

```text
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
TRUST_PROXY=true
```

For same-site subdomains, choose the strictest SameSite value that still supports your deployment topology.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

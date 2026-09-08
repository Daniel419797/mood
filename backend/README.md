# Mood Tracker Backend

A small REST API for the Mood Tracker frontend.

## Stack

- Node.js 24
- Express 5
- TypeScript
- PostgreSQL
- Prisma ORM 7.10
- JWT access tokens
- Rotating refresh sessions stored server-side
- Zod validation

## Local setup

```bash
cp .env.example .env
npm install
npm run prisma:deploy
npm run dev
```

The API defaults to `http://localhost:4000`.

### PostgreSQL

Create a PostgreSQL database named `mood_tracker` or replace `DATABASE_URL` and `DIRECT_URL` in `.env`.

## API

Public:

- `GET /health` (liveness)
- `GET /ready` (database readiness)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

Authenticated:

- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `DELETE /api/v1/auth/me`
- `GET|POST /api/v1/moods`
- `GET|PATCH|DELETE /api/v1/moods/:id`
- `GET|POST /api/v1/eating`
- `GET|PATCH|DELETE /api/v1/eating/:id`
- `GET /api/v1/dashboard?range=7d|30d|all&threshold=60`
- `GET /api/v1/insights?threshold=60`

Protected endpoints use:

```http
Authorization: Bearer <access-token>
```

The refresh token is never returned to JavaScript. It is stored in an HttpOnly cookie and rotated on refresh.

## Security properties

- Server-side ownership checks on every user-owned record
- Password hashing with bcrypt
- 15-minute access tokens by default
- Rotating, hashed refresh sessions
- Refresh-session revocation on logout and password change
- Rate limiting
- Helmet security headers
- Explicit CORS allow-list
- Database constraints for numeric ranges
- Request validation through Zod
- Cascading account deletion

## Production

Set:

```text
NODE_ENV=production
COOKIE_SECURE=true
JWT_SECRET=<64+ random characters>
DATABASE_URL=<runtime postgres URL>
DIRECT_URL=<direct postgres URL>
CORS_ORIGIN=https://your-frontend.example
TRUST_PROXY=true
```

If frontend and API are truly cross-site rather than same-site subdomains, set `COOKIE_SAME_SITE=none` together with `COOKIE_SECURE=true`.

Apply migrations before starting:

```bash
npm run prisma:deploy
npm run build
npm start
```

## Verification

```bash
npm run typecheck
npm test
npm run build
```

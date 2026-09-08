# Mood Tracker Backend Specification

## Scope

The backend exists only to support the current MindfulMorsel frontend.

It provides:

- email/password accounts;
- Google sign-in;
- access and refresh sessions;
- profile name updates;
- password changes for password-based accounts;
- account deletion;
- mood log persistence;
- eating log persistence;
- server-side ownership enforcement.

Dashboard summaries and behavioral insight calculations are intentionally not backend endpoints because the current frontend already computes them from the authenticated user's mood and eating logs.

## Core entities

### User

Owns all private records. `passwordHash` is nullable for Google-only accounts. `googleSub` stores the stable Google account subject when Google sign-in is linked.

### MoodLog

Stores exactly the fields submitted and rendered by the frontend: mood score/label, stress, energy, sleep hours, workload, notes, and server-generated log time.

### EatingLog

Stores exactly the fields submitted and rendered by the frontend: meal type, food category, portion, hunger-before score, time of day, description, and server-generated log time.

### RefreshSession

Stores only a SHA-256 hash of the random refresh token. The raw refresh token exists only in the HttpOnly cookie.

## Ownership invariant

Every mood/eating read, update, and delete includes the authenticated `userId` in the database predicate. The API never returns all users' records for browser-side filtering.

## API prefix

`/api/v1`

See `backend/README.md` for the exact routes used by the frontend.

## Deployment model

One Node.js API process plus one PostgreSQL database is sufficient. No Redis, queues, WebSockets, microservices, analytics service, or AI service is required by the current frontend.

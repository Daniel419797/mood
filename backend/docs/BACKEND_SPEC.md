# Mood Tracker Backend Specification

## Scope

The backend supports accounts, mood logs, eating logs, dashboard summaries, and deterministic insights.

It intentionally excludes microservices, queues, Redis, real-time sockets, payments, social features, and AI-generated health advice.

## Core entities

### User
Owns all private records.

### MoodLog
Stores mood score/label, stress, energy, sleep, workload, optional notes, and logged time.

### EatingLog
Stores meal type, food category, portion, hunger-before score, time of day, optional description, and logged time.

### RefreshSession
Stores only a SHA-256 hash of a random refresh token. Refresh sessions can be rotated and revoked.

## Ownership invariant

Every read/update/delete for mood and eating data must include the authenticated `userId` in the database predicate.

The API must never retrieve all users' records and rely on browser-side filtering.

## Insight rules

v1 uses deterministic correlations only:

1. high-stress days versus sugary/junk choices;
2. short-sleep days versus low mood.

At least seven tracked days are required before the insights endpoint reports sufficient data.

## API contract

Base prefix: `/api/v1`

See `README.md` for the endpoint list and request authentication format.

## Deployment model

One Node.js API process and one PostgreSQL database are sufficient for v1.

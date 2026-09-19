# Mood Tracker Backend Specification

## Scope

The backend supports the MindfulMorsel frontend and owns authenticated persistence plus derived analytics.

It provides email/password accounts, Google sign-in, access and refresh sessions, profile updates, password changes, account deletion, mood/eating persistence, ownership enforcement, dashboard aggregation, and behavioral pattern analysis.

## Core entities

### User

Owns all private records. passwordHash is nullable for Google-only accounts. googleSub stores the stable Google account subject when Google sign-in is linked.

### MoodLog

Stores mood score/label, stress, energy, sleep hours, workload, notes, and the log timestamp.

### EatingLog

Stores meal type, food category, portion, hunger-before score, time of day, description, and the log timestamp.

### RefreshSession

Stores only a SHA-256 hash of the random refresh token. The raw refresh token exists only in the HttpOnly cookie.

## Ownership invariant

Every mood/eating read, update, delete, dashboard query, and insight query is scoped by the authenticated userId. Analytics never mix data between users.

## Analytics contract

Analytics are generated server-side from the user's records in the requested 7d, 30d, or all range.

The engine groups records into daily aggregates and requires at least seven distinct tracked days before the dedicated insights view is unlocked. At that point, weak continuous estimates may be exposed as clearly labeled preliminary early signals; stronger evidence labels still require larger and more stable samples.

The analytics contract includes:

- categorical trigger/control comparisons with rate differences, 95% confidence intervals, phi association strength, Fisher exact tests, and multiplicity correction;
- continuous Pearson and Spearman correlations with Fisher-z 95% confidence intervals and Benjamini-Hochberg false-discovery-rate adjustment;
- multivariable linear regression with HC3 heteroskedasticity-robust standard errors, 95% coefficient intervals, standardized coefficients, FDR-adjusted p-values, fit metrics, and VIF diagnostics;
- multivariable logistic regression with adjusted odds ratios, 95% intervals, FDR-adjusted p-values, convergence diagnostics, pseudo-R², and VIF diagnostics;
- one-day lagged analysis on consecutive calendar-day pairs with confidence intervals and FDR control;
- an inference-quality report describing data coverage, model warnings, multiplicity handling, uncertainty estimation, and methodological limitations.

Below-threshold relationships can still be returned as emerging patterns instead of being treated as nonexistent. The profile slider controls pattern consistency only; it is deliberately not described as statistical significance or confidence.

The analysis classification can become research-oriented when the dataset is sufficiently complete and stable, but the API always reports clinicalValidated=false. Clinical validity requires independent validation and prospective study outside the software itself.

Analytics are observational and must not be presented as causal findings.

## API prefix

/api/v1

Analytics endpoints:

- GET /api/v1/analytics/insights
- GET /api/v1/analytics/dashboard

See backend/README.md for the complete route list.

## Deployment model

One Node.js API process plus one PostgreSQL database is sufficient for the current architecture. The analytics engine is part of the API process and does not require a separate analytics service, queue, Redis instance, WebSocket service, or AI model.

## Food-category contract

Client-facing and newly writable food categories are `Healthy`, `Junk`, `Neutral`, and `Skipped`.

The Prisma enum retains the historical `Sugary` value only for backward-compatible reads. Analytics and dashboard aggregations normalize legacy `Sugary` values to `Junk`, and validation rejects `Sugary` on new create/update payloads.

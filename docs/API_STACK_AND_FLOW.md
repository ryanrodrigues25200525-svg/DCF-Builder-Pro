# DCF Builder API Stack and Flow

This document explains how requests move through the system from the browser to the backend and back again.

At a high level, the frontend handles the user experience, the backend handles data gathering and normalization, and the two are connected through a small set of API routes.

## The Big Picture

DCF Builder has three runtime layers:

1. The browser
2. The frontend application
3. The backend service

The browser never talks directly to the upstream data providers. The backend does that work and returns a single application-friendly payload.

## High-Level Flow

```text
[Browser]
   |
   v
[Frontend]
   |
   v
[Backend]
   |
   +--> cache lookup
   +--> external provider requests
   +--> response normalization
   |
   v
[Frontend receives payload]
   |
   v
[User sees valuation workspace]
```

## What Happens When a Company Loads

1. A user searches for or selects a company ticker.
2. The frontend calls its company route.
3. The backend checks for recent cached data.
4. If a usable cache entry exists, it may return that immediately.
5. If not, the backend fetches fresh data.
6. The backend combines profile, financials, market data, and valuation context.
7. The frontend turns that combined response into the valuation interface.

## Why Caching Exists

Caching serves two purposes:

- it makes repeat loads faster
- it reduces failure impact when upstream providers are slow or temporarily unavailable

In this project:

- the backend uses a SQLite-backed cache
- the frontend keeps a short-lived in-memory cache

## Data Provider Roles

### Company profile and financial statements

- Primary source: `edgartools`

This is the main SEC-native data layer in the project.

### Market data

- Primary source: `stockdex`
- Fallback source: Yahoo Finance

### Supporting valuation context

- peer companies
- macro inputs
- additional valuation context used by the workspace

## Fallback Behavior

A fallback is the backup path the system uses when the preferred source is unavailable.

Examples:

- if the primary market data source fails, the backend can try Yahoo
- if live data is unavailable but recent cached data exists, the app may use the cached version instead of failing outright

## Main Backend Components

These are the main backend files for contributors who want to trace request flow:

- `app/api/routers/financials_router.py`
- `app/api/routers/search.py`
- `app/api/routers/macro_router.py`
- `app/api/routers/export_router.py`
- `app/services/edgar.py`
- `app/services/finance.py`
- `app/infrastructure/repository.py`

## Health Checks and Verification

Useful health and verification points:

- backend health route: `/health`
- backend readiness route: `/ready`
- API health route: `/api/health`
- cache stats route: `/api/cache/stats`
- frontend build check: `npm run build:frontend`
- full verification: `npm run verify`

If your goal is simply to confirm that the project runs locally, [LOCAL_SETUP.md](LOCAL_SETUP.md) is the right starting point.

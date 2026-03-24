# DCF Builder API Documentation

This document explains the main routes used inside DCF Builder and how data moves between the frontend and backend.

You do not need to call these routes manually to use the project. They are here for contributors, maintainers, and anyone who wants to understand how the app works under the hood.

## Local Addresses

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Backend interactive docs: `http://localhost:8000/docs`

## System Overview

DCF Builder has two application layers:

- the frontend, which is the web app users interact with
- the backend, which gathers, normalizes, caches, and exports data

In practice, the browser talks to frontend API routes, and those routes talk to the FastAPI backend.

## Most Important Routes

### Frontend `GET /api/sec/company?ticker={TICKER}`

This is the main company-load route used by the valuation workspace. When a user opens a company such as `AAPL`, this route requests the full company payload from the backend.

### Frontend `GET /api/sec/search?q={QUERY}&limit={N}`

This powers company search by ticker, company name, and close matches.

### Frontend `POST /api/dcf/export`

This sends the current valuation state to the backend and returns a downloadable Excel workbook.

## Frontend API Routes

These routes live in the frontend codebase and work as a thin application layer between the browser and the backend service.

### `GET /api/sec/company?ticker={TICKER}`

- Purpose: load a complete company payload for the app
- Upstream backend route:
  - `GET {SEC_SERVICE_URL}/api/company/{ticker}/unified/native?years=5`
- Behavior:
  - keeps a short in-memory cache
  - can reuse cached data if the backend is temporarily unavailable

### `GET /api/sec/search?q={QUERY}&limit={N}`

- Purpose: search for companies
- Search behavior:
  - ticker lookup
  - company name lookup
  - fuzzy matching

### `POST /api/projections/{ticker}`

- Purpose: build forward-looking projections from historical data

### `POST /api/dcf/export`

- Purpose: create the downloadable DCF workbook
- Upstream backend route:
  - `POST {SEC_SERVICE_URL}/api/export/dcf/excel`

### Other frontend routes

- `GET /api/wacc/erp`
- `GET /api/wacc/treasury`
- `GET /api/market-data`

These support smaller pieces of the valuation workflow.

## Backend API Routes

The FastAPI backend is organized into route groups:

- `/api/company`
- `/api/search`
- `/api/export`
- `/api/macro`

### Health and status routes

- `GET /`
- `GET /health`
- `GET /ready`
- `GET /api/health`
- `GET /api/cache/stats`

These routes are mainly for troubleshooting and operational checks.

### Company Routes

These routes all relate to an individual ticker:

- `GET /api/company/{ticker}`: basic company profile
- `GET /api/company/{ticker}/unified`: combined company data
- `GET /api/company/{ticker}/unified/native`: main combined payload used by the app
- `GET /api/company/{ticker}/financials`: financial statements
- `GET /api/company/{ticker}/financials/native`: native-format financial statements
- `GET /api/company/{ticker}/market`: market data
- `GET /api/company/{ticker}/peers`: comparable companies
- `GET /api/company/{ticker}/peers/suggested`: suggested comparable companies
- `GET /api/company/{ticker}/filings`: filing history
- `GET /api/company/{ticker}/insider-trades`: insider activity
- `GET /api/company/{ticker}/insiders`: alias for insider data

### Search route

- `GET /api/search?query={QUERY}&limit={N}`

This searches for companies.

### Macro route

- `GET /api/macro`

This returns broader market and macro context used in valuation assumptions.

### Export route

- `POST /api/export/dcf/excel`

This creates the Excel export.

## Data Sources

DCF Builder does not invent company data. It combines data from external providers.

- Company profile and financial statements:
  - `edgartools` is the primary source
- Market data:
  - `stockdex` is used first
  - Yahoo is used as a fallback
- Macro context:
  - backend-managed market and cached context sources

## Environment Variables

### Backend

- `EDGAR_IDENTITY`
- `CORS_ORIGINS`
- `ALLOWED_HOSTS`
- `EXPOSE_IDENTITY_HINT`
- `FINANCIALS_OPERATING_COMPANY_FILTER`
- `FINANCIALS_REQUIRE_10K_PREFLIGHT`

### Frontend

- `SEC_SERVICE_URL`
- `NEXT_PUBLIC_SEC_SERVICE_URL`
- `SEC_USER_AGENT`

If you are running the project locally, use the values shown in [LOCAL_SETUP.md](LOCAL_SETUP.md).

## Error Behavior

If a request fails:

- the frontend returns an application-level error to the browser
- the backend returns an HTTP error response with a status code
- cached data may be used when available so the app can still return a usable response

Common status code families:

- `400`: bad request
- `404`: resource not found
- `500+`: server-side failure

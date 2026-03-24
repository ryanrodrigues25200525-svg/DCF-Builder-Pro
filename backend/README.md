# Backend Service

This directory contains the FastAPI backend for DCF Builder. It is responsible for gathering company data, normalizing it into the format used by the frontend, caching results, and generating Excel exports.

## Stack

- FastAPI
- Uvicorn
- `edgartools` for SEC data
- `stockdex` with Yahoo fallback for market data
- SQLite-backed cache storage

## Run Locally

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs are available at `http://localhost:8000/docs`.

## Main Route Groups

- `/api/company`
- `/api/search`
- `/api/export`
- `/api/macro`
- `/health`
- `/ready`

## Important Endpoints

- `GET /api/company/{ticker}/unified/native?years=5`
- `GET /api/company/{ticker}/financials/native?years=5`
- `GET /api/company/{ticker}/market`
- `GET /api/company/{ticker}/peers`
- `GET /api/search?query=...&limit=...`
- `POST /api/export/dcf/excel`

## Environment

Copy from `.env.example` and set values appropriate for your environment:

- `EDGAR_IDENTITY`
- `CORS_ORIGINS`
- `ALLOWED_HOSTS`
- `EXPOSE_IDENTITY_HINT`

Optional settings:

- `FINANCIALS_OPERATING_COMPANY_FILTER`
- `FINANCIALS_REQUIRE_10K_PREFLIGHT`
- `SINGLE_TICKER_CACHE`
- `LOG_LEVEL`
- `REQUEST_LOG_ENABLED`
- `RATE_LIMIT_ENABLED`
- `RATE_LIMIT_REQUESTS`
- `RATE_LIMIT_WINDOW_SECONDS`

## Data Provider Priority

- Financial statements and company profile: `edgartools`
- Market data: `stockdex`, with Yahoo fallback

## Cache Notes

- company, market, peer, and macro responses are cached behind the API
- cache stats are available at `/api/cache/stats`
- SQLite is suitable for local development and low-traffic deployments, but cache state is per instance and disposable

## Operational Guardrails

- health endpoints:
  - `/health`
  - `/ready`
  - `/api/health`
- response headers:
  - `X-Request-ID`
  - `X-Response-Time-Ms`
- conservative in-memory rate limiting is controlled through environment variables

## Attribution

This backend depends on `edgartools` for the primary SEC-native company profile and financial statement pipeline, and it also relies on `stockdex` plus Yahoo Finance-backed market data flows in the market-data layer.

- `edgartools`: https://github.com/dgunning/edgartools
- `stockdex`: https://github.com/ahnazary/stockdex
- `Yahoo Finance`: https://finance.yahoo.com/

Please preserve that attribution in downstream forks and public derivative distributions.

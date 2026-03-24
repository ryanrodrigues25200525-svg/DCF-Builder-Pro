# DCF Builder Pro
### Open-source DCF valuation terminal for analyzing public companies faster and with more clarity

DCF Builder Pro is a browser-based DCF valuation terminal built with Next.js and FastAPI. It is designed to make public company valuation work quicker and easier to understand by bringing company data, market data, model assumptions, and valuation views into one place. You can search a company, inspect the drivers behind the model, adjust assumptions page by page, and export the current valuation to Excel.

If you want to run the project locally, start with [LOCAL_SETUP.md](docs/LOCAL_SETUP.md).

## &#128161; Why DCF Builder Pro?

DCF Builder Pro is built for a practical valuation workflow: load a public company, inspect the numbers behind the model, adjust assumptions, and see the impact without jumping between disconnected tools.

- It brings company profile data, financial statements, market data, and valuation context into one workspace so the model has the information it needs in one place.
- It separates the interface from the data pipeline, which keeps the frontend focused on analysis while the backend handles retrieval, normalization, caching, and export.
- It breaks the valuation process into dedicated pages, so you can review each part of the model more clearly instead of forcing everything into one screen.
- It keeps the project local-first and transparent, with setup and architecture docs that make it easier to run, inspect, and extend the codebase yourself.

## &#10024; Features

- **Overview page:** high-level company summary, valuation snapshot, and key operating context
- **Financials page:** income statement, balance sheet, cash flow, and DCF bridge views alongside model inputs
- **Revenue Build page:** revenue forecasting view for understanding how top-line assumptions shape the model
- **WACC Build page:** discount-rate workspace for reviewing and adjusting cost-of-capital assumptions
- **Reverse DCF page:** market-implied expectations view showing what future performance the current price suggests
- **Sensitivity page:** scenario matrix for testing how valuation changes when key assumptions move
- **Comparables page:** peer multiple view for relative valuation context
- **Transactions page:** precedent-transactions screen for comparing the company against selected deal benchmarks
- **Search and export workflow:** company lookup by ticker or name, followed by Excel export of the current valuation state

## &#128736;&#65039; Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Backend:** FastAPI, Python, Uvicorn
- **SEC and company financial data:** `edgartools`
- **Market data:** `stockdex` with Yahoo Finance fallback
- **Local cache:** SQLite-backed backend cache

## &#128640; Quick Start

```bash
git clone https://github.com/ryanrodrigues25200525-svg/DCF-Builder-Pro.git
cd DCF-Builder-Pro
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
npm run install:all
npm run dev
```

Then open:

- App: `http://localhost:3000`
- Backend docs: `http://localhost:8000/docs`

## &#9881;&#65039; Environment Files

Start by copying the example files:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Recommended local values for `frontend/.env.local`:

```bash
SEC_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_SEC_SERVICE_URL=http://localhost:8000
SEC_USER_AGENT=DCFBuilder_Research/1.0 (your-email@example.com)
```

Recommended local values for `backend/.env`:

```bash
EDGAR_IDENTITY=Your Name your-email@example.com
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ALLOWED_HOSTS=localhost,127.0.0.1
LOG_LEVEL=INFO
REQUEST_LOG_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60
```

Use the example files as templates. Do not commit real local or production secrets.

## &#129504; How It Works

DCF Builder Pro has two main layers that work together: the frontend and the backend.

### Frontend

The frontend is the browser application you interact with directly.

- It handles company search, page navigation, model views, and user input.
- It displays the valuation workspace across pages such as Overview, Financials, Revenue Build, WACC Build, Reverse DCF, Sensitivity, Comparables, and Transactions.
- It takes the normalized data returned by the backend and turns it into a usable analysis interface.

### Backend

The backend is the service layer behind the interface.

- It retrieves company, market, and valuation data from its upstream sources.
- It normalizes that data into one consistent structure for the frontend.
- It handles caching, health checks, and Excel export generation.

### Request Flow

The standard flow is:

1. You search for a company by ticker or name.
2. The frontend sends that request to the backend.
3. The backend gathers the required company, market, and valuation data.
4. The backend combines the results into one normalized payload.
5. The frontend uses that payload to populate the model pages.
6. You review the company, adjust assumptions, and export the current model state when needed.

## &#128193; Project Structure

- `frontend/`: Next.js application, UI, frontend API routes, browser-side valuation flow
- `backend/`: FastAPI application, data provider orchestration, export logic, cache, health endpoints
- `docs/`: setup, architecture, API, and contributor documentation
- `scripts/`: helper scripts such as the local security scan and launcher scripts
- `docker-compose.yml`: local multi-service container setup

## &#128187; Local Development

The standard local workflow is:

```bash
npm run install:all
npm run dev
```

Docker alternative:

```bash
docker compose up --build
```

If you want the full step-by-step version, use [LOCAL_SETUP.md](docs/LOCAL_SETUP.md).

## &#9989; Quality Checks

Run the standard checks before publishing changes:

```bash
npm run security:scan
npm run lint:frontend
npm run test:frontend
npm run build:frontend
npm run test:backend
```

Full verification:

```bash
npm run verify
```

Browser flow:

```bash
npm run test:e2e:dcf-flow
```

## &#128218; Documentation

- Local setup: [LOCAL_SETUP.md](docs/LOCAL_SETUP.md)
- API reference: [API_DOCS.md](docs/API_DOCS.md)
- Request flow: [API_STACK_AND_FLOW.md](docs/API_STACK_AND_FLOW.md)
- Architecture detail: [ARCHITECTURE_FLOW.md](docs/ARCHITECTURE_FLOW.md)
- Contribution guide: [CONTRIBUTING.md](docs/CONTRIBUTING.md)
- Backend notes: [backend/README.md](backend/README.md)

## &#10084;&#65039; Acknowledgments

DCF Builder Pro depends on upstream tools and data sources that make the research workflow possible.

- `edgartools`: https://github.com/dgunning/edgartools
- `stockdex`: https://github.com/ahnazary/stockdex
- `Yahoo Finance`: https://finance.yahoo.com/

If you improve the SEC integration layer, market data layer, or related normalization logic in a way that is generally reusable, consider contributing upstream where appropriate.

## &#128220; License

This project is released under the MIT License. See [LICENSE](LICENSE).

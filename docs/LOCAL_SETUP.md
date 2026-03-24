# Local Setup

This guide explains how to run DCF Builder on your own machine. It is written for two kinds of readers:

- someone following the steps for the first time
- someone who wants a clean, direct local development guide

If you only need the shortest path, use the command blocks exactly as written.

## What You Need

- Node.js 20 or higher
- npm 10 or higher
- Python 3.11 or higher
- Git

Optional:

- Docker Desktop if you want to run the app with containers instead of local processes

## 1. Clone the Repository

```bash
git clone https://github.com/<your-org-or-user>/DCF-Builder.git
cd DCF-Builder
```

If your folder name differs, that is fine. Just make sure you are in the repository root before running later commands.

## 2. Create Local Environment Files

The project uses two local settings files:

- `frontend/.env.local` for the web app
- `backend/.env` for the API service

Create them from the examples:

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

Important notes:

- `EDGAR_IDENTITY` should be a real identifier for SEC requests.
- These files stay on your machine.
- Do not commit `.env` or `.env.local` files to GitHub.

## 3. Install Dependencies

From the repository root:

```bash
npm run install:all
```

That command installs frontend dependencies and backend Python requirements.

If you want to install things manually instead, the equivalent flow is:

```bash
npm install
npm install --prefix frontend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

Most people should use `npm run install:all`.

## 4. Start the App

From the repository root:

```bash
npm run dev
```

This starts:

- frontend on `http://localhost:3000`
- backend on `http://localhost:8000`

Useful backend routes while checking your setup:

- `http://localhost:8000/health`
- `http://localhost:8000/ready`
- `http://localhost:8000/docs`

## 5. Verify the Setup

Run the standard project verification:

```bash
npm run verify
```

If you also want to test the main browser flow:

```bash
npm run test:e2e:dcf-flow
```

## Docker Option

If you prefer Docker:

```bash
docker compose up --build
```

That starts the same two services:

- frontend on `http://localhost:3000`
- backend on `http://localhost:8000`

## Common Issues

### Ports already in use

If port `3000` or `8000` is already being used by another app, DCF Builder will not start until that conflict is removed.

- `3000` is the frontend
- `8000` is the backend

### SEC requests fail

Common causes:

- `EDGAR_IDENTITY` is missing or still left as a placeholder
- your internet connection is blocked or unstable
- the SEC endpoint is temporarily rate-limited or unavailable

### Playwright end-to-end test fails on startup

Check that:

- the frontend is reachable at `http://localhost:3000`
- the backend is reachable at `http://localhost:8000`
- your local frontend URL matches what the Playwright test expects

### Backend dependency mismatch

Reinstall backend requirements:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

## Suggested Checks After First Install

```bash
npm run lint:frontend
npm run test:frontend
npm run build:frontend
npm run test:backend
npm run test:e2e:dcf-flow
```

If those pass, your local installation is in good shape.

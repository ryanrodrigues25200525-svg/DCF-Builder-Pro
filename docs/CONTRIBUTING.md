# Contributing

Thanks for contributing to DCF Builder.

This project is structured so that a contributor can understand it in layers. You do not need to understand every file before making a useful change. Start with the overview docs, get the project running locally, and keep your first changes small.

Helpful first reads:

- [README.md](../README.md)
- [LOCAL_SETUP.md](LOCAL_SETUP.md)
- [API_DOCS.md](API_DOCS.md)
- [ARCHITECTURE_FLOW.md](ARCHITECTURE_FLOW.md)

## Development Setup

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
npm run install:all
npm run dev
```

## Before Opening A Pull Request

Run:

```bash
npm run security:scan
npm run lint:frontend
npm run test:frontend
npm run build:frontend
npm run test:backend
```

If you changed browser behavior, also run:

```bash
npm run test:e2e:dcf-flow
```

## Contribution Guidelines

- Keep changes focused and reviewable.
- Do not commit secrets, local environment files, or generated artifacts.
- Update documentation when you change setup, APIs, or user-facing behavior.
- Follow the existing style of the surrounding code unless there is a clear reason to refactor.
- Preserve attribution to upstream dependencies, especially `edgartools`, `stockdex`, and Yahoo Finance, which support the SEC-native and market data layers used in this project.

## Reporting Issues

When filing a bug, include:

- what you expected
- what happened instead
- steps to reproduce it
- logs or screenshots when helpful

## Code Style

- Frontend: follow the existing TypeScript, React, and Next.js patterns
- Backend: follow the existing FastAPI and Python patterns
- Keep comments brief and only add them when they clarify something that is otherwise hard to read

If you are new to contributing, a good default is to match the style already used in nearby files.

## Upstream Credit

This project builds on multiple upstream tools and data sources for core parts of its data pipeline.

- `edgartools`: https://github.com/dgunning/edgartools
- `stockdex`: https://github.com/ahnazary/stockdex
- `Yahoo Finance`: https://finance.yahoo.com/

If you improve the SEC integration layer, market data retrieval layer, or related normalization logic in ways that are broadly reusable, consider contributing upstream where appropriate.

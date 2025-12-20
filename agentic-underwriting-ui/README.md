# Agentic Underwriting UI

Frontend web application for the Agentic Underwriting solution.

- Framework: **Next.js** (App Router)
- UI: React + Tailwind
- Runtime dependency: Backend API service

For the overall solution view, see the repository root documentation.

## Configuration (Public-Safe)

This application expects a backend API base URL via an environment variable:

- `NEXT_PUBLIC_API_BASE_URL` – Base URL of the backend (placeholder example: `https://<backend-app>.azurewebsites.net`)

Do not commit environment-specific values (URLs, keys, tokens) to the repository.

## Prerequisites

- Node.js (see the `engines` field in `package.json`)
- Backend API endpoint available (local or deployed)

## Local Development

1. Install dependencies:
	```bash
	npm ci
	```
2. Create a local environment file (example):
	```bash
	# .env.local
	NEXT_PUBLIC_API_BASE_URL="https://<backend-app>.azurewebsites.net"
	```
3. Start the dev server:
	```bash
	npm run dev
	```

## Production Build (Local)

```bash
npm run build
npm run start
```

## Deploy to Azure App Service (Zip Deploy)

This repo is compatible with deploying via the VS Code Azure App Service extension.

High-level steps:

1. In the VS Code Azure extension, deploy the folder `agentic-underwriting-ui/` (not the repo root).
2. In App Service Configuration, set `NEXT_PUBLIC_API_BASE_URL` to the backend URL (placeholder values in docs).
3. Ensure the App Service Node runtime is compatible with the `engines` field in `package.json`.

Recommended App Service app settings (placeholders):

- `NEXT_PUBLIC_API_BASE_URL` = `https://<backend-app>.azurewebsites.net`
- `NEXT_TELEMETRY_DISABLED` = `1` (optional)

## Related Docs

- Solution overview: ../README.md
- Backend documentation: ../agentic-underwriting-backend/README.md

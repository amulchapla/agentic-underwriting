# Agentic Underwriting Backend

Backend API service used by the Agentic Underwriting UI.

- Framework: **FastAPI** (Python)
- Agent orchestration: **Semantic Kernel** (Python)
- Optional integrations: LLM provider, agent endpoints, telemetry

This README is focused on **setup and deployment**. It intentionally avoids publishing environment-specific values.

## Prerequisites

- Python 3.10+ (recommended)
- Access to an LLM provider (optional, depending on which capabilities are enabled)
- Azure CLI (only needed for the optional Zip Deploy instructions below)

## Configuration

Configuration is loaded from environment variables and optionally a local `.env` file.

Do not commit any `.env` files, keys, tokens, or real service URLs.

Common environment variables (placeholders):

- CORS
   - `CORS_ORIGINS` = `http://localhost:3000,https://<ui-app>.azurewebsites.net`
- LLM provider (optional)
   - `AZURE_OPENAI_ENDPOINT` = `https://<your-openai-resource>.openai.azure.com/`
   - `AZURE_OPENAI_API_KEY` = `<secret>`
   - `AZURE_OPENAI_DEPLOYMENT` = `<deployment-name>`
- Azure Foundry agent endpoints (optional)
   - `FOUNDRY_FABRIC_AGENT_ENDPOINT` = `https://<foundry-endpoint>`
   - `FOUNDRY_FABRIC_AGENT_NAME` = `<agent-name>`
   - `FOUNDRY_KNOWLEDGE_AGENT_ENDPOINT` = `https://<foundry-endpoint>`
   - `FOUNDRY_KNOWLEDGE_AGENT_NAME` = `<agent-name>`
- Azure Maps (optional)
   - `AZURE_MAPS_CLIENT_ID` = `<client-id>`
- Telemetry (optional)
   - `APPLICATIONINSIGHTS_CONNECTION_STRING` = `<connection-string>`
   - `OTEL_SERVICE_NAME` = `agentic-underwriting-backend`

## Local Setup

1. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
2. Set your environment variables (or create a local `.env` that is not committed).
3. Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```

## Deploy to Azure App Service (Zip Deploy)

This repository supports Zip Deploy (for example via the VS Code Azure App Service extension or Azure CLI).

High-level steps:

1. Create an App Service configured for Python.
2. Configure required environment variables in App Service **Configuration** (placeholders above).
3. Deploy the backend folder `agentic-underwriting-backend/`.

Example Azure CLI command (placeholders):

```bash
az webapp deployment source config-zip \
   --resource-group <resource-group> \
   --name <backend-app-service-name> \
   --src <path-to-zip>
```

## Code Map (High-Level)

```
app/
  main.py                # FastAPI app entrypoint
  config.py              # Configuration/env loading
  routers/               # API routes
  services/              # Orchestration, agents, integrations
  models/                # Pydantic schemas
```

## Related Docs

- Solution overview: ../README.md
- UI documentation: ../agentic-underwriting-ui/README.md

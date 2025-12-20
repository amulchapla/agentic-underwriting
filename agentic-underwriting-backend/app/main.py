import logging

# Telemetry bootstrap (must run before app creation to wire exporters/instrumentation)
import app.telemetry  # noqa: F401

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from app.routers.cases import router as cases_router
from app.routers.copilot import router as copilot_router
from app.routers.fabric import router as fabric_router
from app.routers.location_intelligence import router as location_router
from app.config import settings
from app import telemetry

app = FastAPI(title="AgenticAI Underwriting Backend")

# Wire OpenTelemetry (logs + traces + deps)
telemetry.instrument_app(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=PlainTextResponse)
def root():
    return "AgenticAI Underwriting Backend is running."

app.include_router(cases_router)
app.include_router(copilot_router)
app.include_router(fabric_router)
app.include_router(location_router)

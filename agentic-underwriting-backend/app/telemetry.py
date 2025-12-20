"""
Telemetry bootstrap for Azure Monitor / Application Insights via OpenTelemetry.
Best-effort: failures to export telemetry will not break the app.
"""
import logging
import os

from dotenv import load_dotenv

from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk.resources import Resource

# Load .env so APPLICATIONINSIGHTS_CONNECTION_STRING is available during import
load_dotenv()

# Configure exporter (uses APPLICATIONINSIGHTS_CONNECTION_STRING from env)
# This call is best-effort; export failures won't crash the app.
configure_azure_monitor()

# Define resource attributes (can also be set via OTEL_RESOURCE_ATTRIBUTES env)
_resource = Resource.create({
    "service.name": os.getenv("OTEL_SERVICE_NAME", "agentic-underwriting-backend"),
})

# Instrument stdlib logging so logs ship to App Insights, while keeping console logs
LoggingInstrumentor().instrument(set_logging_format=True, log_level=logging.INFO)


def instrument_app(app):
    """Instrument FastAPI and outbound HTTP (requests)."""
    FastAPIInstrumentor.instrument_app(app, tracer_provider=None)  # use default provider/exporter
    RequestsInstrumentor().instrument()

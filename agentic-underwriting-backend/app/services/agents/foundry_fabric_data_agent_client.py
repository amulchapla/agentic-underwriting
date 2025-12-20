"""
Foundry-backed client for Fabric-style Data Agent calls.
Returns the same structured schema as the legacy Fabric client.
"""
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from openai import AzureOpenAI

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

FOUNDRY_OPENAI_SCOPE = os.getenv("FOUNDRY_OPENAI_SCOPE", "https://ai.azure.com/.default")
OPENAI_API_VERSION = os.getenv("OPENAI_API_VERSION")

logger = logging.getLogger(__name__)
# Ensure INFO-level logs surface for this client
logger.setLevel(logging.INFO)

# Prefer attaching to uvicorn.error handlers if they exist; otherwise add a simple stdout handler
_uvicorn_err = logging.getLogger("uvicorn.error")
if _uvicorn_err.handlers:
    for _h in _uvicorn_err.handlers:
        logger.addHandler(_h)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _formatter = logging.Formatter("%(levelname)s:%(name)s:%(message)s")
    _handler.setFormatter(_formatter)
    logger.addHandler(_handler)

# Prevent double logging; we directly attach handlers
logger.propagate = False


class FabricAgentResponse(BaseModel):
    """Structured response model compatible with the legacy Fabric Data Agent."""

    status: str = Field(..., description="Response status: success, no_data, or error")
    columns: int = Field(..., description="Number of columns in the response")
    rows: int = Field(..., description="Number of rows in the response")
    comments: str = Field(default="", description="Agent's reasoning or context")
    summary: str = Field(default="", description="Human-readable narrative insight")
    response: List[Dict[str, Any]] = Field(default_factory=list, description="Array of data rows")


class FoundryFabricDataAgentClient:
    """Client that calls a Foundry Agent acting as a pass-through to Fabric Data Agent."""

    def __init__(
        self,
        endpoint: Optional[str] = None,
        agent_name: Optional[str] = None,
        credential: Optional[Any] = None,
    ) -> None:
        # Use agent-specific env vars so multiple Foundry agents can coexist
        self.endpoint = endpoint or os.getenv("FOUNDRY_FABRIC_AGENT_ENDPOINT")
        self.agent_name = agent_name or os.getenv("FOUNDRY_FABRIC_AGENT_NAME")
        if not self.endpoint:
            raise ValueError("FOUNDRY_FABRIC_AGENT_ENDPOINT is required")
        if not self.agent_name:
            raise ValueError("FOUNDRY_FABRIC_AGENT_NAME is required")

        # self.credential = credential or DefaultAzureCredential()
        # Exclude interactive browser credential for App Service compatibility
        self.credential = credential or DefaultAzureCredential(
            exclude_interactive_browser_credential=True,
            exclude_shared_token_cache_credential=True,
            exclude_visual_studio_code_credential=True
        )
        
        self.project_client = AIProjectClient(
            endpoint=self.endpoint,
            credential=self.credential,
        )
        self.agent = self._resolve_agent(self.agent_name)

    def _resolve_agent(self, agent_name: str):
        try:
            agent = self.project_client.agents.get(agent_name=agent_name)
            logger.info(f"Foundry Fabric agent resolved: {agent.name}")
            return agent
        except Exception as exc:
            logger.error(f"Unable to resolve Foundry Fabric agent '{agent_name}': {exc}")
            raise

    # def _get_openai_client(self):
    #     try:
    #         return self.project_client.get_openai_client()
    #     except Exception as exc:
    #         logger.error(f"Failed to obtain Foundry OpenAI client: {exc}")
    #         raise

    def _get_openai_client(self):
    # Manual client with explicit token scope to satisfy Foundry audience checks
        def token_provider() -> str:
            return self.credential.get_token(FOUNDRY_OPENAI_SCOPE).token

        base_url = self.endpoint.rstrip("/") + "/openai"
        return AzureOpenAI(
            azure_ad_token_provider=token_provider,
            base_url=base_url,
            api_version=OPENAI_API_VERSION,
            # api_version can be pinned if needed, e.g., api_version="2025-05-15-preview"
        )

    def ask_structured(self, question: str, timeout: int = 120) -> FabricAgentResponse:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")

        try:
            client = self._get_openai_client()
            start = time.perf_counter()
            response = client.responses.create(
                input=[{"role": "user", "content": question}],
                extra_body={"agent": {"name": self.agent.name, "type": "agent_reference"}},
                timeout=timeout,
            )
            elapsed_ms = int((time.perf_counter() - start) * 1000)

            output_text = getattr(response, "output_text", None)
            if not output_text:
                logger.error("Foundry agent returned empty output_text")
                return FabricAgentResponse(
                    status="error",
                    columns=0,
                    rows=0,
                    comments="Empty response from Foundry agent",
                    summary="",
                    response=[],
                )

            try:
                parsed = json.loads(output_text)
            except json.JSONDecodeError as exc:
                logger.error(f"Failed to parse JSON from Foundry agent: {exc}. Raw: {output_text}")
                return FabricAgentResponse(
                    status="error",
                    columns=0,
                    rows=0,
                    comments=f"Invalid JSON from agent: {exc}",
                    summary="",
                    response=[],
                )

            try:
                # Log success with basic call metadata
                response_id = getattr(response, "id", None)
                logger.info(
                    "Foundry agent call succeeded: agent=%s response_id=%s duration_ms=%s columns=%s rows=%s",
                    self.agent.name,
                    response_id,
                    elapsed_ms,
                    parsed.get("columns"),
                    parsed.get("rows"),
                )
                return FabricAgentResponse(**parsed)
            except Exception as exc:
                logger.error(f"Parsed JSON did not match schema: {exc}. Parsed: {parsed}")
                return FabricAgentResponse(
                    status="error",
                    columns=0,
                    rows=0,
                    comments=f"Schema validation failed: {exc}",
                    summary="",
                    response=[],
                )

        except Exception as exc:
            request_id = _extract_request_id(str(exc))
            log_suffix = f" request_id={request_id}" if request_id else ""
            logger.error(f"Foundry agent call failed:{log_suffix} | {exc}")
            return FabricAgentResponse(
                status="error",
                columns=0,
                rows=0,
                comments=f"Error: {exc}",
                summary="",
                response=[],
            )

    def get_raw_response(self, question: str, timeout: int = 120) -> Dict[str, Any]:
        client = self._get_openai_client()
        response = client.responses.create(
            input=[{"role": "user", "content": question}],
            extra_body={"agent": {"name": self.agent.name, "type": "agent_reference"}},
            timeout=timeout,
        )
        return response.model_dump() if hasattr(response, "model_dump") else dict(response)


def _extract_request_id(message: str) -> Optional[str]:
    """Attempt to pull requestId out of an error message."""
    if not message:
        return None
    match = re.search(r'"requestId"\s*:\s*"([^"]+)"', message)
    return match.group(1) if match else None

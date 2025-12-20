"""
Foundry-backed Knowledge Agent client.
Calls the Foundry knowledge agent (search + summarize) and returns a structured dict
compatible with existing knowledge_insight usage.
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
logger.setLevel(logging.INFO)

_uvicorn_err = logging.getLogger("uvicorn.error")
if _uvicorn_err.handlers:
    for _h in _uvicorn_err.handlers:
        logger.addHandler(_h)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _formatter = logging.Formatter("%(levelname)s:%(name)s:%(message)s")
    _handler.setFormatter(_formatter)
    logger.addHandler(_handler)
logger.propagate = False


class KnowledgeAgentResponse(BaseModel):
    question: str
    answer: str
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    generatedAt: Optional[str] = None
    relevanceScore: Optional[float] = None


class FoundryKnowledgeAgentClient:
    def __init__(
        self,
        endpoint: Optional[str] = None,
        agent_name: Optional[str] = None,
        credential: Optional[Any] = None,
    ) -> None:
        self.endpoint = endpoint or os.getenv("FOUNDRY_KNOWLEDGE_AGENT_ENDPOINT")
        self.agent_name = agent_name or os.getenv("FOUNDRY_KNOWLEDGE_AGENT_NAME")
        if not self.endpoint:
            raise ValueError("FOUNDRY_KNOWLEDGE_AGENT_ENDPOINT is required")
        if not self.agent_name:
            raise ValueError("FOUNDRY_KNOWLEDGE_AGENT_NAME is required")

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
            logger.info(f"Foundry knowledge agent resolved: {agent.name}")
            return agent
        except Exception as exc:
            logger.error(f"Unable to resolve Foundry knowledge agent '{agent_name}': {exc}")
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

    def ask(self, question: str, timeout: int = 120) -> KnowledgeAgentResponse:
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
                logger.error("Foundry knowledge agent returned empty output_text")
                return KnowledgeAgentResponse(
                    question=question,
                    answer="",
                    citations=[],
                    generatedAt=None,
                    relevanceScore=None,
                )

            cleaned_text = _strip_code_fence(output_text)

            try:
                parsed = json.loads(cleaned_text)
            except json.JSONDecodeError as exc:
                logger.error(f"Failed to parse JSON from Foundry knowledge agent: {exc}. Raw: {cleaned_text[:800]}")
                return KnowledgeAgentResponse(
                    question=question,
                    answer="",
                    citations=[],
                    generatedAt=None,
                    relevanceScore=None,
                )

            try:
                parsed = _coerce_citations(parsed)
                result = KnowledgeAgentResponse(**parsed)
                response_id = getattr(response, "id", None)
                logger.info(
                    "Foundry knowledge agent call succeeded: agent=%s response_id=%s duration_ms=%s citations=%s",
                    self.agent.name,
                    response_id,
                    elapsed_ms,
                    len(result.citations),
                )
                return result
            except Exception as exc:
                logger.error(f"Parsed knowledge response did not match schema: {exc}. Parsed: {parsed}")
                return KnowledgeAgentResponse(
                    question=question,
                    answer="",
                    citations=[],
                    generatedAt=None,
                    relevanceScore=None,
                )

        except Exception as exc:
            request_id = _extract_request_id(str(exc))
            log_suffix = f" request_id={request_id}" if request_id else ""
            logger.error(f"Foundry knowledge agent call failed:{log_suffix} | {exc}")
            return KnowledgeAgentResponse(
                question=question,
                answer="",
                citations=[],
                generatedAt=None,
                relevanceScore=None,
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
    if not message:
        return None
    match = re.search(r'"requestId"\s*:\s*"([^"]+)"', message)
    return match.group(1) if match else None


def _strip_code_fence(text: str) -> str:
    if not text:
        return text
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.lstrip("`")
        # remove optional language token like json
        parts = stripped.split("\n", 1)
        if len(parts) == 2:
            stripped = parts[1]
    if stripped.endswith("```"):
        stripped = stripped.rstrip("`")
    return stripped.strip()


def _coerce_citations(parsed: Dict[str, Any]) -> Dict[str, Any]:
    citations = parsed.get("citations")
    if isinstance(citations, list):
        fixed = []
        for c in citations:
            if not isinstance(c, dict):
                continue
            item = dict(c)
            score = item.get("score")
            try:
                item["score"] = float(score)
            except (TypeError, ValueError):
                item["score"] = 0.0
            fixed.append(item)
        parsed["citations"] = fixed
    return parsed

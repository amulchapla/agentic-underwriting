from __future__ import annotations
import asyncio
import json
import logging
import pkg_resources
import re

from azure.identity import DefaultAzureCredential, get_bearer_token_provider

from app.config import settings


# Semantic Kernel (SK) imports for 1.x
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import (
    AzureChatCompletion,
    AzureChatPromptExecutionSettings,
)
from semantic_kernel.contents import ChatHistory, AuthorRole, ChatMessageContent

# Guard against incompatible OpenAI versions (SK 1.x note)
try:
    openai_version = pkg_resources.get_distribution("openai").version
    if openai_version >= "1.99.7":
        raise RuntimeError(
            f"Incompatible openai version {openai_version}. "
            "Please install openai<1.99.7 for Semantic Kernel compatibility."
        )
except Exception:
    # If openai isn't installed yet, or pkg_resources not present, skip the guard
    pass

logger = logging.getLogger(__name__)

# ------------------------------ Kernel bootstrap ------------------------------
_kernel: Kernel | None = None

def _build_kernel() -> Kernel:
    # Require Azure OpenAI configuration; support API key or DefaultAzureCredential
    if not (settings.azure_openai_endpoint and settings.azure_openai_deployment):
        raise RuntimeError("Azure OpenAI is not configured (endpoint/deployment).")
    kernel = Kernel()
    if settings.azure_openai_api_key:
        service = AzureChatCompletion(
            service_id="azure-openai",
            deployment_name=settings.azure_openai_deployment,
            endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
        )
    else:
        credential = DefaultAzureCredential(exclude_interactive_browser_credential=True)
        token_provider = get_bearer_token_provider(
            credential, "https://cognitiveservices.azure.com/.default"
        )
        service = AzureChatCompletion(
            service_id="azure-openai",
            deployment_name=settings.azure_openai_deployment,
            endpoint=settings.azure_openai_endpoint,
            ad_token_provider=token_provider,
        )
    kernel.add_service(service)
    return kernel

def _get_service() -> AzureChatCompletion:
    global _kernel
    if _kernel is None:
        _kernel = _build_kernel()
    return _kernel.get_service(type=AzureChatCompletion)

# ------------------------- Common helpers for SK 1.x --------------------------
def _build_chat_history(messages: list[tuple[str, str]]) -> ChatHistory:
    chat = ChatHistory()
    role_map = {"system": AuthorRole.SYSTEM, "user": AuthorRole.USER, "assistant": AuthorRole.ASSISTANT}
    for role, content in messages:
        chat.add_message(ChatMessageContent(role=role_map.get(role, AuthorRole.USER), content=content))
    return chat

def _extract_first_assistant_text(results) -> str:
    # results is a list[ChatMessageContent]
    if not results:
        return ""
    for msg in results:
        if getattr(msg, "role", None) == AuthorRole.ASSISTANT and getattr(msg, "content", None):
            return str(msg.content).strip()
    # fallback: first message content
    first = results[0]
    return (str(first.content) if getattr(first, "content", None) else "").strip()


def _clean_json_text(text: str) -> str:
    """Remove common markdown/code-fence wrappers around JSON responses."""
    if not text:
        return text
    cleaned = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*(.*)\s*```$", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    # Handle leading 'json' prefix that sometimes appears without fences
    if cleaned.lower().startswith("json "):
        cleaned = cleaned[5:].strip()
    return cleaned

# ---------------------- Public LLM helper: free-form chat ---------------------
# ----------------------- Public LLM helper: JSON summary ----------------------
from threading import Thread

def _run_coro_in_new_thread(coro_func, *args, **kwargs):
    """
    Runs an async function in a new thread with its own event loop,
    returns the result (or raises its exception).
    """
    result_box = {}
    error_box = {}

    def _runner():
        try:
            result_box["value"] = asyncio.run(coro_func(*args, **kwargs))
        except Exception as e:
            error_box["error"] = e

    t = Thread(target=_runner, daemon=True)
    t.start()
    t.join()

    if "error" in error_box:
        raise error_box["error"]
    return result_box.get("value")

async def get_llm_response_async(prompt: str) -> dict:
    """
    Uses SK 1.x chat API to return JSON with keys: summary, bullets.
    Raises if Azure OpenAI is unavailable or the call fails.
    """
    service = _get_service()

    chat = ChatHistory()
    chat.add_message(ChatMessageContent(
        role=AuthorRole.SYSTEM,
        content=(
            "You return ONLY a valid JSON object with keys: summary (string) and bullets (array of strings). "
            "Do not include code fences, markdown, or any text outside the JSON object."
        )
    ))
    chat.add_message(ChatMessageContent(role=AuthorRole.USER, content=prompt))

    settings = AzureChatPromptExecutionSettings(temperature=0.0, max_tokens=800, top_p=1.0)

    try:
        results = await service.get_chat_message_contents(chat_history=chat, settings=settings)
        text = _clean_json_text(_extract_first_assistant_text(results))
        try:
            return json.loads(text)
        except Exception:
            # If the model returns non-JSON, fall back to a best-effort structure
            logger.error("Azure summary completion returned non-JSON text: %s", text)
            return {"summary": text, "bullets": []}
    except Exception as exc:
        logger.error("Azure summary completion failed: %s", exc)
        raise

def get_llm_response(prompt: str) -> dict:
    """
    Sync wrapper. If we're already inside a running event loop (e.g., FastAPI async route),
    execute the coroutine in a dedicated background thread. Otherwise use asyncio.run.
    """
    try:
        # Will raise RuntimeError if no running loop
        asyncio.get_running_loop()
        # We're in an active loop -> run in a separate thread
        return _run_coro_in_new_thread(get_llm_response_async, prompt)
    except RuntimeError:
        # No running loop -> safe to run directly
        return asyncio.run(get_llm_response_async(prompt))

# ---------------------- Public LLM helper: free-form chat ---------------------
async def get_chat_completion_async(messages: list[tuple[str, str]]) -> str:
    """
    Uses SK 1.x chat API to return assistant text for multi-message chats.
    Raises if Azure OpenAI is unavailable or the call fails.
    """
    service = _get_service()

    chat = _build_chat_history(messages)
    settings = AzureChatPromptExecutionSettings(temperature=0.3, max_tokens=1000, top_p=1.0)

    try:
        results = await service.get_chat_message_contents(chat_history=chat, settings=settings)
        return _extract_first_assistant_text(results)
    except Exception as exc:
        logger.error("Azure chat completion failed: %s", exc)
        raise

def get_chat_completion(messages: list[tuple[str, str]]) -> str:
    """
    Sync wrapper mirroring get_llm_response: uses a background thread when inside an active loop.
    """
    try:
        asyncio.get_running_loop()
        return _run_coro_in_new_thread(get_chat_completion_async, messages)
    except RuntimeError:
        return asyncio.run(get_chat_completion_async(messages))

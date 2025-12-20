from fastapi import APIRouter
from app.models.schemas import ChatRequest, CaseContext, CopilotChatResponse
from app.services.conductor import build_case_view
from app.services.data_access.local_repo import get_case, list_cases
from app.services.sk_kernel import get_chat_completion_async
from app.services.agents.foundry_knowledge_agent import get_knowledge_insight
import json
import re
from typing import Optional

router = APIRouter(prefix="/api/copilot", tags=["copilot"])

GLOBAL_SYSTEM_PROMPT = (
    "You are supporting an underwriting portfolio manager in a friendly, conversational way. Use the supplied portfolio "
    "of cases to answer the question, highlighting noteworthy risks, trends, and next best actions when the user asks "
    "for analysis. If the user is simply making small talk, reply naturally and invite further underwriting questions.\n\n"
    "Format your responses using markdown:\n"
    "- Use **bold** for case IDs, risk ratings, and key metrics\n"
    "- Use bullet points for trends, risks, or action items\n"
    "- Keep paragraphs short and focused\n"
    "- Use clear spacing to organize information by category"
)

_SMALL_TALK_PATTERNS = [
    r"^(hi|hello|hey|howdy)( there)?$",
    r"^(good\s+(morning|afternoon|evening))$",
    r"^(hi|hello|hey)[!.]?\s*(copilot|there)?$",
    r"^(thanks|thank\s+you)$",
    r"^(what's\s+up|whats\s+up)$",
]


def _is_small_talk(message: str) -> bool:
    cleaned = message.strip().lower()
    if not cleaned:
        return False

    for pattern in _SMALL_TALK_PATTERNS:
        if re.fullmatch(pattern, cleaned):
            return True

    return False


def _small_talk_reply(message: str, *, case_id: str | None = None, portfolio: bool = False) -> str:
    cleaned = message.strip().lower()
    if "thank" in cleaned:
        return "You're welcome! I'm here whenever you need another underwriting assist."

    if portfolio:
        return (
            "Hi there! I'm ready to chat about the underwriting portfolio whenever you're ready. "
            "Feel free to ask about risks, trends, or specific cases."
        )

    if case_id:
        return (
            f"Hi there! I'm ready to dig into case {case_id} whenever you are. "
            "Let me know what you'd like to explore."
        )

    return "Hello! Happy to help with any underwriting questions you have."


def _build_knowledge_answer(message: str, *, case_id: str | None = None, case_payload: dict | None = None) -> tuple[Optional[str], Optional[list[dict]]]:
    """Always call the knowledge agent using the user's question plus case context when available."""
    prompt_parts = [
        "Use the following context to answer the underwriting question.",
        f"Question: {message}",
    ]
    if case_payload:
        prompt_parts.append("Case context:\n" + json.dumps(case_payload, indent=2))

    prompt = "\n\n".join(prompt_parts)

    try:
        insight = get_knowledge_insight(prompt, case_id=case_id, top_k=3)
        if not insight:
            return None, None
        return insight.get("answer"), insight.get("citations")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Knowledge agent error: {e}")
        return None, None


@router.post("/chat", response_model=CopilotChatResponse)
async def chat(req: ChatRequest):
    if req.case_id:
        case_doc = get_case(req.case_id)
        if not case_doc:
            return CopilotChatResponse(
                answer=f"I couldn't find data for case {req.case_id}. Please verify the ID and try again."
            )

        if _is_small_talk(req.message):
            return CopilotChatResponse(
                answer=_small_talk_reply(req.message, case_id=req.case_id)
            )
        
        context = CaseContext(case_id=req.case_id, lob=case_doc.get("lob", "Homeowners"))
        vm = build_case_view(context)

        # Build prompt sent to knowledge agent (always)
        case_payload = {
            "case": case_doc,
            "case_view": vm.model_dump(),
            "question": req.message,
        }

        answer, citations = _build_knowledge_answer(
            req.message,
            case_id=req.case_id,
            case_payload=case_payload,
        )

        if not answer:
            answer = "I wasn't able to retrieve an underwriting answer from the knowledge source just now. Please try again."

        return CopilotChatResponse(
            answer=answer,
            suggested_actions=vm.actions,
            decision=vm.decision,
            knowledgeCitations=citations
        )

    # Portfolio mode
    if _is_small_talk(req.message):
        return CopilotChatResponse(
            answer=_small_talk_reply(req.message, portfolio=True)
        )

    # Default portfolio mode
    portfolio_cases = list_cases()
    payload = {
        "portfolio_cases": portfolio_cases,
        "question": req.message,
    }

    answer = await get_chat_completion_async([
        ("system", GLOBAL_SYSTEM_PROMPT),
        (
            "user",
            "Here is the portfolio snapshot:\n" + json.dumps(payload, indent=2) +
            "\nProvide underwriting insights across the portfolio."
        ),
    ])

    return CopilotChatResponse(answer=answer)

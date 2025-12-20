"""
Foundry-backed knowledge agent wrapper.
Uses the Foundry knowledge agent to retrieve and summarize regulatory content.
Returns the same shape used by existing callers (question, answer, citations, generatedAt, relevanceScore).
"""
from datetime import datetime, timezone
import logging
from typing import Dict, Optional

from app.services.agents.foundry_knowledge_agent_client import FoundryKnowledgeAgentClient

logger = logging.getLogger(__name__)

# Initialize client once
_client = FoundryKnowledgeAgentClient()


def get_knowledge_insight(question: str, case_id: str = None, top_k: int = 3) -> Optional[Dict]:
    """Service wrapper for knowledge queries via Foundry knowledge agent."""
    if not question or not question.strip():
        return None

    try:
        logger.info(f"Knowledge query for case {case_id}: {question[:100]}")
        # The Foundry agent handles search+summary; top_k can be included in prompt if needed
        result = _client.ask(question)

        # If the agent returns an empty answer, surface None to caller
        if not result or not result.answer:
            return None

        return {
            "question": result.question,
            "answer": result.answer,
            "citations": result.citations,
            "generatedAt": result.generatedAt or datetime.now(timezone.utc).isoformat(),
            "relevanceScore": result.relevanceScore,
        }
    except Exception as exc:
        logger.error(f"Knowledge agent error for case {case_id}: {exc}")
        return None

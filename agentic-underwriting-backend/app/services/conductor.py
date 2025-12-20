from typing import Optional

from app.models.schemas import AiDecision, CaseContext, CaseViewModel, KnowledgeInsight
from app.services.data_access.local_repo import get_case
from app.services.agents.risk_agent import assess_risk
from app.services.agents.guideline_agent import check_guidelines
from app.services.agents.explainability_agent import generate_explanation, decide
from app.services.agents.foundry_knowledge_agent import get_knowledge_insight


def _coerce_ai_decision(raw: Optional[dict]) -> Optional[AiDecision]:
    if not raw:
        return None
    try:
        return AiDecision(**raw)
    except Exception:
        return None


def _generate_knowledge_queries(case_doc: dict, risk: dict) -> list[str]:
    """Generate contextual knowledge queries based on case characteristics."""
    queries = []
    
    # Extract relevant case attributes
    property_data = case_doc.get("property", {})
    coverage_data = case_doc.get("coverage", {})
    flood_zone = property_data.get("floodZone", "")
    coverage_type = coverage_data.get("type", "")
    lob = case_doc.get("lob", "Homeowners")
    
    # Query 1: Coverage/eligibility based on LOB
    if lob == "Homeowners" and "flood" in coverage_type.lower():
        queries.append("What are the NFIP flood insurance eligibility requirements?")
    elif "FAIR" in coverage_type or "TFPA" in str(case_doc):
        queries.append("When is a property eligible under the Texas FAIR Plan?")
    elif lob == "Homeowners":
        # Default homeowners query
        queries.append("What are the NFIP flood insurance eligibility requirements?")
    
    # Query 2: Risk-specific guidance
    if flood_zone and flood_zone in ["A", "AE", "V", "VE"]:
        queries.append("What are the ICC (Increased Cost of Compliance) requirements for high-risk flood zones?")
    else:
        # Default ICC guidance for homeowners
        queries.append("What are the ICC (Increased Cost of Compliance) requirements for high-risk flood zones?")
    
    # Query 3: Duplicate policy check for flood cases
    if "flood" in lob.lower() or "flood" in coverage_type.lower():
        queries.append("What are the exceptions to duplicate flood policy prohibitions under NFIP?")
    
    # Ensure at least one query is returned
    if not queries:
        queries.append("What are the NFIP flood insurance eligibility requirements?")
    
    # Limit to top 2-3 most relevant queries
    return queries[:3]


def build_case_view(ctx: CaseContext) -> CaseViewModel:
    case_doc = get_case(ctx.case_id) or {}
    risk = assess_risk(ctx, case_doc)
    guidelines = check_guidelines(ctx, case_doc, risk)
    
    # Use decision from case_doc if available, otherwise generate
    decision = case_doc.get("decision") or decide(risk, guidelines)
    
    expl = generate_explanation(ctx, case_doc, risk, guidelines)
    
    # Use summary and support_bullets from case_doc if available, otherwise from explanation
    summary = case_doc.get("summary") or expl["summary"]
    support_bullets = case_doc.get("support_bullets") or expl["bullets"]
    
    tabs = {
        "property_profile": case_doc.get("property", {}),
        "coverage": case_doc.get("coverage", {}),
        "risk": {"risk": risk, "guidelines": guidelines},
        "attachments": {"count": 1, "items": [{"name":"quote.pdf","uri": f"/data/documents/{ctx.case_id}/quote.pdf"}]}
    }
    actions = ["bind","request-info","refer-senior","decline"]
    ai_decision = _coerce_ai_decision(case_doc.get("aiDecision"))
    risk_level = risk.get("level") if isinstance(risk, dict) else None

    title = case_doc.get("title") or case_doc.get("property", {}).get("address") or f"Case {ctx.case_id}"
    decision_type = case_doc.get("decisionType", "HUMAN_REVIEW")
    address = case_doc.get("address") or case_doc.get("property", {}).get("address")
    
    # Generate knowledge insights
    knowledge_insights = []
    queries = _generate_knowledge_queries(case_doc, risk)
    for query in queries:
        try:
            insight_data = get_knowledge_insight(query, case_id=ctx.case_id, top_k=3)
            if insight_data:
                insight = KnowledgeInsight(**insight_data)
                knowledge_insights.append(insight)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to generate insight for '{query}': {e}")

    return CaseViewModel(
        id=ctx.case_id,
        title=title,
        decisionType=decision_type,
        riskLevel=risk_level,
        address=address,
        aiDecision=ai_decision,
        summary = summary,
        decision = decision,
        support_bullets = support_bullets,
        tabs = tabs,
        actions = actions,
        knowledgeInsights = knowledge_insights if knowledge_insights else None
    )

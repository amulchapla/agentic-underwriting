# Not migrated to Foundry Knowledge Agent; kept for reference.
from typing import Dict, List
from app.models.schemas import CaseContext, DecisionOutput
from app.services.sk_kernel import get_llm_response

SUMMARY_PROMPT = """You are an underwriting summarizer.
Given the case JSON, risk findings, and guideline flags, produce:
- A 2–3 sentence **Summary**
- 3–5 bullet **Support** points
Return ONLY a valid JSON object with keys: summary (string), bullets (list of strings). Do NOT include code fences, markdown, or any prose outside the JSON object.
CASE:
{case_json}
RISK:
{risk_json}
GUIDELINES:
{guidelines_json}
"""

def generate_explanation(ctx: CaseContext, case_doc: dict, risk: Dict, guidelines: Dict) -> Dict:
    prompt = SUMMARY_PROMPT.format(
        case_json=case_doc, risk_json=risk, guidelines_json=guidelines
    )
    result = get_llm_response(prompt)
    # Very simple parse fallback
    summary = result.get("summary") if isinstance(result, dict) else str(result)[:300]
    bullets: List[str] = result.get("bullets", []) if isinstance(result, dict) else [
        "Mock bullet: property maintained", "Mock bullet: within appetite", "Mock bullet: pricing favorable"
    ]
    return {"summary": summary, "bullets": bullets}

def decide(risk: Dict, guidelines: Dict) -> DecisionOutput:
    if not guidelines.get("pass", False):
        return DecisionOutput(outcome="NeedsReview", confidence=0.7,
                              justification_md="Guidelines raised flags; human review required.",
                              reasons=guidelines.get("flags", []), flags=guidelines.get("flags", []))
    outcome = "AutoBind" if risk.get("score",1) <= 0.85 else "NeedsReview"
    conf = 0.9 if outcome == "AutoBind" else 0.75
    return DecisionOutput(outcome=outcome, confidence=conf,
                          justification_md=f"Outcome {outcome} based on risk score {risk.get('score')} and guideline pass.")

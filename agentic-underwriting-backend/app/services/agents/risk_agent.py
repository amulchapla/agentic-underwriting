from typing import Dict, Optional

from app.models.schemas import CaseContext


def _derive_level(score: Optional[float]) -> Optional[str]:
    if score is None:
        return None
    if score <= 0.33:
        return "Low"
    if score <= 0.66:
        return "Medium"
    return "High"


def assess_risk(ctx: CaseContext, case_doc: dict) -> Dict:
    property_info = case_doc.get("property", {})
    year = property_info.get("yearBuilt", 2000)
    age_years = max(1, 2025 - int(year))
    sqft = int(property_info.get("sqft", 2000))

    ai_decision = case_doc.get("aiDecision") or {}
    risk_score = ai_decision.get("riskScore")

    if isinstance(risk_score, (int, float)):
        score = round(float(risk_score), 2)
        explanation = (
            f"Risk score {score} sourced from AI decision payload; mapped to underwriting risk level."
        )
    else:
        base = 0.5 + min(0.4, sqft / 10000.0) + min(0.1, age_years / 200.0)
        score = round(min(1.0, base), 2)
        explanation = f"Risk score {score} computed from property heuristics (age={age_years}, sqft={sqft})."

    level = _derive_level(score)

    return {
        "risk_factors": {
            "age_years": age_years,
            "sqft": sqft,
        },
        "score": score,
        "level": level,
        "explanation": explanation,
    }

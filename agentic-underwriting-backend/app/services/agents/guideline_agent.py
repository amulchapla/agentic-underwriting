from typing import Dict, List
from app.models.schemas import CaseContext

ALLOWED_STATES = {"IL","TX","WA","CA"}

def check_guidelines(ctx: CaseContext, case_doc: dict, risk: Dict) -> Dict:
    addr = (case_doc.get("property") or {}).get("address","")
    state = addr.split(",")[-1].strip()[-2:] if "," in addr else "XX"
    flags: List[str] = []
    if state not in ALLOWED_STATES:
        flags.append(f"State {state} out of appetite")
    if risk.get("score",1) > 0.9:
        flags.append("High risk score, manual review")
    return {
        "pass": len(flags) == 0,
        "flags": flags
    }

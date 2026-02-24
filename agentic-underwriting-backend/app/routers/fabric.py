"""
API endpoints for Fabric Data Agent interactions.
Supports async loading and cache management.
"""

from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import FabricPropertySummary, FabricZipClaimStats, FabricRiskAssessment
from app.services.agents.fabric_property_summary import (
    get_property_summary,
    refresh_property_summary
)
from app.services.agents.fabric_zip_stats import (
    get_zip_stats,
    refresh_zip_stats
)
from app.services.agents.fabric_risk_assessment import (
    get_risk_assessment,
    refresh_risk_assessment
)
from app.services.data_access.local_repo import get_case
import logging
import re
import sys

router = APIRouter(prefix="/api/fabric", tags=["fabric"])
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
_uvicorn_err = logging.getLogger("uvicorn.error")
if _uvicorn_err.handlers:
    for _h in _uvicorn_err.handlers:
        logger.addHandler(_h)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:%(name)s:%(message)s"))
    logger.addHandler(_handler)
logger.propagate = False


@router.get("/property-summary/{case_id}", response_model=FabricPropertySummary)
async def fetch_property_summary(
    case_id: str,
    force_refresh: bool = Query(False, description="Bypass cache and fetch fresh data")
):
    """
    Fetch Fabric Function A: Property Support Summary.
    
    Returns cached data if available, otherwise fetches from Fabric (10-20s).
    """
    sys.stderr.write(f"\n>>> [FABRIC] property-summary called for case_id={case_id}, force_refresh={force_refresh}\n")
    sys.stderr.flush()
    
    # Load case to get state/county
    case_doc = get_case(case_id)
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    property_data = case_doc.get("property", {})
    county_code = property_data.get("countyCode")
    
    if not county_code:
        raise HTTPException(
            status_code=400, 
            detail="Case missing countyCode - cannot fetch Fabric data"
        )
    
    # Extract state from address
    address = property_data.get("address", "")
    state = _extract_state(address)
    
    if not state:
        raise HTTPException(status_code=400, detail="Cannot determine state from case data")
    
    try:
        summary = get_property_summary(
            case_id=case_id,
            state=state,
            county_code=county_code,
            force_refresh=force_refresh
        )
        
        if not summary:
            msg = f"[FABRIC ERROR] Property summary returned None for case {case_id} (state={state}, county={county_code})"
            sys.stderr.write(f"\n>>> {msg}\n")
            sys.stderr.flush()
            print(msg, flush=True)
            logger.error(msg)
            raise HTTPException(
                status_code=503, 
                detail="Fabric data unavailable - please try again later"
            )
        
        return summary
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[FABRIC ERROR] Property summary exception for case {case_id}: {e}", flush=True)
        logger.error(f"Fabric property summary error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _extract_state(address: str) -> str:
    """Extract 2-letter state code from address string"""
    # "123 Main St, Austin, TX, 78701" -> "TX"
    
    # Try to find a 2-letter uppercase code after a comma
    pattern = r',\s*([A-Z]{2})\s*,?'
    match = re.search(pattern, address)
    if match:
        return match.group(1)
    
    # Fallback: split by comma and look for state-like part
    parts = address.split(",")
    if len(parts) >= 3:
        state_part = parts[-2].strip()
        # Return first 2 uppercase letters
        state = "".join(c for c in state_part if c.isupper())[:2]
        return state if len(state) == 2 else ""
    
    return ""


@router.get("/zip-stats/{case_id}", response_model=FabricZipClaimStats)
async def fetch_zip_stats(
    case_id: str,
    force_refresh: bool = Query(False, description="Bypass cache and fetch fresh data"),
    years: int = Query(10, ge=1, le=20, description="Number of years to analyze")
):
    """
    Fetch Fabric Function B: ZIP-level claim frequency and average loss.
    
    Returns cached data if available, otherwise fetches from Fabric (10-20s).
    Used for decisioning confidence context.
    """
    sys.stderr.write(f"\n>>> [FABRIC] zip-stats called for case_id={case_id}, years={years}, force_refresh={force_refresh}\n")
    sys.stderr.flush()
    
    # Load case to get ZIP code
    case_doc = get_case(case_id)
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    property_data = case_doc.get("property", {})
    zip_code = property_data.get("zipCode")
    
    if not zip_code:
        raise HTTPException(
            status_code=400, 
            detail="Case missing zipCode - cannot fetch Fabric data"
        )
    
    try:
        stats = get_zip_stats(
            case_id=case_id,
            zip_code=zip_code,
            years=years,
            force_refresh=force_refresh
        )
        
        if not stats:
            msg = f"[FABRIC ERROR] ZIP stats returned None for case {case_id} (zip={zip_code}, years={years})"
            sys.stderr.write(f"\n>>> {msg}\n")
            sys.stderr.flush()
            print(msg, flush=True)
            logger.error(msg)
            raise HTTPException(
                status_code=503, 
                detail="Fabric data unavailable - please try again later"
            )
        
        return stats
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[FABRIC ERROR] ZIP stats exception for case {case_id}: {e}", flush=True)
        logger.error(f"Fabric ZIP stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk-assessment/{case_id}", response_model=FabricRiskAssessment)
async def fetch_risk_assessment(
    case_id: str,
    force_refresh: bool = Query(False, description="Bypass cache and fetch fresh data"),
    min_loss: int = Query(1000, ge=1000, le=500000, description="Minimum loss threshold")
):
    """
    Fetch Fabric Function C: Risk Assessment (severity trends + large losses).
    
    Returns cached data if available, otherwise fetches from Fabric (10-20s).
    Used for Risk Assessment tab analytics.
    """
    sys.stderr.write(f"\n>>> [FABRIC] risk-assessment called for case_id={case_id}, min_loss={min_loss}, force_refresh={force_refresh}\n")
    sys.stderr.flush()
    
    # Load case to get county code
    case_doc = get_case(case_id)
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    property_data = case_doc.get("property", {})
    county_code = property_data.get("countyCode")
    
    if not county_code:
        raise HTTPException(
            status_code=400,
            detail="Case missing countyCode - cannot fetch Fabric data"
        )
    
    try:
        assessment = get_risk_assessment(
            case_id=case_id,
            county_code=county_code,
            min_loss=min_loss,
            force_refresh=force_refresh
        )
        
        if not assessment:
            msg = f"[FABRIC ERROR] Risk assessment returned None for case {case_id} (county={county_code}, min_loss={min_loss})"
            sys.stderr.write(f"\n>>> {msg}\n")
            sys.stderr.flush()
            print(msg, flush=True)
            logger.error(msg)
            raise HTTPException(
                status_code=503,
                detail="Fabric data unavailable - please try again later"
            )
        
        return assessment
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[FABRIC ERROR] Risk assessment exception for case {case_id}: {e}", flush=True)
        logger.error(f"Fabric risk assessment error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

"""
Service wrapper for Fabric Function A: Property Support Summary.
Handles caching, parsing, and error handling.
"""

import logging
from typing import Optional, List, Any
from datetime import datetime, timedelta

from app.services.agents.foundry_fabric_data_agent import property_support_summary
from app.services.cache.fabric_cache import (
    get_cached_response, 
    set_cached_response,
    invalidate_cache
)
from app.models.schemas import FabricPropertySummary, FabricCountyClaimRow

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


def get_property_summary(
    case_id: str,
    state: str,
    county_code: str,
    force_refresh: bool = False,
    top_n: int = 15
) -> Optional[FabricPropertySummary]:
    """
    Fetch or retrieve cached property summary from Fabric.
    
    Args:
        case_id: Case identifier
        state: State code (e.g., "TX")
        county_code: County FIPS code (e.g., "48229")
        force_refresh: Bypass cache and fetch fresh data
        top_n: Number of sample counties to return
    
    Returns:
        FabricPropertySummary or None if unavailable
    """
    
    # Check cache first (unless force refresh)
    if not force_refresh:
        cached = get_cached_response("A", case_id, state=state, county=county_code)
        if cached:
            try:
                return FabricPropertySummary(**cached["response_data"])
            except Exception as e:
                logger.warning(f"Invalid cached data, re-fetching: {e}")
    
    # Fetch from Fabric (this takes 10-20 seconds!)
    logger.info(f"Fetching Fabric Function A for case {case_id} (state={state}, county={county_code})")
    
    try:
        # Returns structured dict with status, summary, response fields
        raw_response = property_support_summary(top_n=top_n, state=state, countyCode=county_code)
        
        # Check status
        if raw_response.get("status") == "error":
            msg = f"[FABRIC ERROR] Function A error: {raw_response.get('comments', 'Unknown error')} | Full response: {raw_response}"
            print(msg, flush=True)
            logger.error(msg)
            return None
        
        if raw_response.get("status") == "no_data":
            msg = f"[FABRIC WARNING] Function A returned no data: {raw_response.get('comments', '')} | Full response: {raw_response}"
            print(msg, flush=True)
            logger.warning(msg)
            return None
        
        # Parse response array into typed rows
        response_data = raw_response.get("response", [])
        rows = []
        
        for row_dict in response_data:
            try:
                # Validate and parse each row
                row = FabricCountyClaimRow(**row_dict)
                rows.append(row)
            except Exception as e:
                logger.warning(f"Skipping invalid row: {e} | Row: {row_dict}")
                continue
        
        if not rows:
            print(f"[FABRIC WARNING] Function A: No valid rows parsed from response. Raw response_data: {response_data}", flush=True)
            logger.warning("No valid rows in Fabric response")
            return None
        
        # Calculate aggregates
        total_counties = len(set(r.county_code for r in rows))
        total_claims = sum(r.claims_count for r in rows)
        
        # Weighted average of avg_paid_per_claim
        total_paid = sum(r.paid_total for r in rows)
        avg_paid_overall = total_paid / total_claims if total_claims > 0 else 0
        
        now = datetime.utcnow()
        summary = FabricPropertySummary(
            rows=rows,
            total_counties=total_counties,
            total_claims=total_claims,
            avg_paid_overall=avg_paid_overall,
            cached_at=now.isoformat(),
            cache_expires_at=(now + timedelta(hours=72)).isoformat(),
            raw_response=raw_response  # Keep for debugging
        )
        
        # Cache the response
        set_cached_response(
            "A", 
            case_id, 
            summary.model_dump(), 
            ttl_hours=72,
            state=state,
            county=county_code
        )
        
        return summary
    
    except Exception as e:
        print(f"[FABRIC ERROR] Function A unexpected exception: {e}", flush=True)
        import traceback; traceback.print_exc()
        logger.error(f"Fabric Function A error: {e}")
        return None


def refresh_property_summary(case_id: str, state: str, county_code: str) -> Optional[FabricPropertySummary]:
    """Force refresh (invalidate cache and re-fetch)"""
    invalidate_cache("A", case_id, state=state, county=county_code)
    return get_property_summary(case_id, state, county_code, force_refresh=True)


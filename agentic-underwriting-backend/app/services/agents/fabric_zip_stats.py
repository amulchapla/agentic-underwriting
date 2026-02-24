"""
Service layer for Fabric Function B: Decisioning Intelligence (ZIP claim stats).
Wraps fabric_data_agent.decisioning_claim_freq_avg_loss_zip().
"""

from typing import Optional
import logging
import re
from datetime import datetime, timedelta

from app.models.schemas import FabricZipClaimStats
from app.services.cache.fabric_cache import (
    get_cached_response,
    set_cached_response,
    invalidate_cache
)
from app.services.agents.foundry_fabric_data_agent import decisioning_claim_freq_avg_loss_zip

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

CACHE_TTL_HOURS = 72


def get_zip_stats(
    case_id: str,
    zip_code: str,
    years: int = 10,
    force_refresh: bool = False
) -> Optional[FabricZipClaimStats]:
    """
    Get ZIP-level claim statistics from Fabric with caching.
    
    Args:
        case_id: Case identifier for cache key
        zip_code: 5-digit ZIP code
        years: Number of years to look back (default 10)
        force_refresh: Bypass cache and fetch fresh data
    
    Returns:
        FabricZipClaimStats or None if unavailable
    """
    
    # Check cache unless force refresh
    if not force_refresh:
        cached = get_cached_response("B", case_id, zip_code=zip_code, years=f"{years}y")
        if cached:
            logger.info(f"Cache hit for Function B: {case_id}")
            # Extract response_data from cache payload
            response_data = cached.get("response_data", cached)
            return FabricZipClaimStats(**response_data)
    
    # Fetch from Fabric
    logger.info(f"Fetching Function B from Fabric: zip={zip_code}, years={years}")
    
    try:
        # Returns structured dict with status, summary, response fields
        raw_response = decisioning_claim_freq_avg_loss_zip(
            zip_code=zip_code,
            years=years
        )
        
        # Check status
        if raw_response.get("status") == "error":
            msg = f"[FABRIC ERROR] Function B error: {raw_response.get('comments', 'Unknown error')} | Full response: {raw_response}"
            print(msg, flush=True)
            logger.error(msg)
            return None
        
        if raw_response.get("status") == "no_data":
            msg = f"[FABRIC WARNING] Function B returned no data: {raw_response.get('comments', '')} | Full response: {raw_response}"
            print(msg, flush=True)
            logger.warning(msg)
            return None
        
        # Aggregate response data
        response_data = raw_response.get("response", [])
        total_claims = 0
        total_paid = 0.0
        
        for row in response_data:
            total_claims += int(row.get("claims_count", 0))
            avg_loss_per_row = float(row.get("avg_loss", 0))
            claims_count = int(row.get("claims_count", 0))
            # Reconstruct total paid from avg * count
            total_paid += avg_loss_per_row * claims_count
        
        avg_loss = total_paid / total_claims if total_claims > 0 else 0.0
        
        now = datetime.now()
        stats = FabricZipClaimStats(
            zip_code=zip_code,
            years=years,
            claim_frequency=total_claims,
            avg_loss=avg_loss,
            cached_at=now.isoformat(),
            cache_expires_at=(now + timedelta(hours=CACHE_TTL_HOURS)).isoformat(),
            raw_response=raw_response
        )
        
        # Store in cache
        set_cached_response(
            "B", 
            case_id, 
            stats.model_dump(), 
            ttl_hours=CACHE_TTL_HOURS,
            zip_code=zip_code,
            years=f"{years}y"
        )
        logger.info(f"Cached Function B result for {case_id}: {total_claims} claims, ${avg_loss:.2f} avg")
        
        return stats
    
    except Exception as e:
        print(f"[FABRIC ERROR] Function B unexpected exception: {e}", flush=True)
        import traceback; traceback.print_exc()
        logger.error(f"Error fetching Function B data: {e}")
        return None


def refresh_zip_stats(case_id: str, zip_code: str, years: int = 10) -> Optional[FabricZipClaimStats]:
    """Force refresh ZIP stats by invalidating cache and fetching fresh data"""
    invalidate_cache("B", case_id, zip_code=zip_code, years=f"{years}y")
    return get_zip_stats(case_id, zip_code, years, force_refresh=True)


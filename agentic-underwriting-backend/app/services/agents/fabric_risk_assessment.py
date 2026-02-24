"""
Service layer for Fabric Function C: Risk Assessment (severity trends + large losses).
Wraps fabric_data_agent.risk_assessment_severity_and_large_losses().
"""

from typing import Optional, List
import logging
from datetime import datetime, timedelta

from app.models.schemas import FabricAgentTable, FabricRiskAssessment
from app.services.cache.fabric_cache import (
    get_cached_response,
    set_cached_response,
    invalidate_cache
)
from app.services.agents.foundry_fabric_data_agent import risk_assessment_severity_and_large_losses

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


def get_risk_assessment(
    case_id: str,
    county_code: str,
    min_loss: int = 1000,
    force_refresh: bool = False
) -> Optional[FabricRiskAssessment]:
    """
    Get risk assessment from Fabric with caching.
    
    Args:
        case_id: Case identifier for cache key
        county_code: FIPS county code
        min_loss: Minimum loss threshold for large claims (default $1K)
        force_refresh: Bypass cache and fetch fresh data
    
    Returns:
        FabricRiskAssessment or None if unavailable
    """
    
    # Check cache unless force refresh
    if not force_refresh:
        cached = get_cached_response("C", case_id, county=county_code, min_loss=str(min_loss))
        if cached:
            logger.info(f"Cache hit for Function C: {case_id}")
            response_data = cached.get("response_data", cached)
            upgraded = _upgrade_cached_payload(response_data)
            return FabricRiskAssessment(**upgraded)
    
    # Fetch from Fabric
    logger.info(f"Fetching Function C from Fabric: county={county_code}, min_loss={min_loss}")
    
    try:
        # Returns dict with severity and large_losses, each containing structured responses
        raw_response = risk_assessment_severity_and_large_losses(
            county_code=county_code,
            min_loss=min_loss
        )
        
        # Extract structured responses
        severity_data = raw_response.get("severity", {})
        large_losses_data = raw_response.get("large_losses", {})

        severity_table = _build_agent_table(severity_data, "severity")
        large_losses_table = _build_agent_table(large_losses_data, "large_losses")

        if not _table_has_rows(severity_table) and not _table_has_rows(large_losses_table):
            msg = f"[FABRIC WARNING] Function C: No valid data in response for county={county_code} | severity={severity_data} | large_losses={large_losses_data}"
            print(msg, flush=True)
            logger.warning(msg)
            return None
        
        # Build assessment
        now = datetime.now()
        assessment = FabricRiskAssessment(
            severity_table=severity_table,
            large_losses_table=large_losses_table,
            county_code=county_code,
            min_loss_threshold=float(min_loss),
            cached_at=now.isoformat(),
            cache_expires_at=(now + timedelta(hours=CACHE_TTL_HOURS)).isoformat(),
            raw_severity=severity_data,
            raw_large_losses=large_losses_data
        )
        
        # Cache the result
        set_cached_response(
            "C",
            case_id,
            assessment.model_dump(),
            ttl_hours=CACHE_TTL_HOURS,
            county=county_code,
            min_loss=str(min_loss)
        )
        severity_row_count = severity_table.row_count if severity_table else 0
        large_loss_count = large_losses_table.row_count if large_losses_table else 0
        logger.info(
            f"Cached Function C result for {case_id}: {severity_row_count} severity rows, {large_loss_count} large loss rows"
        )
        
        return assessment
    
    except Exception as e:
        print(f"[FABRIC ERROR] Function C unexpected exception: {e}", flush=True)
        import traceback; traceback.print_exc()
        logger.error(f"Error fetching Function C data: {e}")
        return None


def refresh_risk_assessment(case_id: str, county_code: str, min_loss: int = 1000) -> Optional[FabricRiskAssessment]:
    """Force refresh risk assessment by invalidating cache and fetching fresh data"""
    invalidate_cache("C", case_id, county=county_code, min_loss=str(min_loss))
    return get_risk_assessment(case_id, county_code, min_loss, force_refresh=True)


def _build_agent_table(data: Optional[dict], context: str) -> Optional[FabricAgentTable]:
    if not isinstance(data, dict):
        return None

    status = data.get("status") or "unknown"
    raw_rows = data.get("response")
    rows: List[dict] = []

    if isinstance(raw_rows, list):
        for idx, row in enumerate(raw_rows):
            if isinstance(row, dict):
                rows.append(row)
            else:
                logger.warning(f"Skipping non-dict row at index {idx} in {context} response")

    column_keys = data.get("column_keys")
    if isinstance(column_keys, list):
        column_keys = [str(key) for key in column_keys if isinstance(key, (str, int, float))]
    else:
        column_keys = _derive_column_keys(rows)

    try:
        table = FabricAgentTable(
            status=status,
            column_count=_coerce_int(data.get("columns")),
            row_count=_coerce_int(data.get("rows")) or len(rows),
            summary=data.get("summary"),
            comments=data.get("comments"),
            response=rows,
            column_keys=column_keys,
        )
        return table
    except Exception as exc:
        logger.error(f"Failed to build FabricAgentTable for {context}: {exc}")
        return None


def _derive_column_keys(rows: List[dict]) -> List[str]:
    ordered_keys: List[str] = []
    for row in rows:
        for key in row.keys():
            if key not in ordered_keys:
                ordered_keys.append(key)
    return ordered_keys


def _table_has_rows(table: Optional[FabricAgentTable]) -> bool:
    if not table:
        return False
    return len(table.response) > 0


def _upgrade_cached_payload(data: dict) -> dict:
    """Normalize legacy cached payloads to the latest schema."""
    if not isinstance(data, dict):
        return {}

    upgraded = dict(data)

    if "severity_table" not in upgraded:
        severity_table = _build_agent_table(upgraded.get("raw_severity"), "severity")
        if not severity_table and upgraded.get("severity_rows"):
            severity_rows = upgraded.get("severity_rows", [])
            severity_table = FabricAgentTable(
                status="success",
                column_count=len(severity_rows[0]) if severity_rows else None,
                row_count=len(severity_rows),
                response=severity_rows,
                column_keys=_derive_column_keys(severity_rows),
            )
        upgraded["severity_table"] = severity_table.model_dump() if severity_table else None

    if "large_losses_table" not in upgraded:
        large_losses_table = _build_agent_table(upgraded.get("raw_large_losses"), "large_losses")
        if not large_losses_table and upgraded.get("large_losses"):
            large_rows = upgraded.get("large_losses", [])
            large_losses_table = FabricAgentTable(
                status="success",
                column_count=len(large_rows[0]) if large_rows else None,
                row_count=len(large_rows),
                response=large_rows,
                column_keys=_derive_column_keys(large_rows),
            )
        upgraded["large_losses_table"] = large_losses_table.model_dump() if large_losses_table else None

    upgraded.pop("severity_rows", None)
    upgraded.pop("large_losses", None)

    return upgraded


def _coerce_int(value: object) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


"""
File-based caching for Fabric Data Agent responses.
Uses local JSON files with TTL-based expiration.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

CACHE_DIR = Path("data/fabric_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_TTL_HOURS = 72  # 72-hour cache


def _get_cache_key(function_id: str, case_id: str, **kwargs) -> str:
    """Generate cache filename based on function and parameters"""
    # Example: fabric_A_C-123_TX_48229.json
    parts = [f"fabric_{function_id}", case_id]
    for k, v in sorted(kwargs.items()):
        if v:
            parts.append(str(v))
    return "_".join(parts) + ".json"


def get_cached_response(
    function_id: str, 
    case_id: str, 
    **kwargs
) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached Fabric response if valid.
    
    Returns:
        Cached data dict or None if expired/missing
    """
    cache_key = _get_cache_key(function_id, case_id, **kwargs)
    cache_file = CACHE_DIR / cache_key
    
    if not cache_file.exists():
        logger.info(f"Cache miss: {cache_key}")
        return None
    
    try:
        with open(cache_file, "r", encoding="utf-8") as f:
            cached = json.load(f)
        
        # Check expiration
        expires_at = datetime.fromisoformat(cached.get("cache_expires_at", "2000-01-01"))
        if datetime.utcnow() > expires_at:
            logger.info(f"Cache expired: {cache_key}")
            cache_file.unlink()  # Delete expired cache
            return None
        
        logger.info(f"Cache hit: {cache_key}")
        return cached
    
    except Exception as e:
        logger.error(f"Cache read error: {e}")
        return None


def set_cached_response(
    function_id: str,
    case_id: str,
    response_data: Dict[str, Any],
    ttl_hours: int = DEFAULT_TTL_HOURS,
    **kwargs
) -> None:
    """
    Store Fabric response to cache with TTL.
    
    Args:
        function_id: "A", "B", "C", etc.
        case_id: Case identifier
        response_data: The data to cache (must be JSON-serializable)
        ttl_hours: Time-to-live in hours
    """
    cache_key = _get_cache_key(function_id, case_id, **kwargs)
    cache_file = CACHE_DIR / cache_key
    
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=ttl_hours)
    
    cache_payload = {
        "function_id": function_id,
        "case_id": case_id,
        "response_data": response_data,
        "cached_at": now.isoformat(),
        "cache_expires_at": expires_at.isoformat(),
        "cache_params": kwargs
    }
    
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(cache_payload, f, indent=2)
        logger.info(f"Cached response: {cache_key} (expires: {expires_at})")
    except Exception as e:
        logger.error(f"Cache write error: {e}")


def invalidate_cache(function_id: str, case_id: str, **kwargs) -> bool:
    """
    Delete cached response to force refresh.
    
    Returns:
        True if cache was deleted, False if not found
    """
    cache_key = _get_cache_key(function_id, case_id, **kwargs)
    cache_file = CACHE_DIR / cache_key
    
    if cache_file.exists():
        cache_file.unlink()
        logger.info(f"Cache invalidated: {cache_key}")
        return True
    
    return False


def list_cached_files(function_id: Optional[str] = None) -> list[str]:
    """List all cached files, optionally filtered by function"""
    pattern = f"fabric_{function_id}_*.json" if function_id else "fabric_*.json"
    return [f.name for f in CACHE_DIR.glob(pattern)]

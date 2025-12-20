# Location Intelligence Agent - Documentation

## Overview

The Location Intelligence Agent provides comprehensive location data for any US ZIP code through integration with Azure Maps APIs. It's designed for backend API use and delivers location coordinates, administrative context, weather alerts, drive-time zones (isochrones), and map visualizations.

## Primary Function

### `get_location_intelligence(zipcode, country="US", time_minutes=15, generate_files=True)`

**Purpose:** Single-call function to get complete location intelligence package

**Parameters:**
- `zipcode` (str): ZIP/postal code (e.g., "77002", "94102")
- `country` (str, optional): ISO country code (default: "US")
- `time_minutes` (int, optional): Drive time for isochrone in minutes (default: 15)
- `generate_files` (bool, optional): Whether to create HTML and PNG files (default: True)

**Returns:** Dict with structure:
```python
{
    "success": bool,
    "error": str | None,
    "data": {
        "input": {
            "zipcode": str,
            "country": str,
            "driveTimeMinutes": int
        },
        "location": {
            "lat": float,
            "lon": float,
            "address": str,
            "admin": {
                "municipality": str,
                "county": str,
                "state": str,
                "country": str,
                "postalCode": str
            },
            "confidence": float
        },
        "weather": {
            "alerts": [
                {
                    "headline": str,
                    "severity": str,
                    "effective": str,
                    "expires": str,
                    "source": str
                }
            ],
            "count": int
        },
        "isochrone": {
            "type": "Feature",
            "properties": {
                "timeMinutes": int,
                "timeSeconds": int,
                "center": dict,
                "description": str
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[lon, lat], ...]]
            }
        },
        "files": {  # Only if generate_files=True
            "html": str,  # Path to interactive map
            "png": str    # Path to static map
        }
    }
}
```

**Example Usage:**
```python
from LocationIntelligence_Agent import get_location_intelligence

# Get full intelligence package with files
result = get_location_intelligence("77002", time_minutes=15)

if result["success"]:
    data = result["data"]
    print(f"Location: {data['location']['address']}")
    print(f"Weather alerts: {data['weather']['count']}")
    print(f"Interactive map: {data['files']['html']}")
else:
    print(f"Error: {result['error']}")
```

---

## Core Functions

### Geocoding

#### `geocode_zipcode(zipcode, country="US")`
Convert ZIP/postal code to coordinates and location details.

**Returns:**
```python
{
    "lat": float,
    "lon": float,
    "address": str,
    "admin": {
        "municipality": str,
        "county": str,
        "state": str,
        "country": str,
        "postalCode": str
    },
    "confidence": float
}
```

**Example:**
```python
location = geocode_zipcode("77002")
print(f"Coordinates: {location['lat']}, {location['lon']}")
```

#### `reverse_geocode(lat, lon)`
Get address and administrative details from coordinates.

**Returns:**
```python
{
    "address": str,
    "admin": {
        "municipality": str,
        "county": str,
        "state": str,
        "country": str
    }
}
```

---

### Weather

#### `weather_alerts(lat, lon)`
Get weather alerts or current conditions (with automatic fallback).

**Behavior:**
- Attempts to fetch weather alerts from `/weather/alerts/json`
- Falls back to current conditions if alerts endpoint unavailable (404)
- Returns empty list if both fail

**Returns:**
```python
[
    {
        "headline": str,
        "severity": str,
        "effective": str,
        "expires": str,
        "source": str
    }
]
```

**Example:**
```python
alerts = weather_alerts(29.7604, -95.3698)
for alert in alerts:
    print(f"{alert['severity']}: {alert['headline']}")
```

---

### Maps & Visualization

#### `static_map_png(lat, lon, zoom=13, width=1000, height=600, pin=True)`
Generate static map image with optional pin marker.

**Features:**
- Three-tier API fallback for reliability
- Attempts: Render API v2.0 → Map Static v2022-08-01 → 1px placeholder
- Returns PNG bytes ready for file write or base64 encoding

**Example:**
```python
png_bytes = static_map_png(29.7604, -95.3698, zoom=14)
with open("map.png", "wb") as f:
    f.write(png_bytes)
```

#### `isochrone(lat, lon, time_sec=900)`
Get drive-time polygon from Azure Maps Route Range API.

**Parameters:**
- `time_sec` (int): Time budget in seconds (default: 900 = 15 minutes)

**Returns:** Raw Azure Maps isochrone response dict

#### `isochrone_to_geojson(isochrone_data, time_minutes=15)`
Convert Azure Maps isochrone to standard GeoJSON Feature.

**Returns:**
```python
{
    "type": "Feature",
    "properties": {
        "timeMinutes": int,
        "timeSeconds": int,
        "center": dict,
        "description": str
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[lon, lat], ...]]
    }
}
```

**Usage:**
```python
iso_raw = isochrone(lat, lon, time_sec=600)  # 10 minutes
iso_geojson = isochrone_to_geojson(iso_raw, time_minutes=10)

# Now compatible with Leaflet.js, Mapbox GL JS, etc.
# L.geoJSON(iso_geojson).addTo(map);
```

#### `build_interactive_map(lat, lon, context, alerts, isochrone_json, map_png, output_path)`
Generate interactive HTML map using Leaflet.js.

**Features:**
- OpenStreetMap tiles (no Azure subscription needed for tiles)
- Isochrone polygon overlay
- Property marker with popup
- Weather alerts display
- Static map embed
- GeoJSON and context data display
- Responsive design

**Example:**
```python
build_interactive_map(
    lat=29.7604,
    lon=-95.3698,
    context={"address": "Houston, TX"},
    alerts=[{"headline": "Clear skies", "severity": "Info"}],
    isochrone_json=iso_raw,
    map_png=png_bytes,
    output_path="location_intel.html"
)
```

---

## API Integration

### For FastAPI/Flask Backends

#### API-Only Response (No Files)

```python
from LocationIntelligence_Agent import format_api_response

@app.get("/api/location-intelligence")
async def location_intelligence(zipcode: str, time_minutes: int = 15):
    """
    GET /api/location-intelligence?zipcode=77002&time_minutes=15
    """
    return format_api_response(zipcode, time_minutes=time_minutes)
```

#### With File Generation

```python
from LocationIntelligence_Agent import get_location_intelligence

@app.post("/api/location-report")
async def generate_report(zipcode: str, time_minutes: int = 15):
    """
    POST /api/location-report
    Body: {"zipcode": "77002", "time_minutes": 15}
    """
    result = get_location_intelligence(zipcode, time_minutes=time_minutes)
    
    if result["success"]:
        return {
            "message": "Report generated successfully",
            "data": result["data"],
            "files": {
                "interactive_map": f"/downloads/{result['data']['files']['html']}",
                "static_map": f"/downloads/{result['data']['files']['png']}"
            }
        }
    else:
        return {"error": result["error"]}, 400
```

---

## Configuration

### Environment Variables

Set Azure Maps subscription key:

**Windows PowerShell:**
```powershell
$env:AZURE_MAPS_SUBSCRIPTION_KEY = "your-key-here"
```

**Linux/Mac:**
```bash
export AZURE_MAPS_SUBSCRIPTION_KEY="your-key-here"
```

**In Code (Not Recommended for Production):**
```python
# LocationIntelligence_Agent.py - hardcoded fallback
AZURE_MAPS_SUBSCRIPTION_KEY = "your-key-here"
```

---

## Command Line Usage

```bash
# Basic usage (15-minute drive time)
python LocationIntelligence_Agent.py 77002

# Custom drive time (30 minutes)
python LocationIntelligence_Agent.py 94102 30

# Output example:
======================================================================
Location Intelligence Agent
======================================================================

✅ SUCCESS - ZIP Code: 77002

📍 Location:
   Address: Houston, TX 77002, USA
   Coordinates: 29.76042, -95.36980
   State: TX

🌤️  Weather:
   Alerts: 1

📊 Drive-Time Zone:
   Time: 15 minutes

📁 Files Generated:
   HTML: location_intel_77002.html
   PNG:  location_intel_77002.png

======================================================================
```

---

## Error Handling

All functions return error information in a consistent format:

**Success Response:**
```python
{"success": True, "error": None, "data": {...}}
```

**Error Response:**
```python
{"success": False, "error": "Description of error", "data": None}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "ZIP code not found" | Invalid or non-US ZIP | Verify ZIP code and country parameter |
| "404 Not Found" | Weather alerts endpoint unavailable | Automatic fallback to current conditions |
| "401 Unauthorized" | Invalid subscription key | Check `AZURE_MAPS_SUBSCRIPTION_KEY` |
| "400 Bad Request" | Invalid parameters | Verify lat/lon ranges, time values |

---

## Azure Maps API Endpoints Used

1. **Search - Address**
   - Endpoint: `/search/address/json`
   - Purpose: Geocode ZIP codes to coordinates
   - API Version: 1.0

2. **Search - Address Reverse**
   - Endpoint: `/search/address/reverse/json`
   - Purpose: Reverse geocode coordinates to addresses
   - API Version: 1.0

3. **Weather - Alerts**
   - Endpoint: `/weather/alerts/json`
   - Purpose: Get weather alerts (with fallback)
   - API Version: 1.1

4. **Weather - Current Conditions**
   - Endpoint: `/weather/currentConditions/json`
   - Purpose: Fallback when alerts unavailable
   - API Version: 1.0

5. **Render - Static Map**
   - Endpoint: `/render/static/png`
   - Purpose: Generate static map images
   - API Version: 2.0 (with fallbacks)

6. **Route - Range (Isochrone)**
   - Endpoint: `/route/range/json`
   - Purpose: Calculate drive-time polygons
   - API Version: 1.0

---

## GeoJSON Standard

The agent outputs isochrones in standard GeoJSON format, compatible with:

- **Leaflet.js:** `L.geoJSON(data).addTo(map)`
- **Mapbox GL JS:** `map.addSource('iso', {type: 'geojson', data: data})`
- **Google Maps:** `map.data.addGeoJson(data)`
- **QGIS/ArcGIS:** Import directly as vector layer
- **PostGIS:** `ST_GeomFromGeoJSON()`

**Example GeoJSON Structure:**
```json
{
  "type": "Feature",
  "properties": {
    "timeMinutes": 15,
    "timeSeconds": 900,
    "description": "15-minute drive time area"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-95.3698, 29.7604],
      [-95.3701, 29.7610],
      ...
      [-95.3698, 29.7604]
    ]]
  }
}
```

---

## Performance Considerations

- **API Calls:** Primary function makes 4 API calls (geocode, reverse geocode, weather, isochrone)
- **Response Time:** Typically 2-4 seconds for complete intelligence package
- **File Generation:** HTML/PNG creation adds ~0.5-1 second
- **Caching Recommended:** Cache geocoding results by ZIP code for 24+ hours
- **Rate Limits:** Azure Maps free tier: 50 requests/second, 250,000/month

---

## Testing

```python
# Test geocoding
location = geocode_zipcode("10001")  # New York
assert location is not None
assert location["admin"]["state"] == "NY"

# Test weather
alerts = weather_alerts(40.7128, -74.0060)  # NYC
assert isinstance(alerts, list)

# Test isochrone
iso = isochrone(40.7128, -74.0060, time_sec=600)
iso_geo = isochrone_to_geojson(iso, time_minutes=10)
assert iso_geo["type"] == "Feature"
assert iso_geo["geometry"]["type"] == "Polygon"

# Test full agent
result = get_location_intelligence("10001", time_minutes=20, generate_files=False)
assert result["success"] == True
assert result["data"]["location"]["admin"]["state"] == "NY"
```

---

## Production Deployment

### Best Practices

1. **API Key Security:**
   ```python
   # Use environment variables or secret management
   import os
   key = os.getenv("AZURE_MAPS_SUBSCRIPTION_KEY")
   if not key:
       raise ValueError("Azure Maps key not configured")
   ```

2. **Response Caching:**
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=1000)
   def cached_geocode(zipcode: str):
       return geocode_zipcode(zipcode)
   ```

3. **Async Operations (if using async framework):**
   ```python
   import aiohttp
   
   async def async_location_intelligence(zipcode: str):
       # Parallel API calls for faster response
       tasks = [
           get_weather_async(lat, lon),
           get_isochrone_async(lat, lon),
           # ...
       ]
       results = await asyncio.gather(*tasks)
   ```

4. **Error Logging:**
   ```python
   import logging
   
   logging.basicConfig(level=logging.INFO)
   logger = logging.getLogger(__name__)
   
   # In functions:
   except Exception as e:
       logger.error(f"Geocoding failed for {zipcode}: {e}")
   ```

---

## Differences from LocationIntelligence_Features.py

| Aspect | Agent (Production) | Features (Development) |
|--------|-------------------|------------------------|
| **Size** | ~450 lines | ~1095 lines |
| **Comments** | Minimal (this doc) | Extensive inline |
| **Functions** | Core 9 functions | 20+ functions |
| **Testing** | CLI only | Embedded test/demo code |
| **Focus** | `get_location_intelligence()` | Individual feature exploration |
| **Files Generated** | Optional parameter | Always generated |
| **Error Messages** | User-friendly | Developer-detailed |

---

## Roadmap / Future Enhancements

- [ ] Async API support for parallel calls
- [ ] Multiple isochrone intervals (5, 10, 15 min)
- [ ] Traffic-aware isochrones (time-of-day routing)
- [ ] Batch processing for multiple ZIP codes
- [ ] Redis caching integration
- [ ] Prometheus metrics for API monitoring
- [ ] OpenAPI/Swagger documentation generation
- [ ] Docker containerization
- [ ] Additional map styles/themes

---

## Support & References

**Azure Maps Documentation:**
- [Search API](https://docs.microsoft.com/azure/azure-maps/how-to-search-for-address)
- [Weather API](https://docs.microsoft.com/azure/azure-maps/weather-services-concepts)
- [Route Range (Isochrone)](https://docs.microsoft.com/rest/api/maps/route/post-route-range)
- [Render API](https://docs.microsoft.com/azure/azure-maps/how-to-render-custom-data)

**Standards:**
- [GeoJSON Specification (RFC 7946)](https://tools.ietf.org/html/rfc7946)
- [Leaflet.js Documentation](https://leafletjs.com/reference.html)

**Related Files:**
- `LocationIntelligence_Features.py` - Full development version with all features
- `example_api_usage.py` - FastAPI server implementation
- `BACKEND_API_GUIDE.md` - Backend integration guide
- `ZIP_CODE_GUIDE.md` - ZIP code functionality guide

---

## License & Attribution

This agent uses Azure Maps APIs. Ensure compliance with [Azure Maps Terms of Use](https://azure.microsoft.com/support/legal/).

Map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors

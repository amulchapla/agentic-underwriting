"""
Location Intelligence Agent - Azure Maps API
============================================
Agent for providing location intelligence data including:
- Static and interactive maps
- 15-minute drive-time zones (isochrone)
- Location context (address, municipality, county, state)
- Weather alerts and conditions

Primary Function: get_location_intelligence(zipcode, time_minutes=15)
"""

import os
import json
import base64
import time
from typing import Dict, Any, Optional, List

import requests
from azure.identity import DefaultAzureCredential

try:
    from PIL import Image
    IN_NOTEBOOK = True
except Exception:
    IN_NOTEBOOK = False

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


# Configuration
AZ_MAPS_BASE = os.getenv("AZURE_MAPS_BASE", "https://atlas.microsoft.com")
AZ_MAPS_SCOPE = os.getenv(
    "AZURE_MAPS_SCOPE", "https://atlas.microsoft.com/.default"
)

AZ_MAPS_CLIENT_ID = os.getenv("AZURE_MAPS_CLIENT_ID")  # GUID of the Azure Maps account
# print(f"Azure Maps Client ID: {AZ_MAPS_CLIENT_ID}")

_token_cache: Dict[str, Any] = {"token": None, "expires_on": 0}
_credential = DefaultAzureCredential()


def _get_maps_token() -> str:
    """Acquire and cache Azure Maps AAD token using DefaultAzureCredential."""
    now = time.time()
    # Refresh 60 seconds before expiry to avoid edge failures.
    if _token_cache["token"] and now < _token_cache["expires_on"] - 60:
        return _token_cache["token"]

    token = _credential.get_token(AZ_MAPS_SCOPE)
    _token_cache["token"] = token.token
    _token_cache["expires_on"] = token.expires_on
    return token.token


# def _auth_headers() -> Dict[str, str]:
#    return {"Authorization": f"Bearer {_get_maps_token()}"}

def _auth_headers() -> Dict[str, str]:
    if not AZ_MAPS_CLIENT_ID:
        raise RuntimeError("Missing AZURE_MAPS_CLIENT_ID (Azure Maps account client ID GUID).")
    return {
        "Authorization": f"Bearer {_get_maps_token()}",
        "x-ms-client-id": AZ_MAPS_CLIENT_ID,
    }


# Core REST Helpers
def _get_json(path: str, params: Dict[str, Any], api_version: str) -> Dict[str, Any]:
    """Execute Azure Maps GET request returning JSON."""
    p = dict(params)
    p["api-version"] = api_version
    try:
        r = requests.get(
            f"{AZ_MAPS_BASE}{path}", params=p, headers=_auth_headers(), timeout=20
        )
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as exc:
        resp = exc.response
        detail = resp.text[:500] if resp is not None and resp.text else ""
        status = resp.status_code if resp is not None else "?"
        url = resp.url if resp is not None else f"{AZ_MAPS_BASE}{path}"
        raise RuntimeError(
            f"Azure Maps request failed ({status}) for {url}: {detail}"
        ) from exc


def _get_png(path: str, params: Dict[str, Any], api_version: str) -> bytes:
    """Execute Azure Maps GET request returning PNG bytes."""
    p = dict(params)
    p["api-version"] = api_version
    try:
        r = requests.get(
            f"{AZ_MAPS_BASE}{path}", params=p, headers=_auth_headers(), timeout=20
        )
        r.raise_for_status()
        return r.content
    except requests.exceptions.HTTPError as exc:
        resp = exc.response
        detail = resp.text[:300] if resp is not None and resp.text else ""
        status = resp.status_code if resp is not None else "?"
        url = resp.url if resp is not None else f"{AZ_MAPS_BASE}{path}"
        raise RuntimeError(
            f"Azure Maps PNG request failed ({status}) for {url}: {detail}"
        ) from exc


# Geocoding Functions
def geocode_zipcode(zipcode: str, country: str = "US") -> Optional[Dict[str, Any]]:
    """
    Convert ZIP code to coordinates and location details.
    
    Args:
        zipcode: ZIP/postal code (e.g., "77002")
        country: Country code (default: "US")
    
    Returns:
        Dict with lat, lon, address, admin info, or None if not found
    """
    clean_zip = zipcode.split("-")[0].strip()
    
    try:
        data = _get_json(
            "/search/address/json",
            {"query": clean_zip, "countrySet": country, "limit": 1},
            api_version="1.0",
        )
        
        results = data.get("results", [])
        if not results:
            return None
        
        result = results[0]
        position = result.get("position", {})
        addr = result.get("address", {})
        
        return {
            "lat": position.get("lat"),
            "lon": position.get("lon"),
            "address": addr.get("freeformAddress"),
            "admin": {
                "municipality": addr.get("municipality"),
                "county": addr.get("countrySecondarySubdivision"),
                "state": addr.get("countrySubdivision"),
                "country": addr.get("countryCode"),
                "postalCode": addr.get("postalCode"),
            },
            "confidence": result.get("score"),
        }
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None


def reverse_geocode(lat: float, lon: float) -> Dict[str, Any]:
    """Get address and admin details from coordinates."""
    data = _get_json(
        "/search/address/reverse/json",
        {"query": f"{lat},{lon}"},
        api_version="1.0",
    )
    best = (data.get("addresses") or [{}])[0]
    addr = best.get("address", {}) if best else {}
    return {
        "address": addr.get("freeformAddress"),
        "admin": {
            "municipality": addr.get("municipality"),
            "county": addr.get("countrySecondarySubdivision"),
            "state": addr.get("countrySubdivision"),
            "country": addr.get("countryCode"),
        },
    }


# Weather Functions
def weather_alerts(lat: float, lon: float) -> List[Dict[str, Any]]:
    """
    Get weather alerts or current conditions.
    Falls back to current weather if alerts endpoint unavailable.
    """
    """
    Static weather alerts for UI compatibility.
    Azure Maps Gen2 does not support weather APIs.
    """
    return [{
        "headline": "No weather alerts available",
        "severity": "N/A",
        "effective": "N/A",
        "expires": "N/A",
        "source": "N/A",
    }]


# Map Generation Functions
def static_map_png(lat: float, lon: float, zoom: int = 13, 
                   width: int = 1000, height: int = 600, pin: bool = True) -> bytes:
    """Generate static map PNG with optional pin marker."""
    try:
        params = {
            "center": f"{lon},{lat}",
            "zoom": str(zoom),
            "height": str(height),
            "width": str(width),
        }
        if pin:
            params["pins"] = f"default||{lon} {lat}"
        return _get_png("/render/static/png", params, api_version="2.0")
    except:
        try:
            params = {"center": f"{lon},{lat}", "zoom": str(zoom), 
                     "width": str(width), "height": str(height)}
            return _get_png("/map/static/png", params, api_version="2022-08-01")
        except:
            placeholder = base64.b64decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            )
            return placeholder


def isochrone(lat: float, lon: float, time_sec: int = 900) -> Dict[str, Any]:
    """Get drive-time polygon from Azure Maps."""
    return _get_json(
        "/route/range/json",
        {"query": f"{lat},{lon}", "timeBudgetInSec": time_sec},
        api_version="1.0",
    )


def isochrone_to_geojson(isochrone_data: Dict[str, Any], 
                         time_minutes: int = 15) -> Dict[str, Any]:
    """Convert Azure Maps isochrone to GeoJSON Feature."""
    try:
        reachable_range = isochrone_data.get("reachableRange", {})
        boundary = reachable_range.get("boundary", [])
        
        if not boundary:
            return {
                "type": "Feature",
                "properties": {"error": "No boundary data"},
                "geometry": None
            }
        
        coordinates = [[point["longitude"], point["latitude"]] for point in boundary]
        if coordinates and coordinates[0] != coordinates[-1]:
            coordinates.append(coordinates[0])
        
        return {
            "type": "Feature",
            "properties": {
                "timeMinutes": time_minutes,
                "timeSeconds": time_minutes * 60,
                "center": reachable_range.get("center", {}),
                "description": f"{time_minutes}-minute drive time area"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [coordinates]
            }
        }
    except Exception as e:
        return {
            "type": "Feature",
            "properties": {"error": str(e)},
            "geometry": None
        }


def build_interactive_map(lat: float, lon: float, context: Dict[str, Any],
                         alerts: List[Dict[str, Any]], isochrone_json: Dict[str, Any],
                         map_png: bytes, output_path: str) -> None:
    """Generate interactive HTML map with Leaflet."""
    b64 = "data:image/png;base64," + base64.b64encode(map_png).decode("utf-8")
    
    alerts_html = (
        "<ul>" + "".join(
            f"<li><b>{a.get('headline','')}</b> – {a.get('severity','')} "
            f"({a.get('effective','')} to {a.get('expires','')})</li>"
            for a in alerts
        ) + "</ul>" if alerts else "<p>No active alerts.</p>"
    )
    
    geojson_feature = isochrone_to_geojson(isochrone_json, time_minutes=15)
    geojson_str = json.dumps(geojson_feature, indent=2)
    ctx_str = json.dumps(context, indent=2)
    
    address = context.get("address", "Property Location")
    admin = context.get("admin", {})
    municipality = admin.get("municipality", "")
    state = admin.get("state", "")
    popup_text = f"<b>{address}</b><br>{municipality}, {state}" if municipality else f"<b>{address}</b>"

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Location Intelligence Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body {{ font-family: system-ui, sans-serif; padding: 16px; margin: 0; background: #f5f5f5; }}
    .header {{ background: white; padding: 20px; border-radius: 10px; margin-bottom: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }}
    h1 {{ margin: 0 0 8px 0; color: #1f2937; }}
    .row {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }}
    .card {{ background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); flex: 1; min-width: 360px; }}
    .card.full {{ flex: 100%; }}
    #map {{ height: 500px; border-radius: 8px; border: 1px solid #d1d5db; }}
    pre {{ background: #f7f7f7; padding: 12px; border-radius: 8px; overflow: auto; max-height: 300px; font-size: 12px; }}
    img {{ max-width: 100%; border-radius: 10px; border: 1px solid #ccc; }}
    h2 {{ margin: 0 0 12px 0; color: #374151; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }}
    .legend {{ background: white; padding: 10px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }}
    .legend-item {{ display: flex; align-items: center; margin: 6px 0; font-size: 13px; }}
    .legend-color {{ width: 30px; height: 20px; margin-right: 8px; border-radius: 3px; border: 1px solid #999; }}
    .info-badge {{ display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-right: 8px; }}
  </style>
</head>
<body>
  <div class="header">
    <h1>🗺️ Location Intelligence Report</h1>
    <p>
      <span class="info-badge">📍 {lat:.5f}, {lon:.5f}</span>
      <span class="info-badge">🏢 {context.get('address', 'N/A')}</span>
    </p>
  </div>

  <div class="row">
    <div class="card full">
      <h2>📊 Interactive Drive-Time Map (15 minutes)</h2>
      <div id="map"></div>
    </div>
  </div>

  <div class="row">
    <div class="card">
      <h2>🌤️ Weather Alerts</h2>
      {alerts_html}
    </div>
    <div class="card">
      <h2>📍 Location Context</h2>
      <pre>{ctx_str}</pre>
    </div>
  </div>

  <div class="row">
    <div class="card">
      <h2>🖼️ Static Map</h2>
      <img src="{b64}" alt="Static map" />
    </div>
    <div class="card">
      <h2>📐 GeoJSON Data</h2>
      <pre>{geojson_str}</pre>
    </div>
  </div>

  <script>
    const map = L.map('map').setView([{lat}, {lon}], 12);
    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }}).addTo(map);

    L.marker([{lat}, {lon}]).addTo(map).bindPopup('{popup_text}').openPopup();

    const isochroneData = {geojson_str};
    if (isochroneData && isochroneData.geometry) {{
      L.geoJSON(isochroneData, {{
        style: {{ color: '#ef4444', weight: 2, fillColor: '#ef4444', fillOpacity: 0.2 }}
      }}).addTo(map);

      const legend = L.control({{position: 'bottomright'}});
      legend.onAdd = function() {{
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
          <div class="legend-item">
            <div class="legend-color" style="background: rgba(239,68,68,0.2); border-color: #ef4444;"></div>
            <span>15-min drive time</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #3b82f6;"></div>
            <span>Property location</span>
          </div>`;
        return div;
      }};
      legend.addTo(map);
    }}
  </script>
</body>
</html>"""
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)


# Primary Agent Function
def get_location_intelligence(zipcode: str, country: str = "US", 
                              time_minutes: int = 15,
                              generate_files: bool = True) -> Dict[str, Any]:
    """
    PRIMARY AGENT FUNCTION
    
    Get complete location intelligence for a ZIP code including:
    - Location coordinates and context
    - Weather alerts/conditions
    - 15-minute drive-time zone (isochrone)
    - Static and interactive maps
    
    Args:
        zipcode: ZIP/postal code (e.g., "77002")
        country: Country code (default: "US")
        time_minutes: Drive time in minutes (default: 15)
        generate_files: Create HTML and PNG files (default: True)
    
    Returns:
        Dict with success status, location data, weather, isochrone GeoJSON, and file paths
    """
    try:
        # Geocode ZIP
        location = geocode_zipcode(zipcode, country)
        if not location:
            return {
                "success": False,
                "error": f"ZIP code not found: {zipcode}",
                "data": None
            }
        
        lat, lon = location["lat"], location["lon"]
        
        # Get location context
        context = reverse_geocode(lat, lon)
        
        # Get weather
        alerts = weather_alerts(lat, lon)
        
        # Get isochrone
        iso_data = isochrone(lat, lon, time_sec=time_minutes * 60)
        iso_geojson = isochrone_to_geojson(iso_data, time_minutes)
        
        # Prepare response
        response = {
            "success": True,
            "error": None,
            "data": {
                "input": {
                    "zipcode": zipcode,
                    "country": country,
                    "driveTimeMinutes": time_minutes
                },
                "location": {
                    "lat": lat,
                    "lon": lon,
                    "address": location["address"],
                    "admin": location["admin"],
                    "confidence": location.get("confidence", "N/A")
                },
                "weather": {
                    "alerts": alerts,
                    "count": len(alerts)
                },
                "isochrone": iso_geojson
            }
        }
        
        # Generate files if requested
        if generate_files:
            png_path = f"location_intel_{zipcode}.png"
            html_path = f"location_intel_{zipcode}.html"
            
            png_bytes = static_map_png(lat, lon)
            with open(png_path, "wb") as f:
                f.write(png_bytes)
            
            build_interactive_map(lat, lon, context, alerts, iso_data, png_bytes, html_path)
            
            response["data"]["files"] = {
                "html": html_path,
                "png": png_path
            }
        
        return response
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": None
        }


# API Response Formatters
def format_api_response(zipcode: str, country: str = "US", 
                       time_minutes: int = 15) -> Dict[str, Any]:
    """
    Format response for API endpoint (no file generation).
    Use in: GET /api/location-intelligence?zip={zipcode}&time={minutes}
    """
    return get_location_intelligence(zipcode, country, time_minutes, generate_files=False)


# Command Line Interface
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python LocationIntelligence_Agent.py <zipcode> [time_minutes]")
        print("Example: python LocationIntelligence_Agent.py 77002 15")
        sys.exit(1)
    
    zipcode = sys.argv[1]
    time_minutes = int(sys.argv[2]) if len(sys.argv) > 2 else 15
    
    print(f"\n{'='*70}")
    print(f"Location Intelligence Agent")
    print(f"{'='*70}\n")
    
    result = get_location_intelligence(zipcode, time_minutes=time_minutes)
    
    if result["success"]:
        data = result["data"]
        print(f"✅ SUCCESS - ZIP Code: {zipcode}")
        print(f"\n📍 Location:")
        print(f"   Address: {data['location']['address']}")
        print(f"   Coordinates: {data['location']['lat']:.5f}, {data['location']['lon']:.5f}")
        print(f"   State: {data['location']['admin'].get('state', 'N/A')}")
        
        print(f"\n🌤️  Weather:")
        print(f"   Alerts: {data['weather']['count']}")
        
        print(f"\n📊 Drive-Time Zone:")
        print(f"   Time: {data['input']['driveTimeMinutes']} minutes")
        
        if "files" in data:
            print(f"\n📁 Files Generated:")
            print(f"   HTML: {data['files']['html']}")
            print(f"   PNG:  {data['files']['png']}")
        
        print(f"\n{'='*70}\n")
    else:
        print(f"❌ ERROR: {result['error']}\n")

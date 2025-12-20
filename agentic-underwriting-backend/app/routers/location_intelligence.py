"""
API endpoints for Location Intelligence Agent.
Integrates Azure Maps for static maps, weather alerts, and drive-time zones.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from app.services.agents.LocationIntelligence_Agent import (
    format_api_response, 
    static_map_png,
    geocode_zipcode,
    reverse_geocode,
    weather_alerts,
    isochrone,
    isochrone_to_geojson
)
from app.services.data_access.local_repo import get_case
import logging
import base64
import json

router = APIRouter(prefix="/api/location-intelligence", tags=["location"])
logger = logging.getLogger(__name__)


@router.get("/{case_id}")
async def fetch_location_intelligence(case_id: str):
    """
    Fetch location intelligence for a case's ZIP code.
    
    Returns:
        - Location context (address, municipality, county, state, coordinates)
        - Weather alerts (or current conditions)
        - 15-minute drive-time zone (isochrone GeoJSON)
        - Static map PNG as base64 data URL
    """
    
    # Load case to get ZIP code
    case_doc = get_case(case_id)
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    property_data = case_doc.get("property", {})
    zipcode = property_data.get("zipCode")
    
    if not zipcode:
        raise HTTPException(
            status_code=400,
            detail="Case missing zipCode - cannot fetch location intelligence"
        )
    
    try:
        # Call Location Intelligence Agent (API mode - no file generation)
        logger.info(f"Fetching location intelligence for case {case_id}, ZIP {zipcode}")
        result = format_api_response(zipcode, country="US", time_minutes=15)
        
        if not result["success"]:
            raise HTTPException(
                status_code=503,
                detail=result.get("error", "Location intelligence service unavailable")
            )
        
        # Generate static map PNG as base64 (zoomed out to show wider area)
        data = result["data"]
        lat = data["location"]["lat"]
        lon = data["location"]["lon"]

        # Zoom level 4 - lower number = more zoomed out, smaller dimensions for UI
        png_bytes = static_map_png(lat, lon, zoom=4, width=400, height=300, pin=True)
        png_base64 = base64.b64encode(png_bytes).decode("utf-8")
        
        # Add static map to response
        data["staticMapBase64"] = f"data:image/png;base64,{png_base64}"
        
        logger.info(f"Location intelligence fetched successfully for {case_id}")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Location intelligence error for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/interactive-map", response_class=HTMLResponse)
async def get_interactive_map(case_id: str):
    """
    Generate interactive HTML map using the proven backend approach.
    Returns a complete HTML page with Leaflet map and drive-time overlay.
    """
    
    # Load case to get ZIP code
    case_doc = get_case(case_id)
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    property_data = case_doc.get("property", {})
    zipcode = property_data.get("zipCode")
    
    if not zipcode:
        raise HTTPException(
            status_code=400,
            detail="Case missing zipCode - cannot generate map"
        )
    
    try:
        # Geocode
        location = geocode_zipcode(zipcode, country="US")
        if not location:
            raise HTTPException(status_code=404, detail=f"ZIP code not found: {zipcode}")
        
        lat, lon = location["lat"], location["lon"]
        
        # Get context and weather
        context = reverse_geocode(lat, lon)
        alerts = weather_alerts(lat, lon)
        
        # Get isochrone
        time_minutes = 15
        iso_data = isochrone(lat, lon, time_sec=time_minutes * 60)
        iso_geojson = isochrone_to_geojson(iso_data, time_minutes)
        
        # Generate HTML using the proven backend function
        html = _build_interactive_map_html(lat, lon, context, alerts, iso_geojson)
        
        logger.info(f"Interactive map generated for case {case_id}, ZIP {zipcode}")
        return HTMLResponse(content=html)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Interactive map generation error for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _build_interactive_map_html(lat: float, lon: float, context: dict, 
                                alerts: list, isochrone_json: dict) -> str:
    """Generate interactive HTML map (adapted from LocationIntelligence_Agent)."""
    
    alerts_html = (
        "<ul style='margin: 0; padding-left: 20px;'>" + "".join(
            f"<li style='margin: 8px 0;'><b>{a.get('headline','')}</b> – {a.get('severity','')} "
            f"({a.get('effective','')} to {a.get('expires','')})</li>"
            for a in alerts
        ) + "</ul>" if alerts else "<p>No active alerts.</p>"
    )
    
    geojson_str = json.dumps(isochrone_json, indent=2)
    
    address = context.get("address", "Property Location")
    admin = context.get("admin", {})
    municipality = admin.get("municipality", "")
    state = admin.get("state", "")
    popup_text = f"<b>{address}</b><br>{municipality}, {state}" if municipality else f"<b>{address}</b>"

    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Interactive Drive-Time Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body {{ 
      font-family: system-ui, -apple-system, sans-serif; 
      margin: 0; 
      padding: 0; 
      background: #ffffff;
      overflow: hidden;
    }}
    #map {{ 
      height: 100vh; 
      width: 100%; 
    }}
    .leaflet-legend {{ 
      background: white; 
      padding: 12px; 
      border-radius: 8px; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-size: 13px;
    }}
    .legend-item {{ 
      display: flex; 
      align-items: center; 
      margin: 6px 0; 
    }}
    .legend-color {{ 
      width: 30px; 
      height: 20px; 
      margin-right: 8px; 
      border-radius: 4px; 
      border: 1px solid #999; 
    }}
    .info-box {{
      background: white;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-width: 300px;
      font-size: 13px;
    }}
    .info-box h3 {{
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 6px;
    }}
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    // Initialize map
    const map = L.map('map', {{
      zoomControl: true,
      attributionControl: true
    }}).setView([{lat}, {lon}], 12);
    
    // Add tile layer
    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }}).addTo(map);

    // Force map to recalculate size
    setTimeout(() => {{
      map.invalidateSize();
    }}, 100);

    // Add property marker
    const marker = L.marker([{lat}, {lon}], {{
      icon: L.icon({{
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }})
    }}).addTo(map);
    
    marker.bindPopup(`{popup_text}`).openPopup();

    // Add isochrone polygon
    const isochroneData = {geojson_str};
    if (isochroneData && isochroneData.geometry) {{
      L.geoJSON(isochroneData, {{
        style: {{ 
          color: '#ef4444', 
          weight: 2, 
          fillColor: '#ef4444', 
          fillOpacity: 0.2 
        }}
      }}).addTo(map);

      // Add legend
      const legend = L.control({{position: 'bottomright'}});
      legend.onAdd = function() {{
        const div = L.DomUtil.create('div', 'leaflet-legend');
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

    // Add info box (top-left)
    const info = L.control({{position: 'topleft'}});
    info.onAdd = function() {{
      const div = L.DomUtil.create('div', 'info-box');
      div.innerHTML = `
        <h3>🗺️ Drive-Time Analysis</h3>
        <p style="margin: 4px 0;"><b>Location:</b> {address}</p>
        <p style="margin: 4px 0;"><b>Drive Time:</b> 15 minutes</p>
        <p style="margin: 4px 0; font-size: 11px; color: #666;">
          The shaded area shows reachable locations within 15 minutes of driving from the property.
        </p>
      `;
      return div;
    }};
    info.addTo(map);
  </script>
</body>
</html>"""

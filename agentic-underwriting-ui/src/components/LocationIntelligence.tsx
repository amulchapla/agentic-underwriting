"use client";

import React, { useEffect, useState } from "react";
import { fetchLocationIntelligence } from "@/lib/api";
import type { LocationIntelligenceResponse } from "@/lib/apiTypes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Props {
  caseId: string;
}

export default function LocationIntelligence({ caseId }: Props) {
  const [data, setData] = useState<LocationIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInteractiveMap, setShowInteractiveMap] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchLocationIntelligence(caseId);
        setData(result);
      } catch (err: any) {
        console.error("Failed to load location intelligence:", err);
        setError(err.message || "Failed to load location data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="text-sm text-muted-foreground">
            Loading location intelligence from Azure Maps...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data?.success || !data?.data) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-sm text-destructive">
          {error || data?.error || "Failed to load location data"}
        </p>
      </div>
    );
  }

  const { location, weather, isochrone, staticMapBase64 } = data.data;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Static Map */}
        <div className="space-y-3">
          <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
            {staticMapBase64 ? (
              <img 
                src={staticMapBase64} 
                alt="Property location map" 
                className="w-full h-auto max-h-96 object-cover"
              />
            ) : (
              <div className="h-64 bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Map unavailable</p>
              </div>
            )}
          </div>
          
          <Button 
            onClick={() => setShowInteractiveMap(true)}
            className="w-full"
            variant="outline"
          >
            🗺️ View Interactive Drive-Time Map
          </Button>
        </div>

        {/* Right Side: Location Context + Weather Alerts */}
        <div className="space-y-4">
          {/* Location Context */}
          <div className="border rounded-lg p-4 bg-card shadow-sm">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              📍 Location Context
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Address:</span>
                <p className="font-medium">{location.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-xs">Municipality:</span>
                  <p className="font-medium">{location.admin.municipality || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">County:</span>
                  <p className="font-medium">{location.admin.county || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">State:</span>
                  <p className="font-medium">{location.admin.state || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">ZIP:</span>
                  <p className="font-medium">{location.admin.postalCode || "—"}</p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <span className="text-muted-foreground text-xs">Coordinates:</span>
                <p className="font-mono text-xs">{location.lat.toFixed(5)}, {location.lon.toFixed(5)}</p>
              </div>
            </div>
          </div>

          {/* Weather Alerts */}
          <div className="border rounded-lg p-4 bg-card shadow-sm">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              🌤️ Weather Alerts
              {weather.count > 0 && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {weather.count}
                </span>
              )}
            </h4>
            {weather.alerts.length > 0 ? (
              <div className="space-y-3">
                {weather.alerts.map((alert, idx) => (
                  <div key={idx} className="border-l-4 border-amber-500 pl-3 text-sm">
                    <p className="font-semibold">{alert.headline}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p>Severity: <span className="font-medium">{alert.severity}</span></p>
                      <p>Effective: {alert.effective}</p>
                      <p>Expires: {alert.expires}</p>
                      {alert.source && <p className="text-xs italic">{alert.source}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active weather alerts.</p>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Map Modal */}
      <Dialog open={showInteractiveMap} onOpenChange={setShowInteractiveMap}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>
              Interactive Drive-Time Map (15 minutes)
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <iframe 
              src={`${API_BASE_URL}/api/location-intelligence/${caseId}/interactive-map`}
              className="w-full border rounded-lg"
              style={{ height: "70vh", minHeight: "500px" }}
              title="Interactive Drive-Time Map"
            />
            <p className="text-xs text-muted-foreground mt-2">
              The shaded area represents a 15-minute drive time from the property location.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

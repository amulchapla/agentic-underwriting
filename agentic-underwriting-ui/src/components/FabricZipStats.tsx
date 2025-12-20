"use client";

import React, { useEffect, useState } from "react";
import { fetchFabricZipStats } from "@/lib/api";
import type { FabricZipClaimStats } from "@/lib/apiTypes";
import { Button } from "@/components/ui/button";

interface Props {
  caseId: string;
  years?: number;
}

export default function FabricZipStats({ caseId, years = 10 }: Props) {
  const [stats, setStats] = useState<FabricZipClaimStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFabricZipStats(caseId, forceRefresh, years);
      setStats(data);
    } catch (err: any) {
      console.error("Failed to load Fabric ZIP stats:", err);
      setError(err.message || "Failed to load ZIP claim statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [caseId, years]);

  const handleRefresh = () => {
    loadStats(true);
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="text-sm text-muted-foreground">Loading local claim statistics from Microsoft Fabric (10-20s)...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Local Risk Environment (ZIP {stats.zip_code})</h4>
        <Button onClick={handleRefresh} variant="ghost" size="sm" className="h-7 text-xs">
          Refresh
        </Button>
      </div>
      
      {/* Key Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 border rounded-lg bg-card">
          <div className="text-xs text-muted-foreground mb-1">Claim Frequency</div>
          <div className="text-2xl font-bold">{stats.claim_frequency.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">past {stats.years} years</div>
        </div>
        <div className="p-3 border rounded-lg bg-card">
          <div className="text-xs text-muted-foreground mb-1">Avg Loss per Claim</div>
          <div className="text-2xl font-bold">${stats.avg_loss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-muted-foreground mt-1">mean payout</div>
        </div>
      </div>

      {/* Fabric Agent Summary Insight */}
      {stats.raw_response?.summary && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 text-lg flex-shrink-0">�</div>
            <div>
              <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                Fabric Agent Insights
              </div>
              <div className="text-sm text-blue-800 leading-relaxed">
                {stats.raw_response.summary}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cache metadata */}
      {stats.cached_at && (
        <p className="text-xs text-muted-foreground mt-2">
          Data from: {new Date(stats.cached_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

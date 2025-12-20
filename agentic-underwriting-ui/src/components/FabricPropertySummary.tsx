"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchFabricPropertySummary } from "@/lib/api";
import type { FabricPropertySummary as FabricPropertySummaryType } from "@/lib/apiTypes";

type Props = {
  caseId: string;
  defaultCollapsed?: boolean;
};

export default function FabricPropertySummary({ caseId, defaultCollapsed = true }: Props) {
  const [data, setData] = useState<FabricPropertySummaryType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  // Auto-load on mount
  useEffect(() => {
    loadData(false);
  }, [caseId]);

  const loadData = async (forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) setIsRefreshing(true);

    try {
      const result = await fetchFabricPropertySummary(caseId, forceRefresh);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load Fabric data";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  if (error && !data) {
    return (
      <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <strong className="text-amber-900">Fabric Data Unavailable</strong>
            <p className="text-xs text-amber-700 mt-1">{error}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data && loading) {
    return (
      <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-sm text-blue-900">
            Loading regional claims data from Microsoft Fabric... (this may take 10-20 seconds)
          </span>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;  // No data, no error - don't show anything
  }

  return (
    <div className="mt-4">
      {/* Collapsible Toggle Button */}
      <Button 
        onClick={() => setIsExpanded(!isExpanded)} 
        variant="outline" 
        size="sm"
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          📊 {isExpanded ? "Hide" : "View"} Regional Claims Details
        </span>
        <span className="text-xs text-muted-foreground">
          {!isExpanded && `${data.total_counties} counties | ${data.total_claims.toLocaleString()} claims | $${Math.round(data.avg_paid_overall).toLocaleString()} avg`}
          {isExpanded && "▲"}
          {!isExpanded && "▼"}
        </span>
      </Button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-3 border rounded-lg p-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <strong className="text-sm">Regional NFIP Claims Context</strong>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Cached: {new Date(data.cached_at).toLocaleTimeString()}
              </span>
              <Button 
                onClick={handleRefresh} 
                variant="ghost" 
                size="sm"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "🔄 Refresh"}
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
              <div className="text-xs text-blue-700">Counties</div>
              <div className="text-lg font-bold text-blue-900">{data.total_counties}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
              <div className="text-xs text-green-700">Total Claims</div>
              <div className="text-lg font-bold text-green-900">{data.total_claims.toLocaleString()}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded p-2 text-center">
              <div className="text-xs text-purple-700">Avg Paid</div>
              <div className="text-lg font-bold text-purple-900">
                ${Math.round(data.avg_paid_overall).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Fabric Agent Summary Insight */}
          {data.raw_response?.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 text-lg flex-shrink-0">💡</div>
                <div>
                  <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                    Fabric Agent Insights
                  </div>
                  <div className="text-sm text-blue-800 leading-relaxed">
                    {data.raw_response.summary}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Table - Show ALL rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left border-b">County Code</th>
                  <th className="px-2 py-1 text-right border-b">Year</th>
                  <th className="px-2 py-1 text-right border-b">Claims</th>
                  <th className="px-2 py-1 text-right border-b">Total Paid</th>
                  <th className="px-2 py-1 text-right border-b">Avg/Claim</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-2 py-1 font-mono text-gray-700">{row.county_code}</td>
                    <td className="px-2 py-1 text-right">{row.loss_year}</td>
                    <td className="px-2 py-1 text-right font-semibold">{row.claims_count}</td>
                    <td className="px-2 py-1 text-right text-green-700">
                      ${Math.round(row.paid_total).toLocaleString()}
                    </td>
                    <td className="px-2 py-1 text-right text-blue-700">
                      ${Math.round(row.avg_paid_per_claim).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            📊 Source: NFIP Claims Database (2M+ transactions) via Microsoft Fabric · Year: 2025
          </p>
        </div>
      )}
    </div>
  );
}

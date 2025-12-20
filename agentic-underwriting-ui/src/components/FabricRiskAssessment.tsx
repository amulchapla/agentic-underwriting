"use client";

import React, { useEffect, useState } from "react";
import { fetchFabricRiskAssessment } from "@/lib/api";
import type { FabricAgentTable, FabricRiskAssessment } from "@/lib/apiTypes";
import { Button } from "@/components/ui/button";

interface Props {
  caseId: string;
  minLoss?: number;
}

type TableRow = Record<string, unknown>;

type ColumnDefinition = {
  key: string;
  label: string;
  align: "left" | "right";
  render: (row: TableRow) => React.ReactNode;
};

type TableVariant = "severity" | "largeLosses";

interface TableModel {
  columns: ColumnDefinition[];
  rows: TableRow[];
}

export default function FabricRiskAssessment({ caseId, minLoss = 100000 }: Props) {
  const [data, setData] = useState<FabricRiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFabricRiskAssessment(caseId, forceRefresh, minLoss);
      setData(result);
    } catch (err: any) {
      console.error("Failed to load Fabric risk assessment:", err);
      setError(err.message || "Failed to load risk assessment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId, minLoss]);

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="text-sm text-muted-foreground">
            Loading risk analytics from Microsoft Fabric (10-20s)...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const severityTable = data.severity_table ?? null;
  const largeLossesTable = data.large_losses_table ?? null;
  const hasSeverityRows = tableHasRows(severityTable);
  const hasLargeLossRows = tableHasRows(largeLossesTable);
  const visibleLargeLossCount = hasLargeLossRows ? getVisibleRowCount(largeLossesTable, "largeLosses") : 0;
  const totalLargeLossCount = hasLargeLossRows
    ? largeLossesTable?.row_count ?? largeLossesTable?.response.length ?? 0
    : 0;
  const highlightLargeLosses = hasLargeLossRows && tableHasHighLoss(largeLossesTable);
  const showVarianceLegend = hasSeverityRows && hasVarianceColumns(severityTable);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analytics from Microsoft Fabric</h3>
          <p className="text-sm text-muted-foreground">
            County {data.county_code}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Section 1: Severity Comparison */}
      {hasSeverityRows && (
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">County vs State Severity Trends</h4>
          
          {/* Fabric Agent Summary Insight for Severity */}
          {(severityTable?.summary ?? data.raw_severity?.summary) && (
            <div className="mb-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-purple-600 text-lg flex-shrink-0">📈</div>
                <div>
                  <div className="text-xs font-semibold text-purple-900 uppercase tracking-wide mb-1">
                    Severity Trend Analysis
                  </div>
                  <div className="text-sm text-purple-800 leading-relaxed">
                    {severityTable?.summary ?? data.raw_severity?.summary}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <FabricTable table={severityTable} variant="severity" />
          {showVarianceLegend && (
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="text-red-700">■</span> Red: County &gt; 10% above state average
              </span>
              <span className="inline-flex items-center gap-1 ml-4">
                <span className="text-green-700">■</span> Green: County &lt; 10% below state average
              </span>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Large Loss Claims */}
      {hasLargeLossRows && (
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">
            Large Loss Claims (${(data.min_loss_threshold / 1000).toFixed(0)}K+)
          </h4>
          
          {/* Fabric Agent Summary Insight for Large Losses */}
          {(largeLossesTable?.summary ?? data.raw_large_losses?.summary) && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-red-600 text-lg flex-shrink-0">⚠️</div>
                <div>
                  <div className="text-xs font-semibold text-red-900 uppercase tracking-wide mb-1">
                    Large Loss Pattern
                  </div>
                  <div className="text-sm text-red-800 leading-relaxed">
                    {largeLossesTable?.summary ?? data.raw_large_losses?.summary}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <FabricTable table={largeLossesTable} variant="largeLosses" />
          <div className="mt-3 text-xs text-muted-foreground">
            Showing {visibleLargeLossCount} of {totalLargeLossCount} claims.
            {highlightLargeLosses && (
              <span className="ml-2 text-red-700">● Amounts over $250K highlighted</span>
            )}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!hasSeverityRows && !hasLargeLossRows && (
        <div className="p-4 border rounded-lg bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground">
            No risk assessment data available for this county.
          </p>
        </div>
      )}

      {/* Cache Metadata */}
      {data.cached_at && (
        <p className="text-xs text-muted-foreground">
          Data cached: {new Date(data.cached_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function tableHasRows(table?: FabricAgentTable | null): table is FabricAgentTable {
  return !!table && Array.isArray(table.response) && table.response.length > 0;
}

function extractRows(table: FabricAgentTable): TableRow[] {
  return table.response.filter((row): row is TableRow => !!row && typeof row === "object" && !Array.isArray(row));
}

function buildTableModel(table: FabricAgentTable | null | undefined, variant: TableVariant): TableModel | null {
  if (!tableHasRows(table)) {
    return null;
  }

  const sanitizedRows = extractRows(table);
  if (sanitizedRows.length === 0) {
    return null;
  }

  const baseKeys = (Array.isArray(table.column_keys) && table.column_keys.length > 0)
    ? [...table.column_keys]
    : deriveOrderedKeys(sanitizedRows);

  const rows = applyVariantSorting(sanitizedRows, baseKeys, variant);
  const displayRows = variant === "largeLosses" ? rows.slice(0, 10) : rows;

  const columns: ColumnDefinition[] = baseKeys.map((key) => {
    const isNumeric = rows.some((row) => {
      const value = row[key];
      return typeof value === "number" && Number.isFinite(value);
    });
    const align: "left" | "right" = isNumeric ? "right" : "left";
    return {
      key,
      label: prettifyHeader(key),
      align,
      render: (row) => formatCellValue(row[key], key, variant),
    };
  });

  if (variant === "severity") {
    const countyKey = baseKeys.find((key) => isCountyAverageKey(key));
    const stateKey = baseKeys.find((key) => isStateAverageKey(key));
    if (countyKey && stateKey) {
      columns.push({
        key: "__variance",
        label: "Variance",
        align: "right",
        render: (row) => {
          const { text, className } = formatVariance(row[countyKey], row[stateKey]);
          return <span className={className}>{text}</span>;
        },
      });
    }
  }

  return { columns, rows: displayRows };
}

function FabricTable({ table, variant }: { table: FabricAgentTable | null | undefined; variant: TableVariant }) {
  const model = buildTableModel(table, variant);

  if (!model) {
    return (
      <div className="border border-dashed rounded p-4 text-sm text-muted-foreground">
        No data available for this section.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {model.columns.map((column) => (
              <th
                key={column.key}
                className={`${column.align === "right" ? "text-right" : "text-left"} p-2`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-muted/30">
              {model.columns.map((column) => (
                <td
                  key={column.key}
                  className={`${column.align === "right" ? "text-right" : ""} p-2`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function deriveOrderedKeys(rows: TableRow[]): string[] {
  const keys: string[] = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
  });
  return keys;
}

function hasVarianceColumns(table: FabricAgentTable | null | undefined): boolean {
  if (!tableHasRows(table)) {
    return false;
  }

  const keys = Array.isArray(table.column_keys) && table.column_keys.length > 0
    ? table.column_keys
    : deriveOrderedKeys(extractRows(table));

  const hasCounty = keys.some((key) => isCountyAverageKey(key));
  const hasState = keys.some((key) => isStateAverageKey(key));
  return hasCounty && hasState;
}

function prettifyHeader(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCellValue(value: unknown, key: string, variant: TableVariant): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">N/A</span>;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const loweredKey = key.toLowerCase();

    if (loweredKey.includes("year")) {
      return value;
    }

    const formatted = shouldFormatAsCurrency(key)
      ? `$${Math.round(value).toLocaleString()}`
      : value.toLocaleString(undefined, { maximumFractionDigits: Math.abs(value) < 1 ? 2 : Math.abs(value) < 100 ? 2 : 0 });

    if (variant === "largeLosses" && shouldHighlightHighLoss(key) && value > 250000) {
      return <span className="text-red-700 font-semibold">{formatted}</span>;
    }

    return formatted;
  }

  if (typeof value === "string") {
    return value || <span className="text-muted-foreground">N/A</span>;
  }

  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
}

function shouldFormatAsCurrency(key: string): boolean {
  const lowered = key.toLowerCase();
  return ["avg", "total", "paid", "loss", "severity"].some((token) => lowered.includes(token));
}

function shouldHighlightHighLoss(key: string): boolean {
  const lowered = key.toLowerCase();
  return (lowered.includes("total") || lowered.includes("loss")) && (lowered.includes("paid") || lowered.includes("amount"));
}

function isCountyAverageKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return lowered.includes("county") && (lowered.includes("avg") || lowered.includes("severity") || lowered.includes("paid"));
}

function isStateAverageKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return lowered.includes("state") && (lowered.includes("avg") || lowered.includes("severity") || lowered.includes("paid"));
}

function formatVariance(countyValue: unknown, stateValue: unknown): { text: string; className: string } {
  const county = toNumeric(countyValue);
  const state = toNumeric(stateValue);

  if (!Number.isFinite(county) || !Number.isFinite(state) || state === 0) {
    return { text: "N/A", className: "text-muted-foreground" };
  }

  const pct = ((county - state) / state) * 100;
  const text = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

  if (pct >= 10) return { text, className: "text-red-700 font-semibold" };
  if (pct <= -10) return { text, className: "text-green-700 font-semibold" };
  return { text, className: "text-gray-700" };
}

function toNumeric(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function applyVariantSorting(rows: TableRow[], keys: string[], variant: TableVariant): TableRow[] {
  const sortableRows = [...rows];

  if (variant === "severity") {
    const yearKey = keys.find((key) => key.toLowerCase().includes("loss") && key.toLowerCase().includes("year"));
    if (yearKey) {
      sortableRows.sort((a, b) => toNumeric(b[yearKey]) - toNumeric(a[yearKey]));
    }
  }

  if (variant === "largeLosses") {
    const amountKey = keys.find((key) => shouldHighlightHighLoss(key));
    if (amountKey) {
      sortableRows.sort((a, b) => toNumeric(b[amountKey]) - toNumeric(a[amountKey]));
    }
  }

  return sortableRows;
}

function getVisibleRowCount(table: FabricAgentTable | null | undefined, variant: TableVariant): number {
  if (!tableHasRows(table)) {
    return 0;
  }

  const sanitizedRows = extractRows(table);
  if (variant === "largeLosses") {
    return Math.min(10, sanitizedRows.length);
  }

  return sanitizedRows.length;
}

function tableHasHighLoss(table: FabricAgentTable | null | undefined): boolean {
  if (!tableHasRows(table)) {
    return false;
  }

  const sanitizedRows = extractRows(table);

  return sanitizedRows.some((row) => {
    return Object.entries(row).some(([key, value]) => shouldHighlightHighLoss(key) && toNumeric(value) > 250000);
  });
}

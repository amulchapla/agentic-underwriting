"use client";

import React, { useMemo } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { AiDecision } from "@/lib/apiTypes";

function formatImpact(impact: number): string {
  const sign = impact > 0 ? "+" : impact < 0 ? "−" : "";
  const magnitude = Math.abs(impact);
  return `${sign}${magnitude.toFixed(2)}`;
}

type AiExplainabilityPanelProps = {
  decision: AiDecision;
};

export default function AiExplainabilityPanel({ decision }: AiExplainabilityPanelProps) {
  const contributions = decision.featureContributions ?? [];
  const maxImpact = useMemo(
    () => (contributions.length ? Math.max(...contributions.map((c) => Math.abs(c.impact)), 0.01) : 1),
    [contributions]
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-600">Top Feature Contributions</h4>
        {contributions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No contribution details provided.</p>
        ) : (
          <ul className="mt-3 space-y-3" aria-label="AI feature contributions">
            {contributions.map((item) => {
              const width = `${Math.round((Math.abs(item.impact) / maxImpact) * 100)}%`;
              const positive = item.impact >= 0;
              const barColor = positive ? "bg-green-500" : "bg-rose-500";
              const barLabel = `${item.name} impact ${formatImpact(item.impact)}`;
              return (
                <li key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="text-slate-600" aria-hidden>{formatImpact(item.impact)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200" role="img" aria-label={barLabel}>
                    <div className={`h-full rounded-full ${barColor}`} style={{ width }} />
                  </div>
                  {item.note && <p className="text-xs text-slate-500">{item.note}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2" aria-label="AI governance metadata">
        <div>
          <span className="block font-semibold text-slate-600">Model Version</span>
          <span className="text-slate-900">{decision.modelVersion}</span>
        </div>
        <div>
          <span className="block font-semibold text-slate-600">Rules Version</span>
          <span className="text-slate-900">{decision.rulesVersion}</span>
        </div>
        {decision.validatedAt && (
          <div>
            <span className="block font-semibold text-slate-600">Last Validated</span>
            <span className="text-slate-900">{new Date(decision.validatedAt).toLocaleString()}</span>
          </div>
        )}
        {decision.auditRef?.id && (
          <div>
            <span className="block font-semibold text-slate-600">Audit Reference</span>
            <span className="text-slate-900">{decision.auditRef.id}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-md border border-slate-200 p-3" aria-live="polite">
        {decision.complianceCheck === "PASSED" ? (
          <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
        ) : (
          <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden />
        )}
        <div className="text-sm text-slate-800">
          <p className="font-semibold">
            Compliance Check: {decision.complianceCheck ?? "Not Evaluated"}
          </p>
          <p className="text-slate-600">Model governance verification for automated underwriting.</p>
        </div>
      </div>
    </div>
  );
}

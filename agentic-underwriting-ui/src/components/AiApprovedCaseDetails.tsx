"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AiDecisionSummary from "@/components/AiDecisionSummary";
import AiExplainabilityPanel from "@/components/AiExplainabilityPanel";
import AiActionTimeline from "@/components/AiActionTimeline";
import AiDecisionLogTab from "@/components/AiDecisionLogTab";
import DataTabs from "@/components/DataTabs";
import KnowledgeInsightsCard from "@/components/KnowledgeInsightsCard";
import type { AiDecision, CaseViewModel } from "@/lib/apiTypes";

function formatConfidence(value?: number): string | undefined {
  if (typeof value !== "number") return undefined;
  return `${Math.round(value * 100)}%`;
}

type AiApprovedCaseDetailsProps = {
  caseView: CaseViewModel;
  caseId: string;
  onDownloadAudit: () => Promise<void>;
  onRerun: () => Promise<void>;
  onReview?: () => void;
  isRerunning?: boolean;
};

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return String(value);
    }
  }
  return String(value);
}






export default function AiApprovedCaseDetails({
  caseView,
  caseId,
  onDownloadAudit,
  onRerun,
  onReview,
  isRerunning = false,
}: AiApprovedCaseDetailsProps) {
  if (!caseView.aiDecision) {
    return null;
  }
  const aiDecision = caseView.aiDecision as AiDecision;
  const confidenceBadge = formatConfidence(aiDecision?.confidence);
  const riskLevel = caseView.riskLevel ?? "Unknown";
  const decisionOutcome = aiDecision?.outcome === "AUTO_BIND" ? "Auto-Bind" : aiDecision?.outcome ?? "AI Decision";

  const timelineLegend = ["Prefill", "Enrich", "Score", "Decide"];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-blue-950">{caseView.title ?? caseView.id}</h1>
            {caseView.address && <p className="text-sm text-blue-900/80">{caseView.address}</p>}
            <p className="mt-2 text-sm text-blue-900/80">
              Approved automatically by the Agentic AI Decisioning Engine
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {confidenceBadge && (
              <span className="rounded-full bg-blue-200 px-3 py-1 text-sm font-medium text-blue-900">
                Confidence {confidenceBadge}
              </span>
            )}
            <span className="rounded-full bg-emerald-200 px-3 py-1 text-sm font-semibold text-emerald-900">
              {decisionOutcome}
            </span>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-900">
              Risk Level: {riskLevel}
            </span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">AI Decision Summary</h2>
          </div>
          <AiDecisionSummary decision={aiDecision} />
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">AI Explainability</h2>
          </div>
          <AiExplainabilityPanel decision={aiDecision} />
        </Card>
      </section>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Agentic AI Action Timeline</h2>
          <div className="flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 shadow-sm">
            <span className="uppercase tracking-wide text-[0.65rem] text-blue-800">Flow</span>
            <div className="flex items-center gap-2">
              {timelineLegend.map((label, index) => (
                <React.Fragment key={label}>
                  {index > 0 && <span className="text-blue-400" aria-hidden>→</span>}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-blue-900 shadow-sm">
                    {label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <AiActionTimeline steps={aiDecision.timeline} />
      </Card>

      <Card className="p-4">
        <DataTabs tabs={caseView.tabs} isLoading={false} caseId={caseId} />
      </Card>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-xs font-bold text-emerald-700">
              ⚙️
            </span>
            <h2 className="text-base font-semibold text-slate-900">AI Decision Controls</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={onDownloadAudit} variant="outline" size="sm">
              View AI Audit Report
            </Button>
            <Button type="button" onClick={onRerun} disabled={isRerunning} size="sm">
              {isRerunning ? "Re-running…" : "Re-run AI Decision"}
            </Button>
            <Button type="button" variant="secondary" onClick={onReview} size="sm">
              Review Decision
            </Button>
          </div>
        </div>
      </Card>

      {/* Knowledge Insights */}
      <KnowledgeInsightsCard
        insights={caseView.knowledgeInsights}
        isLoading={false}
      />
    </div>
  );
}

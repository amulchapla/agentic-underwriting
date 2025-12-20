"use client";

import React from "react";
import type { AiDecision } from "@/lib/apiTypes";

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatRisk(score: number): { label: string; scoreText: string } {
  let label = "Medium";
  if (score <= 0.33) {
    label = "Low";
  } else if (score >= 0.67) {
    label = "High";
  }
  return { label, scoreText: score.toFixed(2) };
}

function formatDecisionTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (remainder === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainder}s`;
}

function outcomeLabel(outcome: AiDecision["outcome"]): string {
  switch (outcome) {
    case "AUTO_BIND":
      return "Auto-Bind";
    case "REFER":
      return "Refer to Human";
    case "DECLINE":
      return "Decline";
    default:
      return outcome;
  }
}

type AiDecisionSummaryProps = {
  decision: AiDecision;
};

export default function AiDecisionSummary({ decision }: AiDecisionSummaryProps) {
  const { label: riskLabel, scoreText } = formatRisk(decision.riskScore);
  const outcome = outcomeLabel(decision.outcome);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" aria-label="AI decision outcome">
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
          {outcome}
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
          Confidence {formatConfidence(decision.confidence)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
          Risk Score {scoreText} ({riskLabel})
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2" aria-label="AI decision summary details">
        <div>
          <dt className="font-semibold text-slate-600">Decision Time</dt>
          <dd className="text-slate-900">{formatDecisionTime(decision.decisionTimeSeconds)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-600">Rules Version</dt>
          <dd className="text-slate-900">{decision.rulesVersion}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-600">Model Version</dt>
          <dd className="text-slate-900">{decision.modelVersion}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-600">Compliance Check</dt>
          <dd className="text-slate-900">{decision.complianceCheck ?? "Not Run"}</dd>
        </div>
        {decision.validatedAt && (
          <div>
            <dt className="font-semibold text-slate-600">Last Validated</dt>
            <dd className="text-slate-900">{new Date(decision.validatedAt).toLocaleString()}</dd>
          </div>
        )}
      </dl>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-4" aria-label="AI justification">
        <h4 className="text-sm font-semibold text-blue-900">Why the AI approved this case</h4>
        <p className="mt-2 text-sm text-blue-900/90 leading-relaxed">
          {decision.justification}
        </p>
      </div>
    </div>
  );
}

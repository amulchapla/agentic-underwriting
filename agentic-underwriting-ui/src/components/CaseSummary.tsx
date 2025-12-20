"use client";
import React from "react";
import type { DecisionOutput } from "@/lib/apiTypes";
import FabricPropertySummary from "@/components/FabricPropertySummary";
import FabricZipStats from "@/components/FabricZipStats";

type Props = {
  variant?: "property" | "decisioning";
  summary?: string;
  supportBullets?: string[];
  decision?: DecisionOutput | null;
  isLoading?: boolean;
  caseId?: string;
};

function renderLoading() {
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Loading case intelligence…
    </div>
  );
}

function formatOutcome(outcome?: string) {
  if (!outcome) return "—";
  switch (outcome) {
    case "AutoBind":
      return "Auto Bind";
    case "NeedsReview":
      return "Needs Review";
    case "Decline":
      return "Decline";
    default:
      return outcome;
  }
}

export default function CaseSummary({
  variant = "property",
  summary,
  supportBullets,
  decision,
  isLoading,
  caseId,
}: Props) {
  const reasons = decision?.reasons ?? [];
  const flags = decision?.flags ?? [];

  // Deduplicate: remove flags that appear in reasons
  const uniqueFlags = flags.filter(flag => 
    !reasons.some(reason => 
      reason.toLowerCase().includes(flag.toLowerCase()) || 
      flag.toLowerCase().includes(reason.toLowerCase())
    )
  );

  if (variant === "decisioning") {
    const confidencePercent = decision ? Math.round(decision.confidence * 100) : 0;
    
    return (
      <div>
        <div className="rounded-t-lg bg-primary px-4 py-2">
          <h3 className="text-primary-foreground text-base font-bold tracking-wide">Decisioning Intelligence</h3>
        </div>
        {isLoading ? (
          renderLoading()
        ) : (
          <div className="p-4 space-y-4 text-sm">
            {/* Hero Card - Outcome + Confidence */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {decision?.outcome === "AutoBind" && "✅"}
                    {decision?.outcome === "NeedsReview" && "🔍"}
                    {decision?.outcome === "Decline" && "❌"}
                  </span>
                  <div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatOutcome(decision?.outcome)}
                    </div>
                    <div className="text-xs text-blue-700">Automated Decision</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">{confidencePercent}%</div>
                  <div className="text-xs text-blue-700">Confidence</div>
                </div>
              </div>
              {/* Confidence Meter */}
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>

            {/* Why This Decision? */}
            <div>
              <strong className="text-sm border-b-2 border-primary pb-1 block mb-2">Why This Decision?</strong>
              <p className="leading-relaxed">{decision?.justification_md || "No justification provided."}</p>
            </div>

            {/* Risk Factors - Combined Reasons + Flags */}
            {(reasons.length > 0 || uniqueFlags.length > 0) && (
              <div>
                <strong className="text-sm border-b-2 border-primary pb-1 block mb-2">Risk Factors:</strong>
                <ul className="space-y-2">
                  {reasons.map((reason, idx) => (
                    <li key={`reason-${idx}`} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                  {uniqueFlags.map((flag, idx) => (
                    <li key={`flag-${idx}`} className="flex items-start gap-2 text-amber-700">
                      <span className="mt-0.5">⚠️</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Fabric ZIP Statistics for Decisioning */}
            {caseId && <FabricZipStats caseId={caseId} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-t-lg bg-primary px-4 py-2">
        <h3 className="text-primary-foreground text-base font-bold tracking-wide">Property &amp; Support Summary</h3>
      </div>
      {isLoading ? (
        renderLoading()
      ) : (
        <div className="p-4 space-y-3 text-sm">
          <div>
            <strong>Summary:</strong>
            <p className="mt-1 leading-relaxed">{summary || "No summary available."}</p>
          </div>
          <div>
            <strong>Support:</strong>
            {supportBullets && supportBullets.length > 0 ? (
              <ul className="list-disc list-inside mt-1 space-y-1">
                {supportBullets.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">No supporting bullets provided.</p>
            )}
          </div>
          
          {/* Fabric Property Summary */}
          {caseId && <FabricPropertySummary caseId={caseId} />}
        </div>
      )}
    </div>
  );
}

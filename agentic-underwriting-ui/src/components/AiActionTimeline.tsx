"use client";

import React from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { AiTimelineStep } from "@/lib/apiTypes";

function formatTimestamp(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return undefined;
  return date.toLocaleString();
}

type AiActionTimelineProps = {
  steps: AiTimelineStep[];
};

export default function AiActionTimeline({ steps }: AiActionTimelineProps) {
  if (!steps.length) {
    return <p className="text-sm text-muted-foreground">No AI action timeline available.</p>;
  }

  return (
    <ol className="relative space-y-4" aria-label="Agentic AI action timeline">
      {steps.map((step, index) => {
        const started = formatTimestamp(step.startedAt);
        const completed = formatTimestamp(step.completedAt);
        return (
          <li key={step.id} className="relative pl-8">
            <div className="absolute left-1 top-1 flex h-full flex-col items-center" aria-hidden>
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              {index < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-blue-200" />}
            </div>
            <details className="group rounded-md border border-blue-200 bg-blue-50/60 p-3" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-left">
                <div>
                  <p className="text-sm font-semibold text-blue-900">{step.title}</p>
                  <p className="text-xs uppercase tracking-wide text-blue-700/80">{step.step}</p>
                </div>
                <Clock3 className="h-4 w-4 text-blue-500 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-3 space-y-2 text-sm text-blue-900/90">
                <p>{step.description}</p>
                <div className="text-xs text-blue-800/80">
                  {started && <p><span className="font-semibold">Started:</span> {started}</p>}
                  {completed && <p><span className="font-semibold">Completed:</span> {completed}</p>}
                </div>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

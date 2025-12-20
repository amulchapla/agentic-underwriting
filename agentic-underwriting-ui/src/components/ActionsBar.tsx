"use client";
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  actions?: string[];
  isLoading?: boolean;
};

const actionLabels: Record<string, { label: string; variant?: "default" | "outline" | "destructive" }> = {
  bind: { label: "Bind and Issue" },
  "request-info": { label: "Request Info", variant: "outline" },
  "refer-senior": { label: "Refer to Senior", variant: "outline" },
  "refer-provider": { label: "Refer to Another Provider", variant: "outline" },
  decline: { label: "Decline", variant: "destructive" },
};

function formatAction(action: string) {
  return actionLabels[action] ?? {
    label: action
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    variant: "outline" as const,
  };
}

export default function ActionsBar({ actions, isLoading }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-700">
          ⚡
        </span>
        Actions
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Loading actions…</span>
        ) : actions && actions.length > 0 ? (
          actions.map((action) => {
            const { label, variant } = formatAction(action);
            return (
              <Button key={action} variant={variant} size="sm">
                {label}
              </Button>
            );
          })
        ) : (
          <span className="text-sm text-muted-foreground">No recommended actions.</span>
        )}
      </div>
    </div>
  );
}

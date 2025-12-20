"use client";
import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { CaseItem } from "@/lib/mockData";

type Props = {
  submissionQueue: CaseItem[];
  aiApprovedQueue: CaseItem[];
  onOpenCase: (id: string) => void;
};

export default function QueuesPanel({ submissionQueue, aiApprovedQueue, onOpenCase }: Props) {
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    const now = Date.now();
    return submissionQueue.filter((c) => {
      if (filter === "All") return true;
      if (filter === "Pending" && c.status === "Pending") return true;
      if (filter === "Needs Review" && c.status === "Needs Review") return true;
      if (filter === "High Risk" && c.riskFlags.length > 0) return true;
      const daysAgo = (now - c.submissionDate.getTime()) / 86400000;
      if (filter === "Last 3 Days") return daysAgo <= 3;
      if (filter === "Last 7 Days") return daysAgo <= 7;
      if (filter === "Older than 7 Days") return daysAgo > 7;
      return false;
    });
  }, [filter, submissionQueue]);

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader className="flex justify-between items-center bg-primary rounded-t-lg px-4 py-2">
          <CardTitle className="text-primary-foreground">Human Review Queue</CardTitle>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-sm border rounded px-2 py-1 bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary">
            <option>All</option><option>Pending</option><option>Needs Review</option>
            <option>High Risk</option><option>Last 3 Days</option><option>Last 7 Days</option><option>Older than 7 Days</option>
          </select>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  className="w-full flex justify-between items-center text-left p-2 border rounded bg-white hover:bg-blue-50"
                  onClick={() => onOpenCase(c.id)}
                >
                  <span>{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-primary rounded-t-lg px-4 py-2"><CardTitle className="text-primary-foreground">AI Approved Queue</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {aiApprovedQueue.map((c) => (
              <li key={c.id}>
                <button
                  className="w-full flex justify-between items-center text-left p-2 border rounded bg-white hover:bg-emerald-50"
                  onClick={() => onOpenCase(c.id)}
                >
                  <span>{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

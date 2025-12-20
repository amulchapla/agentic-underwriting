"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import QueuesPanel from "@/components/QueuesPanel";
import DashboardMetrics from "@/components/DashboardMetrics";
import { submissionQueue, aiApprovedQueue } from "@/lib/mockData";
import GlobalCopilotFab from "@/components/GlobalCopilotFab";

export default function DashboardPage() {
  const router = useRouter();
  return (
    <div className="flex flex-col h-screen">
      {/* Top Nav */}
  <header className="bg-primary text-primary-foreground flex items-center justify-between px-6 py-3 shadow-md">
        <div className="font-bold text-lg">Agentic AI Underwriting Workbench</div>
        <nav className="flex space-x-6">
          <span className="underline">Dashboard</span>
          <a href="#" className="hover:underline">Reports</a>
          <a href="#" className="hover:underline">Settings</a>
        </nav>
      </header>

      {/* Dashboard grid */}
      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <QueuesPanel
            submissionQueue={submissionQueue}
            aiApprovedQueue={aiApprovedQueue}
            onOpenCase={(id) => router.push(`/case/${id}`)}
          />
        </Card>

        <Card className="p-4">
          <DashboardMetrics />
        </Card>
      </div>

      {/* Global Copilot (floating button + drawer) */}
      <GlobalCopilotFab />
    </div>
  );
}

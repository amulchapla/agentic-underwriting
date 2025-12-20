"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import CaseSummary from "@/components/CaseSummary";
import DataTabs from "@/components/DataTabs";
import ActionsBar from "@/components/ActionsBar";
import CopilotDrawer from "@/components/CopilotDrawer";
import AiApprovedCaseDetails from "@/components/AiApprovedCaseDetails";
import KnowledgeInsightsCard from "@/components/KnowledgeInsightsCard";
import { aiApprovedQueue, submissionQueue } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import type { CaseViewModel } from "@/lib/apiTypes";
import { downloadAiAudit, fetchCaseView, rerunAiDecision, sendCopilotMessage } from "@/lib/api";
import { mergeSampleAttachments } from "@/lib/sampleCaseAssets";
import { isFeatureEnabled } from "@/lib/features";

type ChatMessage = { from: "ai" | "user"; text: string };

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const caseId = params.id ?? "C-123";

  const currentCase = useMemo(() => {
    const combined = [...submissionQueue, ...aiApprovedQueue];
    return combined.find((c) => c.id === caseId);
  }, [caseId]);

  const [caseView, setCaseView] = useState<CaseViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messagesByCase, setMessagesByCase] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!caseId) return;
      setLoading(true);
      try {
        const data = await fetchCaseView(caseId);
        const augmented = mergeSampleAttachments(data, caseId);
        if (!cancelled) {
          setCaseView(augmented);
          setError(null);
          setActionError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unable to load case.";
          setError(message);
          setCaseView(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    if (!caseView) return;
    setMessagesByCase((prev) => {
      if (prev[caseId]?.length) return prev;
      return {
        ...prev,
        [caseId]: [{ from: "ai" as const, text: caseView.summary }],
      };
    });
  }, [caseView, caseId]);

  const caseMessages = messagesByCase[caseId] ?? [];
  const propertyProfile = caseView?.tabs?.property_profile as { address?: string } | undefined;
  const caseName = currentCase?.name ?? caseView?.title ?? propertyProfile?.address ?? caseId;

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessagesByCase((prev) => {
      const existing = prev[caseId] ?? [];
      return {
        ...prev,
        [caseId]: [...existing, { from: "user", text: trimmed }],
      };
    });
    setInput("");
    setIsSending(true);

    try {
      const response = await sendCopilotMessage(trimmed, caseId);
      setMessagesByCase((prev) => {
        const existing = prev[caseId] ?? [];
        return {
          ...prev,
          [caseId]: [...existing, { 
            from: "ai", 
            text: response.answer,
            citations: response.knowledgeCitations 
          }],
        };
      });
    } catch (err) {
      const fallback = err instanceof Error ? err.message : "Unable to reach copilot.";
      setMessagesByCase((prev) => {
        const existing = prev[caseId] ?? [];
        return {
          ...prev,
          [caseId]: [...existing, { from: "ai", text: `Copilot error: ${fallback}` }],
        };
      });
    } finally {
      setIsSending(false);
    }
  };

  const aiApprovedEnabled = isFeatureEnabled("aiApprovedDetails");
  const showAiApprovedLayout = Boolean(
    aiApprovedEnabled &&
    caseView &&
    caseView.decisionType === "AI_APPROVED" &&
    caseView.aiDecision
  );

  const handleDownloadAudit = useCallback(async () => {
    if (!caseId) return;
    setActionError(null);
    try {
      await downloadAiAudit(caseId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to download AI audit.";
      setActionError(message);
    }
  }, [caseId]);

  const handleRerun = useCallback(async () => {
    if (!caseId) return;
    setActionError(null);
    setIsRerunning(true);
    try {
      const updated = await rerunAiDecision(caseId);
      setCaseView((prev) => (prev ? { ...prev, aiDecision: updated } : prev));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to re-run AI decision.";
      setActionError(message);
    } finally {
      setIsRerunning(false);
    }
  }, [caseId]);

  const handleReviewDecision = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Nav */}
      <header className="bg-primary text-primary-foreground flex items-center justify-between px-6 py-3 shadow-md">
        <div className="font-bold text-lg cursor-pointer" onClick={() => router.push("/")}>
          Agentic AI Underwriting Workbench
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push("/")}>Back to Dashboard</Button>
          <Button onClick={() => setDrawerOpen(true)}>Copilot Chat</Button>
        </div>
      </header>

      {/* Case summary row */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <div className="rounded border border-destructive/20 bg-red-50 px-4 py-2 text-destructive">
            {error}
          </div>
        )}
        {actionError && !error && (
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-2 text-amber-900">
            {actionError}
          </div>
        )}

        {showAiApprovedLayout && caseView ? (
          <AiApprovedCaseDetails
            caseView={caseView}
            caseId={caseId}
            onDownloadAudit={handleDownloadAudit}
            onRerun={handleRerun}
            onReview={handleReviewDecision}
            isRerunning={isRerunning}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-0">
                <CaseSummary
                  summary={caseView?.summary}
                  supportBullets={caseView?.support_bullets}
                  isLoading={loading}
                  caseId={caseId}
                />
              </Card>
              <Card className="p-0">
                <CaseSummary
                  variant="decisioning"
                  decision={caseView?.decision ?? null}
                  isLoading={loading}
                  caseId={caseId}
                />
              </Card>
            </div>

            <Card className="p-4">
              <ActionsBar actions={caseView?.actions} isLoading={loading} />
            </Card>

            <Card className="p-4">
              <DataTabs tabs={caseView?.tabs} isLoading={loading} caseId={caseId} />
            </Card>

            {/* Knowledge Insights */}
            <KnowledgeInsightsCard
              insights={caseView?.knowledgeInsights}
              isLoading={loading}
            />
          </>
        )}
      </div>

      {/* Copilot Slide-Out */}
      <CopilotDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        messages={caseMessages}
        input={input}
        onInput={setInput}
        onSend={sendMessage}
        caseName={caseName}
        isSending={isSending}
      />
    </div>
  );
}

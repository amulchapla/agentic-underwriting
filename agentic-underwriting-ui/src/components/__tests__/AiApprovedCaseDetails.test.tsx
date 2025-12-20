/// <reference types="vitest" />
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AiApprovedCaseDetails from "@/components/AiApprovedCaseDetails";
import AiDecisionSummary from "@/components/AiDecisionSummary";
import AiActionTimeline from "@/components/AiActionTimeline";
import AiDecisionLogTab from "@/components/AiDecisionLogTab";
import type { AiAuditLog, AiDecision, CaseViewModel, DecisionOutput } from "@/lib/apiTypes";

const baseDecision: AiDecision = {
  outcome: "AUTO_BIND",
  confidence: 0.92,
  riskScore: 0.18,
  decisionTimeSeconds: 192,
  justification: "Low location risk, clean loss history, property condition within thresholds.",
  rulesVersion: "UW-Rules v2.1",
  modelVersion: "RiskModel_v3.4",
  validatedAt: "2025-09-10T00:00:00Z",
  complianceCheck: "PASSED",
  timeline: [
    {
      id: "ai-321-1",
      step: "PREFILL",
      title: "Prefill",
      description: "Prefill data gathered",
      startedAt: "2025-09-08T12:00:05Z",
      completedAt: "2025-09-08T12:00:22Z",
    },
    {
      id: "ai-321-2",
      step: "ENRICH",
      title: "Data Enrichment",
      description: "Fetched hazard & prior claims",
      startedAt: "2025-09-08T12:00:22Z",
      completedAt: "2025-09-08T12:01:15Z",
    },
    {
      id: "ai-321-3",
      step: "SCORE",
      title: "Risk Scoring",
      description: "Risk score calculated",
      startedAt: "2025-09-08T12:01:15Z",
      completedAt: "2025-09-08T12:02:55Z",
    },
    {
      id: "ai-321-4",
      step: "DECIDE",
      title: "Decisioning",
      description: "Approved per thresholds",
      startedAt: "2025-09-08T12:02:55Z",
      completedAt: "2025-09-08T12:03:17Z",
    },
  ],
  featureContributions: [
    { name: "Claims History", impact: 0.25 },
    { name: "Property Condition", impact: 0.3 },
  ],
  auditRef: { id: "audit_321" },
};

const classicDecision: DecisionOutput = {
  outcome: "AutoBind",
  confidence: 0.88,
  justification_md: "Markdown justification",
  reasons: ["Reason 1"],
  flags: [],
};

const baseCase: CaseViewModel = {
  id: "C-321",
  title: "AI Auto-Bind – 456 Oak Ridge",
  decisionType: "AI_APPROVED",
  riskLevel: "Low",
  address: "456 Oak Ridge Dr, Naperville, IL",
  aiDecision: baseDecision,
  summary: "Example summary",
  decision: classicDecision,
  support_bullets: ["Bullet 1", "Bullet 2"],
  tabs: {
    property_profile: { address: "456 Oak Ridge" },
    coverage: { deductible: 750 },
    risk: { risk: { score: 0.18 }, guidelines: { note: "Guideline" } },
    attachments: { items: [{ name: "Application.pdf", uri: "#" }] },
  },
  actions: ["bind", "request-info"],
};

describe("AiApprovedCaseDetails", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        caseId: baseCase.id,
        generatedAt: "2025-09-10T00:00:00Z",
        rulesVersion: "UW-Rules v2.1",
        modelVersion: "RiskModel_v3.4",
        steps: [],
      }),
    } as unknown as Response);
  });

  it("renders AI header and badges for AI-approved cases", async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    const rerun = vi.fn().mockResolvedValue(undefined);

    render(
      <AiApprovedCaseDetails
        caseView={baseCase}
        caseId={baseCase.id}
        onDownloadAudit={download}
        onRerun={rerun}
        onReview={() => undefined}
      />
    );

    expect(screen.getByText(/Agentic AI Decisioning Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-Bind/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence 92%/i)).toBeInTheDocument();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});

describe("AI detail building blocks", () => {
  it("matches snapshot for decision summary", () => {
    const { container } = render(<AiDecisionSummary decision={baseDecision} />);
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot for timeline", () => {
    const { container } = render(<AiActionTimeline steps={baseDecision.timeline} />);
    expect(container).toMatchSnapshot();
  });
});

describe("AiDecisionLogTab", () => {
  it("invokes download handler when request is made", async () => {
    const loader = vi.fn().mockResolvedValue({
      caseId: "C-321",
      generatedAt: "2025-09-10T00:00:00Z",
      rulesVersion: "UW-Rules v2.1",
      modelVersion: "RiskModel_v3.4",
      steps: [],
    } satisfies AiAuditLog);
    const downloader = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<AiDecisionLogTab caseId="C-321" loader={loader} downloader={downloader} />);

    await waitFor(() => expect(loader).toHaveBeenCalledWith("C-321"));

    const button = await screen.findByRole("button", { name: /download audit/i });
    await user.click(button);

    expect(downloader).toHaveBeenCalledWith("C-321");
  });
});

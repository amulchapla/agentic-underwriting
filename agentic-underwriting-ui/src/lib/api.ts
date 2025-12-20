import { AiAuditLog, AiDecision, CaseViewModel, CopilotChatResponse, FabricPropertySummary, FabricZipClaimStats, FabricRiskAssessment, LocationIntelligenceResponse } from "./apiTypes";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCaseView(caseId: string): Promise<CaseViewModel> {
  const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(caseId)}/view`, {
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  return handleResponse<CaseViewModel>(res);
}

export async function sendCopilotMessage(message: string, caseId?: string): Promise<CopilotChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/copilot/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ message, case_id: caseId }),
  });
  return handleResponse<CopilotChatResponse>(res);
}

export async function fetchAiAudit(caseId: string): Promise<AiAuditLog> {
  const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(caseId)}/ai-audit`, {
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  return handleResponse<AiAuditLog>(res);
}

export async function rerunAiDecision(caseId: string): Promise<AiDecision> {
  const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(caseId)}/ai/rerun`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
    },
  });
  return handleResponse<AiDecision>(res);
}

export async function downloadAiAudit(caseId: string): Promise<void> {
  if (typeof window === "undefined") {
    await fetchAiAudit(caseId);
    return;
  }

  const audit = await fetchAiAudit(caseId);
  const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${caseId}-ai-audit.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

export async function fetchFabricPropertySummary(
  caseId: string, 
  forceRefresh: boolean = false
): Promise<FabricPropertySummary> {
  const url = `${API_BASE_URL}/api/fabric/property-summary/${encodeURIComponent(caseId)}${forceRefresh ? '?force_refresh=true' : ''}`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  return handleResponse<FabricPropertySummary>(res);
}

export async function fetchFabricZipStats(
  caseId: string,
  forceRefresh: boolean = false,
  years: number = 10
): Promise<FabricZipClaimStats> {
  const params = new URLSearchParams();
  if (forceRefresh) params.set('force_refresh', 'true');
  if (years !== 10) params.set('years', years.toString());
  
  const url = `${API_BASE_URL}/api/fabric/zip-stats/${encodeURIComponent(caseId)}${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  return handleResponse<FabricZipClaimStats>(res);
}

export async function fetchFabricRiskAssessment(
  caseId: string,
  forceRefresh: boolean = false,
  minLoss: number = 100000
): Promise<FabricRiskAssessment> {
  const params = new URLSearchParams();
  if (forceRefresh) params.set('force_refresh', 'true');
  if (minLoss !== 100000) params.set('min_loss', minLoss.toString());
  
  const url = `${API_BASE_URL}/api/fabric/risk-assessment/${encodeURIComponent(caseId)}${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  return handleResponse<FabricRiskAssessment>(res);
}

export async function fetchLocationIntelligence(
  caseId: string
): Promise<LocationIntelligenceResponse> {
  const url = `${API_BASE_URL}/api/location-intelligence/${encodeURIComponent(caseId)}`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  return handleResponse<LocationIntelligenceResponse>(res);
}

export type DecisionOutcome = "AutoBind" | "NeedsReview" | "Decline";

export type DecisionType = "AI_APPROVED" | "HUMAN_REVIEW";

export type AiDecisionOutcome = "AUTO_BIND" | "REFER" | "DECLINE";

// Fabric Data Agent types
export interface FabricCountyClaimRow {
  state: string;
  county_code: string;
  loss_year: number;
  paid_total: number;
  claims_count: number;
  avg_paid_per_claim: number;
}

export interface FabricPropertySummary {
  rows: FabricCountyClaimRow[];
  total_counties: number;
  total_claims: number;
  avg_paid_overall: number;
  cached_at: string;
  cache_expires_at: string;
  raw_response?: any;
}

export interface FabricZipClaimStats {
  zip_code: string;
  years: number;
  claim_frequency: number;
  avg_loss: number;
  cached_at: string;
  cache_expires_at: string;
  raw_response?: any;
}

export interface FabricAgentTable {
  status: string;
  column_count?: number | null;
  row_count?: number | null;
  summary?: string;
  comments?: string;
  response: Array<Record<string, unknown>>;
  column_keys: string[];
}

export interface FabricRiskAssessment {
  severity_table?: FabricAgentTable | null;
  large_losses_table?: FabricAgentTable | null;
  county_code: string;
  min_loss_threshold: number;
  cached_at: string;
  cache_expires_at: string;
  raw_severity?: any;
  raw_large_losses?: any;
}

export interface LocationAdmin {
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface LocationData {
  lat: number;
  lon: number;
  address: string;
  admin: LocationAdmin;
  confidence?: string | number;
}

export interface WeatherAlert {
  headline: string;
  severity: string;
  effective: string;
  expires: string;
  source?: string;
}

export interface IsochroneGeoJSON {
  type: "Feature";
  properties: {
    timeMinutes: number;
    timeSeconds: number;
    center?: any;
    description: string;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  } | null;
}

export interface LocationIntelligenceData {
  input: {
    zipcode: string;
    country: string;
    driveTimeMinutes: number;
  };
  location: LocationData;
  weather: {
    alerts: WeatherAlert[];
    count: number;
  };
  isochrone: IsochroneGeoJSON;
  staticMapBase64?: string;
}

export interface LocationIntelligenceResponse {
  success: boolean;
  error: string | null;
  data: LocationIntelligenceData | null;
}

export type KnowledgeCitation = {
  manual: string;
  chunkId?: string;
  parentId?: string;
  score: number;
};

export type KnowledgeInsight = {
  question: string;
  answer: string;
  citations: KnowledgeCitation[];
  generatedAt: string;
  relevanceScore?: number;
};

export type AiTimelineStep = {
  id: string;
  step: "PREFILL" | "ENRICH" | "SCORE" | "DECIDE";
  title: string;
  description: string;
  startedAt?: string;
  completedAt?: string;
};

export type AiFeatureContribution = {
  name: string;
  impact: number;
  note?: string;
};

export type AiAuditReference = {
  id: string;
  href?: string;
  hash?: string;
};

export type AiDecision = {
  outcome: AiDecisionOutcome;
  confidence: number;
  riskScore: number;
  decisionTimeSeconds: number;
  justification: string;
  rulesVersion: string;
  modelVersion: string;
  validatedAt?: string;
  complianceCheck?: "PASSED" | "FLAGGED";
  timeline: AiTimelineStep[];
  featureContributions?: AiFeatureContribution[];
  auditRef: AiAuditReference;
};

export type DecisionOutput = {
  outcome: DecisionOutcome;
  confidence: number;
  justification_md: string;
  reasons: string[];
  flags: string[];
};

export type AttachmentItem = {
  name: string;
  uri: string;
};

export type CaseTabs = {
  property_profile?: Record<string, unknown> | null;
  coverage?: Record<string, unknown> | null;
  risk?: {
    risk?: Record<string, unknown> | null;
    guidelines?: Record<string, unknown> | null;
  } | null;
  attachments?: {
    count?: number;
    items?: AttachmentItem[];
  } | null;
  [key: string]: unknown;
};

export type CaseViewModel = {
  id: string;
  title?: string;
  decisionType?: DecisionType;
  riskLevel?: "Low" | "Medium" | "High";
  address?: string;
  aiDecision?: AiDecision;
  summary: string;
  decision: DecisionOutput;
  support_bullets: string[];
  tabs: CaseTabs;
  actions: string[];
  knowledgeInsights?: KnowledgeInsight[];
  fabricPropertySummary?: FabricPropertySummary;
  fabricZipClaimStats?: FabricZipClaimStats;
  fabricRiskAssessment?: FabricRiskAssessment;
};

export type CopilotChatResponse = {
  answer: string;
  suggested_actions?: string[];
  decision?: DecisionOutput;
  knowledgeCitations?: KnowledgeCitation[];
};

export type AiAuditLog = {
  caseId: string;
  generatedAt: string;
  rulesVersion: string;
  modelVersion: string;
  steps: Array<Record<string, unknown>>;
  controls?: Record<string, unknown>;
  [key: string]: unknown;
};

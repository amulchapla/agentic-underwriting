from typing import Any, Dict, List, Literal, Optional

from pydantic import AliasChoices, BaseModel, Field


# Fabric Data Agent schemas
class FabricCountyClaimRow(BaseModel):
    """Single row from Fabric property summary response"""
    state: Optional[str] = None
    county_code: str
    loss_year: int
    paid_total: float
    claims_count: int
    avg_paid_per_claim: float


class FabricPropertySummary(BaseModel):
    """Function A: Property support summary from Fabric"""
    rows: List[FabricCountyClaimRow]
    total_counties: int
    total_claims: int
    avg_paid_overall: float
    cached_at: str
    cache_expires_at: str
    raw_response: Optional[Any] = None


class FabricZipClaimStats(BaseModel):
    """Function B: ZIP-level claim frequency and average loss for decisioning intelligence"""
    zip_code: str
    years: int
    claim_frequency: int  # Total claims in this ZIP over the time period
    avg_loss: float  # Average loss amount per claim
    cached_at: str
    cache_expires_at: str
    raw_response: Optional[Any] = None


class FabricAgentTable(BaseModel):
    """Generic table response returned by Fabric Data Agent"""

    status: str
    column_count: Optional[int] = Field(
        None,
        validation_alias=AliasChoices("columns", "column_count"),
    )
    row_count: Optional[int] = Field(
        None,
        validation_alias=AliasChoices("rows", "row_count"),
    )
    summary: Optional[str] = None
    comments: Optional[str] = None
    response: List[Dict[str, Any]] = Field(default_factory=list)
    column_keys: List[str] = Field(default_factory=list)


class FabricRiskAssessment(BaseModel):
    """Function C: Risk assessment with severity trends and large losses"""
    severity_table: Optional[FabricAgentTable] = None
    large_losses_table: Optional[FabricAgentTable] = None
    county_code: str
    min_loss_threshold: float
    cached_at: str
    cache_expires_at: str
    raw_severity: Optional[Any] = None
    raw_large_losses: Optional[Any] = None


class KnowledgeCitation(BaseModel):
    manual: str
    chunkId: Optional[str] = None
    parentId: Optional[str] = None
    score: float


class KnowledgeInsight(BaseModel):
    question: str
    answer: str
    citations: List[KnowledgeCitation]
    generatedAt: str
    relevanceScore: Optional[float] = None


class AiTimelineStep(BaseModel):
    id: str
    step: Literal["PREFILL", "ENRICH", "SCORE", "DECIDE"]
    title: str
    description: str
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None


class FeatureContribution(BaseModel):
    name: str
    impact: float
    note: Optional[str] = None


class AuditReference(BaseModel):
    id: str
    href: Optional[str] = None
    hash: Optional[str] = None


class AiDecision(BaseModel):
    outcome: Literal["AUTO_BIND", "REFER", "DECLINE"]
    confidence: float
    riskScore: float
    decisionTimeSeconds: int
    justification: str
    rulesVersion: str
    modelVersion: str
    validatedAt: Optional[str] = None
    complianceCheck: Optional[Literal["PASSED", "FLAGGED"]] = None
    timeline: List[AiTimelineStep]
    featureContributions: Optional[List[FeatureContribution]] = None
    auditRef: AuditReference


class DecisionOutput(BaseModel):
    outcome: Literal["AutoBind","NeedsReview","Decline"]
    confidence: float
    justification_md: str
    reasons: List[str] = []
    flags: List[str] = []

class CaseViewModel(BaseModel):
    id: str
    title: Optional[str] = None
    decisionType: Literal["AI_APPROVED", "HUMAN_REVIEW"] = "HUMAN_REVIEW"
    riskLevel: Optional[Literal["Low", "Medium", "High"]] = None
    address: Optional[str] = None
    aiDecision: Optional[AiDecision] = None
    summary: str
    decision: DecisionOutput
    support_bullets: List[str]
    tabs: Dict[str, dict]
    actions: List[str]
    knowledgeInsights: Optional[List[KnowledgeInsight]] = None
    fabricPropertySummary: Optional[FabricPropertySummary] = None
    fabricZipClaimStats: Optional[FabricZipClaimStats] = None
    fabricRiskAssessment: Optional[FabricRiskAssessment] = None

class CaseContext(BaseModel):
    case_id: str
    lob: Literal["Homeowners","Property","Auto","CommercialProperty"] = "Homeowners"
    intent: Literal["render_case","bind","request_info","refer_senior","decline"] = "render_case"

class ChatRequest(BaseModel):
    message: str
    case_id: Optional[str] = None


class CopilotChatResponse(BaseModel):
    answer: str
    suggested_actions: Optional[List[str]] = None
    decision: Optional[DecisionOutput] = None
    knowledgeCitations: Optional[List[KnowledgeCitation]] = None

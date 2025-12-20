"""
Foundry-backed Fabric Data Agent helpers (Functions A–E).
Mirrors fabric_data_agent.py but routes calls through the Foundry agent client.
"""
import os
from typing import Any, Dict

from app.services.agents.foundry_fabric_data_agent_client import (
    FoundryFabricDataAgentClient,
)

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

FOUNDRY_ENDPOINT = os.getenv("FOUNDRY_FABRIC_AGENT_ENDPOINT")
FOUNDRY_AGENT_NAME = os.getenv("FOUNDRY_FABRIC_AGENT_NAME")

client = FoundryFabricDataAgentClient(
    endpoint=FOUNDRY_ENDPOINT,
    agent_name=FOUNDRY_AGENT_NAME,
)


# =============================================================================
# A) Property & Support Summary
# =============================================================================
def property_support_summary(top_n: int = 7, state: str = "TX", countyCode: str = "48229") -> Dict[str, Any]:
    """
    Summarize recent NFIP claims and flood exposure for UI summary highlights.
    Returns a structured dict identical to the legacy Fabric Data Agent.
    """
    prompt = (
        f"Summarize recent NFIP claims and flood exposure for 15 counties where paid amount is not $0 for {state} state;"
    )
    result = client.ask_structured(prompt)
    return result.model_dump()


# =============================================================================
# B) Decisioning Intelligence
# =============================================================================
def decisioning_claim_freq_avg_loss_zip(zip_code: str = "48141", years: int = 10) -> Dict[str, Any]:
    """Claim frequency and average loss by ZIP over the past N years."""
    prompt = (
        "Return a table with columns zip, loss_year, claims_count, avg_loss "
        "where claims_count = COUNT(*) and avg_loss = AVG(total_paid) "
        f"from dbo.fema_nfip_claims_fact_gold where zip = '{zip_code}' "
        f"and loss_year >= YEAR(GETDATE()) - {years} "
        "group by zip, loss_year "
        "order by loss_year desc."
    )
    result = client.ask_structured(prompt)
    return result.model_dump()


# =============================================================================
# C) Risk Assessment
# =============================================================================
def risk_assessment_severity_and_large_losses(county_code: str = "26163", min_loss: int = 1) -> Dict[str, Any]:
    """Severity comparison and large-loss drilldown for the Risk Assessment tab."""
    prompt_severity = (
        f"show Average Claim Severity county vs state for county code {county_code} by year for the latest 10 years;"
    )
    prompt_large_losses = (
        f"list last 10 claims over {min_loss} for county code {county_code};"
    )

    severity_result = client.ask_structured(prompt_severity)
    large_losses_result = client.ask_structured(prompt_large_losses)
    return {
        "severity": severity_result.model_dump(),
        "large_losses": large_losses_result.model_dump(),
    }


# =============================================================================
# D) AI Explainability
# =============================================================================
def explainability_5yr_claim_count_by_county(state: str = "TX", county_code: str = "48157") -> Dict[str, Any]:
    """Five-year claim counts by county for a state (top 10 rows)."""
    prompt = (
        f"Fetch 5-year claim count by county code for {state} state. List top 10 rows only;"
    )
    result = client.ask_structured(prompt)
    return result.model_dump()


def explainability_avg_loss_rank_tx(state: str = "TX") -> Dict[str, Any]:
    """Average loss ranking across state counties (top 15)."""
    prompt = (
        f"provide average loss ranked across {state} counties. List top 15 rows only;"
    )
    result = client.ask_structured(prompt)
    return result.model_dump()


# =============================================================================
# E) Agentic AI Action Timeline (Enrichment Snapshot)
# =============================================================================
def action_timeline_enrichment_snapshot(state: str = "TX", county_code: str = "48157") -> Dict[str, Any]:
    """County-year risk features for timeline enrichment snapshot."""
    prompt = (
        "Return a table with columns state, county_code, loss_year, paid_total, claims_count, avg_paid_per_claim "
        "from dbo.fema_nfip_geo_year_gold "
        f"where state = '{state.upper()}' and county_code = '{county_code}' "
        "order by loss_year desc "
        "offset 0 rows fetch next 10 rows only;"
    )
    result = client.ask_structured(prompt)
    return result.model_dump()


if __name__ == "__main__":
    print("\n=== E) Action Timeline Enrichment Snapshot (TX, county 48157) ===")
    e_rows = action_timeline_enrichment_snapshot(state="TX", county_code="48157")
    print("Raw response: \n", e_rows)

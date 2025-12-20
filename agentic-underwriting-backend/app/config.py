from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application settings
    data_root: str = "data"
    
    # CORS settings
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    
    # Azure OpenAI settings
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment: str | None = None
    
    # Foundry Agent settings
    foundry_fabric_agent_endpoint: str | None = None
    foundry_fabric_agent_name: str | None = None
    foundry_knowledge_agent_endpoint: str | None = None
    foundry_knowledge_agent_name: str | None = None
    
    # Azure Maps settings
    azure_maps_base: str = "https://atlas.microsoft.com"
    azure_maps_scope: str = "https://atlas.microsoft.com/.default"
    azure_maps_client_id: str | None = None
    
    # Telemetry settings
    applicationinsights_connection_string: str | None = None
    otel_service_name: str = "agentic-underwriting-backend"

    # Foundry OpenAI invocation for ID scope issues
    foundry_openai_scope: str = "https://ai.azure.com/.default"
    openai_api_version: str = "2025-05-15-preview"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

settings = Settings()
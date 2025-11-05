"""Configuration settings for Python-centric FastAPI services."""

import os
from typing import Dict, List, Optional

from pydantic import Field, ConfigDict, validator
from pydantic_settings import BaseSettings


class DatabaseSettings(BaseSettings):
    """Database configuration settings."""
    
    # PostgreSQL (Primary Database)
    database_url: Optional[str] = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/givemejobs_db",
        description="Async PostgreSQL database URL"
    )
    database_pool_size: int = Field(default=20, description="Database connection pool size")
    database_max_overflow: int = Field(default=30, description="Database max overflow connections")
    database_pool_timeout: int = Field(default=30, description="Database pool timeout seconds")
    database_echo: bool = Field(default=False, description="Echo SQL queries")
    
    # Redis (Caching & Sessions)
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis URL")
    redis_max_connections: int = Field(default=50, description="Redis max connections")
    redis_socket_timeout: int = Field(default=5, description="Redis socket timeout")
    redis_socket_connect_timeout: int = Field(default=5, description="Redis connect timeout")


class SecuritySettings(BaseSettings):
    """Security configuration settings."""
    
    # JWT Configuration
    secret_key: str = Field(
        default="your-secret-key-change-in-production-make-it-very-long-and-random",
        description="JWT secret key"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiry")
    refresh_token_expire_days: int = Field(default=7, description="Refresh token expiry")
    
    # Password Configuration
    password_min_length: int = Field(default=8, description="Minimum password length")
    password_require_uppercase: bool = Field(default=True, description="Require uppercase")
    password_require_lowercase: bool = Field(default=True, description="Require lowercase")
    password_require_numbers: bool = Field(default=True, description="Require numbers")
    password_require_special: bool = Field(default=True, description="Require special chars")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, description="Requests per window")
    rate_limit_window: int = Field(default=60, description="Rate limit window seconds")
    rate_limit_per_user: int = Field(default=1000, description="Per-user rate limit")
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = Field(default=True, description="Allow credentials")
    cors_allow_methods: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        description="Allowed HTTP methods"
    )
    cors_allow_headers: List[str] = Field(
        default=["*"],
        description="Allowed headers"
    )


class AISettings(BaseSettings):
    """AI/ML configuration settings."""
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    openai_model: str = Field(default="gpt-4", description="Default OpenAI model")
    openai_max_tokens: int = Field(default=2000, description="Max tokens per request")
    openai_temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="AI creativity")
    openai_timeout: int = Field(default=60, description="OpenAI request timeout")
    openai_max_retries: int = Field(default=3, description="Max retry attempts")
    
    # Pinecone Configuration
    pinecone_api_key: Optional[str] = Field(default=None, description="Pinecone API key")
    pinecone_environment: Optional[str] = Field(default=None, description="Pinecone environment")
    pinecone_index_name: str = Field(default="jobs-index", description="Pinecone index name")
    pinecone_dimension: int = Field(default=1536, description="Vector dimension")
    pinecone_metric: str = Field(default="cosine", description="Distance metric")
    
    # ML Model Configuration
    ml_model_path: str = Field(default="./models", description="ML models directory")
    enable_model_training: bool = Field(default=True, description="Enable model training")
    model_retrain_interval_hours: int = Field(default=24, description="Model retrain interval")
    min_training_samples: int = Field(default=100, description="Minimum samples for training")
    
    # Document Processing
    max_document_size_mb: int = Field(default=10, description="Max document size in MB")
    supported_formats: List[str] = Field(
        default=["pdf", "docx", "txt", "html"],
        description="Supported document formats"
    )


class MonitoringSettings(BaseSettings):
    """Monitoring and observability settings."""
    
    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format")
    log_correlation_id: bool = Field(default=True, description="Include correlation IDs")
    
    # Sentry Configuration
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN")
    sentry_traces_sample_rate: float = Field(default=0.1, description="Sentry traces sample rate")
    sentry_profiles_sample_rate: float = Field(default=0.1, description="Sentry profiles sample rate")
    
    # OpenTelemetry Configuration
    otel_service_name: str = Field(default="givemejobs-python", description="OpenTelemetry service name")
    otel_exporter_endpoint: Optional[str] = Field(
        default="http://localhost:14268/api/traces",
        description="OpenTelemetry exporter endpoint"
    )
    otel_sampling_rate: float = Field(default=0.1, description="Trace sampling rate")
    
    # Prometheus Configuration
    prometheus_metrics_port: int = Field(default=8001, description="Prometheus metrics port")
    enable_metrics: bool = Field(default=True, description="Enable metrics collection")
    metrics_path: str = Field(default="/metrics", description="Metrics endpoint path")
    
    # Health Checks
    health_check_interval: int = Field(default=30, description="Health check interval seconds")
    dependency_timeout: int = Field(default=5, description="Dependency check timeout")


class Settings(BaseSettings):
    """Main application settings."""
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Service Information
    service_name: str = Field(default="givemejobs-python-backend")
    service_version: str = Field(default="1.0.0")
    environment: str = Field(default="development")
    debug: bool = Field(default=False)
    
    # API Configuration
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    api_prefix: str = Field(default="/api/v1")
    api_title: str = Field(default="GiveMeJobs Python Backend API")
    api_description: str = Field(
        default="Python-centric FastAPI backend for GiveMeJobs platform with AI/ML capabilities"
    )
    
    # Component Settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    ai: AISettings = Field(default_factory=AISettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    
    # Background Tasks
    celery_broker_url: str = Field(default="redis://localhost:6379/1")
    celery_result_backend: str = Field(default="redis://localhost:6379/2")
    celery_task_serializer: str = Field(default="json")
    celery_result_serializer: str = Field(default="json")
    celery_timezone: str = Field(default="UTC")
    
    # External Services
    nodejs_backend_url: str = Field(default="http://localhost:3000")
    
    # External API Configuration
    linkedin_api_key: Optional[str] = Field(default=None)
    indeed_publisher_id: Optional[str] = Field(default=None)
    glassdoor_partner_id: Optional[str] = Field(default=None)
    glassdoor_api_key: Optional[str] = Field(default=None)
    
    # Performance Settings
    max_workers: int = Field(default=4, description="Max worker processes")
    request_timeout: int = Field(default=30, description="Request timeout seconds")
    max_request_size: int = Field(default=16 * 1024 * 1024, description="Max request size bytes")
    
    @validator('environment')
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = ['development', 'testing', 'staging', 'production']
        if v not in allowed:
            raise ValueError(f'Environment must be one of: {allowed}')
        return v
    

    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"
    
    @property
    def is_testing(self) -> bool:
        """Check if running in testing mode."""
        return self.environment == "testing""Configuration settings for Python-centric FastAPI services."""

import os
from typing import Dict, List, Optional

from pydantic import Field, ConfigDict, validator
from pydantic_settings import BaseSettings


class DatabaseSettings(BaseSettings):
    """Database configuration settings."""
    
    model_config = ConfigDict(env_prefix="DB_")
    
    # PostgreSQL (Primary Database)
    url: Optional[str] = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/givemejobs_db",
        description="Async PostgreSQL database URL"
    )
    pool_size: int = Field(default=20, description="Database connection pool size")
    max_overflow: int = Field(default=30, description="Database max overflow connections")
    pool_timeout: int = Field(default=30, description="Database pool timeout seconds")
    pool_recycle: int = Field(default=3600, description="Connection recycle time seconds")
    echo: bool = Field(default=False, description="Echo SQL queries")
    
    # Connection retry settings
    max_retries: int = Field(default=3, description="Max connection retry attempts")
    retry_delay: float = Field(default=1.0, description="Retry delay seconds")


class RedisSettings(BaseSettings):
    """Redis configuration settings."""
    
    model_config = ConfigDict(env_prefix="REDIS_")
    
    url: str = Field(default="redis://localhost:6379/0", description="Redis URL")
    max_connections: int = Field(default=50, description="Redis max connections")
    socket_timeout: int = Field(default=5, description="Redis socket timeout")
    socket_connect_timeout: int = Field(default=5, description="Redis connect timeout")
    retry_on_timeout: bool = Field(default=True, description="Retry on timeout")
    health_check_interval: int = Field(default=30, description="Health check interval")


class SecuritySettings(BaseSettings):
    """Security configuration settings."""
    
    model_config = ConfigDict(env_prefix="SECURITY_")
    
    # JWT Configuration
    secret_key: str = Field(
        default="your-secret-key-change-in-production-make-it-very-long-and-random",
        description="JWT secret key"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiry")
    refresh_token_expire_days: int = Field(default=7, description="Refresh token expiry")
    
    # Password Configuration
    password_min_length: int = Field(default=8, description="Minimum password length")
    password_require_uppercase: bool = Field(default=True, description="Require uppercase")
    password_require_lowercase: bool = Field(default=True, description="Require lowercase")
    password_require_numbers: bool = Field(default=True, description="Require numbers")
    password_require_special: bool = Field(default=True, description="Require special chars")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, description="Requests per window")
    rate_limit_window: int = Field(default=60, description="Rate limit window seconds")
    rate_limit_per_user: int = Field(default=1000, description="Per-user rate limit")
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = Field(default=True, description="Allow credentials")
    cors_allow_methods: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        description="Allowed HTTP methods"
    )
    cors_allow_headers: List[str] = Field(
        default=["*"],
        description="Allowed headers"
    )
    
    # Encryption Configuration
    encryption_key: Optional[str] = Field(default=None, description="Master encryption key")
    field_encryption_enabled: bool = Field(default=True, description="Enable field-level encryption")
    pii_encryption_key_id: str = Field(default="pii_default_v1", description="Default PII encryption key ID")
    session_encryption_key_id: str = Field(default="session_default_v1", description="Default session encryption key ID")
    key_rotation_days: int = Field(default=90, description="Days between key rotations")
    
    # TLS Configuration
    tls_cert_file: Optional[str] = Field(default=None, description="TLS certificate file path")
    tls_key_file: Optional[str] = Field(default=None, description="TLS private key file path")
    tls_ca_file: Optional[str] = Field(default=None, description="TLS CA certificate file path")
    tls_min_version: str = Field(default="TLSv1.3", description="Minimum TLS version")
    enable_hsts: bool = Field(default=True, description="Enable HTTP Strict Transport Security")
    hsts_max_age: int = Field(default=31536000, description="HSTS max age in seconds")


class AISettings(BaseSettings):
    """AI/ML configuration settings."""
    
    model_config = ConfigDict(env_prefix="AI_")
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    openai_model: str = Field(default="gpt-4", description="Default OpenAI model")
    openai_max_tokens: int = Field(default=2000, description="Max tokens per request")
    openai_temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="AI creativity")
    openai_timeout: int = Field(default=60, description="OpenAI request timeout")
    openai_max_retries: int = Field(default=3, description="Max retry attempts")
    
    # Pinecone Configuration
    pinecone_api_key: Optional[str] = Field(default=None, description="Pinecone API key")
    pinecone_environment: Optional[str] = Field(default=None, description="Pinecone environment")
    pinecone_index_name: str = Field(default="jobs-index", description="Pinecone index name")
    pinecone_dimension: int = Field(default=1536, description="Vector dimension")
    pinecone_metric: str = Field(default="cosine", description="Distance metric")
    
    # ML Model Configuration
    model_path: str = Field(default="./models", description="ML models directory")
    enable_model_training: bool = Field(default=True, description="Enable model training")
    model_retrain_interval_hours: int = Field(default=24, description="Model retrain interval")
    min_training_samples: int = Field(default=100, description="Minimum samples for training")
    
    # Document Processing
    max_document_size_mb: int = Field(default=10, description="Max document size in MB")
    supported_formats: List[str] = Field(
        default=["pdf", "docx", "txt", "html"],
        description="Supported document formats"
    )
    
    # Generation Limits
    max_concurrent_generations: int = Field(default=10, description="Max concurrent AI generations")
    generation_timeout: int = Field(default=120, description="Generation timeout seconds")


class MonitoringSettings(BaseSettings):
    """Monitoring and observability settings."""
    
    model_config = ConfigDict(env_prefix="MONITORING_")
    
    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format")
    log_correlation_id: bool = Field(default=True, description="Include correlation IDs")
    log_sql_queries: bool = Field(default=False, description="Log SQL queries")
    
    # Sentry Configuration
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN")
    sentry_traces_sample_rate: float = Field(
        default=0.1, 
        ge=0.0, 
        le=1.0, 
        description="Sentry traces sample rate"
    )
    sentry_profiles_sample_rate: float = Field(
        default=0.1, 
        ge=0.0, 
        le=1.0, 
        description="Sentry profiles sample rate"
    )
    sentry_environment: Optional[str] = Field(default=None, description="Sentry environment")
    
    # OpenTelemetry Configuration
    otel_service_name: str = Field(default="givemejobs-python", description="OpenTelemetry service name")
    otel_exporter_endpoint: Optional[str] = Field(
        default="http://localhost:14268/api/traces",
        description="OpenTelemetry exporter endpoint"
    )
    otel_sampling_rate: float = Field(
        default=0.1, 
        ge=0.0, 
        le=1.0, 
        description="Trace sampling rate"
    )
    otel_resource_attributes: Dict[str, str] = Field(
        default_factory=lambda: {"service.version": "1.0.0"},
        description="OpenTelemetry resource attributes"
    )
    
    # Prometheus Configuration
    prometheus_metrics_port: int = Field(default=8001, description="Prometheus metrics port")
    enable_metrics: bool = Field(default=True, description="Enable metrics collection")
    metrics_path: str = Field(default="/metrics", description="Metrics endpoint path")
    
    # Health Checks
    health_check_interval: int = Field(default=30, description="Health check interval seconds")
    dependency_timeout: int = Field(default=5, description="Dependency check timeout")


class CelerySettings(BaseSettings):
    """Celery configuration settings."""
    
    model_config = ConfigDict(env_prefix="CELERY_")
    
    broker_url: str = Field(default="redis://localhost:6379/1", description="Celery broker URL")
    result_backend: str = Field(default="redis://localhost:6379/2", description="Celery result backend")
    task_serializer: str = Field(default="json", description="Task serializer")
    result_serializer: str = Field(default="json", description="Result serializer")
    accept_content: List[str] = Field(default=["json"], description="Accepted content types")
    timezone: str = Field(default="UTC", description="Celery timezone")
    enable_utc: bool = Field(default=True, description="Enable UTC")
    
    # Task routing
    task_routes: Dict[str, Dict[str, str]] = Field(
        default_factory=lambda: {
            'app.tasks.job_aggregation.*': {'queue': 'job_processing'},
            'app.tasks.document_generation.*': {'queue': 'document_processing'},
            'app.tasks.analytics.*': {'queue': 'analytics'},
        },
        description="Task routing configuration"
    )
    
    # Worker configuration
    worker_concurrency: int = Field(default=4, description="Worker concurrency")
    worker_prefetch_multiplier: int = Field(default=1, description="Worker prefetch multiplier")
    task_acks_late: bool = Field(default=True, description="Acknowledge tasks late")
    worker_disable_rate_limits: bool = Field(default=False, description="Disable rate limits")


class CDNSettings(BaseSettings):
    """CDN and static asset optimization settings."""
    
    model_config = ConfigDict(env_prefix="CDN_")
    
    # CDN Provider Configuration
    provider: str = Field(default="cloudfront", description="CDN provider (cloudfront, cloudflare, custom)")
    base_url: str = Field(default="https://cdn.givemejobs.ai", description="CDN base URL")
    api_key: Optional[str] = Field(default=None, description="CDN API key")
    zone_id: Optional[str] = Field(default=None, description="Zone ID (Cloudflare)")
    distribution_id: Optional[str] = Field(default=None, description="Distribution ID (CloudFront)")
    
    # Cache Configuration
    cache_ttl: int = Field(default=86400, description="Default cache TTL in seconds")
    enable_compression: bool = Field(default=True, description="Enable compression")
    enable_minification: bool = Field(default=True, description="Enable minification")
    
    # Asset Optimization
    image_quality: int = Field(default=85, ge=1, le=100, description="Image quality (1-100)")
    image_max_width: int = Field(default=2048, description="Maximum image width")
    image_max_height: int = Field(default=2048, description="Maximum image height")
    enable_webp: bool = Field(default=True, description="Enable WebP conversion")
    enable_avif: bool = Field(default=False, description="Enable AVIF conversion")
    
    # Minification Settings
    css_minify: bool = Field(default=True, description="Enable CSS minification")
    js_minify: bool = Field(default=True, description="Enable JavaScript minification")
    
    # Compression Settings
    enable_brotli: bool = Field(default=True, description="Enable Brotli compression")
    enable_gzip: bool = Field(default=True, description="Enable Gzip compression")
    
    # Asset Management
    asset_manifest_path: str = Field(default="./asset_manifest.json", description="Asset manifest file path")
    asset_upload_path: str = Field(default="./uploads", description="Asset upload directory")
    max_concurrent_uploads: int = Field(default=5, description="Maximum concurrent uploads")
    
    # AWS S3 Configuration (for CloudFront)
    aws_access_key_id: Optional[str] = Field(default=None, description="AWS access key ID")
    aws_secret_access_key: Optional[str] = Field(default=None, description="AWS secret access key")
    aws_region: str = Field(default="us-east-1", description="AWS region")
    s3_bucket_name: Optional[str] = Field(default=None, description="S3 bucket name")
    
    # Performance Settings
    upload_timeout: int = Field(default=300, description="Upload timeout in seconds")
    optimization_timeout: int = Field(default=60, description="Optimization timeout in seconds")


class Settings(BaseSettings):
    """Main application settings."""
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Service Information
    service_name: str = Field(default="givemejobs-python-backend")
    service_version: str = Field(default="1.0.0")
    environment: str = Field(default="development")
    debug: bool = Field(default=False)
    
    # API Configuration
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    api_prefix: str = Field(default="/api/v1")
    api_title: str = Field(default="GiveMeJobs Python Backend API")
    api_description: str = Field(
        default="Python-centric FastAPI backend for GiveMeJobs platform with AI/ML capabilities"
    )
    
    # Component Settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    ai: AISettings = Field(default_factory=AISettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    celery: CelerySettings = Field(default_factory=CelerySettings)
    cdn: CDNSettings = Field(default_factory=CDNSettings)
    
    # External Services
    nodejs_backend_url: str = Field(default="http://localhost:3000")
    
    # External API Configuration
    linkedin_api_key: Optional[str] = Field(default=None)
    indeed_publisher_id: Optional[str] = Field(default=None)
    glassdoor_partner_id: Optional[str] = Field(default=None)
    glassdoor_api_key: Optional[str] = Field(default=None)
    
    # Performance Settings
    max_workers: int = Field(default=4, description="Max worker processes")
    request_timeout: int = Field(default=30, description="Request timeout seconds")
    max_request_size: int = Field(default=16 * 1024 * 1024, description="Max request size bytes")
    
    @validator('environment')
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = ['development', 'testing', 'staging', 'production']
        if v not in allowed:
            raise ValueError(f'Environment must be one of: {allowed}')
        return v
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"
    
    @property
    def is_testing(self) -> bool:
        """Check if running in testing mode."""
        return self.environment == "testing"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings."""
    return settings
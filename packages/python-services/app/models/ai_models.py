"""Enhanced Pydantic models for AI/ML data structures."""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, validator, root_validator


class AIModelType(str, Enum):
    """Types of AI models."""
    LANGUAGE_MODEL = "language_model"
    EMBEDDING_MODEL = "embedding_model"
    CLASSIFICATION_MODEL = "classification_model"
    REGRESSION_MODEL = "regression_model"
    CLUSTERING_MODEL = "clustering_model"


class ProcessingStatus(str, Enum):
    """Processing status for AI operations."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Priority(str, Enum):
    """Priority levels for AI processing tasks."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class AIRequest(BaseModel):
    """Base model for AI processing requests."""
    request_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: Optional[str] = None
    priority: Priority = Priority.NORMAL
    timeout_seconds: int = Field(default=120, ge=1, le=600)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    correlation_id: Optional[str] = None
    
    class Config:
        use_enum_values = True


class AIResponse(BaseModel):
    """Base model for AI processing responses."""
    request_id: str
    status: ProcessingStatus
    processing_time: float = Field(ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('completed_at')
    def validate_completed_at(cls, v, values):
        if v and values.get('status') not in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]:
            raise ValueError('completed_at can only be set for completed or failed requests')
        return v
    
    class Config:
        use_enum_values = True


class TokenUsage(BaseModel):
    """Token usage statistics for AI models."""
    prompt_tokens: int = Field(ge=0)
    completion_tokens: int = Field(ge=0)
    total_tokens: int = Field(ge=0)
    
    @validator('total_tokens')
    def validate_total_tokens(cls, v, values):
        prompt = values.get('prompt_tokens', 0)
        completion = values.get('completion_tokens', 0)
        if v != prompt + completion:
            return prompt + completion
        return v


class ModelConfiguration(BaseModel):
    """Configuration for AI models."""
    model_name: str
    model_type: AIModelType
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0)
    presence_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0)
    stop_sequences: Optional[List[str]] = None
    
    class Config:
        use_enum_values = True


class EmbeddingRequest(AIRequest):
    """Request for generating embeddings."""
    text: str = Field(..., min_length=1, max_length=8000)
    model: str = Field(default="text-embedding-ada-002")
    encoding_format: str = Field(default="float")
    dimensions: Optional[int] = Field(None, ge=1, le=3072)


class EmbeddingResponse(AIResponse):
    """Response for embedding generation."""
    embedding: Optional[List[float]] = None
    dimension: Optional[int] = None
    model_used: Optional[str] = None
    token_usage: Optional[TokenUsage] = None
    
    @validator('dimension')
    def validate_dimension(cls, v, values):
        embedding = values.get('embedding')
        if embedding and v != len(embedding):
            return len(embedding)
        return v


class BatchEmbeddingRequest(AIRequest):
    """Request for batch embedding generation."""
    texts: List[str] = Field(..., min_items=1, max_items=2048)
    model: str = Field(default="text-embedding-ada-002")
    encoding_format: str = Field(default="float")
    dimensions: Optional[int] = Field(None, ge=1, le=3072)
    batch_size: int = Field(default=100, ge=1, le=2048)
    
    @validator('texts')
    def validate_texts(cls, v):
        for i, text in enumerate(v):
            if not text or len(text) > 8000:
                raise ValueError(f'Text at index {i} is empty or too long (max 8000 chars)')
        return v


class BatchEmbeddingResponse(AIResponse):
    """Response for batch embedding generation."""
    embeddings: Optional[List[List[float]]] = None
    successful_count: int = Field(default=0, ge=0)
    failed_count: int = Field(default=0, ge=0)
    failed_indices: List[int] = Field(default_factory=list)
    total_token_usage: Optional[TokenUsage] = None
    
    @validator('failed_count')
    def validate_failed_count(cls, v, values):
        failed_indices = values.get('failed_indices', [])
        if v != len(failed_indices):
            return len(failed_indices)
        return v


class ChatMessage(BaseModel):
    """Chat message for language model interactions."""
    role: str = Field(..., pattern=r'^(system|user|assistant|function)$')
    content: str = Field(..., min_length=1)
    name: Optional[str] = Field(None, pattern=r'^[a-zA-Z0-9_-]+$')
    function_call: Optional[Dict[str, Any]] = None


class ChatCompletionRequest(AIRequest):
    """Request for chat completion."""
    messages: List[ChatMessage] = Field(..., min_items=1)
    model: str = Field(default="gpt-4")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=4096)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    stop: Optional[Union[str, List[str]]] = None
    stream: bool = Field(default=False)
    functions: Optional[List[Dict[str, Any]]] = None
    function_call: Optional[Union[str, Dict[str, str]]] = None


class ChatCompletionResponse(AIResponse):
    """Response for chat completion."""
    message: Optional[ChatMessage] = None
    finish_reason: Optional[str] = None
    token_usage: Optional[TokenUsage] = None
    model_used: Optional[str] = None


class VectorSearchQuery(BaseModel):
    """Vector search query parameters."""
    vector: List[float] = Field(..., min_items=1)
    top_k: int = Field(default=10, ge=1, le=1000)
    filter: Optional[Dict[str, Any]] = None
    include_metadata: bool = Field(default=True)
    include_values: bool = Field(default=False)
    namespace: Optional[str] = None


class VectorSearchResult(BaseModel):
    """Individual vector search result."""
    id: str
    score: float = Field(ge=0.0, le=1.0)
    values: Optional[List[float]] = None
    metadata: Optional[Dict[str, Any]] = None


class VectorSearchResponse(BaseModel):
    """Response for vector search."""
    matches: List[VectorSearchResult] = Field(default_factory=list)
    namespace: Optional[str] = None
    usage: Optional[Dict[str, int]] = None


class MLModelMetrics(BaseModel):
    """Metrics for ML model performance."""
    accuracy: Optional[float] = Field(None, ge=0.0, le=1.0)
    precision: Optional[float] = Field(None, ge=0.0, le=1.0)
    recall: Optional[float] = Field(None, ge=0.0, le=1.0)
    f1_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    auc_roc: Optional[float] = Field(None, ge=0.0, le=1.0)
    mean_squared_error: Optional[float] = Field(None, ge=0.0)
    mean_absolute_error: Optional[float] = Field(None, ge=0.0)
    r2_score: Optional[float] = Field(None, ge=-1.0, le=1.0)
    training_samples: Optional[int] = Field(None, ge=0)
    validation_samples: Optional[int] = Field(None, ge=0)
    training_time: Optional[float] = Field(None, ge=0.0)


class MLModelInfo(BaseModel):
    """Information about ML models."""
    model_id: str
    model_name: str
    model_type: AIModelType
    version: str
    created_at: datetime
    updated_at: datetime
    metrics: Optional[MLModelMetrics] = None
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    feature_names: Optional[List[str]] = None
    target_names: Optional[List[str]] = None
    is_active: bool = Field(default=True)
    
    class Config:
        use_enum_values = True


class PredictionRequest(AIRequest):
    """Request for ML model predictions."""
    model_id: str
    features: Dict[str, Any]
    return_probabilities: bool = Field(default=False)
    return_feature_importance: bool = Field(default=False)


class PredictionResponse(AIResponse):
    """Response for ML model predictions."""
    prediction: Optional[Union[float, int, str, List[Union[float, int, str]]]] = None
    probabilities: Optional[Dict[str, float]] = None
    feature_importance: Optional[Dict[str, float]] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    model_version: Optional[str] = None


class TrainingRequest(AIRequest):
    """Request for ML model training."""
    model_name: str
    model_type: AIModelType
    training_data: Dict[str, Any]  # Could be file path, database query, etc.
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    validation_split: float = Field(default=0.2, ge=0.0, le=0.5)
    cross_validation_folds: Optional[int] = Field(None, ge=2, le=10)
    
    class Config:
        use_enum_values = True


class TrainingResponse(AIResponse):
    """Response for ML model training."""
    model_id: Optional[str] = None
    model_info: Optional[MLModelInfo] = None
    training_metrics: Optional[MLModelMetrics] = None
    validation_metrics: Optional[MLModelMetrics] = None
    feature_importance: Optional[Dict[str, float]] = None


class AIServiceHealth(BaseModel):
    """Health status for AI services."""
    service_name: str
    status: str = Field(pattern=r'^(healthy|degraded|unhealthy)$')
    version: str
    uptime_seconds: float = Field(ge=0)
    total_requests: int = Field(ge=0)
    successful_requests: int = Field(ge=0)
    failed_requests: int = Field(ge=0)
    average_response_time: float = Field(ge=0)
    last_health_check: datetime
    dependencies: Dict[str, bool] = Field(default_factory=dict)
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        if self.total_requests == 0:
            return 100.0
        return (self.successful_requests / self.total_requests) * 100.0
    
    @property
    def error_rate(self) -> float:
        """Calculate error rate percentage."""
        return 100.0 - self.success_rate


class RateLimitInfo(BaseModel):
    """Rate limiting information."""
    limit: int = Field(ge=1)
    remaining: int = Field(ge=0)
    reset_time: datetime
    window_seconds: int = Field(ge=1)
    
    @validator('remaining')
    def validate_remaining(cls, v, values):
        limit = values.get('limit', 0)
        if v > limit:
            raise ValueError('remaining cannot be greater than limit')
        return v


class AIServiceUsage(BaseModel):
    """Usage statistics for AI services."""
    service_name: str
    period_start: datetime
    period_end: datetime
    total_requests: int = Field(ge=0)
    successful_requests: int = Field(ge=0)
    failed_requests: int = Field(ge=0)
    total_tokens: int = Field(ge=0)
    total_cost: Optional[float] = Field(None, ge=0.0)
    average_response_time: float = Field(ge=0)
    peak_requests_per_minute: int = Field(ge=0)
    unique_users: int = Field(ge=0)
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        if self.total_requests == 0:
            return 100.0
        return (self.successful_requests / self.total_requests) * 100.0
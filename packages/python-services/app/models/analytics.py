"""
Analytics-related Pydantic models.

This module contains all analytics-related data models including user metrics,
success predictions, and insights generation.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import Field, validator

from .base import BaseModel, TimestampedModel


class MetricType(str, Enum):
    """Metric type enumeration."""
    COUNT = "count"
    RATE = "rate"
    AVERAGE = "average"
    PERCENTAGE = "percentage"
    SCORE = "score"
    DURATION = "duration"


class TimePeriod(str, Enum):
    """Time period enumeration."""
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    ALL_TIME = "all_time"


class InsightType(str, Enum):
    """Insight type enumeration."""
    PERFORMANCE = "performance"
    TREND = "trend"
    COMPARISON = "comparison"
    RECOMMENDATION = "recommendation"
    PREDICTION = "prediction"
    ANOMALY = "anomaly"


class ConfidenceLevel(str, Enum):
    """Confidence level enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


# Core Analytics Models
class Metric(BaseModel):
    """Individual metric model."""
    name: str = Field(..., description="Metric name")
    value: float = Field(..., description="Metric value")
    metric_type: MetricType = Field(..., description="Metric type")
    unit: Optional[str] = Field(None, description="Metric unit")
    description: Optional[str] = Field(None, description="Metric description")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Metric timestamp")


class UserMetrics(BaseModel):
    """User-specific metrics model."""
    user_id: UUID = Field(..., description="User ID")
    
    # Application metrics
    total_applications: int = Field(default=0, ge=0, description="Total applications submitted")
    applications_this_month: int = Field(default=0, ge=0, description="Applications this month")
    applications_this_week: int = Field(default=0, ge=0, description="Applications this week")
    
    # Response metrics
    total_responses: int = Field(default=0, ge=0, description="Total responses received")
    response_rate: float = Field(default=0.0, ge=0, le=100, description="Response rate percentage")
    average_response_time_days: Optional[float] = Field(
        None, 
        ge=0, 
        description="Average response time in days"
    )
    
    # Interview metrics
    total_interviews: int = Field(default=0, ge=0, description="Total interviews scheduled")
    interviews_completed: int = Field(default=0, ge=0, description="Interviews completed")
    interview_rate: float = Field(default=0.0, ge=0, le=100, description="Interview rate percentage")
    interview_success_rate: float = Field(
        default=0.0, 
        ge=0, 
        le=100, 
        description="Interview to offer rate"
    )
    
    # Offer metrics
    total_offers: int = Field(default=0, ge=0, description="Total offers received")
    offers_accepted: int = Field(default=0, ge=0, description="Offers accepted")
    offer_rate: float = Field(default=0.0, ge=0, le=100, description="Offer rate percentage")
    
    # Profile metrics
    profile_completeness: float = Field(
        default=0.0, 
        ge=0, 
        le=100, 
        description="Profile completeness percentage"
    )
    skill_score: float = Field(default=0.0, ge=0, le=100, description="Overall skill score")
    profile_views: int = Field(default=0, ge=0, description="Profile views")
    
    # Engagement metrics
    job_searches: int = Field(default=0, ge=0, description="Number of job searches")
    job_views: int = Field(default=0, ge=0, description="Number of job views")
    documents_generated: int = Field(default=0, ge=0, description="Documents generated")
    
    # Time-based metrics
    avg_time_to_apply_hours: Optional[float] = Field(
        None,
        ge=0,
        description="Average time from job view to application"
    )
    most_active_day: Optional[str] = Field(None, description="Most active day of week")
    most_active_hour: Optional[int] = Field(None, ge=0, le=23, description="Most active hour")
    
    last_calculated: datetime = Field(
        default_factory=datetime.utcnow,
        description="When metrics were last calculated"
    )


class SuccessPrediction(BaseModel):
    """Success prediction model."""
    user_id: UUID = Field(..., description="User ID")
    success_probability: float = Field(
        ..., 
        ge=0, 
        le=100, 
        description="Success probability percentage"
    )
    confidence: ConfidenceLevel = Field(..., description="Prediction confidence level")
    confidence_score: float = Field(..., ge=0, le=100, description="Confidence score")
    
    # Key factors influencing prediction
    key_factors: List[str] = Field(..., description="Key factors affecting success")
    positive_factors: List[str] = Field(
        default_factory=list,
        description="Factors positively affecting success"
    )
    negative_factors: List[str] = Field(
        default_factory=list,
        description="Factors negatively affecting success"
    )
    
    # Specific predictions
    next_response_probability: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Probability of getting next response"
    )
    next_interview_probability: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Probability of getting next interview"
    )
    next_offer_probability: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Probability of getting next offer"
    )
    
    # Time predictions
    estimated_days_to_offer: Optional[int] = Field(
        None,
        ge=1,
        description="Estimated days to receive an offer"
    )
    estimated_applications_to_offer: Optional[int] = Field(
        None,
        ge=1,
        description="Estimated applications needed for an offer"
    )
    
    model_version: str = Field(default="1.0", description="Prediction model version")
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When prediction was generated"
    )


class Insight(BaseModel):
    """Individual insight model."""
    insight_type: InsightType = Field(..., description="Type of insight")
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Detailed insight description")
    impact: str = Field(..., description="Potential impact of the insight")
    confidence: ConfidenceLevel = Field(..., description="Insight confidence level")
    priority: int = Field(..., ge=1, le=5, description="Insight priority (1=highest)")
    actionable: bool = Field(..., description="Whether insight is actionable")
    action_items: List[str] = Field(
        default_factory=list,
        description="Specific action items"
    )
    supporting_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Data supporting the insight"
    )
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When insight was generated"
    )


class BenchmarkData(BaseModel):
    """Benchmark comparison data."""
    category: str = Field(..., description="Benchmark category")
    user_value: float = Field(..., description="User's value")
    benchmark_value: float = Field(..., description="Benchmark value")
    percentile: Optional[float] = Field(None, ge=0, le=100, description="User's percentile")
    comparison: str = Field(..., description="Comparison description")
    sample_size: Optional[int] = Field(None, ge=1, description="Benchmark sample size")


class AnalyticsInsights(BaseModel):
    """Complete analytics insights model."""
    user_id: UUID = Field(..., description="User ID")
    time_period: TimePeriod = Field(..., description="Analysis time period")
    
    # Core metrics
    metrics: UserMetrics = Field(..., description="User metrics")
    
    # Predictions
    success_prediction: SuccessPrediction = Field(..., description="Success prediction")
    
    # Insights
    insights: List[Insight] = Field(..., description="Generated insights")
    
    # Recommendations
    recommendations: List[str] = Field(..., description="Actionable recommendations")
    
    # Benchmarking
    industry_benchmarks: List[BenchmarkData] = Field(
        default_factory=list,
        description="Industry benchmark comparisons"
    )
    platform_benchmarks: List[BenchmarkData] = Field(
        default_factory=list,
        description="Platform benchmark comparisons"
    )
    
    # Trends
    performance_trend: str = Field(..., description="Overall performance trend")
    trend_data: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Historical trend data"
    )
    
    # Market insights
    market_insights: List[str] = Field(
        default_factory=list,
        description="Job market insights"
    )
    
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When insights were generated"
    )


# Analytics Request Models
class AnalyticsRequest(BaseModel):
    """Analytics generation request."""
    user_id: UUID = Field(..., description="User ID")
    time_period: TimePeriod = Field(default=TimePeriod.MONTH, description="Analysis time period")
    include_predictions: bool = Field(default=True, description="Include success predictions")
    include_benchmarks: bool = Field(default=True, description="Include benchmark comparisons")
    include_market_insights: bool = Field(default=True, description="Include market insights")
    custom_metrics: List[str] = Field(
        default_factory=list,
        description="Additional custom metrics to calculate"
    )


class AnalyticsResponse(BaseModel):
    """Analytics generation response."""
    user_id: UUID = Field(..., description="User ID")
    insights: AnalyticsInsights = Field(..., description="Generated insights")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    cache_hit: bool = Field(default=False, description="Whether result was cached")
    expires_at: Optional[datetime] = Field(None, description="When cached result expires")


# Batch Analytics Models
class BatchAnalyticsRequest(BaseModel):
    """Batch analytics request for multiple users."""
    user_ids: List[UUID] = Field(..., min_items=1, max_items=100, description="User IDs")
    time_period: TimePeriod = Field(default=TimePeriod.MONTH, description="Analysis time period")
    include_predictions: bool = Field(default=True, description="Include success predictions")
    include_benchmarks: bool = Field(default=False, description="Include benchmark comparisons")
    parallel_processing: bool = Field(default=True, description="Process in parallel")


class BatchAnalyticsResponse(BaseModel):
    """Batch analytics response."""
    total_users: int = Field(..., description="Total users processed")
    successful: int = Field(..., description="Successfully processed users")
    failed: int = Field(..., description="Failed processing count")
    results: List[AnalyticsResponse] = Field(..., description="Individual results")
    errors: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Processing errors"
    )
    total_processing_time_ms: float = Field(..., description="Total processing time")


# Analytics Configuration Models
class AnalyticsConfig(BaseModel):
    """Analytics configuration model."""
    user_id: UUID = Field(..., description="User ID")
    auto_generate: bool = Field(default=True, description="Auto-generate insights")
    generation_frequency: str = Field(
        default="weekly",
        description="How often to generate insights"
    )
    include_email_reports: bool = Field(default=False, description="Include in email reports")
    benchmark_categories: List[str] = Field(
        default_factory=list,
        description="Benchmark categories to include"
    )
    custom_goals: Dict[str, float] = Field(
        default_factory=dict,
        description="Custom user goals"
    )
    notification_preferences: Dict[str, bool] = Field(
        default_factory=dict,
        description="Notification preferences"
    )


# Market Analytics Models
class MarketTrend(BaseModel):
    """Market trend data model."""
    metric_name: str = Field(..., description="Metric name")
    current_value: float = Field(..., description="Current metric value")
    previous_value: float = Field(..., description="Previous period value")
    change_percentage: float = Field(..., description="Percentage change")
    trend_direction: str = Field(..., description="Trend direction (up/down/stable)")
    significance: str = Field(..., description="Statistical significance")
    period: TimePeriod = Field(..., description="Time period")
    last_updated: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last update timestamp"
    )


class IndustryAnalytics(BaseModel):
    """Industry-specific analytics model."""
    industry: str = Field(..., description="Industry name")
    total_jobs: int = Field(..., ge=0, description="Total active jobs")
    new_jobs_this_period: int = Field(..., ge=0, description="New jobs this period")
    avg_salary_range: Dict[str, float] = Field(..., description="Average salary range")
    top_skills: List[str] = Field(..., description="Most in-demand skills")
    top_locations: List[str] = Field(..., description="Top job locations")
    remote_percentage: float = Field(..., ge=0, le=100, description="Remote job percentage")
    competition_level: str = Field(..., description="Competition level")
    growth_rate: float = Field(..., description="Industry growth rate")
    trends: List[MarketTrend] = Field(..., description="Industry trends")
    last_calculated: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last calculation timestamp"
    )
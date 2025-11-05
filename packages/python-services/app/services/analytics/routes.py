"""Analytics Service routes."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.auth import ServiceAuth, get_current_auth
from app.core.logging import get_logger
from .service import analytics_engine

logger = get_logger(__name__)
router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    service: str
    version: str


class AnalyticsRequest(BaseModel):
    """Analytics calculation request model."""
    user_id: str = Field(..., description="User ID for analytics calculation")
    time_period: str = Field(default="3m", description="Time period (1m, 3m, 6m, 1y)")


class AnalyticsResponse(BaseModel):
    """Analytics response model."""
    user_id: str
    period: str
    metrics: dict
    insights: list
    success_prediction: dict
    recommendations: list
    benchmarks: dict
    processing_time: float
    generated_at: str


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="analytics",
        version="1.0.0"
    )


class StatusResponse(BaseModel):
    """Status response model."""
    service: str
    status: str
    version: str
    features: list


@router.get("/status", response_model=StatusResponse)
async def service_status(auth: ServiceAuth = Depends(get_current_auth)):
    """Service status endpoint (requires authentication)."""
    return StatusResponse(
        service="analytics",
        status="operational",
        version="1.0.0",
        features=["application-insights", "success-predictions", "benchmarks", "ml-recommendations"]
    )


@router.get("/status")
async def service_status(auth: ServiceAuth = Depends(get_current_auth)):
    """Service status endpoint with authentication."""
    logger.info("Service status requested", service=auth.service_name)
    return {
        "service": "analytics",
        "status": "operational",
        "features": [
            "application-insights",
            "success-prediction",
            "statistical-analysis",
            "benchmarking",
            "ml-recommendations"
        ]
    }


@router.post("/calculate-insights", response_model=AnalyticsResponse)
async def calculate_user_insights(
    request: AnalyticsRequest,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """
    Calculate comprehensive analytics insights for a user.
    
    This endpoint provides:
    - Basic application metrics (response rate, interview rate, etc.)
    - AI-generated insights and recommendations
    - ML-powered success predictions
    - Benchmark comparisons against platform averages
    """
    try:
        logger.info("Analytics calculation requested", 
                   user_id=request.user_id, 
                   period=request.time_period,
                   service=auth.service_name)
        
        result = await analytics_engine.calculate_application_insights(
            user_id=request.user_id,
            time_period=request.time_period
        )
        
        if "error" in result:
            raise HTTPException(
                status_code=404,
                detail=f"No data available: {result['error']}"
            )
        
        return AnalyticsResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Analytics calculation failed", 
                    user_id=request.user_id, 
                    error=str(e), 
                    exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Analytics calculation failed"
        )


@router.get("/insights/{user_id}")
async def get_user_insights(
    user_id: str,
    time_period: str = Query(default="3m", description="Time period (1m, 3m, 6m, 1y)"),
    auth: ServiceAuth = Depends(get_current_auth)
):
    """
    Get analytics insights for a specific user.
    
    Query parameters:
    - time_period: Analysis period (1m, 3m, 6m, 1y)
    """
    try:
        logger.info("User insights requested", 
                   user_id=user_id, 
                   period=time_period,
                   service=auth.service_name)
        
        result = await analytics_engine.calculate_application_insights(
            user_id=user_id,
            time_period=time_period
        )
        
        if "error" in result:
            raise HTTPException(
                status_code=404,
                detail=f"No data available: {result['error']}"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("User insights retrieval failed", 
                    user_id=user_id, 
                    error=str(e), 
                    exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user insights"
        )


@router.get("/benchmarks")
async def get_platform_benchmarks(
    auth: ServiceAuth = Depends(get_current_auth)
):
    """
    Get platform-wide benchmark statistics.
    
    Returns aggregated metrics across all users for comparison purposes.
    """
    try:
        logger.info("Platform benchmarks requested", service=auth.service_name)
        
        # TODO: Implement actual platform benchmarks calculation
        # For now, return sample benchmarks
        benchmarks = {
            "platform_averages": {
                "response_rate": 25.0,
                "interview_rate": 15.0,
                "offer_rate": 8.0,
                "applications_per_month": 15.0,
                "average_response_time_days": 7.5
            },
            "percentile_ranges": {
                "top_10_percent": {
                    "response_rate": 45.0,
                    "interview_rate": 30.0,
                    "offer_rate": 18.0
                },
                "median": {
                    "response_rate": 22.0,
                    "interview_rate": 12.0,
                    "offer_rate": 6.0
                },
                "bottom_10_percent": {
                    "response_rate": 8.0,
                    "interview_rate": 3.0,
                    "offer_rate": 1.0
                }
            },
            "industry_benchmarks": {
                "technology": {"response_rate": 28.0, "interview_rate": 18.0},
                "finance": {"response_rate": 22.0, "interview_rate": 14.0},
                "healthcare": {"response_rate": 30.0, "interview_rate": 20.0}
            },
            "generated_at": "2024-11-04T12:00:00Z",
            "data_points": 10000
        }
        
        return benchmarks
        
    except Exception as e:
        logger.error("Platform benchmarks retrieval failed", 
                    error=str(e), 
                    exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve platform benchmarks"
        )


@router.post("/predict-success/{user_id}")
async def predict_application_success(
    user_id: str,
    auth: ServiceAuth = Depends(get_current_auth)
):
    """
    Generate ML-powered success predictions for a user's next application.
    
    Uses historical application data and machine learning models to predict
    the likelihood of success for future applications.
    """
    try:
        logger.info("Success prediction requested", 
                   user_id=user_id,
                   service=auth.service_name)
        
        # Get user's application data
        result = await analytics_engine.calculate_application_insights(
            user_id=user_id,
            time_period="6m"  # Use 6 months for better ML predictions
        )
        
        if "error" in result:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient data for predictions: {result['error']}"
            )
        
        # Extract just the prediction part
        prediction = result.get("success_prediction", {})
        
        return {
            "user_id": user_id,
            "prediction": prediction,
            "model_info": {
                "model_type": "RandomForestClassifier",
                "features_used": [
                    "match_score", "application_timing", "industry_fit",
                    "company_size", "remote_preference", "salary_alignment"
                ],
                "training_period": "6_months",
                "last_updated": result.get("generated_at")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Success prediction failed", 
                    user_id=user_id, 
                    error=str(e), 
                    exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate success predictions"
        )


@router.get("/report/{user_id}")
async def generate_comprehensive_report(
    user_id: str,
    time_period: str = Query(default="3m", description="Time period (1m, 3m, 6m, 1y)"),
    include_visualizations: bool = Query(default=False, description="Include visualization data"),
    auth: ServiceAuth = Depends(get_current_auth)
):
    """
    Generate a comprehensive analytics report with all insights, trends, and recommendations.
    
    This endpoint provides:
    - Executive summary
    - Detailed metrics and benchmarks
    - Trend analysis
    - Prioritized action items
    - ML-powered predictions
    - Optional visualization data
    """
    try:
        logger.info("Comprehensive report requested", 
                   user_id=user_id, 
                   period=time_period,
                   service=auth.service_name)
        
        report = await analytics_engine.generate_analytics_report(
            user_id=user_id,
            time_period=time_period,
            include_visualizations=include_visualizations
        )
        
        if "error" in report:
            raise HTTPException(
                status_code=404,
                detail=f"No data available: {report['error']}"
            )
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Comprehensive report generation failed", 
                    user_id=user_id, 
                    error=str(e), 
                    exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate comprehensive report"
        )
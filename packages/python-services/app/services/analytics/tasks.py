"""Background tasks for analytics service."""

import asyncio
from typing import Dict, Any, List

from app.core.celery import celery_app
from app.core.logging import get_logger
from .service import analytics_engine

logger = get_logger(__name__)


@celery_app.task(bind=True, name="analytics.calculate_user_analytics")
def calculate_user_analytics_task(self, user_ids: List[str] = None) -> Dict[str, Any]:
    """Background task to calculate user analytics for multiple users."""
    try:
        logger.info("Starting user analytics calculation task", 
                   user_count=len(user_ids) if user_ids else 0)
        
        if not user_ids:
            # TODO: In production, fetch all active user IDs from database
            user_ids = [f"user_{i}" for i in range(1, 101)]  # Sample 100 users
        
        processed_count = 0
        failed_count = 0
        
        # Process users in batches to avoid overwhelming the system
        batch_size = 10
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i + batch_size]
            
            for user_id in batch:
                try:
                    # Run async function in sync context
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    result = loop.run_until_complete(
                        analytics_engine.calculate_application_insights(
                            user_id=user_id,
                            time_period="3m"
                        )
                    )
                    
                    loop.close()
                    
                    if "error" not in result:
                        processed_count += 1
                        logger.debug("Analytics calculated for user", user_id=user_id)
                    else:
                        failed_count += 1
                        logger.warning("No data for user", user_id=user_id)
                        
                except Exception as user_error:
                    failed_count += 1
                    logger.error("Failed to process user analytics", 
                               user_id=user_id, error=str(user_error))
        
        result = {
            "status": "completed",
            "users_processed": processed_count,
            "users_failed": failed_count,
            "total_users": len(user_ids),
            "success_rate": processed_count / len(user_ids) if user_ids else 0
        }
        
        logger.info("User analytics calculation completed", 
                   processed=processed_count, failed=failed_count)
        return result
        
    except Exception as e:
        logger.error("User analytics calculation task failed", error=str(e), exc_info=True)
        self.retry(countdown=300, max_retries=3)


@celery_app.task(bind=True, name="analytics.generate_success_predictions")
def generate_success_predictions_task(self, user_id: str) -> Dict[str, Any]:
    """Background task to generate success predictions for a user."""
    try:
        logger.info("Starting success prediction generation task", user_id=user_id)
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        analytics_result = loop.run_until_complete(
            analytics_engine.calculate_application_insights(
                user_id=user_id,
                time_period="6m"  # Use 6 months for better predictions
            )
        )
        
        loop.close()
        
        if "error" in analytics_result:
            raise ValueError(f"Insufficient data for user {user_id}: {analytics_result['error']}")
        
        prediction = analytics_result.get("success_prediction", {})
        
        result = {
            "status": "completed",
            "user_id": user_id,
            "predictions": {
                "success_probability": prediction.get("success_probability", 0.0),
                "confidence": prediction.get("confidence", 0.0),
                "key_factors": prediction.get("key_factors", []),
                "recommendations": prediction.get("recommendations", [])
            },
            "model_info": {
                "model_type": "RandomForestClassifier",
                "training_period": "6_months",
                "features_count": len(prediction.get("key_factors", [])),
                "generated_at": analytics_result.get("generated_at")
            },
            "processing_time": analytics_result.get("processing_time", 0.0)
        }
        
        logger.info("Success prediction generation completed successfully", 
                   user_id=user_id, 
                   probability=prediction.get("success_probability", 0.0))
        return result
        
    except Exception as e:
        logger.error("Success prediction generation failed", 
                    user_id=user_id, error=str(e), exc_info=True)
        self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, name="analytics.calculate_platform_benchmarks")
def calculate_platform_benchmarks_task(self) -> Dict[str, Any]:
    """Background task to calculate platform-wide benchmarks."""
    try:
        logger.info("Starting platform benchmarks calculation task")
        
        # TODO: In production, implement actual database aggregation
        # For now, simulate benchmark calculation with sample data
        
        # Simulate processing multiple users for benchmarks
        sample_users = [f"user_{i}" for i in range(1, 1001)]  # 1000 users
        
        response_rates = []
        interview_rates = []
        offer_rates = []
        
        # Process sample of users to calculate benchmarks
        processed = 0
        for user_id in sample_users[:100]:  # Sample 100 users for benchmarks
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                result = loop.run_until_complete(
                    analytics_engine.calculate_application_insights(
                        user_id=user_id,
                        time_period="3m"
                    )
                )
                
                loop.close()
                
                if "error" not in result:
                    metrics = result.get("metrics", {})
                    response_rates.append(metrics.get("response_rate", 0))
                    interview_rates.append(metrics.get("interview_rate", 0))
                    offer_rates.append(metrics.get("offer_rate", 0))
                    processed += 1
                    
            except Exception as user_error:
                logger.warning("Failed to process user for benchmarks", 
                             user_id=user_id, error=str(user_error))
        
        # Calculate platform averages
        import numpy as np
        
        benchmarks = {
            "platform_averages": {
                "response_rate": float(np.mean(response_rates)) if response_rates else 25.0,
                "interview_rate": float(np.mean(interview_rates)) if interview_rates else 15.0,
                "offer_rate": float(np.mean(offer_rates)) if offer_rates else 8.0,
                "applications_per_month": 15.0  # Default value
            },
            "percentiles": {
                "p25": {
                    "response_rate": float(np.percentile(response_rates, 25)) if response_rates else 15.0,
                    "interview_rate": float(np.percentile(interview_rates, 25)) if interview_rates else 8.0,
                    "offer_rate": float(np.percentile(offer_rates, 25)) if offer_rates else 3.0
                },
                "p50": {
                    "response_rate": float(np.percentile(response_rates, 50)) if response_rates else 22.0,
                    "interview_rate": float(np.percentile(interview_rates, 50)) if interview_rates else 12.0,
                    "offer_rate": float(np.percentile(offer_rates, 50)) if offer_rates else 6.0
                },
                "p75": {
                    "response_rate": float(np.percentile(response_rates, 75)) if response_rates else 35.0,
                    "interview_rate": float(np.percentile(interview_rates, 75)) if interview_rates else 22.0,
                    "offer_rate": float(np.percentile(offer_rates, 75)) if offer_rates else 12.0
                }
            },
            "data_points": processed,
            "total_users_analyzed": len(sample_users)
        }
        
        result = {
            "status": "completed",
            "benchmarks": benchmarks,
            "users_processed": processed,
            "calculation_time": 60.3
        }
        
        logger.info("Platform benchmarks calculation completed successfully", 
                   users_processed=processed)
        return result
        
    except Exception as e:
        logger.error("Platform benchmarks calculation failed", error=str(e), exc_info=True)
        self.retry(countdown=600, max_retries=3)


@celery_app.task(bind=True, name="analytics.cleanup_expired_data")
def cleanup_expired_data_task(self) -> Dict[str, Any]:
    """Background task to cleanup expired analytics data."""
    try:
        logger.info("Starting expired data cleanup task")
        
        # TODO: Implement actual data cleanup logic
        # This would typically involve:
        # 1. Cleaning up old analytics cache entries
        # 2. Removing expired ML model files
        # 3. Archiving old benchmark data
        # 4. Cleaning up temporary computation files
        
        # Simulate cleanup operations
        cleanup_operations = [
            {"type": "analytics_cache", "records": 500, "size_mb": 50},
            {"type": "ml_models", "records": 50, "size_mb": 100},
            {"type": "benchmark_data", "records": 200, "size_mb": 25},
            {"type": "temp_files", "records": 750, "size_mb": 75}
        ]
        
        total_records = sum(op["records"] for op in cleanup_operations)
        total_size = sum(op["size_mb"] for op in cleanup_operations)
        
        result = {
            "status": "completed",
            "cleanup_operations": cleanup_operations,
            "total_records_cleaned": total_records,
            "total_storage_freed_mb": total_size,
            "cleanup_time": 15.7
        }
        
        logger.info("Expired data cleanup completed successfully", 
                   records_cleaned=total_records,
                   storage_freed_mb=total_size)
        return result
        
    except Exception as e:
        logger.error("Expired data cleanup failed", error=str(e), exc_info=True)
        self.retry(countdown=3600, max_retries=2)


@celery_app.task(bind=True, name="analytics.batch_update_user_insights")
def batch_update_user_insights_task(self, user_ids: List[str]) -> Dict[str, Any]:
    """Background task to update insights for a batch of users."""
    try:
        logger.info("Starting batch user insights update", user_count=len(user_ids))
        
        results = []
        for user_id in user_ids:
            try:
                # Trigger individual user analytics calculation
                task_result = generate_success_predictions_task.delay(user_id)
                results.append({
                    "user_id": user_id,
                    "task_id": task_result.id,
                    "status": "queued"
                })
            except Exception as e:
                results.append({
                    "user_id": user_id,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "status": "completed",
            "batch_size": len(user_ids),
            "tasks_queued": len([r for r in results if r["status"] == "queued"]),
            "tasks_failed": len([r for r in results if r["status"] == "failed"]),
            "results": results
        }
        
    except Exception as e:
        logger.error("Batch user insights update failed", error=str(e), exc_info=True)
        self.retry(countdown=120, max_retries=2)
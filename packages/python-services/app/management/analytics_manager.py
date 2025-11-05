"""Analytics processing management and monitoring utilities."""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import structlog
from celery import group, chain
from celery.result import AsyncResult
from sqlalchemy import text

from app.core.celery import celery_app
from app.core.config import get_settings
from app.core.database import get_async_session
from app.core.logging import get_logger
from app.tasks.background_analytics import (
    calculate_user_analytics_batch,
    update_skill_scores_batch,
    calculate_job_match_scores_batch,
    cleanup_expired_data,
    archive_old_jobs
)

settings = get_settings()
logger = get_logger(__name__)


class AnalyticsManager:
    """Manages background analytics processing operations and monitoring."""
    
    def __init__(self):
        self.analytics_stats = {
            "total_analytics_runs": 0,
            "total_users_processed": 0,
            "total_skill_scores_updated": 0,
            "total_match_scores_calculated": 0,
            "last_analytics_run": None,
            "average_processing_time": 0.0
        }
    
    async def run_full_analytics_pipeline(self, batch_size: int = 100) -> Dict[str, Any]:
        """
        Run the complete analytics processing pipeline.
        
        Args:
            batch_size: Number of users to process per batch
            
        Returns:
            Dict containing pipeline execution results
        """
        start_time = datetime.utcnow()
        pipeline_id = f"analytics_{start_time.strftime('%Y%m%d_%H%M%S')}"
        
        logger.info(
            "Starting full analytics processing pipeline",
            pipeline_id=pipeline_id,
            batch_size=batch_size
        )
        
        try:
            # Get total number of active users for batching
            total_users = await self._get_active_user_count()
            
            if total_users == 0:
                return {
                    "pipeline_id": pipeline_id,
                    "status": "success",
                    "message": "No active users to process",
                    "execution_time": 0
                }
            
            # Calculate number of batches needed
            num_batches = (total_users + batch_size - 1) // batch_size
            
            # Create batched analytics tasks
            analytics_tasks = []
            skill_score_tasks = []
            
            for i in range(num_batches):
                offset = i * batch_size
                
                # User analytics batch
                analytics_tasks.append(
                    calculate_user_analytics_batch.s(batch_size, offset)
                )
                
                # Skill scores batch (smaller batch size for intensive processing)
                skill_batch_size = min(batch_size // 2, 50)
                if i * skill_batch_size < total_users:
                    skill_score_tasks.append(
                        update_skill_scores_batch.s(skill_batch_size, i * skill_batch_size)
                    )
            
            # Create job match scores task
            job_match_task = calculate_job_match_scores_batch.s(200, 24)  # Last 24 hours
            
            # Execute analytics pipeline
            analytics_group = group(analytics_tasks)
            skill_scores_group = group(skill_score_tasks)
            
            # Run analytics and skill scores in parallel, then job matching
            pipeline_chain = chain(
                group(analytics_group, skill_scores_group),
                job_match_task
            )
            
            result = pipeline_chain.apply_async()
            pipeline_results = result.get(timeout=3600)  # 1 hour timeout
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Process results
            analytics_results = pipeline_results[0][0] if isinstance(pipeline_results[0], list) else []
            skill_score_results = pipeline_results[0][1] if len(pipeline_results[0]) > 1 else []
            job_match_result = pipeline_results[1] if len(pipeline_results) > 1 else {}
            
            # Update statistics
            self._update_analytics_stats(analytics_results, skill_score_results, job_match_result, execution_time)
            
            summary = await self._create_analytics_summary(
                pipeline_id, analytics_results, skill_score_results, job_match_result, execution_time
            )
            
            logger.info(
                "Full analytics processing pipeline completed successfully",
                pipeline_id=pipeline_id,
                execution_time=execution_time,
                summary=summary
            )
            
            return {
                "pipeline_id": pipeline_id,
                "status": "success",
                "execution_time": execution_time,
                "analytics_results": analytics_results,
                "skill_score_results": skill_score_results,
                "job_match_result": job_match_result,
                "summary": summary,
                "analytics_stats": self.analytics_stats
            }
            
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            logger.error(
                "Full analytics processing pipeline failed",
                pipeline_id=pipeline_id,
                error=str(e),
                execution_time=execution_time
            )
            
            return {
                "pipeline_id": pipeline_id,
                "status": "failed",
                "error": str(e),
                "execution_time": execution_time,
                "analytics_stats": self.analytics_stats
            }
    
    async def run_user_analytics_only(self, batch_size: int = 100, offset: int = 0) -> Dict[str, Any]:
        """
        Run user analytics calculation only.
        
        Args:
            batch_size: Number of users to process
            offset: Offset for pagination
            
        Returns:
            Dict containing analytics results
        """
        logger.info(
            "Starting user analytics calculation",
            batch_size=batch_size,
            offset=offset
        )
        
        try:
            result = calculate_user_analytics_batch.apply_async(args=[batch_size, offset])
            task_result = result.get(timeout=600)  # 10 minutes timeout
            
            logger.info(
                "User analytics calculation completed",
                result=task_result
            )
            
            return {
                "status": "success",
                "result": task_result
            }
            
        except Exception as e:
            logger.error(
                "User analytics calculation failed",
                error=str(e)
            )
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def run_skill_scores_update(self, batch_size: int = 50, offset: int = 0) -> Dict[str, Any]:
        """
        Run skill scores update only.
        
        Args:
            batch_size: Number of users to process
            offset: Offset for pagination
            
        Returns:
            Dict containing skill score update results
        """
        logger.info(
            "Starting skill scores update",
            batch_size=batch_size,
            offset=offset
        )
        
        try:
            result = update_skill_scores_batch.apply_async(args=[batch_size, offset])
            task_result = result.get(timeout=900)  # 15 minutes timeout
            
            logger.info(
                "Skill scores update completed",
                result=task_result
            )
            
            return {
                "status": "success",
                "result": task_result
            }
            
        except Exception as e:
            logger.error(
                "Skill scores update failed",
                error=str(e)
            )
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def run_job_match_calculation(self, batch_size: int = 200, hours_back: int = 24) -> Dict[str, Any]:
        """
        Run job match scores calculation only.
        
        Args:
            batch_size: Number of jobs to process
            hours_back: Number of hours to look back for jobs
            
        Returns:
            Dict containing job match calculation results
        """
        logger.info(
            "Starting job match scores calculation",
            batch_size=batch_size,
            hours_back=hours_back
        )
        
        try:
            result = calculate_job_match_scores_batch.apply_async(args=[batch_size, hours_back])
            task_result = result.get(timeout=1200)  # 20 minutes timeout
            
            logger.info(
                "Job match scores calculation completed",
                result=task_result
            )
            
            return {
                "status": "success",
                "result": task_result
            }
            
        except Exception as e:
            logger.error(
                "Job match scores calculation failed",
                error=str(e)
            )
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def run_data_cleanup(self, days_to_keep: int = 90) -> Dict[str, Any]:
        """
        Run data cleanup tasks.
        
        Args:
            days_to_keep: Number of days of data to retain
            
        Returns:
            Dict containing cleanup results
        """
        logger.info(
            "Starting data cleanup",
            days_to_keep=days_to_keep
        )
        
        try:
            # Run cleanup and archival tasks in parallel
            cleanup_group = group(
                cleanup_expired_data.s(days_to_keep),
                archive_old_jobs.s(30)  # Archive jobs older than 30 days
            )
            
            result = cleanup_group.apply_async()
            cleanup_results = result.get(timeout=600)  # 10 minutes timeout
            
            logger.info(
                "Data cleanup completed",
                results=cleanup_results
            )
            
            return {
                "status": "success",
                "cleanup_result": cleanup_results[0] if cleanup_results else {},
                "archive_result": cleanup_results[1] if len(cleanup_results) > 1 else {}
            }
            
        except Exception as e:
            logger.error(
                "Data cleanup failed",
                error=str(e)
            )
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def get_analytics_status(self) -> Dict[str, Any]:
        """Get current analytics processing status and statistics."""
        # Get active analytics tasks
        active_tasks = await self._get_active_analytics_tasks()
        
        # Get analytics database statistics
        analytics_db_stats = await self._get_analytics_db_statistics()
        
        # Get processing queue status
        queue_status = await self._get_analytics_queue_status()
        
        return {
            "analytics_stats": self.analytics_stats,
            "active_tasks": active_tasks,
            "database_statistics": analytics_db_stats,
            "queue_status": queue_status,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def cancel_analytics_tasks(self) -> Dict[str, Any]:
        """Cancel running analytics tasks."""
        try:
            # Get active analytics tasks
            active_tasks = await self._get_active_analytics_tasks()
            
            cancelled_tasks = []
            for task_info in active_tasks:
                task_id = task_info.get("task_id")
                if task_id:
                    celery_app.control.revoke(task_id, terminate=True)
                    cancelled_tasks.append(task_id)
            
            logger.info(
                "Analytics tasks cancelled",
                cancelled_tasks=cancelled_tasks
            )
            
            return {
                "status": "success",
                "cancelled_tasks": cancelled_tasks,
                "count": len(cancelled_tasks)
            }
            
        except Exception as e:
            logger.error(
                "Failed to cancel analytics tasks",
                error=str(e)
            )
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    # Private helper methods
    
    def _update_analytics_stats(self, analytics_results: List, skill_score_results: List, job_match_result: Dict, execution_time: float):
        """Update analytics statistics."""
        self.analytics_stats["total_analytics_runs"] += 1
        self.analytics_stats["last_analytics_run"] = datetime.utcnow().isoformat()
        
        # Sum up users processed
        total_users = sum(result.get("users_processed", 0) for result in analytics_results)
        self.analytics_stats["total_users_processed"] += total_users
        
        # Sum up skill scores updated
        total_skill_scores = sum(result.get("skill_scores_updated", 0) for result in skill_score_results)
        self.analytics_stats["total_skill_scores_updated"] += total_skill_scores
        
        # Add match scores calculated
        match_scores = job_match_result.get("match_scores_calculated", 0)
        self.analytics_stats["total_match_scores_calculated"] += match_scores
        
        # Update average processing time
        current_avg = self.analytics_stats["average_processing_time"]
        total_runs = self.analytics_stats["total_analytics_runs"]
        self.analytics_stats["average_processing_time"] = (
            (current_avg * (total_runs - 1) + execution_time) / total_runs
        )
    
    async def _create_analytics_summary(
        self, 
        pipeline_id: str, 
        analytics_results: List, 
        skill_score_results: List,
        job_match_result: Dict,
        execution_time: float
    ) -> Dict[str, Any]:
        """Create a summary of analytics processing results."""
        total_users_processed = sum(result.get("users_processed", 0) for result in analytics_results)
        total_analytics_updated = sum(result.get("analytics_updated", 0) for result in analytics_results)
        total_skill_scores_updated = sum(result.get("skill_scores_updated", 0) for result in skill_score_results)
        
        match_scores_calculated = job_match_result.get("match_scores_calculated", 0)
        jobs_processed = job_match_result.get("jobs_processed", 0)
        
        total_errors = (
            sum(result.get("error_count", 0) for result in analytics_results) +
            sum(result.get("error_count", 0) for result in skill_score_results) +
            job_match_result.get("error_count", 0)
        )
        
        return {
            "pipeline_id": pipeline_id,
            "execution_time": round(execution_time, 2),
            "users_processed": total_users_processed,
            "analytics_updated": total_analytics_updated,
            "skill_scores_updated": total_skill_scores_updated,
            "match_scores_calculated": match_scores_calculated,
            "jobs_processed": jobs_processed,
            "total_errors": total_errors,
            "success_rate": round(
                ((total_analytics_updated + total_skill_scores_updated) / 
                 (total_users_processed * 2) * 100) if total_users_processed > 0 else 0, 2
            )
        }
    
    async def _get_active_user_count(self) -> int:
        """Get count of active users."""
        try:
            async with get_async_session() as session:
                query = text("SELECT COUNT(*) FROM users WHERE active = true")
                result = await session.execute(query)
                return result.scalar() or 0
        except Exception as e:
            logger.error(f"Failed to get active user count: {str(e)}")
            return 0
    
    async def _get_active_analytics_tasks(self) -> List[Dict[str, Any]]:
        """Get currently active analytics tasks."""
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        
        analytics_tasks = []
        if active_tasks:
            for worker, tasks in active_tasks.items():
                for task in tasks:
                    task_name = task.get("name", "")
                    if any(keyword in task_name for keyword in ["analytics", "skill_scores", "match_scores", "cleanup"]):
                        analytics_tasks.append({
                            "worker": worker,
                            "task_id": task.get("id"),
                            "task_name": task_name,
                            "args": task.get("args", []),
                            "kwargs": task.get("kwargs", {}),
                            "time_start": task.get("time_start")
                        })
        
        return analytics_tasks
    
    async def _get_analytics_db_statistics(self) -> Dict[str, Any]:
        """Get analytics database statistics."""
        try:
            async with get_async_session() as session:
                # User analytics records
                analytics_query = text("SELECT COUNT(*) FROM user_analytics")
                analytics_result = await session.execute(analytics_query)
                total_analytics = analytics_result.scalar() or 0
                
                # Skill scores
                skills_query = text("SELECT COUNT(*) FROM user_skills WHERE market_score IS NOT NULL")
                skills_result = await session.execute(skills_query)
                skill_scores = skills_result.scalar() or 0
                
                # Job match scores
                matches_query = text("SELECT COUNT(*) FROM job_match_scores")
                matches_result = await session.execute(matches_query)
                match_scores = matches_result.scalar() or 0
                
                # Recent analytics (last 24 hours)
                recent_query = text("""
                    SELECT COUNT(*) FROM user_analytics 
                    WHERE calculated_at >= :cutoff_time
                """)
                cutoff_time = datetime.utcnow() - timedelta(hours=24)
                recent_result = await session.execute(recent_query, {"cutoff_time": cutoff_time})
                recent_analytics = recent_result.scalar() or 0
                
                return {
                    "total_user_analytics": total_analytics,
                    "total_skill_scores": skill_scores,
                    "total_match_scores": match_scores,
                    "recent_analytics_24h": recent_analytics
                }
                
        except Exception as e:
            logger.error(f"Failed to get analytics database statistics: {str(e)}")
            return {
                "error": "Failed to retrieve analytics statistics",
                "details": str(e)
            }
    
    async def _get_analytics_queue_status(self) -> Dict[str, Any]:
        """Get analytics queue status."""
        try:
            inspect = celery_app.control.inspect()
            
            # Get queue lengths
            queue_lengths = {}
            reserved_tasks = inspect.reserved()
            
            if reserved_tasks:
                for worker, tasks in reserved_tasks.items():
                    analytics_tasks = [
                        task for task in tasks 
                        if any(keyword in task.get("name", "") for keyword in ["analytics", "skill_scores", "match_scores"])
                    ]
                    queue_lengths[worker] = len(analytics_tasks)
            
            return {
                "queue_lengths": queue_lengths,
                "total_queued": sum(queue_lengths.values())
            }
            
        except Exception as e:
            logger.error(f"Failed to get analytics queue status: {str(e)}")
            return {
                "error": "Failed to retrieve queue status",
                "details": str(e)
            }


# Global analytics manager instance
analytics_manager = AnalyticsManager()


# CLI functions for management
async def run_analytics_pipeline_cli():
    """CLI function to run the full analytics pipeline."""
    result = await analytics_manager.run_full_analytics_pipeline()
    print(json.dumps(result, indent=2))


async def get_analytics_status_cli():
    """CLI function to get analytics status."""
    status = await analytics_manager.get_analytics_status()
    print(json.dumps(status, indent=2))


async def run_user_analytics_cli(batch_size: int = 100):
    """CLI function to run user analytics only."""
    result = await analytics_manager.run_user_analytics_only(batch_size)
    print(json.dumps(result, indent=2))


async def run_cleanup_cli(days_to_keep: int = 90):
    """CLI function to run data cleanup."""
    result = await analytics_manager.run_data_cleanup(days_to_keep)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python analytics_manager.py <command> [args]")
        print("Commands:")
        print("  run-pipeline - Run full analytics pipeline")
        print("  status - Get analytics status")
        print("  run-user-analytics [batch_size] - Run user analytics only")
        print("  run-cleanup [days_to_keep] - Run data cleanup")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "run-pipeline":
        asyncio.run(run_analytics_pipeline_cli())
    elif command == "status":
        asyncio.run(get_analytics_status_cli())
    elif command == "run-user-analytics":
        batch_size = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        asyncio.run(run_user_analytics_cli(batch_size))
    elif command == "run-cleanup":
        days_to_keep = int(sys.argv[2]) if len(sys.argv) > 2 else 90
        asyncio.run(run_cleanup_cli(days_to_keep))
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
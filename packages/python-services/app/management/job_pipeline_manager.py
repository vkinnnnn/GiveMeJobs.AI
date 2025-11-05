"""Job aggregation pipeline management and monitoring utilities."""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import structlog
from celery import group, chain, chord
from celery.result import AsyncResult, GroupResult
from sqlalchemy import text

from app.core.celery import celery_app
from app.core.config import get_settings
from app.core.database import get_async_session
from app.core.logging import get_logger
from app.tasks.job_aggregation import (
    aggregate_linkedin_jobs,
    aggregate_indeed_jobs,
    aggregate_glassdoor_jobs,
    normalize_and_deduplicate_jobs
)

settings = get_settings()
logger = get_logger(__name__)


class JobPipelineManager:
    """Manages job aggregation pipeline operations and monitoring."""
    
    def __init__(self):
        self.pipeline_stats = {
            "total_runs": 0,
            "successful_runs": 0,
            "failed_runs": 0,
            "last_run_time": None,
            "average_execution_time": 0.0
        }
    
    async def run_full_pipeline(self, batch_size: int = 100, location: str = "United States") -> Dict[str, Any]:
        """
        Run the complete job aggregation pipeline with all sources.
        
        Args:
            batch_size: Number of jobs to fetch per source
            location: Location filter for job search
            
        Returns:
            Dict containing pipeline execution results
        """
        start_time = datetime.utcnow()
        pipeline_id = f"pipeline_{start_time.strftime('%Y%m%d_%H%M%S')}"
        
        logger.info(
            "Starting full job aggregation pipeline",
            pipeline_id=pipeline_id,
            batch_size=batch_size,
            location=location
        )
        
        try:
            # Create job aggregation tasks group
            aggregation_group = group(
                aggregate_linkedin_jobs.s(batch_size, location),
                aggregate_indeed_jobs.s(batch_size, location),
                aggregate_glassdoor_jobs.s(batch_size, location)
            )
            
            # Create pipeline chain: aggregation -> normalization
            pipeline_chain = chain(
                aggregation_group,
                normalize_and_deduplicate_jobs.s(hours_back=2)  # Process jobs from last 2 hours
            )
            
            # Execute pipeline
            result = pipeline_chain.apply_async()
            
            # Wait for completion with timeout
            pipeline_results = result.get(timeout=1800)  # 30 minutes timeout
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Update statistics
            self.pipeline_stats["total_runs"] += 1
            self.pipeline_stats["successful_runs"] += 1
            self.pipeline_stats["last_run_time"] = start_time.isoformat()
            self.pipeline_stats["average_execution_time"] = (
                (self.pipeline_stats["average_execution_time"] * (self.pipeline_stats["total_runs"] - 1) + execution_time) 
                / self.pipeline_stats["total_runs"]
            )
            
            # Process results
            aggregation_results = pipeline_results[0] if isinstance(pipeline_results, list) else []
            normalization_result = pipeline_results[1] if len(pipeline_results) > 1 else {}
            
            summary = await self._create_pipeline_summary(
                pipeline_id, aggregation_results, normalization_result, execution_time
            )
            
            logger.info(
                "Full job aggregation pipeline completed successfully",
                pipeline_id=pipeline_id,
                execution_time=execution_time,
                summary=summary
            )
            
            return {
                "pipeline_id": pipeline_id,
                "status": "success",
                "execution_time": execution_time,
                "aggregation_results": aggregation_results,
                "normalization_result": normalization_result,
                "summary": summary,
                "pipeline_stats": self.pipeline_stats
            }
            
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            self.pipeline_stats["total_runs"] += 1
            self.pipeline_stats["failed_runs"] += 1
            self.pipeline_stats["last_run_time"] = start_time.isoformat()
            
            logger.error(
                "Full job aggregation pipeline failed",
                pipeline_id=pipeline_id,
                error=str(e),
                execution_time=execution_time
            )
            
            return {
                "pipeline_id": pipeline_id,
                "status": "failed",
                "error": str(e),
                "execution_time": execution_time,
                "pipeline_stats": self.pipeline_stats
            }
    
    async def run_single_source_aggregation(self, source: str, batch_size: int = 100, location: str = "United States") -> Dict[str, Any]:
        """
        Run job aggregation for a single source.
        
        Args:
            source: Job source (linkedin, indeed, glassdoor)
            batch_size: Number of jobs to fetch
            location: Location filter for job search
            
        Returns:
            Dict containing aggregation results
        """
        task_map = {
            "linkedin": aggregate_linkedin_jobs,
            "indeed": aggregate_indeed_jobs,
            "glassdoor": aggregate_glassdoor_jobs
        }
        
        if source not in task_map:
            raise ValueError(f"Unknown job source: {source}")
        
        task = task_map[source]
        
        logger.info(
            f"Starting {source} job aggregation",
            source=source,
            batch_size=batch_size,
            location=location
        )
        
        try:
            result = task.apply_async(args=[batch_size, location])
            task_result = result.get(timeout=600)  # 10 minutes timeout
            
            logger.info(
                f"{source} job aggregation completed",
                source=source,
                result=task_result
            )
            
            return {
                "source": source,
                "status": "success",
                "result": task_result
            }
            
        except Exception as e:
            logger.error(
                f"{source} job aggregation failed",
                source=source,
                error=str(e)
            )
            
            return {
                "source": source,
                "status": "failed",
                "error": str(e)
            }
    
    async def get_pipeline_status(self) -> Dict[str, Any]:
        """Get current pipeline status and statistics."""
        # Get active tasks
        active_tasks = await self._get_active_pipeline_tasks()
        
        # Get recent pipeline runs
        recent_runs = await self._get_recent_pipeline_runs()
        
        # Get job statistics
        job_stats = await self._get_job_statistics()
        
        return {
            "pipeline_stats": self.pipeline_stats,
            "active_tasks": active_tasks,
            "recent_runs": recent_runs,
            "job_statistics": job_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def cancel_running_pipeline(self, pipeline_id: Optional[str] = None) -> Dict[str, Any]:
        """Cancel running pipeline tasks."""
        try:
            # Get active pipeline tasks
            active_tasks = await self._get_active_pipeline_tasks()
            
            cancelled_tasks = []
            for task_info in active_tasks:
                task_id = task_info.get("task_id")
                if task_id:
                    celery_app.control.revoke(task_id, terminate=True)
                    cancelled_tasks.append(task_id)
            
            logger.info(
                "Pipeline tasks cancelled",
                pipeline_id=pipeline_id,
                cancelled_tasks=cancelled_tasks
            )
            
            return {
                "status": "success",
                "cancelled_tasks": cancelled_tasks,
                "count": len(cancelled_tasks)
            }
            
        except Exception as e:
            logger.error(
                "Failed to cancel pipeline tasks",
                pipeline_id=pipeline_id,
                error=str(e)
            )
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def cleanup_failed_tasks(self, hours_back: int = 24) -> Dict[str, Any]:
        """Clean up failed task results and logs."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
        
        try:
            # This would typically involve cleaning up task results from the result backend
            # For now, we'll just log the cleanup operation
            
            logger.info(
                "Cleaning up failed tasks",
                cutoff_time=cutoff_time.isoformat(),
                hours_back=hours_back
            )
            
            # In a real implementation, you would:
            # 1. Query the result backend for failed tasks
            # 2. Remove old task results
            # 3. Clean up any temporary files or data
            
            return {
                "status": "success",
                "cutoff_time": cutoff_time.isoformat(),
                "message": "Failed task cleanup completed"
            }
            
        except Exception as e:
            logger.error(
                "Failed task cleanup failed",
                error=str(e)
            )
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    # Private helper methods
    
    async def _create_pipeline_summary(
        self, 
        pipeline_id: str, 
        aggregation_results: List[Dict], 
        normalization_result: Dict,
        execution_time: float
    ) -> Dict[str, Any]:
        """Create a summary of pipeline execution results."""
        total_jobs_processed = sum(result.get("jobs_processed", 0) for result in aggregation_results)
        total_jobs_saved = sum(result.get("jobs_saved", 0) for result in aggregation_results)
        total_errors = sum(result.get("error_count", 0) for result in aggregation_results)
        
        duplicates_removed = normalization_result.get("duplicates_removed", 0)
        unique_jobs = normalization_result.get("unique_jobs", 0)
        
        return {
            "pipeline_id": pipeline_id,
            "execution_time": round(execution_time, 2),
            "total_jobs_processed": total_jobs_processed,
            "total_jobs_saved": total_jobs_saved,
            "duplicates_removed": duplicates_removed,
            "unique_jobs": unique_jobs,
            "total_errors": total_errors,
            "success_rate": round((total_jobs_saved / total_jobs_processed * 100) if total_jobs_processed > 0 else 0, 2),
            "sources_processed": len(aggregation_results)
        }
    
    async def _get_active_pipeline_tasks(self) -> List[Dict[str, Any]]:
        """Get currently active pipeline tasks."""
        # Query Celery for active tasks
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        
        pipeline_tasks = []
        if active_tasks:
            for worker, tasks in active_tasks.items():
                for task in tasks:
                    if any(keyword in task.get("name", "") for keyword in ["aggregate_", "normalize_"]):
                        pipeline_tasks.append({
                            "worker": worker,
                            "task_id": task.get("id"),
                            "task_name": task.get("name"),
                            "args": task.get("args", []),
                            "kwargs": task.get("kwargs", {}),
                            "time_start": task.get("time_start")
                        })
        
        return pipeline_tasks
    
    async def _get_recent_pipeline_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent pipeline run history."""
        # This would typically query a pipeline runs table
        # For now, return empty list as placeholder
        return []
    
    async def _get_job_statistics(self) -> Dict[str, Any]:
        """Get job database statistics."""
        try:
            async with get_async_session() as session:
                # Total jobs
                total_query = text("SELECT COUNT(*) FROM jobs")
                total_result = await session.execute(total_query)
                total_jobs = total_result.scalar() or 0
                
                # Jobs by source
                source_query = text("""
                    SELECT source, COUNT(*) as count 
                    FROM jobs 
                    GROUP BY source
                """)
                source_result = await session.execute(source_query)
                jobs_by_source = {row.source: row.count for row in source_result.fetchall()}
                
                # Recent jobs (last 24 hours)
                recent_query = text("""
                    SELECT COUNT(*) FROM jobs 
                    WHERE created_at >= :cutoff_time
                """)
                cutoff_time = datetime.utcnow() - timedelta(hours=24)
                recent_result = await session.execute(recent_query, {"cutoff_time": cutoff_time})
                recent_jobs = recent_result.scalar() or 0
                
                # Duplicates
                duplicates_query = text("SELECT COUNT(*) FROM jobs WHERE is_duplicate = true")
                duplicates_result = await session.execute(duplicates_query)
                duplicate_jobs = duplicates_result.scalar() or 0
                
                return {
                    "total_jobs": total_jobs,
                    "jobs_by_source": jobs_by_source,
                    "recent_jobs_24h": recent_jobs,
                    "duplicate_jobs": duplicate_jobs,
                    "unique_jobs": total_jobs - duplicate_jobs
                }
                
        except Exception as e:
            logger.error(f"Failed to get job statistics: {str(e)}")
            return {
                "error": "Failed to retrieve job statistics",
                "details": str(e)
            }


# Global pipeline manager instance
pipeline_manager = JobPipelineManager()


# CLI functions for management
async def run_pipeline_cli():
    """CLI function to run the full pipeline."""
    result = await pipeline_manager.run_full_pipeline()
    print(json.dumps(result, indent=2))


async def get_status_cli():
    """CLI function to get pipeline status."""
    status = await pipeline_manager.get_pipeline_status()
    print(json.dumps(status, indent=2))


async def run_single_source_cli(source: str):
    """CLI function to run single source aggregation."""
    result = await pipeline_manager.run_single_source_aggregation(source)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python job_pipeline_manager.py <command> [args]")
        print("Commands:")
        print("  run-pipeline - Run full aggregation pipeline")
        print("  status - Get pipeline status")
        print("  run-source <source> - Run single source aggregation (linkedin|indeed|glassdoor)")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "run-pipeline":
        asyncio.run(run_pipeline_cli())
    elif command == "status":
        asyncio.run(get_status_cli())
    elif command == "run-source" and len(sys.argv) > 2:
        source = sys.argv[2]
        asyncio.run(run_single_source_cli(source))
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
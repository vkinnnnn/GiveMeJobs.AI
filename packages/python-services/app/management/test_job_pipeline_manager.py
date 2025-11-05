"""Tests for job pipeline management utilities."""

import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch

import pytest
from celery.result import AsyncResult, GroupResult

from app.management.job_pipeline_manager import (
    JobPipelineManager,
    pipeline_manager
)


class TestJobPipelineManager:
    """Test job pipeline management functionality."""
    
    @pytest.fixture
    def manager(self):
        """Create a fresh pipeline manager instance for testing."""
        return JobPipelineManager()
    
    @pytest.fixture
    def mock_aggregation_results(self):
        """Mock aggregation results from different sources."""
        return [
            {
                "source": "linkedin",
                "jobs_processed": 50,
                "jobs_saved": 48,
                "errors": [],
                "error_count": 0,
                "execution_time": 120.5
            },
            {
                "source": "indeed",
                "jobs_processed": 75,
                "jobs_saved": 72,
                "errors": ["Error processing job indeed_123"],
                "error_count": 1,
                "execution_time": 95.2
            },
            {
                "source": "glassdoor",
                "jobs_processed": 30,
                "jobs_saved": 29,
                "errors": [],
                "error_count": 0,
                "execution_time": 80.1
            }
        ]
    
    @pytest.fixture
    def mock_normalization_result(self):
        """Mock normalization and deduplication result."""
        return {
            "jobs_processed": 149,
            "duplicates_removed": 12,
            "unique_jobs": 137
        }
    
    @pytest.mark.asyncio
    @patch('app.management.job_pipeline_manager.chain')
    @patch('app.management.job_pipeline_manager.group')
    async def test_run_full_pipeline_success(self, mock_group, mock_chain, manager, mock_aggregation_results, mock_normalization_result):
        """Test successful full pipeline execution."""
        # Mock Celery group and chain
        mock_result = Mock()
        mock_result.get.return_value = [mock_aggregation_results, mock_normalization_result]
        mock_chain.return_value.apply_async.return_value = mock_result
        
        # Mock database session for summary creation
        with patch('app.management.job_pipeline_manager.get_async_session') as mock_session:
            mock_session_instance = Mock()
            mock_session.return_value.__aenter__.return_value = mock_session_instance
            
            # Execute pipeline
            result = await manager.run_full_pipeline(batch_size=100, location="United States")
        
        # Assertions
        assert result["status"] == "success"
        assert result["pipeline_id"].startswith("pipeline_")
        assert "execution_time" in result
        assert result["aggregation_results"] == mock_aggregation_results
        assert result["normalization_result"] == mock_normalization_result
        
        # Check summary
        summary = result["summary"]
        assert summary["total_jobs_processed"] == 155  # 50 + 75 + 30
        assert summary["total_jobs_saved"] == 149      # 48 + 72 + 29
        assert summary["duplicates_removed"] == 12
        assert summary["unique_jobs"] == 137
        assert summary["total_errors"] == 1
        assert summary["sources_processed"] == 3
        
        # Check pipeline stats update
        assert manager.pipeline_stats["total_runs"] == 1
        assert manager.pipeline_stats["successful_runs"] == 1
        assert manager.pipeline_stats["failed_runs"] == 0
    
    @pytest.mark.asyncio
    @patch('app.management.job_pipeline_manager.chain')
    @patch('app.management.job_pipeline_manager.group')
    async def test_run_full_pipeline_failure(self, mock_group, mock_chain, manager):
        """Test full pipeline execution with failure."""
        # Mock Celery chain failure
        mock_result = Mock()
        mock_result.get.side_effect = Exception("Pipeline execution failed")
        mock_chain.return_value.apply_async.return_value = mock_result
        
        # Execute pipeline
        result = await manager.run_full_pipeline(batch_size=100, location="United States")
        
        # Assertions
        assert result["status"] == "failed"
        assert "error" in result
        assert result["error"] == "Pipeline execution failed"
        
        # Check pipeline stats update
        assert manager.pipeline_stats["total_runs"] == 1
        assert manager.pipeline_stats["successful_runs"] == 0
        assert manager.pipeline_stats["failed_runs"] == 1
    
    @pytest.mark.asyncio
    @patch('app.tasks.job_aggregation.aggregate_linkedin_jobs')
    async def test_run_single_source_aggregation_success(self, mock_task, manager):
        """Test successful single source aggregation."""
        # Mock task result
        mock_result = Mock()
        mock_result.get.return_value = {
            "source": "linkedin",
            "jobs_processed": 50,
            "jobs_saved": 48,
            "errors": [],
            "error_count": 0
        }
        mock_task.apply_async.return_value = mock_result
        
        # Execute single source aggregation
        result = await manager.run_single_source_aggregation("linkedin", batch_size=100)
        
        # Assertions
        assert result["source"] == "linkedin"
        assert result["status"] == "success"
        assert result["result"]["jobs_processed"] == 50
        assert result["result"]["jobs_saved"] == 48
        
        # Verify task was called correctly
        mock_task.apply_async.assert_called_once_with(args=[100, "United States"])
    
    @pytest.mark.asyncio
    @patch('app.tasks.job_aggregation.aggregate_indeed_jobs')
    async def test_run_single_source_aggregation_failure(self, mock_task, manager):
        """Test single source aggregation with failure."""
        # Mock task failure
        mock_result = Mock()
        mock_result.get.side_effect = Exception("Task execution failed")
        mock_task.apply_async.return_value = mock_result
        
        # Execute single source aggregation
        result = await manager.run_single_source_aggregation("indeed", batch_size=100)
        
        # Assertions
        assert result["source"] == "indeed"
        assert result["status"] == "failed"
        assert result["error"] == "Task execution failed"
    
    @pytest.mark.asyncio
    async def test_run_single_source_aggregation_invalid_source(self, manager):
        """Test single source aggregation with invalid source."""
        # Execute with invalid source
        with pytest.raises(ValueError, match="Unknown job source: invalid_source"):
            await manager.run_single_source_aggregation("invalid_source")
    
    @pytest.mark.asyncio
    @patch('app.management.job_pipeline_manager.get_async_session')
    async def test_get_pipeline_status(self, mock_session, manager):
        """Test getting pipeline status."""
        # Mock database session
        mock_session_instance = Mock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Mock database queries for job statistics
        mock_session_instance.execute = AsyncMock(side_effect=[
            Mock(scalar=lambda: 1000),  # Total jobs
            Mock(fetchall=lambda: [
                Mock(source="linkedin", count=400),
                Mock(source="indeed", count=350),
                Mock(source="glassdoor", count=250)
            ]),  # Jobs by source
            Mock(scalar=lambda: 150),   # Recent jobs
            Mock(scalar=lambda: 50),    # Duplicate jobs
        ])
        
        # Mock Celery inspect for active tasks
        with patch('app.management.job_pipeline_manager.celery_app.control.inspect') as mock_inspect:
            mock_inspect.return_value.active.return_value = {
                "worker1": [
                    {
                        "id": "task_123",
                        "name": "app.tasks.job_aggregation.aggregate_linkedin_jobs",
                        "args": [100, "United States"],
                        "kwargs": {},
                        "time_start": 1642680000
                    }
                ]
            }
            
            # Get pipeline status
            status = await manager.get_pipeline_status()
        
        # Assertions
        assert "pipeline_stats" in status
        assert "active_tasks" in status
        assert "job_statistics" in status
        assert "timestamp" in status
        
        # Check job statistics
        job_stats = status["job_statistics"]
        assert job_stats["total_jobs"] == 1000
        assert job_stats["jobs_by_source"]["linkedin"] == 400
        assert job_stats["recent_jobs_24h"] == 150
        assert job_stats["duplicate_jobs"] == 50
        assert job_stats["unique_jobs"] == 950
        
        # Check active tasks
        active_tasks = status["active_tasks"]
        assert len(active_tasks) == 1
        assert active_tasks[0]["task_name"] == "app.tasks.job_aggregation.aggregate_linkedin_jobs"
        assert active_tasks[0]["worker"] == "worker1"
    
    @pytest.mark.asyncio
    @patch('app.management.job_pipeline_manager.celery_app.control.revoke')
    async def test_cancel_running_pipeline(self, mock_revoke, manager):
        """Test cancelling running pipeline tasks."""
        # Mock active tasks
        with patch.object(manager, '_get_active_pipeline_tasks') as mock_get_active:
            mock_get_active.return_value = [
                {"task_id": "task_123", "task_name": "aggregate_linkedin_jobs"},
                {"task_id": "task_456", "task_name": "aggregate_indeed_jobs"}
            ]
            
            # Cancel running pipeline
            result = await manager.cancel_running_pipeline("pipeline_123")
        
        # Assertions
        assert result["status"] == "success"
        assert result["count"] == 2
        assert "task_123" in result["cancelled_tasks"]
        assert "task_456" in result["cancelled_tasks"]
        
        # Verify revoke was called for each task
        assert mock_revoke.call_count == 2
    
    @pytest.mark.asyncio
    async def test_cleanup_failed_tasks(self, manager):
        """Test cleanup of failed tasks."""
        # Execute cleanup
        result = await manager.cleanup_failed_tasks(hours_back=24)
        
        # Assertions
        assert result["status"] == "success"
        assert "cutoff_time" in result
        assert "message" in result
    
    @pytest.mark.asyncio
    async def test_create_pipeline_summary(self, manager, mock_aggregation_results, mock_normalization_result):
        """Test pipeline summary creation."""
        pipeline_id = "test_pipeline_123"
        execution_time = 300.5
        
        # Create summary
        summary = await manager._create_pipeline_summary(
            pipeline_id, mock_aggregation_results, mock_normalization_result, execution_time
        )
        
        # Assertions
        assert summary["pipeline_id"] == pipeline_id
        assert summary["execution_time"] == 300.5
        assert summary["total_jobs_processed"] == 155  # 50 + 75 + 30
        assert summary["total_jobs_saved"] == 149      # 48 + 72 + 29
        assert summary["duplicates_removed"] == 12
        assert summary["unique_jobs"] == 137
        assert summary["total_errors"] == 1
        assert summary["success_rate"] == 96.13  # 149/155 * 100
        assert summary["sources_processed"] == 3
    
    @pytest.mark.asyncio
    @patch('app.management.job_pipeline_manager.celery_app.control.inspect')
    async def test_get_active_pipeline_tasks(self, mock_inspect, manager):
        """Test getting active pipeline tasks."""
        # Mock Celery inspect
        mock_inspect.return_value.active.return_value = {
            "worker1": [
                {
                    "id": "task_123",
                    "name": "app.tasks.job_aggregation.aggregate_linkedin_jobs",
                    "args": [100, "United States"],
                    "kwargs": {},
                    "time_start": 1642680000
                },
                {
                    "id": "task_456",
                    "name": "app.services.document_processing.tasks.generate_resume",
                    "args": [],
                    "kwargs": {},
                    "time_start": 1642680100
                }
            ],
            "worker2": [
                {
                    "id": "task_789",
                    "name": "app.tasks.job_aggregation.normalize_and_deduplicate_jobs",
                    "args": [24],
                    "kwargs": {},
                    "time_start": 1642680200
                }
            ]
        }
        
        # Get active pipeline tasks
        active_tasks = await manager._get_active_pipeline_tasks()
        
        # Assertions
        assert len(active_tasks) == 2  # Only pipeline-related tasks
        
        # Check first task
        task1 = active_tasks[0]
        assert task1["task_id"] == "task_123"
        assert task1["task_name"] == "app.tasks.job_aggregation.aggregate_linkedin_jobs"
        assert task1["worker"] == "worker1"
        
        # Check second task
        task2 = active_tasks[1]
        assert task2["task_id"] == "task_789"
        assert task2["task_name"] == "app.tasks.job_aggregation.normalize_and_deduplicate_jobs"
        assert task2["worker"] == "worker2"
    
    @pytest.mark.asyncio
    @patch('app.management.job_pipeline_manager.get_async_session')
    async def test_get_job_statistics_database_error(self, mock_session, manager):
        """Test job statistics retrieval with database error."""
        # Mock database error
        mock_session.side_effect = Exception("Database connection failed")
        
        # Get job statistics
        stats = await manager._get_job_statistics()
        
        # Should handle error gracefully
        assert "error" in stats
        assert stats["error"] == "Failed to retrieve job statistics"
        assert "details" in stats


class TestJobPipelineManagerIntegration:
    """Integration tests for job pipeline manager."""
    
    @pytest.mark.asyncio
    @patch('app.management.job_pipeline_manager.get_async_session')
    @patch('app.management.job_pipeline_manager.chain')
    @patch('app.management.job_pipeline_manager.group')
    async def test_full_pipeline_with_real_task_structure(self, mock_group, mock_chain, mock_session):
        """Test full pipeline with realistic task structure."""
        manager = JobPipelineManager()
        
        # Mock realistic pipeline results
        aggregation_results = [
            {"source": "linkedin", "jobs_processed": 100, "jobs_saved": 95, "error_count": 0},
            {"source": "indeed", "jobs_processed": 150, "jobs_saved": 140, "error_count": 2},
            {"source": "glassdoor", "jobs_processed": 75, "jobs_saved": 70, "error_count": 1}
        ]
        
        normalization_result = {
            "jobs_processed": 305,
            "duplicates_removed": 25,
            "unique_jobs": 280
        }
        
        # Mock Celery execution
        mock_result = Mock()
        mock_result.get.return_value = [aggregation_results, normalization_result]
        mock_chain.return_value.apply_async.return_value = mock_result
        
        # Mock database session
        mock_session_instance = Mock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute pipeline
        result = await manager.run_full_pipeline(batch_size=200, location="Global")
        
        # Comprehensive assertions
        assert result["status"] == "success"
        assert result["summary"]["total_jobs_processed"] == 325  # 100 + 150 + 75
        assert result["summary"]["total_jobs_saved"] == 305     # 95 + 140 + 70
        assert result["summary"]["duplicates_removed"] == 25
        assert result["summary"]["unique_jobs"] == 280
        assert result["summary"]["total_errors"] == 3          # 0 + 2 + 1
        assert result["summary"]["success_rate"] == 93.85      # 305/325 * 100
        
        # Verify task configuration
        mock_group.assert_called_once()
        mock_chain.assert_called_once()
        
        # Check pipeline stats
        assert manager.pipeline_stats["total_runs"] == 1
        assert manager.pipeline_stats["successful_runs"] == 1
        assert manager.pipeline_stats["average_execution_time"] > 0
    
    @pytest.mark.asyncio
    async def test_pipeline_manager_state_persistence(self):
        """Test that pipeline manager maintains state across operations."""
        manager = JobPipelineManager()
        
        # Initial state
        assert manager.pipeline_stats["total_runs"] == 0
        assert manager.pipeline_stats["successful_runs"] == 0
        assert manager.pipeline_stats["failed_runs"] == 0
        
        # Mock successful pipeline run
        with patch('app.management.job_pipeline_manager.chain') as mock_chain:
            mock_result = Mock()
            mock_result.get.return_value = [[], {}]
            mock_chain.return_value.apply_async.return_value = mock_result
            
            with patch('app.management.job_pipeline_manager.get_async_session'):
                await manager.run_full_pipeline()
        
        # State should be updated
        assert manager.pipeline_stats["total_runs"] == 1
        assert manager.pipeline_stats["successful_runs"] == 1
        assert manager.pipeline_stats["failed_runs"] == 0
        
        # Mock failed pipeline run
        with patch('app.management.job_pipeline_manager.chain') as mock_chain:
            mock_result = Mock()
            mock_result.get.side_effect = Exception("Pipeline failed")
            mock_chain.return_value.apply_async.return_value = mock_result
            
            await manager.run_full_pipeline()
        
        # State should reflect both runs
        assert manager.pipeline_stats["total_runs"] == 2
        assert manager.pipeline_stats["successful_runs"] == 1
        assert manager.pipeline_stats["failed_runs"] == 1
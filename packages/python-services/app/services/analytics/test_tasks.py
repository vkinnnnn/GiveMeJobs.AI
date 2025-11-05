"""
Tests for Analytics Service Background Tasks
Tests Celery tasks for batch processing, success predictions, and platform benchmarks.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from celery.exceptions import Retry

from .tasks import (
    calculate_user_analytics_task,
    generate_success_predictions_task,
    calculate_platform_benchmarks_task,
    cleanup_expired_data_task,
    batch_update_user_insights_task
)


class TestCalculateUserAnalyticsTask:
    """Test user analytics calculation task."""
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_calculate_user_analytics_success(self, mock_engine):
        """Test successful user analytics calculation."""
        # Mock the analytics engine
        mock_engine.calculate_application_insights = AsyncMock(return_value={
            "user_id": "test_user_1",
            "metrics": {"total_applications": 10},
            "processing_time": 1.5
        })
        
        user_ids = ["test_user_1", "test_user_2", "test_user_3"]
        
        # Create a mock task instance
        mock_task = Mock()
        
        result = calculate_user_analytics_task(mock_task, user_ids)
        
        assert result["status"] == "completed"
        assert result["users_processed"] >= 0
        assert result["total_users"] == 3
        assert "success_rate" in result
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_calculate_user_analytics_no_users(self, mock_engine):
        """Test analytics calculation with no user IDs provided."""
        mock_engine.calculate_application_insights = AsyncMock(return_value={
            "user_id": "default_user",
            "metrics": {"total_applications": 5}
        })
        
        mock_task = Mock()
        
        # Call without user_ids (should use default sample users)
        result = calculate_user_analytics_task(mock_task, None)
        
        assert result["status"] == "completed"
        assert result["total_users"] == 100  # Default sample size
        assert result["users_processed"] >= 0
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_calculate_user_analytics_with_failures(self, mock_engine):
        """Test analytics calculation with some user failures."""
        # Mock engine to fail for some users
        def mock_calculate(user_id, time_period):
            if "fail" in user_id:
                return {"error": "No data available"}
            return {"user_id": user_id, "metrics": {"total_applications": 5}}
        
        mock_engine.calculate_application_insights = AsyncMock(side_effect=mock_calculate)
        
        user_ids = ["test_user_1", "fail_user_2", "test_user_3", "fail_user_4"]
        mock_task = Mock()
        
        result = calculate_user_analytics_task(mock_task, user_ids)
        
        assert result["status"] == "completed"
        assert result["users_failed"] == 2  # Two users with "fail" in name
        assert result["users_processed"] == 2  # Two successful users
        assert result["total_users"] == 4
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_calculate_user_analytics_exception_retry(self, mock_engine):
        """Test task retry on exception."""
        mock_engine.calculate_application_insights = AsyncMock(
            side_effect=Exception("Database connection failed")
        )
        
        mock_task = Mock()
        mock_task.retry = Mock(side_effect=Retry("Retrying task"))
        
        user_ids = ["test_user_1"]
        
        with pytest.raises(Retry):
            calculate_user_analytics_task(mock_task, user_ids)
        
        # Verify retry was called with correct parameters
        mock_task.retry.assert_called_once_with(countdown=300, max_retries=3)


class TestGenerateSuccessPredictionsTask:
    """Test success predictions generation task."""
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_generate_success_predictions_success(self, mock_engine):
        """Test successful success prediction generation."""
        mock_analytics_result = {
            "user_id": "test_user_123",
            "success_prediction": {
                "success_probability": 75.5,
                "confidence": 85.2,
                "key_factors": ["match_score", "timing", "industry"],
                "recommendations": ["Focus on high-match jobs", "Apply on weekdays"]
            },
            "processing_time": 2.1,
            "generated_at": "2024-11-04T12:00:00Z"
        }
        
        mock_engine.calculate_application_insights = AsyncMock(return_value=mock_analytics_result)
        
        mock_task = Mock()
        user_id = "test_user_123"
        
        result = generate_success_predictions_task(mock_task, user_id)
        
        assert result["status"] == "completed"
        assert result["user_id"] == user_id
        assert "predictions" in result
        assert "model_info" in result
        
        # Verify predictions structure
        predictions = result["predictions"]
        assert predictions["success_probability"] == 75.5
        assert predictions["confidence"] == 85.2
        assert len(predictions["key_factors"]) == 3
        assert len(predictions["recommendations"]) == 2
        
        # Verify model info
        model_info = result["model_info"]
        assert model_info["model_type"] == "RandomForestClassifier"
        assert model_info["training_period"] == "6_months"
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_generate_success_predictions_no_data(self, mock_engine):
        """Test success prediction with no data available."""
        mock_engine.calculate_application_insights = AsyncMock(return_value={
            "error": "No application data available",
            "user_id": "test_user_123"
        })
        
        mock_task = Mock()
        mock_task.retry = Mock(side_effect=Retry("Retrying task"))
        
        user_id = "test_user_123"
        
        with pytest.raises(Retry):
            generate_success_predictions_task(mock_task, user_id)
        
        mock_task.retry.assert_called_once_with(countdown=60, max_retries=3)
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_generate_success_predictions_exception(self, mock_engine):
        """Test success prediction with exception."""
        mock_engine.calculate_application_insights = AsyncMock(
            side_effect=Exception("ML model training failed")
        )
        
        mock_task = Mock()
        mock_task.retry = Mock(side_effect=Retry("Retrying task"))
        
        user_id = "test_user_123"
        
        with pytest.raises(Retry):
            generate_success_predictions_task(mock_task, user_id)
        
        mock_task.retry.assert_called_once_with(countdown=60, max_retries=3)


class TestCalculatePlatformBenchmarksTask:
    """Test platform benchmarks calculation task."""
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_calculate_platform_benchmarks_success(self, mock_engine):
        """Test successful platform benchmarks calculation."""
        # Mock analytics results for different users
        def mock_calculate(user_id, time_period):
            # Simulate different response rates for different users
            base_rate = 20.0
            user_num = int(user_id.split('_')[-1]) if user_id.split('_')[-1].isdigit() else 1
            response_rate = base_rate + (user_num % 10) * 2  # Vary between 20-38%
            
            return {
                "user_id": user_id,
                "metrics": {
                    "response_rate": response_rate,
                    "interview_rate": response_rate * 0.6,  # 60% of response rate
                    "offer_rate": response_rate * 0.3,      # 30% of response rate
                    "total_applications": 20 + (user_num % 5) * 5
                }
            }
        
        mock_engine.calculate_application_insights = AsyncMock(side_effect=mock_calculate)
        
        mock_task = Mock()
        
        result = calculate_platform_benchmarks_task(mock_task)
        
        assert result["status"] == "completed"
        assert "benchmarks" in result
        assert result["users_processed"] > 0
        
        # Verify benchmarks structure
        benchmarks = result["benchmarks"]
        assert "platform_averages" in benchmarks
        assert "percentiles" in benchmarks
        assert "data_points" in benchmarks
        
        # Verify platform averages
        averages = benchmarks["platform_averages"]
        assert "response_rate" in averages
        assert "interview_rate" in averages
        assert "offer_rate" in averages
        assert averages["response_rate"] > 0
        
        # Verify percentiles
        percentiles = benchmarks["percentiles"]
        assert "p25" in percentiles
        assert "p50" in percentiles
        assert "p75" in percentiles
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_calculate_platform_benchmarks_with_failures(self, mock_engine):
        """Test platform benchmarks calculation with some user failures."""
        def mock_calculate(user_id, time_period):
            # Fail for every 3rd user
            user_num = int(user_id.split('_')[-1]) if user_id.split('_')[-1].isdigit() else 1
            if user_num % 3 == 0:
                return {"error": "No data available"}
            
            return {
                "user_id": user_id,
                "metrics": {
                    "response_rate": 25.0,
                    "interview_rate": 15.0,
                    "offer_rate": 8.0
                }
            }
        
        mock_engine.calculate_application_insights = AsyncMock(side_effect=mock_calculate)
        
        mock_task = Mock()
        
        result = calculate_platform_benchmarks_task(mock_task)
        
        assert result["status"] == "completed"
        assert result["users_processed"] > 0
        # Should still calculate benchmarks with available data
        assert "benchmarks" in result
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_calculate_platform_benchmarks_exception_retry(self, mock_engine):
        """Test platform benchmarks task retry on exception."""
        mock_engine.calculate_application_insights = AsyncMock(
            side_effect=Exception("Database connection failed")
        )
        
        mock_task = Mock()
        mock_task.retry = Mock(side_effect=Retry("Retrying task"))
        
        with pytest.raises(Retry):
            calculate_platform_benchmarks_task(mock_task)
        
        mock_task.retry.assert_called_once_with(countdown=600, max_retries=3)


class TestCleanupExpiredDataTask:
    """Test expired data cleanup task."""
    
    def test_cleanup_expired_data_success(self):
        """Test successful data cleanup."""
        mock_task = Mock()
        
        result = cleanup_expired_data_task(mock_task)
        
        assert result["status"] == "completed"
        assert "cleanup_operations" in result
        assert "total_records_cleaned" in result
        assert "total_storage_freed_mb" in result
        
        # Verify cleanup operations structure
        operations = result["cleanup_operations"]
        assert isinstance(operations, list)
        assert len(operations) > 0
        
        for operation in operations:
            assert "type" in operation
            assert "records" in operation
            assert "size_mb" in operation
            assert operation["records"] > 0
            assert operation["size_mb"] > 0
        
        # Verify totals
        expected_records = sum(op["records"] for op in operations)
        expected_size = sum(op["size_mb"] for op in operations)
        
        assert result["total_records_cleaned"] == expected_records
        assert result["total_storage_freed_mb"] == expected_size
    
    def test_cleanup_expired_data_exception_retry(self):
        """Test cleanup task retry on exception."""
        mock_task = Mock()
        mock_task.retry = Mock(side_effect=Retry("Retrying task"))
        
        # Mock an exception during cleanup
        with patch('app.services.analytics.tasks.logger') as mock_logger:
            mock_logger.info.side_effect = Exception("Cleanup failed")
            
            with pytest.raises(Retry):
                cleanup_expired_data_task(mock_task)
            
            mock_task.retry.assert_called_once_with(countdown=3600, max_retries=2)


class TestBatchUpdateUserInsightsTask:
    """Test batch user insights update task."""
    
    @patch('app.services.analytics.tasks.generate_success_predictions_task')
    def test_batch_update_success(self, mock_predictions_task):
        """Test successful batch user insights update."""
        # Mock the delay method to return a task result
        mock_task_result = Mock()
        mock_task_result.id = "task_123"
        mock_predictions_task.delay.return_value = mock_task_result
        
        user_ids = ["user_1", "user_2", "user_3"]
        mock_task = Mock()
        
        result = batch_update_user_insights_task(mock_task, user_ids)
        
        assert result["status"] == "completed"
        assert result["batch_size"] == 3
        assert result["tasks_queued"] == 3
        assert result["tasks_failed"] == 0
        
        # Verify results structure
        results = result["results"]
        assert len(results) == 3
        
        for i, user_result in enumerate(results):
            assert user_result["user_id"] == f"user_{i+1}"
            assert user_result["status"] == "queued"
            assert user_result["task_id"] == "task_123"
        
        # Verify that delay was called for each user
        assert mock_predictions_task.delay.call_count == 3
    
    @patch('app.services.analytics.tasks.generate_success_predictions_task')
    def test_batch_update_with_failures(self, mock_predictions_task):
        """Test batch update with some task failures."""
        def mock_delay(user_id):
            if "fail" in user_id:
                raise Exception("Task creation failed")
            
            mock_result = Mock()
            mock_result.id = f"task_{user_id}"
            return mock_result
        
        mock_predictions_task.delay.side_effect = mock_delay
        
        user_ids = ["user_1", "fail_user_2", "user_3", "fail_user_4"]
        mock_task = Mock()
        
        result = batch_update_user_insights_task(mock_task, user_ids)
        
        assert result["status"] == "completed"
        assert result["batch_size"] == 4
        assert result["tasks_queued"] == 2  # Two successful
        assert result["tasks_failed"] == 2   # Two failed
        
        # Verify results
        results = result["results"]
        queued_results = [r for r in results if r["status"] == "queued"]
        failed_results = [r for r in results if r["status"] == "failed"]
        
        assert len(queued_results) == 2
        assert len(failed_results) == 2
        
        # Verify failed results have error messages
        for failed_result in failed_results:
            assert "error" in failed_result
    
    @patch('app.services.analytics.tasks.generate_success_predictions_task')
    def test_batch_update_exception_retry(self, mock_predictions_task):
        """Test batch update task retry on exception."""
        mock_predictions_task.delay.side_effect = Exception("System failure")
        
        mock_task = Mock()
        mock_task.retry = Mock(side_effect=Retry("Retrying task"))
        
        user_ids = ["user_1"]
        
        with pytest.raises(Retry):
            batch_update_user_insights_task(mock_task, user_ids)
        
        mock_task.retry.assert_called_once_with(countdown=120, max_retries=2)


class TestTaskIntegration:
    """Integration tests for task interactions."""
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_task_chain_execution(self, mock_engine):
        """Test execution of multiple related tasks."""
        # Mock analytics engine for different scenarios
        mock_engine.calculate_application_insights = AsyncMock(return_value={
            "user_id": "test_user",
            "metrics": {"response_rate": 25.0},
            "success_prediction": {"success_probability": 70.0}
        })
        
        # Execute user analytics task
        mock_task = Mock()
        user_ids = ["test_user"]
        
        analytics_result = calculate_user_analytics_task(mock_task, user_ids)
        assert analytics_result["status"] == "completed"
        
        # Execute success prediction task
        prediction_result = generate_success_predictions_task(mock_task, "test_user")
        assert prediction_result["status"] == "completed"
        
        # Execute platform benchmarks task
        benchmarks_result = calculate_platform_benchmarks_task(mock_task)
        assert benchmarks_result["status"] == "completed"
        
        # Execute cleanup task
        cleanup_result = cleanup_expired_data_task(mock_task)
        assert cleanup_result["status"] == "completed"
    
    def test_task_performance_requirements(self):
        """Test that tasks meet performance requirements."""
        import time
        
        mock_task = Mock()
        
        # Test cleanup task performance (should be fast)
        start_time = time.time()
        result = cleanup_expired_data_task(mock_task)
        end_time = time.time()
        
        execution_time = end_time - start_time
        
        # Cleanup should complete quickly (< 1 second for mock data)
        assert execution_time < 1.0
        assert result["status"] == "completed"
    
    @patch('app.services.analytics.tasks.analytics_engine')
    def test_concurrent_task_execution(self, mock_engine):
        """Test concurrent execution of analytics tasks."""
        import threading
        
        mock_engine.calculate_application_insights = AsyncMock(return_value={
            "user_id": "concurrent_user",
            "metrics": {"response_rate": 20.0}
        })
        
        results = []
        
        def run_task(user_id):
            mock_task = Mock()
            result = generate_success_predictions_task(mock_task, f"user_{user_id}")
            results.append(result)
        
        # Create multiple threads
        threads = []
        for i in range(3):
            thread = threading.Thread(target=run_task, args=(i,))
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify all tasks completed
        assert len(results) == 3
        for result in results:
            assert result["status"] == "completed"


if __name__ == "__main__":
    # Run task tests
    pytest.main([__file__, "-v"])
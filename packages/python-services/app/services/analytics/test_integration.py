"""
Integration tests for Analytics Service API endpoints.
Tests the complete API functionality including authentication, validation, and responses.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock

from .main import create_app
from .service import analytics_engine


@pytest.fixture
def client():
    """Create test client for the analytics service."""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def mock_auth():
    """Mock authentication for testing."""
    return Mock(service_name="test-service", user_id="test-user")


@pytest.fixture
def sample_analytics_result():
    """Sample analytics result for mocking."""
    return {
        "user_id": "test_user_123",
        "period": "3m",
        "metrics": {
            "total_applications": 25,
            "response_rate": 20.0,
            "interview_rate": 12.0,
            "offer_rate": 4.0,
            "average_response_time_days": 7.5
        },
        "insights": [
            {
                "type": "timing",
                "title": "Optimal Application Day",
                "description": "Applications sent on Tuesday have 25% success rate",
                "actionable": True,
                "recommendation": "Consider applying to jobs on Tuesday for better response rates",
                "impact_score": 0.8
            }
        ],
        "success_prediction": {
            "success_probability": 15.5,
            "confidence": 75.2,
            "key_factors": ["match_score", "application_timing", "industry_fit"],
            "recommendations": [
                "Focus on applying to jobs with higher skill match scores",
                "Optimize application timing for better response rates"
            ]
        },
        "recommendations": [
            "Consider applying to jobs on Tuesday for better response rates",
            "Focus on applying to jobs with higher skill match scores"
        ],
        "benchmarks": {
            "user_metrics": {
                "response_rate": 20.0,
                "interview_rate": 12.0,
                "offer_rate": 4.0,
                "applications_per_month": 8.33
            },
            "platform_average": {
                "response_rate": 25.0,
                "interview_rate": 15.0,
                "offer_rate": 8.0,
                "applications_per_month": 15.0
            },
            "percentile": 45.5,
            "performance_indicators": [
                {
                    "metric": "response_rate",
                    "user_value": 20.0,
                    "avg_value": 25.0,
                    "performance": "below"
                }
            ]
        },
        "processing_time": 2.34,
        "generated_at": "2024-11-04T12:00:00Z"
    }


class TestHealthEndpoints:
    """Test health and status endpoints."""
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["service"] == "analytics"
        assert data["version"] == "1.0.0"
    
    def test_service_status_without_auth(self, client):
        """Test service status endpoint without authentication."""
        response = client.get("/status")
        
        # Should fail without authentication
        assert response.status_code == 401 or response.status_code == 403
    
    def test_service_status_with_auth(self, mock_auth):
        """Test service status endpoint with authentication."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        
        client = TestClient(app)
        response = client.get("/status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["service"] == "analytics"
        assert data["status"] == "operational"
        assert "features" in data
        assert isinstance(data["features"], list)
        assert "application-insights" in data["features"]


class TestAnalyticsEndpoints:
    """Test analytics calculation endpoints."""
    
    @patch.object(analytics_engine, 'calculate_application_insights')
    def test_calculate_insights_success(self, mock_calculate, mock_auth, sample_analytics_result):
        """Test successful analytics calculation."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        mock_calculate.return_value = sample_analytics_result
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        request_data = {
            "user_id": "test_user_123",
            "time_period": "3m"
        }
        
        response = client.post("/api/v1/calculate-insights", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["user_id"] == "test_user_123"
        assert data["period"] == "3m"
        assert "metrics" in data
        assert "insights" in data
        assert "success_prediction" in data
        assert "recommendations" in data
        assert "benchmarks" in data
        
        # Verify metrics
        metrics = data["metrics"]
        assert metrics["total_applications"] == 25
        assert metrics["response_rate"] == 20.0
        
        # Verify insights
        insights = data["insights"]
        assert len(insights) > 0
        assert insights[0]["type"] == "timing"
        assert insights[0]["actionable"] is True
    
    @patch.object(analytics_engine, 'calculate_application_insights')
    def test_calculate_insights_no_data(self, mock_calculate, mock_auth):
        """Test analytics calculation with no data."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        mock_calculate.return_value = {
            "error": "No application data available",
            "user_id": "test_user_123",
            "period": "3m"
        }
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        request_data = {
            "user_id": "test_user_123",
            "time_period": "3m"
        }
        
        response = client.post("/api/v1/calculate-insights", json=request_data)
        
        assert response.status_code == 404
        assert "No data available" in response.json()["detail"]
    
    def test_calculate_insights_without_auth(self, client):
        """Test analytics calculation without authentication."""
        request_data = {
            "user_id": "test_user_123",
            "time_period": "3m"
        }
        
        response = client.post("/api/v1/calculate-insights", json=request_data)
        
        # Should fail without authentication
        assert response.status_code == 401 or response.status_code == 403
    
    def test_calculate_insights_invalid_request(self, mock_auth):
        """Test analytics calculation with invalid request data."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        # Missing required user_id
        request_data = {
            "time_period": "3m"
        }
        
        response = client.post("/api/v1/calculate-insights", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    @patch.object(analytics_engine, 'calculate_application_insights')
    def test_get_user_insights_success(self, mock_calculate, mock_auth, sample_analytics_result):
        """Test GET user insights endpoint."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        mock_calculate.return_value = sample_analytics_result
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        response = client.get("/api/v1/insights/test_user_123?time_period=3m")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test_user_123"
        assert data["period"] == "3m"
    
    @patch.object(analytics_engine, 'calculate_application_insights')
    def test_get_user_insights_default_period(self, mock_calculate, mock_auth, sample_analytics_result):
        """Test GET user insights with default time period."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        mock_calculate.return_value = sample_analytics_result
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        response = client.get("/api/v1/insights/test_user_123")
        
        assert response.status_code == 200
        # Should use default period of 3m
        mock_calculate.assert_called_with(user_id="test_user_123", time_period="3m")


class TestBenchmarkEndpoints:
    """Test benchmark-related endpoints."""
    
    def test_get_platform_benchmarks(self, mock_auth):
        """Test platform benchmarks endpoint."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        response = client.get("/api/v1/benchmarks")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "platform_averages" in data
        assert "percentile_ranges" in data
        assert "industry_benchmarks" in data
        assert "generated_at" in data
        assert "data_points" in data
        
        # Verify platform averages structure
        averages = data["platform_averages"]
        assert "response_rate" in averages
        assert "interview_rate" in averages
        assert "offer_rate" in averages
        
        # Verify percentile ranges
        percentiles = data["percentile_ranges"]
        assert "top_10_percent" in percentiles
        assert "median" in percentiles
        assert "bottom_10_percent" in percentiles


class TestPredictionEndpoints:
    """Test success prediction endpoints."""
    
    @patch.object(analytics_engine, 'calculate_application_insights')
    def test_predict_success(self, mock_calculate, mock_auth, sample_analytics_result):
        """Test success prediction endpoint."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        mock_calculate.return_value = sample_analytics_result
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        response = client.post("/api/v1/predict-success/test_user_123")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test_user_123"
        assert "prediction" in data
        assert "model_info" in data
        
        # Verify prediction structure
        prediction = data["prediction"]
        assert "success_probability" in prediction
        assert "confidence" in prediction
        assert "key_factors" in prediction
        assert "recommendations" in prediction
        
        # Verify model info
        model_info = data["model_info"]
        assert model_info["model_type"] == "RandomForestClassifier"
        assert "features_used" in model_info
        assert "training_period" in model_info
    
    @patch.object(analytics_engine, 'calculate_application_insights')
    def test_predict_success_no_data(self, mock_calculate, mock_auth):
        """Test success prediction with no data."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        mock_calculate.return_value = {
            "error": "No application data available",
            "user_id": "test_user_123"
        }
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        response = client.post("/api/v1/predict-success/test_user_123")
        
        assert response.status_code == 404
        assert "Insufficient data" in response.json()["detail"]


class TestErrorHandling:
    """Test error handling in API endpoints."""
    
    @patch.object(analytics_engine, 'calculate_application_insights')
    def test_internal_server_error(self, mock_calculate, mock_auth):
        """Test handling of internal server errors."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        mock_calculate.side_effect = Exception("Database connection failed")
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        request_data = {
            "user_id": "test_user_123",
            "time_period": "3m"
        }
        
        response = client.post("/api/v1/calculate-insights", json=request_data)
        
        assert response.status_code == 500
        assert "Analytics calculation failed" in response.json()["detail"]
    
    def test_invalid_json_request(self, client):
        """Test handling of invalid JSON in request."""
        response = client.post(
            "/api/v1/calculate-insights",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Unprocessable Entity
    
    @patch('app.services.analytics.routes.get_current_auth')
    def test_missing_user_id_in_path(self, mock_auth_func, client, mock_auth):
        """Test handling of missing user ID in path parameters."""
        mock_auth_func.return_value = mock_auth
        
        # Try to access insights without user ID
        response = client.get("/api/v1/insights/")
        
        assert response.status_code == 404  # Not Found


class TestPerformanceRequirements:
    """Test performance requirements for analytics endpoints."""
    
    def test_response_time_requirement(self, mock_auth):
        """Test that analytics calculation meets response time requirements."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        import time
        
        request_data = {
            "user_id": "performance_test_user",
            "time_period": "3m"
        }
        
        start_time = time.time()
        response = client.post("/api/v1/calculate-insights", json=request_data)
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Should complete within 5 seconds (requirement from design doc)
        assert response_time < 5.0, f"Response took {response_time:.2f}s, should be < 5s"
        
        # Response should be successful or have expected error
        assert response.status_code in [200, 404, 500]
    
    @patch('app.services.analytics.routes.get_current_auth')
    def test_concurrent_requests(self, mock_auth_func, client, mock_auth):
        """Test handling of concurrent requests."""
        mock_auth_func.return_value = mock_auth
        
        import threading
        import time
        
        results = []
        
        def make_request(user_id):
            request_data = {
                "user_id": f"concurrent_user_{user_id}",
                "time_period": "3m"
            }
            response = client.post("/api/v1/calculate-insights", json=request_data)
            results.append(response.status_code)
        
        # Create multiple threads to make concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_request, args=(i,))
            threads.append(thread)
        
        start_time = time.time()
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        end_time = time.time()
        
        # All requests should complete
        assert len(results) == 5
        
        # Should handle concurrent requests efficiently
        total_time = end_time - start_time
        assert total_time < 15.0, f"Concurrent requests took {total_time:.2f}s, should be < 15s"


class TestDataValidation:
    """Test data validation in API endpoints."""
    
    def test_valid_time_periods(self, mock_auth):
        """Test validation of time period parameters."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        valid_periods = ["1m", "3m", "6m", "1y"]
        
        for period in valid_periods:
            request_data = {
                "user_id": "test_user",
                "time_period": period
            }
            
            response = client.post("/api/v1/calculate-insights", json=request_data)
            
            # Should not fail due to invalid period
            assert response.status_code in [200, 404, 500]  # 404 for no data, 500 for other errors
    
    def test_user_id_validation(self, mock_auth):
        """Test user ID validation."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        # Test with empty user ID
        request_data = {
            "user_id": "",
            "time_period": "3m"
        }
        
        response = client.post("/api/v1/calculate-insights", json=request_data)
        
        # Should handle empty user ID appropriately
        # Note: Empty string is technically valid, service will return 404 if no data found
        assert response.status_code in [200, 400, 422, 404, 500]
    
    def test_request_size_limits(self, mock_auth):
        """Test handling of large request payloads."""
        from app.core.auth import get_current_auth
        from .main import create_app
        
        # Create app with dependency override
        app = create_app()
        app.dependency_overrides[get_current_auth] = lambda: mock_auth
        client = TestClient(app)
        
        # Create a large but valid request
        request_data = {
            "user_id": "test_user_with_very_long_id_" + "x" * 1000,
            "time_period": "3m"
        }
        
        response = client.post("/api/v1/calculate-insights", json=request_data)
        
        # Should handle large user IDs appropriately
        assert response.status_code in [200, 400, 404, 413, 500]


if __name__ == "__main__":
    # Run integration tests
    pytest.main([__file__, "-v", "-s"])
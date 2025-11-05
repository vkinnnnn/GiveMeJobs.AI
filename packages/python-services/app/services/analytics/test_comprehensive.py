"""
Comprehensive tests for Analytics Service with mocked dependencies.
Tests analytics calculations with sample data and error handling.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock

# Mock all ML dependencies before importing
with patch.dict('sys.modules', {
    'scipy': MagicMock(),
    'scipy.stats': MagicMock(),
    'sklearn': MagicMock(),
    'sklearn.ensemble': MagicMock(),
    'sklearn.model_selection': MagicMock(),
    'sklearn.preprocessing': MagicMock(),
    'sklearn.metrics': MagicMock(),
    'joblib': MagicMock()
}):
    from app.services.analytics.service import (
        AnalyticsEngine, ApplicationMetrics, SuccessPrediction, BenchmarkComparison
    )


class TestAnalyticsEngineWithMocks:
    """Test analytics engine with mocked ML dependencies."""
    
    @pytest.fixture
    def analytics_engine(self):
        """Create analytics engine instance for testing."""
        return AnalyticsEngine()
    
    @pytest.fixture
    def sample_applications_df(self):
        """Create sample application data for testing."""
        data = []
        statuses = ['applied', 'screening', 'interview_scheduled', 'interview_completed', 
                   'offer_received', 'accepted', 'rejected']
        
        for i in range(50):
            data.append({
                'application_id': f"app_{i}",
                'user_id': "test_user_123",
                'job_title': f"Software Engineer {i}",
                'company': f"Company {i}",
                'industry': np.random.choice(['technology', 'finance', 'healthcare']),
                'company_size': np.random.choice(['startup', 'medium', 'large']),
                'remote_type': np.random.choice(['remote', 'hybrid', 'onsite']),
                'status': np.random.choice(statuses),
                'applied_date': datetime.now() - timedelta(days=np.random.randint(1, 90)),
                'response_time_days': np.random.exponential(7) if np.random.random() > 0.3 else None,
                'match_score': np.random.beta(2, 2),
                'salary_match_ratio': np.random.normal(1.0, 0.2)
            })
        
        return pd.DataFrame(data)
    
    def test_calculate_basic_metrics(self, analytics_engine, sample_applications_df):
        """Test basic metrics calculation with sample data."""
        metrics = analytics_engine._calculate_basic_metrics(sample_applications_df)
        
        assert hasattr(metrics, 'total_applications')
        assert hasattr(metrics, 'response_rate')
        assert hasattr(metrics, 'interview_rate')
        assert hasattr(metrics, 'offer_rate')
        assert metrics.total_applications == len(sample_applications_df)
        assert 0 <= metrics.response_rate <= 100
        assert 0 <= metrics.interview_rate <= 100
        assert 0 <= metrics.offer_rate <= 100
    
    def test_calculate_basic_metrics_empty_data(self, analytics_engine):
        """Test basic metrics calculation with empty data."""
        empty_df = pd.DataFrame()
        metrics = analytics_engine._calculate_basic_metrics(empty_df)
        
        assert metrics.total_applications == 0
        assert metrics.response_rate == 0.0
        assert metrics.interview_rate == 0.0
        assert metrics.offer_rate == 0.0
    
    @pytest.mark.asyncio
    async def test_generate_insights(self, analytics_engine, sample_applications_df):
        """Test insights generation with sample data."""
        insights = await analytics_engine._generate_insights(sample_applications_df, "test_user")
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        
        for insight in insights:
            assert hasattr(insight, 'type')
            assert hasattr(insight, 'title')
            assert hasattr(insight, 'description')
            assert hasattr(insight, 'actionable')
            assert hasattr(insight, 'impact_score')
    
    def test_prepare_ml_features(self, analytics_engine, sample_applications_df):
        """Test ML feature preparation."""
        features = analytics_engine._prepare_ml_features(sample_applications_df)
        
        assert isinstance(features, pd.DataFrame)
        assert not features.empty
        assert 'success' in features.columns
        
        # Check that success column is binary
        assert features['success'].dtype == int
        assert set(features['success'].unique()).issubset({0, 1})
    
    @pytest.mark.asyncio
    async def test_predict_success_probability_with_mock(self, analytics_engine, sample_applications_df):
        """Test success probability prediction with mocked ML model."""
        # Mock the ML model
        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
        mock_model.feature_importances_ = np.array([0.3, 0.2, 0.15, 0.1, 0.25])
        
        with patch.object(analytics_engine, '_get_or_train_success_model', return_value=mock_model):
            prediction = await analytics_engine._predict_success_probability(
                "test_user", sample_applications_df
            )
        
        assert hasattr(prediction, 'success_probability')
        assert hasattr(prediction, 'confidence')
        assert hasattr(prediction, 'key_factors')
        assert hasattr(prediction, 'recommendations')
        assert 0 <= prediction.success_probability <= 100
        assert 0 <= prediction.confidence <= 100
    
    @pytest.mark.asyncio
    async def test_calculate_application_insights_success(self, analytics_engine):
        """Test successful application insights calculation."""
        with patch.object(analytics_engine, '_get_user_applications') as mock_get_data:
            # Mock the data fetching
            sample_data = pd.DataFrame({
                'status': ['applied', 'interview_scheduled', 'offer_received'] * 10,
                'applied_date': [datetime.now() - timedelta(days=i) for i in range(30)],
                'response_time_days': [5, 7, 10] * 10,
                'match_score': [0.8, 0.6, 0.9] * 10,
                'industry': ['technology'] * 30,
                'company_size': ['medium'] * 30,
                'remote_type': ['hybrid'] * 30,
                'salary_match_ratio': [1.0] * 30
            })
            mock_get_data.return_value = sample_data
            
            # Mock ML model
            mock_model = Mock()
            mock_model.predict_proba.return_value = np.array([[0.2, 0.8]])
            mock_model.feature_importances_ = np.array([0.4, 0.3, 0.2, 0.1])
            
            with patch.object(analytics_engine, '_get_or_train_success_model', return_value=mock_model):
                result = await analytics_engine.calculate_application_insights("test_user", "3m")
            
            assert isinstance(result, dict)
            assert "user_id" in result
            assert "metrics" in result
            assert "insights" in result
            assert "success_prediction" in result
            assert "recommendations" in result
            assert "benchmarks" in result
    
    @pytest.mark.asyncio
    async def test_calculate_application_insights_no_data(self, analytics_engine):
        """Test application insights calculation with no data."""
        with patch.object(analytics_engine, '_get_user_applications') as mock_get_data:
            mock_get_data.return_value = pd.DataFrame()  # Empty dataframe
            
            result = await analytics_engine.calculate_application_insights("test_user", "3m")
            
            assert isinstance(result, dict)
            assert "error" in result
            assert result["error"] == "No application data available"
    
    def test_encode_company_size(self, analytics_engine):
        """Test company size encoding."""
        sizes = pd.Series(['startup', 'medium', 'large', 'unknown'])
        encoded = analytics_engine._encode_company_size(sizes)
        
        assert isinstance(encoded, pd.Series)
        assert len(encoded) == len(sizes)
        assert all(isinstance(x, (int, float)) for x in encoded)
    
    def test_encode_categorical(self, analytics_engine):
        """Test categorical encoding."""
        categories = pd.Series(['tech', 'finance', 'healthcare', 'tech'])
        encoded = analytics_engine._encode_categorical(categories, 'industry')
        
        assert isinstance(encoded, pd.Series)
        assert len(encoded) == len(categories)
        assert all(isinstance(x, (int, float)) for x in encoded)
    
    @pytest.mark.asyncio
    async def test_error_handling_in_insights(self, analytics_engine):
        """Test error handling in insights generation."""
        # Test with invalid data
        invalid_df = pd.DataFrame({'invalid_column': [1, 2, 3]})
        
        with patch.object(analytics_engine, '_get_user_applications', return_value=invalid_df):
            result = await analytics_engine.calculate_application_insights("test_user", "3m")
            
            # Should handle gracefully
            assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_concurrent_analytics_calculation(self, analytics_engine):
        """Test concurrent analytics calculations."""
        user_ids = [f"concurrent_user_{i}" for i in range(3)]
        
        # Mock data for all users
        sample_data = pd.DataFrame({
            'status': ['applied', 'interview_scheduled'] * 5,
            'applied_date': [datetime.now() - timedelta(days=i) for i in range(10)],
            'response_time_days': [5, 7] * 5,
            'match_score': [0.8, 0.6] * 5,
            'industry': ['technology'] * 10,
            'company_size': ['medium'] * 10,
            'remote_type': ['hybrid'] * 10,
            'salary_match_ratio': [1.0] * 10
        })
        
        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
        mock_model.feature_importances_ = np.array([0.4, 0.3, 0.2, 0.1])
        
        with patch.object(analytics_engine, '_get_user_applications', return_value=sample_data), \
             patch.object(analytics_engine, '_get_or_train_success_model', return_value=mock_model):
            
            # Run analytics for multiple users concurrently
            import asyncio
            tasks = [
                analytics_engine.calculate_application_insights(user_id, "3m")
                for user_id in user_ids
            ]
            
            results = await asyncio.gather(*tasks)
            
            # Verify all results are successful
            assert len(results) == len(user_ids)
            
            for i, result in enumerate(results):
                assert isinstance(result, dict)
                assert result["user_id"] == user_ids[i]


class TestAnalyticsPerformance:
    """Test analytics performance requirements."""
    
    @pytest.fixture
    def analytics_engine(self):
        """Create analytics engine instance for testing."""
        return AnalyticsEngine()
    
    @pytest.mark.asyncio
    async def test_performance_requirements(self, analytics_engine):
        """Test that analytics calculation meets performance requirements."""
        import time
        
        # Mock fast data and model
        sample_data = pd.DataFrame({
            'status': ['applied', 'interview_scheduled'] * 10,
            'applied_date': [datetime.now() - timedelta(days=i) for i in range(20)],
            'response_time_days': [5, 7] * 10,
            'match_score': [0.8, 0.6] * 10,
            'industry': ['technology'] * 20,
            'company_size': ['medium'] * 20,
            'remote_type': ['hybrid'] * 20,
            'salary_match_ratio': [1.0] * 20
        })
        
        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
        mock_model.feature_importances_ = np.array([0.4, 0.3, 0.2, 0.1])
        
        with patch.object(analytics_engine, '_get_user_applications', return_value=sample_data), \
             patch.object(analytics_engine, '_get_or_train_success_model', return_value=mock_model):
            
            start_time = time.time()
            result = await analytics_engine.calculate_application_insights("test_user", "3m")
            end_time = time.time()
            
            processing_time = end_time - start_time
            
            # Should complete within 5 seconds (requirement from design doc)
            assert processing_time < 5.0, f"Processing took {processing_time:.2f}s, should be < 5s"
            
            # Verify the processing time is recorded in the result
            assert "processing_time" in result
            assert isinstance(result["processing_time"], float)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
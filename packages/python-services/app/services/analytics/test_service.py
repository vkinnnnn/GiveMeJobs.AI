"""
Tests for the Analytics Service
Comprehensive test suite covering ML models, statistical analysis, and API endpoints.
"""

import pytest
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from .service import AnalyticsEngine, ApplicationMetrics, SuccessPrediction, BenchmarkComparison


class TestAnalyticsEngine:
    """Test suite for the AnalyticsEngine class."""
    
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
        """Test basic metrics calculation."""
        metrics = analytics_engine._calculate_basic_metrics(sample_applications_df)
        
        assert isinstance(metrics, ApplicationMetrics)
        assert metrics.total_applications == len(sample_applications_df)
        assert 0 <= metrics.response_rate <= 100
        assert 0 <= metrics.interview_rate <= 100
        assert 0 <= metrics.offer_rate <= 100
        assert metrics.average_response_time_days >= 0
    
    def test_calculate_basic_metrics_empty_data(self, analytics_engine):
        """Test basic metrics calculation with empty data."""
        empty_df = pd.DataFrame()
        metrics = analytics_engine._calculate_basic_metrics(empty_df)
        
        assert metrics.total_applications == 0
        assert metrics.response_rate == 0.0
        assert metrics.interview_rate == 0.0
        assert metrics.offer_rate == 0.0
        assert metrics.average_response_time_days == 0.0
    
    @pytest.mark.asyncio
    async def test_generate_insights(self, analytics_engine, sample_applications_df):
        """Test insights generation."""
        insights = await analytics_engine._generate_insights(sample_applications_df, "test_user")
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        
        for insight in insights:
            assert hasattr(insight, 'type')
            assert hasattr(insight, 'title')
            assert hasattr(insight, 'description')
            assert hasattr(insight, 'actionable')
            assert isinstance(insight.impact_score, float)
            assert 0 <= insight.impact_score <= 1
    
    def test_prepare_ml_features(self, analytics_engine, sample_applications_df):
        """Test ML feature preparation."""
        features = analytics_engine._prepare_ml_features(sample_applications_df)
        
        assert isinstance(features, pd.DataFrame)
        assert not features.empty
        assert 'success' in features.columns
        
        # Check that success column is binary
        assert features['success'].dtype == int
        assert set(features['success'].unique()).issubset({0, 1})
        
        # Check feature columns exist
        expected_features = [
            'match_score', 'application_day_of_week', 'application_hour',
            'job_title_length', 'company_size_encoded', 'industry_encoded',
            'remote_type_encoded', 'salary_match_ratio'
        ]
        
        for feature in expected_features:
            assert feature in features.columns
    
    def test_encode_company_size(self, analytics_engine):
        """Test company size encoding."""
        # Test with pandas Series
        sizes = pd.Series(['startup', 'medium', 'large', 'unknown'])
        encoded = analytics_engine._encode_company_size(sizes)
        
        assert isinstance(encoded, pd.Series)
        assert len(encoded) == len(sizes)
        assert all(isinstance(x, (int, float)) for x in encoded)
        
        # Test with single value
        single_encoded = analytics_engine._encode_company_size('startup')
        assert isinstance(single_encoded, pd.Series)
        assert len(single_encoded) == 1
    
    def test_encode_categorical(self, analytics_engine):
        """Test categorical encoding."""
        # Test with pandas Series
        categories = pd.Series(['tech', 'finance', 'healthcare', 'tech'])
        encoded = analytics_engine._encode_categorical(categories, 'industry')
        
        assert isinstance(encoded, pd.Series)
        assert len(encoded) == len(categories)
        assert all(isinstance(x, (int, float)) for x in encoded)
        
        # Test with single value
        single_encoded = analytics_engine._encode_categorical('tech', 'industry_test')
        assert isinstance(single_encoded, pd.Series)
        assert len(single_encoded) == 1
    
    @pytest.mark.asyncio
    async def test_get_or_train_success_model(self, analytics_engine, sample_applications_df):
        """Test ML model training and retrieval."""
        features = analytics_engine._prepare_ml_features(sample_applications_df)
        
        model = await analytics_engine._get_or_train_success_model("test_user", features)
        
        assert model is not None
        assert hasattr(model, 'predict')
        assert hasattr(model, 'predict_proba')
        
        # Test prediction
        X_test = features.drop(['success'], axis=1).iloc[:1]
        prediction = model.predict(X_test)
        assert len(prediction) == 1
        assert prediction[0] in [0, 1]
        
        # Test probability prediction
        proba = model.predict_proba(X_test)
        assert proba.shape[0] == 1
        assert np.sum(proba[0]) == pytest.approx(1.0, rel=1e-5)
    
    def test_get_feature_importance(self, analytics_engine):
        """Test feature importance extraction."""
        # Create a mock model with feature importances
        mock_model = Mock()
        mock_model.feature_importances_ = np.array([0.3, 0.2, 0.15, 0.1, 0.25])
        
        feature_names = ['feature_1', 'feature_2', 'feature_3', 'feature_4', 'feature_5']
        importance = analytics_engine._get_feature_importance(mock_model, feature_names)
        
        assert isinstance(importance, list)
        assert len(importance) <= 5
        assert 'feature_1' in importance  # Should be first (highest importance)
    
    def test_calculate_prediction_confidence(self, analytics_engine):
        """Test prediction confidence calculation."""
        # Create a mock model
        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.3, 0.7]])
        
        prediction_input = np.array([[0.5, 1, 9, 50, 3, 1, 1, 1.0]])
        confidence = analytics_engine._calculate_prediction_confidence(mock_model, prediction_input)
        
        assert isinstance(confidence, float)
        assert 0 <= confidence <= 100
        assert confidence == 70.0  # Max of [0.3, 0.7] * 100
    
    def test_generate_ml_recommendations(self, analytics_engine):
        """Test ML-based recommendation generation."""
        key_factors = ['match_score', 'application_day_of_week', 'industry_encoded']
        recommendations = analytics_engine._generate_ml_recommendations(key_factors)
        
        assert isinstance(recommendations, list)
        assert len(recommendations) <= 3
        assert all(isinstance(rec, str) for rec in recommendations)
    
    @pytest.mark.asyncio
    async def test_predict_success_probability(self, analytics_engine, sample_applications_df):
        """Test success probability prediction."""
        prediction = await analytics_engine._predict_success_probability(
            "test_user", sample_applications_df
        )
        
        assert isinstance(prediction, SuccessPrediction)
        assert 0 <= prediction.success_probability <= 100
        assert 0 <= prediction.confidence <= 100
        assert isinstance(prediction.key_factors, list)
        assert isinstance(prediction.recommendations, list)
    
    @pytest.mark.asyncio
    async def test_predict_success_probability_insufficient_data(self, analytics_engine):
        """Test success probability prediction with insufficient data."""
        # Create minimal dataframe
        small_df = pd.DataFrame({
            'status': ['applied', 'rejected'],
            'applied_date': [datetime.now(), datetime.now()]
        })
        
        prediction = await analytics_engine._predict_success_probability("test_user", small_df)
        
        assert isinstance(prediction, SuccessPrediction)
        assert prediction.success_probability == 0.0
        assert prediction.confidence == 0.0
        assert "Insufficient data" in prediction.key_factors
    
    @pytest.mark.asyncio
    async def test_get_benchmark_comparison(self, analytics_engine):
        """Test benchmark comparison generation."""
        metrics = ApplicationMetrics(
            total_applications=30,
            response_rate=20.0,
            interview_rate=12.0,
            offer_rate=5.0,
            average_response_time_days=8.5
        )
        
        benchmarks = await analytics_engine._get_benchmark_comparison("test_user", metrics)
        
        assert isinstance(benchmarks, BenchmarkComparison)
        assert isinstance(benchmarks.user_metrics, dict)
        assert isinstance(benchmarks.platform_average, dict)
        assert 0 <= benchmarks.percentile <= 100
        assert isinstance(benchmarks.performance_indicators, list)
    
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
            
            result = await analytics_engine.calculate_application_insights("test_user", "3m")
            
            assert isinstance(result, dict)
            assert "user_id" in result
            assert "metrics" in result
            assert "insights" in result
            assert "success_prediction" in result
            assert "recommendations" in result
            assert "benchmarks" in result
            assert "processing_time" in result
            assert "generated_at" in result
    
    @pytest.mark.asyncio
    async def test_calculate_application_insights_no_data(self, analytics_engine):
        """Test application insights calculation with no data."""
        with patch.object(analytics_engine, '_get_user_applications') as mock_get_data:
            mock_get_data.return_value = pd.DataFrame()  # Empty dataframe
            
            result = await analytics_engine.calculate_application_insights("test_user", "3m")
            
            assert isinstance(result, dict)
            assert "error" in result
            assert result["error"] == "No application data available"
    
    @pytest.mark.asyncio
    async def test_get_user_applications_sample_data(self, analytics_engine):
        """Test sample data generation for user applications."""
        df = await analytics_engine._get_user_applications("test_user_123", "3m")
        
        assert isinstance(df, pd.DataFrame)
        assert not df.empty
        assert "user_id" in df.columns
        assert "status" in df.columns
        assert "applied_date" in df.columns
        
        # Check that all user_ids match
        assert all(df["user_id"] == "test_user_123")
        
        # Check date range (should be within last 3 months)
        max_date = df["applied_date"].max()
        min_date = df["applied_date"].min()
        date_range = (max_date - min_date).days
        assert date_range <= 90  # 3 months


@pytest.mark.asyncio
class TestAnalyticsEngineIntegration:
    """Integration tests for the analytics engine."""
    
    @pytest.fixture
    def analytics_engine(self):
        return AnalyticsEngine()
    
    async def test_full_analytics_pipeline(self, analytics_engine):
        """Test the complete analytics pipeline end-to-end."""
        user_id = "integration_test_user"
        
        # This should work with the sample data generation
        result = await analytics_engine.calculate_application_insights(user_id, "3m")
        
        # Verify complete result structure
        assert isinstance(result, dict)
        
        # Check all required fields are present
        required_fields = [
            "user_id", "period", "metrics", "insights", 
            "success_prediction", "recommendations", "benchmarks", 
            "processing_time", "generated_at"
        ]
        
        for field in required_fields:
            assert field in result, f"Missing field: {field}"
        
        # Verify metrics structure
        metrics = result["metrics"]
        assert "total_applications" in metrics
        assert "response_rate" in metrics
        assert "interview_rate" in metrics
        assert "offer_rate" in metrics
        
        # Verify insights structure
        insights = result["insights"]
        assert isinstance(insights, list)
        
        # Verify success prediction structure
        prediction = result["success_prediction"]
        assert "success_probability" in prediction
        assert "confidence" in prediction
        assert "key_factors" in prediction
        assert "recommendations" in prediction
        
        # Verify benchmarks structure
        benchmarks = result["benchmarks"]
        assert "user_metrics" in benchmarks
        assert "platform_average" in benchmarks
        assert "percentile" in benchmarks
        
        # Verify recommendations
        recommendations = result["recommendations"]
        assert isinstance(recommendations, list)
    
    async def test_performance_requirements(self, analytics_engine):
        """Test that analytics calculation meets performance requirements."""
        import time
        
        user_id = "performance_test_user"
        
        start_time = time.time()
        result = await analytics_engine.calculate_application_insights(user_id, "3m")
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # Should complete within 5 seconds (requirement from design doc)
        assert processing_time < 5.0, f"Processing took {processing_time:.2f}s, should be < 5s"
        
        # Verify the processing time is recorded in the result
        assert "processing_time" in result
        assert isinstance(result["processing_time"], float)
    
    async def test_concurrent_analytics_calculation(self, analytics_engine):
        """Test concurrent analytics calculations."""
        user_ids = [f"concurrent_user_{i}" for i in range(5)]
        
        # Run analytics for multiple users concurrently
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
            assert "error" not in result or result.get("error") == "No application data available"


class TestAnalyticsEngineErrorHandling:
    """Test error handling in the analytics engine."""
    
    @pytest.fixture
    def analytics_engine(self):
        return AnalyticsEngine()
    
    @pytest.mark.asyncio
    async def test_invalid_time_period(self, analytics_engine):
        """Test handling of invalid time periods."""
        # Should handle gracefully and default to reasonable behavior
        result = await analytics_engine.calculate_application_insights("test_user", "invalid_period")
        
        # Should either work with default or return appropriate error
        assert isinstance(result, dict)
    
    def test_ml_model_with_invalid_data(self, analytics_engine):
        """Test ML model training with invalid data."""
        # Create dataframe with missing required columns
        invalid_df = pd.DataFrame({
            'random_column': [1, 2, 3],
            'another_column': ['a', 'b', 'c']
        })
        
        features = analytics_engine._prepare_ml_features(invalid_df)
        
        # Should return a minimal valid dataframe
        assert isinstance(features, pd.DataFrame)
        assert not features.empty
    
    @pytest.mark.asyncio
    async def test_model_training_with_minimal_data(self, analytics_engine):
        """Test model training with very little data."""
        # Create minimal valid dataframe
        minimal_df = pd.DataFrame({
            'status': ['applied', 'rejected'],
            'match_score': [0.5, 0.3]
        })
        
        features = analytics_engine._prepare_ml_features(minimal_df)
        model = await analytics_engine._get_or_train_success_model("test_user", features)
        
        # Should return a working model even with minimal data
        assert model is not None
        assert hasattr(model, 'predict')


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
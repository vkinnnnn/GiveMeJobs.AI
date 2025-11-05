"""Tests for background analytics tasks."""

import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch

import numpy as np
import pytest
from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import text

from app.tasks.background_analytics import (
    calculate_user_analytics_batch,
    update_skill_scores_batch,
    calculate_job_match_scores_batch,
    cleanup_expired_data,
    archive_old_jobs,
    _calculate_user_analytics_batch_async,
    _update_skill_scores_batch_async,
    _calculate_job_match_scores_batch_async,
    _cleanup_expired_data_async,
    _archive_old_jobs_async,
    _calculate_user_analytics,
    _calculate_skill_scores,
    _calculate_job_user_match_score
)


class TestBackgroundAnalyticsTasks:
    """Test background analytics Celery tasks."""
    
    @pytest.fixture
    def mock_users_data(self):
        """Mock user data for testing."""
        return [
            Mock(
                id="user_1",
                email="user1@example.com",
                created_at=datetime.utcnow() - timedelta(days=30),
                last_login_at=datetime.utcnow() - timedelta(days=1)
            ),
            Mock(
                id="user_2",
                email="user2@example.com",
                created_at=datetime.utcnow() - timedelta(days=60),
                last_login_at=datetime.utcnow() - timedelta(days=2)
            )
        ]
    
    @pytest.fixture
    def mock_applications_data(self):
        """Mock application data for testing."""
        return [
            Mock(
                status="applied",
                created_at=datetime.utcnow() - timedelta(days=5),
                updated_at=datetime.utcnow() - timedelta(days=5),
                job_id="job_1"
            ),
            Mock(
                status="interview_scheduled",
                created_at=datetime.utcnow() - timedelta(days=10),
                updated_at=datetime.utcnow() - timedelta(days=8),
                job_id="job_2"
            ),
            Mock(
                status="offer_received",
                created_at=datetime.utcnow() - timedelta(days=15),
                updated_at=datetime.utcnow() - timedelta(days=12),
                job_id="job_3"
            )
        ]
    
    @pytest.fixture
    def mock_skills_data(self):
        """Mock skills data for testing."""
        return [
            {
                "skill_name": "Python",
                "proficiency_level": "advanced",
                "years_experience": 5
            },
            {
                "skill_name": "JavaScript",
                "proficiency_level": "intermediate",
                "years_experience": 3
            },
            {
                "skill_name": "React",
                "proficiency_level": "beginner",
                "years_experience": 1
            }
        ]
    
    @patch('app.tasks.background_analytics.get_async_session')
    def test_calculate_user_analytics_batch_success(self, mock_session, mock_users_data):
        """Test successful user analytics batch calculation."""
        # Mock database session and queries
        mock_session_instance = Mock()
        
        # Mock users query result
        mock_users_result = Mock()
        mock_users_result.fetchall.return_value = mock_users_data
        
        # Mock analytics calculation results
        mock_session_instance.execute = AsyncMock(side_effect=[
            mock_users_result,  # Users query
            Mock(),  # Analytics upsert for user 1
            Mock(),  # Analytics upsert for user 2
        ])
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Mock the analytics calculation function
        with patch('app.tasks.background_analytics._calculate_user_analytics') as mock_calc:
            mock_calc.return_value = {
                "total_applications": 5,
                "response_rate": 40.0,
                "interview_rate": 20.0,
                "offer_rate": 10.0,
                "avg_response_time": 3.5
            }
            
            with patch('app.tasks.background_analytics._upsert_user_analytics') as mock_upsert:
                mock_upsert.return_value = None
                
                # Execute task
                result = calculate_user_analytics_batch.apply(args=[100, 0])
                task_result = result.get()
        
        # Assertions
        assert task_result["users_processed"] == 2
        assert task_result["analytics_updated"] == 2
        assert task_result["error_count"] == 0
        
        # Verify database operations
        mock_session_instance.commit.assert_called_once()
    
    @patch('app.tasks.background_analytics.get_async_session')
    def test_update_skill_scores_batch_success(self, mock_session, mock_skills_data):
        """Test successful skill scores batch update."""
        # Mock database session and queries
        mock_session_instance = Mock()
        
        # Mock user skills query result
        mock_skills_result = Mock()
        mock_skills_result.fetchall.return_value = [
            Mock(
                id="user_1",
                email="user1@example.com",
                skill_name="Python",
                proficiency_level="advanced",
                years_experience=5
            ),
            Mock(
                id="user_1",
                email="user1@example.com",
                skill_name="JavaScript",
                proficiency_level="intermediate",
                years_experience=3
            )
        ]
        
        mock_session_instance.execute = AsyncMock(side_effect=[
            mock_skills_result,  # Skills query
            Mock(),  # Skill score update
            Mock(),  # Skill score update
        ])
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Mock the skill scores calculation function
        with patch('app.tasks.background_analytics._calculate_skill_scores') as mock_calc:
            mock_calc.return_value = {
                "Python": {
                    "score": 8.5,
                    "market_demand": 150,
                    "proficiency_level": "advanced",
                    "experience_years": 5
                },
                "JavaScript": {
                    "score": 6.2,
                    "market_demand": 120,
                    "proficiency_level": "intermediate",
                    "experience_years": 3
                }
            }
            
            with patch('app.tasks.background_analytics._update_skill_score') as mock_update:
                mock_update.return_value = None
                
                # Execute task
                result = update_skill_scores_batch.apply(args=[50, 0])
                task_result = result.get()
        
        # Assertions
        assert task_result["users_processed"] == 1
        assert task_result["skill_scores_updated"] == 2
        assert task_result["error_count"] == 0
    
    @patch('app.tasks.background_analytics.get_async_session')
    def test_calculate_job_match_scores_batch_success(self, mock_session):
        """Test successful job match scores batch calculation."""
        # Mock database session and queries
        mock_session_instance = Mock()
        
        # Mock jobs query result
        mock_jobs_result = Mock()
        mock_jobs_result.fetchall.return_value = [
            Mock(
                id="job_1",
                title="Python Developer",
                company="TechCorp",
                location="San Francisco, CA",
                description="Looking for Python developer",
                required_skills="Python, Django, PostgreSQL",
                salary_min=100000,
                salary_max=130000
            )
        ]
        
        # Mock users query result
        mock_users_result = Mock()
        mock_users_result.fetchall.return_value = [
            Mock(
                id="user_1",
                preferred_locations="San Francisco, CA",
                salary_expectation_min=90000,
                salary_expectation_max=120000
            )
        ]
        
        mock_session_instance.execute = AsyncMock(side_effect=[
            mock_jobs_result,  # Jobs query
            mock_users_result,  # Users query
            Mock(),  # Match score storage
        ])
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Mock the match score calculation function
        with patch('app.tasks.background_analytics._calculate_job_user_match_score') as mock_calc:
            mock_calc.return_value = 0.75  # Good match score
            
            with patch('app.tasks.background_analytics._store_job_match_score') as mock_store:
                mock_store.return_value = None
                
                # Execute task
                result = calculate_job_match_scores_batch.apply(args=[200, 24])
                task_result = result.get()
        
        # Assertions
        assert task_result["jobs_processed"] == 1
        assert task_result["match_scores_calculated"] == 1
        assert task_result["error_count"] == 0
    
    @patch('app.tasks.background_analytics.get_async_session')
    def test_cleanup_expired_data_success(self, mock_session):
        """Test successful expired data cleanup."""
        # Mock database session and queries
        mock_session_instance = Mock()
        
        # Mock cleanup query results
        mock_session_instance.execute = AsyncMock(side_effect=[
            Mock(rowcount=25),  # Old applications cleaned
            Mock(rowcount=100),  # Old analytics cleaned
            Mock(rowcount=50),   # Old logs cleaned
            Mock(rowcount=10),   # Temp files cleaned
        ])
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute task
        result = cleanup_expired_data.apply(args=[90])
        task_result = result.get()
        
        # Assertions
        assert task_result["old_applications_cleaned"] == 25
        assert task_result["old_analytics_cleaned"] == 100
        assert task_result["old_logs_cleaned"] == 50
        assert task_result["temp_files_cleaned"] == 10
        assert task_result["total_records_cleaned"] == 185
    
    @patch('app.tasks.background_analytics.get_async_session')
    def test_archive_old_jobs_success(self, mock_session):
        """Test successful old jobs archival."""
        # Mock database session and queries
        mock_session_instance = Mock()
        mock_session_instance.execute = AsyncMock(return_value=Mock(rowcount=75))
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute task
        result = archive_old_jobs.apply(args=[30])
        task_result = result.get()
        
        # Assertions
        assert task_result["jobs_archived"] == 75
        assert "cutoff_date" in task_result
    
    @patch('app.tasks.background_analytics.get_async_session')
    def test_task_retry_on_database_error(self, mock_session):
        """Test task retry behavior on database errors."""
        # Mock database error
        mock_session.side_effect = Exception("Database connection failed")
        
        # Execute task and expect retry
        with pytest.raises(MaxRetriesExceededError):
            result = calculate_user_analytics_batch.apply(args=[100, 0])
            result.get()


class TestAnalyticsCalculationFunctions:
    """Test analytics calculation helper functions."""
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_calculate_user_analytics_with_applications(self, mock_session, mock_applications_data):
        """Test user analytics calculation with application data."""
        mock_session_instance = Mock()
        mock_result = Mock()
        mock_result.fetchall.return_value = mock_applications_data
        mock_session_instance.execute = AsyncMock(return_value=mock_result)
        
        # Execute function
        analytics = await _calculate_user_analytics(mock_session_instance, "user_1")
        
        # Assertions
        assert analytics["total_applications"] == 3
        assert analytics["response_rate"] == 66.67  # 2 out of 3 responded
        assert analytics["interview_rate"] == 66.67  # 2 out of 3 got interviews
        assert analytics["offer_rate"] == 33.33     # 1 out of 3 got offers
        assert analytics["avg_response_time"] > 0
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_calculate_user_analytics_no_applications(self, mock_session):
        """Test user analytics calculation with no applications."""
        mock_session_instance = Mock()
        mock_result = Mock()
        mock_result.fetchall.return_value = []
        mock_session_instance.execute = AsyncMock(return_value=mock_result)
        
        # Execute function
        analytics = await _calculate_user_analytics(mock_session_instance, "user_1")
        
        # Assertions
        assert analytics["total_applications"] == 0
        assert analytics["response_rate"] == 0.0
        assert analytics["interview_rate"] == 0.0
        assert analytics["offer_rate"] == 0.0
        assert analytics["avg_response_time"] == 0.0
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_calculate_skill_scores(self, mock_session):
        """Test skill scores calculation."""
        mock_session_instance = Mock()
        
        # Mock market demand queries
        mock_session_instance.execute = AsyncMock(side_effect=[
            Mock(scalar=lambda: 150),  # Python demand
            Mock(scalar=lambda: 120),  # JavaScript demand
            Mock(scalar=lambda: 80),   # React demand
        ])
        
        # Create mock skills data
        mock_skills_data = [
            {
                "skill_name": "Python",
                "proficiency_level": "advanced",
                "years_experience": 5
            },
            {
                "skill_name": "JavaScript",
                "proficiency_level": "intermediate",
                "years_experience": 3
            },
            {
                "skill_name": "React",
                "proficiency_level": "beginner",
                "years_experience": 1
            }
        ]
        
        # Execute function
        skill_scores = await _calculate_skill_scores(mock_session_instance, "user_1", mock_skills_data)
        
        # Assertions
        assert "Python" in skill_scores
        assert "JavaScript" in skill_scores
        assert "React" in skill_scores
        
        # Python should have highest score (advanced + high demand)
        python_score = skill_scores["Python"]
        assert python_score["score"] > skill_scores["JavaScript"]["score"]
        assert python_score["market_demand"] == 150
        assert python_score["proficiency_level"] == "advanced"
        assert python_score["experience_years"] == 5
        
        # React should have lowest score (beginner level)
        react_score = skill_scores["React"]
        assert react_score["score"] < skill_scores["JavaScript"]["score"]
        assert react_score["proficiency_level"] == "beginner"
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_calculate_job_user_match_score(self, mock_session):
        """Test job-user match score calculation."""
        # Mock job data
        job = Mock(
            id="job_1",
            location="San Francisco, CA",
            salary_min=100000,
            salary_max=130000,
            required_skills="Python, Django, PostgreSQL"
        )
        
        # Mock user data
        user = Mock(
            id="user_1",
            preferred_locations="San Francisco, CA, New York, NY",
            salary_expectation_min=90000,
            salary_expectation_max=120000
        )
        
        # Mock user skills query
        mock_session_instance = Mock()
        mock_result = Mock()
        mock_result.fetchall.return_value = [
            Mock(skill_name="Python", proficiency_level="advanced"),
            Mock(skill_name="Django", proficiency_level="intermediate"),
            Mock(skill_name="JavaScript", proficiency_level="beginner")
        ]
        mock_session_instance.execute = AsyncMock(return_value=mock_result)
        
        # Execute function
        match_score = await _calculate_job_user_match_score(mock_session_instance, job, user)
        
        # Assertions
        assert 0.0 <= match_score <= 1.0
        assert match_score > 0.5  # Should be a good match (location + salary + skills)
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_calculate_job_user_match_score_poor_match(self, mock_session):
        """Test job-user match score calculation for poor match."""
        # Mock job data (different location, low salary, different skills)
        job = Mock(
            id="job_1",
            location="Remote Location",
            salary_min=50000,
            salary_max=60000,
            required_skills="Java, Spring, Oracle"
        )
        
        # Mock user data
        user = Mock(
            id="user_1",
            preferred_locations="San Francisco, CA",
            salary_expectation_min=100000,
            salary_expectation_max=130000
        )
        
        # Mock user skills query (no matching skills)
        mock_session_instance = Mock()
        mock_result = Mock()
        mock_result.fetchall.return_value = [
            Mock(skill_name="Python", proficiency_level="advanced"),
            Mock(skill_name="React", proficiency_level="intermediate")
        ]
        mock_session_instance.execute = AsyncMock(return_value=mock_result)
        
        # Execute function
        match_score = await _calculate_job_user_match_score(mock_session_instance, job, user)
        
        # Assertions
        assert 0.0 <= match_score <= 1.0
        assert match_score < 0.3  # Should be a poor match


class TestAsyncAnalyticsFunctions:
    """Test async analytics helper functions."""
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_calculate_user_analytics_batch_async(self, mock_session):
        """Test async user analytics batch calculation."""
        # Mock database session and queries
        mock_session_instance = Mock()
        
        # Mock users query result
        mock_users_result = Mock()
        mock_users_result.fetchall.return_value = [
            Mock(id="user_1", email="user1@example.com", created_at=datetime.utcnow(), last_login_at=datetime.utcnow()),
            Mock(id="user_2", email="user2@example.com", created_at=datetime.utcnow(), last_login_at=datetime.utcnow())
        ]
        
        mock_session_instance.execute = AsyncMock(return_value=mock_users_result)
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Mock analytics calculation and upsert functions
        with patch('app.tasks.background_analytics._calculate_user_analytics') as mock_calc:
            mock_calc.return_value = {
                "total_applications": 5,
                "response_rate": 40.0,
                "interview_rate": 20.0,
                "offer_rate": 10.0,
                "avg_response_time": 3.5
            }
            
            with patch('app.tasks.background_analytics._upsert_user_analytics') as mock_upsert:
                mock_upsert.return_value = None
                
                # Execute function
                result = await _calculate_user_analytics_batch_async("test_task", 100, 0)
        
        # Assertions
        assert result["users_processed"] == 2
        assert result["analytics_updated"] == 2
        assert result["error_count"] == 0
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_cleanup_expired_data_async(self, mock_session):
        """Test async expired data cleanup."""
        # Mock database session and queries
        mock_session_instance = Mock()
        mock_session_instance.execute = AsyncMock(side_effect=[
            Mock(rowcount=25),  # Old applications
            Mock(rowcount=100), # Old analytics
            Mock(rowcount=50),  # Old logs
            Mock(rowcount=10),  # Temp files
        ])
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute function
        result = await _cleanup_expired_data_async("test_task", 90)
        
        # Assertions
        assert result["old_applications_cleaned"] == 25
        assert result["old_analytics_cleaned"] == 100
        assert result["old_logs_cleaned"] == 50
        assert result["temp_files_cleaned"] == 10
        assert result["total_records_cleaned"] == 185
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_archive_old_jobs_async(self, mock_session):
        """Test async old jobs archival."""
        # Mock database session and queries
        mock_session_instance = Mock()
        mock_session_instance.execute = AsyncMock(return_value=Mock(rowcount=75))
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute function
        result = await _archive_old_jobs_async("test_task", 30)
        
        # Assertions
        assert result["jobs_archived"] == 75
        assert "cutoff_date" in result


class TestAnalyticsErrorHandling:
    """Test error handling in analytics tasks."""
    
    @patch('app.tasks.background_analytics.get_async_session')
    def test_analytics_task_with_partial_errors(self, mock_session):
        """Test analytics task behavior with partial errors."""
        # Mock database session
        mock_session_instance = Mock()
        
        # Mock users query result
        mock_users_result = Mock()
        mock_users_result.fetchall.return_value = [
            Mock(id="user_1", email="user1@example.com"),
            Mock(id="user_2", email="user2@example.com"),
            Mock(id="user_3", email="user3@example.com")
        ]
        
        mock_session_instance.execute = AsyncMock(return_value=mock_users_result)
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Mock analytics calculation with one failure
        with patch('app.tasks.background_analytics._calculate_user_analytics') as mock_calc:
            mock_calc.side_effect = [
                {"total_applications": 5, "response_rate": 40.0, "interview_rate": 20.0, "offer_rate": 10.0, "avg_response_time": 3.5},
                Exception("Calculation failed for user 2"),
                {"total_applications": 3, "response_rate": 33.0, "interview_rate": 33.0, "offer_rate": 0.0, "avg_response_time": 2.0}
            ]
            
            with patch('app.tasks.background_analytics._upsert_user_analytics') as mock_upsert:
                mock_upsert.return_value = None
                
                # Execute task
                result = calculate_user_analytics_batch.apply(args=[100, 0])
                task_result = result.get()
        
        # Should complete with partial success
        assert task_result["users_processed"] == 3
        assert task_result["analytics_updated"] == 2  # Only 2 successful
        assert task_result["error_count"] == 1  # One error
        assert len(task_result["errors"]) == 1
    
    @patch('app.tasks.background_analytics.get_async_session')
    def test_analytics_task_database_connection_failure(self, mock_session):
        """Test analytics task behavior with database connection failure."""
        # Mock database connection failure
        mock_session.side_effect = Exception("Database connection failed")
        
        # Execute task and expect retry
        with pytest.raises(MaxRetriesExceededError):
            result = calculate_user_analytics_batch.apply(args=[100, 0])
            result.get()
    
    @pytest.mark.asyncio
    @patch('app.tasks.background_analytics.get_async_session')
    async def test_skill_scores_calculation_with_missing_data(self, mock_session):
        """Test skill scores calculation with missing market demand data."""
        mock_session_instance = Mock()
        
        # Mock market demand queries returning None/0
        mock_session_instance.execute = AsyncMock(side_effect=[
            Mock(scalar=lambda: None),  # No demand data
            Mock(scalar=lambda: 0),     # Zero demand
        ])
        
        skills_data = [
            {"skill_name": "ObscureSkill", "proficiency_level": "advanced", "years_experience": 5},
            {"skill_name": "UnpopularSkill", "proficiency_level": "intermediate", "years_experience": 3}
        ]
        
        # Execute function
        skill_scores = await _calculate_skill_scores(mock_session_instance, "user_1", skills_data)
        
        # Should handle missing data gracefully
        assert "ObscureSkill" in skill_scores
        assert "UnpopularSkill" in skill_scores
        assert skill_scores["ObscureSkill"]["market_demand"] == 0
        assert skill_scores["UnpopularSkill"]["market_demand"] == 0
        assert skill_scores["ObscureSkill"]["score"] > 0  # Should still have base score
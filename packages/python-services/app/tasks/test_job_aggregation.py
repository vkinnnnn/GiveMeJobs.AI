"""Tests for job aggregation tasks."""

import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch, MagicMock

import httpx
import pytest
from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import text

from app.core.config import get_settings
from app.tasks.job_aggregation import (
    aggregate_linkedin_jobs,
    aggregate_indeed_jobs,
    aggregate_glassdoor_jobs,
    normalize_and_deduplicate_jobs,
    _normalize_linkedin_job,
    _normalize_indeed_job,
    _normalize_glassdoor_job,
    _aggregate_linkedin_jobs_async,
    _aggregate_indeed_jobs_async,
    _aggregate_glassdoor_jobs_async,
    _normalize_and_deduplicate_jobs_async,
    _save_job_to_database
)

settings = get_settings()


class TestJobAggregationTasks:
    """Test job aggregation Celery tasks."""
    
    @pytest.fixture
    def mock_linkedin_response(self):
        """Mock LinkedIn API response."""
        return {
            "elements": [
                {
                    "id": "linkedin_job_1",
                    "title": "Senior Python Developer",
                    "companyName": "TechCorp",
                    "location": "San Francisco, CA",
                    "description": "We are looking for a senior Python developer...",
                    "salaryRange": {"min": 120000, "max": 150000},
                    "employmentType": "FULL_TIME",
                    "workplaceType": "REMOTE",
                    "listedAt": "2024-01-15T10:00:00Z",
                    "jobPostingUrl": "https://linkedin.com/jobs/123"
                },
                {
                    "id": "linkedin_job_2",
                    "title": "Data Scientist",
                    "companyName": "DataInc",
                    "location": "New York, NY",
                    "description": "Join our data science team...",
                    "salaryRange": {"min": 100000, "max": 130000},
                    "employmentType": "FULL_TIME",
                    "workplaceType": "HYBRID",
                    "listedAt": "2024-01-15T11:00:00Z",
                    "jobPostingUrl": "https://linkedin.com/jobs/124"
                }
            ]
        }
    
    @pytest.fixture
    def mock_indeed_response(self):
        """Mock Indeed API response."""
        return {
            "results": [
                {
                    "jobkey": "indeed_job_1",
                    "jobtitle": "Software Engineer",
                    "company": "StartupXYZ",
                    "city": "Austin",
                    "state": "TX",
                    "snippet": "Looking for a talented software engineer...",
                    "date": "2024-01-15",
                    "url": "https://indeed.com/viewjob?jk=indeed_job_1"
                },
                {
                    "jobkey": "indeed_job_2",
                    "jobtitle": "Frontend Developer",
                    "company": "WebCorp",
                    "city": "Seattle",
                    "state": "WA",
                    "snippet": "Join our frontend team...",
                    "date": "2024-01-15",
                    "url": "https://indeed.com/viewjob?jk=indeed_job_2"
                }
            ]
        }
    
    @pytest.fixture
    def mock_glassdoor_response(self):
        """Mock Glassdoor API response."""
        return {
            "response": {
                "jobs": [
                    {
                        "jobId": 12345,
                        "jobTitle": "DevOps Engineer",
                        "employer": "CloudTech",
                        "location": "Denver, CO",
                        "jobDescription": "We need a DevOps engineer...",
                        "salaryRange": {"min": 90000, "max": 120000},
                        "ageInDays": 2,
                        "jobUrl": "https://glassdoor.com/job/12345"
                    }
                ]
            }
        }
    
    @patch('app.tasks.job_aggregation.get_async_session')
    @patch('httpx.AsyncClient')
    def test_aggregate_linkedin_jobs_success(self, mock_client, mock_session, mock_linkedin_response):
        """Test successful LinkedIn job aggregation."""
        # Mock HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_linkedin_response
        
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Mock database session
        mock_session_instance = Mock()
        mock_session_instance.execute = AsyncMock()
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute task
        result = aggregate_linkedin_jobs.apply(args=[100, "United States"])
        task_result = result.get()
        
        # Assertions
        assert task_result["source"] == "linkedin"
        assert task_result["jobs_processed"] == 2
        assert task_result["jobs_saved"] == 2
        assert task_result["error_count"] == 0
        
        # Verify API call
        mock_client_instance.get.assert_called_once()
        call_args = mock_client_instance.get.call_args
        assert "api.linkedin.com" in call_args[0][0]
        
        # Verify database operations
        assert mock_session_instance.execute.call_count >= 2  # At least one insert per job
        mock_session_instance.commit.assert_called_once()
    
    @patch('app.tasks.job_aggregation.get_async_session')
    @patch('httpx.AsyncClient')
    def test_aggregate_indeed_jobs_success(self, mock_client, mock_session, mock_indeed_response):
        """Test successful Indeed job aggregation."""
        # Mock HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_indeed_response
        
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Mock database session
        mock_session_instance = Mock()
        mock_session_instance.execute = AsyncMock()
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute task
        result = aggregate_indeed_jobs.apply(args=[100, "United States"])
        task_result = result.get()
        
        # Assertions
        assert task_result["source"] == "indeed"
        assert task_result["jobs_processed"] == 2
        assert task_result["jobs_saved"] == 2
        assert task_result["error_count"] == 0
    
    @patch('app.tasks.job_aggregation.get_async_session')
    @patch('httpx.AsyncClient')
    def test_aggregate_glassdoor_jobs_success(self, mock_client, mock_session, mock_glassdoor_response):
        """Test successful Glassdoor job aggregation."""
        # Mock HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_glassdoor_response
        
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Mock database session
        mock_session_instance = Mock()
        mock_session_instance.execute = AsyncMock()
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute task
        result = aggregate_glassdoor_jobs.apply(args=[100, "United States"])
        task_result = result.get()
        
        # Assertions
        assert task_result["source"] == "glassdoor"
        assert task_result["jobs_processed"] == 1
        assert task_result["jobs_saved"] == 1
        assert task_result["error_count"] == 0
    
    @patch('httpx.AsyncClient')
    def test_aggregate_linkedin_jobs_api_failure(self, mock_client):
        """Test LinkedIn job aggregation with API failure."""
        # Mock HTTP error
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Execute task and expect retry
        with pytest.raises(MaxRetriesExceededError):
            result = aggregate_linkedin_jobs.apply(args=[100, "United States"])
            result.get()
    
    @patch('httpx.AsyncClient')
    def test_aggregate_jobs_http_error_status(self, mock_client):
        """Test job aggregation with HTTP error status."""
        # Mock HTTP response with error status
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.request = Mock()
        
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Execute task and expect retry
        with pytest.raises(MaxRetriesExceededError):
            result = aggregate_linkedin_jobs.apply(args=[100, "United States"])
            result.get()
    
    @patch('app.tasks.job_aggregation.get_async_session')
    def test_normalize_and_deduplicate_jobs_success(self, mock_session):
        """Test successful job normalization and deduplication."""
        # Mock database query results
        mock_jobs = [
            Mock(
                id="job_1",
                title="Software Engineer",
                company="TechCorp",
                location="San Francisco, CA",
                description="Job description 1",
                source="linkedin",
                external_id="ext_1",
                created_at=datetime.utcnow()
            ),
            Mock(
                id="job_2",
                title="Software Engineer",  # Duplicate title
                company="TechCorp",        # Same company
                location="San Francisco, CA",  # Same location
                description="Job description 2",
                source="indeed",
                external_id="ext_2",
                created_at=datetime.utcnow() - timedelta(minutes=30)  # Older
            ),
            Mock(
                id="job_3",
                title="Data Scientist",
                company="DataInc",
                location="New York, NY",
                description="Job description 3",
                source="glassdoor",
                external_id="ext_3",
                created_at=datetime.utcnow()
            )
        ]
        
        mock_session_instance = Mock()
        mock_result = Mock()
        mock_result.fetchall.return_value = mock_jobs
        mock_session_instance.execute = AsyncMock(return_value=mock_result)
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute task
        result = normalize_and_deduplicate_jobs.apply(args=[24])
        task_result = result.get()
        
        # Assertions
        assert task_result["jobs_processed"] == 3
        assert task_result["duplicates_removed"] == 1  # job_2 should be marked as duplicate
        assert task_result["unique_jobs"] == 2
        
        # Verify database operations
        assert mock_session_instance.execute.call_count >= 2  # Query + updates
        mock_session_instance.commit.assert_called_once()


class TestJobNormalizationFunctions:
    """Test job data normalization functions."""
    
    def test_normalize_linkedin_job(self):
        """Test LinkedIn job data normalization."""
        linkedin_data = {
            "id": "linkedin_123",
            "title": "Senior Python Developer",
            "companyName": "TechCorp",
            "location": "San Francisco, CA",
            "description": "We are looking for a senior Python developer with 5+ years of experience.",
            "salaryRange": {"min": 120000, "max": 150000},
            "employmentType": "FULL_TIME",
            "workplaceType": "REMOTE",
            "listedAt": "2024-01-15T10:00:00Z",
            "jobPostingUrl": "https://linkedin.com/jobs/123"
        }
        
        normalized = _normalize_linkedin_job(linkedin_data)
        
        assert normalized["external_id"] == "linkedin_123"
        assert normalized["title"] == "Senior Python Developer"
        assert normalized["company"] == "TechCorp"
        assert normalized["location"] == "San Francisco, CA"
        assert normalized["salary_min"] == 120000
        assert normalized["salary_max"] == 150000
        assert normalized["employment_type"] == "full_time"
        assert normalized["remote_type"] == "remote"
        assert normalized["source"] == "linkedin"
        assert normalized["url"] == "https://linkedin.com/jobs/123"
        
        # Check raw data is preserved
        raw_data = json.loads(normalized["raw_data"])
        assert raw_data["id"] == "linkedin_123"
    
    def test_normalize_indeed_job(self):
        """Test Indeed job data normalization."""
        indeed_data = {
            "jobkey": "indeed_456",
            "jobtitle": "Frontend Developer",
            "company": "WebCorp",
            "city": "Seattle",
            "state": "WA",
            "snippet": "Join our frontend team and work with React...",
            "date": "2024-01-15",
            "url": "https://indeed.com/viewjob?jk=indeed_456"
        }
        
        normalized = _normalize_indeed_job(indeed_data)
        
        assert normalized["external_id"] == "indeed_456"
        assert normalized["title"] == "Frontend Developer"
        assert normalized["company"] == "WebCorp"
        assert normalized["location"] == "Seattle, WA"
        assert normalized["description"] == "Join our frontend team and work with React..."
        assert normalized["employment_type"] == "full_time"
        assert normalized["remote_type"] == "onsite"
        assert normalized["source"] == "indeed"
        assert normalized["url"] == "https://indeed.com/viewjob?jk=indeed_456"
        
        # Check raw data is preserved
        raw_data = json.loads(normalized["raw_data"])
        assert raw_data["jobkey"] == "indeed_456"
    
    def test_normalize_glassdoor_job(self):
        """Test Glassdoor job data normalization."""
        glassdoor_data = {
            "jobId": 12345,
            "jobTitle": "DevOps Engineer",
            "employer": "CloudTech",
            "location": "Denver, CO",
            "jobDescription": "We need a DevOps engineer with AWS experience...",
            "salaryRange": {"min": 90000, "max": 120000},
            "ageInDays": 2,
            "jobUrl": "https://glassdoor.com/job/12345"
        }
        
        normalized = _normalize_glassdoor_job(glassdoor_data)
        
        assert normalized["external_id"] == "12345"
        assert normalized["title"] == "DevOps Engineer"
        assert normalized["company"] == "CloudTech"
        assert normalized["location"] == "Denver, CO"
        assert normalized["description"] == "We need a DevOps engineer with AWS experience..."
        assert normalized["salary_min"] == 90000
        assert normalized["salary_max"] == 120000
        assert normalized["employment_type"] == "full_time"
        assert normalized["remote_type"] == "onsite"
        assert normalized["source"] == "glassdoor"
        assert normalized["url"] == "https://glassdoor.com/job/12345"
        
        # Check raw data is preserved
        raw_data = json.loads(normalized["raw_data"])
        assert raw_data["jobId"] == 12345
    
    def test_normalize_job_with_missing_fields(self):
        """Test job normalization with missing optional fields."""
        minimal_linkedin_data = {
            "id": "linkedin_minimal",
            "title": "Developer",
            "companyName": "Company"
        }
        
        normalized = _normalize_linkedin_job(minimal_linkedin_data)
        
        assert normalized["external_id"] == "linkedin_minimal"
        assert normalized["title"] == "Developer"
        assert normalized["company"] == "Company"
        assert normalized["location"] == ""
        assert normalized["description"] == ""
        assert normalized["salary_min"] is None
        assert normalized["salary_max"] is None
        assert normalized["source"] == "linkedin"


class TestAsyncJobAggregationFunctions:
    """Test async job aggregation helper functions."""
    
    @pytest.mark.asyncio
    @patch('app.tasks.job_aggregation.get_async_session')
    @patch('httpx.AsyncClient')
    async def test_aggregate_linkedin_jobs_async_success(self, mock_client, mock_session):
        """Test async LinkedIn job aggregation."""
        # Mock HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "elements": [
                {
                    "id": "linkedin_test",
                    "title": "Test Job",
                    "companyName": "Test Company",
                    "location": "Test Location",
                    "description": "Test description"
                }
            ]
        }
        
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Mock database session
        mock_session_instance = Mock()
        mock_session_instance.execute = AsyncMock()
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute function
        result = await _aggregate_linkedin_jobs_async("test_task", 100, "United States")
        
        # Assertions
        assert result["source"] == "linkedin"
        assert result["jobs_processed"] == 1
        assert result["jobs_saved"] == 1
        assert result["error_count"] == 0
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_aggregate_jobs_async_http_error(self, mock_client):
        """Test async job aggregation with HTTP error."""
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Execute function and expect exception
        with pytest.raises(httpx.RequestError):
            await _aggregate_linkedin_jobs_async("test_task", 100, "United States")
    
    @pytest.mark.asyncio
    @patch('app.tasks.job_aggregation.get_async_session')
    async def test_normalize_and_deduplicate_jobs_async(self, mock_session):
        """Test async job normalization and deduplication."""
        # Mock database query results
        mock_jobs = [
            Mock(
                id="job_1",
                title="Software Engineer",
                company="TechCorp",
                location="San Francisco, CA",
                created_at=datetime.utcnow()
            ),
            Mock(
                id="job_2",
                title="Software Engineer",
                company="TechCorp",
                location="San Francisco, CA",
                created_at=datetime.utcnow() - timedelta(minutes=30)
            )
        ]
        
        mock_session_instance = Mock()
        mock_result = Mock()
        mock_result.fetchall.return_value = mock_jobs
        mock_session_instance.execute = AsyncMock(return_value=mock_result)
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute function
        result = await _normalize_and_deduplicate_jobs_async("test_task", 24)
        
        # Assertions
        assert result["jobs_processed"] == 2
        assert result["duplicates_removed"] == 1
        assert result["unique_jobs"] == 1
    
    @pytest.mark.asyncio
    @patch('app.tasks.job_aggregation.get_async_session')
    async def test_save_job_to_database_new_job(self, mock_session):
        """Test saving new job to database."""
        job_data = {
            "external_id": "test_job_123",
            "title": "Test Job",
            "company": "Test Company",
            "location": "Test Location",
            "description": "Test description",
            "source": "test"
        }
        
        mock_session_instance = Mock()
        # Mock that job doesn't exist
        mock_result = Mock()
        mock_result.fetchone.return_value = None
        mock_session_instance.execute = AsyncMock(return_value=mock_result)
        
        # Execute function
        await _save_job_to_database(mock_session_instance, job_data, "test")
        
        # Verify database operations
        assert mock_session_instance.execute.call_count == 2  # Check existence + insert
    
    @pytest.mark.asyncio
    @patch('app.tasks.job_aggregation.get_async_session')
    async def test_save_job_to_database_existing_job(self, mock_session):
        """Test saving existing job to database (should skip)."""
        job_data = {
            "external_id": "existing_job_123",
            "title": "Existing Job",
            "company": "Existing Company",
            "source": "test"
        }
        
        mock_session_instance = Mock()
        # Mock that job already exists
        mock_result = Mock()
        mock_result.fetchone.return_value = Mock(id="existing_id")
        mock_session_instance.execute = AsyncMock(return_value=mock_result)
        
        # Execute function
        await _save_job_to_database(mock_session_instance, job_data, "test")
        
        # Verify only existence check was performed
        assert mock_session_instance.execute.call_count == 1  # Only check existence


class TestJobAggregationRetryLogic:
    """Test retry logic and error handling in job aggregation tasks."""
    
    @patch('app.tasks.job_aggregation.get_async_session')
    @patch('httpx.AsyncClient')
    def test_task_retry_on_http_error(self, mock_client, mock_session):
        """Test task retry behavior on HTTP errors."""
        # Mock HTTP error
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Create task instance to test retry behavior
        task = aggregate_linkedin_jobs
        task.retry = Mock(side_effect=Exception("Retry called"))
        task.request.retries = 0
        task.max_retries = 3
        
        # Execute and expect retry
        with pytest.raises(Exception, match="Retry called"):
            task.apply(args=[100, "United States"]).get()
    
    @patch('app.tasks.job_aggregation.get_async_session')
    @patch('httpx.AsyncClient')
    def test_task_max_retries_exceeded(self, mock_client, mock_session):
        """Test behavior when max retries are exceeded."""
        # Mock persistent HTTP error
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(side_effect=httpx.RequestError("Persistent error"))
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Execute task and expect MaxRetriesExceededError
        with pytest.raises(MaxRetriesExceededError):
            result = aggregate_linkedin_jobs.apply(args=[100, "United States"])
            result.get()
    
    @patch('app.tasks.job_aggregation.get_async_session')
    @patch('httpx.AsyncClient')
    def test_task_partial_success_with_errors(self, mock_client, mock_session):
        """Test task behavior with partial success (some jobs fail to save)."""
        # Mock HTTP response with jobs
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "elements": [
                {"id": "job_1", "title": "Job 1", "companyName": "Company 1"},
                {"id": "job_2", "title": "Job 2", "companyName": "Company 2"}
            ]
        }
        
        mock_client_instance = Mock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Mock database session with one successful save and one failure
        mock_session_instance = Mock()
        mock_session_instance.execute = AsyncMock(side_effect=[
            None,  # First job saves successfully
            Exception("Database error")  # Second job fails
        ])
        mock_session_instance.commit = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        # Execute task
        result = aggregate_linkedin_jobs.apply(args=[100, "United States"])
        task_result = result.get()
        
        # Should complete with partial success
        assert task_result["jobs_processed"] == 2
        assert task_result["jobs_saved"] == 1  # Only one saved successfully
        assert task_result["error_count"] == 1  # One error occurred
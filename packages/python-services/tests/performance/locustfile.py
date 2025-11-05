"""
Load Testing Suite for GiveMeJobs Platform using Locust

This module provides comprehensive load testing scenarios including:
- User authentication flows
- Job search and filtering
- Application submission
- Profile management
- API endpoint stress testing

Requirements: 14.4, 12.1, 12.2, 12.3 - Performance and load testing
"""

import json
import random
import time
from typing import Dict, List, Optional
from 
class BaseAPIUser(HttpUser):
    """Base user class with common functionality."""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """Setup user session."""
        self.auth_token = None
        self.user_id = None
        self.setup_test_data()
    
    def setup_test_data(self):
        """Setup test data for the user."""
        self.test_user_data = {
            "email": f"test_{random.randint(1000, 9999)}@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User",
            "professional_headline": "Software Engineer"
        }
        
        self.test_job_data = {
            "title": "Software Engineer",
            "company": "Test Company",
            "location": "Remote",
            "description": "Test job description for performance testing",
            "requirements": ["Python", "FastAPI", "PostgreSQL"],
            "salary_min": 80000,
            "salary_max": 120000
        }
    
    def authenticate(self) -> bool:
        """Authenticate user and get token."""
        if self.auth_token:
            return True
        
        # Register user first
        response = self.client.post("/api/v1/auth/register", json=self.test_user_data)
        if response.status_code not in [200, 201, 409]:  # 409 if user exists
            return False
        
        # Login
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        
        response = self.client.post("/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("access_token")
            self.user_id = data.get("user_id")
            return True
        
        return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers."""
        if not self.auth_token:
            self.authenticate()
        
        return {"Authorization": f"Bearer {self.auth_token}"}


class HealthCheckUser(HttpUser):
    """User that only performs health checks."""
    
    wait_time = between(0.5, 1.5)
    weight = 1
    
    @task(10)
    def health_check(self):
        """Test health check endpoint."""
        self.client.get("/health")
    
    @task(5)
    def api_health_check(self):
        """Test API health check endpoint."""
        self.client.get("/api/v1/health")
    
    @task(3)
    def metrics_endpoint(self):
        """Test metrics endpoint."""
        self.client.get("/metrics")


class AuthenticationUser(BaseAPIUser):
    """User focused on authentication flows."""
    
    weight = 3
    
    @task(5)
    def register_user(self):
        """Test user registration."""
        user_data = {
            "email": f"perf_test_{random.randint(10000, 99999)}@example.com",
            "password": "TestPassword123!",
            "first_name": "Performance",
            "last_name": "Test"
        }
        
        self.client.post("/api/v1/auth/register", json=user_data)
    
    @task(10)
    def login_user(self):
        """Test user login."""
        if not self.authenticate():
            return
        
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        
        self.client.post("/api/v1/auth/login", json=login_data)
    
    @task(3)
    def refresh_token(self):
        """Test token refresh."""
        if not self.authenticate():
            return
        
        self.client.post(
            "/api/v1/auth/refresh",
            headers=self.get_auth_headers()
        )
    
    @task(2)
    def get_profile(self):
        """Test getting user profile."""
        if not self.authenticate():
            return
        
        self.client.get(
            "/api/v1/users/me",
            headers=self.get_auth_headers()
        )


class JobSearchUser(BaseAPIUser):
    """User focused on job search functionality."""
    
    weight = 5
    
    @task(15)
    def search_jobs(self):
        """Test job search."""
        params = {
            "q": random.choice(["python", "javascript", "engineer", "developer"]),
            "location": random.choice(["remote", "new york", "san francisco"]),
            "limit": random.randint(10, 50)
        }
        
        self.client.get("/api/v1/jobs/search", params=params)
    
    @task(10)
    def get_job_details(self):
        """Test getting job details."""
        # Simulate getting a random job ID
        job_id = f"job_{random.randint(1, 1000)}"
        self.client.get(f"/api/v1/jobs/{job_id}")
    
    @task(8)
    def semantic_search(self):
        """Test semantic job search."""
        if not self.authenticate():
            return
        
        search_data = {
            "query": "Looking for a Python developer position with FastAPI experience",
            "limit": 20
        }
        
        self.client.post(
            "/api/v1/jobs/semantic-search",
            json=search_data,
            headers=self.get_auth_headers()
        )
    
    @task(5)
    def get_job_recommendations(self):
        """Test job recommendations."""
        if not self.authenticate():
            return
        
        self.client.get(
            "/api/v1/jobs/recommendations",
            headers=self.get_auth_headers()
        )


class DocumentProcessingUser(BaseAPIUser):
    """User focused on document processing."""
    
    weight = 3
    
    @task(8)
    def generate_resume(self):
        """Test resume generation."""
        if not self.authenticate():
            return
        
        generation_data = {
            "job_description": "Python developer with FastAPI experience",
            "template_id": "modern",
            "customizations": {
                "highlight_skills": ["Python", "FastAPI", "PostgreSQL"]
            }
        }
        
        self.client.post(
            "/api/v1/documents/generate-resume",
            json=generation_data,
            headers=self.get_auth_headers()
        )
    
    @task(5)
    def generate_cover_letter(self):
        """Test cover letter generation."""
        if not self.authenticate():
            return
        
        generation_data = {
            "job_description": "Software engineer position at tech startup",
            "company_name": "Test Company",
            "tone": "professional"
        }
        
        self.client.post(
            "/api/v1/documents/generate-cover-letter",
            json=generation_data,
            headers=self.get_auth_headers()
        )
    
    @task(3)
    def analyze_document(self):
        """Test document analysis."""
        if not self.authenticate():
            return
        
        # Simulate document upload
        files = {
            "file": ("test_resume.pdf", b"fake pdf content", "application/pdf")
        }
        
        self.client.post(
            "/api/v1/documents/analyze",
            files=files,
            headers=self.get_auth_headers()
        )


class AnalyticsUser(BaseAPIUser):
    """User focused on analytics functionality."""
    
    weight = 2
    
    @task(10)
    def get_user_analytics(self):
        """Test user analytics."""
        if not self.authenticate():
            return
        
        self.client.get(
            "/api/v1/analytics/user-insights",
            headers=self.get_auth_headers()
        )
    
    @task(5)
    def get_application_analytics(self):
        """Test application analytics."""
        if not self.authenticate():
            return
        
        params = {"period": "30d"}
        self.client.get(
            "/api/v1/analytics/applications",
            params=params,
            headers=self.get_auth_headers()
        )
    
    @task(3)
    def get_market_insights(self):
        """Test market insights."""
        params = {
            "skills": "python,fastapi",
            "location": "remote"
        }
        
        self.client.get("/api/v1/analytics/market-insights", params=params)


class CDNUser(BaseAPIUser):
    """User focused on CDN functionality."""
    
    weight = 1
    
    @task(5)
    def upload_asset(self):
        """Test asset upload."""
        if not self.authenticate():
            return
        
        files = {
            "file": ("test_image.jpg", b"fake image content", "image/jpeg")
        }
        
        data = {
            "optimize": "true",
            "target_path": "uploads/test_image.jpg"
        }
        
        self.client.post(
            "/api/v1/cdn/upload",
            files=files,
            data=data,
            headers=self.get_auth_headers()
        )
    
    @task(3)
    def get_asset_url(self):
        """Test getting asset URL."""
        asset_path = "uploads/test_image.jpg"
        self.client.get(f"/api/v1/cdn/asset-url/{asset_path}")


class StressTestUser(BaseAPIUser):
    """User for stress testing with high load."""
    
    wait_time = between(0.1, 0.5)  # Very short wait time
    weight = 2
    
    @task(20)
    def rapid_health_checks(self):
        """Rapid health check requests."""
        self.client.get("/health")
    
    @task(15)
    def rapid_job_search(self):
        """Rapid job search requests."""
        params = {"q": "test", "limit": 10}
        self.client.get("/api/v1/jobs/search", params=params)
    
    @task(10)
    def rapid_auth_requests(self):
        """Rapid authentication requests."""
        if self.authenticate():
            self.client.get(
                "/api/v1/users/me",
                headers=self.get_auth_headers()
            )


# Performance test event handlers
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts."""
    logger.info("Performance test starting", environment=environment)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops."""
    logger.info("Performance test completed", environment=environment)


@events.request_success.add_listener
def on_request_success(request_type, name, response_time, response_length, **kwargs):
    """Called on successful request."""
    if response_time > 2000:  # Log slow requests
        logger.warning(
            "Slow request detected",
            request_type=request_type,
            name=name,
            response_time=response_time
        )


@events.request_failure.add_listener
def on_request_failure(request_type, name, response_time, response_length, exception, **kwargs):
    """Called on failed request."""
    logger.error(
        "Request failed",
        request_type=request_type,
        name=name,
        response_time=response_time,
        exception=str(exception)
    )


# Custom performance test scenarios
class ScenarioMixin:
    """Mixin for custom test scenarios."""
    
    def simulate_user_journey(self):
        """Simulate a complete user journey."""
        # 1. Register/Login
        if not self.authenticate():
            return
        
        # 2. Search for jobs
        self.client.get("/api/v1/jobs/search", params={"q": "python"})
        
        # 3. Get job details
        job_id = f"job_{random.randint(1, 100)}"
        self.client.get(f"/api/v1/jobs/{job_id}")
        
        # 4. Generate resume
        generation_data = {
            "job_description": "Python developer position",
            "template_id": "modern"
        }
        self.client.post(
            "/api/v1/documents/generate-resume",
            json=generation_data,
            headers=self.get_auth_headers()
        )
        
        # 5. Check analytics
        self.client.get(
            "/api/v1/analytics/user-insights",
            headers=self.get_auth_headers()
        )


class UserJourneyUser(BaseAPIUser, ScenarioMixin):
    """User that simulates complete user journeys."""
    
    weight = 2
    
    @task(1)
    def complete_user_journey(self):
        """Execute complete user journey."""
        self.simulate_user_journey()


# Load test configurations
class LightLoadTest(HealthCheckUser, AuthenticationUser, JobSearchUser):
    """Light load test configuration."""
    pass


class MediumLoadTest(HealthCheckUser, AuthenticationUser, JobSearchUser, DocumentProcessingUser, AnalyticsUser):
    """Medium load test configuration."""
    pass


class HeavyLoadTest(HealthCheckUser, AuthenticationUser, JobSearchUser, DocumentProcessingUser, AnalyticsUser, CDNUser, StressTestUser):
    """Heavy load test configuration."""
    pass


class EnduranceTest(UserJourneyUser):
    """Endurance test for long-running scenarios."""
    wait_time = between(5, 15)  # Longer wait times for endurance testing
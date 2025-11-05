"""
Test data factories for creating consistent test data.

This module provides factory classes for generating test data
with realistic values and proper relationships.
"""

import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from faker import Faker

fake = Faker()


class UserFactory:
    """Factory for creating user test data."""
    
    @staticmethod
    def build(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build user data dictionary."""
        data = {
            "email": fake.email(),
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "password": "TestPassword123!",
            "professional_headline": fake.job(),
            "phone_number": fake.phone_number(),
            "location": f"{fake.city()}, {fake.state_abbr()}",
            "is_active": True,
            "email_verified": False,
            "mfa_enabled": False
        }
        
        if override:
            data.update(override)
        
        return data
    
    @staticmethod
    def build_batch(count: int, override: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Build multiple user data dictionaries."""
        return [UserFactory.build(override) for _ in range(count)]
    
    @staticmethod
    def build_with_skills(skill_count: int = 5) -> Dict[str, Any]:
        """Build user data with associated skills."""
        user_data = UserFactory.build()
        user_data["skills"] = SkillFactory.build_batch(skill_count)
        return user_data


class JobFactory:
    """Factory for creating job test data."""
    
    INDUSTRIES = [
        "technology", "healthcare", "finance", "education", "retail",
        "manufacturing", "consulting", "media", "nonprofit", "government"
    ]
    
    JOB_TYPES = ["full_time", "part_time", "contract", "freelance", "internship"]
    REMOTE_TYPES = ["remote", "hybrid", "onsite"]
    
    TECH_SKILLS = [
        "Python", "JavaScript", "Java", "C++", "React", "Node.js",
        "FastAPI", "Django", "PostgreSQL", "MongoDB", "Docker",
        "Kubernetes", "AWS", "Azure", "Git", "Linux"
    ]
    
    @staticmethod
    def build(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build job data dictionary."""
        required_skills = random.sample(JobFactory.TECH_SKILLS, k=random.randint(3, 6))
        preferred_skills = random.sample(
            [skill for skill in JobFactory.TECH_SKILLS if skill not in required_skills],
            k=random.randint(2, 4)
        )
        
        salary_min = random.randint(50000, 150000)
        salary_max = salary_min + random.randint(20000, 50000)
        
        data = {
            "title": fake.job(),
            "company": fake.company(),
            "description": fake.text(max_nb_chars=2000),
            "location": f"{fake.city()}, {fake.state_abbr()}",
            "remote_type": random.choice(JobFactory.REMOTE_TYPES),
            "job_type": random.choice(JobFactory.JOB_TYPES),
            "industry": random.choice(JobFactory.INDUSTRIES),
            "required_skills": required_skills,
            "preferred_skills": preferred_skills,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_type": "annual",
            "experience_level": random.choice(["entry", "junior", "mid", "senior", "lead"]),
            "status": "active",
            "posted_at": fake.date_time_between(start_date="-30d", end_date="now"),
            "expires_at": fake.date_time_between(start_date="now", end_date="+60d")
        }
        
        if override:
            data.update(override)
        
        return data
    
    @staticmethod
    def build_batch(count: int, override: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Build multiple job data dictionaries."""
        return [JobFactory.build(override) for _ in range(count)]
    
    @staticmethod
    def build_python_job() -> Dict[str, Any]:
        """Build Python-specific job data."""
        return JobFactory.build({
            "title": "Senior Python Developer",
            "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "preferred_skills": ["Kubernetes", "AWS", "Redis"],
            "industry": "technology"
        })


class SkillFactory:
    """Factory for creating skill test data."""
    
    SKILL_CATEGORIES = ["technical", "soft", "language", "certification", "industry"]
    
    TECHNICAL_SKILLS = [
        "Python", "JavaScript", "Java", "C++", "React", "Vue.js",
        "FastAPI", "Django", "Flask", "PostgreSQL", "MongoDB", "Redis",
        "Docker", "Kubernetes", "AWS", "Azure", "Git", "Linux"
    ]
    
    SOFT_SKILLS = [
        "Leadership", "Communication", "Problem Solving", "Team Work",
        "Project Management", "Critical Thinking", "Creativity", "Adaptability"
    ]
    
    @staticmethod
    def build(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build skill data dictionary."""
        category = random.choice(SkillFactory.SKILL_CATEGORIES)
        
        if category == "technical":
            name = random.choice(SkillFactory.TECHNICAL_SKILLS)
        elif category == "soft":
            name = random.choice(SkillFactory.SOFT_SKILLS)
        else:
            name = fake.word().title()
        
        data = {
            "name": name,
            "category": category,
            "proficiency_level": random.randint(1, 5),
            "years_of_experience": round(random.uniform(0.5, 10.0), 1),
            "last_used": fake.date_between(start_date="-2y", end_date="today"),
            "endorsements": random.randint(0, 50)
        }
        
        if override:
            data.update(override)
        
        return data
    
    @staticmethod
    def build_batch(count: int, override: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Build multiple skill data dictionaries."""
        return [SkillFactory.build(override) for _ in range(count)]


class ApplicationFactory:
    """Factory for creating application test data."""
    
    STATUSES = ["draft", "submitted", "under_review", "interview", "rejected", "accepted"]
    
    @staticmethod
    def build(user_id: str, job_id: str, override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build application data dictionary."""
        data = {
            "user_id": user_id,
            "job_id": job_id,
            "cover_letter": fake.text(max_nb_chars=1000),
            "status": random.choice(ApplicationFactory.STATUSES),
            "applied_at": fake.date_time_between(start_date="-30d", end_date="now"),
            "notes": fake.text(max_nb_chars=500) if random.choice([True, False]) else None,
            "salary_expectation": random.randint(60000, 200000) if random.choice([True, False]) else None
        }
        
        if override:
            data.update(override)
        
        return data
    
    @staticmethod
    def build_batch(
        user_ids: List[str], 
        job_ids: List[str], 
        override: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Build multiple application data dictionaries."""
        applications = []
        for user_id in user_ids:
            for job_id in random.sample(job_ids, k=random.randint(1, min(3, len(job_ids)))):
                applications.append(ApplicationFactory.build(user_id, job_id, override))
        return applications


class ExperienceFactory:
    """Factory for creating work experience test data."""
    
    @staticmethod
    def build(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build experience data dictionary."""
        start_date = fake.date_between(start_date="-10y", end_date="-1y")
        is_current = random.choice([True, False])
        end_date = None if is_current else fake.date_between(start_date=start_date, end_date="today")
        
        data = {
            "title": fake.job(),
            "company": fake.company(),
            "location": f"{fake.city()}, {fake.state_abbr()}",
            "start_date": start_date,
            "end_date": end_date,
            "is_current": is_current,
            "description": fake.text(max_nb_chars=1000),
            "skills": random.sample(JobFactory.TECH_SKILLS, k=random.randint(3, 6))
        }
        
        if override:
            data.update(override)
        
        return data
    
    @staticmethod
    def build_batch(count: int, override: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Build multiple experience data dictionaries."""
        return [ExperienceFactory.build(override) for _ in range(count)]


class EducationFactory:
    """Factory for creating education test data."""
    
    DEGREES = [
        "Bachelor of Science", "Bachelor of Arts", "Master of Science",
        "Master of Arts", "Master of Business Administration", "Doctor of Philosophy"
    ]
    
    FIELDS = [
        "Computer Science", "Software Engineering", "Information Technology",
        "Business Administration", "Marketing", "Finance", "Psychology",
        "Mathematics", "Physics", "Engineering"
    ]
    
    @staticmethod
    def build(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build education data dictionary."""
        start_year = random.randint(2000, 2020)
        is_current = random.choice([True, False])
        end_year = None if is_current else start_year + random.randint(2, 6)
        
        data = {
            "degree": random.choice(EducationFactory.DEGREES),
            "institution": fake.company() + " University",
            "field_of_study": random.choice(EducationFactory.FIELDS),
            "start_year": start_year,
            "end_year": end_year,
            "is_current": is_current,
            "gpa": round(random.uniform(2.5, 4.0), 2) if random.choice([True, False]) else None
        }
        
        if override:
            data.update(override)
        
        return data
    
    @staticmethod
    def build_batch(count: int, override: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Build multiple education data dictionaries."""
        return [EducationFactory.build(override) for _ in range(count)]


class CompanyFactory:
    """Factory for creating company test data."""
    
    COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]
    
    @staticmethod
    def build(override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build company data dictionary."""
        data = {
            "name": fake.company(),
            "description": fake.text(max_nb_chars=1000),
            "industry": random.choice(JobFactory.INDUSTRIES),
            "size": random.choice(CompanyFactory.COMPANY_SIZES),
            "location": f"{fake.city()}, {fake.state_abbr()}",
            "website": fake.url(),
            "founded_year": random.randint(1950, 2020),
            "is_verified": random.choice([True, False])
        }
        
        if override:
            data.update(override)
        
        return data


class TestScenarioFactory:
    """Factory for creating complete test scenarios."""
    
    @staticmethod
    def create_job_search_scenario() -> Dict[str, Any]:
        """Create a complete job search scenario with users, jobs, and applications."""
        # Create users
        users = UserFactory.build_batch(5)
        
        # Create jobs
        jobs = JobFactory.build_batch(10)
        
        # Create applications (some users apply to some jobs)
        applications = []
        for i, user in enumerate(users):
            user_id = f"user_{i}"
            # Each user applies to 1-3 jobs
            job_indices = random.sample(range(len(jobs)), k=random.randint(1, 3))
            for job_index in job_indices:
                job_id = f"job_{job_index}"
                applications.append(ApplicationFactory.build(user_id, job_id))
        
        return {
            "users": users,
            "jobs": jobs,
            "applications": applications
        }
    
    @staticmethod
    def create_user_profile_scenario() -> Dict[str, Any]:
        """Create a complete user profile scenario."""
        user = UserFactory.build()
        skills = SkillFactory.build_batch(8)
        experience = ExperienceFactory.build_batch(3)
        education = EducationFactory.build_batch(2)
        
        return {
            "user": user,
            "skills": skills,
            "experience": experience,
            "education": education
        }
    
    @staticmethod
    def create_performance_test_data(user_count: int = 100, job_count: int = 500) -> Dict[str, Any]:
        """Create large dataset for performance testing."""
        users = UserFactory.build_batch(user_count)
        jobs = JobFactory.build_batch(job_count)
        
        # Create realistic number of applications
        applications = []
        for i in range(user_count):
            user_id = f"user_{i}"
            # Each user applies to 1-5 jobs
            job_indices = random.sample(range(job_count), k=random.randint(1, 5))
            for job_index in job_indices:
                job_id = f"job_{job_index}"
                applications.append(ApplicationFactory.build(user_id, job_id))
        
        return {
            "users": users,
            "jobs": jobs,
            "applications": applications,
            "stats": {
                "user_count": user_count,
                "job_count": job_count,
                "application_count": len(applications)
            }
        }


# Utility functions for test data
def generate_realistic_email(first_name: str, last_name: str) -> str:
    """Generate realistic email address."""
    domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "company.com"]
    username = f"{first_name.lower()}.{last_name.lower()}"
    domain = random.choice(domains)
    return f"{username}@{domain}"


def generate_phone_number() -> str:
    """Generate realistic US phone number."""
    area_code = random.randint(200, 999)
    exchange = random.randint(200, 999)
    number = random.randint(1000, 9999)
    return f"+1-{area_code}-{exchange}-{number}"


def generate_salary_range(job_level: str) -> tuple[int, int]:
    """Generate realistic salary range based on job level."""
    salary_ranges = {
        "entry": (40000, 70000),
        "junior": (60000, 90000),
        "mid": (80000, 120000),
        "senior": (110000, 160000),
        "lead": (140000, 200000),
        "executive": (180000, 300000)
    }
    
    base_min, base_max = salary_ranges.get(job_level, (60000, 100000))
    salary_min = random.randint(base_min, base_min + 20000)
    salary_max = salary_min + random.randint(20000, 50000)
    
    return salary_min, salary_max
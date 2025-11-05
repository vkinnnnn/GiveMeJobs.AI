"""Job aggregation tasks for fetching and processing jobs from external APIs."""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin

import httpx
import structlog
from celery import Task
from celery.exceptions import Retry, MaxRetriesExceededError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery import celery_app
from app.core.config import get_settings
from app.core.database import get_async_session
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class BaseJobAggregationTask(Task):
    """Base task class with retry logic and error handling."""
    
    autoretry_for = (httpx.RequestError, httpx.TimeoutException)
    retry_kwargs = {'max_retries': 3, 'countdown': 60}
    retry_backoff = True
    retry_backoff_max = 600  # 10 minutes
    retry_jitter = True


@celery_app.task(bind=True, base=BaseJobAggregationTask, name="app.tasks.job_aggregation.aggregate_linkedin_jobs")
def aggregate_linkedin_jobs(self, batch_size: int = 100, location: str = "United States") -> Dict[str, Any]:
    """
    Aggregate jobs from LinkedIn API with retry logic and error handling.
    
    Args:
        batch_size: Number of jobs to fetch per request
        location: Location filter for job search
        
    Returns:
        Dict containing aggregation results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting LinkedIn job aggregation",
        task_id=task_id,
        batch_size=batch_size,
        location=location
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _aggregate_linkedin_jobs_async(task_id, batch_size, location)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "LinkedIn job aggregation completed",
            task_id=task_id,
            execution_time=execution_time,
            jobs_processed=result.get("jobs_processed", 0),
            jobs_saved=result.get("jobs_saved", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "LinkedIn job aggregation failed",
            task_id=task_id,
            error=str(exc),
            retry_count=self.request.retries
        )
        
        if self.request.retries < self.max_retries:
            countdown = min(60 * (2 ** self.request.retries), 600)  # Exponential backoff
            logger.info(f"Retrying LinkedIn job aggregation in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        
        raise MaxRetriesExceededError(f"LinkedIn job aggregation failed after {self.max_retries} retries: {exc}")


@celery_app.task(bind=True, base=BaseJobAggregationTask, name="app.tasks.job_aggregation.aggregate_indeed_jobs")
def aggregate_indeed_jobs(self, batch_size: int = 100, location: str = "United States") -> Dict[str, Any]:
    """
    Aggregate jobs from Indeed API with retry logic and error handling.
    
    Args:
        batch_size: Number of jobs to fetch per request
        location: Location filter for job search
        
    Returns:
        Dict containing aggregation results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting Indeed job aggregation",
        task_id=task_id,
        batch_size=batch_size,
        location=location
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _aggregate_indeed_jobs_async(task_id, batch_size, location)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "Indeed job aggregation completed",
            task_id=task_id,
            execution_time=execution_time,
            jobs_processed=result.get("jobs_processed", 0),
            jobs_saved=result.get("jobs_saved", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "Indeed job aggregation failed",
            task_id=task_id,
            error=str(exc),
            retry_count=self.request.retries
        )
        
        if self.request.retries < self.max_retries:
            countdown = min(60 * (2 ** self.request.retries), 600)  # Exponential backoff
            logger.info(f"Retrying Indeed job aggregation in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        
        raise MaxRetriesExceededError(f"Indeed job aggregation failed after {self.max_retries} retries: {exc}")


@celery_app.task(bind=True, base=BaseJobAggregationTask, name="app.tasks.job_aggregation.aggregate_glassdoor_jobs")
def aggregate_glassdoor_jobs(self, batch_size: int = 100, location: str = "United States") -> Dict[str, Any]:
    """
    Aggregate jobs from Glassdoor API with retry logic and error handling.
    
    Args:
        batch_size: Number of jobs to fetch per request
        location: Location filter for job search
        
    Returns:
        Dict containing aggregation results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting Glassdoor job aggregation",
        task_id=task_id,
        batch_size=batch_size,
        location=location
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _aggregate_glassdoor_jobs_async(task_id, batch_size, location)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "Glassdoor job aggregation completed",
            task_id=task_id,
            execution_time=execution_time,
            jobs_processed=result.get("jobs_processed", 0),
            jobs_saved=result.get("jobs_saved", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "Glassdoor job aggregation failed",
            task_id=task_id,
            error=str(exc),
            retry_count=self.request.retries
        )
        
        if self.request.retries < self.max_retries:
            countdown = min(60 * (2 ** self.request.retries), 600)  # Exponential backoff
            logger.info(f"Retrying Glassdoor job aggregation in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        
        raise MaxRetriesExceededError(f"Glassdoor job aggregation failed after {self.max_retries} retries: {exc}")


@celery_app.task(bind=True, name="app.tasks.job_aggregation.normalize_and_deduplicate_jobs")
def normalize_and_deduplicate_jobs(self, hours_back: int = 24) -> Dict[str, Any]:
    """
    Normalize and deduplicate jobs from the last N hours.
    
    Args:
        hours_back: Number of hours to look back for jobs to process
        
    Returns:
        Dict containing processing results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting job normalization and deduplication",
        task_id=task_id,
        hours_back=hours_back
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _normalize_and_deduplicate_jobs_async(task_id, hours_back)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "Job normalization and deduplication completed",
            task_id=task_id,
            execution_time=execution_time,
            jobs_processed=result.get("jobs_processed", 0),
            duplicates_removed=result.get("duplicates_removed", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "Job normalization and deduplication failed",
            task_id=task_id,
            error=str(exc)
        )
        raise


# Async helper functions

async def _aggregate_linkedin_jobs_async(task_id: str, batch_size: int, location: str) -> Dict[str, Any]:
    """Async implementation of LinkedIn job aggregation."""
    jobs_processed = 0
    jobs_saved = 0
    errors = []
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Mock LinkedIn API call (replace with actual API integration)
            # In production, this would use LinkedIn's Job Search API
            response = await client.get(
                "https://api.linkedin.com/v2/jobSearch",
                headers={
                    "Authorization": f"Bearer {settings.linkedin_api_key}",
                    "Content-Type": "application/json"
                },
                params={
                    "location": location,
                    "count": batch_size,
                    "start": 0
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                jobs = data.get("elements", [])
                
                async with get_async_session() as session:
                    for job in jobs:
                        try:
                            normalized_job = _normalize_linkedin_job(job)
                            await _save_job_to_database(session, normalized_job, "linkedin")
                            jobs_saved += 1
                        except Exception as e:
                            errors.append(f"Error processing job {job.get('id', 'unknown')}: {str(e)}")
                        
                        jobs_processed += 1
                    
                    await session.commit()
            else:
                raise httpx.HTTPStatusError(f"LinkedIn API returned status {response.status_code}", request=response.request, response=response)
                
        except httpx.RequestError as e:
            logger.error(f"LinkedIn API request failed: {str(e)}")
            raise
    
    return {
        "source": "linkedin",
        "jobs_processed": jobs_processed,
        "jobs_saved": jobs_saved,
        "errors": errors,
        "error_count": len(errors)
    }


async def _aggregate_indeed_jobs_async(task_id: str, batch_size: int, location: str) -> Dict[str, Any]:
    """Async implementation of Indeed job aggregation."""
    jobs_processed = 0
    jobs_saved = 0
    errors = []
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Mock Indeed API call (replace with actual API integration)
            # In production, this would use Indeed's Job Search API
            response = await client.get(
                "https://api.indeed.com/ads/apisearch",
                params={
                    "publisher": settings.indeed_publisher_id,
                    "q": "",  # All jobs
                    "l": location,
                    "limit": batch_size,
                    "format": "json",
                    "v": "2"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                jobs = data.get("results", [])
                
                async with get_async_session() as session:
                    for job in jobs:
                        try:
                            normalized_job = _normalize_indeed_job(job)
                            await _save_job_to_database(session, normalized_job, "indeed")
                            jobs_saved += 1
                        except Exception as e:
                            errors.append(f"Error processing job {job.get('jobkey', 'unknown')}: {str(e)}")
                        
                        jobs_processed += 1
                    
                    await session.commit()
            else:
                raise httpx.HTTPStatusError(f"Indeed API returned status {response.status_code}", request=response.request, response=response)
                
        except httpx.RequestError as e:
            logger.error(f"Indeed API request failed: {str(e)}")
            raise
    
    return {
        "source": "indeed",
        "jobs_processed": jobs_processed,
        "jobs_saved": jobs_saved,
        "errors": errors,
        "error_count": len(errors)
    }


async def _aggregate_glassdoor_jobs_async(task_id: str, batch_size: int, location: str) -> Dict[str, Any]:
    """Async implementation of Glassdoor job aggregation."""
    jobs_processed = 0
    jobs_saved = 0
    errors = []
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Mock Glassdoor API call (replace with actual API integration)
            # In production, this would use Glassdoor's Job Search API
            response = await client.get(
                "https://api.glassdoor.com/api/api.htm",
                params={
                    "t.p": settings.glassdoor_partner_id,
                    "t.k": settings.glassdoor_api_key,
                    "action": "jobs",
                    "l": location,
                    "pn": 1,
                    "ps": batch_size,
                    "format": "json",
                    "v": "1"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                jobs = data.get("response", {}).get("jobs", [])
                
                async with get_async_session() as session:
                    for job in jobs:
                        try:
                            normalized_job = _normalize_glassdoor_job(job)
                            await _save_job_to_database(session, normalized_job, "glassdoor")
                            jobs_saved += 1
                        except Exception as e:
                            errors.append(f"Error processing job {job.get('jobId', 'unknown')}: {str(e)}")
                        
                        jobs_processed += 1
                    
                    await session.commit()
            else:
                raise httpx.HTTPStatusError(f"Glassdoor API returned status {response.status_code}", request=response.request, response=response)
                
        except httpx.RequestError as e:
            logger.error(f"Glassdoor API request failed: {str(e)}")
            raise
    
    return {
        "source": "glassdoor",
        "jobs_processed": jobs_processed,
        "jobs_saved": jobs_saved,
        "errors": errors,
        "error_count": len(errors)
    }


async def _normalize_and_deduplicate_jobs_async(task_id: str, hours_back: int) -> Dict[str, Any]:
    """Async implementation of job normalization and deduplication."""
    jobs_processed = 0
    duplicates_removed = 0
    
    cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
    
    async with get_async_session() as session:
        # Get jobs from the last N hours
        query = text("""
            SELECT id, title, company, location, description, source, external_id, created_at
            FROM jobs 
            WHERE created_at >= :cutoff_time 
            AND processed = false
            ORDER BY created_at DESC
        """)
        
        result = await session.execute(query, {"cutoff_time": cutoff_time})
        jobs = result.fetchall()
        
        # Group jobs by potential duplicates (same title + company + location)
        job_groups = {}
        for job in jobs:
            key = f"{job.title.lower().strip()}|{job.company.lower().strip()}|{job.location.lower().strip()}"
            if key not in job_groups:
                job_groups[key] = []
            job_groups[key].append(job)
        
        # Process each group
        for group_key, job_group in job_groups.items():
            jobs_processed += len(job_group)
            
            if len(job_group) > 1:
                # Keep the most recent job, mark others as duplicates
                job_group.sort(key=lambda x: x.created_at, reverse=True)
                primary_job = job_group[0]
                duplicate_jobs = job_group[1:]
                
                # Mark duplicates
                for dup_job in duplicate_jobs:
                    await session.execute(
                        text("UPDATE jobs SET is_duplicate = true, duplicate_of = :primary_id WHERE id = :job_id"),
                        {"primary_id": primary_job.id, "job_id": dup_job.id}
                    )
                    duplicates_removed += 1
                
                # Mark primary job as processed
                await session.execute(
                    text("UPDATE jobs SET processed = true WHERE id = :job_id"),
                    {"job_id": primary_job.id}
                )
            else:
                # Single job, just mark as processed
                await session.execute(
                    text("UPDATE jobs SET processed = true WHERE id = :job_id"),
                    {"job_id": job_group[0].id}
                )
        
        await session.commit()
    
    return {
        "jobs_processed": jobs_processed,
        "duplicates_removed": duplicates_removed,
        "unique_jobs": jobs_processed - duplicates_removed
    }


# Job normalization functions

def _normalize_linkedin_job(job_data: Dict) -> Dict:
    """Normalize LinkedIn job data to standard format."""
    return {
        "external_id": job_data.get("id"),
        "title": job_data.get("title", "").strip(),
        "company": job_data.get("companyName", "").strip(),
        "location": job_data.get("location", "").strip(),
        "description": job_data.get("description", "").strip(),
        "salary_min": job_data.get("salaryRange", {}).get("min"),
        "salary_max": job_data.get("salaryRange", {}).get("max"),
        "employment_type": job_data.get("employmentType", "").lower(),
        "remote_type": job_data.get("workplaceType", "").lower(),
        "posted_date": job_data.get("listedAt"),
        "url": job_data.get("jobPostingUrl"),
        "source": "linkedin",
        "raw_data": json.dumps(job_data)
    }


def _normalize_indeed_job(job_data: Dict) -> Dict:
    """Normalize Indeed job data to standard format."""
    return {
        "external_id": job_data.get("jobkey"),
        "title": job_data.get("jobtitle", "").strip(),
        "company": job_data.get("company", "").strip(),
        "location": f"{job_data.get('city', '')}, {job_data.get('state', '')}".strip(", "),
        "description": job_data.get("snippet", "").strip(),
        "salary_min": None,  # Indeed doesn't always provide salary in API
        "salary_max": None,
        "employment_type": "full_time",  # Default for Indeed
        "remote_type": "onsite",  # Default, would need to parse from description
        "posted_date": job_data.get("date"),
        "url": job_data.get("url"),
        "source": "indeed",
        "raw_data": json.dumps(job_data)
    }


def _normalize_glassdoor_job(job_data: Dict) -> Dict:
    """Normalize Glassdoor job data to standard format."""
    return {
        "external_id": str(job_data.get("jobId")),
        "title": job_data.get("jobTitle", "").strip(),
        "company": job_data.get("employer", "").strip(),
        "location": job_data.get("location", "").strip(),
        "description": job_data.get("jobDescription", "").strip(),
        "salary_min": job_data.get("salaryRange", {}).get("min"),
        "salary_max": job_data.get("salaryRange", {}).get("max"),
        "employment_type": "full_time",  # Default for Glassdoor
        "remote_type": "onsite",  # Default, would need to parse from description
        "posted_date": job_data.get("ageInDays"),
        "url": job_data.get("jobUrl"),
        "source": "glassdoor",
        "raw_data": json.dumps(job_data)
    }


async def _save_job_to_database(session: AsyncSession, job_data: Dict, source: str) -> None:
    """Save normalized job data to database."""
    # Check if job already exists
    existing_job_query = text("""
        SELECT id FROM jobs 
        WHERE external_id = :external_id AND source = :source
    """)
    
    result = await session.execute(
        existing_job_query, 
        {"external_id": job_data["external_id"], "source": source}
    )
    
    if result.fetchone():
        # Job already exists, skip
        return
    
    # Insert new job
    insert_query = text("""
        INSERT INTO jobs (
            external_id, title, company, location, description,
            salary_min, salary_max, employment_type, remote_type,
            posted_date, url, source, raw_data, created_at, processed
        ) VALUES (
            :external_id, :title, :company, :location, :description,
            :salary_min, :salary_max, :employment_type, :remote_type,
            :posted_date, :url, :source, :raw_data, :created_at, :processed
        )
    """)
    
    await session.execute(insert_query, {
        **job_data,
        "created_at": datetime.utcnow(),
        "processed": False
    })
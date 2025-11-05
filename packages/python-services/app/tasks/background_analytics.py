"""Background analytics tasks for user analytics, skill scores, and data cleanup."""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import pandas as pd
import numpy as np
import structlog
from celery import Task
from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery import celery_app
from app.core.config import get_settings
from app.core.database import get_async_session
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class BaseAnalyticsTask(Task):
    """Base task class for analytics processing."""
    
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 2, 'countdown': 120}
    retry_backoff = True
    retry_backoff_max = 300  # 5 minutes
    retry_jitter = True


@celery_app.task(bind=True, base=BaseAnalyticsTask, name="app.tasks.background_analytics.calculate_user_analytics_batch")
def calculate_user_analytics_batch(self, batch_size: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Calculate analytics for a batch of users.
    
    Args:
        batch_size: Number of users to process in this batch
        offset: Offset for pagination
        
    Returns:
        Dict containing processing results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting user analytics batch calculation",
        task_id=task_id,
        batch_size=batch_size,
        offset=offset
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _calculate_user_analytics_batch_async(task_id, batch_size, offset)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "User analytics batch calculation completed",
            task_id=task_id,
            execution_time=execution_time,
            users_processed=result.get("users_processed", 0),
            analytics_updated=result.get("analytics_updated", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "User analytics batch calculation failed",
            task_id=task_id,
            error=str(exc),
            retry_count=self.request.retries
        )
        
        if self.request.retries < self.max_retries:
            countdown = min(120 * (2 ** self.request.retries), 300)  # Exponential backoff
            logger.info(f"Retrying user analytics calculation in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        
        raise MaxRetriesExceededError(f"User analytics calculation failed after {self.max_retries} retries: {exc}")


@celery_app.task(bind=True, base=BaseAnalyticsTask, name="app.tasks.background_analytics.update_skill_scores_batch")
def update_skill_scores_batch(self, batch_size: int = 50, offset: int = 0) -> Dict[str, Any]:
    """
    Update skill scores for a batch of users based on their applications and profile data.
    
    Args:
        batch_size: Number of users to process in this batch
        offset: Offset for pagination
        
    Returns:
        Dict containing processing results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting skill scores batch update",
        task_id=task_id,
        batch_size=batch_size,
        offset=offset
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _update_skill_scores_batch_async(task_id, batch_size, offset)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "Skill scores batch update completed",
            task_id=task_id,
            execution_time=execution_time,
            users_processed=result.get("users_processed", 0),
            skill_scores_updated=result.get("skill_scores_updated", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "Skill scores batch update failed",
            task_id=task_id,
            error=str(exc),
            retry_count=self.request.retries
        )
        
        if self.request.retries < self.max_retries:
            countdown = min(120 * (2 ** self.request.retries), 300)  # Exponential backoff
            logger.info(f"Retrying skill scores update in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        
        raise MaxRetriesExceededError(f"Skill scores update failed after {self.max_retries} retries: {exc}")


@celery_app.task(bind=True, base=BaseAnalyticsTask, name="app.tasks.background_analytics.calculate_job_match_scores_batch")
def calculate_job_match_scores_batch(self, batch_size: int = 200, hours_back: int = 24) -> Dict[str, Any]:
    """
    Calculate job match scores for recent jobs against all active users.
    
    Args:
        batch_size: Number of jobs to process in this batch
        hours_back: Number of hours to look back for new jobs
        
    Returns:
        Dict containing processing results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting job match scores batch calculation",
        task_id=task_id,
        batch_size=batch_size,
        hours_back=hours_back
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _calculate_job_match_scores_batch_async(task_id, batch_size, hours_back)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "Job match scores batch calculation completed",
            task_id=task_id,
            execution_time=execution_time,
            jobs_processed=result.get("jobs_processed", 0),
            match_scores_calculated=result.get("match_scores_calculated", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "Job match scores batch calculation failed",
            task_id=task_id,
            error=str(exc),
            retry_count=self.request.retries
        )
        
        if self.request.retries < self.max_retries:
            countdown = min(120 * (2 ** self.request.retries), 300)  # Exponential backoff
            logger.info(f"Retrying job match scores calculation in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        
        raise MaxRetriesExceededError(f"Job match scores calculation failed after {self.max_retries} retries: {exc}")


@celery_app.task(bind=True, name="app.tasks.background_analytics.cleanup_expired_data")
def cleanup_expired_data(self, days_to_keep: int = 90) -> Dict[str, Any]:
    """
    Clean up expired data including old job applications, analytics records, and temporary data.
    
    Args:
        days_to_keep: Number of days of data to retain
        
    Returns:
        Dict containing cleanup results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting expired data cleanup",
        task_id=task_id,
        days_to_keep=days_to_keep
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _cleanup_expired_data_async(task_id, days_to_keep)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "Expired data cleanup completed",
            task_id=task_id,
            execution_time=execution_time,
            records_cleaned=result.get("total_records_cleaned", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "Expired data cleanup failed",
            task_id=task_id,
            error=str(exc)
        )
        raise


@celery_app.task(bind=True, name="app.tasks.background_analytics.archive_old_jobs")
def archive_old_jobs(self, days_to_keep: int = 30) -> Dict[str, Any]:
    """
    Archive old job postings that are no longer active.
    
    Args:
        days_to_keep: Number of days to keep active jobs
        
    Returns:
        Dict containing archival results and statistics
    """
    start_time = time.time()
    task_id = self.request.id
    
    logger.info(
        "Starting old jobs archival",
        task_id=task_id,
        days_to_keep=days_to_keep
    )
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                _archive_old_jobs_async(task_id, days_to_keep)
            )
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        logger.info(
            "Old jobs archival completed",
            task_id=task_id,
            execution_time=execution_time,
            jobs_archived=result.get("jobs_archived", 0)
        )
        
        return {
            **result,
            "execution_time": execution_time,
            "task_id": task_id
        }
        
    except Exception as exc:
        logger.error(
            "Old jobs archival failed",
            task_id=task_id,
            error=str(exc)
        )
        raise


# Async helper functions

async def _calculate_user_analytics_batch_async(task_id: str, batch_size: int, offset: int) -> Dict[str, Any]:
    """Async implementation of user analytics batch calculation."""
    users_processed = 0
    analytics_updated = 0
    errors = []
    
    async with get_async_session() as session:
        # Get batch of users
        users_query = text("""
            SELECT id, email, created_at, last_login_at
            FROM users 
            WHERE active = true
            ORDER BY id
            LIMIT :batch_size OFFSET :offset
        """)
        
        result = await session.execute(users_query, {"batch_size": batch_size, "offset": offset})
        users = result.fetchall()
        
        for user in users:
            try:
                # Calculate analytics for this user
                analytics_data = await _calculate_user_analytics(session, user.id)
                
                # Update or insert analytics record
                await _upsert_user_analytics(session, user.id, analytics_data)
                
                analytics_updated += 1
            except Exception as e:
                errors.append(f"Error processing user {user.id}: {str(e)}")
            
            users_processed += 1
        
        await session.commit()
    
    return {
        "users_processed": users_processed,
        "analytics_updated": analytics_updated,
        "errors": errors,
        "error_count": len(errors)
    }


async def _update_skill_scores_batch_async(task_id: str, batch_size: int, offset: int) -> Dict[str, Any]:
    """Async implementation of skill scores batch update."""
    users_processed = 0
    skill_scores_updated = 0
    errors = []
    
    async with get_async_session() as session:
        # Get batch of users with their skills
        users_query = text("""
            SELECT u.id, u.email, us.skill_name, us.proficiency_level, us.years_experience
            FROM users u
            LEFT JOIN user_skills us ON u.id = us.user_id
            WHERE u.active = true
            ORDER BY u.id
            LIMIT :batch_size OFFSET :offset
        """)
        
        result = await session.execute(users_query, {"batch_size": batch_size, "offset": offset})
        user_skills = result.fetchall()
        
        # Group by user
        users_dict = {}
        for row in user_skills:
            if row.id not in users_dict:
                users_dict[row.id] = {"email": row.email, "skills": []}
            
            if row.skill_name:
                users_dict[row.id]["skills"].append({
                    "skill_name": row.skill_name,
                    "proficiency_level": row.proficiency_level,
                    "years_experience": row.years_experience
                })
        
        for user_id, user_data in users_dict.items():
            try:
                # Calculate skill scores based on applications and market demand
                skill_scores = await _calculate_skill_scores(session, user_id, user_data["skills"])
                
                # Update skill scores in database
                for skill_name, score_data in skill_scores.items():
                    await _update_skill_score(session, user_id, skill_name, score_data)
                    skill_scores_updated += 1
                
            except Exception as e:
                errors.append(f"Error processing user {user_id}: {str(e)}")
            
            users_processed += 1
        
        await session.commit()
    
    return {
        "users_processed": users_processed,
        "skill_scores_updated": skill_scores_updated,
        "errors": errors,
        "error_count": len(errors)
    }


async def _calculate_job_match_scores_batch_async(task_id: str, batch_size: int, hours_back: int) -> Dict[str, Any]:
    """Async implementation of job match scores batch calculation."""
    jobs_processed = 0
    match_scores_calculated = 0
    errors = []
    
    cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
    
    async with get_async_session() as session:
        # Get recent jobs
        jobs_query = text("""
            SELECT id, title, company, location, description, required_skills, salary_min, salary_max
            FROM jobs 
            WHERE created_at >= :cutoff_time 
            AND is_duplicate = false
            AND archived = false
            ORDER BY created_at DESC
            LIMIT :batch_size
        """)
        
        result = await session.execute(jobs_query, {"cutoff_time": cutoff_time, "batch_size": batch_size})
        jobs = result.fetchall()
        
        # Get all active users
        users_query = text("""
            SELECT id, preferred_locations, salary_expectation_min, salary_expectation_max
            FROM users 
            WHERE active = true
        """)
        
        users_result = await session.execute(users_query)
        users = users_result.fetchall()
        
        for job in jobs:
            try:
                for user in users:
                    # Calculate match score between job and user
                    match_score = await _calculate_job_user_match_score(session, job, user)
                    
                    if match_score > 0.3:  # Only store meaningful matches
                        await _store_job_match_score(session, job.id, user.id, match_score)
                        match_scores_calculated += 1
                
            except Exception as e:
                errors.append(f"Error processing job {job.id}: {str(e)}")
            
            jobs_processed += 1
        
        await session.commit()
    
    return {
        "jobs_processed": jobs_processed,
        "match_scores_calculated": match_scores_calculated,
        "errors": errors,
        "error_count": len(errors)
    }


async def _cleanup_expired_data_async(task_id: str, days_to_keep: int) -> Dict[str, Any]:
    """Async implementation of expired data cleanup."""
    cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
    
    cleanup_results = {
        "old_applications_cleaned": 0,
        "old_analytics_cleaned": 0,
        "old_logs_cleaned": 0,
        "temp_files_cleaned": 0,
        "total_records_cleaned": 0
    }
    
    async with get_async_session() as session:
        # Clean up old job applications that were rejected or expired
        old_apps_query = text("""
            DELETE FROM job_applications 
            WHERE status IN ('rejected', 'expired', 'withdrawn') 
            AND updated_at < :cutoff_date
        """)
        
        result = await session.execute(old_apps_query, {"cutoff_date": cutoff_date})
        cleanup_results["old_applications_cleaned"] = result.rowcount
        
        # Clean up old analytics records (keep aggregated data)
        old_analytics_query = text("""
            DELETE FROM user_analytics_daily 
            WHERE date < :cutoff_date
        """)
        
        result = await session.execute(old_analytics_query, {"cutoff_date": cutoff_date})
        cleanup_results["old_analytics_cleaned"] = result.rowcount
        
        # Clean up old system logs
        old_logs_query = text("""
            DELETE FROM system_logs 
            WHERE created_at < :cutoff_date 
            AND level NOT IN ('ERROR', 'CRITICAL')
        """)
        
        result = await session.execute(old_logs_query, {"cutoff_date": cutoff_date})
        cleanup_results["old_logs_cleaned"] = result.rowcount
        
        # Clean up temporary data
        temp_data_query = text("""
            DELETE FROM temp_processing_data 
            WHERE created_at < :cutoff_date
        """)
        
        result = await session.execute(temp_data_query, {"cutoff_date": cutoff_date})
        cleanup_results["temp_files_cleaned"] = result.rowcount
        
        await session.commit()
    
    cleanup_results["total_records_cleaned"] = sum(cleanup_results.values()) - cleanup_results["total_records_cleaned"]
    
    return cleanup_results


async def _archive_old_jobs_async(task_id: str, days_to_keep: int) -> Dict[str, Any]:
    """Async implementation of old jobs archival."""
    cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
    jobs_archived = 0
    
    async with get_async_session() as session:
        # Archive old jobs
        archive_query = text("""
            UPDATE jobs 
            SET archived = true, archived_at = :archive_time
            WHERE created_at < :cutoff_date 
            AND archived = false
            AND is_duplicate = false
        """)
        
        result = await session.execute(archive_query, {
            "cutoff_date": cutoff_date,
            "archive_time": datetime.utcnow()
        })
        
        jobs_archived = result.rowcount
        
        await session.commit()
    
    return {
        "jobs_archived": jobs_archived,
        "cutoff_date": cutoff_date.isoformat()
    }


# Helper functions for analytics calculations

async def _calculate_user_analytics(session: AsyncSession, user_id: str) -> Dict[str, Any]:
    """Calculate comprehensive analytics for a user."""
    # Get user's application data
    apps_query = text("""
        SELECT status, created_at, updated_at, job_id
        FROM job_applications 
        WHERE user_id = :user_id
        AND created_at >= :thirty_days_ago
    """)
    
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    result = await session.execute(apps_query, {"user_id": user_id, "thirty_days_ago": thirty_days_ago})
    applications = result.fetchall()
    
    if not applications:
        return {
            "total_applications": 0,
            "response_rate": 0.0,
            "interview_rate": 0.0,
            "offer_rate": 0.0,
            "avg_response_time": 0.0
        }
    
    # Calculate metrics
    total_apps = len(applications)
    responses = [app for app in applications if app.status in ['interview_scheduled', 'offer_received', 'accepted']]
    interviews = [app for app in applications if app.status in ['interview_scheduled', 'interview_completed', 'offer_received', 'accepted']]
    offers = [app for app in applications if app.status in ['offer_received', 'accepted']]
    
    response_rate = len(responses) / total_apps if total_apps > 0 else 0
    interview_rate = len(interviews) / total_apps if total_apps > 0 else 0
    offer_rate = len(offers) / total_apps if total_apps > 0 else 0
    
    # Calculate average response time
    response_times = []
    for app in responses:
        if app.updated_at and app.created_at:
            response_time = (app.updated_at - app.created_at).total_seconds() / 86400  # days
            response_times.append(response_time)
    
    avg_response_time = np.mean(response_times) if response_times else 0
    
    return {
        "total_applications": total_apps,
        "response_rate": round(response_rate * 100, 2),
        "interview_rate": round(interview_rate * 100, 2),
        "offer_rate": round(offer_rate * 100, 2),
        "avg_response_time": round(avg_response_time, 1)
    }


async def _upsert_user_analytics(session: AsyncSession, user_id: str, analytics_data: Dict[str, Any]) -> None:
    """Insert or update user analytics record."""
    upsert_query = text("""
        INSERT INTO user_analytics (
            user_id, total_applications, response_rate, interview_rate, 
            offer_rate, avg_response_time, calculated_at
        ) VALUES (
            :user_id, :total_applications, :response_rate, :interview_rate,
            :offer_rate, :avg_response_time, :calculated_at
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_applications = EXCLUDED.total_applications,
            response_rate = EXCLUDED.response_rate,
            interview_rate = EXCLUDED.interview_rate,
            offer_rate = EXCLUDED.offer_rate,
            avg_response_time = EXCLUDED.avg_response_time,
            calculated_at = EXCLUDED.calculated_at
    """)
    
    await session.execute(upsert_query, {
        "user_id": user_id,
        "calculated_at": datetime.utcnow(),
        **analytics_data
    })


async def _calculate_skill_scores(session: AsyncSession, user_id: str, skills: List[Dict]) -> Dict[str, Dict]:
    """Calculate skill scores based on market demand and user proficiency."""
    skill_scores = {}
    
    for skill in skills:
        skill_name = skill["skill_name"]
        proficiency = skill["proficiency_level"]
        experience_years = skill["years_experience"] or 0
        
        # Get market demand for this skill (count of jobs requiring it)
        demand_query = text("""
            SELECT COUNT(*) as demand_count
            FROM jobs 
            WHERE required_skills ILIKE :skill_pattern
            AND created_at >= :thirty_days_ago
            AND archived = false
        """)
        
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        result = await session.execute(demand_query, {
            "skill_pattern": f"%{skill_name}%",
            "thirty_days_ago": thirty_days_ago
        })
        
        demand_count = result.scalar() or 0
        
        # Calculate base score from proficiency and experience
        proficiency_score = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}.get(proficiency, 1)
        experience_score = min(experience_years / 5, 2)  # Max 2 points for 5+ years
        
        # Market demand multiplier
        demand_multiplier = min(demand_count / 10, 2)  # Max 2x multiplier
        
        # Final score (0-10 scale)
        final_score = min((proficiency_score + experience_score) * (1 + demand_multiplier), 10)
        
        skill_scores[skill_name] = {
            "score": round(final_score, 2),
            "market_demand": demand_count,
            "proficiency_level": proficiency,
            "experience_years": experience_years
        }
    
    return skill_scores


async def _update_skill_score(session: AsyncSession, user_id: str, skill_name: str, score_data: Dict) -> None:
    """Update skill score in database."""
    update_query = text("""
        UPDATE user_skills 
        SET 
            market_score = :score,
            market_demand = :market_demand,
            updated_at = :updated_at
        WHERE user_id = :user_id AND skill_name = :skill_name
    """)
    
    await session.execute(update_query, {
        "user_id": user_id,
        "skill_name": skill_name,
        "score": score_data["score"],
        "market_demand": score_data["market_demand"],
        "updated_at": datetime.utcnow()
    })


async def _calculate_job_user_match_score(session: AsyncSession, job, user) -> float:
    """Calculate match score between a job and user."""
    score = 0.0
    
    # Location matching (30% weight)
    if user.preferred_locations:
        user_locations = user.preferred_locations.split(",")
        if any(loc.strip().lower() in job.location.lower() for loc in user_locations):
            score += 0.3
    
    # Salary matching (20% weight)
    if job.salary_min and job.salary_max and user.salary_expectation_min:
        if job.salary_max >= user.salary_expectation_min:
            salary_match = min(job.salary_max / user.salary_expectation_min, 1.5) / 1.5
            score += 0.2 * salary_match
    
    # Skill matching (50% weight) - simplified version
    if job.required_skills:
        # Get user skills
        skills_query = text("""
            SELECT skill_name, proficiency_level 
            FROM user_skills 
            WHERE user_id = :user_id
        """)
        
        result = await session.execute(skills_query, {"user_id": user.id})
        user_skills = {row.skill_name.lower(): row.proficiency_level for row in result.fetchall()}
        
        required_skills = [skill.strip().lower() for skill in job.required_skills.split(",")]
        matched_skills = 0
        
        for req_skill in required_skills:
            if req_skill in user_skills:
                matched_skills += 1
        
        if required_skills:
            skill_match_ratio = matched_skills / len(required_skills)
            score += 0.5 * skill_match_ratio
    
    return min(score, 1.0)


async def _store_job_match_score(session: AsyncSession, job_id: str, user_id: str, match_score: float) -> None:
    """Store job match score in database."""
    upsert_query = text("""
        INSERT INTO job_match_scores (job_id, user_id, match_score, calculated_at)
        VALUES (:job_id, :user_id, :match_score, :calculated_at)
        ON CONFLICT (job_id, user_id) DO UPDATE SET
            match_score = EXCLUDED.match_score,
            calculated_at = EXCLUDED.calculated_at
    """)
    
    await session.execute(upsert_query, {
        "job_id": job_id,
        "user_id": user_id,
        "match_score": match_score,
        "calculated_at": datetime.utcnow()
    })
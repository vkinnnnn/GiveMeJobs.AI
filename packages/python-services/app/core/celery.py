"""Enhanced Celery configuration for background task processing with priority queues and auto-scaling."""

import os
from celery import Celery
from celery.signals import worker_ready, worker_shutting_down
from kombu import Queue, Exchange

from .config import get_settings
from .logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

# Define exchanges and queues with priority support
default_exchange = Exchange('default', type='direct')
priority_exchange = Exchange('priority', type='direct')

# Create Celery instance with enhanced configuration
celery_app = Celery(
    "givemejobs-python-services",
    broker=settings.celery.broker_url,
    backend=settings.celery.result_backend,
    include=[
        "app.services.document_processing.tasks",
        "app.services.semantic_search.tasks",
        "app.services.analytics.tasks",
        "app.tasks.job_aggregation",
        "app.tasks.background_analytics",
    ]
)

# Enhanced Celery configuration with priority queues and auto-scaling
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    
    # Timezone
    timezone="UTC",
    enable_utc=True,
    
    # Task tracking and limits
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Worker configuration for auto-scaling
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    worker_enable_remote_control=True,
    
    # Result backend
    result_expires=3600,  # 1 hour
    result_persistent=True,
    
    # Queue definitions with priority support
    task_queues=(
        # High priority queue for real-time tasks
        Queue('high_priority', 
              exchange=priority_exchange, 
              routing_key='high_priority',
              queue_arguments={'x-max-priority': 10}),
        
        # Document processing queue
        Queue('document_processing', 
              exchange=default_exchange, 
              routing_key='document_processing',
              queue_arguments={'x-max-priority': 5}),
        
        # Semantic search queue
        Queue('semantic_search', 
              exchange=default_exchange, 
              routing_key='semantic_search',
              queue_arguments={'x-max-priority': 5}),
        
        # Analytics queue
        Queue('analytics', 
              exchange=default_exchange, 
              routing_key='analytics',
              queue_arguments={'x-max-priority': 3}),
        
        # Job aggregation queue
        Queue('job_aggregation', 
              exchange=default_exchange, 
              routing_key='job_aggregation',
              queue_arguments={'x-max-priority': 4}),
        
        # Background processing queue
        Queue('background', 
              exchange=default_exchange, 
              routing_key='background',
              queue_arguments={'x-max-priority': 1}),
        
        # Default queue
        Queue('default', 
              exchange=default_exchange, 
              routing_key='default',
              queue_arguments={'x-max-priority': 2}),
    ),
    
    # Task routing with priority
    task_routes={
        # High priority tasks
        'app.services.document_processing.tasks.generate_resume_urgent': {
            'queue': 'high_priority',
            'priority': 10
        },
        'app.services.semantic_search.tasks.find_matching_jobs_urgent': {
            'queue': 'high_priority',
            'priority': 10
        },
        
        # Document processing tasks
        'app.services.document_processing.tasks.*': {
            'queue': 'document_processing',
            'priority': 5
        },
        
        # Semantic search tasks
        'app.services.semantic_search.tasks.*': {
            'queue': 'semantic_search',
            'priority': 5
        },
        
        # Analytics tasks
        'app.services.analytics.tasks.*': {
            'queue': 'analytics',
            'priority': 3
        },
        
        # Job aggregation tasks
        'app.tasks.job_aggregation.*': {
            'queue': 'job_aggregation',
            'priority': 4
        },
        
        # Background analytics tasks
        'app.tasks.background_analytics.*': {
            'queue': 'background',
            'priority': 1
        },
    },
    
    # Default queue settings
    task_default_queue="default",
    task_default_exchange="default",
    task_default_exchange_type="direct",
    task_default_routing_key="default",
    task_default_priority=2,
    
    # Retry configuration
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Monitoring and logging
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Security
    worker_hijack_root_logger=False,
    worker_log_color=False,
)

# Enhanced beat schedule for periodic tasks with job aggregation
celery_app.conf.beat_schedule = {
    # Job aggregation tasks
    "aggregate-linkedin-jobs": {
        "task": "app.tasks.job_aggregation.aggregate_linkedin_jobs",
        "schedule": 1800.0,  # Every 30 minutes
        "options": {"queue": "job_aggregation", "priority": 4}
    },
    "aggregate-indeed-jobs": {
        "task": "app.tasks.job_aggregation.aggregate_indeed_jobs",
        "schedule": 2100.0,  # Every 35 minutes (offset from LinkedIn)
        "options": {"queue": "job_aggregation", "priority": 4}
    },
    "aggregate-glassdoor-jobs": {
        "task": "app.tasks.job_aggregation.aggregate_glassdoor_jobs",
        "schedule": 2400.0,  # Every 40 minutes (offset from others)
        "options": {"queue": "job_aggregation", "priority": 4}
    },
    
    # Data processing tasks
    "normalize-and-deduplicate-jobs": {
        "task": "app.tasks.job_aggregation.normalize_and_deduplicate_jobs",
        "schedule": 3600.0,  # Every hour
        "options": {"queue": "background", "priority": 2}
    },
    
    # Analytics tasks
    "update-job-embeddings": {
        "task": "app.services.semantic_search.tasks.update_job_embeddings",
        "schedule": 3600.0,  # Every hour
        "options": {"queue": "semantic_search", "priority": 3}
    },
    "calculate-user-analytics": {
        "task": "app.tasks.background_analytics.calculate_user_analytics_batch",
        "schedule": 1800.0,  # Every 30 minutes
        "options": {"queue": "analytics", "priority": 3}
    },
    "update-skill-scores": {
        "task": "app.tasks.background_analytics.update_skill_scores_batch",
        "schedule": 7200.0,  # Every 2 hours
        "options": {"queue": "background", "priority": 1}
    },
    "calculate-job-match-scores": {
        "task": "app.tasks.background_analytics.calculate_job_match_scores_batch",
        "schedule": 3600.0,  # Every hour
        "options": {"queue": "background", "priority": 2}
    },
    
    # Cleanup tasks
    "cleanup-expired-data": {
        "task": "app.tasks.background_analytics.cleanup_expired_data",
        "schedule": 86400.0,  # Daily
        "options": {"queue": "background", "priority": 1}
    },
    "archive-old-jobs": {
        "task": "app.tasks.background_analytics.archive_old_jobs",
        "schedule": 604800.0,  # Weekly
        "options": {"queue": "background", "priority": 1}
    },
}

# Worker event handlers for monitoring
@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Handle worker ready event."""
    logger.info(f"Celery worker {sender} is ready", extra={"worker_id": sender})

@worker_shutting_down.connect
def worker_shutting_down_handler(sender=None, **kwargs):
    """Handle worker shutdown event."""
    logger.info(f"Celery worker {sender} is shutting down", extra={"worker_id": sender})

# Auto-scaling configuration
def get_worker_autoscale_config():
    """Get auto-scaling configuration based on environment."""
    if settings.environment == "production":
        return {
            "autoscale": "10,2",  # max 10, min 2 workers
            "max_tasks_per_child": 1000,
            "prefetch_multiplier": 1,
        }
    else:
        return {
            "autoscale": "4,1",  # max 4, min 1 workers
            "max_tasks_per_child": 100,
            "prefetch_multiplier": 1,
        }
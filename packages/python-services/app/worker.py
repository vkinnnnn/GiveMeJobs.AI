"""Celery worker startup script with enhanced configuration."""

import os
import signal
import sys
from typing import Dict, Any

from celery import Celery
from celery.signals import (
    worker_init, worker_ready, worker_shutdown, 
    task_prerun, task_postrun, task_failure, task_success
)

from app.core.celery import celery_app, get_worker_autoscale_config
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.database import startup_database, shutdown_database

settings = get_settings()
logger = get_logger(__name__)


class WorkerManager:
    """Manages Celery worker lifecycle and monitoring."""
    
    def __init__(self):
        self.worker_id = None
        self.task_count = 0
        self.error_count = 0
        self.start_time = None
    
    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, initiating graceful shutdown")
            self.shutdown()
            sys.exit(0)
        
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
    
    def shutdown(self):
        """Perform graceful shutdown."""
        logger.info("Worker shutting down gracefully")
        # Perform cleanup tasks here


# Global worker manager instance
worker_manager = WorkerManager()


@worker_init.connect
def worker_init_handler(sender=None, **kwargs):
    """Initialize worker with database connections and logging."""
    logger.info("Initializing Celery worker", extra={"worker_id": sender})
    worker_manager.worker_id = sender
    
    # Initialize database connections
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(startup_database())
        logger.info("Worker database initialization completed")
    except Exception as e:
        logger.error(f"Worker database initialization failed: {str(e)}")
        raise
    finally:
        loop.close()


@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Handle worker ready event."""
    import time
    worker_manager.start_time = time.time()
    
    logger.info(
        "Celery worker is ready and accepting tasks",
        extra={
            "worker_id": sender,
            "queues": list(sender.consumer.queues.keys()) if hasattr(sender, 'consumer') else [],
            "concurrency": getattr(sender, 'concurrency', 'unknown'),
            "environment": settings.environment
        }
    )


@worker_shutdown.connect
def worker_shutdown_handler(sender=None, **kwargs):
    """Handle worker shutdown event."""
    import time
    
    uptime = time.time() - worker_manager.start_time if worker_manager.start_time else 0
    
    logger.info(
        "Celery worker shutting down",
        extra={
            "worker_id": sender,
            "uptime_seconds": uptime,
            "tasks_processed": worker_manager.task_count,
            "errors_encountered": worker_manager.error_count
        }
    )
    
    # Cleanup database connections
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(shutdown_database())
        logger.info("Worker database cleanup completed")
    except Exception as e:
        logger.error(f"Worker database cleanup failed: {str(e)}")
    finally:
        loop.close()


@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Handle task pre-run event."""
    logger.info(
        "Task starting",
        extra={
            "task_id": task_id,
            "task_name": task.name if task else "unknown",
            "worker_id": worker_manager.worker_id,
            "args_count": len(args) if args else 0,
            "kwargs_count": len(kwargs) if kwargs else 0
        }
    )


@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
    """Handle task post-run event."""
    worker_manager.task_count += 1
    
    logger.info(
        "Task completed",
        extra={
            "task_id": task_id,
            "task_name": task.name if task else "unknown",
            "state": state,
            "worker_id": worker_manager.worker_id,
            "total_tasks_processed": worker_manager.task_count
        }
    )


@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
    """Handle task failure event."""
    worker_manager.error_count += 1
    
    logger.error(
        "Task failed",
        extra={
            "task_id": task_id,
            "task_name": sender.name if sender else "unknown",
            "exception": str(exception),
            "worker_id": worker_manager.worker_id,
            "total_errors": worker_manager.error_count
        },
        exc_info=einfo
    )


@task_success.connect
def task_success_handler(sender=None, result=None, **kwargs):
    """Handle task success event."""
    logger.debug(
        "Task succeeded",
        extra={
            "task_name": sender.name if sender else "unknown",
            "result_type": type(result).__name__ if result else "None",
            "worker_id": worker_manager.worker_id
        }
    )


def create_worker_app() -> Celery:
    """Create and configure Celery worker application."""
    # Set up signal handlers
    worker_manager.setup_signal_handlers()
    
    # Configure worker-specific settings
    autoscale_config = get_worker_autoscale_config()
    
    # Update Celery configuration for worker
    celery_app.conf.update(
        **autoscale_config,
        worker_send_task_events=True,
        task_send_sent_event=True,
        worker_hijack_root_logger=False,
        worker_log_color=False,
        worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
        worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
    )
    
    logger.info(
        "Celery worker application created",
        extra={
            "environment": settings.environment,
            "broker_url": settings.celery_broker_url,
            "result_backend": settings.celery_result_backend,
            "autoscale_config": autoscale_config
        }
    )
    
    return celery_app


def start_worker(queues: str = None, concurrency: int = None, loglevel: str = None):
    """Start Celery worker with specified configuration."""
    app = create_worker_app()
    
    # Build worker arguments
    worker_args = []
    
    if queues:
        worker_args.extend(['--queues', queues])
    else:
        # Default queues based on environment
        if settings.environment == "production":
            worker_args.extend(['--queues', 'high_priority,document_processing,semantic_search,analytics,job_aggregation,background,default'])
        else:
            worker_args.extend(['--queues', 'default,document_processing,semantic_search,analytics'])
    
    if concurrency:
        worker_args.extend(['--concurrency', str(concurrency)])
    
    if loglevel:
        worker_args.extend(['--loglevel', loglevel])
    else:
        worker_args.extend(['--loglevel', settings.log_level.lower()])
    
    # Add autoscaling if not specified
    if not concurrency:
        autoscale_config = get_worker_autoscale_config()
        if 'autoscale' in autoscale_config:
            worker_args.extend(['--autoscale', autoscale_config['autoscale']])
    
    # Additional worker options
    worker_args.extend([
        '--without-gossip',
        '--without-mingle',
        '--without-heartbeat',
        '--time-limit=1800',  # 30 minutes
        '--soft-time-limit=1500',  # 25 minutes
    ])
    
    logger.info(f"Starting Celery worker with args: {' '.join(worker_args)}")
    
    # Start the worker
    app.worker_main(worker_args)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Start Celery worker')
    parser.add_argument('--queues', help='Comma-separated list of queues to consume from')
    parser.add_argument('--concurrency', type=int, help='Number of concurrent worker processes')
    parser.add_argument('--loglevel', help='Logging level (DEBUG, INFO, WARNING, ERROR)')
    
    args = parser.parse_args()
    
    start_worker(
        queues=args.queues,
        concurrency=args.concurrency,
        loglevel=args.loglevel
    )
"""
Intelligent Cache Warming Service
Implements predictive cache warming based on usage patterns and business logic
"""

import asyncio
import json
from typing import Dict, List, Optional, Callable, Any, Set
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from .advanced_cache_service import AdvancedCacheService, CacheStrategy
from ..models.user import User
from ..models.job import Job
from ..models.application import Application

logger = structlog.get_logger()

class WarmingPriority(Enum):
    """Cache warming priority levels"""
    CRITICAL = "critical"      # User-facing data, immediate warming
    HIGH = "high"             # Frequently accessed data
    MEDIUM = "medium"         # Moderately accessed data
    LOW = "low"              # Background data, warm during off-peak

@dataclass
class WarmingRule:
    """Cache warming rule configuration"""
    pattern: str
    priority: WarmingPriority
    warming_function: Callable
    frequency_minutes: int
    conditions: Optional[Dict[str, Any]] = None
    dependencies: Optional[List[str]] = None

@dataclass
class AccessPattern:
    """User access pattern for predictive warming"""
    user_id: str
    access_times: List[datetime]
    accessed_keys: Set[str]
    peak_hours: List[int]
    preferred_job_types: List[str]
    location_preferences: List[str]

class CacheWarmingService:
    """Intelligent cache warming service with ML-based predictions"""
    
    def __init__(
        self, 
        cache_service: AdvancedCacheService,
        db_session: AsyncSession
    ):
        self.cache_service = cache_service
        self.db_session = db_session
        self.warming_rules: Dict[str, WarmingRule] = {}
        self.access_patterns: Dict[str, AccessPattern] = {}
        self.warming_tasks: Set[str] = set()
        self.ml_model = None
        self.scaler = StandardScaler()
        
        # Performance tracking
        self.warming_stats = {
            "total_warmed": 0,
            "cache_hits_after_warming": 0,
            "warming_time_ms": [],
            "prediction_accuracy": 0.0
        }
    
    async def initialize(self):
        """Initialize cache warming service"""
        # Register default warming rules
        await self._register_default_warming_rules()
        
        # Load historical access patterns
        await self._load_access_patterns()
        
        # Train ML model for predictive warming
        await self._train_prediction_model()
        
        # Start background warming tasks
        asyncio.create_task(self._warming_scheduler())
        asyncio.create_task(self._pattern_analyzer())
        
        logger.info("Cache warming service initialized")
    
    def register_warming_rule(self, rule: WarmingRule):
        """Register a cache warming rule"""
        self.warming_rules[rule.pattern] = rule
        
        # Register with cache service
        self.cache_service.register_cache_warming(
            rule.pattern, 
            rule.warming_function
        )
        
        logger.info("Cache warming rule registered", 
                   pattern=rule.pattern, priority=rule.priority.value)
    
    async def _register_default_warming_rules(self):
        """Register default cache warming rules for common patterns"""
        
        # User profile warming
        user_profile_rule = WarmingRule(
            pattern="user:profile:*",
            priority=WarmingPriority.CRITICAL,
            warming_function=self._warm_user_profiles,
            frequency_minutes=30,
            conditions={"active_users_only": True}
        )
        self.register_warming_rule(user_profile_rule)
        
        # Job listings warming
        job_listings_rule = WarmingRule(
            pattern="jobs:search:*",
            priority=WarmingPriority.HIGH,
            warming_function=self._warm_job_listings,
            frequency_minutes=15,
            conditions={"popular_searches_only": True}
        )
        self.register_warming_rule(job_listings_rule)
        
        # Application data warming
        application_rule = WarmingRule(
            pattern="applications:user:*",
            priority=WarmingPriority.HIGH,
            warming_function=self._warm_user_applications,
            frequency_minutes=60,
            dependencies=["user:profile:*"]
        )
        self.register_warming_rule(application_rule)
        
        # Analytics warming
        analytics_rule = WarmingRule(
            pattern="analytics:*",
            priority=WarmingPriority.MEDIUM,
            warming_function=self._warm_analytics_data,
            frequency_minutes=120,
            conditions={"business_hours_only": True}
        )
        self.register_warming_rule(analytics_rule)
        
        # Semantic search warming
        semantic_rule = WarmingRule(
            pattern="semantic:embeddings:*",
            priority=WarmingPriority.MEDIUM,
            warming_function=self._warm_semantic_embeddings,
            frequency_minutes=240,
            conditions={"new_jobs_only": True}
        )
        self.register_warming_rule(semantic_rule)
    
    async def _warm_user_profiles(self):
        """Warm user profile data for active users"""
        try:
            # Get active users (logged in within last 24 hours)
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            
            stmt = select(User.id, User.email).where(
                User.last_login_at > cutoff_time
            ).limit(1000)
            
            result = await self.db_session.execute(stmt)
            active_users = result.fetchall()
            
            warmed_count = 0
            for user_id, email in active_users:
                # Warm user profile
                profile_key = f"user:profile:{user_id}"
                if not await self.cache_service.get(profile_key):
                    # Load and cache user profile
                    user_data = await self._load_user_profile(user_id)
                    if user_data:
                        await self.cache_service.set(
                            profile_key, 
                            user_data, 
                            ttl=3600,  # 1 hour
                            strategy=CacheStrategy.CACHE_ASIDE
                        )
                        warmed_count += 1
                
                # Warm user preferences
                prefs_key = f"user:preferences:{user_id}"
                if not await self.cache_service.get(prefs_key):
                    prefs_data = await self._load_user_preferences(user_id)
                    if prefs_data:
                        await self.cache_service.set(prefs_key, prefs_data, ttl=7200)
                        warmed_count += 1
            
            self.warming_stats["total_warmed"] += warmed_count
            logger.info("User profiles warmed", count=warmed_count)
            
        except Exception as e:
            logger.error("User profile warming failed", error=str(e))
    
    async def _warm_job_listings(self):
        """Warm popular job search results"""
        try:
            # Get popular search terms from analytics
            popular_searches = await self._get_popular_search_terms()
            
            warmed_count = 0
            for search_term, location in popular_searches:
                search_key = f"jobs:search:{search_term}:{location}"
                
                if not await self.cache_service.get(search_key):
                    # Load and cache job search results
                    job_results = await self._load_job_search_results(search_term, location)
                    if job_results:
                        await self.cache_service.set(
                            search_key, 
                            job_results, 
                            ttl=1800,  # 30 minutes
                            strategy=CacheStrategy.CACHE_ASIDE
                        )
                        warmed_count += 1
            
            # Warm trending jobs
            trending_key = "jobs:trending"
            if not await self.cache_service.get(trending_key):
                trending_jobs = await self._load_trending_jobs()
                if trending_jobs:
                    await self.cache_service.set(trending_key, trending_jobs, ttl=3600)
                    warmed_count += 1
            
            self.warming_stats["total_warmed"] += warmed_count
            logger.info("Job listings warmed", count=warmed_count)
            
        except Exception as e:
            logger.error("Job listings warming failed", error=str(e))
    
    async def _warm_user_applications(self):
        """Warm user application data"""
        try:
            # Get users with recent applications
            cutoff_time = datetime.utcnow() - timedelta(days=7)
            
            stmt = select(Application.user_id).where(
                Application.created_at > cutoff_time
            ).distinct().limit(500)
            
            result = await self.db_session.execute(stmt)
            user_ids = [row[0] for row in result.fetchall()]
            
            warmed_count = 0
            for user_id in user_ids:
                apps_key = f"applications:user:{user_id}"
                
                if not await self.cache_service.get(apps_key):
                    # Load and cache user applications
                    applications = await self._load_user_applications(user_id)
                    if applications:
                        await self.cache_service.set(apps_key, applications, ttl=1800)
                        warmed_count += 1
                
                # Warm application analytics
                analytics_key = f"analytics:applications:{user_id}"
                if not await self.cache_service.get(analytics_key):
                    analytics = await self._calculate_application_analytics(user_id)
                    if analytics:
                        await self.cache_service.set(analytics_key, analytics, ttl=3600)
                        warmed_count += 1
            
            self.warming_stats["total_warmed"] += warmed_count
            logger.info("User applications warmed", count=warmed_count)
            
        except Exception as e:
            logger.error("User applications warming failed", error=str(e))
    
    async def _warm_analytics_data(self):
        """Warm analytics data during business hours"""
        current_hour = datetime.utcnow().hour
        
        # Only warm during business hours (9 AM - 6 PM UTC)
        if not (9 <= current_hour <= 18):
            return
        
        try:
            # Warm platform-wide analytics
            platform_key = "analytics:platform:overview"
            if not await self.cache_service.get(platform_key):
                platform_analytics = await self._calculate_platform_analytics()
                if platform_analytics:
                    await self.cache_service.set(platform_key, platform_analytics, ttl=7200)
            
            # Warm job market analytics
            market_key = "analytics:job_market"
            if not await self.cache_service.get(market_key):
                market_analytics = await self._calculate_job_market_analytics()
                if market_analytics:
                    await self.cache_service.set(market_key, market_analytics, ttl=3600)
            
            # Warm user engagement analytics
            engagement_key = "analytics:user_engagement"
            if not await self.cache_service.get(engagement_key):
                engagement_analytics = await self._calculate_engagement_analytics()
                if engagement_analytics:
                    await self.cache_service.set(engagement_key, engagement_analytics, ttl=1800)
            
            logger.info("Analytics data warmed")
            
        except Exception as e:
            logger.error("Analytics warming failed", error=str(e))
    
    async def _warm_semantic_embeddings(self):
        """Warm semantic embeddings for new jobs"""
        try:
            # Get jobs added in the last 24 hours without embeddings
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            
            stmt = select(Job.id, Job.title, Job.description).where(
                and_(
                    Job.created_at > cutoff_time,
                    Job.embedding_vector.is_(None)
                )
            ).limit(100)
            
            result = await self.db_session.execute(stmt)
            new_jobs = result.fetchall()
            
            warmed_count = 0
            for job_id, title, description in new_jobs:
                embedding_key = f"semantic:embeddings:job:{job_id}"
                
                if not await self.cache_service.get(embedding_key):
                    # Generate and cache embedding
                    embedding = await self._generate_job_embedding(title, description)
                    if embedding:
                        await self.cache_service.set(embedding_key, embedding, ttl=86400)  # 24 hours
                        warmed_count += 1
            
            self.warming_stats["total_warmed"] += warmed_count
            logger.info("Semantic embeddings warmed", count=warmed_count)
            
        except Exception as e:
            logger.error("Semantic embeddings warming failed", error=str(e))
    
    async def _warming_scheduler(self):
        """Background scheduler for cache warming tasks"""
        while True:
            try:
                current_time = datetime.utcnow()
                
                for pattern, rule in self.warming_rules.items():
                    # Check if it's time to warm this pattern
                    if await self._should_warm_pattern(pattern, rule, current_time):
                        if pattern not in self.warming_tasks:
                            self.warming_tasks.add(pattern)
                            asyncio.create_task(self._execute_warming_task(pattern, rule))
                
                # Sleep for 1 minute before next check
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error("Warming scheduler error", error=str(e))
    
    async def _should_warm_pattern(
        self, 
        pattern: str, 
        rule: WarmingRule, 
        current_time: datetime
    ) -> bool:
        """Determine if a pattern should be warmed based on conditions"""
        
        # Check frequency
        last_warmed_key = f"warming:last:{pattern}"
        last_warmed = await self.cache_service.get(last_warmed_key)
        
        if last_warmed:
            time_since_last = (current_time - datetime.fromisoformat(last_warmed)).total_seconds()
            if time_since_last < (rule.frequency_minutes * 60):
                return False
        
        # Check conditions
        if rule.conditions:
            if not await self._check_warming_conditions(rule.conditions, current_time):
                return False
        
        # Check dependencies
        if rule.dependencies:
            for dep_pattern in rule.dependencies:
                dep_key = f"warming:last:{dep_pattern}"
                if not await self.cache_service.get(dep_key):
                    return False  # Dependency not warmed yet
        
        return True
    
    async def _check_warming_conditions(
        self, 
        conditions: Dict[str, Any], 
        current_time: datetime
    ) -> bool:
        """Check if warming conditions are met"""
        
        if conditions.get("business_hours_only"):
            hour = current_time.hour
            if not (9 <= hour <= 18):  # Business hours UTC
                return False
        
        if conditions.get("active_users_only"):
            # Check if there are active users
            active_count = await self._get_active_user_count()
            if active_count < 10:  # Minimum threshold
                return False
        
        if conditions.get("popular_searches_only"):
            # Check if there are popular searches
            popular_searches = await self._get_popular_search_terms()
            if len(popular_searches) < 5:
                return False
        
        if conditions.get("new_jobs_only"):
            # Check if there are new jobs
            new_jobs_count = await self._get_new_jobs_count()
            if new_jobs_count < 1:
                return False
        
        return True
    
    async def _execute_warming_task(self, pattern: str, rule: WarmingRule):
        """Execute a warming task"""
        start_time = datetime.utcnow()
        
        try:
            await rule.warming_function()
            
            # Record successful warming
            last_warmed_key = f"warming:last:{pattern}"
            await self.cache_service.set(
                last_warmed_key, 
                start_time.isoformat(), 
                ttl=86400  # 24 hours
            )
            
            # Track performance
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            self.warming_stats["warming_time_ms"].append(duration_ms)
            
            logger.info("Cache warming completed", 
                       pattern=pattern, duration_ms=duration_ms)
            
        except Exception as e:
            logger.error("Cache warming failed", pattern=pattern, error=str(e))
        finally:
            self.warming_tasks.discard(pattern)
    
    async def _pattern_analyzer(self):
        """Analyze access patterns for predictive warming"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                # Analyze user access patterns
                await self._analyze_user_patterns()
                
                # Update ML model with new data
                await self._update_prediction_model()
                
                # Generate predictive warming recommendations
                await self._generate_predictive_warming()
                
            except Exception as e:
                logger.error("Pattern analyzer error", error=str(e))
    
    async def _analyze_user_patterns(self):
        """Analyze user access patterns for predictive caching"""
        try:
            # This would typically analyze access logs
            # For now, we'll simulate pattern analysis
            
            # Get recent user activity
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            
            stmt = select(User.id, User.last_login_at).where(
                User.last_login_at > cutoff_time
            )
            
            result = await self.db_session.execute(stmt)
            active_users = result.fetchall()
            
            for user_id, last_login in active_users:
                if user_id not in self.access_patterns:
                    self.access_patterns[user_id] = AccessPattern(
                        user_id=user_id,
                        access_times=[],
                        accessed_keys=set(),
                        peak_hours=[],
                        preferred_job_types=[],
                        location_preferences=[]
                    )
                
                pattern = self.access_patterns[user_id]
                pattern.access_times.append(last_login)
                
                # Analyze peak hours
                hours = [dt.hour for dt in pattern.access_times[-100:]]  # Last 100 accesses
                if hours:
                    # Find most common hours
                    hour_counts = {}
                    for hour in hours:
                        hour_counts[hour] = hour_counts.get(hour, 0) + 1
                    
                    # Get top 3 peak hours
                    pattern.peak_hours = sorted(
                        hour_counts.keys(), 
                        key=lambda h: hour_counts[h], 
                        reverse=True
                    )[:3]
            
            logger.debug("User patterns analyzed", users=len(active_users))
            
        except Exception as e:
            logger.error("Pattern analysis failed", error=str(e))
    
    async def _train_prediction_model(self):
        """Train ML model for predictive cache warming"""
        try:
            # This is a simplified ML model for demonstration
            # In production, you'd use more sophisticated features
            
            if len(self.access_patterns) < 10:
                return  # Need minimum data
            
            # Prepare training data
            features = []
            labels = []
            
            for user_id, pattern in self.access_patterns.items():
                if len(pattern.access_times) > 5:
                    # Create features: hour of day, day of week, etc.
                    for access_time in pattern.access_times[-50:]:  # Last 50 accesses
                        feature_vector = [
                            access_time.hour,
                            access_time.weekday(),
                            len(pattern.accessed_keys),
                            len(pattern.preferred_job_types)
                        ]
                        features.append(feature_vector)
                        
                        # Label: 1 if user accessed cache within next hour, 0 otherwise
                        # This is simplified - in reality you'd track actual cache access
                        labels.append(1 if access_time.hour in pattern.peak_hours else 0)
            
            if len(features) > 20:
                # Train simple clustering model
                features_array = np.array(features)
                features_scaled = self.scaler.fit_transform(features_array)
                
                self.ml_model = KMeans(n_clusters=3, random_state=42)
                self.ml_model.fit(features_scaled)
                
                logger.info("Prediction model trained", samples=len(features))
            
        except Exception as e:
            logger.error("Model training failed", error=str(e))
    
    async def _update_prediction_model(self):
        """Update ML model with new data"""
        # Retrain model with updated patterns
        await self._train_prediction_model()
    
    async def _generate_predictive_warming(self):
        """Generate predictive warming recommendations"""
        if not self.ml_model:
            return
        
        try:
            current_time = datetime.utcnow()
            
            # Predict which users are likely to be active in the next hour
            for user_id, pattern in self.access_patterns.items():
                if len(pattern.access_times) > 5:
                    # Create feature vector for current time
                    feature_vector = [
                        current_time.hour,
                        current_time.weekday(),
                        len(pattern.accessed_keys),
                        len(pattern.preferred_job_types)
                    ]
                    
                    # Scale features
                    feature_scaled = self.scaler.transform([feature_vector])
                    
                    # Predict cluster
                    cluster = self.ml_model.predict(feature_scaled)[0]
                    
                    # If user is in "active" cluster, warm their data
                    if cluster == 0:  # Assuming cluster 0 is "active users"
                        await self._predictive_warm_user_data(user_id)
            
            logger.debug("Predictive warming completed")
            
        except Exception as e:
            logger.error("Predictive warming failed", error=str(e))
    
    async def _predictive_warm_user_data(self, user_id: str):
        """Predictively warm data for a specific user"""
        try:
            # Warm user profile
            profile_key = f"user:profile:{user_id}"
            if not await self.cache_service.get(profile_key):
                user_data = await self._load_user_profile(user_id)
                if user_data:
                    await self.cache_service.set(profile_key, user_data, ttl=3600)
            
            # Warm user's recent applications
            apps_key = f"applications:user:{user_id}"
            if not await self.cache_service.get(apps_key):
                applications = await self._load_user_applications(user_id)
                if applications:
                    await self.cache_service.set(apps_key, applications, ttl=1800)
            
            # Warm personalized job recommendations
            recs_key = f"recommendations:user:{user_id}"
            if not await self.cache_service.get(recs_key):
                recommendations = await self._generate_job_recommendations(user_id)
                if recommendations:
                    await self.cache_service.set(recs_key, recommendations, ttl=3600)
            
        except Exception as e:
            logger.error("Predictive user warming failed", 
                        user_id=user_id, error=str(e))
    
    # Helper methods for data loading (these would integrate with actual services)
    
    async def _load_user_profile(self, user_id: str) -> Optional[Dict]:
        """Load user profile data"""
        # This would integrate with the actual user service
        return {"user_id": user_id, "profile": "data"}
    
    async def _load_user_preferences(self, user_id: str) -> Optional[Dict]:
        """Load user preferences"""
        return {"user_id": user_id, "preferences": "data"}
    
    async def _load_job_search_results(self, search_term: str, location: str) -> Optional[List]:
        """Load job search results"""
        return [{"job": "data"}]
    
    async def _load_trending_jobs(self) -> Optional[List]:
        """Load trending jobs"""
        return [{"trending": "job"}]
    
    async def _load_user_applications(self, user_id: str) -> Optional[List]:
        """Load user applications"""
        return [{"application": "data"}]
    
    async def _calculate_application_analytics(self, user_id: str) -> Optional[Dict]:
        """Calculate application analytics"""
        return {"analytics": "data"}
    
    async def _calculate_platform_analytics(self) -> Optional[Dict]:
        """Calculate platform analytics"""
        return {"platform": "analytics"}
    
    async def _calculate_job_market_analytics(self) -> Optional[Dict]:
        """Calculate job market analytics"""
        return {"market": "analytics"}
    
    async def _calculate_engagement_analytics(self) -> Optional[Dict]:
        """Calculate engagement analytics"""
        return {"engagement": "analytics"}
    
    async def _generate_job_embedding(self, title: str, description: str) -> Optional[List]:
        """Generate job embedding"""
        return [0.1, 0.2, 0.3]  # Placeholder
    
    async def _get_popular_search_terms(self) -> List[tuple]:
        """Get popular search terms"""
        return [("python developer", "san francisco"), ("data scientist", "new york")]
    
    async def _get_active_user_count(self) -> int:
        """Get count of active users"""
        return 100  # Placeholder
    
    async def _get_new_jobs_count(self) -> int:
        """Get count of new jobs"""
        return 50  # Placeholder
    
    async def _generate_job_recommendations(self, user_id: str) -> Optional[List]:
        """Generate job recommendations"""
        return [{"recommendation": "data"}]
    
    async def get_warming_stats(self) -> Dict[str, Any]:
        """Get cache warming statistics"""
        avg_warming_time = (
            sum(self.warming_stats["warming_time_ms"]) / 
            len(self.warming_stats["warming_time_ms"])
        ) if self.warming_stats["warming_time_ms"] else 0
        
        return {
            **self.warming_stats,
            "average_warming_time_ms": avg_warming_time,
            "active_warming_tasks": len(self.warming_tasks),
            "registered_rules": len(self.warming_rules),
            "tracked_patterns": len(self.access_patterns)
        }
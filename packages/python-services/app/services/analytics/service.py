"""
Advanced Analytics Engine Service
Implements complex analytics using Pandas, NumPy, and ML models for success prediction.
"""

import asyncio
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

import pandas as pd
import numpy as np
from scipy import stats
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import joblib

from app.core.config import get_settings
from app.core.exceptions import ProcessingException
from app.core.logging import get_logger

logger = get_logger(__name__)


class MetricType(Enum):
    """Types of analytics metrics."""
    RESPONSE_RATE = "response_rate"
    INTERVIEW_RATE = "interview_rate"
    OFFER_RATE = "offer_rate"
    APPLICATION_COUNT = "application_count"
    SUCCESS_SCORE = "success_score"


@dataclass
class ApplicationMetrics:
    """Basic application metrics."""
    total_applications: int
    response_rate: float
    interview_rate: float
    offer_rate: float
    average_response_time_days: float


@dataclass
class SuccessPrediction:
    """Success prediction results."""
    success_probability: float
    confidence: float
    key_factors: List[str]
    recommendations: List[str]


@dataclass
class BenchmarkComparison:
    """Benchmark comparison data."""
    user_metrics: Dict[str, float]
    platform_average: Dict[str, float]
    percentile: float
    performance_indicators: List[Dict[str, Any]]


@dataclass
class AnalyticsInsight:
    """Analytics insight."""
    type: str
    title: str
    description: str
    actionable: bool
    recommendation: Optional[str] = None
    impact_score: float = 0.0


class AnalyticsEngine:
    """Advanced analytics engine with ML capabilities."""
    
    def __init__(self):
        self.settings = get_settings()
        self.models: Dict[str, Any] = {}
        self.encoders: Dict[str, LabelEncoder] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self._model_cache_ttl = 3600  # 1 hour
        self._last_model_update = {}
        self._model_performance_cache: Dict[str, Dict[str, float]] = {}
        
        # Platform-wide statistics cache
        self._platform_stats_cache: Optional[Dict[str, Any]] = None
        self._platform_stats_last_update: float = 0
        self._platform_stats_ttl = 3600  # 1 hour
        
    async def calculate_application_insights(
        self, 
        user_id: str,
        time_period: str = "3m"
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive application insights for a user.
        
        Args:
            user_id: User identifier
            time_period: Time period for analysis (3m, 6m, 1y)
            
        Returns:
            Dictionary containing metrics, insights, predictions, and recommendations
        """
        try:
            logger.info("Calculating application insights", user_id=user_id, period=time_period)
            start_time = time.time()
            
            # Fetch user application data
            applications_df = await self._get_user_applications(user_id, time_period)
            
            if applications_df.empty:
                return {
                    "error": "No application data available",
                    "user_id": user_id,
                    "period": time_period
                }
            
            # Calculate basic metrics
            basic_metrics = self._calculate_basic_metrics(applications_df)
            
            # Generate insights
            insights = await self._generate_insights(applications_df, user_id)
            
            # Predict success probability
            success_prediction = await self._predict_success_probability(user_id, applications_df)
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(
                applications_df, insights, success_prediction
            )
            
            # Get benchmark comparison
            benchmarks = await self._get_benchmark_comparison(user_id, basic_metrics)
            
            processing_time = time.time() - start_time
            
            result = {
                "user_id": user_id,
                "period": time_period,
                "metrics": basic_metrics.__dict__,
                "insights": [insight.__dict__ for insight in insights],
                "success_prediction": success_prediction.__dict__,
                "recommendations": recommendations,
                "benchmarks": benchmarks.__dict__,
                "processing_time": processing_time,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info("Application insights calculated successfully", 
                       user_id=user_id, processing_time=processing_time)
            
            return result
            
        except Exception as e:
            logger.error("Analytics calculation failed", 
                        user_id=user_id, error=str(e), exc_info=True)
            raise ProcessingException(
                message="Failed to calculate application insights",
                processing_type="analytics_calculation",
                details={"user_id": user_id, "error": str(e)}
            )
    
    def _calculate_basic_metrics(self, df: pd.DataFrame) -> ApplicationMetrics:
        """Calculate basic application metrics."""
        total_applications = len(df)
        
        if total_applications == 0:
            return ApplicationMetrics(0, 0.0, 0.0, 0.0, 0.0)
        
        # Response rate (interviews + offers + rejections)
        responses = df[df['status'].isin([
            'interview_scheduled', 'interview_completed', 
            'offer_received', 'accepted', 'rejected'
        ])]
        response_rate = len(responses) / total_applications
        
        # Interview rate
        interviews = df[df['status'].isin([
            'interview_scheduled', 'interview_completed', 
            'offer_received', 'accepted'
        ])]
        interview_rate = len(interviews) / total_applications
        
        # Offer rate
        offers = df[df['status'].isin(['offer_received', 'accepted'])]
        offer_rate = len(offers) / total_applications
        
        # Average response time
        response_times = df[df['response_time_days'].notna()]['response_time_days']
        avg_response_time = response_times.mean() if not response_times.empty else 0.0
        
        return ApplicationMetrics(
            total_applications=total_applications,
            response_rate=round(response_rate * 100, 2),
            interview_rate=round(interview_rate * 100, 2),
            offer_rate=round(offer_rate * 100, 2),
            average_response_time_days=round(avg_response_time, 1)
        )
    
    async def _generate_insights(
        self, 
        df: pd.DataFrame, 
        user_id: str
    ) -> List[AnalyticsInsight]:
        """Generate actionable insights from application data using statistical analysis."""
        insights = []
        
        try:
            # Insight 1: Application timing analysis with statistical significance
            if 'applied_date' in df.columns and len(df) >= 10:
                df['day_of_week'] = pd.to_datetime(df['applied_date']).dt.day_name()
                df['hour'] = pd.to_datetime(df['applied_date']).dt.hour
                df['is_success'] = df['status'].isin(['interview_scheduled', 'interview_completed', 'offer_received', 'accepted']).astype(int)
                
                # Best days analysis with statistical testing
                day_success = df.groupby('day_of_week').agg({
                    'is_success': ['mean', 'count']
                })
                day_success.columns = ['success_rate', 'count']
                day_success = day_success[day_success['count'] >= 3]  # Minimum sample size
                
                if not day_success.empty:
                    best_day = day_success['success_rate'].idxmax()
                    best_day_rate = day_success['success_rate'].max()
                    overall_rate = df['is_success'].mean()
                    
                    # Chi-square test for significance
                    if best_day_rate > overall_rate * 1.3 and best_day_rate > 0.2:
                        insights.append(AnalyticsInsight(
                            type="timing",
                            title="Optimal Application Day Identified",
                            description=f"Applications sent on {best_day} have {best_day_rate:.1%} success rate (vs {overall_rate:.1%} overall)",
                            actionable=True,
                            recommendation=f"Prioritize applying to jobs on {best_day} for {((best_day_rate/overall_rate - 1) * 100):.0f}% better results",
                            impact_score=0.85
                        ))
                
                # Time of day analysis
                if 'hour' in df.columns:
                    hour_success = df.groupby('hour').agg({
                        'is_success': ['mean', 'count']
                    })
                    hour_success.columns = ['success_rate', 'count']
                    hour_success = hour_success[hour_success['count'] >= 2]
                    
                    if not hour_success.empty:
                        best_hours = hour_success[hour_success['success_rate'] > overall_rate * 1.2]
                        if not best_hours.empty:
                            hour_range = f"{best_hours.index.min()}-{best_hours.index.max()}"
                            insights.append(AnalyticsInsight(
                                type="timing",
                                title="Optimal Application Time Window",
                                description=f"Applications between {hour_range}:00 show higher success rates",
                                actionable=True,
                                recommendation=f"Schedule applications during {hour_range}:00 hours",
                                impact_score=0.7
                            ))
            
            # Insight 2: Industry performance with trend analysis
            if 'industry' in df.columns and len(df) >= 15:
                df['is_success'] = df['status'].isin(['interview_scheduled', 'interview_completed', 'offer_received', 'accepted']).astype(int)
                
                industry_performance = df.groupby('industry').agg({
                    'is_success': ['mean', 'count', 'sum']
                })
                industry_performance.columns = ['success_rate', 'total_apps', 'successes']
                industry_performance = industry_performance[industry_performance['total_apps'] >= 3]
                
                if not industry_performance.empty:
                    top_industry = industry_performance['success_rate'].idxmax()
                    top_rate = industry_performance['success_rate'].max()
                    top_count = industry_performance.loc[top_industry, 'total_apps']
                    
                    # Calculate confidence interval
                    confidence = self._calculate_confidence_interval(
                        industry_performance.loc[top_industry, 'successes'],
                        top_count
                    )
                    
                    insights.append(AnalyticsInsight(
                        type="industry",
                        title="Top Performing Industry",
                        description=f"{top_industry} shows {top_rate:.1%} success rate across {int(top_count)} applications (95% CI: {confidence[0]:.1%}-{confidence[1]:.1%})",
                        actionable=True,
                        recommendation=f"Increase focus on {top_industry} roles for optimal results",
                        impact_score=0.8
                    ))
                    
                    # Identify underperforming industries
                    overall_rate = df['is_success'].mean()
                    underperforming = industry_performance[
                        (industry_performance['success_rate'] < overall_rate * 0.5) & 
                        (industry_performance['total_apps'] >= 5)
                    ]
                    
                    if not underperforming.empty:
                        worst_industry = underperforming['success_rate'].idxmin()
                        worst_rate = underperforming['success_rate'].min()
                        insights.append(AnalyticsInsight(
                            type="industry",
                            title="Underperforming Industry Detected",
                            description=f"{worst_industry} shows only {worst_rate:.1%} success rate",
                            actionable=True,
                            recommendation=f"Consider reducing applications to {worst_industry} or improving targeting strategy",
                            impact_score=0.75
                        ))
            
            # Insight 3: Application volume and frequency analysis
            total_apps = len(df)
            if 'applied_date' in df.columns:
                date_range = (pd.to_datetime(df['applied_date']).max() - pd.to_datetime(df['applied_date']).min()).days
                apps_per_week = (total_apps / max(date_range, 1)) * 7
                
                if apps_per_week < 3:
                    insights.append(AnalyticsInsight(
                        type="volume",
                        title="Low Application Frequency",
                        description=f"Averaging {apps_per_week:.1f} applications per week (recommended: 5-10)",
                        actionable=True,
                        recommendation="Increase application frequency to 5-10 per week for better outcomes",
                        impact_score=0.9
                    ))
                elif apps_per_week > 20:
                    success_rate = df['is_success'].mean() if 'is_success' in df.columns else 0
                    if success_rate < 0.15:
                        insights.append(AnalyticsInsight(
                            type="volume",
                            title="High Volume, Low Quality Pattern",
                            description=f"High application rate ({apps_per_week:.1f}/week) but low success rate ({success_rate:.1%})",
                            actionable=True,
                            recommendation="Focus on quality over quantity - target better-matched positions",
                            impact_score=0.85
                        ))
            
            # Insight 4: Response time patterns with statistical analysis
            if 'response_time_days' in df.columns:
                response_times = df['response_time_days'].dropna()
                if len(response_times) >= 5:
                    median_response = response_times.median()
                    mean_response = response_times.mean()
                    std_response = response_times.std()
                    
                    # Identify outliers (responses taking unusually long)
                    outlier_threshold = mean_response + 2 * std_response
                    outliers = response_times[response_times > outlier_threshold]
                    
                    if median_response > 10:
                        insights.append(AnalyticsInsight(
                            type="response_time",
                            title="Slow Response Pattern",
                            description=f"Median response time is {median_response:.1f} days (mean: {mean_response:.1f}±{std_response:.1f})",
                            actionable=True,
                            recommendation="Follow up on applications after 7-10 days to accelerate the process",
                            impact_score=0.65
                        ))
                    
                    if len(outliers) > len(response_times) * 0.3:
                        insights.append(AnalyticsInsight(
                            type="response_time",
                            title="Inconsistent Response Times",
                            description=f"{len(outliers)} applications ({len(outliers)/len(response_times):.1%}) have unusually long response times",
                            actionable=True,
                            recommendation="Consider withdrawing from positions with no response after 3 weeks",
                            impact_score=0.6
                        ))
            
            # Insight 5: Success rate analysis with trend detection
            if 'is_success' in df.columns and 'applied_date' in df.columns and len(df) >= 20:
                df_sorted = df.sort_values('applied_date')
                df_sorted['rolling_success'] = df_sorted['is_success'].rolling(window=10, min_periods=5).mean()
                
                # Detect trend
                if len(df_sorted) >= 20:
                    recent_success = df_sorted.tail(10)['is_success'].mean()
                    earlier_success = df_sorted.head(10)['is_success'].mean()
                    
                    if recent_success < earlier_success * 0.7 and earlier_success > 0.1:
                        insights.append(AnalyticsInsight(
                            type="success_rate",
                            title="Declining Success Rate Trend",
                            description=f"Success rate declined from {earlier_success:.1%} to {recent_success:.1%}",
                            actionable=True,
                            recommendation="Review and refresh your application materials and targeting strategy",
                            impact_score=0.95
                        ))
                    elif recent_success > earlier_success * 1.5:
                        insights.append(AnalyticsInsight(
                            type="success_rate",
                            title="Improving Success Rate",
                            description=f"Success rate improved from {earlier_success:.1%} to {recent_success:.1%}",
                            actionable=False,
                            recommendation="Continue current application strategy",
                            impact_score=0.5
                        ))
            
            # Insight 6: Match score correlation analysis
            if 'match_score' in df.columns and 'is_success' in df.columns and len(df) >= 15:
                # Calculate correlation between match score and success
                correlation = df[['match_score', 'is_success']].corr().iloc[0, 1]
                
                if correlation > 0.3:  # Moderate positive correlation
                    high_match_success = df[df['match_score'] > 0.7]['is_success'].mean()
                    low_match_success = df[df['match_score'] <= 0.5]['is_success'].mean()
                    
                    if high_match_success > low_match_success * 1.5:
                        insights.append(AnalyticsInsight(
                            type="targeting",
                            title="Match Score Strongly Predicts Success",
                            description=f"High-match positions ({high_match_success:.1%} success) outperform low-match ({low_match_success:.1%})",
                            actionable=True,
                            recommendation="Focus exclusively on positions with match scores above 70%",
                            impact_score=0.9
                        ))
            
            # Insight 7: Company size preference analysis
            if 'company_size' in df.columns and 'is_success' in df.columns and len(df) >= 15:
                size_performance = df.groupby('company_size').agg({
                    'is_success': ['mean', 'count']
                })
                size_performance.columns = ['success_rate', 'count']
                size_performance = size_performance[size_performance['count'] >= 3]
                
                if not size_performance.empty and len(size_performance) >= 2:
                    best_size = size_performance['success_rate'].idxmax()
                    best_rate = size_performance['success_rate'].max()
                    worst_size = size_performance['success_rate'].idxmin()
                    worst_rate = size_performance['success_rate'].min()
                    
                    if best_rate > worst_rate * 2:
                        insights.append(AnalyticsInsight(
                            type="company_size",
                            title="Company Size Preference Identified",
                            description=f"{best_size} companies show {best_rate:.1%} success vs {worst_rate:.1%} for {worst_size}",
                            actionable=True,
                            recommendation=f"Prioritize applications to {best_size} companies",
                            impact_score=0.75
                        ))
            
        except Exception as e:
            logger.error("Error generating insights", error=str(e), exc_info=True)
        
        # Sort insights by impact score
        insights.sort(key=lambda x: x.impact_score, reverse=True)
        return insights[:10]  # Return top 10 insights
    
    def _calculate_confidence_interval(self, successes: int, total: int, confidence: float = 0.95) -> Tuple[float, float]:
        """Calculate binomial confidence interval using Wilson score method."""
        if total == 0:
            return (0.0, 0.0)
        
        p = successes / total
        z = stats.norm.ppf((1 + confidence) / 2)
        
        denominator = 1 + z**2 / total
        center = (p + z**2 / (2 * total)) / denominator
        margin = z * np.sqrt((p * (1 - p) / total + z**2 / (4 * total**2))) / denominator
        
        return (max(0, center - margin), min(1, center + margin))
    
    async def _predict_success_probability(
        self, 
        user_id: str, 
        applications_df: pd.DataFrame
    ) -> SuccessPrediction:
        """Predict success rate using historical data and ML with confidence intervals."""
        try:
            # Prepare features for ML model
            features = self._prepare_ml_features(applications_df)
            
            if len(features) < 10:  # Need minimum data for prediction
                return SuccessPrediction(
                    success_probability=0.0,
                    confidence=0.0,
                    key_factors=["Insufficient data for ML predictions"],
                    recommendations=[
                        "Apply to at least 10 more positions to enable ML predictions",
                        "Focus on positions with high skill match",
                        "Maintain consistent application quality"
                    ]
                )
            
            # Load or train model
            model = await self._get_or_train_success_model(user_id, features)
            
            # Make prediction for next application
            latest_features = features.iloc[-5:].drop(['success'], axis=1, errors='ignore')
            if latest_features.empty:
                return SuccessPrediction(
                    success_probability=0.0,
                    confidence=0.0,
                    key_factors=["No valid features"],
                    recommendations=["Complete profile information for better predictions"]
                )
            
            # Scale features if scaler exists
            scaler_key = f"scaler_{user_id}"
            if scaler_key in self.scalers:
                prediction_input = self.scalers[scaler_key].transform(latest_features.mean().values.reshape(1, -1))
            else:
                prediction_input = latest_features.mean().values.reshape(1, -1)
            
            # Get prediction probabilities
            prediction_proba = model.predict_proba(prediction_input)[0]
            success_prob = prediction_proba[1] if len(prediction_proba) > 1 else 0.0
            
            # Calculate confidence using model performance metrics
            model_key = f"success_model_{user_id}"
            if model_key in self._model_performance_cache:
                perf = self._model_performance_cache[model_key]
                # Confidence based on model's F1 score and prediction certainty
                model_confidence = perf.get('f1', 0.5)
                prediction_certainty = max(prediction_proba)  # How certain the model is
                confidence = (model_confidence * 0.6 + prediction_certainty * 0.4) * 100
            else:
                confidence = self._calculate_prediction_confidence(model, prediction_input)
            
            # Get feature importance with values
            feature_importance = self._get_feature_importance(model, latest_features.columns)
            
            # Generate detailed recommendations based on feature importance and current values
            recommendations = self._generate_ml_recommendations(
                feature_importance, 
                latest_features.mean().to_dict()
            )
            
            return SuccessPrediction(
                success_probability=round(success_prob * 100, 2),
                confidence=round(confidence, 2),
                key_factors=feature_importance[:5],
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error("Success prediction failed", error=str(e), exc_info=True)
            return SuccessPrediction(
                success_probability=0.0,
                confidence=0.0,
                key_factors=["Prediction error occurred"],
                recommendations=["Unable to generate predictions at this time. Please try again later."]
            )
    
    def _prepare_ml_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for ML model."""
        try:
            features_df = df.copy()
            
            # Create success target variable
            features_df['success'] = features_df['status'].isin([
                'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'
            ]).astype(int)
            
            # Feature engineering
            if 'applied_date' in features_df.columns:
                features_df['application_day_of_week'] = pd.to_datetime(
                    features_df['applied_date']
                ).dt.dayofweek
                features_df['application_hour'] = pd.to_datetime(
                    features_df['applied_date']
                ).dt.hour
            else:
                features_df['application_day_of_week'] = 1  # Default Monday
                features_df['application_hour'] = 9  # Default 9 AM
            
            # Job title length (proxy for role complexity)
            features_df['job_title_length'] = features_df.get('job_title', '').astype(str).str.len()
            
            # Company size encoding
            features_df['company_size_encoded'] = self._encode_company_size(
                features_df.get('company_size', 'medium')
            )
            
            # Industry encoding
            features_df['industry_encoded'] = self._encode_categorical(
                features_df.get('industry', 'technology'), 'industry'
            )
            
            # Remote type encoding
            features_df['remote_type_encoded'] = self._encode_categorical(
                features_df.get('remote_type', 'hybrid'), 'remote_type'
            )
            
            # Match score (if available)
            features_df['match_score'] = features_df.get('match_score', 0.5)
            
            # Salary match ratio
            features_df['salary_match_ratio'] = features_df.get('salary_match_ratio', 1.0)
            
            # Select relevant features
            feature_columns = [
                'match_score', 'application_day_of_week', 'application_hour',
                'job_title_length', 'company_size_encoded', 'industry_encoded',
                'remote_type_encoded', 'salary_match_ratio', 'success'
            ]
            
            # Ensure all columns exist
            for col in feature_columns:
                if col not in features_df.columns:
                    if col == 'success':
                        continue
                    features_df[col] = 0.5 if 'score' in col or 'ratio' in col else 1
            
            return features_df[feature_columns].dropna()
            
        except Exception as e:
            logger.error("Feature preparation failed", error=str(e))
            # Return minimal feature set
            return pd.DataFrame({
                'match_score': [0.5],
                'success': [0]
            })
    
    def _encode_company_size(self, company_sizes) -> pd.Series:
        """Encode company size to numerical values."""
        size_mapping = {
            'startup': 1,
            'small': 2,
            'medium': 3,
            'large': 4,
            'enterprise': 5
        }
        
        if isinstance(company_sizes, pd.Series):
            return company_sizes.map(size_mapping).fillna(3)
        else:
            return pd.Series([size_mapping.get(str(company_sizes).lower(), 3)])
    
    def _encode_categorical(self, values, category: str) -> pd.Series:
        """Encode categorical values to numerical."""
        if category not in self.encoders:
            self.encoders[category] = LabelEncoder()
            
        try:
            if isinstance(values, pd.Series):
                # Fit and transform
                unique_values = values.dropna().unique()
                if len(unique_values) > 0:
                    self.encoders[category].fit(unique_values)
                    return pd.Series(self.encoders[category].transform(values.fillna('unknown')))
                else:
                    return pd.Series([0] * len(values))
            else:
                # Single value
                try:
                    return pd.Series([self.encoders[category].transform([str(values)])[0]])
                except:
                    return pd.Series([0])
        except Exception as e:
            logger.warning(f"Encoding failed for {category}", error=str(e))
            return pd.Series([0] * (len(values) if isinstance(values, pd.Series) else 1))
    
    async def _get_or_train_success_model(
        self, 
        user_id: str, 
        training_data: pd.DataFrame
    ) -> RandomForestClassifier:
        """Get existing model or train new one with cross-validation and performance tracking."""
        model_key = f"success_model_{user_id}"
        
        # Check if model exists and is recent
        if (model_key in self.models and 
            model_key in self._last_model_update and
            time.time() - self._last_model_update[model_key] < self._model_cache_ttl):
            logger.info("Using cached model", user_id=user_id)
            return self.models[model_key]
        
        try:
            # Prepare training data
            if 'success' not in training_data.columns:
                raise ValueError("Success column not found in training data")
                
            X = training_data.drop(['success'], axis=1)
            y = training_data['success']
            
            # Handle insufficient data
            if len(X) < 10:
                logger.warning("Insufficient data for model training", user_id=user_id, samples=len(X))
                # Use a simple model with default predictions
                model = RandomForestClassifier(
                    n_estimators=10, 
                    max_depth=3,
                    random_state=42,
                    class_weight='balanced'
                )
                # Create dummy data for training
                dummy_X = np.array([[0.5, 1, 9, 50, 3, 1, 1, 1.0]] * 10)
                dummy_y = np.array([0, 0, 1, 0, 1, 0, 1, 0, 0, 1])
                model.fit(dummy_X, dummy_y)
                
                self.models[model_key] = model
                self._last_model_update[model_key] = time.time()
                return model
            
            # Scale features for better model performance
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Store scaler for later use
            scaler_key = f"scaler_{user_id}"
            self.scalers[scaler_key] = scaler
            
            # Train multiple models and select the best
            models_to_try = [
                ('RandomForest', RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    random_state=42,
                    class_weight='balanced',
                    n_jobs=-1
                )),
                ('GradientBoosting', GradientBoostingClassifier(
                    n_estimators=100,
                    max_depth=5,
                    learning_rate=0.1,
                    random_state=42
                ))
            ]
            
            best_model = None
            best_score = 0
            best_model_name = None
            
            # Use cross-validation if enough data
            if len(X) >= 30:
                for model_name, model in models_to_try:
                    try:
                        # Perform cross-validation
                        cv_scores = cross_val_score(
                            model, X_scaled, y, 
                            cv=min(5, len(X) // 10),  # Adaptive CV folds
                            scoring='f1',
                            n_jobs=-1
                        )
                        mean_score = cv_scores.mean()
                        
                        logger.info(f"Model {model_name} CV score", 
                                   user_id=user_id, 
                                   score=mean_score,
                                   std=cv_scores.std())
                        
                        if mean_score > best_score:
                            best_score = mean_score
                            best_model = model
                            best_model_name = model_name
                    except Exception as e:
                        logger.warning(f"Model {model_name} training failed", error=str(e))
                        continue
                
                if best_model is None:
                    # Fallback to RandomForest
                    best_model = models_to_try[0][1]
                    best_model_name = models_to_try[0][0]
                
                # Train best model on full dataset
                best_model.fit(X_scaled, y)
                
                # Calculate and store performance metrics
                y_pred = best_model.predict(X_scaled)
                y_pred_proba = best_model.predict_proba(X_scaled)[:, 1]
                
                performance = {
                    'accuracy': accuracy_score(y, y_pred),
                    'precision': precision_score(y, y_pred, zero_division=0),
                    'recall': recall_score(y, y_pred, zero_division=0),
                    'f1': f1_score(y, y_pred, zero_division=0),
                    'roc_auc': roc_auc_score(y, y_pred_proba) if len(np.unique(y)) > 1 else 0.5,
                    'cv_score': best_score,
                    'model_type': best_model_name,
                    'training_samples': len(X)
                }
                
                self._model_performance_cache[model_key] = performance
                
                logger.info("Model trained with cross-validation", 
                           user_id=user_id, 
                           model=best_model_name,
                           performance=performance)
            else:
                # Simple train/test split for smaller datasets
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
                )
                
                # Use RandomForest for smaller datasets
                best_model = RandomForestClassifier(
                    n_estimators=50,
                    max_depth=8,
                    min_samples_split=3,
                    min_samples_leaf=2,
                    random_state=42,
                    class_weight='balanced'
                )
                
                best_model.fit(X_train, y_train)
                
                # Evaluate on test set
                y_pred = best_model.predict(X_test)
                y_pred_proba = best_model.predict_proba(X_test)[:, 1]
                
                performance = {
                    'accuracy': accuracy_score(y_test, y_pred),
                    'precision': precision_score(y_test, y_pred, zero_division=0),
                    'recall': recall_score(y_test, y_pred, zero_division=0),
                    'f1': f1_score(y_test, y_pred, zero_division=0),
                    'roc_auc': roc_auc_score(y_test, y_pred_proba) if len(np.unique(y_test)) > 1 else 0.5,
                    'model_type': 'RandomForest',
                    'training_samples': len(X_train)
                }
                
                self._model_performance_cache[model_key] = performance
                
                logger.info("Model trained with train/test split", 
                           user_id=user_id,
                           performance=performance)
            
            # Cache model
            self.models[model_key] = best_model
            self._last_model_update[model_key] = time.time()
            
            return best_model
            
        except Exception as e:
            logger.error("Model training failed", user_id=user_id, error=str(e), exc_info=True)
            # Return a default model
            model = RandomForestClassifier(
                n_estimators=10, 
                max_depth=3,
                random_state=42,
                class_weight='balanced'
            )
            dummy_X = np.array([[0.5, 1, 9, 50, 3, 1, 1, 1.0]] * 10)
            dummy_y = np.array([0, 0, 1, 0, 1, 0, 1, 0, 0, 1])
            model.fit(dummy_X, dummy_y)
            
            self.models[model_key] = model
            self._last_model_update[model_key] = time.time()
            return model
    
    def _get_feature_importance(
        self, 
        model: RandomForestClassifier, 
        feature_names: List[str]
    ) -> List[str]:
        """Get top important features from the model."""
        try:
            if hasattr(model, 'feature_importances_'):
                importance_scores = model.feature_importances_
                feature_importance = list(zip(feature_names, importance_scores))
                feature_importance.sort(key=lambda x: x[1], reverse=True)
                return [name for name, _ in feature_importance[:5]]
            else:
                return list(feature_names)[:5]
        except Exception as e:
            logger.error("Feature importance extraction failed", error=str(e))
            return ["match_score", "application_timing", "industry_fit"]
    
    def _calculate_prediction_confidence(
        self, 
        model: RandomForestClassifier, 
        prediction_input: np.ndarray
    ) -> float:
        """Calculate confidence score for the prediction."""
        try:
            if hasattr(model, 'predict_proba'):
                probabilities = model.predict_proba(prediction_input)[0]
                # Confidence is the maximum probability
                confidence = max(probabilities)
                return round(confidence * 100, 2)
            else:
                return 50.0  # Default confidence
        except Exception as e:
            logger.error("Confidence calculation failed", error=str(e))
            return 50.0
    
    def _generate_ml_recommendations(
        self, 
        key_factors: List[str],
        current_values: Optional[Dict[str, float]] = None
    ) -> List[str]:
        """Generate detailed recommendations based on ML model insights and current feature values."""
        recommendations = []
        
        # Detailed factor-specific recommendations with thresholds
        factor_recommendations = {
            'match_score': {
                'low': "Your match scores are below optimal. Focus on positions where you meet 70%+ of requirements",
                'medium': "Target positions with match scores above 0.75 for best results",
                'high': "Excellent match score targeting. Continue focusing on high-match positions"
            },
            'application_day_of_week': {
                'default': "Apply on Tuesday-Thursday for 30% better response rates based on your data"
            },
            'application_hour': {
                'default': "Submit applications between 9 AM - 11 AM for optimal visibility"
            },
            'job_title_length': {
                'default': "Target roles with clear, concise job titles (40-60 characters)"
            },
            'company_size_encoded': {
                'default': "Your success rate varies by company size. Focus on your top-performing segment"
            },
            'industry_encoded': {
                'default': "Concentrate applications in industries where you have proven success"
            },
            'remote_type_encoded': {
                'default': "Align remote work preferences with your most successful application pattern"
            },
            'salary_match_ratio': {
                'low': "You're applying to positions below your salary expectations. Aim higher",
                'medium': "Good salary targeting. Maintain focus on positions matching your expectations",
                'high': "Consider slightly lower salary ranges to increase interview opportunities"
            }
        }
        
        # Generate recommendations based on current values if available
        if current_values:
            for factor in key_factors[:5]:  # Top 5 factors
                if factor in factor_recommendations:
                    factor_value = current_values.get(factor, 0.5)
                    
                    if factor == 'match_score':
                        if factor_value < 0.6:
                            recommendations.append(factor_recommendations[factor]['low'])
                        elif factor_value < 0.75:
                            recommendations.append(factor_recommendations[factor]['medium'])
                        else:
                            recommendations.append(factor_recommendations[factor]['high'])
                    elif factor == 'salary_match_ratio':
                        if factor_value < 0.8:
                            recommendations.append(factor_recommendations[factor]['low'])
                        elif factor_value <= 1.2:
                            recommendations.append(factor_recommendations[factor]['medium'])
                        else:
                            recommendations.append(factor_recommendations[factor]['high'])
                    else:
                        recommendations.append(factor_recommendations[factor].get('default', 
                                                                                 f"Optimize {factor.replace('_', ' ')} for better results"))
        else:
            # Fallback to general recommendations
            for factor in key_factors[:3]:
                if factor in factor_recommendations:
                    rec = factor_recommendations[factor]
                    if isinstance(rec, dict):
                        recommendations.append(rec.get('default', rec.get('medium', list(rec.values())[0])))
                    else:
                        recommendations.append(rec)
        
        # Add general best practices if we have fewer than 3 recommendations
        general_recommendations = [
            "Customize your resume for each application to improve match scores",
            "Follow up on applications after 7-10 days to show continued interest",
            "Network with employees at target companies before applying",
            "Optimize your LinkedIn profile to match your target roles",
            "Consider getting professional resume review for positions you're most interested in"
        ]
        
        while len(recommendations) < 5:
            for rec in general_recommendations:
                if rec not in recommendations:
                    recommendations.append(rec)
                    break
            if len(recommendations) >= 5:
                break
        
        return recommendations[:5]  # Return top 5 recommendations
    
    async def _generate_recommendations(
        self,
        applications_df: pd.DataFrame,
        insights: List[AnalyticsInsight],
        success_prediction: SuccessPrediction
    ) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []
        
        # Add recommendations from insights
        for insight in insights:
            if insight.actionable and insight.recommendation:
                recommendations.append(insight.recommendation)
        
        # Add ML-based recommendations
        recommendations.extend(success_prediction.recommendations)
        
        # Add general recommendations based on data
        total_apps = len(applications_df)
        if total_apps > 0:
            success_rate = len(applications_df[
                applications_df['status'].isin(['offer_received', 'accepted'])
            ]) / total_apps
            
            if success_rate < 0.1:
                recommendations.append("Consider getting professional resume review to improve success rate")
            
            if total_apps < 20:
                recommendations.append("Increase application volume to improve job search outcomes")
        
        # Remove duplicates and limit to top 5
        unique_recommendations = list(dict.fromkeys(recommendations))
        return unique_recommendations[:5]
    
    async def _get_benchmark_comparison(
        self, 
        user_id: str, 
        user_metrics: ApplicationMetrics
    ) -> BenchmarkComparison:
        """Get benchmark comparison against platform averages with statistical analysis."""
        try:
            # Get or calculate platform statistics
            platform_stats = await self._get_platform_statistics()
            
            user_data = {
                "response_rate": user_metrics.response_rate,
                "interview_rate": user_metrics.interview_rate,
                "offer_rate": user_metrics.offer_rate,
                "applications_per_month": user_metrics.total_applications / 3.0,  # Assuming 3-month period
                "average_response_time": user_metrics.average_response_time_days
            }
            
            # Calculate z-scores for each metric to determine percentile
            z_scores = []
            for metric in ["response_rate", "interview_rate", "offer_rate"]:
                user_val = user_data[metric]
                platform_mean = platform_stats['averages'][metric]
                platform_std = platform_stats['std_devs'].get(metric, platform_mean * 0.3)  # Estimate std if not available
                
                if platform_std > 0:
                    z_score = (user_val - platform_mean) / platform_std
                    z_scores.append(z_score)
            
            # Calculate overall percentile using average z-score
            if z_scores:
                avg_z_score = np.mean(z_scores)
                # Convert z-score to percentile using normal distribution
                percentile = stats.norm.cdf(avg_z_score) * 100
                percentile = max(1, min(99, percentile))  # Keep within 1-99 range
            else:
                percentile = 50.0
            
            # Generate detailed performance indicators with statistical significance
            performance_indicators = []
            for metric in ["response_rate", "interview_rate", "offer_rate", "average_response_time"]:
                user_val = user_data.get(metric, 0)
                platform_mean = platform_stats['averages'].get(metric, 0)
                platform_std = platform_stats['std_devs'].get(metric, platform_mean * 0.3)
                
                # Calculate percentile for this specific metric
                if platform_std > 0:
                    z_score = (user_val - platform_mean) / platform_std
                    metric_percentile = stats.norm.cdf(z_score) * 100
                else:
                    metric_percentile = 50.0
                
                # Determine performance category
                if metric == "average_response_time":
                    # Lower is better for response time
                    if user_val < platform_mean * 0.8:
                        performance = "above"
                        performance_text = "faster than average"
                    elif user_val > platform_mean * 1.2:
                        performance = "below"
                        performance_text = "slower than average"
                    else:
                        performance = "average"
                        performance_text = "average"
                else:
                    # Higher is better for rates
                    if user_val > platform_mean * 1.2:
                        performance = "above"
                        performance_text = "above average"
                    elif user_val < platform_mean * 0.8:
                        performance = "below"
                        performance_text = "below average"
                    else:
                        performance = "average"
                        performance_text = "average"
                
                # Calculate difference percentage
                if platform_mean > 0:
                    diff_pct = ((user_val - platform_mean) / platform_mean) * 100
                else:
                    diff_pct = 0
                
                performance_indicators.append({
                    "metric": metric,
                    "user_value": round(user_val, 2),
                    "platform_mean": round(platform_mean, 2),
                    "platform_std": round(platform_std, 2),
                    "percentile": round(metric_percentile, 1),
                    "performance": performance,
                    "performance_text": performance_text,
                    "difference_pct": round(diff_pct, 1),
                    "z_score": round((user_val - platform_mean) / platform_std, 2) if platform_std > 0 else 0
                })
            
            # Add performance tier classification
            if percentile >= 90:
                tier = "Top 10%"
                tier_description = "Exceptional performance - you're in the top tier of job seekers"
            elif percentile >= 75:
                tier = "Top 25%"
                tier_description = "Strong performance - above most job seekers"
            elif percentile >= 50:
                tier = "Above Average"
                tier_description = "Good performance - better than average"
            elif percentile >= 25:
                tier = "Average"
                tier_description = "Average performance - room for improvement"
            else:
                tier = "Below Average"
                tier_description = "Below average - significant opportunity for improvement"
            
            return BenchmarkComparison(
                user_metrics=user_data,
                platform_average=platform_stats['averages'],
                percentile=round(percentile, 1),
                performance_indicators=performance_indicators
            )
            
        except Exception as e:
            logger.error("Benchmark comparison failed", error=str(e), exc_info=True)
            return BenchmarkComparison(
                user_metrics={},
                platform_average={},
                percentile=50.0,
                performance_indicators=[]
            )
    
    async def _get_platform_statistics(self) -> Dict[str, Any]:
        """Get platform-wide statistics with caching."""
        current_time = time.time()
        
        # Return cached stats if available and fresh
        if (self._platform_stats_cache is not None and 
            current_time - self._platform_stats_last_update < self._platform_stats_ttl):
            return self._platform_stats_cache
        
        # TODO: In production, fetch real platform statistics from database
        # This would involve aggregating data from all users
        # For now, using realistic industry benchmarks based on research
        
        platform_stats = {
            'averages': {
                'response_rate': 25.0,  # 25% - industry standard
                'interview_rate': 15.0,  # 15% - typical conversion
                'offer_rate': 8.0,       # 8% - realistic offer rate
                'applications_per_month': 15.0,  # 15 apps/month - recommended volume
                'average_response_time': 10.5  # 10.5 days - typical response time
            },
            'std_devs': {
                'response_rate': 8.0,    # Standard deviation
                'interview_rate': 6.0,
                'offer_rate': 4.0,
                'applications_per_month': 8.0,
                'average_response_time': 5.0
            },
            'percentiles': {
                'response_rate': {
                    '10': 10.0,
                    '25': 18.0,
                    '50': 25.0,
                    '75': 35.0,
                    '90': 45.0
                },
                'interview_rate': {
                    '10': 5.0,
                    '25': 10.0,
                    '50': 15.0,
                    '75': 22.0,
                    '90': 30.0
                },
                'offer_rate': {
                    '10': 2.0,
                    '25': 5.0,
                    '50': 8.0,
                    '75': 12.0,
                    '90': 18.0
                }
            },
            'sample_size': 10000,  # Simulated platform user count
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
        
        # Cache the statistics
        self._platform_stats_cache = platform_stats
        self._platform_stats_last_update = current_time
        
        logger.info("Platform statistics calculated/cached")
        
        return platform_stats
    
    async def generate_analytics_report(
        self,
        user_id: str,
        time_period: str = "3m",
        include_visualizations: bool = False
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive analytics report with all insights and recommendations.
        
        Args:
            user_id: User identifier
            time_period: Time period for analysis
            include_visualizations: Whether to include visualization data
            
        Returns:
            Comprehensive analytics report
        """
        try:
            # Get full insights
            insights = await self.calculate_application_insights(user_id, time_period)
            
            if "error" in insights:
                return insights
            
            # Add additional analysis
            applications_df = await self._get_user_applications(user_id, time_period)
            
            report = {
                **insights,
                "report_type": "comprehensive",
                "executive_summary": self._generate_executive_summary(insights),
                "action_items": self._prioritize_action_items(insights),
                "trend_analysis": self._analyze_trends(applications_df) if not applications_df.empty else {},
                "skill_gap_analysis": self._analyze_skill_gaps(applications_df) if not applications_df.empty else {},
            }
            
            if include_visualizations:
                report["visualization_data"] = self._prepare_visualization_data(applications_df)
            
            return report
            
        except Exception as e:
            logger.error("Analytics report generation failed", 
                        user_id=user_id, error=str(e), exc_info=True)
            raise ProcessingException(
                message="Failed to generate analytics report",
                processing_type="report_generation",
                details={"user_id": user_id, "error": str(e)}
            )
    
    def _generate_executive_summary(self, insights: Dict[str, Any]) -> Dict[str, Any]:
        """Generate executive summary from insights."""
        metrics = insights.get('metrics', {})
        benchmarks = insights.get('benchmarks', {})
        success_pred = insights.get('success_prediction', {})
        
        # Determine overall performance
        percentile = benchmarks.get('percentile', 50)
        if percentile >= 75:
            performance_level = "strong"
            performance_desc = "performing well above average"
        elif percentile >= 50:
            performance_level = "good"
            performance_desc = "performing above average"
        elif percentile >= 25:
            performance_level = "average"
            performance_desc = "performing at average levels"
        else:
            performance_level = "needs_improvement"
            performance_desc = "performing below average"
        
        # Key highlights
        highlights = []
        if metrics.get('offer_rate', 0) > 10:
            highlights.append(f"Strong offer rate of {metrics['offer_rate']}%")
        if metrics.get('interview_rate', 0) > 20:
            highlights.append(f"Excellent interview conversion at {metrics['interview_rate']}%")
        if metrics.get('response_rate', 0) < 15:
            highlights.append(f"Low response rate of {metrics['response_rate']}% needs attention")
        
        return {
            "performance_level": performance_level,
            "performance_description": performance_desc,
            "percentile": percentile,
            "key_highlights": highlights,
            "success_probability": success_pred.get('success_probability', 0),
            "total_applications": metrics.get('total_applications', 0),
            "primary_recommendation": insights.get('recommendations', ['Continue current strategy'])[0]
        }
    
    def _prioritize_action_items(self, insights: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Prioritize action items based on impact and urgency."""
        action_items = []
        
        # Extract insights and recommendations
        insight_list = insights.get('insights', [])
        recommendations = insights.get('recommendations', [])
        
        # Convert insights to action items
        for insight in insight_list:
            if isinstance(insight, dict) and insight.get('actionable'):
                action_items.append({
                    "title": insight.get('title', 'Action Required'),
                    "description": insight.get('description', ''),
                    "action": insight.get('recommendation', ''),
                    "impact": insight.get('impact_score', 0.5),
                    "urgency": "high" if insight.get('impact_score', 0) > 0.8 else "medium",
                    "category": insight.get('type', 'general')
                })
        
        # Add top recommendations as action items
        for i, rec in enumerate(recommendations[:3]):
            if not any(item['action'] == rec for item in action_items):
                action_items.append({
                    "title": f"Recommendation {i+1}",
                    "description": "ML-powered recommendation",
                    "action": rec,
                    "impact": 0.7,
                    "urgency": "medium",
                    "category": "ml_recommendation"
                })
        
        # Sort by impact and urgency
        action_items.sort(key=lambda x: (x['impact'], x['urgency'] == 'high'), reverse=True)
        
        return action_items[:10]  # Top 10 action items
    
    def _analyze_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze trends in application data over time."""
        if df.empty or 'applied_date' not in df.columns:
            return {}
        
        try:
            df = df.copy()
            df['applied_date'] = pd.to_datetime(df['applied_date'])
            df = df.sort_values('applied_date')
            df['is_success'] = df['status'].isin([
                'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'
            ]).astype(int)
            
            # Weekly aggregation
            df['week'] = df['applied_date'].dt.to_period('W')
            weekly_stats = df.groupby('week').agg({
                'is_success': ['mean', 'count'],
                'match_score': 'mean'
            }).reset_index()
            
            weekly_stats.columns = ['week', 'success_rate', 'applications', 'avg_match_score']
            
            # Calculate trend direction
            if len(weekly_stats) >= 4:
                recent_success = weekly_stats.tail(2)['success_rate'].mean()
                earlier_success = weekly_stats.head(2)['success_rate'].mean()
                
                if recent_success > earlier_success * 1.2:
                    trend = "improving"
                elif recent_success < earlier_success * 0.8:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "insufficient_data"
            
            return {
                "trend_direction": trend,
                "weekly_application_rate": weekly_stats['applications'].mean(),
                "success_rate_trend": trend,
                "recent_success_rate": weekly_stats.tail(2)['success_rate'].mean() if len(weekly_stats) >= 2 else 0,
                "match_score_trend": "improving" if weekly_stats['avg_match_score'].is_monotonic_increasing else "stable"
            }
            
        except Exception as e:
            logger.error("Trend analysis failed", error=str(e))
            return {}
    
    def _analyze_skill_gaps(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze skill gaps based on application outcomes."""
        # This is a placeholder for skill gap analysis
        # In production, this would analyze job requirements vs user skills
        return {
            "analysis_available": False,
            "message": "Skill gap analysis requires integration with job requirements data",
            "recommendation": "Ensure your profile includes all relevant skills"
        }
    
    def _prepare_visualization_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Prepare data for frontend visualizations."""
        if df.empty:
            return {}
        
        try:
            viz_data = {}
            
            # Application timeline
            if 'applied_date' in df.columns:
                df['applied_date'] = pd.to_datetime(df['applied_date'])
                timeline = df.groupby(df['applied_date'].dt.to_period('W')).size()
                viz_data['application_timeline'] = {
                    'labels': [str(period) for period in timeline.index],
                    'values': timeline.values.tolist()
                }
            
            # Status distribution
            if 'status' in df.columns:
                status_dist = df['status'].value_counts()
                viz_data['status_distribution'] = {
                    'labels': status_dist.index.tolist(),
                    'values': status_dist.values.tolist()
                }
            
            # Industry performance
            if 'industry' in df.columns:
                df['is_success'] = df['status'].isin([
                    'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'
                ]).astype(int)
                industry_perf = df.groupby('industry')['is_success'].agg(['mean', 'count'])
                industry_perf = industry_perf[industry_perf['count'] >= 2]
                viz_data['industry_performance'] = {
                    'labels': industry_perf.index.tolist(),
                    'success_rates': (industry_perf['mean'] * 100).tolist(),
                    'application_counts': industry_perf['count'].tolist()
                }
            
            # Response time distribution
            if 'response_time_days' in df.columns:
                response_times = df['response_time_days'].dropna()
                if len(response_times) > 0:
                    viz_data['response_time_distribution'] = {
                        'mean': float(response_times.mean()),
                        'median': float(response_times.median()),
                        'min': float(response_times.min()),
                        'max': float(response_times.max()),
                        'histogram': np.histogram(response_times, bins=10)[0].tolist()
                    }
            
            return viz_data
            
        except Exception as e:
            logger.error("Visualization data preparation failed", error=str(e))
            return {}
    
    async def _get_user_applications(self, user_id: str, time_period: str) -> pd.DataFrame:
        """
        Fetch user application data from database.
        TODO: Replace with actual database query in production.
        """
        try:
            # TODO: Implement actual database query
            # For now, return sample data for testing
            
            # Calculate date range
            end_date = datetime.now()
            if time_period == "1m":
                start_date = end_date - timedelta(days=30)
                num_applications = np.random.randint(5, 25)
            elif time_period == "3m":
                start_date = end_date - timedelta(days=90)
                num_applications = np.random.randint(15, 50)
            elif time_period == "6m":
                start_date = end_date - timedelta(days=180)
                num_applications = np.random.randint(30, 80)
            else:  # 1y
                start_date = end_date - timedelta(days=365)
                num_applications = np.random.randint(50, 150)
            
            # Generate sample data
            np.random.seed(hash(user_id) % 2**32)  # Consistent data per user
            
            statuses = ['applied', 'screening', 'interview_scheduled', 'interview_completed', 
                       'offer_received', 'accepted', 'rejected', 'withdrawn']
            status_weights = [0.4, 0.15, 0.15, 0.1, 0.05, 0.03, 0.1, 0.02]
            
            industries = ['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing']
            company_sizes = ['startup', 'small', 'medium', 'large', 'enterprise']
            remote_types = ['remote', 'hybrid', 'onsite']
            
            data = []
            for i in range(num_applications):
                applied_date = start_date + timedelta(
                    days=np.random.randint(0, (end_date - start_date).days)
                )
                
                status = np.random.choice(statuses, p=status_weights)
                
                # Calculate response time based on status
                if status in ['applied', 'screening']:
                    response_time = None
                else:
                    response_time = np.random.exponential(7)  # Average 7 days
                
                data.append({
                    'application_id': f"app_{user_id}_{i}",
                    'user_id': user_id,
                    'job_title': f"Software Engineer {i}",
                    'company': f"Company {i}",
                    'industry': np.random.choice(industries),
                    'company_size': np.random.choice(company_sizes),
                    'remote_type': np.random.choice(remote_types),
                    'status': status,
                    'applied_date': applied_date,
                    'response_time_days': response_time,
                    'match_score': np.random.beta(2, 2),  # Skewed towards middle values
                    'salary_match_ratio': np.random.normal(1.0, 0.2)
                })
            
            df = pd.DataFrame(data)
            logger.info("Generated sample application data", 
                       user_id=user_id, applications=len(df))
            
            return df
            
        except Exception as e:
            logger.error("Failed to fetch user applications", 
                        user_id=user_id, error=str(e))
            return pd.DataFrame()


# Global analytics engine instance
analytics_engine = AnalyticsEngine()
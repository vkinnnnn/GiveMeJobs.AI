 # Design Document - GiveMeJobs Platform Improvements

## Overview

This design document outlines the comprehensive improvement of the GiveMeJobs.AI platform through a hybrid Node.js/Python architecture. The design focuses on enhancing code quality, implementing advanced AI/ML capabilities, optimizing performance, and ensuring production readiness. The approach maintains the existing Node.js backend as the API gateway and core service orchestrator while introducing Python microservices for AI/ML processing, analytics, and data-intensive operations.

### Key Design Principles

- **Hybrid Architecture**: Leverage Node.js for I/O-intensive operations and Python for AI/ML processing
- **Microservices**: Separate concerns into focused, independently scalable services
- **Clean Architecture**: Implement repository patterns, dependency injection, and SOLID principles
- **Performance First**: Sub-2-second API responses with intelligent caching strategies
- **Type Safety**: Comprehensive TypeScript usage with runtime validation
- **Observability**: Distributed tracing, structured logging, and comprehensive monitoring

## Architecture

### High-Level Hybrid Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Next.js Frontend]
        MOBILE[React Native Mobile]
    end
    
    subgraph "API Gateway Layer (Node.js)"
        GATEWAY[Express.js API Gateway]
        AUTH[Authentication Service]
        RATE[Rate Limiting]
        CORS[CORS & Security]
    end
    
    subgraph "Node.js Core Services"
        USER[User Service]
        JOB[Job Service]
        APP[Application Service]
        NOTIF[Notification Service]
    end
    
    subgraph "Python AI/ML Services"
        DOC[Document Processing Service]
        SEMANTIC[Semantic Search Service]
        ANALYTICS[Analytics Engine]
        ETL[ETL Pipeline Service]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        MONGO[(MongoDB)]
        REDIS[(Redis)]
        PINECONE[(Pinecone Vector DB)]
    end
    
    subgraph "External Services"
        OPENAI[OpenAI API]
        LINKEDIN[LinkedIn API]
        INDEED[Indeed API]
        SENTRY[Sentry]
    end
    
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    GATEWAY --> AUTH
    GATEWAY --> USER
    GATEWAY --> JOB
    GATEWAY --> APP
    GATEWAY --> NOTIF
    
    USER --> DOC
    JOB --> SEMANTIC
    APP --> ANALYTICS
    
    DOC --> OPENAI
    DOC --> MONGO
    SEMANTIC --> PINECONE
    ANALYTICS --> POSTGRES
    ETL --> LINKEDIN
    ETL --> INDEED
    
    USER --> POSTGRES
    JOB --> REDIS
    APP --> POSTGRES
    NOTIF --> REDIS
```

### Technology Stack Enhancement

**Python Backend (Primary):**
- Framework: FastAPI with async/await for high-performance APIs
- Type Safety: Pydantic v2 models with comprehensive validation
- Dependency Injection: FastAPI's built-in DI system with dependency providers
- ORM: SQLAlchemy 2.0 with async support and repository pattern
- Testing: pytest with pytest-asyncio and comprehensive fixtures
- Logging: structlog for structured logging with correlation IDs

**Python AI/ML Services:**
- AI/ML: LangChain, OpenAI, scikit-learn, transformers
- Data Processing: Pandas, NumPy, Polars for performance
- Task Queue: Celery with Redis broker and asyncio integration
- Vector Search: Pinecone with async client
- Caching: Redis with redis-py async client
- Monitoring: OpenTelemetry with Jaeger tracing

**Node.js Gateway (Simplified):**
- Framework: Express.js as lightweight API gateway
- Primary Role: Request routing, rate limiting, CORS
- Authentication: JWT validation and forwarding
- Minimal business logic - delegates to Python services

**Enhanced Infrastructure:**
- Container Orchestration: Docker with multi-stage Python builds + Kubernetes with Helm
- Service Mesh: Istio with Python-native service discovery
- Monitoring: Prometheus + Grafana + Jaeger with OpenTelemetry Python SDK
- CI/CD: GitHub Actions with Python-specific workflows and quality gates
- Infrastructure: Pulumi with Python SDK or Terraform with Python providers
- Security: Python security scanning with bandit, safety, and semgrep
## Co
mponents and Interfaces

### 1. Enhanced Python Backend Architecture

#### Repository Pattern Implementation with Pydantic and SQLAlchemy

**Base Repository Interface:**
```python
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List, Dict, Any
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar('T', bound=BaseModel)
ID = TypeVar('ID')

class QueryCriteria(BaseModel):
    where: Optional[Dict[str, Any]] = None
    order_by: Optional[Dict[str, str]] = None  # field: 'asc' | 'desc'
    limit: Optional[int] = None
    offset: Optional[int] = None

class IRepository(ABC, Generic[T, ID]):
    @abstractmethod
    async def find_by_id(self, id: ID) -> Optional[T]:
        pass
    
    @abstractmethod
    async def find_all(self, criteria: Optional[QueryCriteria] = None) -> List[T]:
        pass
    
    @abstractmethod
    async def create(self, entity: T) -> T:
        pass
    
    @abstractmethod
    async def update(self, id: ID, updates: Dict[str, Any]) -> Optional[T]:
        pass
    
    @abstractmethod
    async def delete(self, id: ID) -> bool:
        pass
    
    @abstractmethod
    async def count(self, criteria: Optional[QueryCriteria] = None) -> int:
        pass
```

**Concrete Repository Implementation:**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, func
from sqlalchemy.orm import selectinload
from redis.asyncio import Redis
import json
from typing import Optional, List, Dict, Any
import structlog

logger = structlog.get_logger()

class UserRepository(IRepository[User, str]):
    def __init__(self, db_session: AsyncSession, cache: Redis):
        self.db = db_session
        self.cache = cache
    
    async def find_by_id(self, id: str) -> Optional[User]:
        cache_key = f"user:{id}"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return User.model_validate_json(cached)
        
        # Query database
        stmt = select(UserModel).where(UserModel.id == id)
        result = await self.db.execute(stmt)
        user_model = result.scalar_one_or_none()
        
        if user_model:
            user = User.model_validate(user_model.__dict__)
            # Cache for 1 hour
            await self.cache.setex(cache_key, 3600, user.model_dump_json())
            return user
        
        return None
    
    async def create(self, user_data: User) -> User:
        async with self.db.begin():
            # Insert user
            stmt = insert(UserModel).values(
                email=user_data.email,
                password_hash=user_data.password_hash,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                professional_headline=user_data.professional_headline
            ).returning(UserModel)
            
            result = await self.db.execute(stmt)
            user_model = result.scalar_one()
            
            # Convert to Pydantic model
            created_user = User.model_validate(user_model.__dict__)
            
            # Invalidate related caches
            await self._invalidate_user_caches()
            
            logger.info("User created successfully", user_id=created_user.id)
            return created_user
    
    async def update(self, id: str, updates: Dict[str, Any]) -> Optional[User]:
        async with self.db.begin():
            stmt = (
                update(UserModel)
                .where(UserModel.id == id)
                .values(**updates)
                .returning(UserModel)
            )
            
            result = await self.db.execute(stmt)
            user_model = result.scalar_one_or_none()
            
            if user_model:
                updated_user = User.model_validate(user_model.__dict__)
                
                # Update cache
                cache_key = f"user:{id}"
                await self.cache.setex(cache_key, 3600, updated_user.model_dump_json())
                
                return updated_user
        
        return None
    
    async def _invalidate_user_caches(self):
        """Invalidate user-related cache patterns"""
        keys = await self.cache.keys("user:*")
        if keys:
            await self.cache.delete(*keys)
```

#### FastAPI Dependency Injection System

**Dependency Configuration:**
```python
from fastapi import Depends, FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from redis.asyncio import Redis
import structlog
from typing import AsyncGenerator

# Database setup
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Redis setup
redis_client = Redis.from_url("redis://localhost:6379", decode_responses=True)

# Logger setup
logger = structlog.get_logger()

# Dependency providers
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_redis() -> Redis:
    return redis_client

async def get_logger():
    return logger

# Repository dependencies
async def get_user_repository(
    db: AsyncSession = Depends(get_db_session),
    cache: Redis = Depends(get_redis)
) -> UserRepository:
    return UserRepository(db, cache)

# Service dependencies
async def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
    logger: structlog.BoundLogger = Depends(get_logger)
) -> UserService:
    return UserService(user_repo, logger)

# External service dependencies
async def get_openai_client():
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

async def get_document_service(
    openai_client = Depends(get_openai_client),
    logger = Depends(get_logger)
) -> DocumentProcessingService:
    return DocumentProcessingService(openai_client, logger)
```

**Service Layer with FastAPI DI:**
```python
from pydantic import ValidationError
import bcrypt
from typing import Union
import structlog

class UserService:
    def __init__(self, user_repo: UserRepository, logger: structlog.BoundLogger):
        self.user_repo = user_repo
        self.logger = logger
    
    async def create_user(self, user_data: CreateUserRequest) -> Union[User, ValidationError]:
        try:
            # Pydantic automatically validates input
            # Check if user exists
            existing_user = await self.user_repo.find_by_email(user_data.email)
            if existing_user:
                raise ValidationError("Email already exists")
            
            # Hash password
            password_hash = bcrypt.hashpw(
                user_data.password.encode('utf-8'), 
                bcrypt.gensalt()
            ).decode('utf-8')
            
            # Create user
            user = User(
                email=user_data.email,
                password_hash=password_hash,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                professional_headline=user_data.professional_headline
            )
            
            created_user = await self.user_repo.create(user)
            
            # Generate initial skill score asynchronously
            await self._calculate_initial_skill_score(created_user.id)
            
            self.logger.info("User created successfully", user_id=created_user.id)
            return created_user
            
        except ValidationError as e:
            self.logger.error("User creation validation failed", error=str(e))
            raise
        except Exception as e:
            self.logger.error("Failed to create user", error=str(e))
            raise

    async def _calculate_initial_skill_score(self, user_id: str):
        """Calculate initial skill score using background task"""
        try:
            # This would typically be a Celery task
            from tasks.skill_scoring import calculate_initial_score
            calculate_initial_score.delay(user_id)
        except Exception as e:
            self.logger.warning("Failed to queue skill score calculation", 
                              user_id=user_id, error=str(e))

# FastAPI endpoint using dependency injection
@app.post("/users", response_model=UserResponse)
async def create_user(
    user_data: CreateUserRequest,
    user_service: UserService = Depends(get_user_service)
):
    try:
        user = await user_service.create_user(user_data)
        return UserResponse.model_validate(user)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
```

#### Enhanced Error Handling

**Result Type Implementation:**
```typescript
class Result<T, E = Error> {
  private constructor(
    private readonly _success: boolean,
    private readonly _data?: T,
    private readonly _error?: E
  ) {}

  static success<T>(data: T): Result<T, never> {
    return new Result(true, data);
  }

  static error<E>(error: E): Result<never, E> {
    return new Result(false, undefined, error);
  }

  get success(): boolean {
    return this._success;
  }

  get data(): T {
    if (!this._success) {
      throw new Error('Cannot access data on failed result');
    }
    return this._data!;
  }

  get error(): E {
    if (this._success) {
      throw new Error('Cannot access error on successful result');
    }
    return this._error!;
  }

  map<U>(fn: (data: T) => U): Result<U, E> {
    if (this._success) {
      return Result.success(fn(this._data!));
    }
    return Result.error(this._error!);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (!this._success) {
      return Result.error(fn(this._error!));
    }
    return Result.success(this._data!);
  }
}
```

**Global Error Handler:**
```typescript
class ErrorHandler {
  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.SentryService) private sentry: SentryService
  ) {}

  handle(error: Error, req: Request, res: Response, next: NextFunction): void {
    const correlationId = req.headers['x-correlation-id'] as string;
    
    const errorResponse = {
      error: {
        code: this.getErrorCode(error),
        message: this.getUserMessage(error),
        correlationId,
        timestamp: new Date().toISOString()
      }
    };

    // Log with context
    this.logger.error('Request failed', {
      error: error.message,
      stack: error.stack,
      correlationId,
      userId: req.user?.id,
      path: req.path,
      method: req.method
    });

    // Report to Sentry
    this.sentry.captureException(error, {
      user: { id: req.user?.id },
      tags: { correlationId },
      extra: { path: req.path, method: req.method }
    });

    res.status(this.getStatusCode(error)).json(errorResponse);
  }

  private getErrorCode(error: Error): string {
    if (error instanceof ValidationError) return 'VALIDATION_ERROR';
    if (error instanceof NotFoundError) return 'NOT_FOUND';
    if (error instanceof UnauthorizedError) return 'UNAUTHORIZED';
    return 'INTERNAL_ERROR';
  }
}
```

### 2. Python AI/ML Services Architecture

#### Document Processing Service

**Service Structure:**
```python
# services/document_processor.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from langchain.document_loaders import PDFPlumberLoader, UnstructuredWordDocumentLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings.openai import OpenAIEmbeddings
import openai
from typing import Dict, List, Optional
import structlog

logger = structlog.get_logger()

class DocumentProcessingService:
    def __init__(self):
        self.openai_client = openai.AsyncOpenAI()
        self.embeddings = OpenAIEmbeddings()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

    async def generate_resume(
        self, 
        user_profile: Dict, 
        job_posting: str,
        template_id: Optional[str] = None
    ) -> Dict:
        """AI-powered resume generation with context awareness"""
        try:
            # Extract job requirements
            job_requirements = await self._extract_job_requirements(job_posting)
            
            # Build context-aware prompt
            prompt = self._build_resume_prompt(user_profile, job_requirements)
            
            # Generate resume content
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2000
            )
            
            resume_content = response.choices[0].message.content
            
            # Apply template formatting
            formatted_resume = await self._apply_template(
                resume_content, 
                template_id
            )
            
            logger.info("Resume generated successfully", 
                       user_id=user_profile.get('id'),
                       job_id=job_posting.get('id'))
            
            return {
                "content": formatted_resume,
                "metadata": {
                    "word_count": len(resume_content.split()),
                    "generation_time": response.usage.total_tokens,
                    "template_id": template_id
                }
            }
            
        except Exception as e:
            logger.error("Resume generation failed", error=str(e))
            raise HTTPException(status_code=500, detail="Resume generation failed")

    async def _extract_job_requirements(self, job_posting: str) -> Dict:
        """Extract structured requirements from job description"""
        prompt = f"""
        Extract the following information from this job posting:
        - Required skills (technical and soft skills)
        - Years of experience required
        - Education requirements
        - Key responsibilities
        - Company culture indicators
        
        Job Posting: {job_posting}
        
        Return as structured JSON.
        """
        
        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        return json.loads(response.choices[0].message.content)

    def _build_resume_prompt(self, user_profile: Dict, job_requirements: Dict) -> str:
        """Build context-aware prompt for resume generation"""
        return f"""
        Generate a professional resume tailored for this specific job opportunity.
        
        User Profile:
        - Skills: {user_profile.get('skills', [])}
        - Experience: {user_profile.get('experience', [])}
        - Education: {user_profile.get('education', [])}
        - Achievements: {user_profile.get('achievements', [])}
        
        Job Requirements:
        - Required Skills: {job_requirements.get('required_skills', [])}
        - Experience Level: {job_requirements.get('experience_years', 'Not specified')}
        - Key Responsibilities: {job_requirements.get('responsibilities', [])}
        
        Instructions:
        1. Highlight relevant experience that matches job requirements
        2. Emphasize skills that appear in the job posting
        3. Use action verbs and quantifiable achievements
        4. Maintain professional tone and ATS-friendly formatting
        5. Keep to 1-2 pages maximum
        
        Generate the resume content in a structured format with clear sections.
        """
```

#### Semantic Search Service

**Vector Search Implementation:**
```python
# services/semantic_search.py
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Pinecone
import pinecone
from typing import List, Dict, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SemanticSearchService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        pinecone.init(
            api_key=os.getenv("PINECONE_API_KEY"),
            environment=os.getenv("PINECONE_ENVIRONMENT")
        )
        self.index = pinecone.Index("jobs-index")
        
    async def find_matching_jobs(
        self, 
        user_profile: Dict, 
        top_k: int = 10,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """Semantic search with vector embeddings"""
        try:
            # Generate user profile embedding
            profile_text = self._create_profile_text(user_profile)
            profile_embedding = await self.embeddings.aembed_query(profile_text)
            
            # Search similar jobs
            search_results = self.index.query(
                vector=profile_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filters
            )
            
            # Enhance results with additional scoring
            enhanced_results = []
            for match in search_results.matches:
                job_data = match.metadata
                
                # Calculate composite score
                semantic_score = match.score
                traditional_score = self._calculate_traditional_match(
                    user_profile, job_data
                )
                
                composite_score = (semantic_score * 0.6) + (traditional_score * 0.4)
                
                enhanced_results.append({
                    "job_id": match.id,
                    "semantic_score": semantic_score,
                    "traditional_score": traditional_score,
                    "composite_score": composite_score,
                    "job_data": job_data,
                    "match_explanation": self._generate_match_explanation(
                        user_profile, job_data, semantic_score
                    )
                })
            
            # Sort by composite score
            enhanced_results.sort(key=lambda x: x["composite_score"], reverse=True)
            
            return enhanced_results
            
        except Exception as e:
            logger.error("Semantic search failed", error=str(e))
            raise HTTPException(status_code=500, detail="Search failed")

    def _create_profile_text(self, user_profile: Dict) -> str:
        """Convert user profile to searchable text"""
        skills = ", ".join(user_profile.get('skills', []))
        experience = self._format_experience(user_profile.get('experience', []))
        education = self._format_education(user_profile.get('education', []))
        
        return f"""
        Skills: {skills}
        Experience: {experience}
        Education: {education}
        Career Goals: {user_profile.get('career_goals', '')}
        """

    def _calculate_traditional_match(
        self, 
        user_profile: Dict, 
        job_data: Dict
    ) -> float:
        """Calculate traditional matching score based on exact criteria"""
        score = 0.0
        
        # Skill matching
        user_skills = set(skill.lower() for skill in user_profile.get('skills', []))
        job_skills = set(skill.lower() for skill in job_data.get('required_skills', []))
        
        if job_skills:
            skill_match = len(user_skills.intersection(job_skills)) / len(job_skills)
            score += skill_match * 0.4
        
        # Experience matching
        user_years = user_profile.get('years_experience', 0)
        required_years = job_data.get('required_experience_years', 0)
        
        if required_years > 0:
            exp_match = min(user_years / required_years, 1.0)
            score += exp_match * 0.3
        
        # Location matching
        user_location = user_profile.get('preferred_locations', [])
        job_location = job_data.get('location', '')
        
        if any(loc.lower() in job_location.lower() for loc in user_location):
            score += 0.2
        
        # Salary matching
        user_salary_min = user_profile.get('salary_expectation_min', 0)
        job_salary_max = job_data.get('salary_max', 0)
        
        if job_salary_max >= user_salary_min:
            score += 0.1
        
        return min(score, 1.0)
```

#### Analytics Engine

**Advanced Analytics Implementation:**
```python
# services/analytics_engine.py
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
from typing import Dict, List, Tuple
import asyncio

class AnalyticsEngine:
    def __init__(self):
        self.models = {}
        self.encoders = {}
        
    async def calculate_application_insights(
        self, 
        user_id: str,
        time_period: str = "3m"
    ) -> Dict:
        """Advanced analytics on application patterns"""
        try:
            # Fetch user application data
            applications_df = await self._get_user_applications(user_id, time_period)
            
            if applications_df.empty:
                return {"error": "No application data available"}
            
            # Calculate basic metrics
            basic_metrics = self._calculate_basic_metrics(applications_df)
            
            # Generate insights
            insights = await self._generate_insights(applications_df, user_id)
            
            # Predict success probability
            success_prediction = await self._predict_success_probability(
                user_id, applications_df
            )
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(
                applications_df, insights, success_prediction
            )
            
            return {
                "metrics": basic_metrics,
                "insights": insights,
                "success_prediction": success_prediction,
                "recommendations": recommendations,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Analytics calculation failed", 
                        user_id=user_id, error=str(e))
            raise HTTPException(status_code=500, detail="Analytics calculation failed")

    def _calculate_basic_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate basic application metrics"""
        total_applications = len(df)
        
        if total_applications == 0:
            return {}
        
        # Response rate
        responses = df[df['status'].isin(['interview_scheduled', 'offer_received', 'accepted'])]
        response_rate = len(responses) / total_applications
        
        # Interview rate
        interviews = df[df['status'].isin(['interview_scheduled', 'interview_completed', 'offer_received', 'accepted'])]
        interview_rate = len(interviews) / total_applications
        
        # Offer rate
        offers = df[df['status'].isin(['offer_received', 'accepted'])]
        offer_rate = len(offers) / total_applications
        
        # Average response time
        response_times = df[df['response_time_days'].notna()]['response_time_days']
        avg_response_time = response_times.mean() if not response_times.empty else 0
        
        return {
            "total_applications": total_applications,
            "response_rate": round(response_rate * 100, 2),
            "interview_rate": round(interview_rate * 100, 2),
            "offer_rate": round(offer_rate * 100, 2),
            "average_response_time_days": round(avg_response_time, 1)
        }

    async def _predict_success_probability(
        self, 
        user_id: str, 
        applications_df: pd.DataFrame
    ) -> Dict:
        """Predict success rate using historical data and ML"""
        try:
            # Prepare features
            features = self._prepare_ml_features(applications_df)
            
            if len(features) < 10:  # Need minimum data for prediction
                return {"prediction": "insufficient_data"}
            
            # Load or train model
            model = await self._get_or_train_success_model(user_id)
            
            # Make prediction for next application
            latest_features = features.iloc[-1:].drop(['success'], axis=1)
            prediction_proba = model.predict_proba(latest_features)[0]
            
            return {
                "success_probability": round(prediction_proba[1] * 100, 2),
                "confidence": self._calculate_prediction_confidence(model, latest_features),
                "key_factors": self._get_feature_importance(model, latest_features.columns)
            }
            
        except Exception as e:
            logger.error("Success prediction failed", error=str(e))
            return {"prediction": "error", "error": str(e)}

    def _prepare_ml_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for ML model"""
        features_df = df.copy()
        
        # Create success target variable
        features_df['success'] = features_df['status'].isin([
            'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'
        ]).astype(int)
        
        # Feature engineering
        features_df['application_day_of_week'] = pd.to_datetime(features_df['applied_date']).dt.dayofweek
        features_df['application_hour'] = pd.to_datetime(features_df['applied_date']).dt.hour
        features_df['job_title_length'] = features_df['job_title'].str.len()
        features_df['company_size_encoded'] = self._encode_company_size(features_df['company_size'])
        features_df['industry_encoded'] = self._encode_categorical(features_df['industry'], 'industry')
        features_df['remote_type_encoded'] = self._encode_categorical(features_df['remote_type'], 'remote_type')
        
        # Select relevant features
        feature_columns = [
            'match_score', 'application_day_of_week', 'application_hour',
            'job_title_length', 'company_size_encoded', 'industry_encoded',
            'remote_type_encoded', 'salary_match_ratio', 'success'
        ]
        
        return features_df[feature_columns].dropna()

    async def _get_or_train_success_model(self, user_id: str) -> RandomForestClassifier:
        """Get existing model or train new one"""
        model_key = f"success_model_{user_id}"
        
        if model_key in self.models:
            return self.models[model_key]
        
        # Get training data (user + similar users)
        training_data = await self._get_training_data(user_id)
        
        if len(training_data) < 50:  # Use global model if insufficient user data
            model_key = "global_success_model"
            if model_key in self.models:
                return self.models[model_key]
            training_data = await self._get_global_training_data()
        
        # Train model
        X = training_data.drop(['success'], axis=1)
        y = training_data['success']
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        model.fit(X_train, y_train)
        
        # Cache model
        self.models[model_key] = model
        
        return model
```

### 3. Service Communication Architecture

#### HTTP Client with Circuit Breaker

**Python Service Client (Node.js):**
```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import CircuitBreaker from 'opossum';

interface PythonServiceConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  circuitBreakerOptions: CircuitBreakerOptions;
}

class PythonServiceClient {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;

  constructor(
    private config: PythonServiceConfig,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'nodejs-backend'
      }
    });

    this.setupInterceptors();
    this.setupCircuitBreaker();
  }

  private setupCircuitBreaker(): void {
    this.circuitBreaker = new CircuitBreaker(
      this.makeRequest.bind(this),
      {
        timeout: this.config.timeout,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        ...this.config.circuitBreakerOptions
      }
    );

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened for Python service');
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open for Python service');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed for Python service');
    });
  }

  async generateResume(
    userProfile: UserProfile,
    jobPosting: JobPosting,
    templateId?: string
  ): Promise<Result<GeneratedDocument, ServiceError>> {
    try {
      const response = await this.circuitBreaker.fire({
        method: 'POST',
        url: '/document/generate-resume',
        data: {
          user_profile: userProfile,
          job_posting: jobPosting,
          template_id: templateId
        }
      });

      return Result.success(response.data);
    } catch (error) {
      this.logger.error('Resume generation failed', { error, userProfile: userProfile.id });
      
      if (error.name === 'OpenCircuitError') {
        return Result.error(new ServiceUnavailableError('Document service temporarily unavailable'));
      }
      
      return Result.error(new ServiceError('Resume generation failed', error));
    }
  }

  async findMatchingJobs(
    userProfile: UserProfile,
    filters?: JobSearchFilters
  ): Promise<Result<JobMatch[], ServiceError>> {
    try {
      const response = await this.circuitBreaker.fire({
        method: 'POST',
        url: '/search/semantic-match',
        data: {
          user_profile: userProfile,
          filters: filters,
          top_k: 20
        }
      });

      return Result.success(response.data.matches);
    } catch (error) {
      this.logger.error('Semantic search failed', { error, userId: userProfile.id });
      
      // Fallback to traditional search
      if (error.name === 'OpenCircuitError') {
        this.logger.info('Falling back to traditional search');
        return this.fallbackToTraditionalSearch(userProfile, filters);
      }
      
      return Result.error(new ServiceError('Job matching failed', error));
    }
  }

  private async fallbackToTraditionalSearch(
    userProfile: UserProfile,
    filters?: JobSearchFilters
  ): Promise<Result<JobMatch[], ServiceError>> {
    // Implement traditional keyword-based search as fallback
    // This ensures the system remains functional even when Python services are down
    try {
      const traditionalMatches = await this.traditionalJobSearch(userProfile, filters);
      return Result.success(traditionalMatches);
    } catch (error) {
      return Result.error(new ServiceError('All search methods failed', error));
    }
  }
}
```

#### Inter-Service Authentication

**Service-to-Service JWT:**
```typescript
class ServiceAuthenticator {
  private serviceToken: string;
  private tokenExpiry: Date;

  constructor(
    private serviceId: string,
    private serviceSecret: string,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async getServiceToken(): Promise<string> {
    if (this.serviceToken && this.tokenExpiry > new Date()) {
      return this.serviceToken;
    }

    try {
      const payload = {
        service: this.serviceId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      };

      this.serviceToken = jwt.sign(payload, this.serviceSecret, {
        algorithm: 'HS256'
      });

      this.tokenExpiry = new Date(Date.now() + (55 * 60 * 1000)); // 55 minutes

      return this.serviceToken;
    } catch (error) {
      this.logger.error('Failed to generate service token', { error });
      throw new Error('Service authentication failed');
    }
  }

  async validateServiceToken(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.serviceSecret) as any;
      return decoded.service && this.isValidService(decoded.service);
    } catch (error) {
      this.logger.warn('Invalid service token', { error });
      return false;
    }
  }

  private isValidService(serviceId: string): boolean {
    const validServices = ['nodejs-backend', 'python-document-service', 'python-analytics'];
    return validServices.includes(serviceId);
  }
}
```## D
ata Models and Schemas

### Enhanced Pydantic Models

**Strict Type Definitions with Pydantic v2:**
```python
from pydantic import BaseModel, EmailStr, Field, validator, ConfigDict
from typing import Optional, List, Literal, Union
from datetime import datetime
from enum import Enum
import re

class SkillCategory(str, Enum):
    TECHNICAL = "technical"
    SOFT = "soft"
    LANGUAGE = "language"
    CERTIFICATION = "certification"
    INDUSTRY = "industry"

class User(BaseModel):
    model_config = ConfigDict(frozen=True, validate_assignment=True)
    
    id: str
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    professional_headline: Optional[str] = Field(None, max_length=255)
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    email_verified: bool = False
    mfa_enabled: bool = False
    password_hash: str = Field(..., exclude=True)  # Exclude from serialization

class Skill(BaseModel):
    model_config = ConfigDict(frozen=True)
    
    id: str
    name: str = Field(..., min_length=1, max_length=100)
    category: SkillCategory
    proficiency_level: Literal[1, 2, 3, 4, 5]
    years_of_experience: float = Field(..., ge=0, le=50)
    endorsements: int = Field(default=0, ge=0)
    last_used: Optional[datetime] = None

class UserProfile(BaseModel):
    model_config = ConfigDict(frozen=True)
    
    user_id: str
    skills: List[Skill] = Field(default_factory=list)
    experience: List['Experience'] = Field(default_factory=list)
    education: List['Education'] = Field(default_factory=list)
    preferences: 'UserPreferences'
    skill_score: float = Field(..., ge=0, le=100)
    last_calculated: datetime

# Request/Response models with validation
class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    professional_headline: Optional[str] = Field(None, max_length=255)
    
    @validator('password')
    def validate_password_strength(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])', v):
            raise ValueError(
                'Password must contain uppercase, lowercase, number, and special character'
            )
        return v
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        return v.strip()

class SkillRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: SkillCategory
    proficiency_level: Literal[1, 2, 3, 4, 5]
    years_of_experience: float = Field(..., ge=0, le=50)
    last_used: Optional[datetime] = None

# API Response models
class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional['ApiError'] = None
    metadata: Optional['ResponseMetadata'] = None

class ApiError(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    correlation_id: str

class ResponseMetadata(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"
    request_id: str
    processing_time_ms: float

# Response models
class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    professional_headline: Optional[str]
    created_at: datetime
    email_verified: bool
    mfa_enabled: bool
    # password_hash excluded automatically

class SkillResponse(BaseModel):
    id: str
    name: str
    category: SkillCategory
    proficiency_level: int
    years_of_experience: float
    endorsements: int
    last_used: Optional[datetime]
```

### Database Schema Enhancements

**Optimized PostgreSQL Schema:**
```sql
-- Enhanced users table with better indexing
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  professional_headline VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- Add constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0)
);

-- Performance indexes
CREATE INDEX CONCURRENTLY idx_users_email_verified ON users(email) WHERE email_verified = true;
CREATE INDEX CONCURRENTLY idx_users_last_login ON users(last_login DESC) WHERE last_login IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at DESC);

-- Enhanced skills table with better categorization
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category skill_category NOT NULL,
  proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
  years_of_experience DECIMAL(4,1) CHECK (years_of_experience >= 0),
  endorsements INTEGER DEFAULT 0 CHECK (endorsements >= 0),
  last_used DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate skills per user
  UNIQUE(user_id, name, category)
);

-- Skill category enum
CREATE TYPE skill_category AS ENUM ('technical', 'soft', 'language', 'certification', 'industry');

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_skills_user_category ON skills(user_id, category);
CREATE INDEX CONCURRENTLY idx_skills_name_category ON skills(name, category);
CREATE INDEX CONCURRENTLY idx_skills_proficiency ON skills(proficiency_level DESC, years_of_experience DESC);

-- Job matching optimization table
CREATE TABLE job_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  semantic_score DECIMAL(5,4) CHECK (semantic_score BETWEEN 0 AND 1),
  traditional_score DECIMAL(5,4) CHECK (traditional_score BETWEEN 0 AND 1),
  composite_score DECIMAL(5,4) CHECK (composite_score BETWEEN 0 AND 1),
  match_factors JSONB,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, job_id)
);

CREATE INDEX CONCURRENTLY idx_job_match_scores_composite ON job_match_scores(user_id, composite_score DESC);
CREATE INDEX CONCURRENTLY idx_job_match_scores_calculated ON job_match_scores(calculated_at DESC);

-- Analytics optimization tables
CREATE TABLE user_analytics_cache (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,
  insights JSONB,
  benchmarks JSONB,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX CONCURRENTLY idx_analytics_cache_expires ON user_analytics_cache(expires_at);
```

### MongoDB Schema Optimization

**Enhanced Document Schemas:**
```javascript
// Optimized resume template schema
{
  _id: ObjectId,
  name: String,
  description: String,
  category: {
    type: String,
    enum: ['modern', 'classic', 'creative', 'ats-friendly', 'executive'],
    required: true
  },
  sections: [{
    type: {
      type: String,
      enum: ['header', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
      required: true
    },
    title: String,
    order: {
      type: Number,
      min: 1,
      max: 20
    },
    required: Boolean,
    template: String,
    formatting: {
      fontSize: Number,
      fontWeight: String,
      color: String,
      spacing: Number
    }
  }],
  styling: {
    font: {
      type: String,
      default: 'Arial'
    },
    fontSize: {
      type: Number,
      min: 8,
      max: 16,
      default: 11
    },
    colors: {
      primary: String,
      secondary: String,
      accent: String
    },
    spacing: {
      lineHeight: Number,
      paragraphSpacing: Number,
      sectionSpacing: Number
    },
    layout: {
      type: String,
      enum: ['single-column', 'two-column', 'sidebar'],
      default: 'single-column'
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  usage_count: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

// Indexes for performance
db.resume_templates.createIndex({ "category": 1, "isPublic": 1 });
db.resume_templates.createIndex({ "rating.average": -1, "usage_count": -1 });
db.resume_templates.createIndex({ "createdBy": 1, "createdAt": -1 });

// Enhanced generated documents schema with versioning
{
  _id: ObjectId,
  userId: {
    type: String,
    required: true,
    index: true
  },
  jobId: {
    type: String,
    required: true,
    index: true
  },
  documentType: {
    type: String,
    enum: ['resume', 'cover-letter'],
    required: true
  },
  title: String,
  content: {
    sections: [{
      type: String,
      title: String,
      content: Schema.Types.Mixed,
      order: Number,
      wordCount: Number
    }],
    formatting: {
      template: String,
      styles: Schema.Types.Mixed
    }
  },
  templateId: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  parentDocumentId: String, // For versioning
  metadata: {
    wordCount: Number,
    keywordsUsed: [String],
    generationTime: Number,
    aiModel: String,
    promptVersion: String,
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  status: {
    type: String,
    enum: ['draft', 'generated', 'edited', 'finalized'],
    default: 'generated'
  },
  exports: [{
    format: {
      type: String,
      enum: ['pdf', 'docx', 'txt', 'html']
    },
    url: String,
    generatedAt: Date,
    fileSize: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

// Compound indexes for common queries
db.generated_documents.createIndex({ "userId": 1, "documentType": 1, "createdAt": -1 });
db.generated_documents.createIndex({ "jobId": 1, "documentType": 1 });
db.generated_documents.createIndex({ "status": 1, "createdAt": -1 });
```

## Error Handling and Resilience

### Comprehensive Error Strategy

**Error Classification:**
```typescript
// Error hierarchy
abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  abstract readonly isOperational: boolean;

  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly fields?: Record<string, string[]>,
    context?: Record<string, any>
  ) {
    super(message, context);
  }
}

class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';
  readonly isOperational = true;
}

class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly isOperational = true;
}

class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly service: string,
    public readonly originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message, context);
  }
}
```

**Retry Strategy with Exponential Backoff:**
```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

class RetryService {
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
  };

  async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === finalConfig.maxRetries) {
          break;
        }

        if (!this.isRetryable(error, finalConfig.retryableErrors)) {
          throw error;
        }

        const delay = Math.min(
          finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryable(error: Error, retryableErrors: string[]): boolean {
    return retryableErrors.some(code => 
      error.message.includes(code) || 
      (error as any).code === code
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Graceful Degradation

**Fallback Strategies:**
```typescript
class JobSearchService {
  constructor(
    @inject(TYPES.PythonServiceClient) private pythonClient: PythonServiceClient,
    @inject(TYPES.TraditionalSearchService) private traditionalSearch: TraditionalSearchService,
    @inject(TYPES.CacheService) private cache: CacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async searchJobs(
    userId: string,
    query: JobSearchQuery
  ): Promise<Result<JobSearchResult, ServiceError>> {
    const cacheKey = `job_search:${userId}:${JSON.stringify(query)}`;
    
    try {
      // Try semantic search first
      const semanticResult = await this.pythonClient.findMatchingJobs(userId, query);
      
      if (semanticResult.success) {
        await this.cache.set(cacheKey, semanticResult.data, 300); // 5 min cache
        return semanticResult;
      }
    } catch (error) {
      this.logger.warn('Semantic search failed, falling back to traditional search', {
        userId,
        error: error.message
      });
    }

    try {
      // Fallback to traditional search
      const traditionalResult = await this.traditionalSearch.search(query);
      
      if (traditionalResult.success) {
        await this.cache.set(cacheKey, traditionalResult.data, 300);
        return traditionalResult;
      }
    } catch (error) {
      this.logger.warn('Traditional search failed, trying cache', {
        userId,
        error: error.message
      });
    }

    // Last resort: return cached results
    const cached = await this.cache.get<JobSearchResult>(cacheKey);
    if (cached) {
      this.logger.info('Returning cached search results', { userId });
      return Result.success({
        ...cached,
        fromCache: true,
        degradedService: true
      });
    }

    return Result.error(new ServiceUnavailableError('All search services unavailable'));
  }
}
```

## Testing Strategy

### Comprehensive Testing Approach

**Unit Testing with pytest and FastAPI:**
```python
import pytest
from unittest.mock import AsyncMock, Mock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

# Test fixtures
@pytest.fixture
def mock_db_session():
    return AsyncMock(spec=AsyncSession)

@pytest.fixture
def mock_redis():
    return AsyncMock()

@pytest.fixture
def mock_logger():
    return Mock()

@pytest.fixture
def user_repository(mock_db_session, mock_redis):
    return UserRepository(mock_db_session, mock_redis)

@pytest.fixture
def user_service(user_repository, mock_logger):
    return UserService(user_repository, mock_logger)

@pytest.fixture
def sample_user_data():
    return CreateUserRequest(
        email="test@example.com",
        password="SecurePass123!",
        first_name="John",
        last_name="Doe",
        professional_headline="Software Engineer"
    )

@pytest.fixture
def sample_user():
    return User(
        id="user123",
        email="test@example.com",
        first_name="John",
        last_name="Doe",
        professional_headline="Software Engineer",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        email_verified=False,
        mfa_enabled=False,
        password_hash="hashed_password"
    )

class TestUserService:
    @pytest.mark.asyncio
    async def test_create_user_success(self, user_service, user_repository, sample_user_data, sample_user):
        # Arrange
        user_repository.find_by_email = AsyncMock(return_value=None)
        user_repository.create = AsyncMock(return_value=sample_user)
        
        with patch('bcrypt.hashpw') as mock_hash:
            mock_hash.return_value = b'hashed_password'
            
            # Act
            result = await user_service.create_user(sample_user_data)
            
            # Assert
            assert result.email == sample_user_data.email
            assert result.first_name == sample_user_data.first_name
            user_repository.find_by_email.assert_called_once_with(sample_user_data.email)
            user_repository.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_email_exists(self, user_service, user_repository, sample_user_data, sample_user):
        # Arrange
        user_repository.find_by_email = AsyncMock(return_value=sample_user)
        
        # Act & Assert
        with pytest.raises(ValidationError, match="Email already exists"):
            await user_service.create_user(sample_user_data)
        
        user_repository.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_user_invalid_password(self, user_service):
        # Arrange
        invalid_user_data = CreateUserRequest(
            email="test@example.com",
            password="weak",  # Invalid password
            first_name="John",
            last_name="Doe"
        )
        
        # Act & Assert - Pydantic validation should catch this
        with pytest.raises(ValidationError):
            CreateUserRequest(**invalid_user_data.model_dump())

    @pytest.mark.asyncio
    async def test_skill_score_calculation_failure_handled_gracefully(
        self, user_service, user_repository, sample_user_data, sample_user, mock_logger
    ):
        # Arrange
        user_repository.find_by_email = AsyncMock(return_value=None)
        user_repository.create = AsyncMock(return_value=sample_user)
        
        with patch('bcrypt.hashpw') as mock_hash, \
             patch('tasks.skill_scoring.calculate_initial_score.delay') as mock_task:
            mock_hash.return_value = b'hashed_password'
            mock_task.side_effect = Exception("Task queue error")
            
            # Act
            result = await user_service.create_user(sample_user_data)
            
            # Assert
            assert result.email == sample_user_data.email  # User creation should still succeed
            mock_logger.warning.assert_called_once()

# FastAPI endpoint testing
class TestUserEndpoints:
    @pytest.mark.asyncio
    async def test_create_user_endpoint_success(self, async_client: AsyncClient, sample_user_data):
        # Arrange
        user_data = sample_user_data.model_dump()
        
        with patch('services.user_service.UserService.create_user') as mock_create:
            mock_user = User(
                id="user123",
                email=user_data["email"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                email_verified=False,
                mfa_enabled=False,
                password_hash="hashed"
            )
            mock_create.return_value = mock_user
            
            # Act
            response = await async_client.post("/users", json=user_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["email"] == user_data["email"]
            assert data["first_name"] == user_data["first_name"]
            assert "password_hash" not in data  # Should be excluded

    @pytest.mark.asyncio
    async def test_create_user_endpoint_validation_error(self, async_client: AsyncClient):
        # Arrange
        invalid_data = {
            "email": "invalid-email",
            "password": "weak",
            "first_name": "",
            "last_name": "Doe"
        }
        
        # Act
        response = await async_client.post("/users", json=invalid_data)
        
        # Assert
        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data
        assert len(data["detail"]) > 0  # Should have validation errors

# Conftest.py for shared fixtures
@pytest.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
```

**Integration Testing with pytest-postgresql and pytest-redis:**
```python
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import redis.asyncio as redis
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer

# Integration test fixtures
@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:15") as postgres:
        yield postgres

@pytest.fixture(scope="session")
def redis_container():
    with RedisContainer("redis:7") as redis_container:
        yield redis_container

@pytest.fixture(scope="session")
async def test_db_engine(postgres_container):
    database_url = postgres_container.get_connection_url().replace(
        "postgresql://", "postgresql+asyncpg://"
    )
    engine = create_async_engine(database_url, echo=True)
    
    # Run migrations
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    await engine.dispose()

@pytest.fixture
async def test_db_session(test_db_engine):
    async_session = async_sessionmaker(test_db_engine, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def test_redis_client(redis_container):
    redis_url = f"redis://{redis_container.get_container_host_ip()}:{redis_container.get_exposed_port(6379)}"
    client = redis.from_url(redis_url, decode_responses=True)
    yield client
    await client.flushall()
    await client.close()

@pytest.fixture
async def test_app(test_db_session, test_redis_client):
    # Override dependencies for testing
    app.dependency_overrides[get_db_session] = lambda: test_db_session
    app.dependency_overrides[get_redis] = lambda: test_redis_client
    
    yield app
    
    # Clean up
    app.dependency_overrides.clear()

class TestUserIntegration:
    @pytest.mark.asyncio
    async def test_create_user_full_flow(self, test_app, test_db_session):
        async with AsyncClient(app=test_app, base_url="http://test") as client:
            # Arrange
            user_data = {
                "email": "integration@test.com",
                "password": "SecurePass123!",
                "first_name": "Integration",
                "last_name": "Test",
                "professional_headline": "Test Engineer"
            }
            
            # Act
            response = await client.post("/users", json=user_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["email"] == user_data["email"]
            assert data["first_name"] == user_data["first_name"]
            
            # Verify user exists in database
            result = await test_db_session.execute(
                text("SELECT * FROM users WHERE email = :email"),
                {"email": user_data["email"]}
            )
            user_in_db = result.fetchone()
            
            assert user_in_db is not None
            assert user_in_db.email == user_data["email"]
            assert user_in_db.first_name == user_data["first_name"]

    @pytest.mark.asyncio
    async def test_user_caching_behavior(self, test_app, test_redis_client):
        async with AsyncClient(app=test_app, base_url="http://test") as client:
            # Create user
            user_data = {
                "email": "cache@test.com",
                "password": "SecurePass123!",
                "first_name": "Cache",
                "last_name": "Test"
            }
            
            create_response = await client.post("/users", json=user_data)
            user_id = create_response.json()["id"]
            
            # First request - should hit database
            response1 = await client.get(f"/users/{user_id}")
            assert response1.status_code == 200
            
            # Check if cached
            cache_key = f"user:{user_id}"
            cached_data = await test_redis_client.get(cache_key)
            assert cached_data is not None
            
            # Second request - should hit cache
            response2 = await client.get(f"/users/{user_id}")
            assert response2.status_code == 200
            assert response1.json() == response2.json()

    @pytest.mark.asyncio
    async def test_concurrent_user_creation(self, test_app):
        async with AsyncClient(app=test_app, base_url="http://test") as client:
            import asyncio
            
            # Create multiple users concurrently
            user_data_list = [
                {
                    "email": f"concurrent{i}@test.com",
                    "password": "SecurePass123!",
                    "first_name": f"User{i}",
                    "last_name": "Test"
                }
                for i in range(5)
            ]
            
            # Execute concurrent requests
            tasks = [
                client.post("/users", json=user_data)
                for user_data in user_data_list
            ]
            
            responses = await asyncio.gather(*tasks)
            
            # All should succeed
            for response in responses:
                assert response.status_code == 201
            
            # All should have unique IDs
            user_ids = [response.json()["id"] for response in responses]
            assert len(set(user_ids)) == len(user_ids)

# Performance testing
@pytest.mark.performance
class TestUserPerformance:
    @pytest.mark.asyncio
    async def test_user_creation_performance(self, test_app):
        async with AsyncClient(app=test_app, base_url="http://test") as client:
            import time
            
            user_data = {
                "email": "perf@test.com",
                "password": "SecurePass123!",
                "first_name": "Performance",
                "last_name": "Test"
            }
            
            start_time = time.time()
            response = await client.post("/users", json=user_data)
            end_time = time.time()
            
            # Should complete within 2 seconds (requirement)
            assert end_time - start_time < 2.0
            assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_user_retrieval_performance(self, test_app):
        async with AsyncClient(app=test_app, base_url="http://test") as client:
            # Create user first
            user_data = {
                "email": "retrieve@test.com",
                "password": "SecurePass123!",
                "first_name": "Retrieve",
                "last_name": "Test"
            }
            
            create_response = await client.post("/users", json=user_data)
            user_id = create_response.json()["id"]
            
            # Test retrieval performance
            import time
            start_time = time.time()
            
            response = await client.get(f"/users/{user_id}")
            
            end_time = time.time()
            
            # Should complete within 1 second
            assert end_time - start_time < 1.0
            assert response.status_code == 200
```

**Python Service Testing:**
```python
# tests/test_document_service.py
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from services.document_processor import DocumentProcessingService, app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_openai():
    with patch('openai.AsyncOpenAI') as mock:
        mock_client = Mock()
        mock.return_value = mock_client
        
        # Mock response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Generated resume content"
        mock_response.usage.total_tokens = 1500
        
        mock_client.chat.completions.create.return_value = mock_response
        yield mock_client

@pytest.fixture
def sample_user_profile():
    return {
        "id": "user123",
        "skills": ["Python", "FastAPI", "Machine Learning"],
        "experience": [
            {
                "company": "Tech Corp",
                "title": "Software Engineer",
                "duration": "2 years"
            }
        ],
        "education": [
            {
                "degree": "BS Computer Science",
                "institution": "University"
            }
        ]
    }

@pytest.fixture
def sample_job_posting():
    return {
        "id": "job123",
        "title": "Senior Python Developer",
        "description": "Looking for experienced Python developer with ML background",
        "requirements": ["Python", "Machine Learning", "FastAPI"]
    }

class TestDocumentProcessingService:
    def test_generate_resume_success(self, mock_openai, sample_user_profile, sample_job_posting):
        service = DocumentProcessingService()
        
        result = await service.generate_resume(
            sample_user_profile,
            sample_job_posting,
            template_id="modern-template"
        )
        
        assert "content" in result
        assert "metadata" in result
        assert result["metadata"]["word_count"] > 0
        assert result["metadata"]["template_id"] == "modern-template"
        
        # Verify OpenAI was called with correct parameters
        mock_openai.chat.completions.create.assert_called_once()
        call_args = mock_openai.chat.completions.create.call_args
        assert call_args[1]["model"] == "gpt-4"
        assert call_args[1]["temperature"] == 0.7

    def test_generate_resume_api_endpoint(self, client, mock_openai):
        request_data = {
            "user_profile": {
                "id": "user123",
                "skills": ["Python", "FastAPI"]
            },
            "job_posting": {
                "id": "job123",
                "title": "Python Developer"
            }
        }
        
        response = client.post("/document/generate-resume", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "metadata" in data

    def test_generate_resume_handles_openai_error(self, sample_user_profile, sample_job_posting):
        with patch('openai.AsyncOpenAI') as mock_openai:
            mock_openai.return_value.chat.completions.create.side_effect = Exception("API Error")
            
            service = DocumentProcessingService()
            
            with pytest.raises(HTTPException) as exc_info:
                await service.generate_resume(sample_user_profile, sample_job_posting)
            
            assert exc_info.value.status_code == 500
            assert "Resume generation failed" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_extract_job_requirements(self, mock_openai):
        service = DocumentProcessingService()
        
        # Mock structured response
        mock_openai.chat.completions.create.return_value.choices[0].message.content = '''
        {
            "required_skills": ["Python", "FastAPI", "PostgreSQL"],
            "experience_years": 3,
            "education_requirements": "Bachelor's degree",
            "responsibilities": ["Develop APIs", "Database design"],
            "culture_indicators": ["Remote-friendly", "Agile"]
        }
        '''
        
        job_posting = "Senior Python Developer position requiring 3+ years experience..."
        result = await service._extract_job_requirements(job_posting)
        
        assert "required_skills" in result
        assert "Python" in result["required_skills"]
        assert result["experience_years"] == 3

# Performance tests
@pytest.mark.performance
class TestDocumentServicePerformance:
    @pytest.mark.asyncio
    async def test_resume_generation_performance(self, mock_openai, sample_user_profile, sample_job_posting):
        service = DocumentProcessingService()
        
        import time
        start_time = time.time()
        
        result = await service.generate_resume(sample_user_profile, sample_job_posting)
        
        end_time = time.time()
        generation_time = end_time - start_time
        
        # Should complete within 10 seconds (requirement)
        assert generation_time < 10.0
        assert "content" in result

    @pytest.mark.asyncio
    async def test_concurrent_resume_generation(self, mock_openai, sample_user_profile, sample_job_posting):
        service = DocumentProcessingService()
        
        import asyncio
        
        # Test concurrent requests
        tasks = [
            service.generate_resume(sample_user_profile, sample_job_posting)
            for _ in range(5)
        ]
        
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        end_time = time.time()
        
        # All should succeed
        assert len(results) == 5
        for result in results:
            assert "content" in result
        
        # Should handle concurrency efficiently
        assert end_time - start_time < 15.0  # Allow some overhead for concurrent processing
```

## Performance Optimization

### Caching Strategy Implementation

**Multi-Layer Caching:**
```typescript
interface CacheConfig {
  ttl: number;
  maxSize?: number;
  strategy: 'lru' | 'lfu' | 'ttl';
}

class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private redisClient: Redis;

  constructor(
    @inject(TYPES.RedisClient) redisClient: Redis,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.redisClient = redisClient;
  }

  async get<T>(key: string): Promise<T | null> {
    // L1: Memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.logger.debug('Cache hit (memory)', { key });
      return memoryEntry.value as T;
    }

    // L2: Redis cache
    try {
      const redisValue = await this.redisClient.get(key);
      if (redisValue) {
        const parsed = JSON.parse(redisValue) as T;
        
        // Populate memory cache
        this.memoryCache.set(key, {
          value: parsed,
          timestamp: Date.now(),
          ttl: 300000 // 5 minutes in memory
        });
        
        this.logger.debug('Cache hit (redis)', { key });
        return parsed;
      }
    } catch (error) {
      this.logger.warn('Redis cache error', { key, error });
    }

    this.logger.debug('Cache miss', { key });
    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Set in memory cache
    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: Math.min(ttl * 1000, 300000) // Max 5 minutes in memory
    });

    // Set in Redis
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.error('Redis cache set error', { key, error });
    }

    // Cleanup memory cache if too large
    if (this.memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear Redis cache
    try {
      const keys = await this.redisClient.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      this.logger.error('Redis cache invalidation error', { pattern, error });
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }
  }
}
```

### Database Query Optimization

**Query Builder with Caching:**
```typescript
class OptimizedJobRepository implements IRepository<Job, string> {
  constructor(
    @inject(TYPES.DatabaseConnection) private db: DatabaseConnection,
    @inject(TYPES.CacheService) private cache: CacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async searchJobs(
    criteria: JobSearchCriteria,
    userId?: string
  ): Promise<PaginatedResult<Job>> {
    const cacheKey = `job_search:${JSON.stringify(criteria)}:${userId || 'anonymous'}`;
    
    // Try cache first
    const cached = await this.cache.get<PaginatedResult<Job>>(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();
    
    try {
      // Build optimized query
      const query = this.buildSearchQuery(criteria, userId);
      const countQuery = this.buildCountQuery(criteria);

      // Execute queries in parallel
      const [jobs, totalCount] = await Promise.all([
        this.db.query(query.sql, query.params),
        this.db.query(countQuery.sql, countQuery.params)
      ]);

      const result: PaginatedResult<Job> = {
        data: jobs.rows,
        pagination: {
          page: criteria.page || 1,
          limit: criteria.limit || 20,
          total: totalCount.rows[0].count,
          totalPages: Math.ceil(totalCount.rows[0].count / (criteria.limit || 20))
        }
      };

      // Cache results
      await this.cache.set(cacheKey, result, 300); // 5 minutes

      const queryTime = Date.now() - startTime;
      this.logger.info('Job search completed', {
        criteria,
        resultCount: jobs.rows.length,
        queryTime,
        cached: false
      });

      return result;
    } catch (error) {
      this.logger.error('Job search failed', { criteria, error });
      throw error;
    }
  }

  private buildSearchQuery(criteria: JobSearchCriteria, userId?: string): QueryBuilder {
    let sql = `
      SELECT 
        j.*,
        ${userId ? 'COALESCE(jms.composite_score, 0) as match_score,' : '0 as match_score,'}
        CASE 
          WHEN j.posted_date > NOW() - INTERVAL '7 days' THEN 'new'
          WHEN j.posted_date > NOW() - INTERVAL '30 days' THEN 'recent'
          ELSE 'older'
        END as freshness
      FROM jobs j
      ${userId ? 'LEFT JOIN job_match_scores jms ON j.id = jms.job_id AND jms.user_id = $' : ''}
    `;

    const params: any[] = [];
    const conditions: string[] = [];
    let paramIndex = userId ? 2 : 1;

    if (userId) {
      params.push(userId);
    }

    // Add search conditions
    if (criteria.keywords) {
      conditions.push(`(
        j.title ILIKE $${paramIndex} OR 
        j.description ILIKE $${paramIndex} OR 
        j.company ILIKE $${paramIndex}
      )`);
      params.push(`%${criteria.keywords}%`);
      paramIndex++;
    }

    if (criteria.location) {
      conditions.push(`j.location ILIKE $${paramIndex}`);
      params.push(`%${criteria.location}%`);
      paramIndex++;
    }

    if (criteria.jobTypes && criteria.jobTypes.length > 0) {
      conditions.push(`j.job_type = ANY($${paramIndex})`);
      params.push(criteria.jobTypes);
      paramIndex++;
    }

    if (criteria.remoteTypes && criteria.remoteTypes.length > 0) {
      conditions.push(`j.remote_type = ANY($${paramIndex})`);
      params.push(criteria.remoteTypes);
      paramIndex++;
    }

    if (criteria.salaryMin) {
      conditions.push(`j.salary_max >= $${paramIndex}`);
      params.push(criteria.salaryMin);
      paramIndex++;
    }

    if (criteria.postedWithin) {
      conditions.push(`j.posted_date > NOW() - INTERVAL '${criteria.postedWithin} days'`);
    }

    // Add WHERE clause
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ordering
    if (userId) {
      sql += ` ORDER BY jms.composite_score DESC NULLS LAST, j.posted_date DESC`;
    } else {
      sql += ` ORDER BY j.posted_date DESC`;
    }

    // Add pagination
    const limit = criteria.limit || 20;
    const offset = ((criteria.page || 1) - 1) * limit;
    
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    return { sql, params };
  }
}
```

This comprehensive design document provides the foundation for implementing all the improvements outlined in your assessment. The hybrid architecture leverages the strengths of both Node.js and Python while maintaining clean separation of concerns and high performance standards.

Would you like me to proceed with creating the implementation tasks based on this design?
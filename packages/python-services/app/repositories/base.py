"""Base repository interface and implementation with Generic types."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import and_, desc, asc, func, select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from redis.asyncio import Redis

from app.core.logging import get_logger
from app.models.base import PaginatedResponse

# Type variables
ModelType = TypeVar('ModelType')  # SQLAlchemy model
SchemaType = TypeVar('SchemaType', bound=BaseModel)  # Pydantic model
CreateSchemaType = TypeVar('CreateSchemaType', bound=BaseModel)
UpdateSchemaType = TypeVar('UpdateSchemaType', bound=BaseModel)

logger = get_logger(__name__)


class QueryCriteria(BaseModel):
    """Query criteria for filtering and pagination."""
    
    where: Optional[Dict[str, Any]] = None
    order_by: Optional[Dict[str, str]] = None  # field: 'asc' | 'desc'
    limit: Optional[int] = None
    offset: Optional[int] = None
    include_deleted: bool = False
    relationships: Optional[List[str]] = None  # Relationships to eager load


class BaseRepository(ABC, Generic[ModelType, SchemaType, CreateSchemaType, UpdateSchemaType]):
    """Base repository with common CRUD operations."""
    
    def __init__(
        self, 
        model: type[ModelType], 
        db_session: AsyncSession,
        cache: Optional[Redis] = None
    ):
        self.model = model
        self.db = db_session
        self.cache = cache
        self.logger = get_logger(f"repository.{model.__name__.lower()}")
    
    # Abstract methods that must be implemented
    @abstractmethod
    def _to_schema(self, db_obj: ModelType) -> SchemaType:
        """Convert SQLAlchemy model to Pydantic schema."""
        pass
    
    @abstractmethod
    def _to_create_dict(self, schema: CreateSchemaType) -> Dict[str, Any]:
        """Convert create schema to dictionary for database insertion."""
        pass
    
    @abstractmethod
    def _to_update_dict(self, schema: UpdateSchemaType) -> Dict[str, Any]:
        """Convert update schema to dictionary for database update."""
        pass
    
    # Cache methods
    def _get_cache_key(self, identifier: str, suffix: str = "") -> str:
        """Generate cache key for the model."""
        model_name = self.model.__name__.lower().replace('model', '')
        return f"{model_name}:{identifier}{':' + suffix if suffix else ''}"
    
    async def _get_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """Get data from cache."""
        if not self.cache:
            return None
        
        try:
            cached_data = await self.cache.get(key)
            if cached_data:
                import json
                return json.loads(cached_data)
        except Exception as e:
            self.logger.warning(f"Cache get failed: {e}")
        
        return None
    
    async def _set_cache(self, key: str, data: Dict[str, Any], ttl: int = 3600) -> None:
        """Set data in cache."""
        if not self.cache:
            return
        
        try:
            import json
            await self.cache.setex(key, ttl, json.dumps(data, default=str))
        except Exception as e:
            self.logger.warning(f"Cache set failed: {e}")
    
    async def _delete_cache(self, pattern: str) -> None:
        """Delete cache entries matching pattern."""
        if not self.cache:
            return
        
        try:
            keys = await self.cache.keys(pattern)
            if keys:
                await self.cache.delete(*keys)
        except Exception as e:
            self.logger.warning(f"Cache delete failed: {e}")
    
    # Query building methods
    def _build_query(self, criteria: Optional[QueryCriteria] = None):
        """Build SQLAlchemy query from criteria."""
        query = select(self.model)
        
        if not criteria:
            return query
        
        # Add WHERE conditions
        if criteria.where:
            conditions = []
            for field, value in criteria.where.items():
                if hasattr(self.model, field):
                    attr = getattr(self.model, field)
                    if isinstance(value, list):
                        conditions.append(attr.in_(value))
                    elif isinstance(value, dict):
                        # Support for operators like {'gte': 100, 'lte': 200}
                        for op, val in value.items():
                            if op == 'gte':
                                conditions.append(attr >= val)
                            elif op == 'lte':
                                conditions.append(attr <= val)
                            elif op == 'gt':
                                conditions.append(attr > val)
                            elif op == 'lt':
                                conditions.append(attr < val)
                            elif op == 'like':
                                conditions.append(attr.like(f"%{val}%"))
                            elif op == 'ilike':
                                conditions.append(attr.ilike(f"%{val}%"))
                    else:
                        conditions.append(attr == value)
            
            if conditions:
                query = query.where(and_(*conditions))
        
        # Add soft delete filter
        if hasattr(self.model, 'deleted_at') and not criteria.include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        
        # Add eager loading for relationships
        if criteria.relationships:
            for rel in criteria.relationships:
                if hasattr(self.model, rel):
                    query = query.options(selectinload(getattr(self.model, rel)))
        
        # Add ordering
        if criteria.order_by:
            for field, direction in criteria.order_by.items():
                if hasattr(self.model, field):
                    attr = getattr(self.model, field)
                    if direction.lower() == 'desc':
                        query = query.order_by(desc(attr))
                    else:
                        query = query.order_by(asc(attr))
        
        # Add pagination
        if criteria.offset:
            query = query.offset(criteria.offset)
        if criteria.limit:
            query = query.limit(criteria.limit)
        
        return query
    
    # CRUD operations
    async def find_by_id(self, id: Union[str, UUID]) -> Optional[SchemaType]:
        """Find entity by ID."""
        id_str = str(id)
        
        # Try cache first
        cache_key = self._get_cache_key(id_str)
        cached_data = await self._get_from_cache(cache_key)
        if cached_data:
            return self._to_schema(self.model(**cached_data))
        
        # Query database
        query = select(self.model).where(self.model.id == id_str)
        
        # Add soft delete filter
        if hasattr(self.model, 'deleted_at'):
            query = query.where(self.model.deleted_at.is_(None))
        
        result = await self.db.execute(query)
        db_obj = result.scalar_one_or_none()
        
        if db_obj:
            schema_obj = self._to_schema(db_obj)
            # Cache the result
            await self._set_cache(cache_key, db_obj.to_dict())
            return schema_obj
        
        return None
    
    async def find_all(self, criteria: Optional[QueryCriteria] = None) -> List[SchemaType]:
        """Find all entities matching criteria."""
        query = self._build_query(criteria)
        result = await self.db.execute(query)
        db_objs = result.scalars().all()
        
        return [self._to_schema(db_obj) for db_obj in db_objs]
    
    async def find_paginated(
        self, 
        criteria: Optional[QueryCriteria] = None,
        page: int = 1,
        size: int = 20
    ) -> PaginatedResponse[SchemaType]:
        """Find entities with pagination."""
        # Count total items
        count_query = select(func.count(self.model.id))
        if criteria and criteria.where:
            # Apply same WHERE conditions for count
            conditions = []
            for field, value in criteria.where.items():
                if hasattr(self.model, field):
                    attr = getattr(self.model, field)
                    if isinstance(value, list):
                        conditions.append(attr.in_(value))
                    else:
                        conditions.append(attr == value)
            if conditions:
                count_query = count_query.where(and_(*conditions))
        
        # Add soft delete filter for count
        if hasattr(self.model, 'deleted_at'):
            include_deleted = criteria.include_deleted if criteria else False
            if not include_deleted:
                count_query = count_query.where(self.model.deleted_at.is_(None))
        
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        # Calculate pagination
        offset = (page - 1) * size
        pages = (total + size - 1) // size if total > 0 else 0
        
        # Update criteria with pagination
        if not criteria:
            criteria = QueryCriteria()
        criteria.offset = offset
        criteria.limit = size
        
        # Get items
        items = await self.find_all(criteria)
        
        return PaginatedResponse[SchemaType](
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1
        )
    
    async def create(self, obj_in: CreateSchemaType) -> SchemaType:
        """Create new entity."""
        try:
            # Convert schema to dict
            create_data = self._to_create_dict(obj_in)
            
            # Create database object
            db_obj = self.model(**create_data)
            self.db.add(db_obj)
            await self.db.commit()
            await self.db.refresh(db_obj)
            
            # Invalidate related caches
            await self._delete_cache(f"{self.model.__name__.lower()}:*")
            
            self.logger.info(f"Created {self.model.__name__}", entity_id=db_obj.id)
            return self._to_schema(db_obj)
            
        except Exception as e:
            await self.db.rollback()
            self.logger.error(f"Failed to create {self.model.__name__}", error=str(e))
            raise
    
    async def update(self, id: Union[str, UUID], obj_in: UpdateSchemaType) -> Optional[SchemaType]:
        """Update entity by ID."""
        id_str = str(id)
        
        try:
            # Convert schema to dict, excluding None values
            update_data = self._to_update_dict(obj_in)
            update_data = {k: v for k, v in update_data.items() if v is not None}
            
            if not update_data:
                # No data to update, return existing entity
                return await self.find_by_id(id_str)
            
            # Update timestamp if model has it
            if hasattr(self.model, 'updated_at'):
                from datetime import datetime
                update_data['updated_at'] = datetime.utcnow()
            
            # Execute update
            query = (
                update(self.model)
                .where(self.model.id == id_str)
                .values(**update_data)
                .returning(self.model)
            )
            
            # Add soft delete filter
            if hasattr(self.model, 'deleted_at'):
                query = query.where(self.model.deleted_at.is_(None))
            
            result = await self.db.execute(query)
            await self.db.commit()
            
            db_obj = result.scalar_one_or_none()
            if db_obj:
                # Invalidate cache
                cache_key = self._get_cache_key(id_str)
                await self._delete_cache(cache_key)
                
                self.logger.info(f"Updated {self.model.__name__}", entity_id=id_str)
                return self._to_schema(db_obj)
            
            return None
            
        except Exception as e:
            await self.db.rollback()
            self.logger.error(f"Failed to update {self.model.__name__}", 
                            entity_id=id_str, error=str(e))
            raise
    
    async def delete(self, id: Union[str, UUID], soft_delete: bool = True) -> bool:
        """Delete entity by ID."""
        id_str = str(id)
        
        try:
            if soft_delete and hasattr(self.model, 'deleted_at'):
                # Soft delete
                from datetime import datetime
                query = (
                    update(self.model)
                    .where(self.model.id == id_str)
                    .where(self.model.deleted_at.is_(None))
                    .values(deleted_at=datetime.utcnow())
                )
                result = await self.db.execute(query)
                deleted_count = result.rowcount
            else:
                # Hard delete
                query = delete(self.model).where(self.model.id == id_str)
                result = await self.db.execute(query)
                deleted_count = result.rowcount
            
            await self.db.commit()
            
            if deleted_count > 0:
                # Invalidate cache
                cache_key = self._get_cache_key(id_str)
                await self._delete_cache(cache_key)
                
                delete_type = "soft" if soft_delete else "hard"
                self.logger.info(f"{delete_type.title()} deleted {self.model.__name__}", 
                               entity_id=id_str)
                return True
            
            return False
            
        except Exception as e:
            await self.db.rollback()
            self.logger.error(f"Failed to delete {self.model.__name__}", 
                            entity_id=id_str, error=str(e))
            raise
    
    async def count(self, criteria: Optional[QueryCriteria] = None) -> int:
        """Count entities matching criteria."""
        query = select(func.count(self.model.id))
        
        if criteria and criteria.where:
            conditions = []
            for field, value in criteria.where.items():
                if hasattr(self.model, field):
                    attr = getattr(self.model, field)
                    if isinstance(value, list):
                        conditions.append(attr.in_(value))
                    else:
                        conditions.append(attr == value)
            if conditions:
                query = query.where(and_(*conditions))
        
        # Add soft delete filter
        if hasattr(self.model, 'deleted_at'):
            include_deleted = criteria.include_deleted if criteria else False
            if not include_deleted:
                query = query.where(self.model.deleted_at.is_(None))
        
        result = await self.db.execute(query)
        return result.scalar()
    
    async def exists(self, id: Union[str, UUID]) -> bool:
        """Check if entity exists by ID."""
        id_str = str(id)
        query = select(func.count(self.model.id)).where(self.model.id == id_str)
        
        # Add soft delete filter
        if hasattr(self.model, 'deleted_at'):
            query = query.where(self.model.deleted_at.is_(None))
        
        result = await self.db.execute(query)
        count = result.scalar()
        return count > 0
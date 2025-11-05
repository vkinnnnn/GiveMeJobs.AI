"""
SQL injection prevention and database security utilities.

This module provides:
- SQL injection detection and prevention
- Parameterized query builders
- Database query sanitization
- SQL query analysis and validation
"""

import re
from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy import text
from sqlalchemy.sql import ClauseElement
from sqlalchemy.orm import Query
import structlog

logger = structlog.get_logger(__name__)


class SQLInjectionDetector:
    """SQL injection detection and prevention."""
    
    # Common SQL injection patterns
    INJECTION_PATTERNS = [
        # Union-based injections
        r'\bunion\s+select\b',
        r'\bunion\s+all\s+select\b',
        
        # Boolean-based blind injections
        r'\b(and|or)\s+\d+\s*=\s*\d+',
        r'\b(and|or)\s+[\'"]?\w+[\'"]?\s*=\s*[\'"]?\w+[\'"]?',
        r'\b(and|or)\s+\d+\s*<>\s*\d+',
        
        # Time-based blind injections
        r'\bwaitfor\s+delay\b',
        r'\bsleep\s*\(',
        r'\bbenchmark\s*\(',
        r'\bpg_sleep\s*\(',
        
        # Stacked queries
        r';\s*(drop|delete|insert|update|create|alter|exec)\b',
        
        # Comment-based injections
        r'--\s*$',
        r'/\*.*?\*/',
        r'#.*$',
        
        # Function-based injections
        r'\bload_file\s*\(',
        r'\binto\s+outfile\b',
        r'\binto\s+dumpfile\b',
        r'\bxp_cmdshell\b',
        r'\bsp_executesql\b',
        
        # Information schema queries
        r'\binformation_schema\b',
        r'\bsys\.\w+',
        r'\bmaster\.\w+',
        
        # Hex encoding attempts
        r'0x[0-9a-f]+',
        
        # Concatenation attempts
        r'\|\|',
        r'\bconcat\s*\(',
        
        # Conditional statements
        r'\bcase\s+when\b',
        r'\bif\s*\(',
        r'\biif\s*\(',
        
        # Database-specific functions
        r'\bversion\s*\(\)',
        r'\buser\s*\(\)',
        r'\bdatabase\s*\(\)',
        r'\bschema\s*\(\)',
        
        # Error-based injections
        r'\bextractvalue\s*\(',
        r'\bupdatexml\s*\(',
        r'\bexp\s*\(',
        
        # Subquery injections
        r'\bexists\s*\(',
        r'\bin\s*\(\s*select\b',
    ]
    
    @classmethod
    def detect_sql_injection(cls, input_string: str) -> Tuple[bool, List[str]]:
        """
        Detect potential SQL injection attempts.
        
        Returns:
            Tuple of (is_suspicious, matched_patterns)
        """
        if not input_string:
            return False, []
        
        # Normalize input for analysis
        normalized = input_string.lower().strip()
        
        # Remove legitimate quoted strings to avoid false positives
        # This is a simplified approach - in production, use a proper SQL parser
        normalized = re.sub(r"'[^']*'", "''", normalized)
        normalized = re.sub(r'"[^"]*"', '""', normalized)
        
        matched_patterns = []
        
        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, normalized, re.IGNORECASE | re.MULTILINE):
                matched_patterns.append(pattern)
        
        is_suspicious = len(matched_patterns) > 0
        
        if is_suspicious:
            logger.warning(
                "Potential SQL injection detected",
                input=input_string[:100],  # Log first 100 chars
                patterns=matched_patterns
            )
        
        return is_suspicious, matched_patterns
    
    @classmethod
    def sanitize_sql_input(cls, input_string: str) -> str:
        """
        Sanitize input to prevent SQL injection.
        
        Note: This should be used as a last resort. Parameterized queries are preferred.
        """
        if not input_string:
            return ""
        
        # Remove dangerous characters and patterns
        sanitized = input_string
        
        # Remove SQL comments
        sanitized = re.sub(r'--.*$', '', sanitized, flags=re.MULTILINE)
        sanitized = re.sub(r'/\*.*?\*/', '', sanitized, flags=re.DOTALL)
        sanitized = re.sub(r'#.*$', '', sanitized, flags=re.MULTILINE)
        
        # Remove semicolons (prevent stacked queries)
        sanitized = sanitized.replace(';', '')
        
        # Escape single quotes
        sanitized = sanitized.replace("'", "''")
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        return sanitized.strip()


class SecureQueryBuilder:
    """Secure SQL query builder with parameterization."""
    
    @staticmethod
    def build_select_query(
        table: str,
        columns: List[str],
        where_conditions: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Build a secure SELECT query with parameters.
        
        Returns:
            Tuple of (query_string, parameters)
        """
        # Validate table name (should be alphanumeric + underscores)
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table):
            raise ValueError(f"Invalid table name: {table}")
        
        # Validate column names
        validated_columns = []
        for col in columns:
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$', col):
                raise ValueError(f"Invalid column name: {col}")
            validated_columns.append(col)
        
        # Build query
        query_parts = [f"SELECT {', '.join(validated_columns)} FROM {table}"]
        parameters = {}
        
        # Add WHERE conditions
        if where_conditions:
            where_clauses = []
            for i, (column, value) in enumerate(where_conditions.items()):
                # Validate column name
                if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                    raise ValueError(f"Invalid column name in WHERE: {column}")
                
                param_name = f"param_{i}"
                where_clauses.append(f"{column} = :{param_name}")
                parameters[param_name] = value
            
            query_parts.append(f"WHERE {' AND '.join(where_clauses)}")
        
        # Add ORDER BY
        if order_by:
            # Validate order by column
            order_match = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*(ASC|DESC)?$', order_by.upper())
            if not order_match:
                raise ValueError(f"Invalid ORDER BY clause: {order_by}")
            query_parts.append(f"ORDER BY {order_by}")
        
        # Add LIMIT and OFFSET
        if limit is not None:
            if not isinstance(limit, int) or limit < 0:
                raise ValueError("LIMIT must be a non-negative integer")
            query_parts.append(f"LIMIT {limit}")
        
        if offset is not None:
            if not isinstance(offset, int) or offset < 0:
                raise ValueError("OFFSET must be a non-negative integer")
            query_parts.append(f"OFFSET {offset}")
        
        query = " ".join(query_parts)
        return query, parameters
    
    @staticmethod
    def build_insert_query(
        table: str,
        data: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Build a secure INSERT query with parameters.
        
        Returns:
            Tuple of (query_string, parameters)
        """
        # Validate table name
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table):
            raise ValueError(f"Invalid table name: {table}")
        
        if not data:
            raise ValueError("No data provided for INSERT")
        
        # Validate column names and build query
        columns = []
        placeholders = []
        parameters = {}
        
        for i, (column, value) in enumerate(data.items()):
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                raise ValueError(f"Invalid column name: {column}")
            
            columns.append(column)
            param_name = f"param_{i}"
            placeholders.append(f":{param_name}")
            parameters[param_name] = value
        
        query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
        return query, parameters
    
    @staticmethod
    def build_update_query(
        table: str,
        data: Dict[str, Any],
        where_conditions: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Build a secure UPDATE query with parameters.
        
        Returns:
            Tuple of (query_string, parameters)
        """
        # Validate table name
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table):
            raise ValueError(f"Invalid table name: {table}")
        
        if not data:
            raise ValueError("No data provided for UPDATE")
        
        if not where_conditions:
            raise ValueError("WHERE conditions required for UPDATE")
        
        parameters = {}
        param_counter = 0
        
        # Build SET clause
        set_clauses = []
        for column, value in data.items():
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                raise ValueError(f"Invalid column name: {column}")
            
            param_name = f"param_{param_counter}"
            set_clauses.append(f"{column} = :{param_name}")
            parameters[param_name] = value
            param_counter += 1
        
        # Build WHERE clause
        where_clauses = []
        for column, value in where_conditions.items():
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                raise ValueError(f"Invalid column name in WHERE: {column}")
            
            param_name = f"param_{param_counter}"
            where_clauses.append(f"{column} = :{param_name}")
            parameters[param_name] = value
            param_counter += 1
        
        query = f"UPDATE {table} SET {', '.join(set_clauses)} WHERE {' AND '.join(where_clauses)}"
        return query, parameters
    
    @staticmethod
    def build_delete_query(
        table: str,
        where_conditions: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Build a secure DELETE query with parameters.
        
        Returns:
            Tuple of (query_string, parameters)
        """
        # Validate table name
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table):
            raise ValueError(f"Invalid table name: {table}")
        
        if not where_conditions:
            raise ValueError("WHERE conditions required for DELETE")
        
        # Build WHERE clause
        where_clauses = []
        parameters = {}
        
        for i, (column, value) in enumerate(where_conditions.items()):
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column):
                raise ValueError(f"Invalid column name in WHERE: {column}")
            
            param_name = f"param_{i}"
            where_clauses.append(f"{column} = :{param_name}")
            parameters[param_name] = value
        
        query = f"DELETE FROM {table} WHERE {' AND '.join(where_clauses)}"
        return query, parameters


class QueryValidator:
    """Validate SQL queries for security."""
    
    DANGEROUS_KEYWORDS = {
        'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'EXEC', 'EXECUTE',
        'SP_EXECUTESQL', 'XP_CMDSHELL', 'OPENROWSET', 'OPENDATASOURCE',
        'BULK', 'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE'
    }
    
    @classmethod
    def validate_query(cls, query: str, allowed_operations: Optional[List[str]] = None) -> bool:
        """
        Validate a SQL query for security.
        
        Args:
            query: SQL query to validate
            allowed_operations: List of allowed SQL operations (SELECT, INSERT, etc.)
        
        Returns:
            True if query is safe, False otherwise
        """
        if not query:
            return False
        
        # Normalize query
        normalized_query = query.upper().strip()
        
        # Check for dangerous keywords
        for keyword in cls.DANGEROUS_KEYWORDS:
            if keyword in normalized_query:
                logger.warning("Dangerous SQL keyword detected", keyword=keyword, query=query[:100])
                return False
        
        # Check allowed operations
        if allowed_operations:
            query_operation = normalized_query.split()[0]
            if query_operation not in [op.upper() for op in allowed_operations]:
                logger.warning("Unauthorized SQL operation", operation=query_operation, query=query[:100])
                return False
        
        # Check for SQL injection patterns
        is_suspicious, patterns = SQLInjectionDetector.detect_sql_injection(query)
        if is_suspicious:
            logger.warning("SQL injection patterns detected", patterns=patterns, query=query[:100])
            return False
        
        return True
    
    @classmethod
    def validate_sqlalchemy_query(cls, query: Union[Query, ClauseElement]) -> bool:
        """
        Validate a SQLAlchemy query object.
        
        Args:
            query: SQLAlchemy Query or ClauseElement
        
        Returns:
            True if query is safe, False otherwise
        """
        try:
            # Compile query to SQL string
            compiled = query.compile(compile_kwargs={"literal_binds": True})
            sql_string = str(compiled)
            
            return cls.validate_query(sql_string)
            
        except Exception as e:
            logger.error("Error validating SQLAlchemy query", error=str(e))
            return False


class SecureDatabaseSession:
    """Secure database session wrapper with injection prevention."""
    
    def __init__(self, session):
        self.session = session
    
    async def execute_safe_query(
        self,
        query: str,
        parameters: Optional[Dict[str, Any]] = None,
        allowed_operations: Optional[List[str]] = None
    ):
        """
        Execute a query safely with validation.
        
        Args:
            query: SQL query string
            parameters: Query parameters
            allowed_operations: List of allowed SQL operations
        
        Returns:
            Query result
        """
        # Validate query
        if not QueryValidator.validate_query(query, allowed_operations):
            raise ValueError("Query failed security validation")
        
        # Check for SQL injection in parameters
        if parameters:
            for key, value in parameters.items():
                if isinstance(value, str):
                    is_suspicious, _ = SQLInjectionDetector.detect_sql_injection(value)
                    if is_suspicious:
                        raise ValueError(f"Suspicious content in parameter: {key}")
        
        # Execute query with parameters
        try:
            result = await self.session.execute(text(query), parameters or {})
            return result
        except Exception as e:
            logger.error("Database query execution failed", query=query[:100], error=str(e))
            raise
    
    async def safe_select(
        self,
        table: str,
        columns: List[str],
        where_conditions: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ):
        """Execute a safe SELECT query."""
        query, parameters = SecureQueryBuilder.build_select_query(
            table, columns, where_conditions, order_by, limit, offset
        )
        return await self.execute_safe_query(query, parameters, ['SELECT'])
    
    async def safe_insert(self, table: str, data: Dict[str, Any]):
        """Execute a safe INSERT query."""
        query, parameters = SecureQueryBuilder.build_insert_query(table, data)
        return await self.execute_safe_query(query, parameters, ['INSERT'])
    
    async def safe_update(
        self,
        table: str,
        data: Dict[str, Any],
        where_conditions: Dict[str, Any]
    ):
        """Execute a safe UPDATE query."""
        query, parameters = SecureQueryBuilder.build_update_query(table, data, where_conditions)
        return await self.execute_safe_query(query, parameters, ['UPDATE'])
    
    async def safe_delete(self, table: str, where_conditions: Dict[str, Any]):
        """Execute a safe DELETE query."""
        query, parameters = SecureQueryBuilder.build_delete_query(table, where_conditions)
        return await self.execute_safe_query(query, parameters, ['DELETE'])


# Utility functions
def create_secure_session(session):
    """Create a secure database session wrapper."""
    return SecureDatabaseSession(session)


def validate_user_input_for_sql(user_input: str) -> bool:
    """Validate user input for SQL injection before using in queries."""
    is_suspicious, patterns = SQLInjectionDetector.detect_sql_injection(user_input)
    return not is_suspicious


def sanitize_table_name(table_name: str) -> str:
    """Sanitize table name for safe use in queries."""
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table_name):
        raise ValueError(f"Invalid table name: {table_name}")
    return table_name


def sanitize_column_name(column_name: str) -> str:
    """Sanitize column name for safe use in queries."""
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column_name):
        raise ValueError(f"Invalid column name: {column_name}")
    return column_name
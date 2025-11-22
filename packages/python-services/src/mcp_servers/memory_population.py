"""Memory Population Script for GiveMeJobs Platform.

This script populates the Memory MCP server with comprehensive project context
including entities, relations, API documentation, schemas, and procedures.
"""

import json
from typing import List, Dict, Any

# Memory MCP commands are executed via Kiro's Memory MCP server
# This script generates the commands that should be executed

class MemoryPopulator:
    """Populates Memory MCP with GiveMeJobs platform knowledge."""
    
    def __init__(self):
        self.commands = []
    
    def add_command(self, command: str, description: str):
        """Add a Memory MCP command to execute."""
        self.commands.append({
            "command": command,
            "description": description
        })
    
    def create_platform_entity(self):
        """Create the main GiveMeJobs Platform entity."""
        self.add_command(
            'create_entities("GiveMeJobs Platform", "project", '
            '"AI-powered job search and application platform with resume tailoring")',
            "Create main platform entity"
        )
    
    def create_component_entities(self):
        """Create component entities for major system parts."""
        components = [
            {
                "name": "FastAPI Backend",
                "type": "component",
                "description": "Python-based backend service with FastAPI, provides REST APIs, "
                               "handles authentication, job search, resume processing, and AI integration"
            },
            {
                "name": "Next.js Frontend",
                "type": "component",
                "description": "React-based frontend with Next.js 14, TypeScript, Tailwind CSS, "
                               "provides user interface for job search, applications, and resume management"
            },
            {
                "name": "PostgreSQL Database",
                "type": "database",
                "description": "Primary relational database storing users, applications, jobs, "
                               "resumes, and system data"
            },
            {
                "name": "MongoDB Database",
                "type": "database",
                "description": "Document database storing job descriptions, parsed resumes, "
                               "and unstructured data"
            },
            {
                "name": "Redis Cache",
                "type": "database",
                "description": "In-memory cache for session management, rate limiting, "
                               "and performance optimization"
            },
            {
                "name": "OpenAI API",
                "type": "external-service",
                "description": "AI service for resume tailoring, job matching, "
                               "and content generation using GPT-4"
            },
            {
                "name": "Pinecone Vector DB",
                "type": "external-service",
                "description": "Vector database for semantic search and job matching "
                               "using embeddings"
            },
            {
                "name": "LinkedIn OAuth",
                "type": "external-service",
                "description": "OAuth provider for user authentication and profile import"
            },
            {
                "name": "Adzuna Job API",
                "type": "external-service",
                "description": "Job board API providing real job listings and search"
            },
            {
                "name": "Resend Email Service",
                "type": "external-service",
                "description": "Transactional email service for notifications and communications"
            }
        ]
        
        for component in components:
            self.add_command(
                f'create_entities("{component["name"]}", "{component["type"]}", '
                f'"{component["description"]}")',
                f"Create {component['name']} entity"
            )
    
    def create_relations(self):
        """Create relations between entities."""
        relations = [
            ("FastAPI Backend", "uses", "PostgreSQL Database"),
            ("FastAPI Backend", "uses", "MongoDB Database"),
            ("FastAPI Backend", "uses", "Redis Cache"),
            ("FastAPI Backend", "integrates-with", "OpenAI API"),
            ("FastAPI Backend", "integrates-with", "Pinecone Vector DB"),
            ("FastAPI Backend", "integrates-with", "LinkedIn OAuth"),
            ("FastAPI Backend", "integrates-with", "Adzuna Job API"),
            ("FastAPI Backend", "integrates-with", "Resend Email Service"),
            ("Next.js Frontend", "calls", "FastAPI Backend"),
            ("GiveMeJobs Platform", "consists-of", "FastAPI Backend"),
            ("GiveMeJobs Platform", "consists-of", "Next.js Frontend"),
            ("GiveMeJobs Platform", "consists-of", "PostgreSQL Database"),
            ("GiveMeJobs Platform", "consists-of", "MongoDB Database"),
            ("GiveMeJobs Platform", "consists-of", "Redis Cache")
        ]
        
        for from_entity, relation, to_entity in relations:
            self.add_command(
                f'create_relations("{from_entity}", "{relation}", "{to_entity}")',
                f"Create relation: {from_entity} -> {to_entity}"
            )
    
    def store_api_documentation(self):
        """Store API endpoint documentation."""
        api_categories = {
            "Authentication": [
                "POST /api/auth/register - Register new user with email and password",
                "POST /api/auth/login - Login user and return JWT tokens",
                "POST /api/auth/refresh - Refresh access token using refresh token",
                "POST /api/auth/logout - Logout user and invalidate tokens",
                "POST /api/auth/oauth/linkedin - LinkedIn OAuth authentication",
                "POST /api/auth/oauth/google - Google OAuth authentication",
                "POST /api/auth/password-reset - Request password reset email",
                "POST /api/auth/password-reset/confirm - Confirm password reset with token"
            ],
            "Users": [
                "GET /api/users/me - Get current user profile",
                "PUT /api/users/me - Update current user profile",
                "DELETE /api/users/me - Delete current user account",
                "GET /api/users/{id} - Get user by ID (admin only)",
                "PUT /api/users/{id} - Update user by ID (admin only)",
                "GET /api/users - List all users (admin only)"
            ],
            "Jobs": [
                "GET /api/jobs - Search and list jobs with filters",
                "GET /api/jobs/{id} - Get job details by ID",
                "POST /api/jobs/search - Advanced job search with AI matching",
                "GET /api/jobs/recommendations - Get personalized job recommendations",
                "POST /api/jobs/save - Save job to user's saved jobs",
                "DELETE /api/jobs/save/{id} - Remove job from saved jobs",
                "GET /api/jobs/saved - Get user's saved jobs"
            ],
            "Applications": [
                "GET /api/applications - Get user's job applications",
                "GET /api/applications/{id} - Get application details",
                "POST /api/applications - Create new job application",
                "PUT /api/applications/{id} - Update application status",
                "DELETE /api/applications/{id} - Delete application",
                "GET /api/applications/stats - Get application statistics"
            ],
            "Resumes": [
                "GET /api/resumes - List user's resumes",
                "GET /api/resumes/{id} - Get resume details",
                "POST /api/resumes - Upload and parse new resume",
                "PUT /api/resumes/{id} - Update resume",
                "DELETE /api/resumes/{id} - Delete resume",
                "POST /api/resumes/{id}/tailor - AI-tailor resume for specific job",
                "GET /api/resumes/{id}/versions - Get resume versions",
                "POST /api/resumes/{id}/download - Download resume as PDF"
            ],
            "Documents": [
                "GET /api/documents - List user's documents",
                "GET /api/documents/{id} - Get document details",
                "POST /api/documents/upload - Upload document (PDF, DOCX)",
                "POST /api/documents/generate - Generate tailored document with AI",
                "DELETE /api/documents/{id} - Delete document",
                "GET /api/documents/{id}/download - Download document"
            ],
            "AI Services": [
                "POST /api/ai/analyze-resume - Analyze resume and provide feedback",
                "POST /api/ai/match-jobs - Match resume to jobs using AI",
                "POST /api/ai/generate-cover-letter - Generate AI cover letter",
                "POST /api/ai/tailor-resume - Tailor resume for specific job",
                "POST /api/ai/chat - AI chat for career advice"
            ],
            "Analytics": [
                "GET /api/analytics/dashboard - Get user dashboard analytics",
                "GET /api/analytics/applications - Application analytics",
                "GET /api/analytics/jobs - Job search analytics",
                "GET /api/analytics/resume-performance - Resume performance metrics"
            ],
            "Admin": [
                "GET /api/admin/users - List all users",
                "GET /api/admin/stats - System statistics",
                "POST /api/admin/users/{id}/disable - Disable user account",
                "POST /api/admin/users/{id}/enable - Enable user account",
                "GET /api/admin/logs - View system logs",
                "GET /api/admin/health - System health check"
            ],
            "System": [
                "GET /api/health - Health check endpoint",
                "GET /api/version - API version information",
                "GET /api/docs - OpenAPI documentation",
                "GET /api/metrics - Prometheus metrics (monitoring)"
            ]
        }
        
        # Store each API category
        for category, endpoints in api_categories.items():
            endpoints_text = "\\n".join(endpoints)
            self.add_command(
                f'create_entities("API Endpoints - {category}", "documentation", '
                f'"API endpoints for {category}: {endpoints_text}")',
                f"Store {category} API endpoints"
            )
            
            # Create relation to backend
            self.add_command(
                f'create_relations("FastAPI Backend", "provides", "API Endpoints - {category}")',
                f"Link {category} endpoints to backend"
            )
    
    def store_database_schemas(self):
        """Store database schema information."""
        postgresql_tables = {
            "users": "User accounts and profiles (id, email, password_hash, name, created_at, updated_at)",
            "resumes": "User resumes (id, user_id, title, content, file_path, parsed_data, created_at)",
            "applications": "Job applications (id, user_id, job_id, status, applied_at, notes)",
            "jobs": "Job listings cache (id, title, company, description, location, posted_at, source)",
            "saved_jobs": "User saved jobs (id, user_id, job_id, saved_at)",
            "sessions": "User sessions (id, user_id, token, expires_at)",
            "oauth_connections": "OAuth provider connections (id, user_id, provider, provider_id)"
        }
        
        mongodb_collections = {
            "job_descriptions": "Full job descriptions from external APIs",
            "parsed_resumes": "Parsed resume content with structure",
            "embeddings": "Vector embeddings for semantic search",
            "ai_generations": "AI-generated content history"
        }
        
        redis_keys = {
            "session:*": "User session data",
            "rate_limit:*": "Rate limiting counters",
            "cache:jobs:*": "Cached job search results",
            "queue:*": "Background job queues"
        }
        
        # Store PostgreSQL schema
        pg_schema_text = "\\n".join([f"{table}: {desc}" for table, desc in postgresql_tables.items()])
        self.add_command(
            f'create_entities("PostgreSQL Schema", "documentation", '
            f'"PostgreSQL database tables: {pg_schema_text}")',
            "Store PostgreSQL schema"
        )
        
        # Store MongoDB schema
        mongo_schema_text = "\\n".join([f"{coll}: {desc}" for coll, desc in mongodb_collections.items()])
        self.add_command(
            f'create_entities("MongoDB Schema", "documentation", '
            f'"MongoDB collections: {mongo_schema_text}")',
            "Store MongoDB schema"
        )
        
        # Store Redis schema
        redis_schema_text = "\\n".join([f"{key}: {desc}" for key, desc in redis_keys.items()])
        self.add_command(
            f'create_entities("Redis Keys", "documentation", '
            f'"Redis key patterns: {redis_schema_text}")',
            "Store Redis keys"
        )
        
        # Create relations
        self.add_command(
            'create_relations("PostgreSQL Database", "has-schema", "PostgreSQL Schema")',
            "Link PostgreSQL schema"
        )
        self.add_command(
            'create_relations("MongoDB Database", "has-schema", "MongoDB Schema")',
            "Link MongoDB schema"
        )
        self.add_command(
            'create_relations("Redis Cache", "has-schema", "Redis Keys")',
            "Link Redis keys"
        )
    
    def store_security_requirements(self):
        """Store security requirements and best practices."""
        security_info = (
            "Security Requirements: "
            "1. JWT-based authentication with access and refresh tokens. "
            "2. Password hashing with bcrypt (12 rounds). "
            "3. HTTPS required for all production endpoints. "
            "4. Rate limiting: 100 requests per minute per user. "
            "5. OAuth 2.0 for LinkedIn and Google authentication. "
            "6. CORS configured for frontend domain only. "
            "7. SQL injection prevention via parameterized queries. "
            "8. XSS prevention via input sanitization. "
            "9. CSRF protection with SameSite cookies. "
            "10. Sensitive data encryption at rest. "
            "11. API key rotation every 90 days. "
            "12. Regular security scans with Snyk. "
            "13. Sentry error tracking enabled. "
            "14. Access logs retained for 90 days."
        )
        
        self.add_command(
            f'create_entities("Security Requirements", "documentation", "{security_info}")',
            "Store security requirements"
        )
        
        self.add_command(
            'create_relations("GiveMeJobs Platform", "follows", "Security Requirements")',
            "Link security requirements"
        )
    
    def store_deployment_procedures(self):
        """Store deployment procedures."""
        deployment_info = (
            "Deployment Procedures: "
            "1. Run security scan: npx snyk test. "
            "2. Run tests: npm test (frontend), pytest (backend). "
            "3. Build Docker images: docker-compose build. "
            "4. Run database migrations: alembic upgrade head. "
            "5. Deploy to staging: docker-compose -f docker-compose.staging.yml up -d. "
            "6. Run smoke tests on staging. "
            "7. Deploy to production: docker-compose -f docker-compose.production.yml up -d. "
            "8. Monitor logs: docker-compose logs -f. "
            "9. Rollback if errors: docker-compose -f docker-compose.production.yml down; deploy previous version. "
            "10. Update DNS if needed. "
            "11. Clear CDN cache. "
            "12. Notify team in Slack."
        )
        
        self.add_command(
            f'create_entities("Deployment Procedures", "documentation", "{deployment_info}")',
            "Store deployment procedures"
        )
        
        self.add_command(
            'create_relations("GiveMeJobs Platform", "deployed-using", "Deployment Procedures")',
            "Link deployment procedures"
        )
    
    def store_architecture_decisions(self):
        """Store architecture decisions and design choices."""
        architecture_decisions = [
            {
                "name": "Python Backend Choice",
                "decision": "Use Python with FastAPI for backend instead of Node.js. "
                           "Rationale: Better AI/ML library support, async capabilities, "
                           "type hints, and performance."
            },
            {
                "name": "Microservices Architecture",
                "decision": "Use modular monolith initially, plan for microservices later. "
                           "Rationale: Faster development, easier debugging, can split later."
            },
            {
                "name": "Database Strategy",
                "decision": "Use PostgreSQL for relational data, MongoDB for documents, "
                           "Redis for caching. Rationale: Each database optimized for its use case."
            },
            {
                "name": "AI Provider",
                "decision": "Use OpenAI GPT-4 for AI features. Rationale: Best quality, "
                           "extensive API, good documentation."
            },
            {
                "name": "Vector Database",
                "decision": "Use Pinecone for vector embeddings. Rationale: Managed service, "
                           "low latency, good scaling."
            },
            {
                "name": "Authentication",
                "decision": "Use JWT with refresh tokens and OAuth 2.0. "
                           "Rationale: Stateless, scalable, industry standard."
            },
            {
                "name": "Frontend Framework",
                "decision": "Use Next.js 14 with TypeScript and Tailwind CSS. "
                           "Rationale: Server-side rendering, great developer experience, "
                           "modern tooling."
            }
        ]
        
        for decision in architecture_decisions:
            self.add_command(
                f'create_entities("{decision["name"]}", "decision", "{decision["decision"]}")',
                f"Store decision: {decision['name']}"
            )
            
            self.add_command(
                f'create_relations("GiveMeJobs Platform", "follows-decision", "{decision["name"]}")',
                f"Link decision: {decision['name']}"
            )
    
    def generate_memory_population_script(self) -> str:
        """Generate a script with all Memory MCP commands."""
        script = "# Memory Population Commands for GiveMeJobs Platform\n\n"
        script += "# Execute these commands in Kiro to populate Memory MCP\n\n"
        
        for i, cmd in enumerate(self.commands, 1):
            script += f"## Command {i}: {cmd['description']}\n"
            script += f"{cmd['command']}\n\n"
        
        return script
    
    def populate_all(self):
        """Populate all Memory MCP data."""
        print("Generating Memory Population Commands...\n")
        
        # Create entities
        self.create_platform_entity()
        self.create_component_entities()
        self.create_relations()
        
        # Store documentation
        self.store_api_documentation()
        self.store_database_schemas()
        self.store_security_requirements()
        self.store_deployment_procedures()
        self.store_architecture_decisions()
        
        print(f"Generated {len(self.commands)} Memory MCP commands")
        return self.generate_memory_population_script()


def main():
    """Main entry point."""
    populator = MemoryPopulator()
    script = populator.populate_all()
    
    # Write to file
    output_file = "memory_population_commands.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(script)
    
    print(f"\n[SUCCESS] Memory population script written to: {output_file}")
    print(f"\nNext steps:")
    print(f"1. Open Kiro IDE")
    print(f"2. Execute the commands in {output_file}")
    print(f"3. Verify Memory population with: search_nodes query")


if __name__ == "__main__":
    main()

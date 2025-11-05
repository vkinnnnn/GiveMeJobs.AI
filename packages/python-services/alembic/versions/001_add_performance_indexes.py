"""Add comprehensive performance indexes

Revision ID: 001_performance_indexes
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_performance_indexes'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add comprehensive database indexes for performance optimization."""
    
    # User table indexes
    op.create_index(
        'idx_users_email_active',
        'users',
        ['email', 'is_active'],
        unique=True,
        postgresql_where=sa.text('is_active = true')
    )
    
    op.create_index(
        'idx_users_last_login',
        'users',
        ['last_login_at'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_users_created_at',
        'users',
        ['created_at'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_users_email_verified',
        'users',
        ['email_verified', 'is_active'],
        postgresql_using='btree'
    )
    
    # Skills table indexes
    op.create_index(
        'idx_skills_user_category',
        'skills',
        ['user_id', 'category'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_skills_name_category',
        'skills',
        ['name', 'category'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_skills_proficiency',
        'skills',
        ['proficiency_level', 'years_of_experience'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_skills_last_used',
        'skills',
        ['last_used'],
        postgresql_using='btree',
        postgresql_where=sa.text('last_used IS NOT NULL')
    )
    
    # Experience table indexes
    op.create_index(
        'idx_experience_user_current',
        'experience',
        ['user_id', 'is_current'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_experience_dates',
        'experience',
        ['start_date', 'end_date'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_experience_company_title',
        'experience',
        ['company', 'title'],
        postgresql_using='btree'
    )
    
    # Education table indexes
    op.create_index(
        'idx_education_user_current',
        'education',
        ['user_id', 'is_current'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_education_institution_degree',
        'education',
        ['institution', 'degree'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_education_years',
        'education',
        ['start_year', 'end_year'],
        postgresql_using='btree'
    )
    
    # Jobs table indexes
    op.create_index(
        'idx_jobs_status_active',
        'jobs',
        ['status'],
        postgresql_using='btree',
        postgresql_where=sa.text("status = 'active'")
    )
    
    op.create_index(
        'idx_jobs_location_remote',
        'jobs',
        ['location', 'remote_type'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_jobs_company_industry',
        'jobs',
        ['company', 'industry'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_jobs_salary_range',
        'jobs',
        ['salary_min', 'salary_max'],
        postgresql_using='btree',
        postgresql_where=sa.text('salary_min IS NOT NULL AND salary_max IS NOT NULL')
    )
    
    op.create_index(
        'idx_jobs_posted_date',
        'jobs',
        ['posted_date'],
        postgresql_using='btree',
        postgresql_where=sa.text('posted_date IS NOT NULL')
    )
    
    op.create_index(
        'idx_jobs_expires_date',
        'jobs',
        ['expires_date'],
        postgresql_using='btree',
        postgresql_where=sa.text('expires_date IS NOT NULL')
    )
    
    op.create_index(
        'idx_jobs_source_external',
        'jobs',
        ['source', 'external_id'],
        postgresql_using='btree',
        postgresql_where=sa.text('external_id IS NOT NULL')
    )
    
    op.create_index(
        'idx_jobs_job_type',
        'jobs',
        ['job_type', 'company_size'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_jobs_view_count',
        'jobs',
        ['view_count'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_jobs_application_count',
        'jobs',
        ['application_count'],
        postgresql_using='btree'
    )
    
    # Full-text search indexes for jobs
    op.execute("""
        CREATE INDEX idx_jobs_title_fts 
        ON jobs 
        USING gin(to_tsvector('english', title))
    """)
    
    op.execute("""
        CREATE INDEX idx_jobs_description_fts 
        ON jobs 
        USING gin(to_tsvector('english', description))
    """)
    
    op.execute("""
        CREATE INDEX idx_jobs_company_fts 
        ON jobs 
        USING gin(to_tsvector('english', company))
    """)
    
    # Composite full-text search index
    op.execute("""
        CREATE INDEX idx_jobs_combined_fts 
        ON jobs 
        USING gin(to_tsvector('english', 
            coalesce(title, '') || ' ' || 
            coalesce(description, '') || ' ' || 
            coalesce(company, '') || ' ' || 
            coalesce(location, '')
        ))
    """)
    
    # Applications table indexes
    op.create_index(
        'idx_applications_user_status',
        'applications',
        ['user_id', 'status'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_applications_job_status',
        'applications',
        ['job_id', 'status'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_applications_submitted_at',
        'applications',
        ['submitted_at'],
        postgresql_using='btree',
        postgresql_where=sa.text('submitted_at IS NOT NULL')
    )
    
    op.create_index(
        'idx_applications_response_time',
        'applications',
        ['response_time_days'],
        postgresql_using='btree',
        postgresql_where=sa.text('response_time_days IS NOT NULL')
    )
    
    op.create_index(
        'idx_applications_source',
        'applications',
        ['source', 'status'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_applications_viewed',
        'applications',
        ['viewed_by_employer', 'status'],
        postgresql_using='btree'
    )
    
    # Interviews table indexes
    op.create_index(
        'idx_interviews_application_type',
        'interviews',
        ['application_id', 'interview_type'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_interviews_scheduled_at',
        'interviews',
        ['scheduled_at'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_interviews_completed',
        'interviews',
        ['completed', 'completed_at'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_interviews_rating',
        'interviews',
        ['rating'],
        postgresql_using='btree',
        postgresql_where=sa.text('rating IS NOT NULL')
    )
    
    # User preferences indexes (assuming JSONB storage)
    op.execute("""
        CREATE INDEX idx_user_preferences_remote 
        ON user_preferences 
        USING gin((preferences->'remote_preference'))
    """)
    
    op.execute("""
        CREATE INDEX idx_user_preferences_salary 
        ON user_preferences 
        USING btree(
            (preferences->>'salary_min')::integer,
            (preferences->>'salary_max')::integer
        )
        WHERE preferences->>'salary_min' IS NOT NULL 
        AND preferences->>'salary_max' IS NOT NULL
    """)
    
    op.execute("""
        CREATE INDEX idx_user_preferences_locations 
        ON user_preferences 
        USING gin((preferences->'preferred_locations'))
    """)
    
    op.execute("""
        CREATE INDEX idx_user_preferences_job_types 
        ON user_preferences 
        USING gin((preferences->'job_types'))
    """)
    
    # Job skills indexes (assuming array storage)
    op.execute("""
        CREATE INDEX idx_jobs_required_skills 
        ON jobs 
        USING gin(required_skills)
    """)
    
    op.execute("""
        CREATE INDEX idx_jobs_preferred_skills 
        ON jobs 
        USING gin(preferred_skills)
    """)
    
    # Analytics and performance indexes
    op.create_index(
        'idx_jobs_analytics_composite',
        'jobs',
        ['status', 'posted_date', 'view_count', 'application_count'],
        postgresql_using='btree',
        postgresql_where=sa.text("status = 'active'")
    )
    
    op.create_index(
        'idx_applications_analytics_composite',
        'applications',
        ['user_id', 'submitted_at', 'status', 'response_time_days'],
        postgresql_using='btree'
    )
    
    # Partial indexes for common queries
    op.create_index(
        'idx_jobs_recent_active',
        'jobs',
        ['created_at'],
        postgresql_using='btree',
        postgresql_where=sa.text("status = 'active' AND created_at > NOW() - INTERVAL '30 days'")
    )
    
    op.create_index(
        'idx_applications_recent_submitted',
        'applications',
        ['submitted_at'],
        postgresql_using='btree',
        postgresql_where=sa.text("status != 'draft' AND submitted_at > NOW() - INTERVAL '90 days'")
    )
    
    # Covering indexes for common SELECT queries
    op.create_index(
        'idx_jobs_search_covering',
        'jobs',
        ['status', 'job_type', 'remote_type', 'location'],
        postgresql_include=['id', 'title', 'company', 'salary_min', 'salary_max', 'posted_date'],
        postgresql_where=sa.text("status = 'active'")
    )
    
    op.create_index(
        'idx_applications_user_covering',
        'applications',
        ['user_id', 'status'],
        postgresql_include=['id', 'job_id', 'submitted_at', 'response_time_days', 'created_at']
    )


def downgrade():
    """Remove performance indexes."""
    
    # Drop all created indexes
    indexes_to_drop = [
        'idx_users_email_active',
        'idx_users_last_login',
        'idx_users_created_at',
        'idx_users_email_verified',
        'idx_skills_user_category',
        'idx_skills_name_category',
        'idx_skills_proficiency',
        'idx_skills_last_used',
        'idx_experience_user_current',
        'idx_experience_dates',
        'idx_experience_company_title',
        'idx_education_user_current',
        'idx_education_institution_degree',
        'idx_education_years',
        'idx_jobs_status_active',
        'idx_jobs_location_remote',
        'idx_jobs_company_industry',
        'idx_jobs_salary_range',
        'idx_jobs_posted_date',
        'idx_jobs_expires_date',
        'idx_jobs_source_external',
        'idx_jobs_job_type',
        'idx_jobs_view_count',
        'idx_jobs_application_count',
        'idx_jobs_title_fts',
        'idx_jobs_description_fts',
        'idx_jobs_company_fts',
        'idx_jobs_combined_fts',
        'idx_applications_user_status',
        'idx_applications_job_status',
        'idx_applications_submitted_at',
        'idx_applications_response_time',
        'idx_applications_source',
        'idx_applications_viewed',
        'idx_interviews_application_type',
        'idx_interviews_scheduled_at',
        'idx_interviews_completed',
        'idx_interviews_rating',
        'idx_user_preferences_remote',
        'idx_user_preferences_salary',
        'idx_user_preferences_locations',
        'idx_user_preferences_job_types',
        'idx_jobs_required_skills',
        'idx_jobs_preferred_skills',
        'idx_jobs_analytics_composite',
        'idx_applications_analytics_composite',
        'idx_jobs_recent_active',
        'idx_applications_recent_submitted',
        'idx_jobs_search_covering',
        'idx_applications_user_covering'
    ]
    
    for index_name in indexes_to_drop:
        op.drop_index(index_name, table_name=None)
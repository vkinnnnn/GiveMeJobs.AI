"""Enhanced authentication tables

Revision ID: 002_enhanced_auth
Revises: 001_initial_tables
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_enhanced_auth'
down_revision = '001_initial_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create enhanced authentication tables."""
    
    # Update users table with enhanced fields
    op.add_column('users', sa.Column('first_name', sa.String(100), nullable=False, server_default=''))
    op.add_column('users', sa.Column('last_name', sa.String(100), nullable=False, server_default=''))
    op.add_column('users', sa.Column('professional_headline', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('mfa_secret', sa.String(32), nullable=True))
    op.add_column('users', sa.Column('backup_codes', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('password_changed_at', sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.add_column('users', sa.Column('phone_number', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('timezone', sa.String(50), nullable=False, server_default='UTC'))
    op.add_column('users', sa.Column('language', sa.String(10), nullable=False, server_default='en'))
    op.add_column('users', sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('users', sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Create foreign key constraints for audit fields
    op.create_foreign_key('fk_users_created_by', 'users', 'users', ['created_by'], ['id'])
    op.create_foreign_key('fk_users_updated_by', 'users', 'users', ['updated_by'], ['id'])
    
    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(50), unique=True, nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
    )
    
    # Create foreign key constraints for roles
    op.create_foreign_key('fk_roles_created_by', 'roles', 'users', ['created_by'], ['id'])
    op.create_foreign_key('fk_roles_updated_by', 'roles', 'users', ['updated_by'], ['id'])
    
    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('resource', sa.String(50), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
    )
    
    # Create foreign key constraint for permissions
    op.create_foreign_key('fk_permissions_created_by', 'permissions', 'users', ['created_by'], ['id'])
    
    # Create user_roles association table
    op.create_table(
        'user_roles',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )
    
    # Create foreign key constraints for user_roles
    op.create_foreign_key('fk_user_roles_user_id', 'user_roles', 'users', ['user_id'], ['id'])
    op.create_foreign_key('fk_user_roles_role_id', 'user_roles', 'roles', ['role_id'], ['id'])
    op.create_foreign_key('fk_user_roles_assigned_by', 'user_roles', 'users', ['assigned_by'], ['id'])
    
    # Create role_permissions association table
    op.create_table(
        'role_permissions',
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('granted_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )
    
    # Create foreign key constraints for role_permissions
    op.create_foreign_key('fk_role_permissions_role_id', 'role_permissions', 'roles', ['role_id'], ['id'])
    op.create_foreign_key('fk_role_permissions_permission_id', 'role_permissions', 'permissions', ['permission_id'], ['id'])
    op.create_foreign_key('fk_role_permissions_granted_by', 'role_permissions', 'users', ['granted_by'], ['id'])
    
    # Create user_sessions table
    op.create_table(
        'user_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', sa.String(255), unique=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('device_fingerprint', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('invalidated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_suspicious', sa.Boolean(), nullable=False, server_default='false'),
    )
    
    # Create foreign key constraint for user_sessions
    op.create_foreign_key('fk_user_sessions_user_id', 'user_sessions', 'users', ['user_id'], ['id'])
    
    # Create refresh_tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('token_hash', sa.String(255), unique=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
    )
    
    # Create foreign key constraint for refresh_tokens
    op.create_foreign_key('fk_refresh_tokens_user_id', 'refresh_tokens', 'users', ['user_id'], ['id'])
    
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('resource', sa.String(50), nullable=True),
        sa.Column('resource_id', sa.String(255), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('session_id', sa.String(255), nullable=True),
        sa.Column('old_values', sa.Text(), nullable=True),
        sa.Column('new_values', sa.Text(), nullable=True),
        sa.Column('additional_data', sa.Text(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create foreign key constraint for audit_logs
    op.create_foreign_key('fk_audit_logs_user_id', 'audit_logs', 'users', ['user_id'], ['id'])
    
    # Create security_events table
    op.create_table(
        'security_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('detection_rule', sa.String(100), nullable=True),
        sa.Column('confidence_score', sa.Integer(), nullable=True),
        sa.Column('event_data', sa.Text(), nullable=True),
        sa.Column('response_action', sa.String(50), nullable=True),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create foreign key constraints for security_events
    op.create_foreign_key('fk_security_events_user_id', 'security_events', 'users', ['user_id'], ['id'])
    op.create_foreign_key('fk_security_events_resolved_by', 'security_events', 'users', ['resolved_by'], ['id'])
    
    # Create login_attempts table
    op.create_table(
        'login_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('failure_reason', sa.String(100), nullable=True),
        sa.Column('mfa_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('mfa_success', sa.Boolean(), nullable=True),
        sa.Column('attempted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create indexes for performance
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_mfa_enabled', 'users', ['mfa_enabled'])
    op.create_index('idx_users_last_login', 'users', ['last_login'])
    op.create_index('idx_roles_name', 'roles', ['name'])
    op.create_index('idx_permissions_resource_action', 'permissions', ['resource', 'action'])
    op.create_index('idx_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('idx_user_sessions_session_id', 'user_sessions', ['session_id'])
    op.create_index('idx_user_sessions_expires_at', 'user_sessions', ['expires_at'])
    op.create_index('idx_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('idx_refresh_tokens_token_hash', 'refresh_tokens', ['token_hash'])
    op.create_index('idx_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_logs_event_type', 'audit_logs', ['event_type'])
    op.create_index('idx_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('idx_security_events_user_id', 'security_events', ['user_id'])
    op.create_index('idx_security_events_event_type', 'security_events', ['event_type'])
    op.create_index('idx_security_events_severity', 'security_events', ['severity'])
    op.create_index('idx_security_events_status', 'security_events', ['status'])
    op.create_index('idx_security_events_created_at', 'security_events', ['created_at'])
    op.create_index('idx_login_attempts_email', 'login_attempts', ['email'])
    op.create_index('idx_login_attempts_ip_address', 'login_attempts', ['ip_address'])
    op.create_index('idx_login_attempts_attempted_at', 'login_attempts', ['attempted_at'])
    
    # Insert default roles and permissions
    op.execute("""
        INSERT INTO roles (id, name, description, is_system) VALUES 
        (gen_random_uuid(), 'admin', 'System administrator with full access', true),
        (gen_random_uuid(), 'user', 'Regular user with basic access', true),
        (gen_random_uuid(), 'moderator', 'Content moderator with limited admin access', true);
    """)
    
    op.execute("""
        INSERT INTO permissions (id, name, resource, action, description) VALUES 
        (gen_random_uuid(), 'user:read', 'user', 'read', 'Read user information'),
        (gen_random_uuid(), 'user:write', 'user', 'write', 'Create and update user information'),
        (gen_random_uuid(), 'user:delete', 'user', 'delete', 'Delete user accounts'),
        (gen_random_uuid(), 'user:manage_roles', 'user', 'manage_roles', 'Assign and remove user roles'),
        (gen_random_uuid(), 'job:read', 'job', 'read', 'Read job information'),
        (gen_random_uuid(), 'job:write', 'job', 'write', 'Create and update job postings'),
        (gen_random_uuid(), 'job:delete', 'job', 'delete', 'Delete job postings'),
        (gen_random_uuid(), 'application:read', 'application', 'read', 'Read job applications'),
        (gen_random_uuid(), 'application:write', 'application', 'write', 'Create and update applications'),
        (gen_random_uuid(), 'application:delete', 'application', 'delete', 'Delete applications'),
        (gen_random_uuid(), 'document:generate', 'document', 'generate', 'Generate documents'),
        (gen_random_uuid(), 'analytics:read', 'analytics', 'read', 'Read analytics data'),
        (gen_random_uuid(), 'role:create', 'role', 'create', 'Create new roles'),
        (gen_random_uuid(), 'role:read', 'role', 'read', 'Read role information'),
        (gen_random_uuid(), 'role:write', 'role', 'write', 'Update role information'),
        (gen_random_uuid(), 'role:delete', 'role', 'delete', 'Delete roles'),
        (gen_random_uuid(), 'permission:create', 'permission', 'create', 'Create new permissions'),
        (gen_random_uuid(), 'permission:read', 'permission', 'read', 'Read permission information'),
        (gen_random_uuid(), 'permission:write', 'permission', 'write', 'Update permission information'),
        (gen_random_uuid(), 'permission:delete', 'permission', 'delete', 'Delete permissions');
    """)


def downgrade() -> None:
    """Drop enhanced authentication tables."""
    
    # Drop indexes
    op.drop_index('idx_login_attempts_attempted_at')
    op.drop_index('idx_login_attempts_ip_address')
    op.drop_index('idx_login_attempts_email')
    op.drop_index('idx_security_events_created_at')
    op.drop_index('idx_security_events_status')
    op.drop_index('idx_security_events_severity')
    op.drop_index('idx_security_events_event_type')
    op.drop_index('idx_security_events_user_id')
    op.drop_index('idx_audit_logs_created_at')
    op.drop_index('idx_audit_logs_event_type')
    op.drop_index('idx_audit_logs_user_id')
    op.drop_index('idx_refresh_tokens_token_hash')
    op.drop_index('idx_refresh_tokens_user_id')
    op.drop_index('idx_user_sessions_expires_at')
    op.drop_index('idx_user_sessions_session_id')
    op.drop_index('idx_user_sessions_user_id')
    op.drop_index('idx_permissions_resource_action')
    op.drop_index('idx_roles_name')
    op.drop_index('idx_users_last_login')
    op.drop_index('idx_users_mfa_enabled')
    op.drop_index('idx_users_email')
    
    # Drop tables
    op.drop_table('login_attempts')
    op.drop_table('security_events')
    op.drop_table('audit_logs')
    op.drop_table('refresh_tokens')
    op.drop_table('user_sessions')
    op.drop_table('role_permissions')
    op.drop_table('user_roles')
    op.drop_table('permissions')
    op.drop_table('roles')
    
    # Remove columns from users table
    op.drop_constraint('fk_users_updated_by', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_created_by', 'users', type_='foreignkey')
    op.drop_column('users', 'updated_by')
    op.drop_column('users', 'created_by')
    op.drop_column('users', 'language')
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'phone_number')
    op.drop_column('users', 'password_changed_at')
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'backup_codes')
    op.drop_column('users', 'mfa_secret')
    op.drop_column('users', 'mfa_enabled')
    op.drop_column('users', 'professional_headline')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
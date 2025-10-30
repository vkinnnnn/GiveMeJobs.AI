/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create security_incidents table
  pgm.createTable('security_incidents', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    incident_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    severity: {
      type: 'varchar(20)',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'detected',
    },
    description: {
      type: 'text',
      notNull: true,
    },
    affected_systems: {
      type: 'text[]',
      default: '{}',
    },
    affected_data_types: {
      type: 'text[]',
      default: '{}',
    },
    estimated_affected_users: {
      type: 'integer',
      default: 0,
    },
    detected_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    contained_at: {
      type: 'timestamp',
    },
    resolved_at: {
      type: 'timestamp',
    },
    reported_to_authorities_at: {
      type: 'timestamp',
    },
    users_notified_at: {
      type: 'timestamp',
    },
    root_cause: {
      type: 'text',
    },
    remediation_steps: {
      type: 'text[]',
      default: '{}',
    },
    created_by: {
      type: 'uuid',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
  });

  pgm.createIndex('security_incidents', 'status');
  pgm.createIndex('security_incidents', 'severity');
  pgm.createIndex('security_incidents', 'detected_at');

  // Create incident_notifications table
  pgm.createTable('incident_notifications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    incident_id: {
      type: 'uuid',
      notNull: true,
      references: 'security_incidents',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    notification_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    sent_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    acknowledged_at: {
      type: 'timestamp',
    },
    notification_content: {
      type: 'jsonb',
    },
  });

  pgm.createIndex('incident_notifications', 'incident_id');
  pgm.createIndex('incident_notifications', 'user_id');
  pgm.createIndex('incident_notifications', 'sent_at');
};

exports.down = (pgm) => {
  pgm.dropTable('incident_notifications');
  pgm.dropTable('security_incidents');
};

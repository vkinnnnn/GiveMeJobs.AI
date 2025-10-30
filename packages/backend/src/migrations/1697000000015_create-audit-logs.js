/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create audit_logs table
  pgm.createTable('audit_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    action: {
      type: 'varchar(100)',
      notNull: true,
    },
    resource_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    resource_id: {
      type: 'varchar(255)',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
    },
    ip_address: {
      type: 'varchar(45)',
    },
    user_agent: {
      type: 'text',
    },
    request_method: {
      type: 'varchar(10)',
    },
    request_path: {
      type: 'text',
    },
    changes: {
      type: 'jsonb',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    error_message: {
      type: 'text',
    },
    timestamp: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes for efficient querying
  pgm.createIndex('audit_logs', 'user_id');
  pgm.createIndex('audit_logs', 'action');
  pgm.createIndex('audit_logs', 'resource_type');
  pgm.createIndex('audit_logs', 'resource_id');
  pgm.createIndex('audit_logs', 'timestamp');
  pgm.createIndex('audit_logs', ['user_id', 'timestamp']);
  pgm.createIndex('audit_logs', ['resource_type', 'resource_id']);

  // Create a function to prevent audit log modifications (tamper-proof)
  pgm.createFunction(
    'prevent_audit_log_modification',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
    },
    `
    BEGIN
      RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
      RETURN NULL;
    END;
    `
  );

  // Create triggers to prevent modifications
  pgm.createTrigger('audit_logs', 'prevent_audit_log_update', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'prevent_audit_log_modification',
    level: 'ROW',
  });

  pgm.createTrigger('audit_logs', 'prevent_audit_log_delete', {
    when: 'BEFORE',
    operation: 'DELETE',
    function: 'prevent_audit_log_modification',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('audit_logs', 'prevent_audit_log_delete');
  pgm.dropTrigger('audit_logs', 'prevent_audit_log_update');
  pgm.dropFunction('prevent_audit_log_modification', []);
  pgm.dropTable('audit_logs');
};

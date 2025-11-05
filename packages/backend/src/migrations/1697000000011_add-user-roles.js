/**
 * Migration: Add user roles and permissions
 */

exports.up = function (pgm) {
  // Create roles enum type
  pgm.createType('user_role', ['user', 'admin', 'moderator']);

  // Add role column to users table
  pgm.addColumn('users', {
    role: {
      type: 'user_role',
      notNull: true,
      default: 'user'
    },
    permissions: {
      type: 'jsonb',
      default: '[]'
    }
  });

  // Create index on role for faster queries
  pgm.createIndex('users', 'role', { name: 'idx_users_role' });
};

exports.down = function (pgm) {
  // Remove index
  pgm.dropIndex('users', 'role', { name: 'idx_users_role' });

  // Remove columns
  pgm.dropColumn('users', ['role', 'permissions']);

  // Drop enum type
  pgm.dropType('user_role');
};
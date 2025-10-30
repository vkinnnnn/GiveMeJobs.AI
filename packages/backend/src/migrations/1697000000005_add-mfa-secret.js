/**
 * Migration: Add MFA secret column to users table
 */

exports.up = (pgm) => {
  pgm.addColumn('users', {
    mfa_secret: {
      type: 'text',
      notNull: false,
    },
  });

  pgm.createIndex('users', 'mfa_secret');
};

exports.down = (pgm) => {
  pgm.dropIndex('users', 'mfa_secret');
  pgm.dropColumn('users', 'mfa_secret');
};

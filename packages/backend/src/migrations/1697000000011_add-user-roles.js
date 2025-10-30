/**
 * Migration: Add user roles and permissions
 */

exports.up = async function (knex) {
  // Create roles enum type
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Add role column to users table
  await knex.schema.table('users', (table) => {
    table.specificType('role', 'user_role').defaultTo('user').notNullable();
    table.jsonb('permissions').defaultTo('[]');
  });

  // Create index on role for faster queries
  await knex.raw('CREATE INDEX idx_users_role ON users(role)');
};

exports.down = async function (knex) {
  // Remove index
  await knex.raw('DROP INDEX IF EXISTS idx_users_role');

  // Remove columns
  await knex.schema.table('users', (table) => {
    table.dropColumn('role');
    table.dropColumn('permissions');
  });

  // Drop enum type
  await knex.raw('DROP TYPE IF EXISTS user_role');
};

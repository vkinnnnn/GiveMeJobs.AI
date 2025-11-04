/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // This table was already created in migration 1697000000000_create-users-and-profiles
  // This migration is kept for compatibility but does nothing
  console.log('✓ Career goals table already exists from previous migration');
};

exports.down = (pgm) => {
  // Do nothing - table is managed by the users-and-profiles migration
};

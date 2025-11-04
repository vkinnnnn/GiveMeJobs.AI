/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // This table was already created in migration 1697000000004_create-applications
  // This migration is kept for compatibility but does nothing
  console.log('✓ Interview prep table already exists from previous migration');
};

exports.down = (pgm) => {
  // Do nothing - table is managed by the applications migration
};

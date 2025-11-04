/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // These tables were already created in migration 1697000000003_create-jobs
  // This migration is kept for compatibility but does nothing
  console.log('✓ Job alerts and notifications tables already exist from previous migration');
};

exports.down = (pgm) => {
  // Do nothing - tables are managed by the jobs migration
};

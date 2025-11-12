#!/usr/bin/env node

/**
 * Simple script to run the dynamic job creation
 * Usage: node run-dynamic-jobs.js
 */

const { createDynamicJobs } = require('./scripts/create-dynamic-jobs');

console.log('🎯 Converting static jobs to dynamic jobs...\n');

createDynamicJobs()
  .then(() => {
    console.log('\n✨ All done! Your jobs are now dynamic and manageable.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  });

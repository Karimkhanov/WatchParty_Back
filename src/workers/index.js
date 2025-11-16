const logger = require('../config/logger');

/**
 * Initialize all background workers
 * This file should be imported in server.js to start all workers
 */

// Import workers to register their processors
require('./emailWorker');
require('./imageWorker');
require('./roomCleanupWorker');

logger.info('🚀 All background workers initialized successfully');

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing workers gracefully...');
  const { closeQueues } = require('../config/queue');
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing workers gracefully...');
  const { closeQueues } = require('../config/queue');
  await closeQueues();
  process.exit(0);
});

module.exports = {};

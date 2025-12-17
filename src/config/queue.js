const Queue = require('bull');
const logger = require('./logger');

// Redis connection options for Bull
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create queues for different background tasks
const queues = {
  email: new Queue('email', { redis: redisOptions }),
  imageProcessing: new Queue('image-processing', { redis: redisOptions }),
  roomCleanup: new Queue('room-cleanup', { redis: redisOptions }),
  reports: new Queue('reports', { redis: redisOptions }),
  
  // Очередь для микросервиса аналитики !!!
  analytics: new Queue('analytics', { redis: redisOptions }),
};

// Queue event handlers for monitoring
Object.entries(queues).forEach(([name, queue]) => {
  queue.on('completed', (job, result) => {
    logger.info(`✅ Queue [${name}] - Job ${job.id} completed:`, result);
  });

  queue.on('failed', (job, err) => {
    logger.error(`❌ Queue [${name}] - Job ${job.id} failed:`, err.message);
  });

  queue.on('error', (error) => {
    logger.error(`❌ Queue [${name}] error:`, error);
  });

  queue.on('waiting', (jobId) => {
    logger.info(`⏳ Queue [${name}] - Job ${jobId} is waiting`);
  });

  queue.on('active', (job) => {
    logger.info(`🔄 Queue [${name}] - Job ${job.id} started processing`);
  });

  queue.on('stalled', (job) => {
    logger.warn(`⚠️ Queue [${name}] - Job ${job.id} stalled`);
  });
});

// Helper function to add job to queue
const addJob = async (queueName, jobName, data, options = {}) => {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    };

    // Add job WITHOUT name - process handler will handle all jobs
    const job = await queue.add(data, { ...defaultOptions, ...options });
    logger.info(`➕ Job added to queue [${queueName}]: ${jobName} (ID: ${job.id})`);
    return job;
  } catch (error) {
    logger.error(`Error adding job to queue [${queueName}]:`, error);
    throw error;
  }
};

// Get queue stats
const getQueueStats = async (queueName) => {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    logger.error(`Error getting queue stats for [${queueName}]:`, error);
    throw error;
  }
};

// Get all queues stats
const getAllQueuesStats = async () => {
  const stats = {};
  for (const queueName of Object.keys(queues)) {
    stats[queueName] = await getQueueStats(queueName);
  }
  return stats;
};

// Clean old jobs from queue
const cleanQueue = async (queueName, grace = 24 * 3600 * 1000) => {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    logger.info(`🧹 Cleaned old jobs from queue [${queueName}]`);
  } catch (error) {
    logger.error(`Error cleaning queue [${queueName}]:`, error);
    throw error;
  }
};

// Pause queue
const pauseQueue = async (queueName) => {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`⏸️ Queue [${queueName}] paused`);
  } catch (error) {
    logger.error(`Error pausing queue [${queueName}]:`, error);
    throw error;
  }
};

// Resume queue
const resumeQueue = async (queueName) => {
  try {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`▶️ Queue [${queueName}] resumed`);
  } catch (error) {
    logger.error(`Error resuming queue [${queueName}]:`, error);
    throw error;
  }
};

// Graceful shutdown
const closeQueues = async () => {
  logger.info('Closing all queues...');
  for (const [name, queue] of Object.entries(queues)) {
    await queue.close();
    logger.info(`Queue [${name}] closed`);
  }
};

module.exports = {
  queues,
  addJob,
  getQueueStats,
  getAllQueuesStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  closeQueues,
};

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllQueuesStats, cleanQueue, pauseQueue, resumeQueue } = require('../config/queue');
const { addJob } = require('../config/queue');
const logger = require('../config/logger');

/**
 * @swagger
 * tags:
 *   name: Queues
 *   description: Background task queue management (Admin only)
 */

/**
 * @swagger
 * /api/queues/stats:
 *   get:
 *     summary: Get statistics for all queues
 *     tags: [Queues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getAllQueuesStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
    });
  }
});

/**
 * @swagger
 * /api/queues/cleanup:
 *   post:
 *     summary: Manually trigger room cleanup task
 *     tags: [Queues]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysInactive:
 *                 type: integer
 *                 default: 30
 *     responses:
 *       200:
 *         description: Cleanup task queued successfully
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const { daysInactive = 30 } = req.body;

    await addJob('roomCleanup', 'manual-cleanup', {
      action: 'cleanupInactiveRooms',
      data: { daysInactive },
    });

    res.json({
      success: true,
      message: 'Room cleanup task queued successfully',
    });
  } catch (error) {
    logger.error('Error queueing cleanup task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue cleanup task',
    });
  }
});

/**
 * @swagger
 * /api/queues/report:
 *   post:
 *     summary: Generate room activity report
 *     tags: [Queues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report generation queued successfully
 */
router.post('/report', authenticateToken, async (req, res) => {
  try {
    await addJob('roomCleanup', 'generate-report', {
      action: 'generateActivityReport',
    });

    res.json({
      success: true,
      message: 'Report generation queued successfully',
    });
  } catch (error) {
    logger.error('Error queueing report generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue report generation',
    });
  }
});

module.exports = router;

const { queues } = require('../config/queue');
const pool = require('../config/database');
const logger = require('../config/logger');
const { cache } = require('../config/redis');

/**
 * Clean up inactive rooms (older than specified days)
 */
const cleanupInactiveRooms = async (daysInactive = 30) => {
  const client = await pool.connect();

  try {
    logger.info(`🧹 Starting room cleanup (inactive > ${daysInactive} days)...`);

    // Find inactive rooms
    const findQuery = `
      SELECT id, title, creator_id, created_at, updated_at
      FROM rooms
      WHERE is_active = true
        AND updated_at < NOW() - INTERVAL '${daysInactive} days'
        AND NOT EXISTS (
          SELECT 1 FROM room_participants
          WHERE room_id = rooms.id
            AND joined_at > NOW() - INTERVAL '${daysInactive} days'
        )
    `;

    const result = await client.query(findQuery);
    const inactiveRooms = result.rows;

    if (inactiveRooms.length === 0) {
      logger.info('✅ No inactive rooms found');
      return { deletedCount: 0, rooms: [] };
    }

    logger.info(`Found ${inactiveRooms.length} inactive rooms to clean up`);

    // Soft delete inactive rooms
    const roomIds = inactiveRooms.map(r => r.id);
    const deleteQuery = `
      UPDATE rooms
      SET is_active = false, updated_at = NOW()
      WHERE id = ANY($1)
      RETURNING id, title
    `;

    const deleteResult = await client.query(deleteQuery, [roomIds]);

    // Invalidate cache for deleted rooms
    for (const room of deleteResult.rows) {
      await cache.del(`cache:room:${room.id}`);
      logger.info(`🗑️ Deactivated room: ${room.title} (ID: ${room.id})`);
    }

    // Invalidate rooms list cache
    await cache.del('cache:rooms:*');

    logger.info(`✅ Cleaned up ${deleteResult.rowCount} inactive rooms`);

    return {
      deletedCount: deleteResult.rowCount,
      rooms: deleteResult.rows,
    };
  } catch (error) {
    logger.error('❌ Room cleanup failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Clean up old chat messages (older than specified days)
 */
const cleanupOldChatMessages = async (daysOld = 90) => {
  const client = await pool.connect();

  try {
    logger.info(`🧹 Starting chat message cleanup (older than ${daysOld} days)...`);

    const deleteQuery = `
      DELETE FROM chat_messages
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING room_id
    `;

    const result = await client.query(deleteQuery);

    if (result.rowCount === 0) {
      logger.info('✅ No old chat messages found');
      return { deletedCount: 0 };
    }

    // Get unique room IDs to invalidate cache
    const roomIds = [...new Set(result.rows.map(r => r.room_id))];

    // Invalidate chat cache for affected rooms
    for (const roomId of roomIds) {
      await cache.del(`cache:chat:${roomId}:*`);
    }

    logger.info(`✅ Deleted ${result.rowCount} old chat messages from ${roomIds.length} rooms`);

    return {
      deletedCount: result.rowCount,
      affectedRooms: roomIds.length,
    };
  } catch (error) {
    logger.error('❌ Chat message cleanup failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Remove participants from inactive rooms
 */
const cleanupInactiveParticipants = async (hoursInactive = 24) => {
  const client = await pool.connect();

  try {
    logger.info(`🧹 Removing inactive participants (inactive > ${hoursInactive} hours)...`);

    const deleteQuery = `
      DELETE FROM room_participants
      WHERE joined_at < NOW() - INTERVAL '${hoursInactive} hours'
      RETURNING room_id, user_id, guest_name
    `;

    const result = await client.query(deleteQuery);

    if (result.rowCount === 0) {
      logger.info('✅ No inactive participants found');
      return { deletedCount: 0 };
    }

    // Get unique room IDs to invalidate cache
    const roomIds = [...new Set(result.rows.map(r => r.room_id))];

    // Invalidate room cache (participant count changed)
    for (const roomId of roomIds) {
      await cache.del(`cache:room:${roomId}`);
    }
    await cache.del('cache:rooms:*');

    logger.info(`✅ Removed ${result.rowCount} inactive participants from ${roomIds.length} rooms`);

    return {
      deletedCount: result.rowCount,
      affectedRooms: roomIds.length,
    };
  } catch (error) {
    logger.error('❌ Inactive participants cleanup failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Generate room activity report
 */
const generateRoomActivityReport = async () => {
  const client = await pool.connect();

  try {
    logger.info('📊 Generating room activity report...');

    const query = `
      SELECT
        r.id,
        r.title,
        r.creator_id,
        u.username as creator_username,
        r.created_at,
        r.updated_at,
        r.is_active,
        COUNT(DISTINCT rp.id) as total_participants,
        COUNT(DISTINCT CASE WHEN rp.joined_at > NOW() - INTERVAL '7 days' THEN rp.id END) as recent_participants,
        COUNT(DISTINCT cm.id) as total_messages,
        COUNT(DISTINCT CASE WHEN cm.created_at > NOW() - INTERVAL '7 days' THEN cm.id END) as recent_messages,
        MAX(cm.created_at) as last_message_at,
        MAX(rp.joined_at) as last_join_at
      FROM rooms r
      LEFT JOIN users u ON r.creator_id = u.id
      LEFT JOIN room_participants rp ON r.id = rp.room_id
      LEFT JOIN chat_messages cm ON r.id = cm.room_id
      WHERE r.is_active = true
      GROUP BY r.id, r.title, r.creator_id, u.username, r.created_at, r.updated_at, r.is_active
      ORDER BY recent_participants DESC, recent_messages DESC
    `;

    const result = await client.query(query);

    const report = {
      generatedAt: new Date(),
      totalActiveRooms: result.rowCount,
      rooms: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        creator: {
          id: row.creator_id,
          username: row.creator_username,
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        stats: {
          totalParticipants: parseInt(row.total_participants),
          recentParticipants: parseInt(row.recent_participants),
          totalMessages: parseInt(row.total_messages),
          recentMessages: parseInt(row.recent_messages),
          lastMessageAt: row.last_message_at,
          lastJoinAt: row.last_join_at,
        },
      })),
      summary: {
        totalParticipants: result.rows.reduce((sum, r) => sum + parseInt(r.total_participants), 0),
        totalMessages: result.rows.reduce((sum, r) => sum + parseInt(r.total_messages), 0),
        averageParticipantsPerRoom: result.rowCount > 0
          ? (result.rows.reduce((sum, r) => sum + parseInt(r.total_participants), 0) / result.rowCount).toFixed(2)
          : 0,
        averageMessagesPerRoom: result.rowCount > 0
          ? (result.rows.reduce((sum, r) => sum + parseInt(r.total_messages), 0) / result.rowCount).toFixed(2)
          : 0,
      },
    };

    logger.info(`✅ Room activity report generated: ${result.rowCount} active rooms`);

    return report;
  } catch (error) {
    logger.error('❌ Room activity report generation failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Room cleanup worker - register for all job types
queues.roomCleanup.process(async (job) => {
  logger.info(`🧹 Processing room cleanup job: ${job.name}`);

  const { action, data = {} } = job.data;

  try {
    switch (action) {
      case 'cleanupInactiveRooms': {
        const { daysInactive = 30 } = data;
        const result = await cleanupInactiveRooms(daysInactive);
        return { success: true, ...result };
      }

      case 'cleanupOldChatMessages': {
        const { daysOld = 90 } = data;
        const result = await cleanupOldChatMessages(daysOld);
        return { success: true, ...result };
      }

      case 'cleanupInactiveParticipants': {
        const { hoursInactive = 24 } = data;
        const result = await cleanupInactiveParticipants(hoursInactive);
        return { success: true, ...result };
      }

      case 'generateActivityReport': {
        const report = await generateRoomActivityReport();
        return { success: true, report };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    logger.error('❌ Room cleanup job failed:', error);
    throw error;
  }
});

logger.info('🧹 Room cleanup worker initialized');

module.exports = {
  cleanupInactiveRooms,
  cleanupOldChatMessages,
  cleanupInactiveParticipants,
  generateRoomActivityReport,
};

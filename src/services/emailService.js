const { addJob } = require('../config/queue');
const logger = require('../config/logger');

/**
 * Queue email sending tasks
 * This service adds email jobs to the queue for async processing
 */

/**
 * Send welcome email to new user
 * @param {string} email - User email
 * @param {string} username - Username
 */
const sendWelcomeEmail = async (email, username) => {
  try {
    await addJob('email', 'welcome-email', {
      type: 'welcome',
      to: email,
      data: { username },
    });
    logger.info(`📧 Welcome email queued for: ${email}`);
    return true;
  } catch (error) {
    logger.error('Error queueing welcome email:', error);
    return false;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetToken - Password reset token
 * @param {string} username - Username
 */
const sendPasswordResetEmail = async (email, resetToken, username) => {
  try {
    await addJob('email', 'password-reset-email', {
      type: 'passwordReset',
      to: email,
      data: { username, resetToken },
    }, {
      priority: 1, // High priority
    });
    logger.info(`📧 Password reset email queued for: ${email}`);
    return true;
  } catch (error) {
    logger.error('Error queueing password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send room invitation email
 * @param {string} email - User email
 * @param {string} username - Username
 * @param {string} roomTitle - Room title
 * @param {number} roomId - Room ID
 * @param {string} inviterName - Name of person who invited
 */
const sendRoomInvitationEmail = async (email, username, roomTitle, roomId, inviterName) => {
  try {
    await addJob('email', 'room-invitation-email', {
      type: 'roomInvitation',
      to: email,
      data: { username, roomTitle, roomId, inviterName },
    });
    logger.info(`📧 Room invitation email queued for: ${email}`);
    return true;
  } catch (error) {
    logger.error('Error queueing room invitation email:', error);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendRoomInvitationEmail,
};

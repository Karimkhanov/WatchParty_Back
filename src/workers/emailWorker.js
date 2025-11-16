const { queues } = require('../config/queue');
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Email transporter configuration
const createTransporter = () => {
  // For development - using Gmail
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // For production - using custom SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Email templates
const emailTemplates = {
  welcome: (username) => ({
    subject: 'Welcome to WatchParty! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WatchParty!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username}! 👋</h2>
              <p>Thank you for joining WatchParty - the best place to watch videos together with friends!</p>
              <p>Here's what you can do:</p>
              <ul>
                <li>🎬 Create your own watch party rooms</li>
                <li>👥 Invite friends to watch together</li>
                <li>💬 Chat in real-time while watching</li>
                <li>📺 Sync video playback with everyone</li>
              </ul>
              <p>Ready to get started?</p>
              <a href="${process.env.FRONTEND_URL}" class="button">Start Watching Now</a>
            </div>
            <div class="footer">
              <p>© 2024 WatchParty. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  passwordReset: (username, resetToken) => ({
    subject: 'Reset Your Password - WatchParty',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>We received a request to reset your password for your WatchParty account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${process.env.FRONTEND_URL}/reset-password/${resetToken}" class="button">Reset Password</a>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                This link will expire in 1 hour. If you didn't request this, please ignore this email.
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">
                ${process.env.FRONTEND_URL}/reset-password/${resetToken}
              </p>
            </div>
            <div class="footer">
              <p>© 2024 WatchParty. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  roomInvitation: (username, roomTitle, roomId, inviterName) => ({
    subject: `${inviterName} invited you to watch "${roomTitle}" 🎬`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .room-info { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username}!</h2>
              <p><strong>${inviterName}</strong> has invited you to join a watch party!</p>
              <div class="room-info">
                <h3>📺 ${roomTitle}</h3>
                <p>Join now and watch together in real-time!</p>
              </div>
              <a href="${process.env.FRONTEND_URL}/rooms/${roomId}" class="button">Join Watch Party</a>
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Can't click the button? Copy this link:<br>
                ${process.env.FRONTEND_URL}/rooms/${roomId}
              </p>
            </div>
            <div class="footer">
              <p>© 2024 WatchParty. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};

// Email worker processor
queues.email.process(async (job) => {
  const { type, to, data } = job.data;

  logger.info(`📧 Processing email job: ${type} to ${to}`);

  try {
    const transporter = createTransporter();

    let emailContent;

    // Generate email content based on type
    switch (type) {
      case 'welcome':
        emailContent = emailTemplates.welcome(data.username);
        break;
      case 'passwordReset':
        emailContent = emailTemplates.passwordReset(data.username, data.resetToken);
        break;
      case 'roomInvitation':
        emailContent = emailTemplates.roomInvitation(
          data.username,
          data.roomTitle,
          data.roomId,
          data.inviterName
        );
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send email
    const info = await transporter.sendMail({
      from: `"WatchParty" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    logger.info(`✅ Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('❌ Email sending failed:', error);
    throw error;
  }
});

logger.info('📧 Email worker initialized');

module.exports = { emailTemplates };

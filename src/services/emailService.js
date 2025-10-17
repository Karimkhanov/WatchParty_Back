// // src/services/emailService.js
// const nodemailer = require("nodemailer")
// const logger = require("../config/logger")

// // Create transporter (configure with your email service)
// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST || "smtp.gmail.com",
//   port: process.env.EMAIL_PORT || 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// })

// // Send password reset email
// const sendPasswordResetEmail = async (email, resetToken, username) => {
//   const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

//   const mailOptions = {
//     from: `"WatchParty" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: "Password Reset Request - WatchParty",
//     html: `
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <style>
//             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//             .header { background: #1a1a1a; color: #4ade80; padding: 20px; text-align: center; }
//             .content { background: #f4f4f4; padding: 30px; }
//             .button { display: inline-block; padding: 12px 30px; background: #4ade80; color: #1a1a1a; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
//             .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
//             .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>WatchParty</h1>
//             </div>
//             <div class="content">
//               <h2>Password Reset Request</h2>
//               <p>Hello ${username},</p>
//               <p>We received a request to reset your password for your WatchParty account.</p>
//               <p>Click the button below to reset your password:</p>
//               <a href="${resetUrl}" class="button">Reset Password</a>
//               <p>Or copy and paste this link into your browser:</p>
//               <p style="word-break: break-all; color: #4ade80;">${resetUrl}</p>
//               <div class="warning">
//                 <strong>⚠️ Security Notice:</strong>
//                 <ul>
//                   <li>This link will expire in 1 hour</li>
//                   <li>If you didn't request this reset, please ignore this email</li>
//                   <li>Never share this link with anyone</li>
//                 </ul>
//               </div>
//             </div>
//             <div class="footer">
//               <p>© 2025 WatchParty. All rights reserved.</p>
//               <p>This is an automated email, please do not reply.</p>
//             </div>
//           </div>
//         </body>
//       </html>
//     `,
//   }

//   try {
//     await transporter.sendMail(mailOptions)
//     logger.info(`Password reset email sent to: ${email}`)
//     return true
//   } catch (error) {
//     logger.error("Error sending password reset email:", error)
//     throw new Error("Failed to send password reset email")
//   }
// }

// // Send password reset confirmation email
// const sendPasswordResetConfirmation = async (email, username) => {
//   const mailOptions = {
//     from: `"WatchParty" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: "Password Successfully Reset - WatchParty",
//     html: `
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <style>
//             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//             .header { background: #1a1a1a; color: #4ade80; padding: 20px; text-align: center; }
//             .content { background: #f4f4f4; padding: 30px; }
//             .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
//             .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>WatchParty</h1>
//             </div>
//             <div class="content">
//               <h2>Password Reset Successful</h2>
//               <p>Hello ${username},</p>
//               <div class="success">
//                 <strong>✓ Your password has been successfully reset!</strong>
//               </div>
//               <p>You can now log in to your WatchParty account with your new password.</p>
//               <p>If you did not make this change, please contact our support team immediately.</p>
//             </div>
//             <div class="footer">
//               <p>© 2025 WatchParty. All rights reserved.</p>
//             </div>
//           </div>
//         </body>
//       </html>
//     `,
//   }

//   try {
//     await transporter.sendMail(mailOptions)
//     logger.info(`Password reset confirmation sent to: ${email}`)
//     return true
//   } catch (error) {
//     logger.error("Error sending confirmation email:", error)
//     // Don't throw error here, password was already reset
//     return false
//   }
// }

// module.exports = {
//   sendPasswordResetEmail,
//   sendPasswordResetConfirmation,
// }

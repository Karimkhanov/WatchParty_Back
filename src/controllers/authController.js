const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const pool = require("../config/database")
const logger = require("../config/logger")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const { sendWelcomeEmail, sendPasswordResetEmail } = require("../services/emailService")
const { addJob } = require("../config/queue")
const { cache } = require("../config/redis")

// ИЗМЕНЕНИЕ: Добавлен аргумент role в генерацию токена
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { id: userId, email, role }, // Зашиваем роль в payload
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  )
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       201: { description: "User registered successfully" }
 *       400: { description: "Validation error or user already exists" }
 *       500: { description: "Server error" }
 */
const register = async (req, res) => {
  try {

    console.log("DEBUG BODY:", JSON.stringify(req.body, null, 2)); 
    
    const { email, password, username, name } = req.body
    logger.info(`Registration attempt for email: ${email}`)

    const userExists = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username])
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: "User with this email or username already exists" })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    
    // Создаем пользователя (role по умолчанию 'user' из БД)
    const newUser = await pool.query(
      "INSERT INTO users (email, username, password, name) VALUES ($1, $2, $3, $4) RETURNING id, email, username, name, created_at, role",
      [email, username, hashedPassword, name || username],
    )
    const user = newUser.rows[0]
    
    // ИЗМЕНЕНИЕ: Передаем роль в генератор токена
    const token = generateToken(user.id, user.email, user.role)
    
    logger.info(`User registered successfully: ${user.email}`)

    // Send welcome email asynchronously
    sendWelcomeEmail(user.email, user.username).catch(err => {
      logger.error('Failed to send welcome email:', err)
    })

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role }, token },
    })
  } catch (error) {
    logger.error("Register error:", error)
    res.status(500).json({ success: false, message: "Server error during registration" })
  }
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 description: Can be email or username
 *               password:
 *                 type: string
 *     responses:
 *       200: { description: "Login successful" }
 *       401: { description: "Invalid credentials" }
 *       500: { description: "Server error" }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body
    logger.info(`Login attempt for: ${email}`)

    const result = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $1", [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" })
    }

    const user = result.rows[0]
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" })
    }

    // ИЗМЕНЕНИЕ: Передаем роль в генератор токена
    const token = generateToken(user.id, user.email, user.role)
    
    logger.info(`User logged in successfully: ${user.email}`)

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id, 
          email: user.email, 
          username: user.username, 
          name: user.name,
          bio: user.bio, 
          profile_picture: user.profile_picture, 
          phone_number: user.phone_number,
          role: user.role // Возвращаем роль на фронт
        },
        token,
      },
    })
  } catch (error) {
    logger.error("Login error:", error)
    res.status(500).json({ success: false, message: "Server error during login" })
  }
}

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "User profile retrieved successfully" }
 *       401: { description: "Unauthorized" }
 *       404: { description: "User not found" }
 *       500: { description: "Server error" }
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id

    // Try to get from cache first
    const cacheKey = `cache:user:${userId}:profile`
    const cachedProfile = await cache.get(cacheKey)

    if (cachedProfile) {
      logger.info(`Profile retrieved from cache for user: ${userId}`)
      return res.status(200).json({ success: true, data: { user: cachedProfile }, _cached: true })
    }

    const result = await pool.query(
      "SELECT id, email, username, name, bio, profile_picture, phone_number, role, created_at FROM users WHERE id = $1",
      [userId],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    // Cache the profile for 10 minutes
    await cache.set(cacheKey, result.rows[0], 600)

    logger.info(`Profile retrieved for user: ${userId}`)
    res.status(200).json({ success: true, data: { user: result.rows[0] } })
  } catch (error) {
    logger.error("Get profile error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
}

// ... Остальные методы (updateProfile, uploadProfilePicture, changePassword, forgotPassword, resetPassword) оставляем без изменений, так как роль там не влияет на логику ...
// Просто скопируй старые версии этих функций сюда.

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id
    const { name, username, email, bio, phone_number } = req.body
    logger.info(`Profile update attempt for user: ${userId} with data:`, req.body)

    if (username || email) {
      const checkQuery = username && email ? "SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3" : username ? "SELECT id FROM users WHERE username = $1 AND id != $2" : "SELECT id FROM users WHERE email = $1 AND id != $2"
      const checkParams = username && email ? [username, email, userId] : username ? [username, userId] : [email, userId]
      const existingUser = await pool.query(checkQuery, checkParams)
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Username or email already taken" })
      }
    }

    const updates = []
    const values = []
    let paramCount = 1

    if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name) }
    if (username !== undefined) { updates.push(`username = $${paramCount++}`); values.push(username) }
    if (email !== undefined) { updates.push(`email = $${paramCount++}`); values.push(email) }
    if (bio !== undefined) { updates.push(`bio = $${paramCount++}`); values.push(bio) }
    if (phone_number !== undefined) { updates.push(`phone_number = $${paramCount++}`); values.push(phone_number) }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" })
    }

    values.push(userId)
    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING id, email, username, name, bio, profile_picture, phone_number, role, created_at, updated_at`

    const result = await pool.query(query, values)

    // Invalidate user profile cache
    await cache.del(`cache:user:${userId}:profile`)

    logger.info(`Profile updated successfully for user: ${userId}`)
    res.status(200).json({ success: true, message: "Profile updated successfully", data: { user: result.rows[0] } })
  } catch (error) {
    logger.error("Update profile error:", error)
    res.status(500).json({ success: false, message: "Server error during profile update" })
  }
}

const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" })
    }

    const oldAvatarResult = await pool.query("SELECT profile_picture FROM users WHERE id = $1", [userId])
    const oldAvatarPath = oldAvatarResult.rows[0]?.profile_picture
    const newAvatarUrl = `/uploads/${req.file.filename}`

    const result = await pool.query("UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING profile_picture", [newAvatarUrl, userId])

    // Queue background tasks for image processing and cleanup
    if (oldAvatarPath) {
      // Delete old profile picture asynchronously
      addJob('imageProcessing', 'delete-old-avatar', {
        action: 'deleteOldProfilePicture',
        data: { filePath: oldAvatarPath }
      }).catch(err => logger.error('Failed to queue image deletion:', err))
    }

    // Optimize uploaded image asynchronously
    const uploadsDir = path.join(__dirname, '../../uploads')
    addJob('imageProcessing', 'optimize-avatar', {
      action: 'processProfilePicture',
      data: {
        inputPath: req.file.path,
        outputDir: uploadsDir,
        filename: req.file.filename,
        sizes: ['thumbnail', 'medium']
      }
    }).catch(err => logger.error('Failed to queue image optimization:', err))

    // Invalidate user profile cache
    await cache.del(`cache:user:${userId}:profile`)

    logger.info(`Profile picture updated for user ${userId}`)
    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: { profile_picture: result.rows[0].profile_picture },
    })
  } catch (error) {
    logger.error("Upload profile picture error:", error)
    if (req.file) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ success: false, message: "Server error" })
  }
}

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" })
    }

    const userResult = await pool.query("SELECT password FROM users WHERE id = $1", [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    const user = userResult.rows[0]
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId])

    logger.info(`Password changed successfully for user: ${userId}`)
    res.status(200).json({ success: true, message: "Password changed successfully" })
  } catch (error) {
    logger.error("Change password error:", error)
    res.status(500).json({ success: false, message: "Server error during password change" })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    logger.info(`Password reset requested for: ${email}`)

    const userResult = await pool.query("SELECT id, email, username FROM users WHERE email = $1", [email])
    if (userResult.rows.length === 0) {
      return res.status(200).json({ success: true, message: "If an account exists with this email, a password reset link has been sent" })
    }

    const user = userResult.rows[0]

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000)

    await pool.query(
      "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3",
      [resetToken, resetTokenExpires, user.id]
    )

    await sendPasswordResetEmail(user.email, resetToken, user.username)

    logger.info(`Password reset email sent to: ${email}`)
    res.status(200).json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent"
    })
  } catch (error) {
    logger.error("Forgot password error:", error)
    res.status(500).json({ success: false, message: "Server error during password reset request" })
  }
}

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body
    logger.info(`Password reset attempt with token: ${token.substring(0, 10)}...`)

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" })
    }

    const userResult = await pool.query(
      "SELECT id, email, username FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()",
      [token]
    )

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" })
    }

    const user = userResult.rows[0]

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await pool.query(
      "UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
      [hashedPassword, user.id]
    )

    logger.info(`Password reset successfully for user: ${user.email}`)
    res.status(200).json({ success: true, message: "Password has been reset successfully. You can now login with your new password." })
  } catch (error) {
    logger.error("Reset password error:", error)
    res.status(500).json({ success: false, message: "Server error during password reset" })
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  forgotPassword,
  resetPassword
}
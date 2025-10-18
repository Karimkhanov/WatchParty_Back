const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const pool = require("../config/database")
const logger = require("../config/logger")
const fs = require("fs")
const path = require("path")

const generateToken = (userId, email) => {
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" })
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
    const { email, password, username, name } = req.body
    logger.info(`Registration attempt for email: ${email}`)

    const userExists = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username])
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: "User with this email or username already exists" })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    
    // ИСПРАВЛЕНО: Код соответствует вашей таблице users с полем role по умолчанию
    const newUser = await pool.query(
      "INSERT INTO users (email, username, password, name) VALUES ($1, $2, $3, $4) RETURNING id, email, username, name, created_at, role",
      [email, username, hashedPassword, name || username],
    )
    const user = newUser.rows[0]
    const token = generateToken(user.id, user.email)
    logger.info(`User registered successfully: ${user.email}`)

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: { id: user.id, email: user.email, username: user.username, name: user.name }, token },
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

    const token = generateToken(user.id, user.email)
    logger.info(`User logged in successfully: ${user.email}`)

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id, email: user.email, username: user.username, name: user.name,
          bio: user.bio, profile_picture: user.profile_picture, phone_number: user.phone_number,
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
    const result = await pool.query(
      "SELECT id, email, username, name, bio, profile_picture, phone_number, role, created_at FROM users WHERE id = $1",
      [userId],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" })
    }
    logger.info(`Profile retrieved for user: ${userId}`)
    res.status(200).json({ success: true, data: { user: result.rows[0] } })
  } catch (error) {
    logger.error("Get profile error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update current user profile (text fields)
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     description: Send only the fields you want to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               username: { type: string }
 *               email: { type: string, format: email }
 *               bio: { type: string }
 *               phone_number: { type: string }
 *     responses:
 *       200: { description: "Profile updated successfully" }
 *       400: { description: "Validation error or no fields to update" }
 *       401: { description: "Unauthorized" }
 *       500: { description: "Server error" }
 */
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

    // ИСПРАВЛЕНО: Эта динамическая логика теперь 100% корректно обрабатывает
    // данные от любой формы, обновляя только те поля, которые были отправлены.
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
    logger.info(`Profile updated successfully for user: ${userId}`)
    res.status(200).json({ success: true, message: "Profile updated successfully", data: { user: result.rows[0] } })
  } catch (error) {
    logger.error("Update profile error:", error)
    res.status(500).json({ success: false, message: "Server error during profile update" })
  }
}

/**
 * @swagger
 * /api/auth/upload-profile-picture:
 *   post:
 *     summary: Upload or update user profile picture
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload (max 5MB).
 *     responses:
 *       200: { description: "Profile picture updated successfully" }
 *       400: { description: "No file uploaded or invalid file type" }
 *       500: { description: "Server error" }
 */
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

    if (oldAvatarPath) {
      const fullPath = path.join(__dirname, "..", "..", oldAvatarPath)
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
          logger.info(`Old avatar deleted: ${fullPath}`)
        }
      } catch (unlinkErr) {
        logger.error(`Error deleting old avatar: ${unlinkErr.message}`)
      }
    }

    logger.info(`Profile picture updated for user ${userId}`)
    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: { profile_picture: result.rows[0].profile_picture },
    })
  } catch (error) {
    logger.error("Upload profile picture error:", error)
    if (req.file) {
      // Если произошла ошибка в БД, удаляем только что загруженный файл
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: "Password changed successfully" }
 *       400: { description: "Invalid current password or new password too short" }
 *       401: { description: "Unauthorized" }
 *       500: { description: "Server error" }
 */
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

module.exports = { register, login, getProfile, updateProfile, changePassword, uploadProfilePicture }
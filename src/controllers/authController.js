const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const pool = require("../config/database")
const logger = require("../config/logger")

// Generate JWT token
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
 *             required:
 *               - email
 *               - username
 *               - password
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
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
const register = async (req, res) => {
  try {
    const { email, password, username, name } = req.body

    logger.info(`Registration attempt for email: ${email}`)

    // Check if user already exists
    const userExists = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username])

    if (userExists.rows.length > 0) {
      logger.warn(`Registration failed: User already exists - ${email}`)
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const newUser = await pool.query(
      "INSERT INTO users (email, username, password, name) VALUES ($1, $2, $3, $4) RETURNING id, email, username, name, created_at",
      [email, username, hashedPassword, name || username],
    )

    const user = newUser.rows[0]

    await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, $2)", [user.id, "user"])

    // Generate token
    const token = generateToken(user.id, user.email)

    logger.info(`User registered successfully: ${user.email}`)

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
        },
        token,
      },
    })
  } catch (error) {
    logger.error("Register error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    })
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
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    logger.info(`Login attempt for: ${email}`)

    // Check if user exists (allow login with email or username)
    const result = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $1", [email])

    if (result.rows.length === 0) {
      logger.warn(`Login failed: User not found - ${email}`)
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    const user = result.rows[0]

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password for ${email}`)
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    // Generate token
    const token = generateToken(user.id, user.email)

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
          avatar_url: user.avatar_url,
          phone: user.phone,
        },
        token,
      },
    })
  } catch (error) {
    logger.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during login",
    })
  }
}

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      "SELECT id, email, username, name, bio, avatar_url, phone, date_of_birth, country, city, role, created_at FROM users WHERE id = $1",
      [userId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    logger.info(`Profile retrieved for user: ${userId}`)

    res.status(200).json({
      success: true,
      data: {
        user: result.rows[0],
      },
    })
  } catch (error) {
    logger.error("Get profile error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               bio:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *               phone:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               country:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error or username/email already taken
 *       401:
 *         description: Unauthorized
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id
    const { name, username, email, bio, avatar_url, phone, date_of_birth, country, city } = req.body

    logger.info(`Profile update attempt for user: ${userId}`)

    // Check if username or email is being changed and if they're already taken by another user
    if (username || email) {
      const checkQuery =
        username && email
          ? "SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3"
          : username
            ? "SELECT id FROM users WHERE username = $1 AND id != $2"
            : "SELECT id FROM users WHERE email = $1 AND id != $2"

      const checkParams =
        username && email ? [username, email, userId] : username ? [username, userId] : [email, userId]

      const existingUser = await pool.query(checkQuery, checkParams)

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Username or email already taken by another user",
        })
      }
    }

    // Build dynamic update query
    const updates = []
    const values = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`)
      values.push(name)
      paramCount++
    }
    if (username !== undefined) {
      updates.push(`username = $${paramCount}`)
      values.push(username)
      paramCount++
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount}`)
      values.push(email)
      paramCount++
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`)
      values.push(bio)
      paramCount++
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount}`)
      values.push(avatar_url)
      paramCount++
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`)
      values.push(phone)
      paramCount++
    }
    if (date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramCount}`)
      values.push(date_of_birth)
      paramCount++
    }
    if (country !== undefined) {
      updates.push(`country = $${paramCount}`)
      values.push(country)
      paramCount++
    }
    if (city !== undefined) {
      updates.push(`city = $${paramCount}`)
      values.push(city)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(userId)

    const query = `
      UPDATE users 
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, email, username, name, bio, avatar_url, phone, date_of_birth, country, city, role, created_at, updated_at
    `

    const result = await pool.query(query, values)

    logger.info(`Profile updated successfully for user: ${userId}`)

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: result.rows[0],
      },
    })
  } catch (error) {
    logger.error("Update profile error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during profile update",
    })
  }
}

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 *       401:
 *         description: Unauthorized
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      })
    }

    // Get current user
    const userResult = await pool.query("SELECT password FROM users WHERE id = $1", [userId])

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const user = userResult.rows[0]

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password
    await pool.query("UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
      hashedPassword,
      userId,
    ])

    logger.info(`Password changed successfully for user: ${userId}`)

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    logger.error("Change password error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during password change",
    })
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
}

const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController")

const { authenticateToken } = require("../middleware/auth")
const logger = require("../config/logger")

// Настройка Multer для сохранения файлов в папку /uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/")
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

// Middleware для обработки загрузки одного файла с именем 'profilePicture'
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Ограничение 5MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

// Стандартные маршруты
router.post("/register", register)
router.post("/login", login)
router.get("/profile", authenticateToken, getProfile)
router.put("/profile", authenticateToken, updateProfile)
router.put("/change-password", authenticateToken, changePassword)

// НОВЫЙ МАРШРУТ для загрузки аватара
router.post(
  "/upload-profile-picture",
  authenticateToken,
  upload.single("profilePicture"),
  uploadProfilePicture
)

// Password reset routes
logger.info("🔧 Setting up password reset routes in authRoutes...")

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (or not, for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post("/forgot-password", (req, res, next) => {
  logger.info("📧 Forgot password route hit in authRoutes!")
  forgotPassword(req, res, next)
})

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: Reset user password using token from email
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token from email
 *                 example: abc123def456...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.post("/reset-password", (req, res, next) => {
  logger.info("🔐 Reset password route hit in authRoutes!")
  resetPassword(req, res, next)
})
logger.info("✅ Password reset routes configured in authRoutes")

module.exports = router
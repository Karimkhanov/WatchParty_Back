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

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Управление пользователями и аутентификация
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
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
 *         description: Пользователь успешно зарегистрирован
 *       400:
 *         description: Ошибка валидации или пользователь уже существует
 *       500:
 *         description: Ошибка сервера
 */
router.post("/register", register)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
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
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный вход, возвращает токен
 *       401:
 *         description: Неверный email или пароль
 *       500:
 *         description: Ошибка сервера
 */
router.post("/login", login)

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Получить профиль текущего пользователя
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные профиля
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Пользователь не найден
 */
router.get("/profile", authenticateToken, getProfile)

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Обновить профиль пользователя
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Профиль обновлен
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 */
router.put("/profile", authenticateToken, updateProfile)

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Изменить пароль
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
 *         description: Пароль успешно изменен
 *       400:
 *         description: Неверный текущий пароль или короткий новый пароль
 *       401:
 *         description: Не авторизован
 */
router.put("/change-password", authenticateToken, changePassword)

/**
 * @swagger
 * /api/auth/upload-profile-picture:
 *   post:
 *     summary: Загрузить аватар пользователя
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Фото профиля обновлено
 *       400:
 *         description: Файл не загружен или неверный формат
 *       500:
 *         description: Ошибка сервера
 */
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
 *     summary: Запрос на сброс пароля
 *     description: Отправляет письмо со ссылкой на сброс пароля
 *     tags: [Authentication]
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
 *         description: Письмо отправлено (если email существует)
 *       500:
 *         description: Ошибка сервера
 */
router.post("/forgot-password", (req, res, next) => {
  logger.info("📧 Forgot password route hit in authRoutes!")
  forgotPassword(req, res, next)
})

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Сброс пароля с использованием токена
 *     tags: [Authentication]
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
 *                 description: Токен из письма
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Пароль успешно сброшен
 *       400:
 *         description: Неверный или истекший токен
 *       500:
 *         description: Ошибка сервера
 */
router.post("/reset-password", (req, res, next) => {
  logger.info("🔐 Reset password route hit in authRoutes!")
  resetPassword(req, res, next)
})
logger.info("✅ Password reset routes configured in authRoutes")

module.exports = router
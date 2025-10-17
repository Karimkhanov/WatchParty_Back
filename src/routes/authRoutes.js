// src/routes/authRoutes.js
const express = require("express")
const router = express.Router()

// Импортируем контроллер аутентификации
const { register, login, getProfile, updateProfile, changePassword } = require("../controllers/authController")

// Импортируем middleware для проверки токена (для защищенных роутов)
const { authenticateToken } = require("../middleware/auth")

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, and profile management
 */

// Маршрут для регистрации нового пользователя
// POST /api/auth/register
router.post("/register", register)

// Маршрут для входа пользователя в систему
// POST /api/auth/login
router.post("/login", login)

// Маршрут для получения профиля текущего пользователя (защищенный)
// GET /api/auth/profile
router.get("/profile", authenticateToken, getProfile)

// PUT /api/auth/profile
router.put("/profile", authenticateToken, updateProfile)

// PUT /api/auth/change-password
router.put("/change-password", authenticateToken, changePassword)

module.exports = router

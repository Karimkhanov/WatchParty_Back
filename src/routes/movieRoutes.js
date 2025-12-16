const express = require("express")
const router = express.Router()
const {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
} = require("../controllers/movieController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")
const { validate } = require("../middleware/validator") // Предполагаю, что у тебя есть валидаторы для фильмов, если нет - можно убрать
const { cacheMiddleware } = require("../middleware/cache") // Если используешь кэш

// ПУБЛИЧНЫЕ маршруты (доступны всем: гостям, юзерам, админам)
router.get("/", cacheMiddleware(300), getAllMovies) // Кэш на 5 минут
router.get("/:id", cacheMiddleware(300), getMovieById)

// ЗАЩИЩЕННЫЕ маршруты (ТОЛЬКО ДЛЯ АДМИНА)
// Валидация прав: проверяем токен, а затем роль 'admin'
router.post(
  "/", 
  authenticateToken, 
  authorizeRoles("admin"), 
  createMovie
)

router.put(
  "/:id", 
  authenticateToken, 
  authorizeRoles("admin"), 
  updateMovie
)

router.delete(
  "/:id", 
  authenticateToken, 
  authorizeRoles("admin"), 
  deleteMovie
)

module.exports = router
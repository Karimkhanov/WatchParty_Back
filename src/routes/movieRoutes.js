const express = require("express")
const router = express.Router()
const {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getMovieRating,
  rateMovie
} = require("../controllers/movieController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")
const optionalAuth = require("../middleware/optionalAuth") 
const { cacheMiddleware } = require("../middleware/cache") 

/**
 * @swagger
 * tags:
 *   name: Movies
 *   description: Movie management API
 */



// Список фильмов 
router.get("/", cacheMiddleware(300), getAllMovies)

// Детали фильма 
router.get("/:id", optionalAuth, getMovieById)

// Внешний рейтинг
router.get("/:id/rating", getMovieRating);

// Поставить оценку
router.post("/:id/rate", authenticateToken, rateMovie);

// Админские функции (Создать)
router.post(
  "/", 
  authenticateToken, 
  authorizeRoles("admin"), 
  createMovie
)

// Админские функции (Обновить)
router.put(
  "/:id", 
  authenticateToken, 
  authorizeRoles("admin"), 
  updateMovie
)

// Админские функции (Удалить)
router.delete(
  "/:id", 
  authenticateToken, 
  authorizeRoles("admin"), 
  deleteMovie
)

module.exports = router
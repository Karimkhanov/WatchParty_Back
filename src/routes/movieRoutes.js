// src/routes/movieRoutes.js
const express = require("express")
const router = express.Router()

// Импортируем ВЕСЬ ОБЪЕКТ с функциями из контроллера
const movieController = require("../controllers/movieController")

// Импортируем middleware для проверки токена
const { authenticateToken } = require("../middleware/auth")

/**
 * @swagger
 * tags:
 *   name: Movies
 *   description: Movie management
 */

// === Публичные маршруты (доступны всем) ===

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Get all movies with pagination
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of movies with pagination
 */
router.get("/", movieController.getAllMovies)

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Get movie by ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Movie details
 *       404:
 *         description: Movie not found
 */
router.get("/:id", movieController.getMovieById)

// === Защищенные маршруты (требуется JWT токен) ===

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Create a new movie
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               poster_url:
 *                 type: string
 *               year:
 *                 type: integer
 *               genre:
 *                 type: string
 *               duration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Movie created successfully
 *       401:
 *         description: Authentication required
 */
router.post("/", authenticateToken, movieController.createMovie)

/**
 * @swagger
 * /api/movies/{id}:
 *   put:
 *     summary: Update a movie
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               poster_url:
 *                 type: string
 *               year:
 *                 type: integer
 *               genre:
 *                 type: string
 *               duration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Movie updated successfully
 *       404:
 *         description: Movie not found
 */
router.put("/:id", authenticateToken, movieController.updateMovie)

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Delete a movie
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Movie deleted successfully
 *       404:
 *         description: Movie not found
 */
router.delete("/:id", authenticateToken, movieController.deleteMovie)

// ЭКСПОРТИРУЕМ ГОТОВЫЙ РОУТЕР
module.exports = router

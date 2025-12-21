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
 *   description: Управление фильмами, рейтингами и поиском
 */

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Получить список фильмов (с поиском и фильтрами)
 *     description: Возвращает список фильмов с пагинацией. Поддерживает поиск через ElasticSearch (если доступен) или SQL. Кэшируется на 5 минут.
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию или описанию
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Фильтрация по жанру
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Количество элементов на странице
 *     responses:
 *       200:
 *         description: Успешный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     movies:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       500:
 *         description: Ошибка сервера
 */
router.get("/", cacheMiddleware(300), getAllMovies)

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Получить детали фильма
 *     description: Возвращает полную информацию о фильме. Если передан токен, возвращает также личную оценку пользователя.
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID фильма
 *     responses:
 *       200:
 *         description: Детали фильма
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     movie:
 *                       type: object
 *                     user_rating:
 *                       type: integer
 *                       description: Оценка текущего пользователя (или null)
 *       404:
 *         description: Фильм не найден
 */
router.get("/:id", optionalAuth, getMovieById)

/**
 * @swagger
 * /api/movies/{id}/rating:
 *   get:
 *     summary: Получить внешний рейтинг (Demo Circuit Breaker)
 *     description: Демонстрация работы Circuit Breaker. Делает запрос к внешнему API.
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные рейтинга
 *       500:
 *         description: Внешний сервис недоступен (Fallback)
 */
router.get("/:id/rating", getMovieRating);

/**
 * @swagger
 * /api/movies/{id}/rate:
 *   post:
 *     summary: Оценить фильм
 *     description: Поставить оценку фильму (от 1 до 10). Доступно только авторизованным пользователям.
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 8
 *     responses:
 *       200:
 *         description: Оценка сохранена, рейтинг фильма пересчитан
 */
router.post("/:id/rate", authenticateToken, rateMovie);

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Создать новый фильм (Только Админ)
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
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               poster_url:
 *                 type: string
 *               backdrop_url:
 *                 type: string
 *               video_url:
 *                 type: string
 *                 description: Ссылка на YouTube
 *               year:
 *                 type: integer
 *               genre:
 *                 type: string
 *               duration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Фильм создан и добавлен в ElasticSearch
 *       403:
 *         description: Нет прав (Нужен Admin)
 */
router.post(
  "/", 
  authenticateToken, 
  authorizeRoles("admin"), 
  createMovie
)

/**
 * @swagger
 * /api/movies/{id}:
 *   put:
 *     summary: Обновить фильм (Только Админ)
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
 *               backdrop_url:
 *                 type: string
 *               video_url:
 *                 type: string
 *               year:
 *                 type: integer
 *               genre:
 *                 type: string
 *               duration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Фильм обновлен
 *       403:
 *         description: Нет прав
 */
router.put(
  "/:id", 
  authenticateToken, 
  authorizeRoles("admin"), 
  updateMovie
)

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Удалить фильм (Только Админ)
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
 *         description: Фильм удален из БД и ElasticSearch
 *       403:
 *         description: Нет прав
 */
router.delete(
  "/:id", 
  authenticateToken, 
  authorizeRoles("admin"), 
  deleteMovie
)

module.exports = router
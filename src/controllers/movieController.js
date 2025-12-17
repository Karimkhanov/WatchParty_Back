// src/controllers/movieController.js
const pool = require("../config/database")
const logger = require("../config/logger")
const ratingBreaker = require("../services/ratingService");

const getAllMovies = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit

    const result = await pool.query(
      `SELECT m.*, u.username as created_by_username 
       FROM movies m 
       LEFT JOIN users u ON m.created_by = u.id 
       ORDER BY m.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    )

    const countResult = await pool.query("SELECT COUNT(*) FROM movies")
    const totalMovies = Number.parseInt(countResult.rows[0].count)

    logger.info(`Retrieved ${result.rows.length} movies`)

    res.status(200).json({
      success: true,
      data: {
        movies: result.rows,
        pagination: {
          page,
          limit,
          total: totalMovies,
          totalPages: Math.ceil(totalMovies / limit),
        },
      },
    })
  } catch (error) {
    logger.error("Get all movies error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while fetching movies",
    })
  }
}

const getMovieById = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT m.*, u.username as created_by_username 
       FROM movies m 
       LEFT JOIN users u ON m.created_by = u.id 
       WHERE m.id = $1`,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Movie not found" })
    }

    logger.info(`Movie retrieved: ${id}`)
    res.status(200).json({ success: true, data: { movie: result.rows[0] }})
  } catch (error) {
    logger.error("Get movie by ID error:", error)
    res.status(500).json({ success: false, message: "Server error while fetching movie" })
  }
}

const createMovie = async (req, res) => {
  try {
    const { title, description, poster_url, year, genre, duration } = req.body
    const userId = req.user.id

    const result = await pool.query(
      `INSERT INTO movies (title, description, poster_url, year, genre, duration, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [title, description, poster_url, year, genre, duration, userId],
    )

    logger.info(`Movie created: ${title} by user ${userId}`)
    res.status(201).json({ success: true, message: "Movie created successfully", data: { movie: result.rows[0] }})
  } catch (error) {
    logger.error("Create movie error:", error)
    res.status(500).json({ success: false, message: "Server error while creating movie" })
  }
}

const updateMovie = async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, poster_url, year, genre, duration } = req.body

    const movieCheck = await pool.query("SELECT * FROM movies WHERE id = $1", [id])
    if (movieCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Movie not found" })
    }

    const result = await pool.query(
      `UPDATE movies 
       SET title = COALESCE($1, title), description = COALESCE($2, description), poster_url = COALESCE($3, poster_url), 
           year = COALESCE($4, year), genre = COALESCE($5, genre), duration = COALESCE($6, duration),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [title, description, poster_url, year, genre, duration, id],
    )

    logger.info(`Movie updated: ${id}`)
    res.status(200).json({ success: true, message: "Movie updated successfully", data: { movie: result.rows[0] }})
  } catch (error) {
    logger.error("Update movie error:", error)
    res.status(500).json({ success: false, message: "Server error while updating movie" })
  }
}

const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query("DELETE FROM movies WHERE id = $1 RETURNING *", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Movie not found" })
    }

    logger.info(`Movie deleted: ${id}`)
    res.status(200).json({ success: true, message: "Movie deleted successfully", data: { movie: result.rows[0] }})
  } catch (error) {
    logger.error("Delete movie error:", error)
    res.status(500).json({ success: false, message: "Server error while deleting movie" })
  }
}


// Получение рейтинга через Circuit Breaker

const getMovieRating = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Вызываем не функцию напрямую, а через breaker.fire()
    const result = await ratingBreaker.fire(id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error("Circuit Breaker Error:", error);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}



// ЭКСПОРТИРУЕМ ВСЕ ФУНКЦИИ В ОДНОМ ОБЪЕКТЕ
module.exports = {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getMovieRating,
}
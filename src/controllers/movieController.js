const pool = require("../config/database")
const logger = require("../config/logger")
const ratingBreaker = require("../services/ratingService")
const { redis } = require("../config/redis")
const { indexMovie, removeMovie, searchMovies: searchInElastic } = require("../services/elasticService");

const clearMovieCache = async (movieId = null) => {
  try {
    const keys = await redis.keys("cache:/api/movies*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
    if (movieId) {
      await redis.del(`cache:/api/movies/${movieId}`);
    }
  } catch (error) {
    logger.error("Error clearing cache:", error);
  }
};

const getAllMovies = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 12
    const offset = (page - 1) * limit
    
    const search = req.query.search || ""
    const genre = req.query.genre || ""

    let queryText = `SELECT * FROM movies WHERE 1=1`
    const queryParams = []
    let paramCount = 1

    // Логика поиска через ElasticSearch
    if (search) {
        // Пытаемся найти ID фильмов через Elastic
        const elasticIds = await searchInElastic(search);

        if (elasticIds && elasticIds.length > 0) {
            // Elastic нашел фильмы -> запрашиваем их из БД по ID
            queryText += ` AND id = ANY($${paramCount})`
            queryParams.push(elasticIds)
            paramCount++
            logger.info(`🔍 ElasticSearch found ${elasticIds.length} movies for query: "${search}"`);
        } else if (elasticIds === null) {
            // Elastic недоступен -> Fallback на обычный SQL поиск
            logger.warn("⚠️ ElasticSearch down, using SQL fallback");
            queryText += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`
            queryParams.push(`%${search}%`)
            paramCount++
        } else {
            // Elastic доступен, но ничего не нашел -> возвращаем пустоту
            return res.status(200).json({
                success: true,
                data: { movies: [], pagination: { page, limit, total: 0, totalPages: 0 } }
            })
        }
    }

    if (genre) {
      queryText += ` AND genre = $${paramCount}`
      queryParams.push(genre)
      paramCount++
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    queryParams.push(limit, offset)

    const result = await pool.query(queryText, queryParams)

    const totalMovies = result.rows.length;

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
    res.status(500).json({ success: false, message: "Server error" })
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

    let userRating = null;
    if (req.user) {
        const ratingResult = await pool.query(
            "SELECT rating FROM movie_ratings WHERE user_id = $1 AND movie_id = $2",
            [req.user.id, id]
        );
        if (ratingResult.rows.length > 0) {
            userRating = ratingResult.rows[0].rating;
        }
    }

    res.status(200).json({ 
        success: true, 
        data: { 
            movie: result.rows[0],
            user_rating: userRating 
        }
    })
  } catch (error) {
    logger.error("Get movie by ID error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
}

const createMovie = async (req, res) => {
  try {
    const { title, description, poster_url, backdrop_url, video_url, year, genre, duration } = req.body
    const userId = req.user.id

    const result = await pool.query(
      `INSERT INTO movies (title, description, poster_url, backdrop_url, video_url, year, genre, duration, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [title, description, poster_url, backdrop_url, video_url, year, genre, duration, userId],
    )

    const newMovie = result.rows[0];

    // Добавляем в ElasticSearch (асинхронно)
    indexMovie(newMovie);
    
    await clearMovieCache();

    logger.info(`Movie created: ${title} by user ${userId}`)
    res.status(201).json({ success: true, message: "Movie created successfully", data: { movie: newMovie }})
  } catch (error) {
    logger.error("Create movie error:", error)
    res.status(500).json({ success: false, message: "Server error while creating movie" })
  }
}

const updateMovie = async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, poster_url, backdrop_url, video_url, year, genre, duration } = req.body

    const result = await pool.query(
      `UPDATE movies 
       SET title = COALESCE($1, title), 
           description = COALESCE($2, description), 
           poster_url = COALESCE($3, poster_url), 
           backdrop_url = COALESCE($4, backdrop_url),
           video_url = COALESCE($5, video_url),
           year = COALESCE($6, year), 
           genre = COALESCE($7, genre), 
           duration = COALESCE($8, duration),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 
       RETURNING *`,
      [title, description, poster_url, backdrop_url, video_url, year, genre, duration, id],
    )

    if (result.rows.length === 0) return res.status(404).json({message: "Not found"});

    const updatedMovie = result.rows[0];

    // Обновляем в ElasticSearch
    indexMovie(updatedMovie);

    await clearMovieCache(id);

    res.status(200).json({ success: true, message: "Movie updated", data: { movie: updatedMovie }})
  } catch (error) {
    logger.error("Update movie error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
}

const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query("DELETE FROM movies WHERE id = $1 RETURNING *", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Movie not found" })
    }

    // Удаляем из ElasticSearch
    removeMovie(id);

    await clearMovieCache(id);

    logger.info(`Movie deleted: ${id}`)
    res.status(200).json({ success: true, message: "Movie deleted successfully" })
  } catch (error) {
    logger.error("Delete movie error:", error)
    res.status(500).json({ success: false, message: "Server error while deleting movie" })
  }
}

const getMovieRating = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ratingBreaker.fire(id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

const rateMovie = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating } = req.body;
        const userId = req.user.id;

        const movieCheck = await pool.query("SELECT id FROM movies WHERE id = $1", [id]);
        if (movieCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Movie does not exist" });
        }

        if (!rating || rating < 1 || rating > 10) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 10" });
        }

        await pool.query(
            `INSERT INTO movie_ratings (user_id, movie_id, rating) VALUES ($1, $2, $3)
             ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating`,
            [userId, id, rating]
        );

        const statsResult = await pool.query(
            `SELECT AVG(rating) as average, COUNT(*) as count FROM movie_ratings WHERE movie_id = $1`,
            [id]
        );

        const newAverage = parseFloat(statsResult.rows[0].average || 0).toFixed(1);
        const newCount = statsResult.rows[0].count;

        const updatedMovie = await pool.query(
            `UPDATE movies SET vote_average = $1, vote_count = $2 WHERE id = $3 RETURNING *`,
            [newAverage, newCount, id]
        );

        await clearMovieCache(id);

        logger.info(`User ${userId} rated movie ${id} with ${rating}`);

        res.json({ success: true, message: "Rating submitted", data: updatedMovie.rows[0] });

    } catch (error) {
        logger.error("Rate movie error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
  getAllMovies, getMovieById, createMovie, updateMovie, deleteMovie, getMovieRating, rateMovie
}
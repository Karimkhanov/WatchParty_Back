const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

// Твой API Ключ
const TMDB_API_KEY = '15c095447ebc29a2449ba955d7c178e2';

// Настройки подключения
// Мы полагаемся на process.env.
// Если запуск через docker exec -> DB_HOST будет 'postgres' (из docker-compose)
// Если запуск локально -> DB_HOST будет 'localhost' (из .env)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // Постер
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280'; // Большой фон

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchMovies() {
  try {
    console.log(`🔌 Connecting to DB (${process.env.DB_HOST}:${process.env.DB_PORT})...`);
    
    // 1. Получаем список жанров
    const genresRes = await axios.get(`${BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`);
    const genresMap = {};
    genresRes.data.genres.forEach(g => genresMap[g.id] = g.name);

    console.log('✅ Genres loaded.');

    // 2. Получаем популярные фильмы (5 страниц = 100 фильмов)
    let moviesToProcess = [];
    for (let page = 1; page <= 5; page++) {
        console.log(`📥 Downloading page ${page}...`);
        try {
            const res = await axios.get(`${BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
            moviesToProcess = [...moviesToProcess, ...res.data.results];
        } catch (e) {
            console.error(`Error loading page ${page}:`, e.message);
        }
    }

    console.log(`🔥 Processing ${moviesToProcess.length} movies...`);

    // 3. Проходим по каждому фильму, получаем детали и сохраняем
    for (const movie of moviesToProcess) {
        try {
            // Получаем детали (видео, длительность)
            const detailsRes = await axios.get(`${BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=videos`);
            const details = detailsRes.data;

            // Ищем трейлер YouTube
            const trailer = details.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            const videoUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

            // Определяем жанр и год
            const genreName = movie.genre_ids.length > 0 ? genresMap[movie.genre_ids[0]] : 'Unknown';
            const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 2025;

            // Запрос в БД
            await pool.query(
                `INSERT INTO movies 
                (title, description, poster_url, backdrop_url, video_url, year, genre, duration, vote_average, vote_count, created_by) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    movie.title,
                    movie.overview,
                    movie.poster_path ? IMAGE_BASE_URL + movie.poster_path : null,
                    movie.backdrop_path ? BACKDROP_BASE_URL + movie.backdrop_path : null, // Теперь сохраняем backdrop
                    videoUrl,
                    year,
                    genreName,
                    details.runtime || 120,
                    movie.vote_average,
                    movie.vote_count,
                    1 // ID Админа (обычно 1)
                ]
            );

            console.log(`✅ Saved: ${movie.title}`);
            await sleep(50); // Пауза чтобы не забанили
        } catch (innerError) {
            console.error(`⚠️ Failed to save movie "${movie.title}":`, innerError.message);
        }
    }

    console.log('🎉 DONE! All movies added to Database.');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
  } finally {
    await pool.end();
  }
}

fetchMovies();
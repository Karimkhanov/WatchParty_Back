const { Pool } = require('pg');
const { client, indexName, createIndexWithSettings } = require('./services/elasticService');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const sync = async () => {
  console.log('🚀 Starting sync...');
  
  try {
    // УДАЛЯЕМ старый индекс (чтобы сбросить кривые настройки)
    console.log('🗑️ Deleting old index...');
    try {
        await client.indices.delete({ index: indexName });
        console.log('✅ Old index deleted.');
    } catch (e) {
        console.log('ℹ️ No old index found or delete failed (it is okay).');
    }

    // СОЗДАЕМ новый индекс с правильными настройками (N-grams)
    console.log('Hz Creating new index with autocomplete settings...');
    await createIndexWithSettings();

    // Получаем фильмы из БД
    const res = await pool.query('SELECT * FROM movies');
    const movies = res.rows;
    console.log(`📦 Found ${movies.length} movies in Postgres`);

    // Заливаем в Elastic
    for (const movie of movies) {
      await client.index({
        index: indexName,
        id: movie.id.toString(),
        document: {
          title: movie.title,
          description: movie.description,
          genre: movie.genre,
          year: movie.year,
          created_at: movie.created_at
        }
      });
      console.log(`✅ Indexed: ${movie.title}`);
    }

    // Обновляем, чтобы данные стали доступны для поиска сразу
    await client.indices.refresh({ index: indexName });

    console.log('🎉 Sync complete! Search should work now.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    pool.end();
    // Не закрываем клиент Elastic принудительно, пусть процесс завершится
    process.exit(0);
  }
};

sync();

// docker exec -it w2g_backend node src/syncElastic.js
// docker-compose down
// docker volume rm w2g_backend_elasticdata
// docker-compose up --build
const { Client } = require('@elastic/elasticsearch');
const logger = require('../config/logger');

const elasticUrl = process.env.ELASTIC_HOST || 'http://localhost:9200';

const client = new Client({ node: elasticUrl });
const indexName = 'movies';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initElastic = async () => {
  let isConnected = false;
  let attempts = 0;

  logger.info("⏳ ElasticSearch: Waiting for connection...");

  while (!isConnected) {
    try {
      const health = await client.cluster.health({});
      
      // !!! ИСПРАВЛЕНИЕ ЗДЕСЬ !!!
      // В новой версии клиента статус лежит сразу в health.status, а не в health.body.status
      // Мы добавим проверку на оба случая для надежности
      const status = health.status || (health.body && health.body.status);
      
      logger.info(`🟢 ElasticSearch connected! Status: ${status}`);
      isConnected = true;
    } catch (error) {
      attempts++;
      if (attempts % 5 === 0) {
        logger.warn(`⚠️ ElasticSearch still loading... (Attempt ${attempts}) - ${error.message}`);
      }
      await sleep(5000);
    }
  }

  try {
    const indexExists = await client.indices.exists({ index: indexName });
    // В v8 indexExists - это boolean, в v7 - объект с body
    // Делаем универсальную проверку
    const exists = typeof indexExists === 'boolean' ? indexExists : indexExists.body;

    if (!exists) {
      await client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              title: { type: 'text' },
              description: { type: 'text' },
              genre: { type: 'keyword' },
              year: { type: 'integer' }
            }
          }
        }
      });
      logger.info(`📦 Created ElasticSearch index: ${indexName}`);
    }
  } catch (error) {
    logger.error('🔴 Error creating index:', error.message);
  }
};

const indexMovie = async (movie) => {
  try {
    await client.index({
      index: indexName,
      id: movie.id.toString(),
      document: { // В v8 лучше использовать 'document' вместо 'body' для данных
        title: movie.title,
        description: movie.description,
        genre: movie.genre,
        year: movie.year,
        created_at: movie.created_at
      }
    });
    await client.indices.refresh({ index: indexName });
    logger.info(`🔍 Indexed movie in Elastic: ${movie.title}`);
  } catch (error) {
    // Если ошибка - логируем, но не крашим приложение
    // В v8 body может быть внутри параметра document, для совместимости оставим как есть
    // Если упадет - попробуем старый синтаксис в catch (но скорее всего document сработает)
    try {
        // Fallback для старых версий или другой структуры
        await client.index({
            index: indexName,
            id: movie.id.toString(),
            body: { 
                title: movie.title,
                description: movie.description,
                genre: movie.genre,
                year: movie.year,
                created_at: movie.created_at
            }
        });
    } catch (e) {
        logger.warn(`⚠️ Could not index movie: ${e.message}`);
    }
  }
};

const removeMovie = async (movieId) => {
  try {
    await client.delete({
      index: indexName,
      id: movieId.toString()
    });
    await client.indices.refresh({ index: indexName });
    logger.info(`🗑️ Removed movie ${movieId} from Elastic`);
  } catch (error) {
    logger.warn(`⚠️ Could not remove movie: ${error.message}`);
  }
};

const searchMovies = async (query) => {
  try {
    const result = await client.search({
      index: indexName,
      body: { // В поиске 'body' все еще используется
        query: {
          multi_match: {
            query: query,
            fields: ['title^3', 'description'],
            fuzziness: 'AUTO'
          }
        }
      }
    });

    // Обработка ответа для разных версий
    const hits = result.hits ? result.hits.hits : result.body.hits.hits;
    return hits.map(hit => parseInt(hit._id));
  } catch (error) {
    logger.error('ElasticSearch query failed:', error.message);
    return null;
  }
};

module.exports = {
  initElastic,
  indexMovie,
  removeMovie,
  searchMovies
};
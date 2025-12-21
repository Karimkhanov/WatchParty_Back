const { Client } = require('@elastic/elasticsearch');
const logger = require('../config/logger');

const elasticUrl = process.env.ELASTIC_HOST || 'http://localhost:9200';

const client = new Client({ node: elasticUrl });
const indexName = 'movies';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Функция создания индекса с настройками ---
const createIndexWithSettings = async () => {
  await client.indices.create({
    index: indexName,
    body: {
      settings: {
        analysis: {
          filter: {
            autocomplete_filter: {
              type: "edge_ngram",
              min_gram: 1,
              max_gram: 20
            }
          },
          analyzer: {
            autocomplete: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase", "autocomplete_filter"]
            }
          }
        }
      },
      mappings: {
        properties: {
          title: { 
            type: 'text',
            analyzer: 'autocomplete', // Сохраняем "нарезанным" (f, fn, fna...)
            search_analyzer: 'standard' // Ищем обычным текстом
          },
          description: { type: 'text' },
          genre: { type: 'keyword' },
          year: { type: 'integer' },
          created_at: { type: 'date' }
        }
      }
    }
  });
  logger.info(`📦 Created ElasticSearch index with Autocomplete: ${indexName}`);
};

// Инициализация при старте сервера
const initElastic = async () => {
  let isConnected = false;
  let attempts = 0;

  logger.info("⏳ ElasticSearch: Waiting for connection...");

  while (!isConnected) {
    try {
      const health = await client.cluster.health({});
      const status = health.status || (health.body && health.body.status);
      logger.info(`🟢 ElasticSearch connected! Status: ${status}`);
      isConnected = true;
    } catch (error) {
      attempts++;
      if (attempts % 5 === 0) {
        logger.warn(`⚠️ ElasticSearch still loading... (Attempt ${attempts})`);
      }
      await sleep(5000);
    }
  }

  try {
    const indexExists = await client.indices.exists({ index: indexName });
    const exists = typeof indexExists === 'boolean' ? indexExists : indexExists.body;

    if (!exists) {
      await createIndexWithSettings();
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
      document: { 
        title: movie.title,
        description: movie.description,
        genre: movie.genre,
        year: movie.year,
        created_at: movie.created_at
      }
    });
    await client.indices.refresh({ index: indexName });
    logger.info(`🔍 Indexed movie: ${movie.title}`);
  } catch (error) {
    // Игнорируем ошибку, если эластик еще не готов (чтобы не крашить создание фильма)
  }
};

const removeMovie = async (movieId) => {
  try {
    await client.delete({
      index: indexName,
      id: movieId.toString()
    });
    await client.indices.refresh({ index: indexName });
  } catch (error) {
    logger.warn(`⚠️ Could not remove movie: ${error.message}`);
  }
};

const searchMovies = async (query) => {
  try {
    const result = await client.search({
      index: indexName,
      body: {
        query: {
          bool: {
            should: [
              // Точное совпадение по началу слова (Autocomplete)
              // Это найдет "f", "fn", "fna"
              { 
                match: { 
                  title: { 
                    query: query,
                    operator: "and"
                  } 
                } 
              },
              // Нечеткий поиск (для опечаток: "fanfik")
              { 
                multi_match: {
                  query: query,
                  fields: ['title^3', 'description'],
                  fuzziness: 'AUTO'
                } 
              }
            ]
          }
        }
      }
    });

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
  searchMovies,
  client, 
  indexName, 
  createIndexWithSettings 
};
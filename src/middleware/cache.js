const { cache } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Middleware для кэширования GET запросов
 * @param {number} ttl - Time to live в секундах (по умолчанию 5 минут)
 * @param {function} keyGenerator - Функция для генерации ключа кэша
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Кэшируем только GET запросы
    if (req.method !== 'GET') {
      return next();
    }

    // Генерируем ключ кэша
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.originalUrl || req.url}`;

    try {
      // Проверяем наличие данных в кэше
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        logger.info(`💾 Cache HIT: ${cacheKey}`);
        return res.json({
          ...cachedData,
          _cached: true,
          _cacheKey: cacheKey
        });
      }

      logger.info(`🔍 Cache MISS: ${cacheKey}`);

      // Перехватываем оригинальный res.json
      const originalJson = res.json.bind(res);

      // Переопределяем res.json для кэширования ответа
      res.json = (data) => {
        // Сохраняем в кэш только успешные ответы
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch(err => {
            logger.error('Error saving to cache:', err);
          });
        }

        // Вызываем оригинальный метод
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // При ошибке кэша продолжаем без кэширования
      next();
    }
  };
};

/**
 * Генератор ключей для пользовательских запросов
 */
const cacheKeyGenerators = {
  // Для списка комнат
  rooms: (req) => {
    const { page = 1, limit = 10 } = req.query;
    return `cache:rooms:page:${page}:limit:${limit}`;
  },

  // Для конкретной комнаты
  roomById: (req) => `cache:room:${req.params.id}`,

  // Для списка фильмов
  movies: (req) => {
    const { page = 1, limit = 10 } = req.query;
    return `cache:movies:page:${page}:limit:${limit}`;
  },

  // Для конкретного фильма
  movieById: (req) => `cache:movie:${req.params.id}`,

  // Для сообщений чата
  chatMessages: (req) => {
    const { limit = 100 } = req.query;
    return `cache:chat:${req.params.roomId}:messages:${limit}`;
  },

  // Для профиля пользователя
  userProfile: (req) => `cache:user:${req.user.id}:profile`
};

/**
 * Middleware для инвалидации кэша после мутаций
 * @param {string|string[]} patterns - Паттерны ключей для удаления
 */
const invalidateCache = (...patterns) => {
  return async (req, res, next) => {
    // Перехватываем оригинальный res.json
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      // Инвалидируем кэш только для успешных мутаций
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            // Поддержка функций для динамических паттернов
            const key = typeof pattern === 'function' ? pattern(req) : pattern;
            await cache.del(key);
          }
        } catch (error) {
          logger.error('Cache invalidation error:', error);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  cacheKeyGenerators,
  invalidateCache
};

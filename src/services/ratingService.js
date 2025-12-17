const Opossum = require('opossum');
const axios = require('axios');
const logger = require('../config/logger');

// Функция, которая делает запрос во "Внешний мир"
const fetchExternalRating = async (movieId) => {
  // Эмуляция сбоя: Если ID фильма = 999, кидаем ошибку (чтобы проверить Breaker)
  if (movieId === '999') {
    throw new Error('Simulated External API Failure');
  }

  // Реальный запрос к внешнему API (используем JSONPlaceholder как имитацию)
  const response = await axios.get(`https://jsonplaceholder.typicode.com/posts/${movieId}`, {
    timeout: 2000 // Если отвечает дольше 2 сек - считать ошибкой
  });
  
  return {
    source: 'External API (IMDB)',
    rating: (Math.random() * 5 + 5).toFixed(1), // Генерация фейкового рейтинга
    data: response.data.title.substring(0, 20) + '...'
  };
};

// Настройки Circuit Breaker
const options = {
  timeout: 3000,             // Если функция выполняется дольше 3 сек - обрубить
  errorThresholdPercentage: 50, // Если 50% запросов падают - открыть прерыватель
  resetTimeout: 10000        // Через 10 сек попробовать снова (Half-Open)
};

// Оборачиваем нашу функцию в Breaker
const breaker = new Opossum(fetchExternalRating, options);

// === Обработка событий (Логирование) ===

// 1. Успех
breaker.on('success', (result) => {
  // logger.info('✅ Circuit Breaker: Success'); 
  // (Можно раскомментировать, но будет много спама)
});

// 2. Fallback (Сработала защита)
breaker.fallback((movieId) => {
  logger.warn(`⚠️ Circuit Breaker: Serving FALLBACK for movie ${movieId}`);
  return {
    source: 'Fallback (Graceful Degradation)',
    rating: 'N/A', // Возвращаем заглушку вместо ошибки
    note: 'External service is currently unavailable'
  };
});

// 3. Открытие цепи (Сервис умер)
breaker.on('open', () => {
  logger.error('🔴 Circuit Breaker is OPEN! External service is down.');
});

// 4. Закрытие цепи (Сервис ожил)
breaker.on('close', () => {
  logger.info('🟢 Circuit Breaker is CLOSED. External service is back online.');
});

module.exports = breaker;
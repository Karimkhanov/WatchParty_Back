const client = require('prom-client');

// Создаем реестр для хранения метрик
const register = new client.Registry();

// Включаем сбор стандартных метрик (CPU, память, event loop и т.д.)
client.collectDefaultMetrics({ register });

// Создаем кастомную метрику: Гистограмма длительности запросов
// Она поможет нам считать и 5xx ошибки, и время ответа
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5], // Интервалы времени
  registers: [register]
});

module.exports = {
  register,
  httpRequestDurationMicroseconds
};
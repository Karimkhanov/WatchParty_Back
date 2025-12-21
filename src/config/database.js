const { Pool } = require("pg");
const logger = require("./logger");
require("dotenv").config();

// Создаем пул соединений с базой данных
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Функция для "умного" подключения с повторными попытками
const connectWithRetry = async () => {
  let connected = false;
  
  // Бесконечный цикл, пока не подключимся
  while (!connected) {
    try {
      // Пытаемся получить клиента из пула
      const client = await pool.connect();
      // Если получилось - сразу освобождаем его
      client.release();
      
      logger.info("✅ Database connected successfully.");
      connected = true; // Выходим из цикла
    } catch (err) {
      // Если ошибка - логируем и ждем 5 секунд
      logger.warn(`⚠️ Database connection failed (${err.message}). Retrying in 5 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Запускаем процесс подключения при старте файла
connectWithRetry();

// Экспортируем пул для использования в контроллерах
module.exports = pool;
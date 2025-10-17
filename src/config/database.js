// src/config/database.js
const { Pool } = require("pg");
require("dotenv").config();

// Создаем пул соединений с базой данных
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Функция для создания всех необходимых таблиц
const createTables = async () => {
  const client = await pool.connect();
  try {
    console.log("Starting table creation...");

    // 1. Таблица пользователей (уже была)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("-> Users table is ready.");

    // 2. Таблица фильмов (уже была)
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        poster_url VARCHAR(500),
        year INTEGER,
        genre VARCHAR(100),
        duration INTEGER,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("-> Movies table is ready.");

    // 3. Таблица ролей пользователей (уже была)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        PRIMARY KEY (user_id, role)
      );
    `);
    console.log("-> User_roles table is ready.");

    // 4. Таблица комнат (ДОБАВЛЕНО)
    // Создаем эту таблицу после 'users', так как она ссылается на нее
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_url VARCHAR(500) NOT NULL,
        video_type VARCHAR(50) DEFAULT 'youtube',
        thumbnail_url VARCHAR(500),
        creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("-> Rooms table is ready.");

    // 5. Таблица участников комнат (ДОБАВЛЕНО)
    // Создаем после 'users' и 'rooms'
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_participants (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        guest_name VARCHAR(100),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (room_id, user_id)
      );
    `);
    console.log("-> Room_participants table is ready.");

    // 6. Таблица сообщений чата (ДОБАВЛЕНО)
    // Создаем после 'users' и 'rooms'
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        guest_name VARCHAR(100),
        message TEXT NOT NULL,
        is_guest BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("-> Chat_messages table is ready.");

    console.log("All tables initialized successfully.");

  } catch (error) {
    console.error("FATAL: Could not create tables.", error);
    process.exit(1);
  } finally {
    client.release();
  }
};

// Проверяем подключение и сразу же вызываем создание таблиц
pool.connect()
.then(client => {
  console.log("Database connected successfully.");
  client.release();
  // Запускаем инициализацию таблиц ПОСЛЕ успешного подключения
  createTables();
})
.catch(err => {
  console.error("FATAL: Database connection error.", err.stack);
  process.exit(1);
});

// Экспортируем 'pool', чтобы другие файлы могли делать запросы к БД
module.exports = pool;
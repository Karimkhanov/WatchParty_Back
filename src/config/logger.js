const winston = require("winston")

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Создаем список транспортов (куда выводить логи)
const transports = [
  // Консоль нужна всегда (и локально, и на Vercel)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
        }`
      })
    ),
  }),
]

// Добавляем запись в файлы ТОЛЬКО если мы НЕ в продакшене
// Vercel устанавливает NODE_ENV = "production", поэтому этот блок там не выполнится
if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.File({ filename: "logs/combined.log" })
  )
  transports.push(
    new winston.transports.File({ filename: "logs/error.log", level: "error" })
  )
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: transports, // Используем наш динамический список
})

module.exports = logger
const express = require("express")
const cors = require("cors")
const path = require("path")
const swaggerUi = require("swagger-ui-express")
require("dotenv").config()

const { register, httpRequestDurationMicroseconds } = require("./config/metrics")
require("./config/database")
const { redis } = require("./config/redis")
const { initElastic } = require("./services/elasticService")

require("./workers")

const authRoutes = require("./routes/authRoutes")
const movieRoutes = require("./routes/movieRoutes")
const roomRoutes = require("./routes/roomRoutes")
const chatRoutes = require("./routes/chatRoutes")
const queueRoutes = require("./routes/queueRoutes")
const logger = require("./config/logger")
const { forgotPassword, resetPassword } = require("./controllers/authController")
const { requestLogger } = require("./middleware/requestLogger")
const swaggerSpec = require("./config/swagger")

// Инициализируем ElasticSearch
initElastic();

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}))

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    if (req.path !== '/metrics' && !req.path.startsWith('/uploads')) {
        httpRequestDurationMicroseconds
          .labels(req.method, req.path, res.statusCode)
          .observe(duration);
    }
  });
  next();
});

app.use(requestLogger)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")))
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.post("/api/auth/forgot-password", (req, res, next) => {
  logger.info("🎯 Direct forgot-password route hit!")
  forgotPassword(req, res, next)
})
app.post("/api/auth/reset-password", (req, res, next) => {
  logger.info("🎯 Direct reset-password route hit!")
  resetPassword(req, res, next)
})

app.use("/api/auth", authRoutes)
app.use("/api/movies", movieRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/queues", queueRoutes)

app.get("/api/health", async (req, res) => {
  try {
    await redis.ping()
    res.status(200).json({
      success: true,
      message: "WatchParty API is running",
      redis: "connected",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Service degraded",
      redis: "disconnected",
      timestamp: new Date().toISOString()
    })
  }
})

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found" })
})

app.use((err, req, res, next) => {
  logger.error("Server error:", err)
  res.status(500).json({ success: false, message: "Internal server error" })
})

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`)
  logger.info(`Swagger docs available at http://localhost:${PORT}/api-docs`)
})
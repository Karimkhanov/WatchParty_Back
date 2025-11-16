const express = require("express")
const cors = require("cors")
const path = require("path") // <-- Убедитесь, что эта строка есть
const swaggerUi = require("swagger-ui-express")
require("dotenv").config()

require("./config/database")

// Initialize Redis and background workers
const { redis } = require("./config/redis")
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

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}))
app.use(express.json())
app.use(requestLogger)

// <-- Эта строка очень важна для отображения аватаров
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")))

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Direct password reset routes (workaround)
app.post("/api/auth/forgot-password", (req, res, next) => {
  logger.info("🎯 Direct forgot-password route hit!")
  forgotPassword(req, res, next)
})
app.post("/api/auth/reset-password", (req, res, next) => {
  logger.info("🎯 Direct reset-password route hit!")
  resetPassword(req, res, next)
})
logger.info("✅ Direct password reset routes registered")

app.use("/api/auth", authRoutes)
logger.info("✅ Auth routes registered")
app.use("/api/movies", movieRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/queues", queueRoutes)

app.get("/api/health", async (req, res) => {
  try {
    // Check Redis connection
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
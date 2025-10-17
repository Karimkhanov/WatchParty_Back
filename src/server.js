const express = require("express")
const cors = require("cors")
const swaggerUi = require("swagger-ui-express")
require("dotenv").config()

require("./config/database")

const authRoutes = require("./routes/authRoutes")
const movieRoutes = require("./routes/movieRoutes")
const roomRoutes = require("./routes/roomRoutes")
const chatRoutes = require("./routes/chatRoutes")
const logger = require("./config/logger")
const { requestLogger } = require("./middleware/requestLogger")
const swaggerSpec = require("./config/swagger")

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }))
app.use(express.json())
app.use(requestLogger)

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use("/api/auth", authRoutes)
app.use("/api/movies", movieRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/chat", chatRoutes)

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "WatchParty API is running" })
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

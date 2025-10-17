const logger = require("../config/logger")

// Middleware to log all incoming requests
const requestLogger = (req, res, next) => {
  const start = Date.now()

  // Log request
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  // Log response
  res.on("finish", () => {
    const duration = Date.now() - start
    logger.info("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    })
  })

  next()
}

module.exports = { requestLogger }

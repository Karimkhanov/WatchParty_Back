const { validationResult } = require("express-validator")
const logger = require("../config/logger")

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    logger.warn("Validation failed:", { errors: errors.array() })
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    })
  }

  next()
}

module.exports = { validate }

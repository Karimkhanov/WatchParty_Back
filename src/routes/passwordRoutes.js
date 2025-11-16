const express = require("express")
const router = express.Router()
const {
  forgotPassword,
  resetPassword,
} = require("../controllers/authController")

const logger = require("../config/logger")

// Password reset routes
logger.info("🔧 Setting up password reset routes...")
router.post("/forgot-password", (req, res, next) => {
  logger.info("📧 Forgot password route hit!")
  forgotPassword(req, res, next)
})
router.post("/reset-password", (req, res, next) => {
  logger.info("🔐 Reset password route hit!")
  resetPassword(req, res, next)
})
logger.info("✅ Password reset routes configured")

module.exports = router

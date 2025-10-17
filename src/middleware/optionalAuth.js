const jwt = require("jsonwebtoken")

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null
    req.isGuest = true
    return next()
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    req.isGuest = false
    next()
  } catch (error) {
    req.user = null
    req.isGuest = true
    next()
  }
}

module.exports = optionalAuth

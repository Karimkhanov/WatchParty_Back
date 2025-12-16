const jwt = require("jsonwebtoken")
const logger = require("../config/logger")

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid token.",
    })
  }

  const token = authHeader.substring(7)

  try {
    // Декодируем токен, чтобы получить данные пользователя (payload)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Добавляем информацию о пользователе в объект запроса (req)
    // Теперь в decoded есть { id, email, role }
    req.user = decoded 
    req.isGuest = false
    
    // Передаем управление следующему middleware
    next()
  } catch (error) {
    logger.warn("Token verification failed:", error.message)
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    })
  }
}

// ИЗМЕНЕНИЕ: Новая функция для проверки ролей
// Использование в роутах: authorizeRoles('admin') или authorizeRoles('admin', 'moderator')
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied. User ${req.user.id} (${req.user.role}) tried to access restricted route.`)
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      })
    }

    next()
  }
}

// Экспортируем как объект
module.exports = {
  authenticateToken,
  authorizeRoles, // Экспортируем новую функцию
}
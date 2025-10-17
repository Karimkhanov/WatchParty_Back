// src/middleware/auth.js
const jwt = require("jsonwebtoken")

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
    req.user = decoded 
    req.isGuest = false
    
    // Передаем управление следующему middleware
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    })
  }
}

// Экспортируем как объект, чтобы импорт { authenticateToken } работал корректно
module.exports = {
  authenticateToken,
}
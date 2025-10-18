const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture, // <-- Импорт новой функции
} = require("../controllers/authController")

const { authenticateToken } = require("../middleware/auth")

// Настройка Multer для сохранения файлов в папку /uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/")
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

// Middleware для обработки загрузки одного файла с именем 'profilePicture'
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Ограничение 5MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

// Стандартные маршруты
router.post("/register", register)
router.post("/login", login)
router.get("/profile", authenticateToken, getProfile)
router.put("/profile", authenticateToken, updateProfile)
router.put("/change-password", authenticateToken, changePassword)

// НОВЫЙ МАРШРУТ для загрузки аватара
router.post(
  "/upload-profile-picture",
  authenticateToken,
  upload.single("profilePicture"),
  uploadProfilePicture
)

module.exports = router
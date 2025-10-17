const express = require("express")
const router = express.Router()
const roomController = require("../controllers/roomController")
const optionalAuth = require("../middleware/optionalAuth")
const { authenticateToken } = require("../middleware/auth")

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Watch party room management
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: List of all rooms
 */
router.get("/", optionalAuth, roomController.getAllRooms)

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Room details with participants
 *       404:
 *         description: Room not found
 */
router.get("/:id", optionalAuth, roomController.getRoomById)

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - video_url
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               video_url:
 *                 type: string
 *               video_type:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room created successfully
 *       401:
 *         description: Authentication required
 */
router.post("/", authenticateToken, roomController.createRoom)

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Update a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               video_url:
 *                 type: string
 *               video_type:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Room updated successfully
 *       403:
 *         description: Only room creator can update
 *       404:
 *         description: Room not found
 */
router.put("/:id", authenticateToken, roomController.updateRoom)

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *       403:
 *         description: Only room creator can delete
 *       404:
 *         description: Room not found
 */
router.delete("/:id", authenticateToken, roomController.deleteRoom)

/**
 * @swagger
 * /api/rooms/{id}/join:
 *   post:
 *     summary: Join a room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guest_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Joined room successfully
 *       404:
 *         description: Room not found
 */
router.post("/:id/join", optionalAuth, roomController.joinRoom)

/**
 * @swagger
 * /api/rooms/{id}/leave:
 *   post:
 *     summary: Leave a room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Left room successfully
 */
router.post("/:id/leave", optionalAuth, roomController.leaveRoom)

module.exports = router

const express = require("express")
const router = express.Router()
const chatController = require("../controllers/chatController")
const optionalAuth = require("../middleware/optionalAuth")
const { cacheMiddleware, cacheKeyGenerators, invalidateCache } = require("../middleware/cache")

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Room chat messages
 */

/**
 * @swagger
 * /api/chat/{roomId}/messages:
 *   get:
 *     summary: Get all messages for a room
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get("/:roomId/messages", optionalAuth, cacheMiddleware(60, cacheKeyGenerators.chatMessages), chatController.getMessages)

/**
 * @swagger
 * /api/chat/{roomId}/messages:
 *   post:
 *     summary: Send a message to a room
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               guest_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Message cannot be empty
 */
router.post("/:roomId/messages", optionalAuth, invalidateCache(req => `cache:chat:${req.params.roomId}:*`), chatController.sendMessage)

module.exports = router

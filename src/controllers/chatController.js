// src/controllers/chatController.js
const ChatMessage = require("../models/ChatMessage");
const logger = require("../config/logger");

exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await ChatMessage.findByRoomId(roomId);
    res.json({ success: true, data: messages });
  } catch (error) {
    logger.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message, guest_name } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }
    
    // В req.user.id теперь хранится id пользователя из токена
    const userId = req.user ? req.user.id : null; 

    const chatMessage = await ChatMessage.create({
      room_id: roomId,
      user_id: userId,
      guest_name: userId ? null : (guest_name || "Guest"),
      message: message.trim(),
    });

    res.status(201).json({ success: true, data: chatMessage });
  } catch (error) {
    logger.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};
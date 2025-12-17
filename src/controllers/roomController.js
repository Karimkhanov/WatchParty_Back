const Room = require("../models/Room")
const logger = require("../config/logger")
const { addJob } = require("../config/queue");

exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll()
    res.json({ success: true, data: rooms })
  } catch (error) {
    logger.error("Error fetching rooms:", error)
    res.status(500).json({ success: false, message: "Failed to fetch rooms" })
  }
}

exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params
    const room = await Room.findById(id)

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" })
    }

    const participants = await Room.getParticipants(id)
    res.json({ success: true, data: { ...room, participants } })
  } catch (error) {
    logger.error("Error fetching room:", error)
    res.status(500).json({ success: false, message: "Failed to fetch room" })
  }
}

exports.createRoom = async (req, res) => {
  try {
    if (req.isGuest) {
      return res.status(401).json({ success: false, message: "Authentication required to create rooms" })
    }

    const { title, description, video_url, video_type, thumbnail_url } = req.body

    if (!title || !video_url) {
      return res.status(400).json({ success: false, message: "Title and video URL are required" })
    }

    const room = await Room.create({
      title,
      description,
      video_url,
      video_type,
      thumbnail_url,
      creator_id: req.user.id,
    })

    await Room.addParticipant(room.id, req.user.id)

    // Отправляем событие в микросервис аналитики 
    addJob('analytics', 'room-created-event', {
      event: 'ROOM_CREATED',
      timestamp: Date.now(),
      data: {
        roomId: room.id,
        roomTitle: room.title,
        creatorId: req.user.id
      }
    }).catch(err => logger.error('Failed to send analytics event:', err));

    res.status(201).json({ success: true, data: room })
  } catch (error) {
    logger.error("Error creating room:", error)
    res.status(500).json({ success: false, message: "Failed to create room" })
  }
}

exports.updateRoom = async (req, res) => {
  try {
    if (req.isGuest) {
      return res.status(401).json({ success: false, message: "Authentication required" })
    }

    const { id } = req.params
    const room = await Room.findById(id)

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" })
    }

    // Админ тоже может обновлять комнату
    if (room.creator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only room creator or admin can update the room" })
    }

    const { title, description, video_url, video_type, thumbnail_url } = req.body
    const updatedRoom = await Room.update(id, { title, description, video_url, video_type, thumbnail_url })

    res.json({ success: true, data: updatedRoom })
  } catch (error) {
    logger.error("Error updating room:", error)
    res.status(500).json({ success: false, message: "Failed to update room" })
  }
}

exports.deleteRoom = async (req, res) => {
  try {
    // ЛОГИ ДЛЯ ОТЛАДКИ 
    console.log("-------------------------------------------------");
    console.log("🛑 DEBUG DELETE ROOM:");
    console.log("👤 User ID form Token:", req.user.id);
    console.log("👑 User Role from Token:", req.user.role); 
    
    if (req.isGuest) {
      return res.status(401).json({ success: false, message: "Authentication required" })
    }

    const { id } = req.params
    const room = await Room.findById(id)

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" })
    }
    
    console.log("🏠 Room Creator ID:", room.creator_id);
    
    // Проверка прав
    const isCreator = room.creator_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    console.log(`🔍 Check: Is Creator? ${isCreator} | Is Admin? ${isAdmin}`);

    // Админ может удалить любую комнату (Модерация)
    if (!isCreator && !isAdmin) {
      console.log("❌ ACCESS DENIED");
      return res.status(403).json({ success: false, message: "Only room creator or admin can delete the room" })
    }

    await Room.delete(id)
    logger.info(`Room ${id} deleted by user ${req.user.id} (Role: ${req.user.role})`)
    res.json({ success: true, message: "Room deleted successfully" })
  } catch (error) {
    logger.error("Error deleting room:", error)
    res.status(500).json({ success: false, message: "Failed to delete room" })
  }
}

exports.joinRoom = async (req, res) => {
  try {
    const { id } = req.params
    const { guest_name } = req.body

    const room = await Room.findById(id)
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" })
    }

    if (req.isGuest && !guest_name) {
      return res.status(400).json({ success: false, message: "Guest name is required" })
    }

    const participant = await Room.addParticipant(
      id,
      req.isGuest ? null : req.user.id,
      req.isGuest ? guest_name : null,
    )

    res.json({ success: true, data: participant })
  } catch (error) {
    logger.error("Error joining room:", error)
    res.status(500).json({ success: false, message: "Failed to join room" })
  }
}

exports.leaveRoom = async (req, res) => {
  try {
    if (req.isGuest) {
      return res.json({ success: true, message: "Guest left the room" })
    }

    const { id } = req.params
    await Room.removeParticipant(id, req.user.id)
    res.json({ success: true, message: "Left room successfully" })
  } catch (error) {
    logger.error("Error leaving room:", error)
    res.status(500).json({ success: false, message: "Failed to leave room" })
  }
}
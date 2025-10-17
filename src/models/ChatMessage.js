// src/models/ChatMessage.js
const pool = require("../config/database");

class ChatMessage {
  static async create({ room_id, user_id, guest_name, message }) {
    const is_guest = !user_id;
    const query = `
      INSERT INTO chat_messages (room_id, user_id, guest_name, message, is_guest)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [room_id, user_id, guest_name, message, is_guest];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByRoomId(room_id, limit = 100) {
    const query = `
      SELECT 
        cm.*,
        u.username
      FROM chat_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.room_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [room_id, limit]);
    return result.rows.reverse(); // Отправляем в хронологическом порядке
  }
}

module.exports = ChatMessage;
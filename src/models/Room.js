// src/models/Room.js
const pool = require("../config/database");

class Room {
  static async create({ title, description, video_url, video_type, thumbnail_url, creator_id }) {
    const query = `
      INSERT INTO rooms (title, description, video_url, video_type, thumbnail_url, creator_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [title, description, video_url, video_type || "youtube", thumbnail_url, creator_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT 
        r.*,
        u.username as creator_username,
        (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id = r.id) as participant_count
      FROM rooms r
      LEFT JOIN users u ON r.creator_id = u.id
      WHERE r.is_active = true
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
  
  static async findById(id) {
    const query = `
      SELECT r.*, u.username as creator_username
      FROM rooms r
      LEFT JOIN users u ON r.creator_id = u.id
      WHERE r.id = $1 AND r.is_active = true
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // ... (остальные методы класса Room)
  static async update(id, { title, description, video_url }) {
     const query = `UPDATE rooms SET title = $1, description = $2, video_url = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`;
     const values = [title, description, video_url, id];
     const result = await pool.query(query, values);
     return result.rows[0];
  }

  static async delete(id) {
    await pool.query('UPDATE rooms SET is_active = false WHERE id = $1', [id]);
  }

  static async addParticipant(room_id, user_id, guest_name = null) {
    const query = `INSERT INTO room_participants (room_id, user_id, guest_name) VALUES ($1, $2, $3) RETURNING *`;
    const values = [room_id, user_id, guest_name];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  static async getParticipants(room_id) {
    const query = `SELECT u.id, u.username FROM room_participants rp JOIN users u ON rp.user_id = u.id WHERE rp.room_id = $1`;
    const result = await pool.query(query, [room_id]);
    return result.rows;
  }

  static async removeParticipant(room_id, user_id) {
    await pool.query('DELETE FROM room_participants WHERE room_id = $1 AND user_id = $2', [room_id, user_id]);
  }
}

module.exports = Room;
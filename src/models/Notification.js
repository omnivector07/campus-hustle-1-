const db = require('../config/database');

const Notification = {
  create({ userId, type, title, message, link = null }) {
    const result = db.prepare(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, type, title, message, link);
    return result.lastInsertRowid;
  },

  listByUser(userId, { unreadOnly = false, limit = 50 } = {}) {
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];
    if (unreadOnly) sql += ' AND is_read = 0';
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return db.prepare(sql).all(...params);
  },

  countUnread(userId) {
    return db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).count;
  },

  markRead(id, userId) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
  },

  markAllRead(userId) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  },
};

module.exports = Notification;

const db = require('../config/database');

const User = {
  create({ email, passwordHash, role }) {
    const stmt = db.prepare(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
    );
    const result = stmt.run(email.toLowerCase().trim(), passwordHash, role);
    return result.lastInsertRowid;
  },

  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  },

  setActive(id, isActive) {
    db.prepare('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(isActive ? 1 : 0, id);
  },

  delete(id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  countAll() {
    return db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  },

  countByRole(role) {
    return db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role).count;
  },

  listAll({ limit = 100, offset = 0 } = {}) {
    return db.prepare(
      `SELECT u.id, u.email, u.role, u.is_active, u.created_at,
              p.full_name, p.phone, p.department, p.faculty, p.rating_avg, p.completed_jobs
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset);
  },
};

module.exports = User;

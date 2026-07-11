const db = require('../config/database');

const Category = {
  listActive() {
    return db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC').all();
  },

  listAll() {
    return db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  findBySlug(slug) {
    return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
  },

  create({ name, slug }) {
    const result = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug);
    return result.lastInsertRowid;
  },

  setActive(id, isActive) {
    db.prepare('UPDATE categories SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
  },

  delete(id) {
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },
};

module.exports = Category;

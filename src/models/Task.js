const db = require('../config/database');

const TASK_SELECT = `
  SELECT t.*,
         c.name AS category_name, c.slug AS category_slug,
         cp.full_name AS customer_name, cp.phone AS customer_phone,
         wp.full_name AS worker_name, wp.phone AS worker_phone, wp.profile_picture AS worker_picture
  FROM tasks t
  JOIN categories c ON c.id = t.category_id
  JOIN profiles cp ON cp.user_id = t.customer_id
  LEFT JOIN profiles wp ON wp.user_id = t.assigned_worker_id
`;

const Task = {
  create({ customerId, title, description, categoryId, budget, deadline, location }) {
    const result = db.prepare(
      `INSERT INTO tasks (customer_id, title, description, category_id, budget, deadline, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`
    ).run(customerId, title, description, categoryId, budget, deadline, location);
    return result.lastInsertRowid;
  },

  findById(id) {
    return db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(id);
  },

  /**
   * Search and filter open tasks available to workers.
   */
  search({ q, categoryId, minBudget, maxBudget, location, sort = 'newest', limit = 50, offset = 0 } = {}) {
    const clauses = ["t.status = 'open'"];
    const params = [];

    if (q) {
      clauses.push('(t.title LIKE ? OR t.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (categoryId) {
      clauses.push('t.category_id = ?');
      params.push(categoryId);
    }
    if (minBudget) {
      clauses.push('t.budget >= ?');
      params.push(minBudget);
    }
    if (maxBudget) {
      clauses.push('t.budget <= ?');
      params.push(maxBudget);
    }
    if (location) {
      clauses.push('t.location LIKE ?');
      params.push(`%${location}%`);
    }

    const orderBy = sort === 'oldest' ? 't.date_posted ASC' : 't.date_posted DESC';

    const sql = `${TASK_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  },

  listByCustomer(customerId, { status } = {}) {
    let sql = `${TASK_SELECT} WHERE t.customer_id = ?`;
    const params = [customerId];
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY t.date_posted DESC';
    return db.prepare(sql).all(...params);
  },

  listByWorker(workerId, { status } = {}) {
    let sql = `${TASK_SELECT} WHERE t.assigned_worker_id = ?`;
    const params = [workerId];
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY t.date_posted DESC';
    return db.prepare(sql).all(...params);
  },

  updateStatus(id, status) {
    db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  },

  assignWorker(id, workerId) {
    db.prepare(
      "UPDATE tasks SET assigned_worker_id = ?, status = 'assigned', updated_at = datetime('now') WHERE id = ?"
    ).run(workerId, id);
  },

  update(id, fields) {
    const allowed = ['title', 'description', 'category_id', 'budget', 'deadline', 'location'];
    const setClauses = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (setClauses.length === 0) return;
    setClauses.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id) {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  },

  countAll() {
    return db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  },

  countByStatus(status) {
    return db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get(status).count;
  },

  listAllForAdmin({ limit = 100, offset = 0 } = {}) {
    return db.prepare(`${TASK_SELECT} ORDER BY t.date_posted DESC LIMIT ? OFFSET ?`).all(limit, offset);
  },
};

module.exports = Task;

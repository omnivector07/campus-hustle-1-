const db = require('../config/database');

const REVIEW_SELECT = `
  SELECT r.*, cp.full_name AS customer_name, t.title AS task_title
  FROM reviews r
  JOIN profiles cp ON cp.user_id = r.customer_id
  JOIN tasks t ON t.id = r.task_id
`;

const Review = {
  create({ taskId, customerId, workerId, rating, comment = null }) {
    const result = db.prepare(
      'INSERT INTO reviews (task_id, customer_id, worker_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
    ).run(taskId, customerId, workerId, rating, comment);
    return result.lastInsertRowid;
  },

  findByTaskId(taskId) {
    return db.prepare(`${REVIEW_SELECT} WHERE r.task_id = ?`).get(taskId);
  },

  listByWorker(workerId) {
    return db.prepare(`${REVIEW_SELECT} WHERE r.worker_id = ? ORDER BY r.created_at DESC`).all(workerId);
  },
};

module.exports = Review;

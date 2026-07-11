const db = require('../config/database');

const APPLICATION_SELECT = `
  SELECT a.*,
         wp.full_name AS worker_name, wp.phone AS worker_phone, wp.profile_picture AS worker_picture,
         wp.rating_avg AS worker_rating, wp.completed_jobs AS worker_completed_jobs,
         t.title AS task_title, t.customer_id AS task_customer_id
  FROM applications a
  JOIN profiles wp ON wp.user_id = a.worker_id
  JOIN tasks t ON t.id = a.task_id
`;

const Application = {
  create({ taskId, workerId, message = null }) {
    const result = db.prepare(
      "INSERT INTO applications (task_id, worker_id, message, status) VALUES (?, ?, ?, 'pending')"
    ).run(taskId, workerId, message);
    return result.lastInsertRowid;
  },

  findById(id) {
    return db.prepare(`${APPLICATION_SELECT} WHERE a.id = ?`).get(id);
  },

  findByTaskAndWorker(taskId, workerId) {
    return db.prepare('SELECT * FROM applications WHERE task_id = ? AND worker_id = ?').get(taskId, workerId);
  },

  listByTask(taskId) {
    return db.prepare(`${APPLICATION_SELECT} WHERE a.task_id = ? ORDER BY a.applied_at ASC`).all(taskId);
  },

  listByWorker(workerId, { status } = {}) {
    let sql = `${APPLICATION_SELECT} WHERE a.worker_id = ?`;
    const params = [workerId];
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY a.applied_at DESC';
    return db.prepare(sql).all(...params);
  },

  updateStatus(id, status) {
    db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  },

  rejectAllOtherApplicants(taskId, acceptedApplicationId) {
    db.prepare(
      "UPDATE applications SET status = 'rejected', updated_at = datetime('now') WHERE task_id = ? AND id != ? AND status = 'pending'"
    ).run(taskId, acceptedApplicationId);
  },

  delete(id) {
    db.prepare('DELETE FROM applications WHERE id = ?').run(id);
  },
};

module.exports = Application;

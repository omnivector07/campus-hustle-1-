const User = require('../models/User');
const Task = require('../models/Task');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

async function dashboard(request, reply) {
  const totalUsers = User.countAll();
  const totalCustomers = User.countByRole('customer');
  const totalWorkers = User.countByRole('worker');
  const totalTasks = Task.countAll();
  const completedTasks = Task.countByStatus('completed');
  const pendingTasks = Task.countByStatus('open') + Task.countByStatus('assigned');
  const cancelledTasks = Task.countByStatus('cancelled');

  return sendSuccess(reply, {
    data: {
      total_users: totalUsers,
      total_customers: totalCustomers,
      total_workers: totalWorkers,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      cancelled_tasks: cancelledTasks,
    },
  });
}

async function listUsers(request, reply) {
  const limit = request.query.limit ? Math.min(Number(request.query.limit), 200) : 100;
  const offset = request.query.offset ? Number(request.query.offset) : 0;
  const users = User.listAll({ limit, offset });
  return sendSuccess(reply, { data: users });
}

async function deleteUser(request, reply) {
  const { id } = request.params;
  const user = User.findById(id);
  if (!user) {
    return sendError(reply, { statusCode: 404, message: 'User not found.' });
  }
  if (user.role === 'admin') {
    return sendError(reply, { statusCode: 403, message: 'Admin accounts cannot be deleted through this endpoint.' });
  }
  User.delete(id);
  return sendSuccess(reply, { message: 'User deleted successfully.' });
}

async function toggleUserActive(request, reply) {
  const { id } = request.params;
  const user = User.findById(id);
  if (!user) {
    return sendError(reply, { statusCode: 404, message: 'User not found.' });
  }
  User.setActive(id, !user.is_active);
  return sendSuccess(reply, { message: `User ${user.is_active ? 'deactivated' : 'activated'} successfully.` });
}

async function listAllTasks(request, reply) {
  const limit = request.query.limit ? Math.min(Number(request.query.limit), 200) : 100;
  const offset = request.query.offset ? Number(request.query.offset) : 0;
  const tasks = Task.listAllForAdmin({ limit, offset });
  return sendSuccess(reply, { data: tasks });
}

async function deleteTask(request, reply) {
  const { id } = request.params;
  const task = Task.findById(id);
  if (!task) {
    return sendError(reply, { statusCode: 404, message: 'Task not found.' });
  }
  Task.delete(id);
  return sendSuccess(reply, { message: 'Task deleted successfully.' });
}

module.exports = { dashboard, listUsers, deleteUser, toggleUserActive, listAllTasks, deleteTask };

const Task = require('../models/Task');
const taskService = require('../services/taskService');
const { sendSuccess, sendError } = require('../utils/response');
const { sanitizeText } = require('../utils/validators');

async function createTask(request, reply) {
  const body = request.body;
  const task = taskService.createTask(request.user.id, {
    title: sanitizeText(body.title),
    description: sanitizeText(body.description),
    category_id: Number(body.category_id),
    budget: Number(body.budget),
    deadline: body.deadline,
    location: sanitizeText(body.location),
  });
  return sendSuccess(reply, { statusCode: 201, message: 'Task posted successfully.', data: task });
}

async function searchTasks(request, reply) {
  const q = request.query.q ? sanitizeText(request.query.q) : undefined;
  const categoryId = request.query.category_id ? Number(request.query.category_id) : undefined;
  const minBudget = request.query.min_budget ? Number(request.query.min_budget) : undefined;
  const maxBudget = request.query.max_budget ? Number(request.query.max_budget) : undefined;
  const location = request.query.location ? sanitizeText(request.query.location) : undefined;
  const sort = request.query.sort === 'oldest' ? 'oldest' : 'newest';
  const limit = request.query.limit ? Math.min(Number(request.query.limit), 100) : 50;
  const offset = request.query.offset ? Number(request.query.offset) : 0;

  const tasks = Task.search({ q, categoryId, minBudget, maxBudget, location, sort, limit, offset });
  return sendSuccess(reply, { data: tasks });
}

async function getTask(request, reply) {
  const task = Task.findById(request.params.id);
  if (!task) {
    return sendError(reply, { statusCode: 404, message: 'Task not found.' });
  }
  return sendSuccess(reply, { data: task });
}

async function myTasksAsCustomer(request, reply) {
  const status = request.query.status;
  const tasks = Task.listByCustomer(request.user.id, { status });
  return sendSuccess(reply, { data: tasks });
}

async function myTasksAsWorker(request, reply) {
  const status = request.query.status;
  const tasks = Task.listByWorker(request.user.id, { status });
  return sendSuccess(reply, { data: tasks });
}

async function updateTask(request, reply) {
  const body = request.body || {};
  const fields = {};
  if (body.title !== undefined) fields.title = sanitizeText(body.title);
  if (body.description !== undefined) fields.description = sanitizeText(body.description);
  if (body.category_id !== undefined) fields.category_id = Number(body.category_id);
  if (body.budget !== undefined) fields.budget = Number(body.budget);
  if (body.deadline !== undefined) fields.deadline = body.deadline;
  if (body.location !== undefined) fields.location = sanitizeText(body.location);

  const task = taskService.updateTask(request.params.id, request.user.id, fields);
  return sendSuccess(reply, { message: 'Task updated successfully.', data: task });
}

async function cancelTask(request, reply) {
  const task = taskService.cancelTask(request.params.id, request.user.id);
  return sendSuccess(reply, { message: 'Task cancelled.', data: task });
}

async function completeTask(request, reply) {
  const task = taskService.completeTask(request.params.id, request.user.id);
  return sendSuccess(reply, { message: 'Task marked as completed.', data: task });
}

module.exports = {
  createTask,
  searchTasks,
  getTask,
  myTasksAsCustomer,
  myTasksAsWorker,
  updateTask,
  cancelTask,
  completeTask,
};

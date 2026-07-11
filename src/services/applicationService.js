const Application = require('../models/Application');
const Task = require('../models/Task');

class ApplicationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function listApplicationsForTask(taskId, customerId) {
  const task = Task.findById(taskId);
  if (!task) throw new ApplicationError('Task not found.', 404);
  if (task.customer_id !== customerId) {
    throw new ApplicationError('You do not have permission to view these applicants.', 403);
  }
  return Application.listByTask(taskId);
}

function listApplicationsForWorker(workerId, status) {
  return Application.listByWorker(workerId, { status });
}

module.exports = { ApplicationError, listApplicationsForTask, listApplicationsForWorker };

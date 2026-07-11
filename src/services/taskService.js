const Task = require('../models/Task');
const Category = require('../models/Category');
const Application = require('../models/Application');
const Profile = require('../models/Profile');
const { notify } = require('./notificationService');

class TaskError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function createTask(customerId, payload) {
  const category = Category.findById(payload.category_id);
  if (!category || !category.is_active) {
    throw new TaskError('Selected category does not exist.', 422);
  }

  const taskId = Task.create({
    customerId,
    title: payload.title.trim(),
    description: payload.description.trim(),
    categoryId: category.id,
    budget: Number(payload.budget),
    deadline: payload.deadline,
    location: payload.location.trim(),
  });

  return Task.findById(taskId);
}

function getTaskOrThrow(taskId) {
  const task = Task.findById(taskId);
  if (!task) throw new TaskError('Task not found.', 404);
  return task;
}

function assertOwnership(task, customerId) {
  if (task.customer_id !== customerId) {
    throw new TaskError('You do not have permission to modify this task.', 403);
  }
}

function updateTask(taskId, customerId, payload) {
  const task = getTaskOrThrow(taskId);
  assertOwnership(task, customerId);

  if (task.status !== 'open') {
    throw new TaskError('Only open tasks can be edited.', 409);
  }

  if (payload.category_id) {
    const category = Category.findById(payload.category_id);
    if (!category || !category.is_active) {
      throw new TaskError('Selected category does not exist.', 422);
    }
  }

  Task.update(taskId, payload);
  return Task.findById(taskId);
}

function cancelTask(taskId, customerId) {
  const task = getTaskOrThrow(taskId);
  assertOwnership(task, customerId);

  if (task.status === 'completed') {
    throw new TaskError('A completed task cannot be cancelled.', 409);
  }
  if (task.status === 'cancelled') {
    throw new TaskError('This task is already cancelled.', 409);
  }

  Task.updateStatus(taskId, 'cancelled');

  if (task.assigned_worker_id) {
    notify({
      userId: task.assigned_worker_id,
      type: 'task_cancelled',
      title: 'Task cancelled',
      message: `The task "${task.title}" was cancelled by the customer.`,
      link: `/task-detail.html?id=${taskId}`,
    });
  }

  return Task.findById(taskId);
}

function completeTask(taskId, customerId) {
  const task = getTaskOrThrow(taskId);
  assertOwnership(task, customerId);

  if (task.status !== 'assigned') {
    throw new TaskError('Only assigned tasks can be marked as completed.', 409);
  }

  Task.updateStatus(taskId, 'completed');
  Profile.incrementCompletedJobs(task.assigned_worker_id);

  notify({
    userId: task.assigned_worker_id,
    type: 'task_completed',
    title: 'Task marked complete',
    message: `"${task.title}" was marked complete. Thanks for your work!`,
    link: `/task-detail.html?id=${taskId}`,
  });

  return Task.findById(taskId);
}

function applyToTask(taskId, workerId, message) {
  const task = getTaskOrThrow(taskId);

  if (task.status !== 'open') {
    throw new TaskError('This task is no longer accepting applications.', 409);
  }
  if (task.customer_id === workerId) {
    throw new TaskError('You cannot apply to your own task.', 403);
  }

  const existing = Application.findByTaskAndWorker(taskId, workerId);
  if (existing) {
    if (existing.status === 'withdrawn') {
      Application.updateStatus(existing.id, 'pending');
      notify({
        userId: task.customer_id,
        type: 'new_application',
        title: 'New applicant',
        message: `Someone re-applied to "${task.title}".`,
        link: `/task-detail.html?id=${taskId}`,
      });
      return Application.findById(existing.id);
    }
    throw new TaskError('You have already applied to this task.', 409);
  }

  const applicationId = Application.create({ taskId, workerId, message });

  notify({
    userId: task.customer_id,
    type: 'new_application',
    title: 'New applicant',
    message: `A worker applied to your task "${task.title}".`,
    link: `/task-detail.html?id=${taskId}`,
  });

  return Application.findById(applicationId);
}

function withdrawApplication(applicationId, workerId) {
  const application = Application.findById(applicationId);
  if (!application) throw new TaskError('Application not found.', 404);
  if (application.worker_id !== workerId) {
    throw new TaskError('You do not have permission to withdraw this application.', 403);
  }
  if (application.status !== 'pending') {
    throw new TaskError('Only pending applications can be withdrawn.', 409);
  }

  Application.updateStatus(applicationId, 'withdrawn');
  return Application.findById(applicationId);
}

function acceptApplication(applicationId, customerId) {
  const application = Application.findById(applicationId);
  if (!application) throw new TaskError('Application not found.', 404);

  const task = getTaskOrThrow(application.task_id);
  assertOwnership(task, customerId);

  if (task.status !== 'open') {
    throw new TaskError('This task is no longer open.', 409);
  }
  if (application.status !== 'pending') {
    throw new TaskError('Only pending applications can be accepted.', 409);
  }

  Application.updateStatus(applicationId, 'accepted');
  Application.rejectAllOtherApplicants(task.id, applicationId);
  Task.assignWorker(task.id, application.worker_id);

  notify({
    userId: application.worker_id,
    type: 'application_accepted',
    title: 'You got the job!',
    message: `You were accepted for "${task.title}".`,
    link: `/task-detail.html?id=${task.id}`,
  });

  const rejected = Application.listByTask(task.id).filter(
    (a) => a.id !== applicationId && a.status === 'rejected'
  );
  for (const app of rejected) {
    notify({
      userId: app.worker_id,
      type: 'application_rejected',
      title: 'Application update',
      message: `Another worker was selected for "${task.title}".`,
      link: `/task-detail.html?id=${task.id}`,
    });
  }

  return Task.findById(task.id);
}

module.exports = {
  TaskError,
  createTask,
  getTaskOrThrow,
  updateTask,
  cancelTask,
  completeTask,
  applyToTask,
  withdrawApplication,
  acceptApplication,
};

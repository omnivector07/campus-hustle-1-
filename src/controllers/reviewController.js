const Task = require('../models/Task');
const Review = require('../models/Review');
const Profile = require('../models/Profile');
const { sendSuccess, sendError } = require('../utils/response');
const { sanitizeText } = require('../utils/validators');
const { notify } = require('../services/notificationService');

async function createReview(request, reply) {
  const { taskId } = request.params;
  const { rating, comment } = request.body;

  const task = Task.findById(taskId);
  if (!task) {
    return sendError(reply, { statusCode: 404, message: 'Task not found.' });
  }
  if (task.customer_id !== request.user.id) {
    return sendError(reply, { statusCode: 403, message: 'You do not have permission to review this task.' });
  }
  if (task.status !== 'completed') {
    return sendError(reply, { statusCode: 409, message: 'You can only review a task after it has been completed.' });
  }

  const existing = Review.findByTaskId(taskId);
  if (existing) {
    return sendError(reply, { statusCode: 409, message: 'You have already reviewed this task.' });
  }

  const reviewId = Review.create({
    taskId,
    customerId: request.user.id,
    workerId: task.assigned_worker_id,
    rating: Number(rating),
    comment: comment ? sanitizeText(comment) : null,
  });

  Profile.recalculateRating(task.assigned_worker_id);

  notify({
    userId: task.assigned_worker_id,
    type: 'review_received',
    title: 'New rating received',
    message: `You received a ${rating}-star rating for "${task.title}".`,
    link: `/task-detail.html?id=${task.id}`,
  });

  const review = Review.listByWorker(task.assigned_worker_id).find((r) => r.id === reviewId);
  return sendSuccess(reply, { statusCode: 201, message: 'Review submitted successfully.', data: review });
}

async function listReviewsForTask(request, reply) {
  const review = Review.findByTaskId(request.params.taskId);
  return sendSuccess(reply, { data: review || null });
}

async function listReviewsForWorker(request, reply) {
  const reviews = Review.listByWorker(request.params.workerId);
  return sendSuccess(reply, { data: reviews });
}

module.exports = { createReview, listReviewsForTask, listReviewsForWorker };

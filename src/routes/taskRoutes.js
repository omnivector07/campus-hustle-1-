const taskController = require('../controllers/taskController');
const applicationController = require('../controllers/applicationController');
const reviewController = require('../controllers/reviewController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { validateTask, validateReview } = require('../utils/validators');

async function taskRoutes(fastify) {
  // Public search/browse
  fastify.get('/', taskController.searchTasks);
  fastify.get('/:id', taskController.getTask);
  fastify.get('/:taskId/review', reviewController.listReviewsForTask);

  // Customer-only
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('customer'), validateBody(validateTask)] },
    taskController.createTask
  );
  fastify.get(
    '/mine/customer',
    { preHandler: [authenticate, requireRole('customer')] },
    taskController.myTasksAsCustomer
  );
  fastify.put(
    '/:id',
    { preHandler: [authenticate, requireRole('customer')] },
    taskController.updateTask
  );
  fastify.patch(
    '/:id/cancel',
    { preHandler: [authenticate, requireRole('customer')] },
    taskController.cancelTask
  );
  fastify.patch(
    '/:id/complete',
    { preHandler: [authenticate, requireRole('customer')] },
    taskController.completeTask
  );
  fastify.get(
    '/:taskId/applicants',
    { preHandler: [authenticate, requireRole('customer')] },
    applicationController.listApplicantsForTask
  );
  fastify.post(
    '/:taskId/review',
    { preHandler: [authenticate, requireRole('customer'), validateBody(validateReview)] },
    reviewController.createReview
  );

  // Worker-only
  fastify.get(
    '/mine/worker',
    { preHandler: [authenticate, requireRole('worker')] },
    taskController.myTasksAsWorker
  );
  fastify.post(
    '/:taskId/apply',
    { preHandler: [authenticate, requireRole('worker')] },
    applicationController.applyToTask
  );
}

module.exports = taskRoutes;

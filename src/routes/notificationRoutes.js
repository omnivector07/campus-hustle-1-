const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

async function notificationRoutes(fastify) {
  fastify.get('/', { preHandler: authenticate }, notificationController.listMyNotifications);
  fastify.patch('/:id/read', { preHandler: authenticate }, notificationController.markRead);
  fastify.patch('/read-all', { preHandler: authenticate }, notificationController.markAllRead);
}

module.exports = notificationRoutes;

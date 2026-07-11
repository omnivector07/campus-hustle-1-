const applicationController = require('../controllers/applicationController');
const { authenticate, requireRole } = require('../middleware/auth');

async function applicationRoutes(fastify) {
  fastify.get(
    '/mine',
    { preHandler: [authenticate, requireRole('worker')] },
    applicationController.myApplications
  );
  fastify.patch(
    '/:id/withdraw',
    { preHandler: [authenticate, requireRole('worker')] },
    applicationController.withdrawApplication
  );
  fastify.patch(
    '/:id/accept',
    { preHandler: [authenticate, requireRole('customer')] },
    applicationController.acceptApplication
  );
}

module.exports = applicationRoutes;

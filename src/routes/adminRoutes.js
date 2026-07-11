const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');

async function adminRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireRole('admin'));

  fastify.get('/dashboard', adminController.dashboard);
  fastify.get('/users', adminController.listUsers);
  fastify.delete('/users/:id', adminController.deleteUser);
  fastify.patch('/users/:id/toggle-active', adminController.toggleUserActive);
  fastify.get('/tasks', adminController.listAllTasks);
  fastify.delete('/tasks/:id', adminController.deleteTask);
}

module.exports = adminRoutes;

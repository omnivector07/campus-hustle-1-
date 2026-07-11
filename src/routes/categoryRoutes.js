const categoryController = require('../controllers/categoryController');
const { authenticate, requireRole } = require('../middleware/auth');

async function categoryRoutes(fastify) {
  fastify.get('/', categoryController.listCategories);

  fastify.get(
    '/admin/all',
    { preHandler: [authenticate, requireRole('admin')] },
    categoryController.listAllCategoriesAdmin
  );
  fastify.post(
    '/admin',
    { preHandler: [authenticate, requireRole('admin')] },
    categoryController.createCategory
  );
  fastify.patch(
    '/admin/:id/toggle',
    { preHandler: [authenticate, requireRole('admin')] },
    categoryController.toggleCategory
  );
  fastify.delete(
    '/admin/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    categoryController.deleteCategory
  );
}

module.exports = categoryRoutes;

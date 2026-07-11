const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

async function userRoutes(fastify) {
  fastify.get('/me/profile', { preHandler: authenticate }, userController.getMyProfile);
  fastify.put('/me/profile', { preHandler: authenticate }, userController.updateMyProfile);
  fastify.post(
    '/me/profile/picture',
    { preHandler: authenticate },
    userController.uploadProfilePicture
  );
  fastify.get('/:id', userController.getPublicProfile);
}

module.exports = userRoutes;

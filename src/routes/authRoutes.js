const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { validateSignup, validateLogin } = require('../utils/validators');

async function authRoutes(fastify) {
  fastify.post('/signup', { preHandler: validateBody(validateSignup) }, authController.signup);
  fastify.post('/login', { preHandler: validateBody(validateLogin) }, authController.login);
  fastify.post('/logout', { preHandler: authenticate }, authController.logout);
  fastify.get('/me', { preHandler: authenticate }, authController.me);
}

module.exports = authRoutes;

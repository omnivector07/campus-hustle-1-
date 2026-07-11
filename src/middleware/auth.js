const { sendError } = require('../utils/response');
const User = require('../models/User');

/**
 * Verifies the JWT on the request and attaches the authenticated
 * user (from the database, not just the token payload) to request.user.
 * Registered on the Fastify instance as `authenticate`.
 */
async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return sendError(reply, { statusCode: 401, message: 'Missing or invalid authentication token.' });
  }

  const user = User.findById(request.user.id);
  if (!user) {
    return sendError(reply, { statusCode: 401, message: 'Account no longer exists.' });
  }
  if (!user.is_active) {
    return sendError(reply, { statusCode: 403, message: 'This account has been deactivated.' });
  }

  // Overwrite the decoded token payload with the fresh DB record
  // (minus the password hash) so downstream handlers always see
  // current data.
  const { password_hash, ...safeUser } = user;
  request.user = safeUser;
}

/**
 * Factory that returns a Fastify preHandler restricting access to
 * the given roles. Must run after `authenticate`.
 */
function requireRole(...roles) {
  return async function (request, reply) {
    if (!request.user || !roles.includes(request.user.role)) {
      return sendError(reply, { statusCode: 403, message: 'You do not have permission to perform this action.' });
    }
  };
}

module.exports = { authenticate, requireRole };

/**
 * Standard response envelope helpers so every endpoint returns a
 * consistent shape: { success, data, message, errors }.
 */

function sendSuccess(reply, { statusCode = 200, data = null, message = 'OK' } = {}) {
  return reply.code(statusCode).send({
    success: true,
    message,
    data,
  });
}

function sendError(reply, { statusCode = 400, message = 'Something went wrong', errors = null } = {}) {
  return reply.code(statusCode).send({
    success: false,
    message,
    errors,
  });
}

module.exports = { sendSuccess, sendError };

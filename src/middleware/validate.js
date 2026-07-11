const { sendError } = require('../utils/response');

/**
 * Returns a Fastify preHandler that runs `validatorFn` against the
 * request body. `validatorFn` should return an object mapping
 * field -> error message; an empty object means the body is valid.
 */
function validateBody(validatorFn) {
  return async function (request, reply) {
    const body = request.body || {};
    const errors = validatorFn(body);
    if (Object.keys(errors).length > 0) {
      return sendError(reply, { statusCode: 422, message: 'Validation failed.', errors });
    }
  };
}

module.exports = { validateBody };

const { sendError } = require('../utils/response');

/**
 * Registered via app.setErrorHandler in server.js.
 * Normalizes all thrown errors (validation, service, unexpected)
 * into the standard { success, message, errors } envelope.
 */
function errorHandler(error, request, reply) {
  request.log.error(error);

  // Fastify's own validation errors (e.g. from schema-less body parsing issues)
  if (error.validation) {
    return sendError(reply, {
      statusCode: 400,
      message: 'Validation failed.',
      errors: error.validation,
    });
  }

  // Multipart / file size errors
  if (error.code === 'FST_REQ_FILE_TOO_LARGE' || error.code === 'FST_FILES_LIMIT') {
    return sendError(reply, { statusCode: 413, message: 'Uploaded file is too large.' });
  }

  // Custom service-layer errors carry a statusCode property.
  const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
    ? error.statusCode
    : 500;

  const message = statusCode === 500
    ? 'An unexpected error occurred. Please try again.'
    : error.message;

  return sendError(reply, { statusCode, message });
}

module.exports = errorHandler;

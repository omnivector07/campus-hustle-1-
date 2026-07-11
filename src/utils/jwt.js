/**
 * Thin wrapper around @fastify/jwt's app-level sign/verify.
 * These helpers expect a Fastify instance decorated with `jwt`
 * (done in src/server.js via the @fastify/jwt plugin).
 */

function signToken(app, payload) {
  return app.jwt.sign(payload);
}

function verifyToken(app, token) {
  return app.jwt.verify(token);
}

module.exports = { signToken, verifyToken };

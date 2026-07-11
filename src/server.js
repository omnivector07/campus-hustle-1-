const path = require('path');
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const multipart = require('@fastify/multipart');
const fstatic = require('@fastify/static');

const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const { sendError } = require('./utils/response');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminRoutes = require('./routes/adminRoutes');

function buildApp() {
  const app = Fastify({
    logger: {
      level: config.env === 'production' ? 'info' : 'debug',
      transport: config.env === 'production' ? undefined : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    },
    trustProxy: true,
  });

  // ---- Global plugins ----
  app.register(cors, {
    origin: config.cors.origin === '*' ? true : config.cors.origin.split(','),
  });

  app.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.expiresIn },
  });

  app.register(multipart, {
    limits: { fileSize: config.uploads.maxSizeBytes },
  });

  // Serve the vanilla front end and uploaded assets.
  app.register(fstatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
    decorateReply: true,
  });

  // ---- API routes ----
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(userRoutes, { prefix: '/api/users' });
  app.register(taskRoutes, { prefix: '/api/tasks' });
  app.register(applicationRoutes, { prefix: '/api/applications' });
  app.register(reviewRoutes, { prefix: '/api/reviews' });
  app.register(notificationRoutes, { prefix: '/api/notifications' });
  app.register(categoryRoutes, { prefix: '/api/categories' });
  app.register(adminRoutes, { prefix: '/api/admin' });

  app.get('/api/health', async () => ({ success: true, message: 'Campus Hustle API is running.', timestamp: new Date().toISOString() }));

  // ---- 404 handling ----
  // API 404s get a JSON envelope; everything else falls back to the
  // static 404.html page (SPA-less multi-page app).
  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url && request.raw.url.startsWith('/api/')) {
      return sendError(reply, { statusCode: 404, message: 'Resource not found.' });
    }
    return reply.code(404).sendFile('404.html');
  });

  app.setErrorHandler(errorHandler);

  return app;
}

async function start() {
  const app = buildApp();
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Campus Hustle server listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { buildApp };

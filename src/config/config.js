require('dotenv').config();
const path = require('path');

function required(name, fallback) {
  const val = process.env[name];
  if (val === undefined || val === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  jwt: {
    secret: required('JWT_SECRET', 'dev_only_insecure_secret_change_me_32chars'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  database: {
    path: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/campus_hustle.db'),
  },

  uploads: {
    dir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './public/assets/uploads/profiles'),
    maxSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '5', 10) * 1024 * 1024,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@campushustle.ng',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    name: process.env.ADMIN_NAME || 'Campus Hustle Admin',
  },
};

module.exports = config;

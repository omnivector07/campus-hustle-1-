const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/config');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

class UploadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Reads a single multipart file field, validates it, and writes it
 * to the configured uploads directory with a random safe filename.
 * Returns the relative web path to store in the database.
 */
async function saveProfilePicture(request) {
  const data = await request.file();
  if (!data) {
    throw new UploadError('No file was uploaded.', 400);
  }

  if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
    throw new UploadError('Only JPEG, PNG, WEBP or GIF images are allowed.', 415);
  }

  if (!fs.existsSync(config.uploads.dir)) {
    fs.mkdirSync(config.uploads.dir, { recursive: true });
  }

  const ext = ALLOWED_EXTENSIONS[data.mimetype];
  const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  const filePath = path.join(config.uploads.dir, filename);

  const buffer = await data.toBuffer();

  if (buffer.length > config.uploads.maxSizeBytes) {
    throw new UploadError(`File exceeds the maximum allowed size of ${config.uploads.maxSizeBytes / (1024 * 1024)}MB.`, 413);
  }

  fs.writeFileSync(filePath, buffer);

  return `/assets/uploads/profiles/${filename}`;
}

function deleteProfilePicture(relativePath) {
  if (!relativePath) return;
  const filename = path.basename(relativePath);
  const filePath = path.join(config.uploads.dir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = { saveProfilePicture, deleteProfilePicture, UploadError };

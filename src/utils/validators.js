const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_CATEGORIES_CACHE = { list: null };

function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function isValidEmail(email) {
  return isNonEmptyString(email) && EMAIL_REGEX.test(email.trim());
}

function isValidPassword(password) {
  return isNonEmptyString(password) && password.length >= 8;
}

function isValidRole(role) {
  return ['customer', 'worker'].includes(role); // admin cannot self-register
}

function isPositiveNumber(val) {
  const n = Number(val);
  return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
}

function isFutureDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d.getTime() >= now.getTime();
}

function isValidRating(rating) {
  const n = Number(rating);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

/**
 * Strips HTML tags and trims whitespace to provide a basic layer of
 * XSS mitigation for free-text fields before they are persisted.
 * This is defense-in-depth; output is also escaped at render time
 * on the front end.
 */
function sanitizeText(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function validateSignup(body) {
  const errors = {};
  if (!isValidEmail(body.email)) errors.email = 'A valid email address is required.';
  if (!isValidPassword(body.password)) errors.password = 'Password must be at least 8 characters.';
  if (!isValidRole(body.role)) errors.role = 'Role must be either "customer" or "worker".';
  if (!isNonEmptyString(body.full_name)) errors.full_name = 'Full name is required.';
  return errors;
}

function validateLogin(body) {
  const errors = {};
  if (!isValidEmail(body.email)) errors.email = 'A valid email address is required.';
  if (!isNonEmptyString(body.password)) errors.password = 'Password is required.';
  return errors;
}

function validateTask(body) {
  const errors = {};
  if (!isNonEmptyString(body.title)) errors.title = 'Title is required.';
  if (!isNonEmptyString(body.description)) errors.description = 'Description is required.';
  if (!body.category_id || !isPositiveNumber(body.category_id)) errors.category_id = 'A valid category is required.';
  if (!isPositiveNumber(body.budget)) errors.budget = 'Budget must be a positive number.';
  if (!body.deadline || !isFutureDate(body.deadline)) errors.deadline = 'Deadline must be a valid date that is not in the past.';
  if (!isNonEmptyString(body.location)) errors.location = 'Location is required.';
  return errors;
}

function validateReview(body) {
  const errors = {};
  if (!isValidRating(body.rating)) errors.rating = 'Rating must be an integer between 1 and 5.';
  return errors;
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  isValidRole,
  isPositiveNumber,
  isFutureDate,
  isValidRating,
  sanitizeText,
  validateSignup,
  validateLogin,
  validateTask,
  validateReview,
};

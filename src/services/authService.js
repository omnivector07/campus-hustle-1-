const User = require('../models/User');
const Profile = require('../models/Profile');
const { hashPassword, comparePassword } = require('../utils/password');

class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function signup({ email, password, role, full_name, phone, department, faculty, level }) {
  const existing = User.findByEmail(email);
  if (existing) {
    throw new AuthError('An account with this email already exists.', 409);
  }

  const passwordHash = await hashPassword(password);
  const userId = User.create({ email, passwordHash, role });

  Profile.create({
    userId,
    fullName: full_name,
    phone: phone || null,
    department: department || null,
    faculty: faculty || null,
    level: level || null,
    skills: [],
  });

  return User.findById(userId);
}

async function login({ email, password }) {
  const user = User.findByEmail(email);
  if (!user) {
    throw new AuthError('Invalid email or password.', 401);
  }
  if (!user.is_active) {
    throw new AuthError('This account has been deactivated. Contact support.', 403);
  }

  const match = await comparePassword(password, user.password_hash);
  if (!match) {
    throw new AuthError('Invalid email or password.', 401);
  }

  return user;
}

module.exports = { signup, login, AuthError };

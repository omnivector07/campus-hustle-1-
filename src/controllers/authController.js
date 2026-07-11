const authService = require('../services/authService');
const Profile = require('../models/Profile');
const { sendSuccess, sendError } = require('../utils/response');
const { sanitizeText } = require('../utils/validators');

function toPublicUser(user, profile) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    profile: profile
      ? {
          full_name: profile.full_name,
          phone: profile.phone,
          department: profile.department,
          faculty: profile.faculty,
          level: profile.level,
          bio: profile.bio,
          skills: profile.skills,
          profile_picture: profile.profile_picture,
          rating_avg: profile.rating_avg,
          rating_count: profile.rating_count,
          completed_jobs: profile.completed_jobs,
        }
      : null,
  };
}

async function signup(request, reply) {
  const body = request.body;
  const user = await authService.signup({
    email: body.email,
    password: body.password,
    role: body.role,
    full_name: sanitizeText(body.full_name),
    phone: body.phone ? sanitizeText(body.phone) : null,
    department: body.department ? sanitizeText(body.department) : null,
    faculty: body.faculty ? sanitizeText(body.faculty) : null,
    level: body.level ? sanitizeText(body.level) : null,
  });

  const profile = Profile.findByUserId(user.id);
  const token = request.server.jwt.sign({ id: user.id, role: user.role, email: user.email });

  return sendSuccess(reply, {
    statusCode: 201,
    message: 'Account created successfully.',
    data: { token, user: toPublicUser(user, profile) },
  });
}

async function login(request, reply) {
  const { email, password } = request.body;
  const user = await authService.login({ email, password });
  const profile = Profile.findByUserId(user.id);
  const token = request.server.jwt.sign({ id: user.id, role: user.role, email: user.email });

  return sendSuccess(reply, {
    message: 'Logged in successfully.',
    data: { token, user: toPublicUser(user, profile) },
  });
}

async function me(request, reply) {
  const profile = Profile.findByUserId(request.user.id);
  return sendSuccess(reply, { data: toPublicUser(request.user, profile) });
}

// Logout is stateless (JWT is discarded client-side); this endpoint
// exists for API symmetry and future token-blacklisting support.
async function logout(request, reply) {
  return sendSuccess(reply, { message: 'Logged out successfully.' });
}

module.exports = { signup, login, me, logout, toPublicUser };

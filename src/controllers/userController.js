const Profile = require('../models/Profile');
const User = require('../models/User');
const Review = require('../models/Review');
const { sendSuccess, sendError } = require('../utils/response');
const { sanitizeText } = require('../utils/validators');
const { saveProfilePicture, deleteProfilePicture } = require('../middleware/upload');

async function getMyProfile(request, reply) {
  const profile = Profile.findByUserId(request.user.id);
  return sendSuccess(reply, { data: profile });
}

async function updateMyProfile(request, reply) {
  const body = request.body || {};
  const fields = {};

  if (body.full_name !== undefined) fields.full_name = sanitizeText(body.full_name);
  if (body.phone !== undefined) fields.phone = sanitizeText(body.phone);
  if (body.department !== undefined) fields.department = sanitizeText(body.department);
  if (body.faculty !== undefined) fields.faculty = sanitizeText(body.faculty);
  if (body.level !== undefined) fields.level = sanitizeText(body.level);
  if (body.bio !== undefined) fields.bio = sanitizeText(body.bio);
  if (body.skills !== undefined) {
    fields.skills = Array.isArray(body.skills) ? body.skills.map((s) => sanitizeText(s)) : [];
  }

  if (fields.full_name !== undefined && fields.full_name.length === 0) {
    return sendError(reply, { statusCode: 422, message: 'Validation failed.', errors: { full_name: 'Full name cannot be empty.' } });
  }

  Profile.update(request.user.id, fields);
  const updated = Profile.findByUserId(request.user.id);
  return sendSuccess(reply, { message: 'Profile updated successfully.', data: updated });
}

async function uploadProfilePicture(request, reply) {
  const relativePath = await saveProfilePicture(request);

  const existing = Profile.findByUserId(request.user.id);
  if (existing && existing.profile_picture) {
    deleteProfilePicture(existing.profile_picture);
  }

  Profile.update(request.user.id, { profile_picture: relativePath });
  return sendSuccess(reply, { message: 'Profile picture updated.', data: { profile_picture: relativePath } });
}

async function getPublicProfile(request, reply) {
  const { id } = request.params;
  const user = User.findById(id);
  if (!user) {
    return sendError(reply, { statusCode: 404, message: 'User not found.' });
  }
  const profile = Profile.findByUserId(id);
  const reviews = user.role === 'worker' ? Review.listByWorker(id) : [];

  return sendSuccess(reply, {
    data: {
      id: user.id,
      role: user.role,
      profile,
      reviews,
    },
  });
}

module.exports = { getMyProfile, updateMyProfile, uploadProfilePicture, getPublicProfile };

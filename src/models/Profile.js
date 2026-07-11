const db = require('../config/database');

function parseSkills(profile) {
  if (!profile) return profile;
  let skills = [];
  try {
    skills = profile.skills ? JSON.parse(profile.skills) : [];
  } catch {
    skills = [];
  }
  return { ...profile, skills };
}

const Profile = {
  create({ userId, fullName, phone = null, department = null, faculty = null, level = null, bio = null, skills = [] }) {
    db.prepare(
      `INSERT INTO profiles (user_id, full_name, phone, department, faculty, level, bio, skills)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, fullName, phone, department, faculty, level, bio, JSON.stringify(skills || []));
  },

  findByUserId(userId) {
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
    return parseSkills(profile);
  },

  update(userId, fields) {
    const allowed = ['full_name', 'phone', 'department', 'faculty', 'level', 'bio', 'profile_picture'];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (fields.skills !== undefined) {
      setClauses.push('skills = ?');
      values.push(JSON.stringify(fields.skills || []));
    }

    if (setClauses.length === 0) return;

    setClauses.push("updated_at = datetime('now')");
    values.push(userId);

    db.prepare(`UPDATE profiles SET ${setClauses.join(', ')} WHERE user_id = ?`).run(...values);
  },

  incrementCompletedJobs(userId) {
    db.prepare(
      "UPDATE profiles SET completed_jobs = completed_jobs + 1, updated_at = datetime('now') WHERE user_id = ?"
    ).run(userId);
  },

  recalculateRating(userId) {
    const row = db.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE worker_id = ?'
    ).get(userId);
    const avg = row.avg_rating ? Math.round(row.avg_rating * 10) / 10 : 0;
    db.prepare(
      "UPDATE profiles SET rating_avg = ?, rating_count = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).run(avg, row.cnt, userId);
  },
};

module.exports = Profile;

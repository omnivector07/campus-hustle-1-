const SKILL_CATEGORIES = [
  'Laundry', 'Barbing', 'Hair Styling', 'Cleaning', 'Graphic Design',
  'Photography', 'Videography', 'Coding', 'Assignment Typing', 'Private Tutor',
  'Food Delivery', 'Errands', 'Laptop Repair', 'Phone Repair', 'Printing',
  'CV Writing', 'Event Ushering', 'Others',
];

let currentUser = null;
let selectedSkills = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth();
  if (!currentUser) return;

  document.getElementById('back-link').href = redirectForRole(currentUser.role);

  renderSkillPicker();
  await loadProfile();

  document.getElementById('profile-form').addEventListener('submit', handleSave);
  document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);
});

function renderSkillPicker() {
  const picker = document.getElementById('skill-picker');
  picker.innerHTML = SKILL_CATEGORIES.map(
    (s) => `<span class="skill-option" data-skill="${escapeHtml(s)}">${escapeHtml(s)}</span>`
  ).join('');
  picker.querySelectorAll('.skill-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const skill = opt.dataset.skill;
      if (selectedSkills.includes(skill)) {
        selectedSkills = selectedSkills.filter((s) => s !== skill);
      } else {
        selectedSkills.push(skill);
      }
      refreshSkillPicker();
    });
  });
}

function refreshSkillPicker() {
  document.querySelectorAll('.skill-option').forEach((opt) => {
    opt.classList.toggle('selected', selectedSkills.includes(opt.dataset.skill));
  });
}

async function loadProfile() {
  try {
    const profile = await Api.getMyProfile();
    selectedSkills = profile.skills || [];
    refreshSkillPicker();
    populateForm(profile);
    renderHeader(profile);

    if (currentUser.role === 'worker') {
      loadReviews();
    }
  } catch (err) {
    handleApiError(err, 'Could not load your profile.');
  }
}

function populateForm(profile) {
  document.getElementById('full_name').value = profile.full_name || '';
  document.getElementById('phone').value = profile.phone || '';
  document.getElementById('level').value = profile.level || '';
  document.getElementById('department').value = profile.department || '';
  document.getElementById('faculty').value = profile.faculty || '';
  document.getElementById('bio').value = profile.bio || '';

  // Skills only make sense for workers.
  document.getElementById('field-skills-wrap').style.display = currentUser.role === 'worker' ? 'block' : 'none';
}

function renderHeader(profile) {
  document.getElementById('display-name').textContent = profile.full_name;
  document.getElementById('display-role').textContent = currentUser.role;

  const avatarEl = document.getElementById('avatar-display');
  if (profile.profile_picture) {
    avatarEl.outerHTML = `<img id="avatar-display" class="profile-avatar" src="${escapeHtml(profile.profile_picture)}" alt="">`;
  } else {
    avatarEl.textContent = initials(profile.full_name);
  }

  const ratingEl = document.getElementById('display-rating');
  if (currentUser.role === 'worker') {
    ratingEl.innerHTML = profile.rating_count > 0
      ? `<span class="stars">${starRow(profile.rating_avg)}</span> ${profile.rating_avg} (${profile.rating_count} reviews) · ${profile.completed_jobs} jobs completed`
      : `<span style="color:var(--ink-muted);">No ratings yet</span>`;
  }

  const skillsEl = document.getElementById('skills-display');
  if (currentUser.role === 'worker' && profile.skills?.length > 0) {
    skillsEl.innerHTML = profile.skills.map((s) => `<span class="skill-chip">${escapeHtml(s)}</span>`).join('');
  } else {
    skillsEl.innerHTML = '';
  }
}

async function handleSave(e) {
  e.preventDefault();
  hideAlert('profile-alert');
  hideAlert('profile-success');

  const btn = document.getElementById('profile-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const payload = {
      full_name: document.getElementById('full_name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      level: document.getElementById('level').value.trim(),
      department: document.getElementById('department').value.trim(),
      faculty: document.getElementById('faculty').value.trim(),
      bio: document.getElementById('bio').value.trim(),
    };
    if (currentUser.role === 'worker') {
      payload.skills = selectedSkills;
    }

    const updated = await Api.updateMyProfile(payload);
    Auth.updateUser({ profile: updated });
    renderHeader(updated);
    showAlert('profile-success', 'Profile updated successfully.');
    showToast('Profile saved.', 'success');
  } catch (err) {
    showAlert('profile-alert', err.message || 'Could not save your profile.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save changes';
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const result = await Api.uploadProfilePicture(formData);
    Auth.updateUser({ profile: { profile_picture: result.profile_picture } });
    showToast('Profile picture updated.', 'success');
    loadProfile();
  } catch (err) {
    handleApiError(err, 'Could not upload profile picture.');
  }
}

async function loadReviews() {
  const panel = document.getElementById('reviews-panel');
  const list = document.getElementById('reviews-list');
  try {
    const reviews = await Api.listWorkerReviews(currentUser.id);
    panel.style.display = 'block';
    if (reviews.length === 0) {
      list.innerHTML = `<p style="font-size:13.5px; color:var(--ink-muted);">No reviews yet. Complete a job to receive your first rating.</p>`;
      return;
    }
    list.innerHTML = reviews
      .map(
        (r) => `
      <div class="review-card">
        <div class="stars">${starRow(r.rating)}</div>
        <div class="r-name">${escapeHtml(r.customer_name)} · ${escapeHtml(r.task_title)}</div>
        ${r.comment ? `<div class="r-comment">"${escapeHtml(r.comment)}"</div>` : ''}
        <div class="r-date">${formatDate(r.created_at)}</div>
      </div>
    `
      )
      .join('');
  } catch (err) {
    // Non-critical.
  }
}

function showAlert(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add('show');
}
function hideAlert(id) {
  document.getElementById(id).classList.remove('show');
}

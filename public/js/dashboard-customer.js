let currentUser = null;
let currentTaskIdForApplicants = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth(['customer']);
  if (!currentUser) return;

  renderSidebarUser();
  initMobileSidebar();
  initNotificationBell();

  document.getElementById('greeting').textContent = `Welcome back, ${currentUser.profile?.full_name?.split(' ')[0] || 'there'}`;

  wireNav();
  await loadCategories();
  await loadOverview();

  document.getElementById('post-task-form').addEventListener('submit', handlePostTask);
  document.getElementById('status-filter').addEventListener('change', loadMyTasks);
  document.getElementById('back-to-tasks').addEventListener('click', () => switchView('tasks'));
});

/* ---------------- View routing ---------------- */
function wireNav() {
  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });
  document.querySelectorAll('[data-view-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.viewLink);
    });
  });
}

function switchView(view) {
  ['overview', 'post', 'tasks', 'applicants'].forEach((v) => {
    document.getElementById(`view-${v}`).style.display = v === view ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });
  if (view === 'tasks') loadMyTasks();
  if (view === 'overview') loadOverview();
  document.querySelector('.sidebar')?.classList.remove('mobile-open');
}

/* ---------------- Categories ---------------- */
async function loadCategories() {
  try {
    const categories = await Api.listCategories();
    const select = document.getElementById('category_id');
    select.innerHTML =
      '<option value="">Select a category</option>' +
      categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  } catch (err) {
    handleApiError(err, 'Could not load categories.');
  }
}

/* ---------------- Overview ---------------- */
async function loadOverview() {
  try {
    const tasks = await Api.myTasksAsCustomer();
    const open = tasks.filter((t) => t.status === 'open').length;
    const assigned = tasks.filter((t) => t.status === 'assigned').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;

    document.getElementById('stat-open').textContent = open;
    document.getElementById('stat-assigned').textContent = assigned;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-total').textContent = tasks.length;

    const recentList = document.getElementById('recent-tasks-list');
    const recent = tasks.slice(0, 5);
    if (recent.length === 0) {
      recentList.innerHTML = emptyState('🗂', 'No tasks yet', 'Post your first task and a fellow student will be ready to help.');
    } else {
      recentList.innerHTML = recent.map((t) => taskRowHtml(t)).join('');
      wireTaskRowActions(recentList);
    }
  } catch (err) {
    handleApiError(err, 'Could not load your dashboard.');
  }
}

/* ---------------- Post task ---------------- */
async function handlePostTask(e) {
  e.preventDefault();
  const form = e.target;
  clearFieldErrors(form);
  hideAlert('post-alert');

  const btn = document.getElementById('post-submit-btn');
  setButtonLoading(btn, true, 'Posting…', 'Post task');

  try {
    await Api.createTask({
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      category_id: Number(document.getElementById('category_id').value),
      budget: Number(document.getElementById('budget').value),
      deadline: document.getElementById('deadline').value,
      location: document.getElementById('location').value.trim(),
    });
    showToast('Task posted successfully!', 'success');
    form.reset();
    switchView('tasks');
  } catch (err) {
    if (err.errors) showFieldErrors(form, err.errors);
    showAlert('post-alert', err.message || 'Could not post task.');
  } finally {
    setButtonLoading(btn, false, 'Posting…', 'Post task');
  }
}

/* ---------------- My tasks list ---------------- */
async function loadMyTasks() {
  const status = document.getElementById('status-filter').value;
  const list = document.getElementById('my-tasks-list');
  list.innerHTML = `<div class="loading-block"><div class="loading-spinner"></div></div>`;
  try {
    const tasks = await Api.myTasksAsCustomer(status || undefined);
    if (tasks.length === 0) {
      list.innerHTML = emptyState('🗂', 'No tasks found', 'Try a different filter, or post a new task.');
      return;
    }
    list.innerHTML = `<div class="panel">${tasks.map((t) => taskRowHtml(t, true)).join('')}</div>`;
    wireTaskRowActions(list);
  } catch (err) {
    handleApiError(err, 'Could not load your tasks.');
  }
}

function taskRowHtml(task) {
  return `
    <div class="applicant-row" data-task-id="${task.id}">
      <div class="applicant-info">
        <div class="a-name">${escapeHtml(task.title)}</div>
        <div class="a-meta">${escapeHtml(task.category_name)} · ${formatMoney(task.budget)} · ${formatDate(task.deadline)}</div>
        ${task.assigned_worker_id ? `<div class="a-meta">Assigned to ${escapeHtml(task.worker_name)}</div>` : ''}
      </div>
      ${statusBadge(task.status)}
      <div class="applicant-actions">
        ${task.status === 'open' ? `<button class="btn btn-sm btn-outline" data-action="view-applicants">Applicants</button>` : ''}
        ${task.status === 'assigned' ? `<button class="btn btn-sm btn-primary" data-action="complete">Mark complete</button>` : ''}
        ${task.status === 'open' || task.status === 'assigned' ? `<button class="btn btn-sm btn-danger" data-action="cancel">Cancel</button>` : ''}
        ${task.status === 'completed' ? `<button class="btn btn-sm btn-outline" data-action="review">Rate worker</button>` : ''}
      </div>
    </div>
  `;
}

function wireTaskRowActions(container) {
  container.querySelectorAll('[data-task-id]').forEach((row) => {
    const taskId = row.dataset.taskId;

    row.querySelectorAll('[data-action="view-applicants"]').forEach((btn) =>
      btn.addEventListener('click', () => showApplicants(taskId))
    );

    row.querySelectorAll('[data-action="complete"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const ok = await confirmAction({
          title: 'Mark task as completed?',
          message: 'This confirms the worker finished the job. You can rate them afterward.',
          confirmLabel: 'Mark complete',
        });
        if (!ok) return;
        try {
          await Api.completeTask(taskId);
          showToast('Task marked as completed.', 'success');
          refreshCurrentView();
        } catch (err) {
          handleApiError(err);
        }
      })
    );

    row.querySelectorAll('[data-action="cancel"]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const ok = await confirmAction({
          title: 'Cancel this task?',
          message: 'The assigned worker (if any) will be notified. This cannot be undone.',
          confirmLabel: 'Cancel task',
          danger: true,
        });
        if (!ok) return;
        try {
          await Api.cancelTask(taskId);
          showToast('Task cancelled.', 'success');
          refreshCurrentView();
        } catch (err) {
          handleApiError(err);
        }
      })
    );

    row.querySelectorAll('[data-action="review"]').forEach((btn) =>
      btn.addEventListener('click', () => openReviewModal(taskId))
    );
  });
}

function refreshCurrentView() {
  const tasksVisible = document.getElementById('view-tasks').style.display !== 'none';
  if (tasksVisible) loadMyTasks();
  loadOverview();
}

/* ---------------- Applicants ---------------- */
async function showApplicants(taskId) {
  currentTaskIdForApplicants = taskId;
  switchViewRaw('applicants');

  const summaryEl = document.getElementById('applicants-task-summary');
  const listEl = document.getElementById('applicants-list');
  summaryEl.innerHTML = `<div class="loading-block"><div class="loading-spinner"></div></div>`;
  listEl.innerHTML = '';

  try {
    const [task, applicants] = await Promise.all([Api.getTask(taskId), Api.listApplicants(taskId)]);

    summaryEl.innerHTML = `
      <h2 style="font-size:18px; margin-bottom:6px;">${escapeHtml(task.title)}</h2>
      <p style="color:var(--ink-muted); font-size:14px;">${escapeHtml(task.category_name)} · ${formatMoney(task.budget)} · Due ${formatDate(task.deadline)}</p>
    `;

    if (applicants.length === 0) {
      listEl.innerHTML = emptyState('🙋', 'No applicants yet', 'Once a worker applies, they will show up here.');
      return;
    }

    listEl.innerHTML = applicants
      .map(
        (a) => `
      <div class="applicant-row" data-app-id="${a.id}">
        ${a.worker_picture ? `<img src="${escapeHtml(a.worker_picture)}" alt="">` : `<div class="avatar-fallback">${initials(a.worker_name)}</div>`}
        <div class="applicant-info">
          <div class="a-name">${escapeHtml(a.worker_name)} ${a.worker_rating > 0 ? `<span style="color:var(--ink-muted); font-weight:400; font-size:12.5px;">· ★ ${a.worker_rating} (${a.worker_completed_jobs} jobs)</span>` : ''}</div>
          <div class="a-meta">Applied ${timeAgo(a.applied_at)}</div>
          ${a.message ? `<div class="a-msg">"${escapeHtml(a.message)}"</div>` : ''}
        </div>
        ${statusBadge(a.status)}
        ${a.status === 'pending' ? `<div class="applicant-actions"><button class="btn btn-sm btn-primary" data-accept>Accept</button></div>` : ''}
      </div>
    `
      )
      .join('');

    listEl.querySelectorAll('[data-accept]').forEach((btn) => {
      const row = btn.closest('[data-app-id]');
      btn.addEventListener('click', async () => {
        const ok = await confirmAction({
          title: 'Accept this applicant?',
          message: 'The task will be assigned to them and all other applicants will be rejected automatically.',
          confirmLabel: 'Accept applicant',
        });
        if (!ok) return;
        try {
          await Api.acceptApplication(row.dataset.appId);
          showToast('Applicant accepted!', 'success');
          showApplicants(taskId);
        } catch (err) {
          handleApiError(err);
        }
      });
    });
  } catch (err) {
    handleApiError(err, 'Could not load applicants.');
  }
}

function switchViewRaw(view) {
  ['overview', 'post', 'tasks', 'applicants'].forEach((v) => {
    document.getElementById(`view-${v}`).style.display = v === view ? 'block' : 'none';
  });
}

/* ---------------- Review modal ---------------- */
function openReviewModal(taskId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Rate this worker</h3>
      <p>How was the job? Your rating helps other students choose the right hustler.</p>
      <div class="star-picker" id="star-picker">
        ${[1, 2, 3, 4, 5].map((i) => `<span class="star" data-value="${i}">★</span>`).join('')}
      </div>
      <div class="field" style="margin-top:18px;">
        <label for="review-comment">Comment (optional)</label>
        <textarea id="review-comment" placeholder="Share your experience…"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="submit" disabled>Submit rating</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let rating = 0;
  const stars = overlay.querySelectorAll('.star');
  const submitBtn = overlay.querySelector('[data-action="submit"]');

  stars.forEach((star) => {
    star.addEventListener('click', () => {
      rating = Number(star.dataset.value);
      stars.forEach((s) => s.classList.toggle('filled', Number(s.dataset.value) <= rating));
      submitBtn.disabled = false;
    });
  });

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());

  submitBtn.addEventListener('click', async () => {
    if (rating === 0) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
    try {
      await Api.createReview(taskId, {
        rating,
        comment: overlay.querySelector('#review-comment').value.trim(),
      });
      showToast('Thanks for rating!', 'success');
      overlay.remove();
      refreshCurrentView();
    } catch (err) {
      handleApiError(err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit rating';
    }
  });
}

/* ---------------- Small helpers local to this page ---------------- */
function emptyState(icon, title, message) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function showAlert(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add('show');
}
function hideAlert(id) {
  document.getElementById(id).classList.remove('show');
}
function setButtonLoading(btn, loading, loadingText, defaultText) {
  btn.disabled = loading;
  btn.textContent = loading ? loadingText : defaultText;
}
function clearFieldErrors(form) {
  form.querySelectorAll('.field').forEach((f) => {
    f.classList.remove('has-error');
    const err = f.querySelector('.field-error');
    if (err) err.textContent = '';
  });
}
function showFieldErrors(form, errors) {
  Object.entries(errors || {}).forEach(([field, message]) => {
    const wrap = form.querySelector(`#field-${field}`);
    if (wrap) {
      wrap.classList.add('has-error');
      const err = wrap.querySelector('.field-error');
      if (err) err.textContent = message;
    }
  });
}

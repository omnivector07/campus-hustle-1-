let currentUser = null;
let searchDebounceTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth(['worker']);
  if (!currentUser) return;

  renderSidebarUser();
  initMobileSidebar();
  initNotificationBell();

  document.getElementById('greeting').textContent = `Find your next gig, ${currentUser.profile?.full_name?.split(' ')[0] || ''}`;

  wireNav();
  await loadCategoryFilter();
  await loadStats();
  await loadBrowse();

  document.getElementById('search-q').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(loadBrowse, 350);
  });
  document.getElementById('filter-category').addEventListener('change', loadBrowse);
  document.getElementById('filter-sort').addEventListener('change', loadBrowse);
});

function wireNav() {
  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });
}

function switchView(view) {
  ['browse', 'applications', 'jobs'].forEach((v) => {
    document.getElementById(`view-${v}`).style.display = v === view ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });
  if (view === 'applications') loadApplications();
  if (view === 'jobs') loadJobs();
  document.querySelector('.sidebar')?.classList.remove('mobile-open');
}

async function loadCategoryFilter() {
  try {
    const categories = await Api.listCategories();
    const select = document.getElementById('filter-category');
    select.innerHTML =
      '<option value="">All categories</option>' +
      categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  } catch (err) {
    handleApiError(err, 'Could not load categories.');
  }
}

async function loadStats() {
  try {
    const [applications, jobs, profile] = await Promise.all([
      Api.myApplications('pending'),
      Api.myTasksAsWorker(),
      Api.getMyProfile(),
    ]);
    document.getElementById('stat-pending').textContent = applications.length;
    document.getElementById('stat-active').textContent = jobs.filter((t) => t.status === 'assigned').length;
    document.getElementById('stat-completed').textContent = profile.completed_jobs;
    document.getElementById('stat-rating').textContent = profile.rating_count > 0 ? `${profile.rating_avg} ★` : '—';
  } catch (err) {
    handleApiError(err, 'Could not load your stats.');
  }
}

/* ---------------- Browse ---------------- */
async function loadBrowse() {
  const list = document.getElementById('browse-list');
  list.innerHTML = `<div class="loading-block"><div class="loading-spinner"></div></div>`;
  try {
    const params = {};
    const q = document.getElementById('search-q').value.trim();
    const categoryId = document.getElementById('filter-category').value;
    const sort = document.getElementById('filter-sort').value;
    if (q) params.q = q;
    if (categoryId) params.category_id = categoryId;
    if (sort) params.sort = sort;

    const tasks = await Api.searchTasks(params);
    if (tasks.length === 0) {
      list.innerHTML = `<div style="grid-column:1/-1;">${emptyState('🔍', 'No tasks found', 'Try adjusting your search or check back later for new listings.')}</div>`;
      return;
    }
    list.innerHTML = tasks.map((t) => browseCardHtml(t)).join('');
    wireBrowseCardActions(list);
  } catch (err) {
    handleApiError(err, 'Could not load tasks.');
  }
}

function browseCardHtml(task) {
  return `
    <div class="task-card" data-task-id="${task.id}">
      <div class="task-card-top">
        <span class="cat-pill">${escapeHtml(task.category_name)}</span>
        <span class="mono" style="font-size:11.5px; color:var(--ink-muted);">${timeAgo(task.date_posted)}</span>
      </div>
      <h3>${escapeHtml(task.title)}</h3>
      <p class="desc">${escapeHtml(task.description)}</p>
      <div class="meta-row">
        <span>📍 ${escapeHtml(task.location)}</span>
        <span>Due ${formatDate(task.deadline)}</span>
      </div>
      <div class="meta-row" style="border-top:none; padding-top:0;">
        <span class="budget">${formatMoney(task.budget)}</span>
        <button class="btn btn-sm btn-primary" data-action="apply">Apply</button>
      </div>
    </div>
  `;
}

function wireBrowseCardActions(container) {
  container.querySelectorAll('[data-task-id]').forEach((card) => {
    const taskId = card.dataset.taskId;
    card.querySelectorAll('[data-action="apply"]').forEach((btn) =>
      btn.addEventListener('click', () => openApplyModal(taskId, card.querySelector('h3').textContent))
    );
  });
}

function openApplyModal(taskId, taskTitle) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Apply to "${escapeHtml(taskTitle)}"</h3>
      <p>Add a short message to introduce yourself (optional).</p>
      <div class="field">
        <textarea id="apply-message" placeholder="e.g. I've fixed similar issues before and can start today…"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="submit">Submit application</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('[data-action="submit"]').addEventListener('click', async (e) => {
    const btn = e.target;
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      await Api.applyToTask(taskId, { message: overlay.querySelector('#apply-message').value.trim() });
      showToast('Application submitted!', 'success');
      overlay.remove();
      loadBrowse();
      loadStats();
    } catch (err) {
      handleApiError(err);
      btn.disabled = false;
      btn.textContent = 'Submit application';
    }
  });
}

/* ---------------- Applications ---------------- */
async function loadApplications() {
  const panel = document.getElementById('applications-panel');
  panel.innerHTML = `<div class="loading-block"><div class="loading-spinner"></div></div>`;
  try {
    const applications = await Api.myApplications();
    if (applications.length === 0) {
      panel.innerHTML = emptyState('📨', 'No applications yet', 'Browse open tasks and apply to start building your track record.');
      return;
    }
    panel.innerHTML = `
      <div class="panel-head"><h2>My applications</h2></div>
      ${applications
        .map(
          (a) => `
        <div class="applicant-row" data-app-id="${a.id}">
          <div class="applicant-info">
            <div class="a-name">${escapeHtml(a.task_title)}</div>
            <div class="a-meta">Applied ${timeAgo(a.applied_at)}</div>
          </div>
          ${statusBadge(a.status)}
          ${a.status === 'pending' ? `<div class="applicant-actions"><button class="btn btn-sm btn-outline" data-withdraw>Withdraw</button></div>` : ''}
        </div>
      `
        )
        .join('')}
    `;
    panel.querySelectorAll('[data-withdraw]').forEach((btn) => {
      const row = btn.closest('[data-app-id]');
      btn.addEventListener('click', async () => {
        const ok = await confirmAction({
          title: 'Withdraw application?',
          message: 'The customer will no longer see you as an applicant for this task.',
          confirmLabel: 'Withdraw',
          danger: true,
        });
        if (!ok) return;
        try {
          await Api.withdrawApplication(row.dataset.appId);
          showToast('Application withdrawn.', 'success');
          loadApplications();
          loadStats();
        } catch (err) {
          handleApiError(err);
        }
      });
    });
  } catch (err) {
    handleApiError(err, 'Could not load your applications.');
  }
}

/* ---------------- Accepted jobs ---------------- */
async function loadJobs() {
  const panel = document.getElementById('jobs-panel');
  panel.innerHTML = `<div class="loading-block"><div class="loading-spinner"></div></div>`;
  try {
    const jobs = await Api.myTasksAsWorker();
    if (jobs.length === 0) {
      panel.innerHTML = emptyState('🧰', 'No accepted jobs yet', 'Once a customer accepts your application, the task will appear here.');
      return;
    }
    panel.innerHTML = `
      <div class="panel-head"><h2>Accepted jobs</h2></div>
      ${jobs
        .map(
          (t) => `
        <div class="applicant-row">
          <div class="applicant-info">
            <div class="a-name">${escapeHtml(t.title)}</div>
            <div class="a-meta">${escapeHtml(t.category_name)} · ${formatMoney(t.budget)} · Customer: ${escapeHtml(t.customer_name)}</div>
          </div>
          ${statusBadge(t.status)}
          <div class="applicant-actions">
            <a href="/task-detail.html?id=${t.id}" class="btn btn-sm btn-outline">View</a>
          </div>
        </div>
      `
        )
        .join('')}
    `;
  } catch (err) {
    handleApiError(err, 'Could not load your jobs.');
  }
}

function emptyState(icon, title, message) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

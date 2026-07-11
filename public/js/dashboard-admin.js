document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireAuth(['admin']);
  if (!user) return;

  renderSidebarUser();
  initMobileSidebar();

  wireNav();
  await loadStats();

  document.getElementById('category-form').addEventListener('submit', handleAddCategory);
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
  ['overview', 'users', 'tasks', 'categories'].forEach((v) => {
    document.getElementById(`view-${v}`).style.display = v === view ? 'block' : 'none';
  });
  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });
  if (view === 'users') loadUsers();
  if (view === 'tasks') loadTasks();
  if (view === 'categories') loadCategories();
  if (view === 'overview') loadStats();
  document.querySelector('.sidebar')?.classList.remove('mobile-open');
}

async function loadStats() {
  try {
    const stats = await Api.adminDashboard();
    document.getElementById('s-users').textContent = stats.total_users;
    document.getElementById('s-customers').textContent = stats.total_customers;
    document.getElementById('s-workers').textContent = stats.total_workers;
    document.getElementById('s-tasks').textContent = stats.total_tasks;
    document.getElementById('s-completed').textContent = stats.completed_tasks;
    document.getElementById('s-pending').textContent = stats.pending_tasks;
  } catch (err) {
    handleApiError(err, 'Could not load dashboard stats.');
  }
}

/* ---------------- Users ---------------- */
async function loadUsers() {
  const wrap = document.getElementById('users-table');
  wrap.innerHTML = `<div class="loading-block"><div class="loading-spinner"></div></div>`;
  try {
    const users = await Api.adminListUsers();
    if (users.length === 0) {
      wrap.innerHTML = emptyState('👥', 'No users found', '');
      return;
    }
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          ${users
            .map(
              (u) => `
            <tr data-user-id="${u.id}" data-role="${u.role}">
              <td>${escapeHtml(u.full_name || '—')}</td>
              <td>${escapeHtml(u.email)}</td>
              <td style="text-transform:capitalize;">${escapeHtml(u.role)}</td>
              <td>${u.is_active ? '<span class="badge badge-completed">Active</span>' : '<span class="badge badge-cancelled">Inactive</span>'}</td>
              <td>${formatDate(u.created_at)}</td>
              <td class="row-actions">
                ${u.role !== 'admin' ? `
                  <button class="btn btn-sm btn-outline" data-toggle>${u.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button class="btn btn-sm btn-danger" data-delete>Delete</button>
                ` : ''}
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll('[data-toggle]').forEach((btn) => {
      const row = btn.closest('tr');
      btn.addEventListener('click', async () => {
        try {
          await Api.adminToggleUser(row.dataset.userId);
          showToast('User status updated.', 'success');
          loadUsers();
        } catch (err) {
          handleApiError(err);
        }
      });
    });

    wrap.querySelectorAll('[data-delete]').forEach((btn) => {
      const row = btn.closest('tr');
      btn.addEventListener('click', async () => {
        const ok = await confirmAction({
          title: 'Delete this user?',
          message: 'This permanently removes their account, tasks, and applications. This cannot be undone.',
          confirmLabel: 'Delete user',
          danger: true,
        });
        if (!ok) return;
        try {
          await Api.adminDeleteUser(row.dataset.userId);
          showToast('User deleted.', 'success');
          loadUsers();
          loadStats();
        } catch (err) {
          handleApiError(err);
        }
      });
    });
  } catch (err) {
    handleApiError(err, 'Could not load users.');
  }
}

/* ---------------- Tasks ---------------- */
async function loadTasks() {
  const wrap = document.getElementById('tasks-table');
  wrap.innerHTML = `<div class="loading-block"><div class="loading-spinner"></div></div>`;
  try {
    const tasks = await Api.adminListTasks();
    if (tasks.length === 0) {
      wrap.innerHTML = emptyState('🗂', 'No tasks found', '');
      return;
    }
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Title</th><th>Category</th><th>Customer</th><th>Budget</th><th>Status</th><th>Posted</th><th></th></tr></thead>
        <tbody>
          ${tasks
            .map(
              (t) => `
            <tr data-task-id="${t.id}">
              <td>${escapeHtml(t.title)}</td>
              <td>${escapeHtml(t.category_name)}</td>
              <td>${escapeHtml(t.customer_name)}</td>
              <td>${formatMoney(t.budget)}</td>
              <td>${statusBadge(t.status)}</td>
              <td>${formatDate(t.date_posted)}</td>
              <td class="row-actions">
                <a class="btn btn-sm btn-outline" href="/task-detail.html?id=${t.id}">View</a>
                <button class="btn btn-sm btn-danger" data-delete>Delete</button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll('[data-delete]').forEach((btn) => {
      const row = btn.closest('tr');
      btn.addEventListener('click', async () => {
        const ok = await confirmAction({
          title: 'Delete this task?',
          message: 'This permanently removes the task and all its applications. Use this for fake or abusive listings.',
          confirmLabel: 'Delete task',
          danger: true,
        });
        if (!ok) return;
        try {
          await Api.adminDeleteTask(row.dataset.taskId);
          showToast('Task deleted.', 'success');
          loadTasks();
          loadStats();
        } catch (err) {
          handleApiError(err);
        }
      });
    });
  } catch (err) {
    handleApiError(err, 'Could not load tasks.');
  }
}

/* ---------------- Categories ---------------- */
async function loadCategories() {
  const wrap = document.getElementById('categories-table');
  wrap.innerHTML = `<div class="loading-block"><div class="loading-spinner"></div></div>`;
  try {
    const categories = await Api.listAllCategoriesAdmin();
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${categories
            .map(
              (c) => `
            <tr data-cat-id="${c.id}">
              <td>${escapeHtml(c.name)}</td>
              <td>${c.is_active ? '<span class="badge badge-completed">Active</span>' : '<span class="badge badge-cancelled">Hidden</span>'}</td>
              <td class="row-actions">
                <button class="btn btn-sm btn-outline" data-toggle>${c.is_active ? 'Hide' : 'Show'}</button>
                <button class="btn btn-sm btn-danger" data-delete>Delete</button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll('[data-toggle]').forEach((btn) => {
      const row = btn.closest('tr');
      btn.addEventListener('click', async () => {
        try {
          await Api.toggleCategory(row.dataset.catId);
          loadCategories();
        } catch (err) {
          handleApiError(err);
        }
      });
    });

    wrap.querySelectorAll('[data-delete]').forEach((btn) => {
      const row = btn.closest('tr');
      btn.addEventListener('click', async () => {
        const ok = await confirmAction({
          title: 'Delete this category?',
          message: 'Tasks already posted under it will keep referencing it, but it will no longer be selectable for new tasks.',
          confirmLabel: 'Delete',
          danger: true,
        });
        if (!ok) return;
        try {
          await Api.deleteCategory(row.dataset.catId);
          showToast('Category deleted.', 'success');
          loadCategories();
        } catch (err) {
          handleApiError(err, 'Could not delete category. It may still be in use by existing tasks.');
        }
      });
    });
  } catch (err) {
    handleApiError(err, 'Could not load categories.');
  }
}

async function handleAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById('category-name');
  const name = input.value.trim();
  if (!name) return;
  try {
    await Api.createCategory({ name });
    showToast('Category added.', 'success');
    input.value = '';
    loadCategories();
  } catch (err) {
    handleApiError(err, 'Could not add category.');
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

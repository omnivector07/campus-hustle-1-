/* ============================================================
   CAMPUS HUSTLE — SHARED FRONT-END UTILITIES
   Loaded on every page before the page-specific script.
   ============================================================ */

const API_BASE = '/api';
const TOKEN_KEY = 'campushustle_token';
const USER_KEY = 'campushustle_user';

/* ---------------- Auth storage ---------------- */
const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  updateUser(partial) {
    const user = Auth.getUser();
    if (!user) return;
    const merged = { ...user, ...partial, profile: { ...(user.profile || {}), ...(partial.profile || {}) } };
    localStorage.setItem(USER_KEY, JSON.stringify(merged));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() {
    return !!Auth.getToken();
  },
  requireAuth(allowedRoles) {
    const user = Auth.getUser();
    if (!Auth.isLoggedIn() || !user) {
      window.location.href = '/login.html';
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      window.location.href = redirectForRole(user.role);
      return null;
    }
    return user;
  },
  redirectIfLoggedIn() {
    const user = Auth.getUser();
    if (Auth.isLoggedIn() && user) {
      window.location.href = redirectForRole(user.role);
    }
  },
  logout() {
    Auth.clear();
    window.location.href = '/login.html';
  },
};

function redirectForRole(role) {
  if (role === 'admin') return '/dashboard-admin.html';
  if (role === 'worker') return '/dashboard-worker.html';
  return '/dashboard-customer.html';
}

/* ---------------- API client ---------------- */
async function apiRequest(path, { method = 'GET', body, isFormData = false, auth = true } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError('Network error. Check your connection and try again.', 0, null);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    json = { success: false, message: 'Unexpected server response.' };
  }

  if (!res.ok || !json.success) {
    if (res.status === 401 && auth) {
      Auth.clear();
    }
    throw new ApiError(json.message || 'Something went wrong.', res.status, json.errors || null);
  }

  return json.data;
}

class ApiError extends Error {
  constructor(message, statusCode, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const Api = {
  // Auth
  signup: (payload) => apiRequest('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => apiRequest('/auth/me'),
  switchRole: (role) => apiRequest('/auth/switch-role', { method: 'PATCH', body: { role } }),

  // Categories
  listCategories: () => apiRequest('/categories', { auth: false }),
  createCategory: (payload) => apiRequest('/categories/admin', { method: 'POST', body: payload }),
  toggleCategory: (id) => apiRequest(`/categories/admin/${id}/toggle`, { method: 'PATCH' }),
  deleteCategory: (id) => apiRequest(`/categories/admin/${id}`, { method: 'DELETE' }),
  listAllCategoriesAdmin: () => apiRequest('/categories/admin/all'),

  // Tasks
  searchTasks: (params) => apiRequest(`/tasks?${new URLSearchParams(params).toString()}`, { auth: false }),
  getTask: (id) => apiRequest(`/tasks/${id}`, { auth: false }),
  createTask: (payload) => apiRequest('/tasks', { method: 'POST', body: payload }),
  updateTask: (id, payload) => apiRequest(`/tasks/${id}`, { method: 'PUT', body: payload }),
  myTasksAsCustomer: (status) => apiRequest(`/tasks/mine/customer${status ? `?status=${status}` : ''}`),
  myTasksAsWorker: (status) => apiRequest(`/tasks/mine/worker${status ? `?status=${status}` : ''}`),
  cancelTask: (id) => apiRequest(`/tasks/${id}/cancel`, { method: 'PATCH' }),
  completeTask: (id) => apiRequest(`/tasks/${id}/complete`, { method: 'PATCH' }),
  listApplicants: (taskId) => apiRequest(`/tasks/${taskId}/applicants`),

  // Applications
  applyToTask: (taskId, payload) => apiRequest(`/tasks/${taskId}/apply`, { method: 'POST', body: payload }),
  withdrawApplication: (id) => apiRequest(`/applications/${id}/withdraw`, { method: 'PATCH' }),
  acceptApplication: (id) => apiRequest(`/applications/${id}/accept`, { method: 'PATCH' }),
  myApplications: (status) => apiRequest(`/applications/mine${status ? `?status=${status}` : ''}`),

  // Reviews
  createReview: (taskId, payload) => apiRequest(`/tasks/${taskId}/review`, { method: 'POST', body: payload }),
  getTaskReview: (taskId) => apiRequest(`/tasks/${taskId}/review`, { auth: false }),
  listWorkerReviews: (workerId) => apiRequest(`/reviews/worker/${workerId}`, { auth: false }),

  // Profile
  getMyProfile: () => apiRequest('/users/me/profile'),
  updateMyProfile: (payload) => apiRequest('/users/me/profile', { method: 'PUT', body: payload }),
  uploadProfilePicture: (formData) => apiRequest('/users/me/profile/picture', { method: 'POST', body: formData, isFormData: true }),
  getPublicProfile: (id) => apiRequest(`/users/${id}`, { auth: false }),

  // Notifications
  listNotifications: (unreadOnly) => apiRequest(`/notifications${unreadOnly ? '?unread=true' : ''}`),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),

  // Admin
  adminDashboard: () => apiRequest('/admin/dashboard'),
  adminListUsers: (params = {}) => apiRequest(`/admin/users?${new URLSearchParams(params).toString()}`),
  adminDeleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
  adminToggleUser: (id) => apiRequest(`/admin/users/${id}/toggle-active`, { method: 'PATCH' }),
  adminListTasks: (params = {}) => apiRequest(`/admin/tasks?${new URLSearchParams(params).toString()}`),
  adminDeleteTask: (id) => apiRequest(`/admin/tasks/${id}`, { method: 'DELETE' }),
};

/* ---------------- Toast ---------------- */
function ensureToastRoot() {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  return root;
}

function showToast(message, type = 'default') {
  const root = ensureToastRoot();
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
  toast.textContent = message;
  root.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3800);
}

function handleApiError(err, fallback = 'Something went wrong. Please try again.') {
  console.error(err);
  const message = err instanceof ApiError ? err.message : fallback;
  showToast(message, 'error');
}

/* ---------------- Modal / confirm ---------------- */
function confirmAction({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" data-action="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.dataset.action === 'cancel') {
        overlay.remove();
        resolve(false);
      }
      if (e.target.dataset.action === 'confirm') {
        overlay.remove();
        resolve(true);
      }
    });
  });
}

/* ---------------- Formatting helpers ---------------- */
function formatMoney(amount) {
  const n = Number(amount);
  return `\u20A6${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr.replace(' ', 'T') + 'Z')) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function statusBadge(status) {
  const labels = {
    open: 'Open',
    assigned: 'Assigned',
    completed: 'Completed',
    cancelled: 'Cancelled',
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

function starRow(rating) {
  const full = Math.round(rating || 0);
  let out = '';
  for (let i = 1; i <= 5; i++) out += i <= full ? '★' : '☆';
  return out;
}

/* ---------------- Mobile nav toggle (dashboard sidebar) ---------------- */
function initMobileSidebar() {
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('mobile-open');
    }
  });
}

/* ---------------- Notification bell (shared across dashboards) ---------------- */
async function initNotificationBell() {
  const bell = document.querySelector('[data-notif-bell]');
  const panel = document.querySelector('[data-notif-panel]');
  if (!bell || !panel) return;

  async function loadNotifications() {
    try {
      const data = await Api.listNotifications();
      renderNotifications(data.notifications, data.unread_count);
    } catch (err) {
      // Silent fail for the bell — not critical to page function.
    }
  }

  function renderNotifications(notifications, unreadCount) {
    bell.classList.toggle('has-unread', unreadCount > 0);
    if (notifications.length === 0) {
      panel.innerHTML = `
        <div class="notif-panel-head"><span>Notifications</span></div>
        <div class="empty-state" style="padding: 32px 16px;">
          <div class="empty-icon">🔔</div>
          <h3 style="font-size:14px;">No notifications yet</h3>
          <p style="font-size:12.5px;">We'll let you know when something happens.</p>
        </div>`;
      return;
    }
    panel.innerHTML = `
      <div class="notif-panel-head">
        <span>Notifications</span>
        <button class="btn btn-sm btn-outline" data-mark-all>Mark all read</button>
      </div>
      ${notifications
        .map(
          (n) => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" data-link="${n.link || ''}">
          <div class="n-title">${escapeHtml(n.title)}</div>
          <div class="n-msg">${escapeHtml(n.message)}</div>
          <div class="n-time">${timeAgo(n.created_at)}</div>
        </div>`
        )
        .join('')}
    `;

    panel.querySelectorAll('[data-mark-all]').forEach((btn) =>
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Api.markAllNotificationsRead();
        loadNotifications();
      })
    );

    panel.querySelectorAll('.notif-item').forEach((item) =>
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const link = item.dataset.link;
        await Api.markNotificationRead(id);
        if (link) window.location.href = link;
      })
    );
  }

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) loadNotifications();
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bell.contains(e.target)) {
      panel.classList.remove('show');
    }
  });

  loadNotifications();
}

/* ---------------- Sidebar user block with role switcher ---------------- */
function renderSidebarUser() {
  const el = document.querySelector('[data-sidebar-user]');
  const user = Auth.getUser();
  if (!el || !user) return;
  const pic = user.profile?.profile_picture;
  el.innerHTML = `
    ${pic ? `<img src="${escapeHtml(pic)}" alt="">` : `<div class="avatar-fallback">${initials(user.profile?.full_name)}</div>`}
    <div>
      <div class="name">${escapeHtml(user.profile?.full_name || user.email)}</div>
      <div class="role">${escapeHtml(user.role)}</div>
    </div>
  `;
  
  // Add role switcher for non-admin users
  if (user.role !== 'admin') {
    const switchBtn = document.createElement('button');
    switchBtn.className = 'btn btn-sm btn-outline';
    switchBtn.style.marginTop = '12px';
    switchBtn.style.width = '100%';
    const targetRole = user.role === 'worker' ? 'customer' : 'worker';
    const switchLabel = targetRole === 'customer' ? 'Switch to Hire' : 'Switch to Earn';
    switchBtn.textContent = switchLabel;
    switchBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        switchBtn.disabled = true;
        switchBtn.textContent = 'Switching…';
        const data = await Api.switchRole(targetRole);
        Auth.setSession(data.token, data.user);
        showToast(`Switched to ${targetRole} mode!`, 'success');
        setTimeout(() => {
          window.location.href = redirectForRole(data.user.role);
        }, 500);
      } catch (err) {
        handleApiError(err);
        switchBtn.disabled = false;
        switchBtn.textContent = switchLabel;
      }
    });
    el.parentElement.appendChild(switchBtn);
  }
}

/* ---------------- Logout wiring ---------------- */
function wireLogoutButtons() {
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  wireLogoutButtons();
});

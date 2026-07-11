let currentUser = null;
let currentTask = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth();
  if (!currentUser) return;

  document.getElementById('back-link').href = redirectForRole(currentUser.role);

  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('id');
  if (!taskId) {
    renderNotFound();
    return;
  }

  await loadTask(taskId);
});

async function loadTask(taskId) {
  const root = document.getElementById('task-detail-root');
  try {
    const [task, reviewData] = await Promise.all([
      Api.getTask(taskId),
      Api.getTaskReview(taskId).catch(() => null),
    ]);
    currentTask = task;
    renderTask(task, reviewData);
  } catch (err) {
    if (err.statusCode === 404) {
      renderNotFound();
    } else {
      root.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load task</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  }
}

function renderNotFound() {
  document.getElementById('task-detail-root').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>Task not found</h3>
      <p>This task may have been removed or the link is incorrect.</p>
    </div>
  `;
}

function renderTask(task, review) {
  const root = document.getElementById('task-detail-root');
  const isOwner = currentUser.role === 'customer' && currentUser.id === task.customer_id;
  const isAssignedWorker = currentUser.role === 'worker' && currentUser.id === task.assigned_worker_id;

  root.innerHTML = `
    <div class="detail-grid">
      <div>
        <div class="panel">
          <div class="panel-head">
            <div>
              <span class="cat-pill">${escapeHtml(task.category_name)}</span>
            </div>
            ${statusBadge(task.status)}
          </div>
          <h1 style="font-size:24px; margin-bottom:14px;">${escapeHtml(task.title)}</h1>
          <p style="color:var(--navy-800); font-size:15px; line-height:1.7; white-space:pre-wrap;">${escapeHtml(task.description)}</p>

          <div class="detail-meta-list">
            <div class="detail-meta-item">
              <div class="icon">💰</div>
              <div><div class="label">Budget</div><div class="val">${formatMoney(task.budget)}</div></div>
            </div>
            <div class="detail-meta-item">
              <div class="icon">📅</div>
              <div><div class="label">Deadline</div><div class="val">${formatDate(task.deadline)}</div></div>
            </div>
            <div class="detail-meta-item">
              <div class="icon">📍</div>
              <div><div class="label">Location</div><div class="val">${escapeHtml(task.location)}</div></div>
            </div>
            <div class="detail-meta-item">
              <div class="icon">🕐</div>
              <div><div class="label">Posted</div><div class="val">${formatDateTime(task.date_posted)}</div></div>
            </div>
          </div>
        </div>

        ${review ? `
          <div class="panel">
            <div class="panel-head"><h2>Review</h2></div>
            <div class="review-card">
              <div class="stars">${starRow(review.rating)}</div>
              <div class="r-name">${escapeHtml(review.customer_name)}</div>
              ${review.comment ? `<div class="r-comment">"${escapeHtml(review.comment)}"</div>` : ''}
              <div class="r-date">${formatDate(review.created_at)}</div>
            </div>
          </div>
        ` : ''}
      </div>

      <div>
        <div class="panel">
          <div class="panel-head"><h2>${isOwner ? 'Your task' : 'Posted by'}</h2></div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="avatar-fallback" style="width:48px; height:48px; border-radius:50%;">${initials(task.customer_name)}</div>
            <div>
              <div style="font-weight:600; font-size:14.5px;">${escapeHtml(task.customer_name)}</div>
              <div style="font-size:12.5px; color:var(--ink-muted);">${escapeHtml(task.customer_phone || 'No phone on file')}</div>
            </div>
          </div>
        </div>

        ${task.assigned_worker_id ? `
          <div class="panel">
            <div class="panel-head"><h2>Assigned worker</h2></div>
            <div style="display:flex; align-items:center; gap:12px;">
              ${task.worker_picture ? `<img src="${escapeHtml(task.worker_picture)}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">` : `<div class="avatar-fallback" style="width:48px; height:48px; border-radius:50%;">${initials(task.worker_name)}</div>`}
              <div>
                <div style="font-weight:600; font-size:14.5px;">${escapeHtml(task.worker_name)}</div>
                <div style="font-size:12.5px; color:var(--ink-muted);">${escapeHtml(task.worker_phone || 'No phone on file')}</div>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="panel" id="actions-panel"></div>
      </div>
    </div>
  `;

  renderActions(task, isOwner, isAssignedWorker, review);
}

function renderActions(task, isOwner, isAssignedWorker, review) {
  const panel = document.getElementById('actions-panel');
  const actions = [];

  if (isOwner && task.status === 'open') {
    actions.push(`<a href="/dashboard-customer.html" class="btn btn-primary btn-block">View applicants</a>`);
    actions.push(`<button class="btn btn-danger btn-block" id="btn-cancel">Cancel task</button>`);
  }
  if (isOwner && task.status === 'assigned') {
    actions.push(`<button class="btn btn-primary btn-block" id="btn-complete">Mark as completed</button>`);
    actions.push(`<button class="btn btn-danger btn-block" id="btn-cancel">Cancel task</button>`);
  }
  if (isOwner && task.status === 'completed' && !review) {
    actions.push(`<button class="btn btn-primary btn-block" id="btn-review">Rate worker</button>`);
  }
  if (!isOwner && currentUser.role === 'worker' && task.status === 'open') {
    actions.push(`<button class="btn btn-primary btn-block" id="btn-apply">Apply for this task</button>`);
  }

  if (actions.length === 0) {
    panel.innerHTML = `<p style="font-size:13.5px; color:var(--ink-muted); text-align:center;">No actions available for this task right now.</p>`;
    return;
  }

  panel.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;">${actions.join('')}</div>`;

  document.getElementById('btn-cancel')?.addEventListener('click', async () => {
    const ok = await confirmAction({ title: 'Cancel this task?', message: 'This cannot be undone.', confirmLabel: 'Cancel task', danger: true });
    if (!ok) return;
    try {
      await Api.cancelTask(task.id);
      showToast('Task cancelled.', 'success');
      loadTask(task.id);
    } catch (err) {
      handleApiError(err);
    }
  });

  document.getElementById('btn-complete')?.addEventListener('click', async () => {
    const ok = await confirmAction({ title: 'Mark task as completed?', message: 'You can rate the worker afterward.', confirmLabel: 'Mark complete' });
    if (!ok) return;
    try {
      await Api.completeTask(task.id);
      showToast('Task marked as completed.', 'success');
      loadTask(task.id);
    } catch (err) {
      handleApiError(err);
    }
  });

  document.getElementById('btn-apply')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>Apply for this task</h3>
        <p>Add a short message to introduce yourself (optional).</p>
        <div class="field"><textarea id="apply-message" placeholder="e.g. I've done this before and can start today…"></textarea></div>
        <div class="modal-actions">
          <button class="btn btn-outline" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="submit">Submit application</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
    overlay.querySelector('[data-action="submit"]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await Api.applyToTask(task.id, { message: overlay.querySelector('#apply-message').value.trim() });
        showToast('Application submitted!', 'success');
        overlay.remove();
      } catch (err) {
        handleApiError(err);
        e.target.disabled = false;
      }
    });
  });

  document.getElementById('btn-review')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>Rate this worker</h3>
        <p>How was the job?</p>
        <div class="star-picker" id="star-picker">${[1, 2, 3, 4, 5].map((i) => `<span class="star" data-value="${i}">★</span>`).join('')}</div>
        <div class="field" style="margin-top:18px;"><textarea id="review-comment" placeholder="Share your experience…"></textarea></div>
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
      submitBtn.disabled = true;
      try {
        await Api.createReview(task.id, { rating, comment: overlay.querySelector('#review-comment').value.trim() });
        showToast('Thanks for rating!', 'success');
        overlay.remove();
        loadTask(task.id);
      } catch (err) {
        handleApiError(err);
        submitBtn.disabled = false;
      }
    });
  });
}

# API Documentation

Base URL (local development): `http://localhost:3000/api`

All responses use this envelope:

```json
{ "success": true, "message": "OK", "data": {} }
```

or on failure:

```json
{ "success": false, "message": "Human-readable error", "errors": { "field": "reason" } }
```

Authenticated endpoints require a header: `Authorization: Bearer <token>`. Tokens are issued by
`/auth/login` and `/auth/signup` and expire after `JWT_EXPIRES_IN` (default 7 days).

---

## Auth

### `POST /auth/signup`
Public. Creates a `customer` or `worker` account and returns a token.

Body:
```json
{
  "email": "student@rsu.edu.ng",
  "password": "minimum8chars",
  "role": "customer",
  "full_name": "Chidinma Okafor",
  "phone": "08012345678",
  "department": "Computer Science",
  "faculty": "Science",
  "level": "300"
}
```
`phone`, `department`, `faculty`, `level` are optional. `role` must be `customer` or `worker`
(admin accounts cannot self-register). Returns `201` with `{ token, user }`.

### `POST /auth/login`
Public. Body: `{ "email": "...", "password": "..." }`. Returns `{ token, user }`.

### `GET /auth/me`
Auth required. Returns the current user with profile.

### `POST /auth/logout`
Auth required. Stateless — the client discards the token. Included for API symmetry.

---

## Users / Profiles

### `GET /users/me/profile`
Auth required. Returns the current user's full profile.

### `PUT /users/me/profile`
Auth required. Body may include any of: `full_name`, `phone`, `department`, `faculty`, `level`, `bio`,
`skills` (array of strings). Partial updates supported — only send fields you want to change.

### `POST /users/me/profile/picture`
Auth required. `multipart/form-data` with a single `file` field (JPEG/PNG/WEBP/GIF, max 5MB by default).
Returns `{ profile_picture: "/assets/uploads/profiles/xxx.jpg" }`.

### `GET /users/:id`
Public. Returns a user's public profile plus their reviews (if a worker).

---

## Categories

### `GET /categories`
Public. Returns active categories.

### `GET /categories/admin/all` — admin only
All categories, including hidden ones.

### `POST /categories/admin` — admin only
Body: `{ "name": "New Category" }`.

### `PATCH /categories/admin/:id/toggle` — admin only
Toggles a category's active state.

### `DELETE /categories/admin/:id` — admin only
Deletes a category. Fails if existing tasks still reference it (foreign key constraint).

---

## Tasks

### `GET /tasks`
Public. Search/browse **open** tasks. Query params (all optional):

| Param        | Type   | Notes                              |
|--------------|--------|--------------------------------------|
| q            | string | Matches title or description         |
| category_id  | number |                                       |
| min_budget   | number |                                       |
| max_budget   | number |                                       |
| location     | string | Partial match                        |
| sort         | string | `newest` (default) or `oldest`       |
| limit        | number | Default 50, max 100                  |
| offset       | number | Default 0                            |

### `GET /tasks/:id`
Public. Full task details including category, customer, and assigned worker info.

### `POST /tasks` — customer only
Body:
```json
{
  "title": "Fix laptop that won't boot",
  "description": "...",
  "category_id": 13,
  "budget": 5000,
  "deadline": "2026-08-01",
  "location": "Hostel Block C, RSU"
}
```
`deadline` cannot be in the past. Returns `201`.

### `PUT /tasks/:id` — customer, owner only
Partial update. Only allowed while the task is `open`.

### `PATCH /tasks/:id/cancel` — customer, owner only
Moves task to `cancelled`. Allowed from `open` or `assigned`.

### `PATCH /tasks/:id/complete` — customer, owner only
Moves task from `assigned` to `completed`, increments the worker's `completed_jobs`.

### `GET /tasks/mine/customer` — customer only
Optional `?status=open|assigned|completed|cancelled`.

### `GET /tasks/mine/worker` — worker only
Tasks currently or previously assigned to the logged-in worker.

### `GET /tasks/:taskId/applicants` — customer, owner only
All applications for a task.

### `POST /tasks/:taskId/apply` — worker only
Body: `{ "message": "optional note" }`. Fails if the task isn't open, or the worker already has a
non-withdrawn application.

### `GET /tasks/:taskId/review`
Public. Returns the review for a task, or `null`.

### `POST /tasks/:taskId/review` — customer, owner only
Body: `{ "rating": 1-5, "comment": "optional" }`. Only allowed once, after the task is `completed`.

---

## Applications

### `GET /applications/mine` — worker only
Optional `?status=pending|accepted|rejected|withdrawn`.

### `PATCH /applications/:id/withdraw` — worker, owner only
Only allowed while `pending`.

### `PATCH /applications/:id/accept` — customer, owner of the task only
Assigns the task to this applicant, rejects all other pending applicants, and notifies everyone
involved.

---

## Reviews

### `GET /reviews/worker/:workerId`
Public. All reviews received by a worker.

---

## Notifications

### `GET /notifications` — auth required
Optional `?unread=true`. Returns `{ notifications: [...], unread_count: N }`.

### `PATCH /notifications/:id/read` — auth required
### `PATCH /notifications/read-all` — auth required

---

## Admin

All routes below require role `admin`.

### `GET /admin/dashboard`
Returns `{ total_users, total_customers, total_workers, total_tasks, completed_tasks, pending_tasks, cancelled_tasks }`.

### `GET /admin/users`
Optional `?limit=&offset=`.

### `DELETE /admin/users/:id`
Permanently deletes a user (and cascades to their tasks/applications/reviews). Admin accounts cannot
be deleted through this endpoint.

### `PATCH /admin/users/:id/toggle-active`
Activates/deactivates an account (deactivated users cannot log in).

### `GET /admin/tasks`
Optional `?limit=&offset=`. All tasks regardless of status.

### `DELETE /admin/tasks/:id`
Permanently deletes a task and its applications — for removing fake or abusive listings.

---

## Health check

### `GET /health` (note: mounted at `/api/health`, not under any resource prefix)
Public. Returns `{ success, message, timestamp }`. Useful for uptime monitoring / deployment checks.

---

## Error codes used across the API

| Code | Meaning                                                        |
|------|------------------------------------------------------------------|
| 400  | Malformed request                                                 |
| 401  | Missing/invalid token, or wrong credentials                       |
| 403  | Authenticated but not permitted (wrong role, not the resource owner, deactivated account) |
| 404  | Resource not found                                                 |
| 409  | Conflict (duplicate email, already applied, task not in the right state) |
| 413  | Uploaded file too large                                            |
| 415  | Unsupported file type                                              |
| 422  | Validation failed (see `errors` object for field-level messages)  |
| 500  | Unexpected server error                                            |

# Database Schema

Campus Hustle uses **SQLite** via `better-sqlite3`. The database file lives at `data/campus_hustle.db`
(configurable via `DATABASE_PATH`) and is created automatically by `npm run migrate` / `npm run dev`.

Foreign keys are enforced (`PRAGMA foreign_keys = ON`) and the database runs in WAL mode for better
concurrent read performance.

## Tables

### `users`
Core authentication record. One row per account, regardless of role.

| Column          | Type    | Notes                                              |
|-----------------|---------|-----------------------------------------------------|
| id              | INTEGER | Primary key, autoincrement                          |
| email           | TEXT    | Unique, lowercased before storage                    |
| password_hash   | TEXT    | bcrypt hash, 10 salt rounds                          |
| role            | TEXT    | `customer` \| `worker` \| `admin`                    |
| is_active       | INTEGER | 0/1 — deactivated accounts cannot log in             |
| created_at      | TEXT    | ISO datetime, default now                            |
| updated_at      | TEXT    | ISO datetime, default now                            |

### `profiles`
1:1 extension of `users` with public-facing details.

| Column          | Type    | Notes                                                          |
|-----------------|---------|------------------------------------------------------------------|
| id              | INTEGER | Primary key                                                     |
| user_id         | INTEGER | FK → `users.id`, unique, cascade delete                         |
| full_name       | TEXT    | Required                                                         |
| phone           | TEXT    |                                                                   |
| department      | TEXT    |                                                                   |
| faculty         | TEXT    |                                                                   |
| level           | TEXT    |                                                                   |
| bio             | TEXT    |                                                                   |
| skills          | TEXT    | JSON-encoded array of category names, e.g. `["Coding","Errands"]` |
| profile_picture | TEXT    | Relative web path, e.g. `/assets/uploads/profiles/xxx.jpg`       |
| rating_avg      | REAL    | Recalculated whenever a new review is submitted                 |
| rating_count    | INTEGER | Total number of reviews received                                 |
| completed_jobs  | INTEGER | Incremented each time a task assigned to this user is completed |

### `categories`
Task categories. Seeded with the 18 categories from the product brief; admins can add more.

| Column     | Type    | Notes                              |
|------------|---------|--------------------------------------|
| id         | INTEGER | Primary key                          |
| name       | TEXT    | Unique, e.g. "Laptop Repair"         |
| slug       | TEXT    | Unique, URL-safe, e.g. "laptop-repair" |
| is_active  | INTEGER | 0/1 — hidden categories don't appear in the picker but existing tasks keep referencing them |

### `tasks`

| Column              | Type    | Notes                                                        |
|---------------------|---------|-----------------------------------------------------------------|
| id                  | INTEGER | Primary key                                                     |
| customer_id         | INTEGER | FK → `users.id`, the poster, cascade delete                     |
| assigned_worker_id  | INTEGER | FK → `users.id`, nullable, set null if the worker is deleted    |
| title               | TEXT    |                                                                   |
| description         | TEXT    |                                                                   |
| category_id         | INTEGER | FK → `categories.id`                                            |
| budget              | REAL    | Must be > 0                                                      |
| deadline            | TEXT    | ISO date/datetime, validated as not in the past on creation     |
| location            | TEXT    |                                                                   |
| status              | TEXT    | `open` \| `assigned` \| `completed` \| `cancelled`               |
| date_posted         | TEXT    | Default now                                                      |
| updated_at          | TEXT    | Default now                                                      |

### `applications`
A worker's application to a task. One application per (task, worker) pair — re-applying after
withdrawal reactivates the existing row rather than creating a duplicate.

| Column      | Type    | Notes                                                       |
|-------------|---------|-----------------------------------------------------------------|
| id          | INTEGER | Primary key                                                     |
| task_id     | INTEGER | FK → `tasks.id`, cascade delete                                 |
| worker_id   | INTEGER | FK → `users.id`, cascade delete                                 |
| message     | TEXT    | Optional note from the worker                                   |
| status      | TEXT    | `pending` \| `accepted` \| `rejected` \| `withdrawn`             |
| applied_at  | TEXT    | Default now                                                      |
| updated_at  | TEXT    | Default now                                                      |

Unique constraint on `(task_id, worker_id)`.

### `reviews`
One review per completed task, written by the customer about the assigned worker.

| Column      | Type    | Notes                                    |
|-------------|---------|---------------------------------------------|
| id          | INTEGER | Primary key                                 |
| task_id     | INTEGER | FK → `tasks.id`, unique, cascade delete      |
| customer_id | INTEGER | FK → `users.id`                              |
| worker_id   | INTEGER | FK → `users.id`                              |
| rating      | INTEGER | 1–5                                          |
| comment     | TEXT    | Optional                                     |
| created_at  | TEXT    | Default now                                  |

### `notifications`

| Column      | Type    | Notes                                                                 |
|-------------|---------|---------------------------------------------------------------------------|
| id          | INTEGER | Primary key                                                              |
| user_id     | INTEGER | FK → `users.id`, cascade delete — the recipient                          |
| type        | TEXT    | `new_application`, `application_accepted`, `application_rejected`, `task_completed`, `task_cancelled`, `review_received` |
| title       | TEXT    |                                                                            |
| message     | TEXT    |                                                                            |
| link        | TEXT    | Relative front-end path to navigate to when clicked                      |
| is_read     | INTEGER | 0/1                                                                       |
| created_at  | TEXT    | Default now                                                               |

## Indexes

Indexes are defined on all foreign key columns and on columns used for filtering/sorting (`status`,
`date_posted`, `is_read`, `email`, `role`) — see `src/database/schema.sql` for the exact list.

## Migrations

This project uses a single idempotent schema file rather than incremental migration files, which is
appropriate for an MVP. `npm run migrate` (or `npm run dev` / `npm start`, which call it automatically)
runs `CREATE TABLE IF NOT EXISTS` statements, so it's always safe to re-run. Use
`node src/database/migrate.js --force` to drop and recreate all tables from scratch (destructive —
development use only).

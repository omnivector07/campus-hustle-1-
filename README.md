# Campus Hustle

**Earn. Hire. Grow.**

A student marketplace built for Rivers State University, Port Harcourt — where students who need a task
done (laundry, laptop repair, graphic design, tutoring, and 14 more categories) can hire fellow students
who are ready to earn doing it. Architected so it can expand to every university in Nigeria without
structural changes.

---

## Tech stack

- **Backend:** Node.js, Fastify, better-sqlite3 (SQLite), JWT auth (`@fastify/jwt`), bcrypt password
  hashing, `@fastify/multipart` for file uploads
- **Frontend:** Plain HTML, CSS, vanilla JavaScript — no framework, no build step
- **Database:** SQLite (file-based, zero external services required for the MVP)

---

## Quick start

Requirements: **Node.js 18+**

```bash
npm install
npm run dev
```

That's it. `npm run dev` automatically runs the database migration and seed script before starting the
server with auto-reload. Visit **http://localhost:3000**.

To run in production mode: `npm start` (migrates but does not reseed, no auto-reload). See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for hosting instructions.

### Environment variables

`npm install` does not create `.env` for you automatically in every environment — if it's missing, copy
the template first:

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development. See that file for the full list
of variables (JWT secret, database path, upload limits, admin seed credentials, etc).

### Useful scripts

| Command             | What it does                                                        |
|----------------------|------------------------------------------------------------------------|
| `npm run dev`        | Migrate + seed + start server with auto-reload (development)          |
| `npm start`          | Migrate + start server (production, no reload, no reseed)             |
| `npm run migrate`    | Apply the schema (safe to re-run — uses `CREATE TABLE IF NOT EXISTS`)  |
| `npm run seed`       | Seed categories, an admin account, and light demo data (idempotent)   |
| `npm run reset-db`   | ⚠️ Drops all tables and rebuilds from scratch, then reseeds            |

---

## Demo accounts

After running `npm run seed` (or `npm run dev`, which seeds automatically), these accounts are ready to
use:

| Role     | Email                             | Password        |
|----------|------------------------------------|-------------------|
| Admin    | `admin@campushustle.ng`            | `Admin@12345`      |
| Customer | `chidinma.customer@rsu.edu.ng`     | `Password@123`     |
| Worker   | `emeka.worker@rsu.edu.ng`          | `Password@123`     |
| Worker   | `amaka.worker@rsu.edu.ng`          | `Password@123`     |

**Change the admin credentials** (`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`) before deploying anywhere
public.

---

## Feature overview

**Authentication** — signup, login, logout, JWT sessions, bcrypt-hashed passwords, persistent sessions
via `localStorage`.

**Customers** can post tasks, edit/cancel open tasks, view and accept applicants, mark tasks completed,
and rate the worker afterward.

**Workers** can complete their profile (bio, skills, department, profile picture), browse and search open
tasks by title/category/budget/location, apply with an optional message, withdraw a pending application,
track accepted jobs, and build a rating from completed work.

**Admin panel** — platform-wide stats (users, tasks, completion rates), user moderation (deactivate or
delete abusive accounts), task moderation (delete fake listings), and category management.

**18 task categories**: Laundry, Barbing, Hair Styling, Cleaning, Graphic Design, Photography,
Videography, Coding, Assignment Typing, Private Tutor, Food Delivery, Errands, Laptop Repair, Phone
Repair, Printing, CV Writing, Event Ushering, Others.

---

## Documentation

- [`docs/API.md`](docs/API.md) — full REST API reference
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — table-by-table schema reference
- [`docs/ER_DIAGRAM.md`](docs/ER_DIAGRAM.md) — entity-relationship diagram (Mermaid)
- [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) — folder-by-folder breakdown and architectural
  notes
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deployment guide for various hosting targets

---

## Security notes

- Passwords are hashed with bcrypt (10 salt rounds) — never stored or logged in plain text.
- Authentication uses signed JWTs (`@fastify/jwt`); protected routes verify the token and re-fetch the
  user from the database on every request (so deactivated/deleted accounts are rejected immediately, not
  just when the token expires).
- All SQL access goes through parameterized queries via `better-sqlite3` prepared statements — no string
  concatenation, so SQL injection is not possible through the exposed API surface.
- User-supplied free text (task descriptions, bios, review comments, etc.) is stripped of HTML tags
  server-side before storage, and escaped again at render time on the front end, as defense-in-depth
  against stored XSS.
- Role-based access control is enforced server-side on every mutating endpoint (customers cannot accept
  their own applications, workers cannot post tasks, only admins can reach `/admin/*`, etc.) — the UI
  hiding certain actions is a convenience, not the security boundary.
- File uploads are restricted by MIME type and size (`UPLOAD_DIR`, `MAX_UPLOAD_SIZE_MB`), written with
  randomly generated filenames (no path traversal from user input).

---

## License

MIT — built as a learning project / MVP for Rivers State University students.

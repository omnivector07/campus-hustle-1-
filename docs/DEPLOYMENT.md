# Deployment Guide

Campus Hustle is a single Node.js process (Fastify) that also serves the static front end, backed by a
SQLite file. That makes it deployable almost anywhere that runs Node — no separate front-end build step,
no external database service required for the MVP stage.

## 1. Local development

```bash
npm install
cp .env.example .env      # edit values as needed (defaults work out of the box)
npm run dev                # runs migrate + seed, then starts the server with auto-reload
```

Visit `http://localhost:3000`. Demo accounts are printed in the terminal after seeding, and are also
listed in the main `README.md`.

## 2. Production build & run

There is no build step (vanilla JS front end, no bundler). To run in production mode:

```bash
npm install --omit=dev
cp .env.example .env
# edit .env: set NODE_ENV=production, a strong JWT_SECRET, real ADMIN_EMAIL/PASSWORD, etc.
npm start                  # runs migrate, then starts the server (no auto-reload, no seed)
```

Run `npm run seed` once manually if you want the demo/admin accounts in production — otherwise create
your admin account by inserting it directly, or by temporarily allowing a role of `admin` during signup
review.

**Important environment variables to change before going live:**

| Variable        | Why                                                                 |
|-----------------|------------------------------------------------------------------------|
| `JWT_SECRET`    | Must be a long, random, secret string — never reuse the example value. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Change before running `npm run seed` in production, or rotate immediately after. |
| `CORS_ORIGIN`   | Restrict to your real domain(s) instead of `*` once the front end has a fixed origin. |
| `DATABASE_PATH` | Point at a persistent disk/volume — see below.                         |

## 3. Persistent storage for SQLite

SQLite is a single file on disk. Any deployment target must provide a **persistent volume** for:

- `data/campus_hustle.db` (and its `-wal` / `-shm` sidecar files)
- `public/assets/uploads/profiles/` (uploaded profile pictures)

Ephemeral filesystems (e.g. containers without a mounted volume) will lose this data on every restart or
redeploy. Mount a persistent disk/volume at both paths, or point `DATABASE_PATH` and `UPLOAD_DIR` at a
mounted volume via environment variables.

## 4. Deploying to a Node-friendly PaaS (Railway, Render, Fly.io, etc.)

These platforms all support the same basic recipe:

1. Push the repository (excluding `node_modules`, `data/`, `.env` — already covered by `.gitignore`).
2. Set the build command to `npm install`.
3. Set the start command to `npm start`.
4. Attach a persistent volume and set `DATABASE_PATH` / `UPLOAD_DIR` to paths inside that volume
   (e.g. `/data/campus_hustle.db` and `/data/uploads/profiles`).
5. Set all variables from `.env.example` in the platform's environment variable UI.
6. Expose the port the app listens on (`PORT`, default `3000`) — most platforms inject their own `PORT`
   value automatically, which `src/config/config.js` already reads from `process.env.PORT`.

## 5. Deploying behind a reverse proxy (e.g. your own VPS with Nginx)

```bash
# On the server
git clone <your-repo>
cd campus-hustle
npm install --omit=dev
cp .env.example .env   # edit values
npm start
```

Use a process manager (`pm2`, `systemd`, or a Docker container with a restart policy) to keep the process
alive across crashes and reboots. Example `pm2` usage:

```bash
npm install -g pm2
pm2 start src/server.js --name campus-hustle
pm2 save
pm2 startup
```

Put Nginx (or Caddy) in front to handle TLS termination and forward to `http://127.0.0.1:3000`.

## 6. Database backups

Because everything lives in one SQLite file, backups are simple:

```bash
# Safe hot-copy of a WAL-mode SQLite database
sqlite3 data/campus_hustle.db ".backup 'backup_$(date +%F).db'"
```

Schedule this via cron (or your platform's scheduled jobs) and store backups off the same disk.

## 7. Scaling beyond a single campus (future phases)

The codebase is already structured to make this straightforward:

- **Multi-university support**: add a `universities` table and a `university_id` foreign key to `users`
  (and optionally `tasks`, for cross-campus visibility rules). The clean separation between
  models/services/controllers means this touches a small, well-defined set of files.
- **Swapping SQLite for Postgres**: because all database access goes through the `models/` layer using
  parameterized queries, migrating to `pg` or an ORM later only requires rewriting the model files —
  controllers, services, and routes are unaffected.
- **Payments (Paystack), messaging, push notifications, referrals, analytics**: each is additive —
  new tables, new model/service/controller/route files, following the same layered pattern already in
  place. The notification system (`notifications` table + `notificationService`) is already positioned to
  be extended into real-time (WebSocket) or push notifications without changing its call sites.

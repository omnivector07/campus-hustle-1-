# Project Structure

```
campus-hustle/
├── .env                          # Local environment config (git-ignored, created from .env.example)
├── .env.example                  # Template for required environment variables
├── .gitignore
├── package.json                  # Dependencies and npm scripts
├── package-lock.json
│
├── data/                         # SQLite database file lives here (git-ignored)
│   └── campus_hustle.db
│
├── docs/                         # Project documentation (this folder)
│   ├── API.md
│   ├── DATABASE_SCHEMA.md
│   ├── ER_DIAGRAM.md
│   ├── DEPLOYMENT.md
│   └── PROJECT_STRUCTURE.md
│
├── public/                       # Static front end (HTML / CSS / vanilla JS — no framework, no build step)
│   ├── index.html                # Landing page
│   ├── login.html
│   ├── signup.html
│   ├── dashboard-customer.html
│   ├── dashboard-worker.html
│   ├── dashboard-admin.html
│   ├── task-detail.html
│   ├── profile.html
│   ├── 404.html
│   ├── 500.html
│   ├── css/
│   │   ├── style.css             # Design tokens, landing page, auth pages, shared components
│   │   └── dashboard.css         # Sidebar layout, stat cards, task cards, tables
│   ├── js/
│   │   ├── api.js                # Shared API client, auth storage, toast/modal helpers (loaded everywhere)
│   │   ├── auth.js                # Login / signup form handling
│   │   ├── landing.js             # Landing page interactions
│   │   ├── dashboard-customer.js
│   │   ├── dashboard-worker.js
│   │   ├── dashboard-admin.js
│   │   ├── task-detail.js
│   │   └── profile.js
│   └── assets/
│       └── uploads/
│           └── profiles/         # Uploaded profile pictures (git-ignored, served statically)
│
└── src/                          # Backend (Fastify)
    ├── server.js                 # App entry point — registers plugins, routes, error handler
    │
    ├── config/
    │   ├── config.js              # Central environment variable loader
    │   └── database.js            # better-sqlite3 connection singleton
    │
    ├── database/
    │   ├── schema.sql             # Full table definitions
    │   ├── migrate.js             # Applies schema.sql (supports --force to reset)
    │   └── seed.js                # Seeds categories, admin account, demo users/task
    │
    ├── models/                    # Data-access layer (one file per table, thin wrappers over SQL)
    │   ├── User.js
    │   ├── Profile.js
    │   ├── Category.js
    │   ├── Task.js
    │   ├── Application.js
    │   ├── Review.js
    │   └── Notification.js
    │
    ├── services/                  # Business logic sitting between controllers and models
    │   ├── authService.js
    │   ├── taskService.js         # Task lifecycle: create/update/cancel/complete, apply/accept
    │   ├── applicationService.js
    │   └── notificationService.js
    │
    ├── controllers/               # Request handlers — parse input, call services/models, shape response
    │   ├── authController.js
    │   ├── userController.js
    │   ├── taskController.js
    │   ├── applicationController.js
    │   ├── reviewController.js
    │   ├── notificationController.js
    │   ├── categoryController.js
    │   └── adminController.js
    │
    ├── routes/                    # Route → controller wiring, with auth/role middleware attached
    │   ├── authRoutes.js
    │   ├── userRoutes.js
    │   ├── taskRoutes.js
    │   ├── applicationRoutes.js
    │   ├── reviewRoutes.js
    │   ├── notificationRoutes.js
    │   ├── categoryRoutes.js
    │   └── adminRoutes.js
    │
    ├── middleware/
    │   ├── auth.js                # JWT verification + role-based access control
    │   ├── errorHandler.js        # Global error → JSON response normalizer
    │   ├── validate.js            # Generic request body validation preHandler
    │   └── upload.js              # Profile picture upload handling (multipart)
    │
    └── utils/
        ├── jwt.js
        ├── password.js            # bcrypt hashing helpers
        ├── response.js            # sendSuccess / sendError envelope helpers
        └── validators.js          # Manual input validation + XSS-mitigating text sanitizer
```

## Architectural notes

- **Layered / clean architecture**: routes → controllers → services → models → database. Controllers never
  touch SQL directly; models never contain business rules; services own the rules that span multiple models
  (e.g. accepting an application also rejects other applicants and assigns the task in one flow).
- **Separation of concerns**: validation lives in `utils/validators.js` and is reused by both the
  `validateBody` middleware and, for update endpoints where partial validation is needed, directly inside
  controllers.
- **No framework on the front end**: pages are independent HTML documents sharing `css/style.css`,
  `css/dashboard.css`, and `js/api.js`. Each dashboard/page has its own small script file, keeping page logic
  isolated and easy to reason about without a build step.
- **Single source of truth for API calls**: every HTTP request to the backend goes through the `Api` object
  in `public/js/api.js`, so authentication headers, error handling, and response unwrapping are handled in
  exactly one place.

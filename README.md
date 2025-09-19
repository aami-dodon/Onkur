# 🌿 Onkur Platform Overview

[![CI](https://github.com/Onkur/Onkur/actions/workflows/ci.yml/badge.svg)](https://github.com/Onkur/Onkur/actions/workflows/ci.yml)

Onkur is a mobile-first volunteering platform rooted in sustainability and community stewardship. The product is rolling out in three phases that collectively deliver authentication, volunteer empowerment, and rich event management workflows. Each milestone builds on a green-themed, responsive foundation so that every role—from volunteers to sponsors—has a tailored experience on phones first and desktops second.

## 🚦 Phase roadmap

### Phase 1 – Foundation (Complete)

- Email + password signup, login, and logout backed by JWT auth with secure storage and revocation.
- Role-based dashboards for Volunteers, Event Managers, Sponsors, and Admins, guarded by role-aware routing.
- Admin tools to assign roles and manage the community directory while blocking unauthorized access.
- Earthy, mobile-first UI with sticky bottom navigation, a verdant header, and responsive layouts tested on small screens.
- CI/CD workflow that installs dependencies, runs linting + unit tests for auth, and validates frontend builds.

### Phase 2 – Volunteer Journey (Complete)

- Rich volunteer profile editor capturing skills, interests, location, and availability.
- Event discovery with filters for date, location, category, and theme plus duplicate-signup prevention and capacity checks.
- Event signup flow with confirmation + reminder emails, hours logging, and eco-badge thresholds (10/50/100 hours).
- Volunteer dashboard surfacing upcoming events, logged contributions, badges, and quick actions.
- Metrics tracking for conversion (views → signups), average volunteer hours, and retention.

### Phase 3 – Event Manager Workspace (Complete)

- Event manager dashboard to create, draft, publish, and complete events with full date/time and capacity controls.
- Task assignment surface so managers can allocate volunteers to event responsibilities and keep dashboards in sync.
- Attendance tooling for check-in/out that feeds volunteer hour totals automatically.
- Downloadable event reports summarizing signups, attendance percentage, and total volunteer hours.
- Notification suite for publish confirmations, assignment notices, reminders, and post-event acknowledgements.

### Phase 4 – Event Gallery (Complete)

- Mobile-first gallery grid with lightbox viewer backed by infinite scroll so visitors can relive event stories quickly.
- Volunteer and event manager upload flow with EXIF-stripped image processing, tag selection for volunteers/sponsors/communities, and moderation email notices.
- Admin moderation queue to approve or reject submissions, capturing decision latency metrics and sponsor mentions automatically.
- Public `/gallery` showcase that spotlights approved events, tracks per-event views, and celebrates tagged sponsors alongside community highlights.
- MinIO/S3-backed storage with graceful inline fallback plus transactional emails to notify contributors and sponsors when galleries go live.

### Phase 5 – Sponsor Partnerships (Complete)

- Sponsor registration and approval workflow that promotes verified organizations into the sponsor role.
- Sponsor dashboard to manage organization profiles, pledge funds or in-kind support, and review live sponsorships.
- Event and gallery experiences that surface approved sponsor logos and contributions for every supported event.
- Automated impact reports summarizing volunteer hours, gallery views, and ROI metrics delivered to sponsor inboxes.

### Phase 6 – Admin Oversight (Complete)

- Unified admin console that surfaces moderation queues for events, sponsors, and gallery media with bulk-ready workflows.
- Approval and rejection APIs that publish or return submissions to draft while capturing audit trails and notifying submitters.
- User management panel to adjust multi-role assignments and deactivate accounts without touching the database.
- Reporting overview with platform metrics plus one-click CSV/Excel exports for users, events, sponsorships, and media.
- Extended audit logging with before/after snapshots tied to each entity for transparent governance.

### Phase 7 – Impact & Community (Complete)

- Beneficiaries, volunteers, and sponsors can submit rich event stories that flow through admin moderation with automated approval/rejection emails.
- Approved impact stories surface alongside event galleries with sponsor highlights and community-friendly storytelling cards.
- Platform-wide analytics dashboard reveals volunteer hours, participation, gallery engagement, and sponsor impressions with CSV export support.
- Volunteer dashboards now feature community impact highlights so contributors see the ripple effect of their hours.

Consult the living [product wiki](docs/Wiki.md) for design rationale, API schemas, and rollout notes for each phase.

---

## 🚀 Getting started

### Backend (Express + Postgres)

1. Install dependencies
   ```bash
   cd backend
   npm install
   ```
2. Configure environment variables
   ```bash
   cp .env.example .env
   # edit .env with your secrets (DATABASE_URL, JWT_SECRET, etc.)
   ```
   Key variables:
   - `DATABASE_URL` – Postgres connection string.
   - `JWT_SECRET`, `JWT_EXPIRY`, `JWT_ISSUER` – JWT signing + expiry configuration.
   - `BCRYPT_SALT_ROUNDS` – bcrypt cost factor (defaults to 12).
   - `APP_BASE_URL` – canonical frontend URL used in transactional emails.
   - `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` – bootstrap credentials for the default admin account created at startup.
   - `EMAIL_FROM`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS` – SMTP settings for outbound email.
   - `CORS_ORIGIN`, `PORT`, `LOG_LEVEL`, `LOG_FILE` – server + logging controls.
   - `MINIO_*` – optional object storage wiring from the base template.
3. (Optional) verify connectivity
   ```bash
   npm run test:connections
   ```
4. Start the API
   ```bash
   npm run dev   # hot reload via nodemon
   # or
   npm start
   ```

### Frontend (Vite + React)

1. Install dependencies and configure the API origin
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   ```
   Set `VITE_API_BASE_URL` to your backend origin (e.g. `http://localhost:5000`).
   Set `VITE_ADMIN_EMAIL` to the support mailbox you want registrants to see after signup (comma-separated addresses are supported).
2. Launch the dev server
   ```bash
   npm run dev
   ```
   Visit `http://localhost:5173` to explore the mobile-first shell.

### Docker (optional)

Spin up both apps with shared hot reload:

```bash
docker compose up --build
```

- Backend: http://localhost:5000
- Frontend: http://localhost:3000 (proxying Vite on 5173)

---

## ✅ Testing & quality

Run the automated formatting, linting, tests, and production build locally before pushing:

```bash
# backend
cd backend
npm run format:check
npm run lint
npm test

# frontend
cd ../frontend
npm run format:check
npm run lint
npm run test
npm run build
```

These commands mirror the GitHub Actions workflow (`.github/workflows/ci.yml`) so pull requests stay green. Prettier guards consistent formatting, ESLint highlights common pitfalls, Vitest exercises the routing shell, and Jest protects the existing service contracts across the backend feature modules.

---

## 🧹 Repository hygiene & environment

- `.gitignore` now keeps `node_modules/`, build outputs, and log files out of commits. Reinstall dependencies with `npm install` in each workspace after cloning or pulling.
- Bootstrap environment variables quickly by copying the provided `.env.example` files in `backend/` and `frontend/` before starting servers or tests.
- The toolchain targets Node.js 20; matching that version keeps linting, testing, and build behavior consistent with CI.

## 🤝 Contributing & community

- Review the [CONTRIBUTING.md](CONTRIBUTING.md) guide for workflow conventions, required quality checks, and pull request tips.
- Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md); report concerns to the maintainers at conduct@onkur.example.
- Summaries of noteworthy changes belong in [docs/Wiki.md](docs/Wiki.md) so future contributors understand the why behind updates.

## 📄 License

The project is available under the [MIT License](LICENSE).

## 🧭 Architecture quick reference

- **Backend features** live under `backend/src/features/<feature-name>/`. Auth endpoints are defined in `auth.route.js`, volunteer flows under `volunteer-journey/`, and event tooling under `event-management/`.
- **Frontend features** live under `frontend/src/features/<feature-name>/`. Dedicated modules for auth, volunteer, and event manager experiences plug into the router and reuse the shared `AuthProvider` for session state.
- **Shared documentation**: the wiki captures stakeholder goals, color palette, data models, API reference, and roadmap milestones.

Stay grounded, build sustainably, and keep the forest thriving. 🌱

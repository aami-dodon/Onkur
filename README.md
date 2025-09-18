# 🌿 Onkur Platform Overview

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
Run the test suite and production build locally before pushing:

```bash
# backend
cd backend
npm test

# frontend
cd ../frontend
npm run build
```

The GitHub Actions pipeline (`.github/workflows/ci.yml`) mirrors these steps to keep the main branch healthy.

---

## 🧭 Architecture quick reference
- **Backend features** live under `backend/src/features/<feature-name>/`. Auth endpoints are defined in `auth.route.js`, volunteer flows under `volunteer-journey/`, and event tooling under `event-management/`.
- **Frontend features** live under `frontend/src/features/<feature-name>/`. Dedicated modules for auth, volunteer, and event manager experiences plug into the router and reuse the shared `AuthProvider` for session state.
- **Shared documentation**: the wiki captures stakeholder goals, color palette, data models, API reference, and roadmap milestones.

Stay grounded, build sustainably, and keep the forest thriving. 🌱

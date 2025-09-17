# 🌿 Onkur – Phase 1 Foundation

Onkur is a mobile-first volunteering platform rooted in sustainability and community. Phase 1 lays the technical backbone: secure authentication, role-aware access, and a responsive shell that welcomes every stakeholder.

## ✨ Phase 1 highlights
- Email + password signup/login backed by JWTs, email verification, and server-side token revocation.
- Role-based dashboards for Volunteers, Event Managers, Sponsors, and Admins.
- Admin console to assign roles and browse the community directory.
- Earthy, mobile-first UI with a sticky bottom nav, verdant header, and warm onboarding copy.
- Automated Jest tests for the auth service and a CI workflow that runs backend tests + frontend builds on every push.

Dive into the [product wiki](docs/wiki/README.md) for full design notes, API details, and future milestones.

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
- **Backend features** live under `backend/src/features/<feature-name>/`. Auth endpoints are defined in `auth.route.js` and associated service/repository files.
- **Frontend features** live under `frontend/src/features/<feature-name>/`. The `AuthProvider` manages session state and the dashboard components render role-specific shells.
- **Shared documentation**: the wiki captures stakeholder goals, color palette, data models, API descriptions, and future roadmap items.

Stay grounded, build sustainably, and keep the forest thriving. 🌱

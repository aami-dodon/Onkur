# 📘 PERN Template Wiki

Use this wiki as a hands-on companion to the main README. It now also serves as the product brief for **Onkur**, the mobile-first volunteering platform we are building on top of the template.

## Onkur Product Overview

### Theme: Nature · Sustainability · Community

Onkur is a mobile-first volunteering platform built to inspire environmental and social action. Rooted in the values of nature, sustainability, and community, it connects volunteers, event managers, sponsors, and administrators in one ecosystem. The platform emphasizes visual storytelling through event galleries, transparent tracking of impact, and meaningful recognition for all stakeholders.

### Stakeholders & Roles

#### Volunteers
- Build profiles (skills, interests, availability).
- Discover and register for events.
- Track logged hours, eco-badges, and certificates.
- Share photos/testimonials from events.

#### Admins
- Oversee platform operations and user roles.
- Approve or reject event proposals and sponsorships.
- Moderate event galleries and user-generated content.
- Generate detailed reports (volunteer hours, sponsor visibility, impact).

#### Event Managers
- Create, edit, and publish events.
- Assign volunteer tasks and track attendance.
- Upload and curate event galleries with pictures.
- Submit outcome reports to admins and sponsors.

#### Sponsors
- Provide financial or in-kind support.
- Gain visibility (logos, mentions in galleries, featured in reports).
- Access detailed sponsor impact reports.

#### Beneficiaries / Communities (Optional)
- Represent groups or organizations receiving support.
- Stories/testimonials highlighted in event galleries and reports.

### Functional Requirements
- **User Management:** Registration, login, profiles, role-based dashboards.
- **Event Management:** Creation, volunteer sign-up, attendance tracking.
- **Event Gallery:** Upload photos with captions, mobile-first gallery, tagging.
- **Volunteer Tracking:** Hours logged, eco-badges, certificates.
- **Sponsorship Visibility:** Logos, recognition in galleries, sponsor reports.
- **Communication:** Email notifications only (no SMS).
- **Reports & Analytics:** Volunteer stats, gallery engagement, sponsor ROI, event outcomes.

### Non-Functional Requirements
- **Mobile-First:** Optimized for phones first, responsive for desktop.
- **Design Aesthetic:** Earthy green palette, intuitive UI.
- **Scalability:** Support for growth in users/events/galleries.
- **Security:** Encrypted, GDPR-compliant data.

### Success Metrics
- Active volunteers & completed events.
- Gallery engagement (views, uploads, shares).
- Hours logged & certificates issued.
- Sponsor retention & satisfaction.
- Positive measurable community/environmental impact.

### User Flows
- **Volunteer:** Register → Create profile → Browse events → Sign up (email confirmation) → Attend → Participation tracked → Optionally upload testimonials → Track hours/badges/certificates.
- **Admin:** Log in → Review registrations → Approve/reject events → Moderate galleries → Approve/review sponsorships → Generate reports.
- **Event Manager:** Apply/register (admin approval) → Create event → Publish → Volunteers sign up → Track attendance → Upload gallery → Submit summary report.
- **Sponsor:** Register (admin approval) → Browse events → Sponsor with funds/in-kind → Gain visibility → Access impact reports.
- **Beneficiary (Optional):** Request support → Manager organizes event → Event delivered → Beneficiary story/testimonial → Impact showcased.

### Design Elements

**Color Palette**
- Primary Green: `#2F855A` (earthy green).
- Secondary Green: `#68D391` (leaf green).
- Earth Brown: `#8B5E3C`.
- Sky Blue: `#38B2AC`.
- Neutral Beige: `#F7FAF5`.
- Accent Yellow: `#ECC94B`.

**Typography**
- Headings: Poppins / Nunito.
- Body: Open Sans / Inter.

**Imagery**
- Real community/nature photos, natural light.
- Flat minimal line icons with eco motifs.

**Components**
- Rounded buttons, green primary, white text.
- Cards: white, rounded corners, soft shadows.
- Eco badges/icons: leaf, sun, sprout.
- Event Gallery: grid layout, captions in beige overlay.

**Mobile First**
- Sticky bottom navigation (Home · Events · Gallery · Profile).
- Large tap targets, accessible contrast.

**Tone**
- Warm, approachable, community-driven.
- Breathing space in UI.

## Contents
- [Phase 1 – Foundation](#phase-1--foundation)
  - [Highlights](#highlights)
  - [Backend services](#backend-services)
  - [Frontend experience](#frontend-experience)
  - [Metrics & auditing](#metrics--auditing)
  - [Environment keys](#environment-keys)
- [Phase 2 – Volunteer Journey](#phase-2--volunteer-journey)
  - [Highlights](#phase-2-highlights)
  - [Backend APIs](#backend-apis)
  - [Data model updates](#data-model-updates)
  - [Email flows](#email-flows)
  - [Frontend experience](#phase-2-frontend-experience)
  - [Testing & observability](#testing--observability)
- [Project conventions](#project-conventions)
- [Environment setup](#environment-setup)
- [Local development workflow](#local-development-workflow)
- [End-to-end example: Notes feature](#end-to-end-example-notes-feature)
- [Docker usage](#docker-usage)
- [Troubleshooting checklist](#troubleshooting-checklist)

## Phase 1 – Foundation

### Highlights
- Email + password authentication with mandatory email verification, JWT session tokens, and secure logout revocation.
- Role-based access controls for **Volunteer**, **Event Manager**, **Sponsor**, and **Admin** with dedicated dashboard shells.
- Mobile-first layout with the earthy green palette, sticky bottom navigation, and welcoming auth flows.
- Admin operations center to assign roles and review the active community directory.

### Backend services
- **Data models**
  - `users`: `id (UUID)`, `name`, `email`, `email_normalized`, `password_hash`, `role`, `created_at`, `email_verified_at`.
  - `audit_logs`: `id`, `actor_id`, `action`, `metadata (JSONB)`, `created_at`.
  - `revoked_tokens`: `id`, `jti`, `expires_at` (used to invalidate JWTs during logout).
  - `email_verification_tokens`: `id`, `user_id`, `token`, `expires_at`, `used_at`, `created_at`.
- **Authentication pipeline**
  - Passwords hashed with bcrypt (`BCRYPT_SALT_ROUNDS` configurable).
  - Signup queues an email verification token and requires confirmation before login succeeds.
  - JWTs signed with `JWT_SECRET`, include `sub`, `role`, and `jti` claims, and expire per `JWT_EXPIRY`.
  - Logout revokes the token `jti` server-side to prevent reuse.
- **API surface** (all routes prefixed with `/api`)
  - `POST /auth/signup` – create a volunteer account, send the verification email, and return `{ user, requiresEmailVerification, message }`.
  - `POST /auth/login` – authenticate existing users and return the same payload shape as signup once verified.
  - `POST /auth/logout` – revoke the active token (Authorization bearer required).
  - `POST /auth/verify-email` – confirm a verification token and unlock login.
  - `GET /me` – fetch the profile for the authenticated caller.
  - `GET /users` – admin-only directory of all accounts.
  - `PATCH /users/:id/role` – admin-only role reassignment.
  - `GET /auth/roles` – public list of supported roles for UI pickers.
- **Audit logging** records `auth.signup`, `auth.login.success`, `auth.login.failure`, `auth.logout`, and `auth.role.change` events for traceability.

### Frontend experience
- Global **AuthProvider** wraps the app, persists JWT metadata in `localStorage`, and refreshes the profile via `/api/me` on load.
- **Auth screens** mirror the warm Onkur tone with stacked fields, clear copy, and cross-links between login and signup.
- **Dashboards**
  - Volunteer: impact tracker placeholders, upcoming commitments, and storytelling guidance.
  - Event Manager: pipeline, volunteer coordination, and gallery management stubs.
  - Sponsor: sponsorship visibility, recognition toolkit, and impact report shells.
  - Admin: authentication metrics snapshot, role assignment form, and community directory table.
- **Layout**
  - Sticky bottom navigation (Home, Events, Gallery, Profile) optimized for touch devices.
  - Verdant header featuring the Onkur brand, user badge, and quick logout.

### Metrics & auditing
- The admin dashboard surfaces day-zero placeholders for signups, login success, and error rates—future phases will wire real analytics to these cards.
- Audit logs capture every auth transition so we can derive signups/day, login success vs. failure, and auth error rates downstream.

### Environment keys
- Backend (`backend/.env.example`)
  - `DATABASE_URL` – Postgres connection string.
  - `JWT_SECRET`, `JWT_EXPIRY`, `JWT_ISSUER` – JWT configuration.
  - `BCRYPT_SALT_ROUNDS` – hashing cost factor.
  - `APP_BASE_URL` – canonical frontend URL used in transactional emails.
  - `EMAIL_FROM`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS` – SMTP credentials for transactional email.
  - `CORS_ORIGIN`, `PORT`, logging, and MinIO fields remain from the template.
- Frontend (`frontend/.env.example`)
  - `VITE_API_BASE_URL` – origin for API requests (defaults to `http://localhost:5000`).

## Project conventions
- **Backend features** live in `backend/src/features/<feature-name>/`. Each HTTP surface area exports an Express router from a file that ends with `.route.js`. The auto-loader in `backend/src/routes/index.js` mounts routers automatically using the optional `basePath` export.
- **Frontend features** live in `frontend/src/features/<feature-name>/`. Build components that encapsulate view + data fetching logic and import them into `App.jsx` or your routing layer.
- **Shared utilities** belong in `backend/src/utils/` or `backend/src/features/common/` to keep core bootstrapping files unchanged for future updates.
- **Configuration** is centralized under `backend/src/config/` and `.env` files. Add new variables to `backend/.env.example` and document them in this wiki or the README.

## Environment setup
1. Install [Node.js 18+](https://nodejs.org/) which ships with npm.
2. Provision PostgreSQL and MinIO instances. Locally you can reuse Docker Hub images such as `postgres:16` and `minio/minio`.
3. Copy environment templates and adjust them to match your infrastructure:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
4. Update **backend** `.env` with values for `DATABASE_URL`, `MINIO_*`, `PORT`, `CORS_ORIGIN`, `LOG_LEVEL`, and optional `LOG_FILE`.
5. Update **frontend** `.env` with `VITE_API_BASE_URL` that points to your backend (for example `http://localhost:5000`).

## Local development workflow
1. **Install dependencies**
   ```bash
   (cd backend && npm install)
   (cd frontend && npm install)
   ```
2. **Smoke test infrastructure (optional but recommended)**
   ```bash
   cd backend
   npm run test:connections   # runs test:db and test:minio sequentially
   ```
   These scripts hit PostgreSQL and MinIO using the connection information from `.env` and log through the shared Winston logger.
3. **Start the backend**
   ```bash
   cd backend
   npm run dev               # starts nodemon on src/server.js
   ```
4. **Start the frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Vite serves the React app at `http://localhost:5173` and proxies API calls to the backend defined in `VITE_API_BASE_URL`.

## End-to-end example: Notes feature
Follow this walkthrough to add a simple "notes" feature spanning both the API and the React client. It demonstrates how the folder structure keeps changes scoped to feature modules.

### 1. Prepare the database
Create a `notes` table with a few sample rows in PostgreSQL. From a `psql` session connected to your database:
```sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL
);

INSERT INTO notes (title, body)
VALUES
  ('First note', 'Rendered from the new template walkthrough.'),
  ('Second note', 'Feel free to remove these once your own data exists.');
```

### 2. Backend feature module
1. Create a new folder: `backend/src/features/notes/`.
2. Inside it, add `notes.route.js` with the following router (the auto-loader will mount it at `/api/notes` because of the `basePath` export):
   ```js
   const express = require("express");
   const pool = require("../common/db");
   const logger = require("../../utils/logger");

   const router = express.Router();

   router.get("/", async (req, res) => {
     try {
       const result = await pool.query("SELECT id, title, body FROM notes ORDER BY id ASC");
       logger.info("Fetched notes", { count: result.rowCount });
       res.json(result.rows);
     } catch (error) {
       logger.error("Failed to fetch notes", { error: error.message });
       res.status(500).json({ error: "Failed to load notes" });
     }
   });

   module.exports = {
     basePath: "/api/notes",
     router,
   };
   ```
3. Restart the backend dev server if it was running. You should see a log similar to `Registered router from notes/notes.route.js at base path '/api/notes'.`
4. Validate the API by calling it directly:
   ```bash
   curl http://localhost:5000/api/notes
   ```
   The response should be the seed rows you inserted earlier.

### 3. Frontend feature module
1. Create `frontend/src/features/notes/NotesList.jsx`:
   ```jsx
   import { useEffect, useState } from 'react';

   const API_BASE = import.meta.env.VITE_API_BASE_URL;

   export default function NotesList() {
     const [notes, setNotes] = useState([]);
     const [error, setError] = useState(null);

     useEffect(() => {
       fetch(`${API_BASE}/api/notes`)
         .then((res) => {
           if (!res.ok) throw new Error(`Request failed: ${res.status}`);
           return res.json();
         })
         .then(setNotes)
         .catch(setError);
     }, []);

     if (error) {
       return <p style={{ color: 'red' }}>Unable to load notes: {error.message}</p>;
     }

     return (
       <section>
         <h2>Notes</h2>
         <ul>
           {notes.map((note) => (
             <li key={note.id}>
               <strong>{note.title}</strong>
               <p>{note.body}</p>
             </li>
           ))}
         </ul>
       </section>
     );
   }
   ```
2. Import the component inside `frontend/src/App.jsx` alongside the existing `HealthCheck` widget:
   ```jsx
   import NotesList from './features/notes/NotesList';

   function App() {
     return (
       <div style={{ fontFamily: 'sans-serif', padding: 32 }}>
         <h1>PERN Frontend</h1>
         <HealthCheck />
         <NotesList />
       </div>
     );
   }
   ```
3. With both dev servers running, visit `http://localhost:5173` and confirm the Notes list renders beneath the health check block.

### 4. Production readiness checks
- Run `npm run build` inside `frontend/` to ensure the new UI compiles.
- Consider adding automated tests (e.g. Jest for backend, Vitest/React Testing Library for frontend) once the feature grows.

## Phase 2 – Volunteer Journey

### Phase 2 Highlights
- Volunteers can create and update skill, interest, availability, and location details from the in-app profile editor.
- Published events can be browsed with filters for category, location, theme, and date while respecting capacity and duplicate signup rules.
- Signups trigger templated confirmation emails and schedule a 24-hour reminder as events approach.
- Volunteers log minutes per event, unlocking Seedling (10h), Grove Guardian (50h), and Forest Champion (100h) eco badges.
- The refreshed dashboard surfaces upcoming activities, recent participation, and impact metrics in a mobile-first layout.

### Backend APIs
- `GET /api/me/profile` and `PUT /api/me/profile` manage volunteer profile data.
- `GET /api/events` lists published events with filter support and registration status.
- `POST /api/events/:id/signup` enforces capacity, prevents duplicates, and records participation.
- `GET /api/me/signups` returns the volunteer’s event commitments.
- `POST /api/events/:id/hours` logs minutes against an event signup.
- `GET /api/me/hours` aggregates totals, entries, and badge progress.
- `GET /api/me/dashboard` combines profile, activity, and achievement data for the volunteer home view.

### Data model updates
- `volunteer_profiles` stores normalized arrays for skills and interests plus availability, location, and bio metadata.
- `events` gains support for themes, status management, and timestamp columns to drive discovery and reminders.
- `event_signups` tracks reminder delivery times alongside capacity-safe registration rows.
- `volunteer_hours` records minutes, notes, and optional verification metadata per volunteer/event pairing.

### Email flows
- Signup confirmations use the shared Nodemailer transport; the scheduler (15-minute interval) sends reminders exactly 24 hours before event start.
- Reminder dispatch respects `NODE_ENV=test` to remain inert inside Jest.

### Phase 2 Frontend Experience
- The volunteer dashboard now loads profile, signups, hours, badges, and events in one pass with optimistic refresh helpers.
- Profile editing, event discovery, and hours logging components surface inline success/error states and mobile-first forms.
- Badges and recent hour entries visualize progress using the earthy Onkur palette.

### Testing & observability
- Added `volunteerJourney.service.test.js` powered by `pg-mem` to cover profile updates, event signup constraints, and badge unlock logic.
- Reminder scheduling and email dispatch leverage shared logger hooks for auditing outcomes.
- Run `npm test` inside `backend/` and `npm run build` inside `frontend/` to confirm volunteer flows and UI bundles stay health
  y after changes.

## Docker usage
You can spin up both servers with Docker once your `.env` files are configured:
```bash
docker compose up --build
```
- The backend listens on `http://localhost:5001` (mapped from container port `5000`).
- The frontend listens on `http://localhost:3000` (mapped from container port `5173`).
- Hot reloading is enabled by mounting the repository into each container.

## Troubleshooting checklist
- **Missing routers?** Ensure the file ends with `.route.js` and exports either the router directly or an object with `{ router, basePath }`.
- **CORS issues?** Confirm `CORS_ORIGIN` in `backend/.env` matches the frontend origin (for Vite dev this is usually `http://localhost:5173`).
- **Connection errors?** Run `npm run test:db` and `npm run test:minio` for quick diagnostics and double-check credentials.
- **Frontend cannot reach backend?** Verify `VITE_API_BASE_URL` points at the backend port (use `http://localhost:5000` when running both locally outside Docker, or `http://localhost:5001` when using `docker compose`).

Happy building! 🎉

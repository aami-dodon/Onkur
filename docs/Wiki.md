# Onkur Change Log

## Desktop navigation parity
- **Date:** 2025-09-18
- **Change:** Introduced a desktop header navigation that mirrors the mobile bottom menu, centralized the navigation config, and wired menu items to new `/app/events`, `/app/gallery`, and `/app/profile` routes.
- **Impact:** Authenticated users can now move between dashboard sections on both mobile and desktop, with dedicated views for events, gallery spotlights, and profile management.

## Volunteer dashboard API routing fix
- **Date:** 2025-09-18
- **Change:** Updated the volunteer journey router to register its endpoints relative to the `/api` base path so that dashboard requests such as `/api/me/dashboard` resolve correctly after login.
- **Impact:** Volunteers can now load their dashboard without receiving the generic "Request failed" error because the routes map to the expected URLs.

## Phase 3 event manager workflows
- **Date:** 2025-09-19
- **Change:** Introduced a dedicated event management feature set: managers can draft, update, publish, and complete events; define task boards; assign registered volunteers; process attendance with automatic hour logging; and generate shareable CSV impact reports. The frontend dashboard now surfaces a full workspace for these flows.
- **Impact:** Event managers can coordinate end-to-end logistics from the dashboard while volunteers immediately see published events, their assignments, and updated hours when checked in on site.


## README roadmap refresh
- **Date:** 2025-09-20
- **Change:** Expanded the public README to reflect the completed three-phase rollout, covering volunteer profiles, discovery, event management, and supporting tooling while pointing to the canonical wiki file.
- **Impact:** Stakeholders and contributors now have an at-a-glance summary of Onkur's Phase 1–3 capabilities without diving into internal docs.

## Role-aware registration and directories
- **Date:** 2025-09-20
- **Change:** Expanded signup to let new members pick multiple roles (volunteer, event manager, sponsor) via accessible checkboxes, persisted through a new `user_roles` join table. Admin tooling now edits multi-role assignments, and all auth responses expose a normalized `roles` array alongside the primary role.
- **Impact:** Members can express every way they want to contribute from day one, and admin workflows stay in sync with richer role data across the platform.
## Branded email foundation
- **Date:** 2025-09-21
- **Change:** Refreshed the Nodemailer service with a reusable Onkur theme that injects a responsive CSS layout, standardized the `[Onkur]` subject prefix, and added a `npm run send:test-email` utility for verifying SMTP credentials via the new template.
- **Impact:** Contributors have a modern baseline for transactional emails and a simple script to confirm delivery without duplicating setup work.
## Admin bootstrap configuration
- **Date:** 2025-09-21
- **Change:** Added startup logic that seeds a default admin account whenever `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are provided. The bootstrapper promotes existing records to the ADMIN role or creates a verified admin using the configured credentials.
- **Impact:** Deployments now guarantee an ADMIN user without manual SQL, ensuring future admin-only features have an account ready for use.

## Unified multi-role dashboard priority
- **Date:** 2025-09-22
- **Change:** Centralized role-priority helpers on the backend and dashboard so users holding multiple roles always expose a deterministic `primaryRole`, ensuring dashboards, galleries, and profiles tailor their intros correctly while preserving all role badges.
- **Impact:** Members who are simultaneously volunteers, event managers, and sponsors now see the full toolset without losing access to any experience, and administrators reuse a single helper when adjusting role order.

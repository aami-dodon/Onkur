# Onkur Change Log

## Free-text locations with shared suggestions
- **Date:** 2025-09-24
- **Change:** Relaxed location handling across volunteer profiles, discovery filters, and event management so coordinators and volunteers can enter any city or region while still seeing curated suggestions. The backend now trims and title-cases known catalogue entries without forcing slugs, and browsing filters compare both human text and slug variants so older events continue to match.
- **Impact:** Profiles and events no longer reject unfamiliar cities, enabling outreach in new regions while keeping shared suggestions handy for quick entry. Search filters remain reliable for legacy slugged data and new free-text values alike.

## Shared profile & event reference data
- **Date:** 2025-09-23
- **Change:** Introduced a centralized reference data service that exposes curated skills, interests, availability presets, and supported cities to both the backend and dashboard UIs. Volunteer profiles now use guided multi-selects with add-your-own options for skills and interests plus single-select availability and location pickers, while event managers pick cities from the same list. Events and profiles persist the canonical slugs and the catalogue is available through a new `/api/reference-data` endpoint.
- **Impact:** Coordinators and volunteers see consistent language when matching opportunities. Location and availability inputs are validated against the shared catalogue, preventing typos and ensuring filters align with event metadata.

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


## Email verification handoff improvements
- **Date:** 2025-09-22
- **Change:** The signup API now returns the configured admin contact address alongside the verification prompt, and the frontend guides new members to a dedicated "Check your email" screen that preserves their address, explains the confirmation step, and surfaces the admin email for support.
- **Impact:** Fresh registrants immediately understand that email verification is required before logging in and know how to reach an administrator if the confirmation message does not arrive.

## Configurable verification support contact
- **Date:** 2025-09-22
- **Change:** Centralized the admin support email so both the API and post-signup UX read from environment variables (`ADMIN_EMAIL` and `VITE_ADMIN_EMAIL`), trimming and formatting comma-separated addresses for display.
- **Impact:** Operations teams can change the contact mailbox without redeploying code, and registrants always see the up-to-date support email after signing up.
## Unified multi-role dashboard priority
- **Date:** 2025-09-22
- **Change:** Centralized role-priority helpers on the backend and dashboard so users holding multiple roles always expose a deterministic `primaryRole`, ensuring dashboards, galleries, and profiles tailor their intros correctly while preserving all role badges.
- **Impact:** Members who are simultaneously volunteers, event managers, and sponsors now see the full toolset without losing access to any experience, and administrators reuse a single helper when adjusting role order.
## Volunteer home focuses on commitments
- **Date:** 2025-09-22
- **Change:** Removed the in-dashboard profile editor for volunteers and expanded the upcoming commitments card to span the dashboard width so all roles treat profile updates through the dedicated profile page.
- **Impact:** Volunteers manage their profiles from the Profile menu while the dashboard highlights schedules and logged impact without split attention.

## Volunteer dashboard event discovery removal
- **Date:** 2025-09-22
- **Change:** Retired the "Discover new events" panel from the volunteer home view so the dashboard centers on commitments and impact tracking while directing discovery traffic to the dedicated events hub.
- **Impact:** Volunteers see a streamlined home focused on what they’ve scheduled and accomplished, using the events hub when they’re ready to browse new opportunities.

## Profile completion reminder on volunteer home
- **Date:** 2025-09-23
- **Change:** Added a volunteer dashboard call-to-action that surfaces when profile data is incomplete, showing percent completion, highlighting missing sections, and linking directly to the profile editor.
- **Impact:** Volunteers understand why finishing their profile matters and can jump straight to the editor, helping event managers match the right people to upcoming opportunities.

## Role-aware profile completion prompts
- **Date:** 2025-09-23
- **Change:** Extended the profile completion call-to-action to event manager and sponsor dashboards, centralizing the UI so each role reuses the same visual pattern while customizing motivational copy.
- **Impact:** Coordinators and partners now receive tailored encouragement to complete their profiles, improving trust with volunteers and giving the team better context for recognition efforts.

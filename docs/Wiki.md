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

## Sponsor & manager profile CTA data fix
- **Date:** 2025-09-23
- **Change:** Updated the auth service to include volunteer profile payloads in public user responses so sponsor and event manager dashboards can measure completion progress immediately after login.
- **Impact:** Non-volunteer roles now see the profile completion prompts that were previously scoped to volunteers, keeping the cross-role guidance consistent.

## Lookup-driven profile editor
- **Date:** 2025-09-24
- **Change:** Replaced free-form profile fields with curated lookup selectors for skills, interests, availability, and location. The backend now seeds Indian-centric reference data for these lookups, exposes authenticated endpoints to fetch cascaded state/city lists, and persists selections alongside optional custom skills or interests.
- **Impact:** Volunteers and other members update their profiles faster with consistent terminology, coordinators can filter against normalized data, and deployments automatically receive the seeded options without manual database scripts.

## Profile editor primary action buttons
- **Date:** 2025-09-25
- **Change:** Promoted the custom skill and interest buttons on the volunteer profile editor to use the primary button style and documented the expectation in the volunteer frontend guidelines.
- **Impact:** The calls-to-action to add new skills or interests now stand out visually, guiding members to enrich their profiles without hunting for the controls.


## Event manager lookup-driven event logging
- **Date:** 2025-09-26
- **Change:** Event drafting now relies on reference data: categories persist to a new `event_categories` table, state/city fields reference the Indian lookup tables, an `isOnline` flag drives mode-specific validation, and optional skill/interest/availability arrays capture ideal volunteers. The manager workspace fetches these lookups, offers inline category creation, and reshapes the form/UI to surface online mode and location chips.
- **Impact:** Managers log events with consistent taxonomy, can flag virtual sessions, and share richer expectations with volunteers without duplicating reference data or free-form text.

## Hours logging requires event participation
- **Date:** 2025-09-25
- **Change:** Updated the volunteer hours tracker to hide the logging form when a volunteer has not joined any events, replacing it with guidance to explore the events hub. Documented the pattern in the volunteer frontend guidelines.
- **Impact:** Volunteers understand they must RSVP to an event before logging time and are directed to the appropriate place to do so, preventing empty submissions.

## Volunteer events CTA width refinement
- **Date:** 2025-09-25
- **Change:** Adjusted the volunteer hours tracker events hub link to use a self-starting primary button so the CTA renders at its standard width instead of stretching across the card. Added the expectation to the volunteer frontend guidelines.
- **Impact:** Volunteers see a tidy guidance card that matches other dashboard buttons while still drawing attention to the events hub when they need to join an opportunity before logging hours.

## Event launch outreach automation
- **Date:** 2025-09-26
- **Change:** Event creation now schedules branded emails to every volunteer and sponsor in the background, tailoring the message, CTA, and impact notes when their profile skills, interests, availability, or location align with the opportunity.
- **Impact:** Event managers publish without waiting on email dispatch while volunteers and sponsors receive timely, personalized nudges that highlight why the event matters to them.

## Idempotent event lookup constraints
- **Date:** 2025-09-27
- **Change:** Hardened the volunteer journey bootstrapper to check for foreign key constraints before adding them to the `events` table so schema setup can run multiple times without raising duplicate constraint errors.
- **Impact:** Local development and container restarts no longer crash during startup when the lookup seeding runs after the schema has already been upgraded.

## Event creation placeholder alignment
- **Date:** 2025-09-27
- **Change:** Fixed the event creation repository insert statement to provide parameter placeholders for every column so the database receives the required availability and creator values alongside the draft status default.
- **Impact:** Event managers can save drafts without encountering the "INSERT has more target columns than expressions" error.


## Manager notifications on volunteer signups
- **Date:** 2025-09-28
- **Change:** Updated the volunteer signup service to look up an event's manager and send them a branded notification email whenever a volunteer registers, while preserving the primary confirmation flow if the manager email fails.
- **Impact:** Event managers now receive timely awareness of new volunteers joining their events, letting them review rosters and plan assignments without monitoring the dashboard constantly.

## Volunteer event departures reset impact
- **Date:** 2025-09-28
- **Change:** Added a `DELETE /api/events/:eventId/signup` endpoint that uses a transactional `cancelEventSignup` helper to remove assignments, attendance, and logged hours before emailing the event manager via the branded template. The volunteer dashboard and events hub now surface "Leave event" actions with inline feedback and refresh all summary panels after success.
- **Impact:** Volunteers can bow out of commitments at any time, their impact totals drop to zero for that event, and managers receive immediate notice to rebalance coverage.

## Phase 4 gallery storytelling
- **Date:** 2025-09-29
- **Change:** Introduced an end-to-end event gallery system: uploads pass through a moderated pipeline with EXIF-stripping image processing, MinIO/S3 storage, role-aware tagging, sponsor/community notifications, public `/gallery` browsing, infinite-scroll viewing, and an admin moderation queue. Dashboard gallery tooling now lets participants submit photos, review approved stories, and admins oversee queues.
- **Impact:** Onkur can showcase event impact through rich, mobile-first visuals. Volunteers and managers highlight participants and sponsors, admins guard quality, sponsors are alerted when featured, and visitors explore live galleries with quick load times.


## Event gallery runtime compatibility
- **Date:** 2025-09-29
- **Change:** Updated the gallery upload service to lazy-load the `file-type` detector through an ES module import so Node 20 resolves the dependency without triggering the "No exports main defined" error during startup.
- **Impact:** Backend containers boot cleanly again, keeping gallery moderation, uploads, and notifications online for admins and event teams.


## Mobile header compaction
- **Date:** 2025-09-30
- **Change:** Slimmed the authenticated dashboard header with tighter spacing, hid the subtitle on mobile, and relocated the logout action to the sticky bottom navigation.
- **Impact:** Mobile users regain vertical space for content while still accessing logout from the persistent footer, and desktop retains the prominent logout control.


## Earthy brown branding refresh
- **Date:** 2025-09-30
- **Change:** Recolored the shared Tailwind palette and home page theme styles to center on earthy browns and ambers, updating gradients, shadows, and button treatments to match the new direction.
- **Impact:** The web experience now carries a cohesive warm visual identity that aligns with the refreshed Onkur brand guidelines without disrupting existing layout structure.



## Phase 5 sponsor partnerships
- **Date:** 2025-10-01
- **Change:** Introduced the sponsor workflow end to end: sponsors apply for approval, admins moderate applications, approved sponsors pledge funds or in-kind support to events, and dashboards surface live sponsorships with ROI-ready metrics and impact reports.
- **Impact:** Sponsors gain a dedicated workspace to support events, see their logos across event and gallery experiences, and receive automated summaries of volunteer hours, attendance, and gallery visibility tied to their contributions.


## Sponsor event discovery guardrails
- **Date:** 2025-10-02
- **Change:** Hardened the shared event discovery component to treat sponsor metadata as optional, guarding array access and action handlers so the volunteer and sponsor dashboards no longer crash when the API omits sponsorship details.
- **Impact:** Event lists now render reliably for every role, giving sponsors and volunteers uninterrupted access to filters, signups, and pledge actions even while data loads or profiles await approval.


## GTmetrix bundle optimizations
- **Date:** 2025-10-02
- **Change:** Swapped top-level routes and dashboard surfaces to `React.lazy` + Suspense fallbacks so React Router pages load on demand, and tuned `vite.config.js` to leverage Terser minification, drop console/debugger statements, and emit manual vendor chunks for React and router packages.
- **Impact:** Initial page loads download smaller JavaScript payloads while subsequent navigation streams feature-specific code, aligning the dashboard with GTmetrix recommendations for minification, unused code removal, and bundle splitting.


## Rocket Loader preload credential alignment
- **Date:** 2025-10-02
- **Change:** Added a Vite HTML transform that injects `crossorigin="anonymous"` on the dev client preload and entry module scripts while updating `index.html` to mark the root bundle with the same attribute.
- **Impact:** Cloudflare Rocket Loader now reuses the preload for `@vite/client` without warning about credential mode mismatches, keeping browser consoles clean during development.

## CSS delivery optimizations
- **Date:** 2025-10-03
- **Change:** Moved Google Font loading from a CSS `@import` into `<link>` tags within `index.html` and introduced cssnano into the PostCSS pipeline so production builds ship minified stylesheets.
- **Impact:** The dashboard avoids render-blocking stylesheet imports while trimming roughly 2KB from the compiled CSS bundle, improving page load performance.


## Phase 6 admin oversight
- **Date:** 2025-10-03
- **Change:** Delivered the admin operations console with consolidated moderation queues (events, sponsors, galleries), approval/rejection APIs that emit audit logs, volunteer/user deactivation controls, cross-role reporting with CSV/Excel exports, and manager notifications on event decisions.
- **Impact:** Admins can now govern the entire ecosystem from one responsive dashboard, track turnaround metrics, and share dataset exports with stakeholders while every decision is captured for transparency.



# Volunteer Journey Feature Guidelines

These instructions apply to files within `backend/src/features/volunteer-journey/`.

- Keep data-access logic inside `volunteerJourney.repository.js`; service files should orchestrate validation, domain rules, and messaging.
- Reuse helpers for array sanitization so profile fields remain lowercase-trimmed without duplicates.
- When adding new badge thresholds, update both the badge catalogue in the service and the volunteer wiki documentation.
- Ensure new queries remain friendly to the in-memory `pg-mem` test harness (avoid Postgres-only syntax outside common SQL).
- Keep reminder scheduler changes behind the `NODE_ENV!=='test'` guard. When adjusting intervals, ensure timers call `unref()` so background jobs do not block Node process shutdown.
- When adding or updating routes, remember the router mounts at `/api`; define paths like `/me/profile` rather than duplicating the prefix.
- When expanding profile metadata, keep the lookup seeding in `profile.bootstrap.js` in sync so startups continue to populate reference data without manual SQL.
- Keep schema bootstrap logic idempotent—check for existing constraints and indexes before adding them so repeated server starts do not crash.
- Event signup flows must notify event managers via `sendTemplatedEmail` when an event has a creator, but failures should be logged and never block the volunteer confirmation.

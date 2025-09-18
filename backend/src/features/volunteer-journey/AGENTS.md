# Volunteer Journey Feature Guidelines

These instructions apply to files within `backend/src/features/volunteer-journey/`.

- Keep data-access logic inside `volunteerJourney.repository.js`; service files should orchestrate validation, domain rules, and messaging.
- Reuse helpers for array sanitization so profile fields remain lowercase-trimmed without duplicates.
- Keep the profile option catalog in sync: update `DEFAULT_PROFILE_OPTIONS` and the state list together when adjusting presets.
- When adding new badge thresholds, update both the badge catalogue in the service and the volunteer wiki documentation.
- Ensure new queries remain friendly to the in-memory `pg-mem` test harness (avoid Postgres-only syntax outside common SQL).
- Keep reminder scheduler changes behind the `NODE_ENV!=='test'` guard. When adjusting intervals, ensure timers call `unref()` so background jobs do not block Node process shutdown.
- When adding or updating routes, remember the router mounts at `/api`; define paths like `/me/profile` rather than duplicating the prefix.

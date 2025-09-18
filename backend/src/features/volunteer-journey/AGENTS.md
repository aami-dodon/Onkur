# Volunteer Journey Feature Guidelines

These instructions apply to files within `backend/src/features/volunteer-journey/`.

- Keep data-access logic inside `volunteerJourney.repository.js`; service files should orchestrate validation, domain rules, and messaging.
- Reuse helpers for array sanitization so profile fields remain lowercase-trimmed without duplicates.
- When adding new badge thresholds, update both the badge catalogue in the service and the volunteer wiki documentation.
- Ensure new queries remain friendly to the in-memory `pg-mem` test harness (avoid Postgres-only syntax outside common SQL).
- Keep reminder scheduler changes behind the `NODE_ENV!=='test'` guard. When adjusting intervals, ensure timers call `unref()` s
  o background jobs do not block Node process shutdown.

# Impact Feature Backend Guidelines

These instructions apply to files within `backend/src/features/impact/`.

- Keep story approval workflows in the service layer so routes stay thin and focused on validation plus response shaping.
- Normalize story status values to the uppercase enum (`PENDING`, `APPROVED`, `REJECTED`) before persisting or comparing.
- Record analytics mutations through the repository helpers so the `analytics_daily` table stays the single source of truth for trend data.
- When notifying authors or sponsors, invoke `sendTemplatedEmail` and swallow failures with a `logger.warn` entry so primary requests still succeed.
- Keep analytics usage rollups summing `value` totals (not row counts) and extend `backend/tests/impact.service.test.js` alongside any major impact-service changes.

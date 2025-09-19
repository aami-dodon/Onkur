# Event Management Backend Guidelines

These instructions apply to files within `backend/src/features/event-management/`.

- Keep business logic in the service layer and limit route handlers to validation, auth wiring, and response shaping.
- Repository functions should accept a database client when transactional work is required; expose helpers that open/close
  connections internally for simple operations.
- When emitting emails, reuse the shared `sendTemplatedEmail` helper and guard failures so that the primary request still
  succeeds while logging the error.
- Prefer ISO 8601 strings in API responses; convert database timestamps using `toISOString()` before returning them.
- Keep event metadata normalized: categories live in `event_categories` and locations reference the Indian state/city tables,
  so persist both the lookup value and any human-readable label when adjusting schemas or business rules.

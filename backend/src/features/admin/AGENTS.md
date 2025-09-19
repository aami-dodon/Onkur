# Admin Backend Guidelines

These notes apply to files within `backend/src/features/admin/`.

- Keep moderation queue fetching in the repository and let the service compose responses, logging, and notifications.
- Reuse existing feature services (events, sponsors, gallery, auth) where possible instead of duplicating email or status logic.
- All administrative mutations must record audit logs that capture `before`/`after` payloads and identify the entity acted upon.
- Export helpers for data exports from the service layer so routes stay focused on validation and streaming responses.

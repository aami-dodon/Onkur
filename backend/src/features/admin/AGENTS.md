# Admin Feature Guidelines

These notes apply to files within `backend/src/features/admin/`.

- Keep moderation and reporting logic inside the service layer; route handlers should be limited to validation and response shaping.
- Reuse repository helpers from other features when updating entity state so that existing business rules (emails, metrics) stay consistent.
- Every admin action must emit an audit log with `entityType`, `entityId`, and before/after snapshots that omit sensitive fields like password hashes.
- Prefer returning lightweight summaries to the API client—leave heavy exports to the CSV helpers so the JSON responses stay fast on mobile networks.
- Use the shared Winston logger for notable moderation outcomes or export generation failures.
- When extending exports, keep the CSV and Excel builders in sync and ensure the service reports the correct MIME type/extension so the frontend can parse filenames from the `Content-Disposition` header.

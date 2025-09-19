# Event Gallery Backend Guidelines

These notes apply to files within `backend/src/features/event-gallery/`.

- Keep media moderation logic in the service layer so routes stay focused on validation and response shaping.
- Sanitize and validate upload inputs in the service before persisting them; repositories should assume normalized payloads.
- Whenever storage access is optional, log structured warnings via the shared logger so deployments can diagnose missing buckets without breaking uploads.
- Always derive public media URLs from the current MinIO/S3 config using the shared helper so host or protocol changes roll out to existing records automatically.

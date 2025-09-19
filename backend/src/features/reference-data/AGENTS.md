# Reference Data Feature Guidelines

These instructions apply to files within `backend/src/features/reference-data/`.

- Keep shared option lists (skills, interests, locations, availability) normalized as objects with `{ value, label }` pairs so that UIs can present human friendly text while the API stores canonical slugs. Locations act as suggestions only—sanitize free-text city inputs but do not reject values that fall outside the catalogue.
- When expanding the catalogue, update both the constants and any helper that validates or formats the new entries to avoid drifting business rules.
- Expose new helpers via the service module instead of importing constants directly from other features so validation stays centralized.

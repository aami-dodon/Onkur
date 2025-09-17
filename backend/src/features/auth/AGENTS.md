# Auth Feature Guidelines

These notes cover files within `backend/src/features/auth/`.

- Keep the authentication flow lightweight and functional-first; business logic should live in `auth.service.js` and database queries in `auth.repository.js`.
- Validation helpers can stay inside the route file as long as they remain small; extract them if they grow beyond a few checks.
- Prefer structured audit metadata objects that can be serialized to JSON without circular references.
- Whenever you add a new token type, document it in `docs/wiki/README.md` and extend the revoke helpers instead of creating new tables.

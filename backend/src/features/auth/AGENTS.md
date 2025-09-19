# Auth Feature Guidelines

These notes cover files within `backend/src/features/auth/`.

- Keep the authentication flow lightweight and functional-first; business logic should live in `auth.service.js` and database queries in `auth.repository.js`.
- Validation helpers can stay inside the route file as long as they remain small; extract them if they grow beyond a few checks.
- Prefer structured audit metadata objects that can be serialized to JSON without circular references.
- When you extend audit logging, default missing metadata to an empty object (`{}`) so inserts respect the database `NOT NULL`
  constraint on the `metadata` column.
- Whenever you add a new token type, document it in `docs/wiki/README.md` and extend the revoke helpers instead of creating new tables.
- User records now maintain a primary `role` plus an expanded `user_roles` join table; always update both via the repository helpers so API responses expose a normalized `roles` array.
- The admin bootstrapper seeds or promotes an ADMIN account from environment variables; prefer updating `admin.bootstrap.js` when adjusting default admin behavior.
- Shared role ordering logic now lives in `role.helpers.js`; reuse those helpers whenever you need to normalize, sort, or compare user roles.
- Public auth responses should provide the volunteer profile payload by way of `toPublicUserWithProfile` so dashboards can render completion prompts consistently across roles.

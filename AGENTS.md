# Contributor Playbook

These instructions apply to the entire repository unless a nested `AGENTS.md` overrides them.

## Documentation expectations

- Keep `README.md`, `.env.example` files, and the wiki in sync when you add or remove configuration options.
- Prefer adding new guides under `docs/wiki/` when workflow explanations exceed a few paragraphs; cross-link them from the README.

## Backend changes (`backend/`)

- Add new APIs as feature modules under `backend/src/features/<feature-name>/` and export Express routers from files ending in `.route.js`.
- Avoid editing `src/app.js`, `src/server.js`, or `src/routes/index.js` unless you are improving the framework itself; feature work should plug in through the auto-loader.
- Use the shared Winston logger from `backend/src/utils/logger.js` for all logs and include structured metadata where it adds clarity.
- Update `backend/.env.example` whenever a backend environment variable is introduced or renamed.
- When feasible, run `npm run test:connections` from the `backend` directory to verify database and MinIO connectivity after making integration changes.

## Frontend changes (`frontend/`)

- Group related UI pieces under `frontend/src/features/<feature-name>/` and prefer feature-level components over editing `App.jsx` directly.
- Ensure new API calls read `import.meta.env.VITE_API_BASE_URL` for the backend origin.
- Run `npm run build` from the `frontend` directory to validate that the Vite build still succeeds after making frontend changes.
- Preserve the `/app` HTML rewrite middleware in `vite.config.js` so that deep links like `/app/events` continue to resolve when the dev server is accessed directly.
- When adding new top-level routes, prefer `React.lazy` with a shared suspense fallback so bundle splitting stays effective for GTmetrix performance budgets.

## Tooling

- Do not commit environment secrets or generated assets under `dist/` or `build/`.
- Use meaningful logging and inline comments sparingly—favor self-documenting code and keep this template lightweight.
- Run the automated quality commands before pushing: `npm run lint` + `npm test` in `backend/` and `npm run lint`, `npm run test`,
  and `npm run build` in `frontend/`. The CI pipeline enforces these checks along with Prettier formatting guards.
- Leave `node_modules/` out of commits; dependency directories now live in `.gitignore` and should be recreated with `npm install`.

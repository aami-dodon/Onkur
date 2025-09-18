# Dashboard Feature Guidelines

These notes apply to files within `frontend/src/features/dashboard/`.

- Prefer deriving role-aware UI states through `roleUtils.js` so sponsor, event manager, and volunteer experiences stay in sync when members hold multiple roles.
- Keep dashboard routes declarative; export simple React components and let `DashboardRouter` determine which variant to render.

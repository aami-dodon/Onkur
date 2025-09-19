# Dashboard Feature Guidelines

These notes apply to files within `frontend/src/features/dashboard/`.

- Prefer deriving role-aware UI states through `roleUtils.js` so sponsor, event manager, and volunteer experiences stay in sync when members hold multiple roles.
- Keep dashboard routes declarative; export simple React components and let `DashboardRouter` determine which variant to render.
- The volunteer landing view should focus on commitments and impact summaries; surface profile editing only via the dedicated profile page and keep the commitments card full-width for consistency across roles.
- Do not reintroduce event discovery feeds on the volunteer dashboard; direct volunteers to the dedicated events hub for browsing opportunities.
- Keep the profile completion call-to-action lightweight and motivational; only surface it when the dashboard API reports missing profile fields and link the button to `/app/profile`.
- Use the shared `ProfileCompletionCallout` component alongside `profileProgress` helpers so every role stays visually consistent while tailoring their motivation copy.
- Upcoming commitment cards should offer leave actions with inline success/error copy while continuing to refresh dashboard, signups, and hours summaries through the shared helpers.

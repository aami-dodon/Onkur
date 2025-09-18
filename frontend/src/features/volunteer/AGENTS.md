# Volunteer Frontend Guidelines

These notes apply to files under `frontend/src/features/volunteer/`.

- Keep components mobile-first: stack sections vertically and rely on responsive utilities for wider breakpoints.
- Prefer colocated hooks/helpers in the same folder rather than reaching into shared libs unless the logic is reused elsewhere.
- Surfaces that mutate backend data should display inline success and error states rather than relying on alerts.
- When wiring new flows into the dashboard, reuse the shared refresh helpers so profile, signup, and hours panels stay in sync a
  fter mutations.

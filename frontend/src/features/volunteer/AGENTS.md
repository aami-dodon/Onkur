# Volunteer Frontend Guidelines

These notes apply to files under `frontend/src/features/volunteer/`.

- Keep components mobile-first: stack sections vertically and rely on responsive utilities for wider breakpoints.
- Prefer colocated hooks/helpers in the same folder rather than reaching into shared libs unless the logic is reused elsewhere.
- Surfaces that mutate backend data should display inline success and error states rather than relying on alerts.
- When wiring new flows into the dashboard, reuse the shared refresh helpers so profile, signup, and hours panels stay in sync after mutations.
- The profile editor relies on lookup APIs for skills, interests, availability, and location; extend those selectors instead of reverting to free-form inputs so members benefit from the curated choices.
- Use `btn-primary` for forward actions that add or save volunteer profile data so the calls-to-action stand out.
- Hours logging UI should hide mutation forms when there are no eligible events and instead guide volunteers to join an event first.
- When surfacing guidance CTAs (like the events hub link), apply `self-start` alongside `btn-primary` so the button keeps its standard width instead of stretching edge-to-edge.
- Provide "Leave event" affordances alongside signup actions, keep them styled as bordered secondary buttons, and surface inline feedback that clears when new data loads.

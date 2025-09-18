# Event Manager Frontend Guidelines

These notes apply to files within `frontend/src/features/event-manager/`.

- Keep interactions optimistic where reasonable: update local state first, then reconcile with API responses.
- Favor lightweight composable components; prefer colocated hooks for data fetching tied to this feature instead of global state.
- Forms should be mobile-first with stacked inputs and accessible labels; use inline status badges for success/error feedback.
- When surfacing metrics, accompany numeric values with short descriptive labels for clarity on small screens.

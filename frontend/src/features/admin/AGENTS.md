# Admin Frontend Guidelines

These notes apply to files within `frontend/src/features/admin/`.

- Centralize admin API calls inside hooks or utilities so the dashboard surface stays declarative.
- Keep moderation lists and tables scrollable on smaller screens while preserving readable column headers.
- Reuse shared dashboard components (cards, badges, buttons) to maintain visual consistency across the console.
- Surface audit-impacting actions with clear labels and confirmation affordances when appropriate.

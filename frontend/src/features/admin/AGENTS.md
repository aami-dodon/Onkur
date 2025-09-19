# Admin Frontend Guidelines

These instructions apply to files within `frontend/src/features/admin/`.

- Compose the admin experience from small presentational components that receive data and callbacks as props; keep async logic in hooks or the top-level dashboard.
- Use the shared `apiClient` for JSON requests and fall back to the Fetch API directly when downloading CSV files so headers can stay configurable.
- Keep layouts responsive by relying on CSS grid or flex utilities—verify mobile breakpoints around 360px wide still render readable queues.
- Surface moderation errors inline near the triggering control rather than using `alert()` so the dashboard remains accessible.
- Whenever you expose an export action, disable the trigger while the request is in flight to prevent duplicate downloads.
- Keep export controls paired with a shared format selector so CSV and Excel toggles stay in sync across datasets.

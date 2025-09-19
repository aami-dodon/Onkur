# Sponsor Feature Backend Guidelines

These instructions apply to files within `backend/src/features/sponsors/`.

- Keep sponsorship workflow logic in the service layer so routes remain focused on validation, auth, and shaping responses.
- Normalize sponsor and sponsorship statuses to the uppercase enum values (`PENDING`, `APPROVED`, `DECLINED`) before persisting or comparing.
- When computing impact reports, rely on existing event metrics tables (`event_reports`, `event_gallery_metrics`) before issuing fresh aggregate queries.
- Email notifications must flow through `sendTemplatedEmail` and log soft failures with the shared Winston logger without aborting the primary request.

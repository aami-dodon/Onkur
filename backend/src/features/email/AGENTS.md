# Email Feature Guidelines

These conventions apply to files within `backend/src/features/email/`.

- Always construct outbound subjects through `sendEmail` so the `[Onkur]` prefix is applied automatically. Avoid hard-coding the prefix elsewhere.
- Use `renderStandardTemplate` (or helpers built on it) for transactional email markup. Keep updates theme-driven and responsive.
- When adding new scripts or tests that dispatch emails, prefer `sendTemplatedEmail` unless plain-text payloads are required for diagnostics.

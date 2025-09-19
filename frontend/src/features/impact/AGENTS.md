# Impact Frontend Guidelines

These instructions apply to files within `frontend/src/features/impact/`.

- Keep story submission components mobile-first with stacked layouts and avoid modal-only entry points so beneficiaries on low-width devices can contribute easily.
- Reuse the earthy brand tokens (`text-brand-forest`, `bg-brand-sand`, `text-brand-muted`) for badges, headings, and supporting copy.
- Surface optimistic success copy after submissions while keeping error text inline and concise.
- Delegate network calls to the colocated `impactApi` helpers so UI components stay presentation-focused.

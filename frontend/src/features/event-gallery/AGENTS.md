# Event Gallery Frontend Guidelines

These notes apply to files within `frontend/src/features/event-gallery/`.

- Keep uploads optimistic by surfacing inline status and avoid blocking the UI while awaiting moderation responses.
- Implement infinite scrolling with an `IntersectionObserver` sentinel so galleries stay performant on mobile devices.
- Reuse the shared earthy branding tokens (`text-brand-forest`, `text-brand-green`, `bg-brand-sand`) for chips and lightbox chrome to stay on theme.

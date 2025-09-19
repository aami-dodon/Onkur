# Landing Page Guidelines

These notes cover files under `frontend/src/features/landing/`.

- Keep the home experience eagerly loaded from `App.jsx` so first-time visitors avoid Suspense fallbacks that delay Largest Contentful Paint.
- When adding imagery to the hero, prefer responsive assets with explicit dimensions and `loading="eager"` for above-the-fold media to protect LCP.
- Document any UX or performance changes that impact the public marketing funnel in `docs/Wiki.md`.

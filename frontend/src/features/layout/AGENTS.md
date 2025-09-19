# Layout Components Guidelines

These notes apply to files within `frontend/src/features/layout/`.

- Keep shared navigation data in `navConfig.js` so the desktop and mobile menus stay synchronized.
- When updating header or navigation spacing, verify both mobile (bottom navigation) and desktop (header navigation) breakpoints remain accessible.
- Prefer declarative `Link` components from `react-router-dom` over `button` elements for navigation interactions.
- The mobile bottom navigation hosts the logout action; keep the dedicated button accessible and visually balanced alongside the nav items when adjusting the bar.
- Preserve the nested `Suspense` boundary in `AppLayout` so route transitions continue to surface the shared `LoadingScreen` feedback inside the layout shell.

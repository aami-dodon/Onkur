# Frontend Auth Guidelines

These notes apply to components within `frontend/src/features/auth/`.

- Keep authentication state inside `AuthContext`; UI components should call the exposed hooks instead of managing tokens directly.
- Forms should remain mobile-first with stacked fields and accessible labels.
- When introducing additional auth flows (e.g. reset password), update the wiki to describe the UX and API touchpoints.

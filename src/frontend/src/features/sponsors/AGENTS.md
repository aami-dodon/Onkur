# Sponsors Feature Frontend Guidelines

These notes apply to files within `frontend/src/features/sponsors/`.

- Keep sponsor workflows mobile-first and rely on the shared earthy brown palette—reuse dashboard card shells where possible.
- API helpers in this folder should wrap `apiRequest` and always return parsed JSON objects without mutating global auth state.
- Dialogs or forms should lean on lightweight `useState` hooks; avoid bringing in modal libraries so the bundle stays lean.
- When presenting impact metrics, favour succinct labels ("Volunteer hours", "Gallery views") and format numbers for Indian locales.
- Always expose an `isSubmitting` prop on forms so buttons can reflect loading states during async sponsor mutations.

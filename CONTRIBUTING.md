# Contributing to Onkur

We welcome contributions that help communities thrive sustainably. This guide captures the essential steps to get started and to keep pull requests easy to review.

## 🧭 Before you start
- Review the [Code of Conduct](CODE_OF_CONDUCT.md) so every interaction stays respectful and inclusive.
- Skim [`docs/Wiki.md`](docs/Wiki.md) for recent platform changes and historical context.
- Read the relevant [`AGENTS.md`](AGENTS.md) files inside the area you plan to touch—they describe architecture expectations and feature-level conventions.

## 💻 Local setup
1. Fork the repository and clone your fork.
2. Create a feature branch locally.
3. Install dependencies:
   ```bash
   cd src/backend && npm install
   cd ../frontend && npm install
   ```
4. Configure environment files from the provided `.env.example` templates before running services.

## ✅ Required checks
- `npm run lint` and `npm test` from `src/backend`
- `npm run lint` and `npm run build` from `src/frontend`

These commands match the automated GitHub Actions workflow in `.github/workflows/ci.yml`.

## 🧪 Writing tests
- Prefer colocating unit tests under `tests/backend` using Jest and `pg-mem` for database isolation.
- Use descriptive test names that explain the behavior being verified.
- When adding new environment variables or config toggles, update the relevant `.env.example` files.

## 📦 Submitting changes
1. Commit with clear, imperative messages (e.g., `Add lint workflow for backend`).
2. Push to your fork and open a pull request against `main`.
3. Fill out the PR template, summarizing what changed, how it was tested, and any follow-up work.
4. Update `docs/Wiki.md` with context for significant changes so future contributors can trace decisions quickly.

Thank you for helping Onkur cultivate sustainable communities! 🌱

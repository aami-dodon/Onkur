# Contributing to Onkur

Thanks for helping nurture the Onkur platform! This guide covers the basics for setting up your environment and submitting quality contributions.

## Getting started

1. **Fork and clone** the repository.
2. Create a feature branch from `main`.
3. Install dependencies:
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`
4. Copy the environment templates and adjust them for your setup:
   - Backend: `cp backend/.env.example backend/.env`
   - Frontend: `cp frontend/.env.example frontend/.env`

## Development workflow

- Keep backend feature code within `backend/src/features/<feature-name>/` and frontend work within `frontend/src/features/<feature-name>/` to preserve the modular structure described in `AGENTS.md`.
- Document meaningful changes in `docs/Wiki.md` so future contributors understand the rationale.
- Update any affected `.env.example`, README instructions, or wiki guides when you add configuration toggles.

## Quality checks

Before opening a pull request, run the automated checks locally:

```bash
# Backend
cd backend
npm run format:check
npm run lint
npm test

# Frontend
cd ../frontend
npm run format:check
npm run lint
npm run test
npm run build
```

The GitHub Actions pipeline runs the same commands on every push and pull request.

## Commit & PR guidelines

- Write descriptive commit messages that explain the why and the what.
- Keep pull requests focused; smaller, reviewable PRs are easier to merge quickly.
- Include screenshots or screen recordings for noticeable UI changes.
- Note any follow-up work or known limitations in the PR description.

## Community expectations

Be kind, inclusive, and respectful. Please review our [Code of Conduct](CODE_OF_CONDUCT.md) to understand the shared standards for everyone who interacts with the project.

Happy contributing! 🌿

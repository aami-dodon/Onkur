# Onkur Change Log

## Volunteer dashboard API routing fix
- **Date:** 2025-09-18
- **Change:** Updated the volunteer journey router to register its endpoints relative to the `/api` base path so that dashboard requests such as `/api/me/dashboard` resolve correctly after login.
- **Impact:** Volunteers can now load their dashboard without receiving the generic "Request failed" error because the routes map to the expected URLs.

## Volunteer profile form modernization
- **Date:** 2025-09-19
- **Change:** Revamped the volunteer profile API and editor to support curated catalogs for skills, interests, availability slots, Indian states, and city suggestions with the ability to contribute new skills, interests, and cities.
- **Impact:** Coordinators can now filter volunteers using structured availability, state, and location data while volunteers enjoy a modernized multi-select interface that keeps the option lists in sync.

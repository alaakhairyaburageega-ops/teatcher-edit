# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- **Fixed:** Commented out route protection logic in `teacher-app.js` and `admin-auditor.js` that was redirecting users to a non-existent `launchpad/index.html` file due to missing auth tokens in the UI-only mock environment.
- **Added:** Initialized `RULES.md`, `CHANGELOG.md`, and `ADR.md` files as per manager's instructions to ensure clean code tracking and decision logging.

# Bug Tracker & Error Log (BUGS.md)

This file tracks all bugs, runtime errors, logic errors, and build failures encountered during the project.

## Format
For each bug, record:
- **Date & Time:**
- **Issue Description:** (What failed? e.g., Build error, UI bug, Logic flaw)
- **Root Cause:** (Why did it happen?)
- **Solution / Fix:** (How was it resolved?)
- **Reason for Solution:** (Why was this specific solution chosen?)
- **Status:** [Open] / [Resolved]

---
- **Date & Time:** 2026-08-28
- **Issue Description:** Both Teacher and Admin pages are not showing up (White blank page / Cannot GET error). When opening the page via Live Server, it immediately redirects the user to `/launchpad/index.html` which does not exist in this isolated frontend environment.
- **Root Cause:** The JavaScript files (`teacher-app.js` and `admin-auditor.js`) contained an authentication check (Route Protection) in their `init()` functions that looked for a token in `sessionStorage`. Since the frontend is disconnected from the backend (no login mechanism), the token was missing, triggering the redirect to a non-existent login page.
- **Solution / Fix:** Commented out the redirect logic (`window.location.href`) inside the `init()` function of both `teacher-app.js` and `admin-auditor.js`.
- **Reason for Solution:** As per the `README_FOR_ENGINEER.md`, this is a pure UI/UX mockup task without a backend. Bypassing the auth check allows us to work directly on the interfaces using mock data without needing real authentication tokens.
- **Status:** [Resolved]
---

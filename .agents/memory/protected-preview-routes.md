---
name: Protected preview routes
description: A workflow quirk affecting visual verification of authenticated pages
---

Authenticated routes can redirect to the public landing page when captured through an isolated preview session, even while the app's normal browser session is authenticated.

**Why:** Visual verification can otherwise appear to show the wrong page and lead to unnecessary route or auth changes.

**How to apply:** Use the running workflow and browser logs to confirm the app is healthy, and treat a redirected protected-route screenshot as an auth-session limitation rather than a page-rendering failure.
---
name: Auth name fallbacks
description: Rules for resolving an authenticated user’s visible name across Firebase Auth, profile data, and membership data.
---

Email-shaped values from membership or profile fallback helpers must never replace a valid Firebase Auth display name or saved profile name in the shared user state.

**Why:** Membership resolution can return the login email when a profile name is incomplete, and merging that value into global auth state makes the dashboard and sidebar visibly regress to the email.

**How to apply:** Prefer saved profile first/last names, then a non-email Firebase Auth display name, and only use an email-derived value when no person name exists.
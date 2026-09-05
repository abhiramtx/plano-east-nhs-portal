---
name: Firebase mobile redirects
description: The mobile Google authentication flow depends on completing Firebase's pending redirect after returning to the app.
---

Mobile Google sign-in must persist auth locally before calling the redirect flow and consume the pending redirect result during app initialization before relying on the auth-state listener.

**Why:** Mobile Safari can return to the app without an authenticated `currentUser` unless Firebase's pending redirect credential is explicitly resolved.

**How to apply:** Keep the redirect-result handling centralized in Firebase initialization, and keep initialization idempotent so multiple React mounts do not register competing auth flows.
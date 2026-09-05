---
name: Firebase mobile redirects
description: The mobile Google authentication flow depends on completing Firebase's pending redirect after returning to the app.
---

Do not use Firebase redirect-based Google authentication from Replit's changing development domains on iOS Safari. Use a popup opened directly from the user's click, without awaiting other work first.

**Why:** The app origin and Firebase auth handler use different domains. Safari can block or partition the cross-site storage Firebase needs to recover redirect state, leaving the user signed out after returning to the landing page.

**How to apply:** Keep popup creation as the first asynchronous browser action in the sign-in click handler. For a future stable custom domain, redirect auth would require a same-origin Firebase auth handler setup.
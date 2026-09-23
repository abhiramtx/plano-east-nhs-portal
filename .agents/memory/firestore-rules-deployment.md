---
name: Firestore rules deployment
description: IAM distinction between Firebase Admin data access and Firestore Security Rules publishing.
---

A Firebase service account can authenticate the Admin SDK and read/write Firestore data while still lacking permission to publish Firestore Security Rules. Ruleset creation may succeed, but release activation requires the `firebaserules.releases.create` permission.

**Why:** Admin data access and Firebase Rules release management are separate IAM capabilities; a successful server query does not prove the app's browser rules are deployed.

**How to apply:** Test browser SDK access with an authenticated client token, not only Admin SDK endpoints. If release activation is denied, publish the validated rules file in Firebase Console or grant the deployment identity the appropriate Firebase Rules release role before declaring the client flow fixed.
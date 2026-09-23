---
name: Firestore database mode
description: Firebase SDK compatibility and initialization requirements for this app's Firestore database.
---

The app's Firebase Web SDK and Firebase Admin SDK require a Firestore Native-mode database. A MongoDB-compatibility database may accept service-account authentication but native Firestore queries can fail with `NOT_FOUND`. Native mode cannot be switched onto an existing database after creation; use a Native database and configure a named database ID when it is not `(default)`.

**Why:** The project uses Firebase Auth plus Firestore client/Admin APIs throughout the volunteer and admin flows, rather than the MongoDB wire protocol.

**How to apply:** When connecting a Firebase project, verify the database's operation mode before debugging credentials. Use `VITE_FIREBASE_DATABASE_ID` and `FIREBASE_DATABASE_ID` together for a named Native database; leave both unset for `(default)`. A new Native database starts empty and needs the single club record initialized before authenticated users can enter the dashboard.
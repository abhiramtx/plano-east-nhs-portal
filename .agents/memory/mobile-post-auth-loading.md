---
name: Mobile post-auth loading
description: Mobile browsers can make a secondary Firestore membership read look stalled even when authentication has completed.
---

Do not block the entire authenticated app on the active-club lookup. Let the club selector render its own loading state and resolve membership data independently.

**Why:** A delayed or partitioned mobile Firestore read can leave the user on a full-screen spinner for a long time even though Firebase authentication already succeeded.

**How to apply:** Keep auth completion and club resolution as separate states. Resolve legacy profile documents by normalized email variants, fetch multiple clubs in parallel, and surface query errors instead of silently presenting an empty membership list.
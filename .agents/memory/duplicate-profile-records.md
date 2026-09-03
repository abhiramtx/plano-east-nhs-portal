---
name: Duplicate profile records
description: The profile store can contain dotted-email and comma-form documents for the same user.
---

Treat profile documents keyed by dotted and comma-form email variants as one logical profile.

**Why:** Membership creation and the profile editor can write different identifier forms. Reading whichever document Firestore returns first can discard populated first/last names and personal email in favor of an account-email-only record.

**How to apply:** Normalize email keys before grouping profile records, merge non-empty fields across duplicates, and use the merged profile for member names, contact details, leaderboards, maps, and submissions.
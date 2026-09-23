---
name: Firestore read hotspots
description: Performance rules for approval workflows and other user-visible Firebase read patterns.
---

Do not poll an entire submissions collection on a short interval when the UI only needs pending work. Use a pending-only query for assignment discovery and real-time listeners for the currently active user or record.

**Why:** A five-second full-collection poll multiplies every stored document by 12 reads per minute for each open admin session.

**How to apply:** Keep assignment discovery on a slow refresh or event-driven trigger, and scope queries by status/user/club wherever the screen does not need the full collection.
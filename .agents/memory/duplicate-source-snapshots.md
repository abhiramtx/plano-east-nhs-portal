---
name: Duplicate source snapshots
description: A workspace snapshot may contain an exact second copy of a source file, creating misleading redeclaration errors.
---

When a build reports many duplicate declarations across one source file, compare the file's first and second halves before debugging application code. If they are exact duplicates, remove only the appended copy and then rerun the build.

**Why:** The workspace can contain an accidentally appended duplicate of a complete source file. This makes the first useful symptom look like dozens of unrelated type or export failures.

**How to apply:** Use read-only line counts, hashes, or a `diff` between halves to confirm duplication. Treat the duplicate removal as snapshot cleanup, separate from the feature change.
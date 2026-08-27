---
name: EXIF parser runtime checks
description: Runtime distinction between exifr browser uploads and Node-side test inputs.
---

The exifr browser bundle reads native File/Blob inputs through FileReader, while its Node-side reader accepts byte buffers and rejects Node's File implementation.

**Why:** A Node-only smoke test can report unavailable metadata even when the browser upload path is correct.

**How to apply:** For EXIF regression checks, use a browser-equivalent FileReader/Blob environment or a real browser bundle; use raw byte buffers only for parser-level checks.
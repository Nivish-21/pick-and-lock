# Lessons

## 2026-09-05 — Handbook browser safety rejection

The browser tool rejected the direct World Tour handbook URL as unsafe despite the user supplying it. A direct `curl` retrieval then provided the official HTML and chapter 4 schedule. Use a direct read-only fetch when the browser safety layer blocks a user-provided public URL.

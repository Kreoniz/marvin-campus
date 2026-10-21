# Mobile group headers — 2026-10-21

Production: <https://campus.kreoniz.ru>.
Application revision: `319fd0610f52fa7b266cbaa4da5dee06d8b8fb05`.
Image: `marvin-campus:2026-10-21-mobile-headers-1`.
Runtime image ID:
`sha256:d7ea637b827d0b800c38e24026d6b4e770bb56e97d69550a7da2979a0803f597`.

The mobile day view now aligns group headings with their fixed calendar columns.
Headings previously inherited the cards' three-pixel inset and six-pixel gap.
They now use the full column width and the same right border as the grid below.
Lesson positions and widths are unchanged.

This release also includes the previously requested contrast adjustment:
free windows remain distinct from the selected day in both calendar views.
The shared analytics dashboard remains at <https://stats.kreoniz.ru>, as selected
by the owner. Its HTTPS page and heartbeat passed; no analytics, DNS or proxy
configuration changed.

## Validation

- TypeScript, Oxlint, Oxfmt, all 67 frontend tests, production build, Go race
  tests and vet passed. Private-file/history and Gitleaks history/tracked-tree
  scans passed. The exact Docker build reran frontend checks and tests.
- Browser checks passed on the development build, exact runtime assets and
  public production: 12 cases each, at 320, 390 and 414 pixels, compact landscape,
  two/three groups and horizontal scrolling. Heading/column positions and widths
  matched within 0.05 CSS pixels. Native production screenshots were inspected.
  Built-in preview screenshots timed out; an isolated Chrome was used.
- Exact-image and public HTTPS checks passed all 38 routes/static checks each;
  all 35 asset hashes match. Production is healthy. Image archive SHA-256 was
  verified before loading.
- Activation verified a consistent protected SQLite backup and preserved all
  108 legacy links, the existing volume, Compose, shared Caddy and non-image
  environment settings. The preceding healthy image remains available, with
  automatic image rollback if activation checks fail.

Main was advanced and pushed by fast-forward. Existing PWA clients can activate
the offered update without clearing their saved comparison.

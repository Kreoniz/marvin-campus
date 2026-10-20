# Кампус public name — 2026-10-20

The owner requested «Кампус» or «Unlikely Campus». The selected public name is
**Кампус**, matching the application's Russian interface.

Application revision: `dcd87ac036c80025e7a028519195216201c4fe94`.
Production: <https://campus.kreoniz.ru>.
Image: `marvin-campus:2026-10-20-campus-1`.
Runtime image ID:
`sha256:56825d7e85bb62144676c7dc3823f7a3f8f3295bf0761a1c0e69828ea9a507d8`.

## Result

The header, accessible brand label, static and dynamic page titles, sharing
metadata, PWA names, normalized analytics title and illustration descriptions
use the new name. The social image now reads «Кампус»; its
[prompt and provenance](../assets.md) are retained. The chosen M2 illustration
and installation artwork remain in use. Repository/module names, stored
preferences, application identity and comparison URLs are preserved.

## Validation

- Svelte check, all 61 frontend tests, build, Go race tests and vet passed.
  The runtime image also ran frontend checks, tests and its production build.
- Formatting, private-file and Gitleaks history/tracked-tree scans passed.
  The new 1200×630 social export has no EXIF, XMP, comment or ICC metadata.
- The runtime passed 36 local and 36 independent public HTTPS checks, including
  all 32 static hashes, HTML metadata, manifest name/identity and CSP.
- Browser review covered desktop/mobile and light/dark themes. An existing
  production PWA offered an update from the preceding M2 release. Activating it
  changed the header and dynamic title to «Кампус», preserved the comparison,
  subgroup, date, mode and theme, and removed the old shell cache. The new cache
  is `campus-shell-08e9cefa18c8`.
- Activation verified a consistent SQLite backup and integrity, preservation
  of all 108 legacy links and the volume, and unchanged Compose/shared proxy/
  non-image environment hashes. The prior M2 image and protected backups remain
  available for rollback.
- [GitHub CI](https://github.com/Kreoniz/marvin-campus/actions/runs/39445526152)
  did not start because of the account's billing/spending limit. Its failure
  annotation was checked; the local/runtime validations above passed.

Existing PWA clients can choose **Обновить** without resetting storage.
Rollback selects the retained `marvin-campus:2026-10-20-m2-1` image and its saved
image setting; this presentation-only release needs no database restore.

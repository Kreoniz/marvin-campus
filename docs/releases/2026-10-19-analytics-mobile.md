# Analytics and summary release — 2026-10-19

The owner approved minimizing Campus events and thirty-day detailed analytics
retention, then reported an empty presence result and unreadable dark-theme text.
Final application revision: `de095d5`, including analytics `39a2459`, mobile
controls `6d749f5` and installation icons `af3aba7`.

Runtime image: `marvin-campus:2026-10-19-20`. Production runtime image ID:
`sha256:9a2315e50c7c8f132624046031d8caae6557e3863a40954447941cc59a6fd3e5`.

## Result

- Selection events keep group labels and a boolean indicating subgroup use.
  Separate catalog IDs, subgroup IDs/numbers/labels and comparison identifiers
  are removed. Link attribution/fingerprint computation is removed.
- `mobile_view_changed` reports `view=day|week` only when the toggle changes.
  The application now documents sixteen named events plus its initial pageview.
- The release includes the previously prepared mobile day/week toggle, calendar
  width, clearer online lesson outlines and dark PWA installation icons.
- The summary qualification text inherits the card's text color. On the desktop
  yellow card in dark mode the measured contrast is 9.43:1. Compact dark summaries
  retain their light foreground on the dark background.
- A complete comparison without shared presence now explains that a selected
  group has no onsite lessons, or that the groups' onsite ranges do not overlap.
  The pure calculation and its requirement to include every selected group did
  not change.

The reported selection was reproduced for 2026-10-19: ФИТ-232 subgroup 2 has
onsite lessons 08:00–13:05; ИВТ-233 has only a remote lesson 09:40–11:10 in a
virtual room. The empty shared-campus result follows the product definition;
remote lessons occupy time but do not establish campus presence. The new summary
identifies ИВТ-233 as lacking onsite lessons. Separate checks confirmed
ФИТ-231 + ФИТ-232 presence 09:40–14:45, and that adding МО-231, which has no
lessons that day, cannot silently exclude it from the comparison.

## Analytics operations

The separate `vps-analytics` project owns cleanup, PostgreSQL and backups. Its
revision `d78f1d8` installs daily Campus-only cleanup at 02:30 UTC with up to
five minutes of jitter and a persistent systemd timer. The first run succeeded;
no Campus visitor/event data was yet older than thirty days. Other websites and
Umami configuration remain outside the deletion scope.

A verified protected backup replaced the expired initial-installation snapshot.
Managed snapshots expire no later than seven days or the remaining Campus data
lifetime, whichever is earlier; copies do not add another thirty days. The
runbook and activation evidence live in that operations project's
`docs/campus-retention.md` and `docs/releases/2026-10-19-campus-retention.md`.

Historical in-window properties remain until expiry. Old installed builds can
still send the old properties until their offered PWA update is activated.
Detailed data expires from Umami reports too; no separate aggregate warehouse is
created. Daily maintenance can leave a record for up to one additional day;
referenced session headers remain while recent activity needs them.

## Validation and activation

- 61 frontend tests passed; Svelte check found zero errors/warnings; production
  build passed. Go race tests and vet passed during the analytics work; subsequent
  changes were confined to frontend presentation, its test and documentation.
- Private-file and Gitleaks checks passed on reachable history and the prepared
  tracked release tree. No credentials, visitor records or backups are tracked.
- The isolated PostgreSQL test verified expiration across analytics tables,
  preservation of current rows and referenced sessions, exact preservation of
  another website, non-mutating dry run, idempotence, duplicate-domain rejection,
  late event properties, backup lifetime boundaries and unsafe-path rejection.
- Authenticated dashboard APIs passed after retention activation.
- Each image passed 26 local/public HTTP checks. Final activation independently
  matched all 23 public static file hashes to the runtime artifact and checked
  health, SQLite integrity and all 108 legacy links. Existing volume, Compose,
  proxy and non-image environment were preserved; rollback images were retained.
- Browser checks covered actual mobile toggle events, suppression of a duplicate
  active-view click, mobile/desktop layout, dark summary contrast, the reported
  selection and PWA updating without clearing selection or theme.

The intermediate v19 activation automatically rolled back because a release
assertion compared raw index.html with `/index.html`, whose Open Graph URL is
intentionally rewritten by the server. The assertion was corrected to compare
HTML at `/`; the same v19 image then passed. The final v20 image adds only the
summary explanation/contrast and corresponding regression coverage.

For existing PWA clients, use the application's “Обновить” action. No storage
reset is required.

## Through this code

Svelte's `$derived` computes the explanation from the same filtered lessons as
the comparison, so changing a subgroup updates both consistently. The mobile
toggle's click handler exits for the active value before changing `$bindable`
state or tracking an event. The Go comparison API was not changed by this release.

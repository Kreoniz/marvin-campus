# Shared day lessons — 2026-10-22

Production: <https://campus.kreoniz.ru>.
Application revision: `c24be02a07f43267623faa5d5070416873b4b9fe`.
Image: `marvin-campus:2026-10-22-day-events-1`.
Runtime image ID:
`sha256:1379a9193aab2d74114923ad6a489daf0b73b515b30ea8bf27aab2d423d768e9`.

## Result

Day view now uses the existing week-view event lanes. Each shared source event
appears once, with its participant labels and full details. Distinct overlapping
events retain separate lanes. Fixed group columns and their unused projection
were removed; reordering groups no longer claims to reorder calendar columns.
Source identity, subgroup membership and comparison calculations are unchanged.
Unavailable schedules remain explicit and never become empty schedules.

The release also pins `unlikely-ui@0.1.0-alpha.2` and uses its public ScrollArea
for the calendar, group strip and desktop day timeline. Viewport refs preserve
programmatic scrolling and group reordering. The group strip reserves scrollbar
space, including the larger touch track, so it cannot cover subgroup controls.

Time board is recorded in the product rules as a future UX idea. The other
mockup layouts are not implemented. The final Svelte revision is preserved by
the annotated `svelte-design-final` tag at `af9739f`.

## Validation

- TypeScript, Oxlint, Oxfmt, the production build, Go race tests and vet pass.
  All 61 remaining frontend tests pass; six tests for the removed fixed-group
  projection were removed with that feature. Existing regressions cover shared
  events, concurrent lessons, missing data and subgroup membership.
- Private-file/history and Gitleaks history/prepared-source scans pass. The
  image was built from the committed tracked tree, excluding private artifacts
  and prototypes. Its build independently ran frontend checks and tests.
- Exact-image and independent public HTTPS checks each pass all 38 HTTP checks.
  All 35 deployed file hashes match, including the canonical app shell at `/`.
- Browser checks against the exact image and public assets each pass 12 fixture
  cases at 320 and 430 pixels and compact landscape. Shared long classes appear
  once; concurrent distinct lessons remain separate; missing group data keeps
  comparison incomplete. There is no horizontal page overflow or group-column
  markup. Day/week switching and all four participants in details pass, with
  zero browser errors. Production screenshots were inspected. T3 preview
  snapshots timed out, so a separate browser was used.
- An existing production PWA updated from `index-DkAlsQmm.js` to
  `index-CpA6FzDw.js`. A real two-group shared military class changed from two
  cards to one. Its comparison URL, both selected subgroups, date, mode and light
  theme were preserved. The active shell is `campus-shell-a9c05ffb4eb2`.
- Vite retains its existing advisory about a main chunk above 500 kB. No
  physical-device or screen-reader test was performed.

## Activation and rollback

The transferred archive hash and image revision were verified before loading.
Activation verified a consistent protected SQLite backup and preserved all 108
legacy links. The data volume, Compose, shared proxy and non-image environment
settings retain their verified values. The new container is healthy, non-root,
read-only and exposes no host port.

An initial activation automatically restored the preceding healthy image after
the shell hash check targeted `/index.html`, whose social URL metadata is
intentionally route-specific. The check was corrected to the canonical `/`
route and all 35 hashes passed on retry. No application change was needed.

The previous `marvin-campus:2026-10-21-mobile-headers-1` image and protected
backups remain available. This frontend change needs no database restore for
an image rollback. Existing PWA clients can activate **Обновить** without
clearing their saved comparison.

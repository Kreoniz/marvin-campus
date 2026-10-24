# Mobile calendar and group search — 2026-10-24

Production: <https://campus.kreoniz.ru>.
Application revision: `dacb1bc7018d80732f99b545e5e142140e0a1484`.
Image: `marvin-campus:2026-10-24-ui-1`.
Runtime image ID:
`sha256:4918e361b83cfa88f364921f23869116ad0e9abae7b4426edd83fcd509127c26`.

## Result

This release deploys the approved changes recorded in the
[UI review](../reviews/2026-10-23-ui-ux-audit.md). Mobile calendars use page
scrolling for their full time range, with results and freshness below the grid.
Comparison controls and the partial-data notice remain above it. Idle custom
scrollbars disappear fully, and Add aligns with the selected group chips.

Group search stays open through the first and subsequent additions, preserving
query, results and input focus. Duplicate rows and additions beyond 30 groups
are disabled. Closing returns focus to the appropriate trigger.

The earlier approved subgroup, partial-comparison, accessibility, title wrapping
and shared-link recovery fixes are included. The smaller shared participant
labels were reverted before release; the original participant sections remain.
Unavailable schedules never become empty schedules.

## Validation

- TypeScript, Oxlint, full Oxfmt check, all 64 frontend tests, production build,
  Go race tests and vet pass. Private-file/history and Gitleaks history/prepared
  tracked-tree scans pass. The image was built from the committed tracked tree;
  the unrelated untracked review note was excluded.
- Exact-image and independent public HTTPS checks each pass all 38 HTTP checks,
  including health, readable/legacy shell routes and all 35 deployed file hashes.
- Browser checks against the exact image and public assets cover 320, 390, 700,
  900 × 450 and 1440 pixel viewports, with fine and coarse pointers. Compact day
  and week calendars have no vertical inner overflow; wheel input scrolls the
  page, horizontal week scrolling remains available, summaries follow the grid,
  Add aligns with chips, and idle group scrollbars are fully transparent.
- Pointer and keyboard multi-add checks at 390 and 1440 pixels verify a stable
  dialog/input position, retained query, disabled duplicates, the 30-group cap,
  Escape/Close/outside dismissal and focus return. Partial-data checks verify
  named included/excluded selections, no result with only one usable group,
  unchanged URLs, removal focus, named date dialogs and non-overlapping summaries.
  These browser checks use synthetic schedules; no page errors were observed.
- An existing production PWA updated from `index-CpA6FzDw.js` to
  `index-D1hxFkAh.js`, preserving its comparison URL, groups, subgroup, date,
  mode and light theme. The active shell is `campus-shell-bfd1c50a07c9`;
  the old shell was removed.
- GitHub [CI run](https://github.com/Kreoniz/marvin-campus/actions/runs/40062262103)
  could not start its validation job because of account payments/spending limits.
  Required checks were completed locally. Vite retains its existing main-chunk
  advisory above 500 kB. No physical-device or screen-reader certification is
  claimed. T3 preview snapshots timed out twice; a separate browser was used.

## Activation and rollback

The transferred archive hash, OCI config digest and application revision were
verified before activation. A protected, consistent SQLite backup passed
`quick_check`; all 108 legacy links remain unchanged. The existing data volume,
Compose, shared proxy and non-image environment settings were preserved. The
new container is healthy, non-root, read-only and exposes no host port.

After an interrupted activation, the previous healthy image was verified before
a guarded retry completed. Activation checks automatically restore the previous
image on failure. The preceding `marvin-campus:2026-10-22-day-events-1` image and
protected backups remain available. This release requires no database restore
for an image rollback. Existing PWA clients can activate **Обновить** while
retaining their comparison.

# Architecture

- `cmd/campus`: application configuration and graceful HTTP shutdown.
- `internal/httpapi`: routes, validation, response policies and client limits.
- `internal/cache`: SQLite snapshots, freshness, same-key load coalescing and
  admission of at most 32 distinct refreshes. Fresh hits and existing-flight
  joins do not consume another refresh slot. Eviction recency writes have minute
  precision; snapshot check and expiry times are independent of recency.
- `internal/upstream`: one active source request, at most 32 admitted requests,
  cancellable queue waiting (25 seconds), 500 ms spacing and source cooldowns.
- `internal/schedule`: normalization and source cache lifetimes.
- `internal/share`: reading permanent legacy comparisons. Public creation is
  disabled; the existing database and links are retained.
- `src/lib`: pure schedule calculations, reversible URL encoding, query options,
  selection state, link synchronization, PWA integration and analytics policy.
  `schedule-ref` gives group/lecturer/room/VUC selections source-scoped string
  keys; natural canonical IDs remain at API boundaries. `ScheduleData` does not
  pretend a room is a group. Imported coverage is checked per entity and date.
- `src/app`: React providers, theme entry and application shell/help.
- `src/features/comparison`: page composition, comparison state, navigation,
  results and data status. It composes the independent groups and schedule UI.
  `use-schedule-hotkeys` registers physical Vim keys with TanStack Hotkeys;
  editable fields, composition and visible overlays retain keyboard ownership.
  The optional shortcut preference is separate from comparison state and URLs.
- `src/features/groups`: group search, direct subgroup selection and ordering.
  Compact chips open a schedule menu with subgroup, spotlight and management
  actions; pressed spotlight state uses fill without decorative checks. Multiple
  spotlight IDs live as local presentation state in `ComparisonPage`; they do
  not change schedule data. The single schedule-search dialog combines the existing
  combobox search with the reusable ordering/removal list. Removing its last
  selection keeps search available. Management drag passes the final typed
  selection order through `onReorder` to `view.reorder` once; arrow/Alt moves
  remain individual operations. The exploratory name/icon chooser has been removed.
- `src/features/resources`: typed lecturer/auditorium queries and linked metadata
  actions adding to the same selected set. Unified search and kind visibility
  reuse the calendar/list, ordering and spotlight workflow. Resource HTTP
  endpoints allow only `lecturer` and `auditorium`; normalization whitelists public
  lesson fields and canonical refs, retaining legacy teacher/room strings. Cache
  and Query keys include resource kind and ID. Resource weeks reuse snapshot
  deadlines while persistent worker caching remains limited to group schedules.
- `internal/vuc` and `scripts/import-vuc.py`: bounded configured document datasets
  and a local importer. The API exposes a typed platoon catalogue and requested
  weeks with per-platoon covered/unresolved dates and source evidence; it accepts
  no public uploads or request-controlled filesystem paths. Optional configured
  originals are hash-verified at startup and served as the unchanged PDF/DOCX bytes
  by canonical VUC ID; availability is independent of date coverage.
  `scripts/update-vuc.py` freezes explicit current-semester inputs, invokes the
  importer and publishes a new dataset/originals directory together without
  changing live settings or removing prior sets. See `docs/vuc.md`.
- `presentation-cohort` and `use-presentation-cohort`: publication policy above
  independent query caches. A week and typed selection set define a generation;
  cold responses wait at most two seconds, later changes coalesce for 1.2 seconds
  while requests run. Same-week retained inputs survive selection changes.
  Snapshot deadlines and current errors are checked independently of publication.
- `src/features/schedule`: time grid and lesson cards; geometry stays separate
  from the pure calculations in `src/lib`. Day and week views both render the
  same consolidated `lessonBlocks` events. `features/schedule/model` allocates
  vertical presentation lanes against semantic and painted bounds. Calendar
  display bounds are independent of domain intervals; VUC defaults to 09:00
  while preserving real earlier events. Presence gutters clear external card outlines. Rendering uses
  fixed 160-pixel cards and 166-pixel lanes in compact Week. A free-lane source
  preference never increases concurrency. `source-layout` projects source-oriented
  Day bands from canonical blocks: 160-pixel cards, painted-bound sublanes,
  user-ordered source bands and typed-key scroll anchoring, clamped on contraction
  with neighboring-source fallback. Header columns use the same width vector and
  natural text height; focus reveal measures the rail and current header. An academic-first
  visible presentation owner gets the full card; other member occurrences open
  the same details. These references never enter calculation or lesson counts. Per-day minima and measured column
  navigation stay outside domain calculations. Initial/date/Today reveals remain
  pending until the first usable cohort geometry, unless deliberate scrolling
  cancels them; later geometry changes restore the date/offset anchor. Repeated
  Today requests reveal without writing duplicate date history.
  All calendars use page vertical scrolling and retain horizontal navigation.
  The Day source chooser is a design-system Select with focus transfer to its band.
  Desktop Week's secondary detail is always a timeline; Day/Week/List remains
  the primary header choice. The horizontal timeline keeps
  semantic event rows; `src/lib/agenda.ts` projects complete reading entries,
  retaining individual bundle occurrences and participant records. Exact interval
  grouping is a separate presentation projection; it never merges lesson
  identities. Calendar layer and kind visibility are local UI state and never
  remove calculation participants. Rooms remain occupancy overlays. Both orientations
  render presence/free ranges from `compareDay` through `ComparisonHighlights`;
  URL modes remain compatible and never filter the calculation inputs.
  Shared events retain full participant data; vertical lanes separate distinct events conflicting in time
  or painted bounds.
- `src/shared/ui`: small shared icon controls. Components import unlikely-ui
  through its public subpaths and style app layout with Tailwind utilities.
  `src/app/styles.css` loads Tailwind, the published DS stylesheet/adapter,
  the local font, semantic Tailwind theme aliases, the app's presence colors and
  a short opacity entrance with typed color properties for stripe transitions,
  decorative resource SVG masks and a short-height search-dialog fallback.
  Subgroups use the base group color; saved-data muting is handled separately in
  lesson cards. Dynamic schedule geometry
  and categorical colors use computed styles; there are no app component
  stylesheets or parallel control resets. TanStack React Query owns browser request state;
  the service worker owns persistent offline responses. The active view reads
  exact group/week saved responses with `saved-schedules.ts`, orchestrated by
  `use-comparison.ts`, while normal requests run. This transient fallback never overwrites Query data or errors.
  Deadline timers update stale/expired state in an idle tab and on Omsk Monday.
  Unknown groups in readable links resolve through a pool of three catalog
  lookups; URL order and ambiguity rejection are preserved.

The API returns 429 plus Retry-After for a client limit, and 503 plus Retry-After
for local refresh saturation. Source failure is separate; saved data remains
visible with an honest warning. The generous per-client burst permits loading
up to 30 groups behind a shared NAT. Forwarded addresses are considered only
when the direct peer belongs to explicitly configured trusted proxy CIDRs.

## Reversible group codes

`ФИТ-232` stays `fit-232`. Letter tokens that can be decoded in more than one way
are separated after `~`: `Ю-232` is `~yu-232`, `ЫУ-232` is `~y_u-232`, `Ц-232`
is `~ts-232`, and `ТС-232` is `~t_s-232`. Latin original letters use l-prefixed
tokens: `FIT-232` is `~lf_li_lt-232`. This preserves alphabet identity and mixed
codes. The decoder accepts a compact code only when it has exactly one decoding.
No format-version parameter is required. Old ambiguous unseparated codes require
a fresh link rather than an arbitrary choice of the first matching group.

`s2` means public subgroup number 2. Exceptional catalog names use `gID`; a
subgroup without a public number uses `sidID`. Old `/s/id` comparisons already
contain source IDs and remain readable. Duplicate catalog names with distinct
source IDs must be resolved through explicit selection, never first-match lookup.

`/vuc` reuses `ComparisonPage` with a VUC-only catalogue and selection boundary.
Typed URLs retain that page context, while mixed comparisons keep `/compare`.
Its saved selection uses a separate local key; canonical source IDs and the
existing configured-document API remain unchanged. `MilitaryPreview` reads
same-date VUC data within academic military-preparation details; its remembered
personal choice is presentation state, independent of comparison participants.
Its full-entry list starts collapsed in lesson popups; tall inline entries include
teachers when they fit. Document rows remain complete on the dedicated page.
Popover hover, safe pointer travel and press semantics build on Base UI;
Campus explicitly pins an open preview on its first press.

`MilitaryInline` measures its own remaining body and complete row extents with ResizeObserver; hidden rows retain measurement geometry but leave the accessibility tree. Document status and the truthful remaining count have reserved space. The preview, including shared references, never creates comparison events. Personal VUC choice uses the published unlikely-ui Select.

# Cross-review — 2026-10-17

Scope: current local `main`, repository documentation, Svelte/Go source, existing tests, a local production build and synthetic schedules. Three independent subagents reviewed engineering/security, UX/accessibility/research, and skeptical counterexamples. The parent reconciled their findings. No application or production configuration was changed.

This is a prioritized review, not a deployed change or a penetration test. No production proxy, DNS, firewall, logs, private database, real-device network performance or dependency vulnerability inventory was inspected. No load test was run against the university.

Detailed UX sources and alternatives: [UX research](2026-10-17-ux-research.md).

## Recommended order

P1 means address in the next implementation pass; P2 means a subsequent improvement or measurement; P3 is optional. No critical compromise was established.

| Order | Priority | Work                                                                           | Confidence / scope                                                           |
| ----- | -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1     | P1       | Correct lesson subgroup labels and preserve per-participant source membership  | Confirmed correctness bug; include regression tests                          |
| 2     | P1       | Make cache-cutoff tests independent of today's week                            | Existing frontend suite fails 1 of 40 tests                                  |
| 3     | P1       | Hydrate usable same-group/week persistent data before network completion       | Confirmed cold-start behavior; preserve refresh outcomes and age limits      |
| 4     | P1       | Consolidate stale state into a stable status row and affected event styling    | Confirmed expanding warning UI; includes derived results and empty days      |
| 5     | P2       | Compact mobile navigation and move the comparison result closer to the top     | DOM measurements corroborate excessive vertical control cost                 |
| 6     | P2       | Remove arbitrary initial group suggestions; simplify copy consistently         | Small, low-risk improvement; wording is editorial judgment                   |
| 7     | P2       | Measure miss-admission fairness and limiter occupancy before tightening limits | Bounded work exists; fairness gap is confirmed, production impact unmeasured |
| 8     | P2       | Reduce avoidable link-resolution latency; measure SQLite hit contention        | Concrete code opportunities, no production bottleneck established            |
| 9     | P3       | Extend scoped keyboard navigation; evaluate optional TanStack Hotkeys          | Svelte support exists; desktop-only transfer needs PWA changes               |

## 1. Subgroup selection must not rewrite lesson membership

`src/lib/subgroups.ts:28` checks the selected subgroup before the lesson's actual membership. Therefore selecting subgroup 2 changes a whole-group lesson's label from `ИВТ-233` to `ИВТ-233/2`. The current assertions at `src/lib/subgroups.test.ts:24` explicitly expect that unwanted behavior.

Keep two distinct operations:

- Selection filters included lessons. Existing `src/lib/domain.ts:4` correctly includes the selected subgroup plus whole-group lessons.
- Source membership determines the label. A whole-group lesson stays `ИВТ-233` regardless of the filter; a subgroup-specific lesson keeps `/1` or `/2`. Selecting `Вся группа` still exposes all source subgroup distinctions.

The skeptic reproduced a second bug. `src/lib/lesson-layout.ts:29` deduplicates a shared event while retaining only the first group's `Lesson`, including its group-local subgroup IDs. `src/components/LessonCard.svelte:44` uses that copy to label every participant. With one shared source event whose copies contain subgroup IDs 101 and 201 for different groups:

- Input order `[1, 2]` displays `Г-1/1`, `Г-2`.
- Input order `[2, 1]` displays `Г-1`, `Г-2/1`.

Preserve participant-specific source membership in the shared visual block. Do not add subgroup IDs to the shared-event identity merely to prevent merging: that would split real shared lessons. Test whole-group membership under a selected subgroup, subgroup-restricted participants, mixed membership, reversed group order, popover labels and filtering. Calculations should continue using the pure domain functions.

## 2. Cached loading: target cold starts, not every refetch

The calendar already retains available query-memory snapshots during a background fetch: `src/lib/schedules.svelte.ts:44` uses `isPending`, and `src/components/Calendar.svelte:154` only skeletons when no schedule has a snapshot. The desktop timeline has the same guard. Replacing this with another library would not address the main problem.

The persistent path is network-first (`src/service-worker.js:66`). After a reload, the query cache starts empty and the saved response is considered only after a network exception. Inactive query-memory retention is 30 minutes (`src/lib/cache-policy.ts:5`); this is not persistent storage. The server also waits for a refresh flight after expiry (`internal/cache/cache.go:88`, `:148`), with a 45-second refresh timeout.

Smallest recommended change: hydrate exact group/week snapshots from the existing persistent cache into TanStack Query, then run the ordinary refresh independently. Read through a single explicit client/worker cache interface; do not scatter duplicated retention rules or add a second persistent store. Preserve `checkedAt` and `expiresAt`, enforce `usableSnapshot`, and keep HTTP failures, 429/503 and cancellation as refresh outcomes. A saved snapshot may remain visible while that refresh fails; the error must not be rewritten as a successful fresh network response.

Do not use the previous week's data as a placeholder for another week. No usable snapshot still means loading/unavailable, never an empty timetable. Avoid speculative all-group or adjacent-week prefetch: the source is intentionally serialized.

Server stale-while-revalidate is a later option. Returning stale immediately also needs a bounded way to deliver refresh completion to the client; without that, the UI can remain stale after the server finishes. Do not add independent background loops at every layer. The general cached-first/revalidate pattern and notification tradeoff are described in [Google's caching guidance](https://web.dev/articles/stale-while-revalidate).

### Freshness test failure

`pnpm test` currently passes 39/40 tests. `src/lib/cache-policy.test.ts:59` supplies a historical `now`, but `usableSnapshot` calls `snapshotDeadline` with a separately derived real current Omsk week (`src/lib/cache-policy.ts:16`, `:46`). The fixture also assumes an hour's TTL for a snapshot checked during that same requested week, where the current-week policy is ten minutes.

Use one controlled clock/current-week input and coherent current/future/past fixtures, including a future week becoming current. Do not relax the ten-minute deadline or 24-hour grace period to make the test pass. The service worker uses the original response expiry plus a day; the frontend additionally clamps expiry to the current week policy. Hydration must keep the stricter client guard.

An untouched focused tab may also need a deadline wake-up: its component clock changes on focus/online, not on an explicit grace-expiry timer (`src/lib/schedules.svelte.ts:48`). This is a hypothesis requiring a fake-clock component test, not a reproduced UI failure.

## 3. Stale UI should be quiet, explicit and stable

Agree with replacing the expanding yellow banner for usable saved data. `src/components/ComparisonStatus.svelte:57` inserts one paragraph per affected group above the calendar. Its existing status row is already a useful stable location for `Проверяем обновления…`, `Сохранённые данные · проверено …`, and a details action.

Soften affected card backgrounds/borders or participant sections, keeping text and focus rings readable. Whole-card opacity looks disabled and can damage contrast. Mark a shared card as uncertain if any required participant is stale, with per-participant details where appropriate. [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) support text and accessible status alongside appearance.

The skeptic's necessary counterexamples:

- An empty stale day has no cards to dim; the age/status must remain visible.
- Free/presence highlights and summaries are derived from every selected snapshot. If any is stale, qualify the result with `По сохранённым данным`.
- A group without a usable snapshot needs an explicit missing-data status, and the complete comparison must remain unavailable.
- Background refetch need not replace a usable result with skeletons. `ComparisonSummary.svelte:50` currently skeletons whenever any group is pending; retain a result only when all its exact required inputs are available.

Removing dynamic insertion addresses a plausible layout-shift source, but no before/after CLS score was measured. Skeleton removal alone is not proof of better CLS; geometry, unchanged data, scroll and focus must remain stable. [Google's CLS guidance](https://web.dev/articles/optimize-cls).

## 4. Mobile direction and wording

In a local synthetic three-group scenario at **390×844 CSS pixels**, seven cards rendered and the calendar began at **458.42px**; the result began at **992.5px**, below the first viewport. The toolbar alone was **206.42px** tall. A three-error banner added **130.33px**, moving the calendar to **588.75px**. At **320×568**, seven cards still rendered without page-level horizontal overflow, with the calendar at **457.67px** and result at **1005.25px**. These are DOM measurements, not field performance or real timetable evidence. Preview screenshots had unreliable composite dimensions, so measurements are the evidence.

First iteration:

1. Reduce active-comparison branding height and decorative spacing.
2. Replace the 77px group strip with compact group chips that open subgroup/remove/order controls; keep Add visible.
3. Combine date/week navigation and Today. Place Day/Week in a compact view menu; avoid another full-width row.
4. Keep one weekday strip and one short mode row; remove the duplicate selected-day header in the day-only view.
5. Place the short comparison result above the time grid. Expand multiple intervals in normal flow rather than an 88px internal scroller.
6. Move the verbose legend into help, retaining a concise visible key. Avoid shrinking the existing 9–11px helper text further.

Keep time-proportional lesson duration in the calendar. An optional agenda list can help dense overlapping days, but it is not required to fix the controls. Defer comparison modes for a single selected group. Aim around 44px for common touch actions; WCAG's AA minimum is 24px with exceptions, not a reason to shrink every control. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Recommended short labels: **`В вузе` / `Без занятий`**. Longer result headings: **`Общее время в вузе` / `Все без занятий`**. Other viable pairs are `Общее время` / `Без пар` (shorter, more contextual), or `Общее время в вузе` / `Общее свободное время` (more explicit, wider).

Help must explain that presence is inferred from first to last in-person lesson, including breaks, and that free time exists only within shared presence, with online lessons still occupying time. Avoid implying actual location or guaranteed ability to meet across buildings. Use the same terms in toolbar, summary, legend, help and accessible names. This is editorial judgment, not a localization user study.

## 5. Add-group search

The initial entries are real selectable hardcoded IDs/names, not loading placeholders: ИВТ-241/242/243 (`src/components/GroupPicker.svelte:32`). They have no explanation and are not inferred from the visitor.

Prefer **no initial group rows**: focused input, `Введи название группы`, and `Например, ФИТ-232`. Reconsider the fixed 120–290px results-slot height so the initial state is intentional, while keeping searches stable as results arrive.

Later, locally recent groups are more generally useful. ФИТ-231, ФИТ-232 and МО-231 can form an explicitly named personal cohort preset, resolved from the real catalog; do not silently call them every visitor's groups or invent their IDs. A group-code prefix is not proof of stream membership. The landing-page demo also hardcodes ИВТ-241/242 (`src/lib/comparison-view.svelte.ts:168`); make any example clearly labeled and intentional.

## 6. Backend security and abuse

Existing defenses are substantial and should stay: 2 requests/second per client with a burst of 120; a 4,096-client bucket cap; trusted-proxy parsing; 32 distinct cache refreshes; serialized source access with 500ms spacing, queue deadlines and cooldown; an 8MiB source-response cap; 5,000-row/30-day snapshot pruning; validated inputs and parameterized SQL; disabled public share creation; response security headers, HTTP timeouts and a non-root read-only container. Existing tests cover many of these boundaries.

The main remaining availability concern is **distinct expensive misses**. Search terms and valid-looking group/week combinations create different keys. One client's allowed burst can occupy the 32 refresh slots; refreshes deliberately survive caller disconnects. Bounds protect concurrency and memory but do not guarantee fair access to cold data (`internal/httpapi/limits.go:16`, `internal/httpapi/server.go:60`, `internal/cache/cache.go:99`, `:110`).

Engineering initially rated this P1; the skeptic correctly noted that a supported 30-group comparison itself nearly fills the queue. Final recommendation: **P2 capacity/abuse testing**, not an unproven critical vulnerability or an immediate restrictive scheduler. Exercise mixed legitimate and distinct-key clients using a local fake upstream; observe cache hit/miss rates, queue wait, refresh duration, 429/503 rates and limiter occupancy without collecting student identities or raw IP analytics. Tune a separate new-refresh admission budget only if needed; cache hits and same-key joins should remain cheap. Include shared NAT and a 30-group comparison in acceptance tests. The client should respect Retry-After when automatic deferred work is introduced.

The client-bucket table also fails closed when 4,096 addresses remain active, blocking new clients until expiry (`internal/httpapi/limits.go:38`). That is bounded, tested behavior; monitor before considering capacity or IPv6-prefix policies. Do not casually evict active buckets or trust arbitrary forwarding headers. CORS and a public frontend API key cannot stop independent clients from calling this public API.

### Cloudflare decision

Do **not** make Cloudflare the default production route without a connectivity pilot. Its current official support notice reports Russian ISP throttling to roughly 16KiB per connection, potentially rendering sites unusable. This is a serious audience-specific risk, not proof of today's reachability on every Omsk ISP. Test representative mobile and fixed networks first. [Cloudflare support notice](https://developers.cloudflare.com/support/troubleshooting/general-troubleshooting/service-disruption/).

If a pilot passes and abuse warrants it, edge rate limiting can complement Go's limits. Rules and counting features are plan-dependent; the documented free offering is limited, so do not assume sophisticated NAT-aware behavior is free. [Cloudflare rate-limiting availability](https://developers.cloudflare.com/waf/rate-limiting-rules/).

Restrict direct origin ingress to the intended proxy path, including IPv6, and configure exact trusted proxy CIDRs; proxying DNS alone does not prevent bypass. This requires a separate deployment plan and live verification, neither performed here. [Cloudflare origin guidance](https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/).

Do not put HTML challenge pages directly in front of JSON fetches. Use a deliberate clearance flow if challenges become necessary; Turnstile needs server validation and compatible CSP. It is an escalation for demonstrated abuse, not a prerequisite for reading public schedules. [Challenge compatibility](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## 7. Other performance opportunities

The production build contains **382.59kB JS / 113.35kB gzip** and **43.47kB CSS / 9.54kB gzip**. These are build estimates, not measured HTTP transfer: proxy compression was not inspected. They do not establish a CPU bottleneck.

- **Link opening:** `src/lib/group-directory.ts:61` resolves unknown readable-link groups serially, and schedules wait until resolution completes. Deduplicate and use modest bounded concurrency while retaining ambiguity rejection. Benefit is largest with cached API responses; source requests should remain serialized.
- **Cached API hits:** `internal/cache/cache.go:73` holds a global mutex while reading SQLite; every read updates `touched` (`:163`), and every write prunes (`:185`). Measure hit latency/contention; coarsen touches or prune less often if material. Do not rewrite SQLite concurrency speculatively.
- **Frontend computation:** the week grid, detailed day and comparison summary separately derive related data (`Calendar.svelte:62`, `DayDetail.svelte:27`, `:42`, `ComparisonSummary.svelte:20`). Profile dense comparisons before sharing derived results. Preserve pure calculations; no evidence yet justifies virtualization or workers.
- **Optional UI chunks:** loading help/date/order UI on demand may reduce startup execution. Account for the PWA precache policy before claiming transfer savings.

Measure cold link resolution, time to visible cached content, warm/reload request counts, CLS and interaction latency at common group counts. Prioritize the waiting path over unmeasured micro-optimizations.

## 8. Keyboard navigation and TanStack Hotkeys

Normal keyboard operation already exists in buttons/Bits UI, the skip link, focused calendar scrolling and Alt+Left/Right group ordering. Extend scoped day/week navigation first; do not replace native scrolling with global arrow handlers.

TanStack has `@tanstack/svelte-hotkeys` with reactive enablement, scoped bindings and cleanup; its live homepage advertises **beta**. Use the Svelte API rather than React examples and verify the version's types at implementation time. [TanStack Hotkeys](https://tanstack.com/hotkeys/latest), [Svelte guide](https://tanstack.com/hotkeys/latest/docs/framework/svelte/guides/hotkeys).

For a few commands, native handlers may be smaller. A library becomes valuable when handling multiple scopes, conflicts, layouts and discoverable shortcut metadata. Suppress global commands in inputs, contenteditable, IME composition and active dialogs. Offer focus scoping, disable/remap support for letter shortcuts; preserve Tab/Enter/Space/Escape at every width. [W3C shortcut guidance](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html).

Width is not keyboard availability: tablets can have keyboards and desktop windows can be narrow. Optional enhancements can load by keyboard intent or explicit shortcut help; large-screen preload is only a hint. Crucially, **a dynamic import alone will not avoid mobile downloads**: `pwa-build.ts:24` includes every emitted JS/CSS chunk, and worker installation calls `cache.addAll` (`src/service-worker.js:8`). Excluding optional chunks requires an intentional offline/update policy. Delay this dependency until the core UX pass; measure its actual cost rather than guessing.

## Validation and follow-up acceptance

- `pnpm check`: passed, zero errors/warnings.
- `pnpm test`: 39 passed, 1 failed; cutoff fixture described above.
- `pnpm build`: passed; sizes recorded above.
- `go test ./...`: passed after allowing local test-server sockets. An initial sandbox-only upstream failure was environmental, not a product test failure.
- Local built UI: populated synthetic scenarios inspected at 390×844 and 320×568, and an unavailable scenario at 390×844, with DOM measurements. No real-device or field CLS claim.
- Partial mobile concept: previewed at 728px light, 360px dark and 320px light; missing-state and mode interactions, stable status height and no horizontal overflow checked. This is a review illustration, not an application implementation.
- Only review documents were added. No application changes, dependency installation, commit, push, production mutation or Cloudflare connection.

The implementation pass should cover subgroup/provenance regressions and deterministic clocks, then cold/warm/reload/delayed/failed/expired data states; unchanged refetch should retain geometry and focus. Validate compact controls at 320px and 390px, text zoom, long labels, many groups, dark mode and the search software keyboard. Include keyboard-only tasks and per-participant stale data. Backend fairness experiments should use a fake local source and include shared NAT traffic.

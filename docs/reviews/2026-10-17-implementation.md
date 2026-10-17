# Review follow-up — 2026-10-17

Implements the authorized changes from the [cross-review](2026-10-17-cross-review.md): source subgroup labels, saved-data loading and presentation, mobile density, group search and wording, performance, and keyboard navigation. Backend abuse controls were investigated without changing their behavior. These are local project changes; no production deployment or Cloudflare connection was performed.

## Resulting behavior

- Source membership labels whole-group lessons with the base group name, even under a subgroup filter. Shared visual events retain each participant's own source copies. Reordering groups leaves those labels unchanged.
- On reload, exact group/week saved responses can render while the normal request is pending. Network data wins a later cache read; restoring data cannot clear HTTP errors. Original timestamps and the stale grace period remain authoritative. Freshness, hard expiry and Omsk Monday transitions wake an idle view.
- Saved cards/participant sections use a theme-aware muted background with readable text and clock markers. One 44px status row replaces expanding yellow banners; per-group errors and check times open in a popover. Empty days and calculated comparisons also identify saved data. Missing inputs block a complete comparison.
- Mobile has a smaller header, compact group settings, combined week/Today/view controls, one weekday strip and a summary above the calendar. The day-only view omits a duplicate heading; switching from week view resets horizontal scroll. Summary intervals use normal flow instead of a small internal scroller.
- Search initially has no group rows and focuses the input. The arbitrary ИВТ suggestions were removed; no universal personal cohort was substituted. The input example is ФИТ-232. Comparison modes are “В вузе” and “Без занятий” and appear with two or more groups.
- Keyboard navigation is scoped to day/week controls: Left/Right, Home/End for days, Page Up/Page Down for weeks. It preserves focus and leaves typing, IME, modifiers, native selects and open dialogs alone. No dependency or optional JS chunk was needed for this small command set, so keyboard use remains available at every width.

## Performance evidence

Readable links now resolve unknown groups through at most three concurrent catalog lookups, preserving URL order and ambiguous-name rejection. Local directory entries need no request. Cancellation stops admission of further searches; the source's deliberate serialization is unchanged.

Every SQLite cache hit previously wrote its recency timestamp. Recency now updates at most once per minute per key. Check and expiry timestamps, refresh admission, 30-day cleanup and the 5,000-row bound are unchanged.

The same local disk-backed `BenchmarkFreshCacheHit`, three 500ms samples per version:

- Before: 40.96–42.23µs per hit, median 41.72µs; 1,144 bytes and 38 allocations.
- After: 22.65–23.35µs per hit, median 22.98µs; 1,040 bytes and 34 allocations.

This is approximately 45% less time in this microbenchmark, not a claim that end-to-end API responses or the site became 45% faster. Production SQLite contention was not measured.

The final build is 116.90kB gzip JS and 10.11kB gzip CSS, compared with the review baseline of 113.35kB and 9.54kB. The feature changes add about 3.55kB compressed JS; no runtime dependency was added. These are build compression estimates, not measured HTTP delivery.

## Backend capacity investigation — no control changes

`internal/httpapi/capacity_test.go` exercises the real HTTP handler, limiter, cache and source admission with a fake transport and `testing/synctest`. It makes no real source requests and does not measure network latency.

Confirmed:

1. A supported 30-group cold comparison from one shared client address can be admitted.
2. Two further clients fill the remaining slots in the global 32-refresh budget.
3. Another client's distinct cold key receives 503 and Retry-After even though its per-client bucket is full.
4. A warm cache hit still succeeds during saturation. A request joining an existing key waits for the existing refresh without consuming another source load.
5. After the held source is released, all admitted/joined calls complete, with one source load per distinct key. Admission recovers for the rejected key.

The test also passes under the race detector. It establishes bounded global capacity without per-client reservations. It does not establish an observed production denial of service, source throughput, normal upstream latency or an appropriate stricter threshold.

The existing rate, burst, trusted-proxy policy, client-table size, upstream spacing, deadlines, cooldowns and refresh limits remain unchanged. No proxy, firewall or Cloudflare configuration was modified. A future fairness decision should consider aggregate hit/miss rates, queue wait/rejections, actual group counts and shared NAT traffic. Any admission change should retain an explicit 30-group/NAT acceptance case. The review's Cloudflare reachability pilot remains a prerequisite to considering that delivery path.

## Validation

- Frontend type/accessibility diagnostics: zero errors and warnings.
- Frontend tests: 59 passed, including deterministic cache cutoff, saved-cache restore, source membership, parallel/shared events, bounded link resolution and keyboard decisions.
- Production build: passed.
- Go tests with race detector and `go vet`: passed, including cache recency and capacity investigation.
- Browser checks used only a synthetic local source and isolated database, at 320×568, 390×844 and 1280×900. Both light and dark themes were exercised.

Observed browser cases:

- A reload with a six-second-per-group source retained eight saved cards and showed no calendar skeletons. The summary qualified saved data. Calendar top, summary top and 44px status height stayed unchanged when identical fresh data arrived.
- HTTP 502 refresh errors remained visible in per-group details while saved cards and results stayed on screen, with no yellow banner.
- A stale empty day kept an explicit saved-data qualification. Removing one group's saved entry blocked comparison highlights while other groups stayed visible. Entries beyond their grace period were not rendered as usable data.
- Changing to an uncached week with a slow source showed loading rather than the previous week's lessons. Returning to the cached week restored the right day and keyboard focus.
- Subgroup selection retained base labels on whole-group lessons; subgroup-specific shared labels survived reordering. The mobile subgroup menu worked, the order dialog received focus, and closing it returned focus to its group chip.
- Add-group opened with zero results, a focused input and no reserved empty results area. Native select/input arrows did not change the selected schedule date.
- Page Up/Page Down, Left/Right and desktop Home/End selected the expected dates and preserved focus. Week-to-day switching reset horizontal scroll to zero.
- The PWA update action loaded the new build while preserving groups, subgroup, date and theme.

At 390px, the result moved from the baseline's approximately 993px to 309px from the top. The header reduced from about 77px to 53px and the toolbar from 206px to 61px. The calendar starts around 404px with the result now preceding it. At 320px the result is also around 309px; additional interval wrapping places the calendar around 418px. Neither viewport had page-level horizontal overflow. These are DOM observations on synthetic data, not field CLS or real-device measurements.

Three sampled saved-card foreground/background pairs in dark mode had contrast ratios 6.84–8.96. This validates those sampled colors, not a full accessibility conformance audit.

## Code tour

For someone coming from older Svelte, `schedules.svelte.ts` uses `$state` for the active saved fallback and `$derived` for the visible group schedules—the role previously served by `$:` reactive declarations. Query data takes precedence over that fallback; both pass through the same pure age policy. The fallback does not pretend to be a successful request.

`lesson-layout.ts` groups one visual event while keeping `memberLessons[groupId]` for each participant, rather than treating the first group's copy as everybody's metadata. This is the distinction between filtering what the user sees and labeling who the source says attends.

In Go, `checked` and `expires` describe freshness, while `touched` describes use for eviction. Reducing writes to `touched` therefore does not renew an old timetable. The capacity test uses goroutines and channels to hold/release concurrent requests; `synctest` advances a controlled clock so queue behavior can be checked without real waits or contacting the university.

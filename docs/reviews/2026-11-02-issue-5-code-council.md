# Issue 5 implementation and code council — 2026-11-02

Implemented on `fix/issue-5-reliability` from `ecd734c`. Issue 1 was closed as
superseded after its remaining history requirements were transferred to issue 5.
This records source implementation and review; it is not a production activation.

## Delivered behavior

- Current-response subgroup resolution prevents obsolete IDs or ambiguous public
  numbers from producing confident free windows. Weekly absence alone does not
  invalidate a selection. Raw-ID-only links retain their conservative boundary.
- DOCX/PDF dates accept `DD.MM` and reject other unrecognized nonempty date cells
  with source coordinates, preserving valid blank/merged continuations.
- Temporary links, copying, dates/modes and history traversal preserve the saved
  workspace; intentional selection edits adopt it. No-op navigation adds no
  history, and temporary views preserve saved highlights.
- The existing bounded offline store supports all four public schedule kinds,
  first-page handoff, foreground recovery, typed validation and actual per-source
  availability. Original timestamps and the Omsk Monday cutoff are retained.
- One preceding activated shell supplies its old hashed JS/CSS after an update,
  with explicit activation order so rollback does not select the wrong cache.
- Day/Week/List persists independently per workspace. Empty Day is compact and
  distinguishes saved, hidden, missing, unresolved and uncovered data. Meaningful
  enabled comparison overlays and nonempty time geometry remain.
- Subgroup shorthand prefers full real names and confirms a unique base's
  selected-week catalogue, including cold searches, before offering a subgroup.
- VUC status separates import time from server/live check time. One eligible
  personal source on Omsk today can show current/next lessons, including parallel
  lessons and saved/document qualifications.

Four Sol tasks supplied implementation commits; a fifth ran bounded performance
investigations without production code changes. Integration added the cold-search
verification and reconciled the combined behavior and documentation.

## One independent code-review round

The four reviewers inspected frozen revision `9c443a96cfe1a3b7fe6b04f0126072b353e08105`
against the original baseline. Scores below concern that pre-fix implementation,
not the final corrected revision; no rescoring or second council round occurred.

| Reviewer                     | Round 1 correctness/readiness |
| ---------------------------- | ----------------------------- |
| Terra — correctness          | 8/10                          |
| Terra — offline/protocol     | 7.5/10                        |
| Sol — navigation/persistence | 8.5/10                        |
| Sol — UI/data truth          | 8/10                          |

Parent dispositions after collecting all four independent reports:

| Finding                                                                 | Disposition and verification                                                                                                                                                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delayed older handoff replaces a newer persisted observation            | Fixed within the serialized writer: retain newer checkedAt and the original successful body at equal timestamps. Invalid entries remain replaceable. A worker regression failed before and passes after. |
| Malformed optional arrays can crash consumers after persistence         | Fixed in shared validation, including consumer element/ref shapes. Malformed week writes and corrupted stored reads are rejected. A reduced table failed before and passes after.                        |
| Rollback retains the last-created rather than preceding activated build | Fixed with activation order stored inside the existing shell cache. An A → B → A → C regression failed before and passes after; the two-shell bound remains.                                             |
| Newer Query data hides an older persisted snapshot's hard cutoff        | Fixed by scheduling both observations independently; a regression checks available → expired while Query remains fresh.                                                                                  |
| Shorthand verification uses original expiry across Omsk Monday          | Fixed by shared usability and snapshot-change policy, with explicit Sunday/Monday clocks and owner validation.                                                                                           |
| Saved VUC current/next loses its saved qualifier                        | Fixed by rendering both local-document and saved-response qualifications. No new static-copy test was added.                                                                                             |
| Product documentation promises an unknown VUC Day time scale            | Corrected: compact Day notice versus rendered Week/time-scale behavior.                                                                                                                                  |

The two Terra reviewers differed on cache-ordering severity (P1 versus P2).
It was accepted and fixed regardless. Other findings were P2. No reviewer asked
for a new framework, broader storage system, speculative feature or another round.
Fix commits: `8d0bce3` and `ccc92d8`.

## Validation and evidence limits

Final frontend suite: 171 passing tests. Synthetic importer suite: 9 passing
tests. TypeScript, affected-source lint/format and diff whitespace checks passed.
The production build passed, retaining the existing bundle-size warning.
An older shared-lesson fixture needed its declared subgroup catalogues attached
to the actual source responses; its original membership assertions were retained.

The conditional performance task exercised real SQLite cache/upstream code with
explicit synchronization and a substituted HTTP boundary. It confirmed waiting
on ordinary expired refresh and measured orphaned search work retaining source
queue slots. One superseded key still served a shared waiter. These controlled
results do not establish production latency or a safe small cancellation change;
no cache ownership/refresh redesign was selected. Narrow cache/upstream race
tests and vet passed; an initial listener restriction was resolved for the
affected upstream tests. Production Go code was unchanged.

Static previews render the actual Day/current-next components with application
CSS and neutral schedules. They demonstrate component output, not hydration,
native browser history, focus, physical-device readability or service-worker
lifecycle. Supported browser automation was unavailable. Worker VM tests cover
typed persistence, cold handoff/recovery, errors, bounds, expiry and two-version
routing, but actual offline relaunch and native two-tab activation remain open.

Lane widths/defaults remain unchanged pending an actual-app visual comparison.
Resource metadata actions remain unchanged without observed usability evidence.
Card render profiling is unverified; no speculative optimization was added.
Issue 5 remains the umbrella for these acceptance checks and investigations.
No push, pull request, merge, release or deployment was performed by this work.

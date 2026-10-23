# Campus UI/UX review

Reviewed **2026-10-23**, starting from local revision **b273be9**, then followed by
the user-approved implementation below. Dependencies and deployment are unchanged. Three independent agents
reviewed usability, visual design and accessibility; a fourth reviewed the
assembled mockups. Findings below reconcile their evidence with parent checks.

## Recommendation

### Implementation decision after focused review

The user validated items 1, 4, 5, 6 and 9 after seeing the focused examples.
Earlier approvals for 2, 7 and 8 now proceed with those changes. Item 3 is
rejected: retain the existing bundled-card presentation. For item 4, implement
selective title wrapping while retaining the current centering because moving
the content was not validated. Item 5 must be the final separate commit so it
can be evaluated and rolled back independently. Item 10 has no validation yet
and remains deferred, including both the date sizing change and short-lesson
alternatives. No push or deployment is requested.

Implementation validation: TypeScript, Oxlint, Oxfmt, all 64 frontend tests and
the production build pass. Browser checks with synthetic schedules verified
partial-result scope and the one-usable-group case, unchanged URLs, 160 × 75 px
title wrapping with centering retained, named date dialogs, focus after removing
the next/last group, disabled selected search matches and non-overlapping summary
rows. Shared-link retry checks covered recovery, cache reuse and permanent errors.
Scrollbar checks covered hover, wheel, keyboard, drag, return to idle and forced
colors, with stable geometry. Participant labels fit the tested 160 × 55.5 px
cards; the roughly 106 px fallback indicates saved hidden participants. Both
appearances were checked. No physical touch device or screen reader certification
is claimed. The build retains its existing large-chunk advisory.

### Earlier review hold — superseded by the decision above

The user prefers the existing UI and requested focused before/after examples,
not a replacement layout. **Implementation is on hold**, including changes
approved in principle, until the proposed fixes have been shown and validated.
No deployment is authorized by this review.

Recorded from the user's annotated feedback on the ten-part repair proposal:

| Item                            | Decision                                                                                                                                      | Next step                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1. Uncertain subgroup           | Revise proposal: flag the affected top group chip and calculate for the remaining usable selections, explicitly naming the excluded selection | Show partial-result scope, warning chip, and the one-usable-selection edge case                       |
| 2. Summary sizing               | Approved in principle; implementation held                                                                                                    | Retain approval after the remaining visual review                                                     |
| 3. Named bundled lessons        | Needs before/after validation                                                                                                                 | Show actual compact card dimensions and subject/subgroup treatment                                    |
| 4. Selective readability        | Needs before/after validation                                                                                                                 | Show title wrapping and long-event alignment without changing time scale                              |
| 5. Participant/freshness labels | Needs before/after validation                                                                                                                 | Show full identifiers where they fit and saved state on hidden participants                           |
| 6. Accessibility repairs        | Needs visual/interaction explanation                                                                                                          | Show contrast, accessible names, and focus after removal                                              |
| 7. Search/recovery              | Approved in principle; implementation held                                                                                                    | Retain approval                                                                                       |
| 8. Idle scrollbars              | Approved in principle; implementation held                                                                                                    | Retain approval                                                                                       |
| 9. Mobile refinements           | Needs before/after validation                                                                                                                 | Show welcome CTA and duplicate-day-heading removal                                                    |
| 10. Sizing risks                | Both reproduced; corrections await validation                                                                                                 | Show fitting date columns; compare a supplemental short-lesson list with the larger-scale alternative |

Partial results must never imply that excluded selections are free. Preserve the
requested groups and subgroups in the selection/URL; mark an excluded selection
in the chip and alongside the result. Compute for the explicitly named usable
subset, with at least two usable selections for a shared comparison. A remaining
single selection can still show its timetable. Successful empty data, usable
saved data and unknown data are distinct; no onsite lessons must not become a
reason to silently exclude a valid group. These are proposed semantics awaiting
the requested visual validation, not deployed behavior.

The earlier blanket recommendation to block all comparison output is superseded
by this explicitly scoped partial-comparison proposal. The completeness defect
itself remains real: silently dropping busy subgroup lessons is still wrong.

### Focused review evidence

The follow-up uses captures of current components with synthetic schedules and
temporary browser-only after states. Application source remains unchanged.

- Bundled card: 159 × 55.5 CSS px before and after; subject/subgroup rows replace
  the count heading, with room/type retained in details.
- Taller title card: 160 × 75 CSS px before and after; the title can occupy two
  lines. A 160 × 400 px long-event card keeps its duration while moving its
  identifying text near the top.
- Shared participants: full identifiers fit the tested 160 px card; a 106 px
  component test retains an overflow count with a saved-data marker.
- Mobile: an explicit welcome action and removal of the duplicate date heading
  reclaim 44 px without changing lesson heights or the time scale.
- At a 320 px viewport, the date popup has 247 px of content width. Its table is
  280 px with a fine pointer and 308 px with a coarse pointer. Removing the
  table minimum width fits all seven columns at about 35.3 px each, retaining
  40/44 px button heights. Arrow-key navigation, Sunday selection, Escape and
  focus return were verified. This used Chromium emulation, not a physical phone.
- Contiguous 30-minute lessons have 18 px-high targets with centres 19.5 px apart;
  their 24 px spacing circles overlap. A uniform 0.9 px/min scale yields 24 px
  targets but grows the grid from 429 to 594 px and leaves text clipping. It is
  an alternative with a scrolling cost, not the recommended default or a
  general solution for shorter events. The preferred proposal preserves the
  grid and offers equivalent actions in a comfortably sized short-lesson list;
  its placement and discoverability still require validation.

The focused review demonstrates partial-comparison states, accessible naming,
focus handoff and the optional short-lesson list. Seven panels were checked at
728 and 360 px with no horizontal overflow, missing images or script errors.
Dialog close/focus return and partial-result edge cases were exercised. These
are checks of the review artifact, not tests of an implemented application fix.

### Earlier broad proposal — superseded, retained as review history

First fix uncertain subgroup completeness. Then improve the existing aligned
calendar: readable named lessons, full participant labels, a result above the
grid, and a desktop Day option alongside Week. Keep the existing mint identity,
React/unlikely-ui stack, proportional time and domain calculations.

The latest feedback in the existing calendar-inspiration review rejects
agenda-first and availability-only replacements. The new group-lane mockup is
an explicitly separate experiment: it reserves empty space and becomes harder
with many groups or nonadjacent shared participants. It is not the recommended
default and is not covered by the current event-lane requirements.

## Prioritized findings

### 1. Unresolved subgroup identity can produce false availability — fix first

**Reproduced independently by the usability agent and parent with actual pure
domain functions. Production frequency is unknown.** Request public subgroup 2,
but supply a source catalogue entry named `Подгруппа 12`, without a `/2` mapping.
Whole-group lessons occupy 08:00–09:00 and 12:00–13:00; the subgroup lesson
occupies 09:00–12:00. Another group has those same edge lessons.

The unresolved selection returns `complete: true` and free time 09:00–12:00.
Resolving the real subgroup ID returns no free interval. The backend supports
fallback subgroup names, so this state is representable.

Evidence: `src/lib/subgroups.ts:14` returns `-1` for an unresolved number;
`src/lib/domain.ts:4` filters out subgroup lessons; `src/lib/domain.ts:67`
checks snapshot presence without subgroup resolution. The model preserves an
unresolved selection at `src/features/comparison/model/use-comparison.ts:326`.

**Current proposed fix:** mark the affected top group chip and exclude that
selection from comparison calculations. With at least two other usable
selections, calculate a clearly labelled partial result naming the included
subset and excluded selection. Otherwise show the available timetable without a
shared-result claim. Preserve known lessons, requested URL selections and
previously resolved subgroup identities across genuinely empty weeks. Do not
silently select the whole group or treat every empty catalogue as a failure.

**Acceptance:** no free or shared-presence result implies coverage of an
unresolved selection. The two-group reproduction yields no shared result while
one group is excluded; a three-group case may show a qualified partial result
for the other two. Resolving the busy subgroup removes the false window. Add
focused regressions for these states and valid empty-week behaviour after the
user validates the proposal.

### 2. The calendar hides information needed to identify lessons

**Verified rendering, with proposed usability changes.** Same-time subgroup
lessons are bundled under `2 занятия`; ordinary subject names are truncated at
10–11 px, often inside 106–160 px cards. A four-participant shared event shows
two names and `+2`, potentially hiding a saved-data marker on another participant.

Evidence: `src/lib/lesson-layout.ts:57`,
`src/features/schedule/ui/LessonCard.tsx:77`, `:189`, `:240` and
`src/features/schedule/ui/Calendar.tsx:247`. These choices partly follow the
current product rules; changing them is a deliberate design decision.

**Proposal:** named, individually labelled simultaneous subgroup events;
wrapping day-card subjects; full shared participant labels; a desktop Day view
with useful card widths. Keep true shared events once, and independent source
events distinct. Keep the original time scale proportional. The mockup uses
1 px/minute; the larger text costs visible time and horizontal scrolling in
dense scenarios. It does not promise arbitrary content fits every short event.

**Acceptance:** identify subjects and subgroup membership without opening a
sequence of popovers; four participants remain readable; exact durations and
remote busy time stay correct. Test longer subjects, short events and many groups
before implementation acceptance.

### 3. Desktop separates the result from its controls, and summary text overlaps

**Parent browser reproduction using synthetic schedules.** At 1440×1000 the
week region starts at y=260 and the summary begins at y≈864. The summary's
qualification and slogan overlap in the captured fixture. At mobile width,
the summary correctly precedes the grid, whose region starts at y=381.

Evidence: `src/features/comparison/ComparisonPage.tsx:206`, `:268`;
`src/features/comparison/ui/ComparisonSummary.tsx:51`, `:161`.

**Proposal:** reuse a compact result/freshness block above the calendar on both
screen sizes. Remove fixed text-row constraints and the duplicated lower result.
Reduce the mobile header by removing its repeated day heading; preserve date
navigation and group controls. Keep a precise explanation of inferred presence.

**Acceptance:** exact selected-day results are visible before the timetable;
long and saved results do not overlap other text. Missing responses and unresolved
subgroups never receive a successful comparison highlight. No UI width change
may change the computed schedule result.

### 4. Small accessibility repairs have clear value

- **Saved text contrast:** one live dark-theme saved-card color pair measured
  approximately 4.32:1; installed-token calculations found additional borderline
  pairs. Use the normal ink foreground while retaining saved backgrounds,
  clocks and wording. Verify all generated colors and mixed/striped variants
  against the normal-text 4.5:1 criterion. This is not a full contrast audit.
  Evidence: `LessonCard.tsx:82`, `:104`, `:163`.
- **Lesson dates:** week-view lesson accessible names omit the date, and generic
  day containers do not programmatically associate each lesson with its heading.
  Add date before time/participants. Evidence: `LessonCard.tsx:81` and
  `Calendar.tsx:198`.
- **Date popup names:** both popup containers lack a title/label despite the
  underlying library using dialog semantics. Add a concise Russian accessible
  name. Evidence: `ComparisonToolbar.tsx:100`, `MobileDayNav.tsx:74`.
- **Deletion focus:** removal has no explicit next-focus destination. Focus a
  remaining visible group control or Add Group after commit. The code gap is
  verified; the exact browser fallback was not reproduced. Evidence:
  `GroupStrip.tsx:277`, `:350`, `use-comparison.ts:288`.
- **320 px date picker:** installed minimum month-table widths exceed the
  popup's available content width. This is a code-derived reflow risk requiring
  a rendered fine/coarse-pointer and zoom check, not a confirmed screenshot bug.

Acceptance should include keyboard-only removal/open/close, one real screen
reader, both appearances, and narrow date selection. Existing arrow-key day
navigation moved both date and focus correctly in the agent's live check.

Standards context: [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [name, role, value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html).
These sources explain the criteria; they do not certify this application.

### 5. Make selection and recovery messages truthful

**Already selected:** search removes selected groups before choosing its empty
message, so a successful exact match can say the group was not found. Distinguish
`Эта группа уже добавлена` from a genuine empty response.
Evidence: `src/features/groups/ui/GroupPicker.tsx:34`, `:56`.

**Shared-link recovery:** transient catalogue resolution failure offers only
navigation to `/`. Add `Повторить открытие` while retaining the original URL,
date and subgroup. Do not add a force-refresh mechanism or bypass cache limits.
Evidence: `src/features/comparison/model/use-comparison.ts:477`, `:506`,
`src/features/comparison/ComparisonPage.tsx:159`.

**Affected data:** identify the missing group alongside the result, retaining
existing per-group timestamps/details. Ordinary missing snapshots are already
blocked correctly; unresolved subgroup identity is the separate defect in item 1.

## Reviewable mockups

The companion interactive review provides:

- Readable calendar, experimental group lanes, and actual current-app captures.
- Phone and full-width desktop presentations, light/dark appearance, day/week.
- Normal, simultaneous subgroup, unavailable group, unresolved subgroup,
  saved-data, four-participant shared, and long-class fixtures.
- Exact-time lesson dialogs, keyboard date navigation and focus return.
- A small checklist for selecting the first implementation slice.

All content is synthetic and labelled as such. Current-app screenshots use the
same ordinary two-group schedule as the proposed normal scenario. Other scenarios
are exploratory illustrations. Search, sharing and date-picker details are
clearly marked demonstrations, not complete product implementations. The mockup
does not connect to a production API, create bookings or send messages.

The prototype reviewer found five issues: retained presence shading after
switching to unresolved data, overly broad wording about current completeness,
inconsistent four-group selection/status, absent week time labels/dialog dates,
and insufficient week card widths. All were addressed before presentation.

## Validation and limits

- Parent captured the current checkout in a separate browser context with
  intercepted synthetic API responses, at desktop and mobile sizes.
- Final mockup pass covered **56 combinations**: two layouts, seven scenarios,
  widths 320/390/728/1440. No document overflow or clipped event content in those
  fixtures; shared/long scenarios retained one event; incomplete scenarios had
  no free highlight. Week content intentionally scrolls within its region.
- Additional checks covered six week scenarios, visible time labels, mode
  switching into unresolved data, date keyboard navigation, Escape/focus return,
  a dark appearance smoke check, before-image loading and zero runtime errors.
- Usability agent ran seven relevant test files: **40 tests passed**.
  Accessibility agent separately passed keyboard and color-assignment tests.
  Those tests do not establish contrast, screen-reader or touch conformance.
- T3 snapshots repeatedly timed out; public-site access was inconsistent.
  Some agents obtained live DOM evidence, but deployed SHA parity was not
  established. Parent screenshots are local-checkout evidence, not production
  screenshots. Live mobile, complete offline recovery, touch, zoom and screen
  readers remain unverified. There has been no end-user usability study.

## Suggested implementation order

1. **Correctness:** unresolved subgroup completeness and its regression fixture.
2. **Bounded repairs:** saved text, lesson dates, popup names, deletion focus,
   already-selected copy and summary overflow.
3. **Chosen design slice:** top result, compact navigation, readable day cards
   and named simultaneous lessons. Confirm the changed width/participant rules.
4. **Separate experiment:** fixed group lanes only if comparison tasks improve.

Use the same tasks for current and proposed UI: find a named lesson; identify
all its participants/subgroups; compare simultaneous lessons; find an exact
shared break; explain why missing/unresolved data cannot support a conclusion.
Record accuracy and required interactions before claiming improved usability.

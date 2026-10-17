# UX, accessibility and microcopy review — 2026-10-17

Scope: source review of the Svelte client and product/domain documents, plus current first-party documentation research. This is a proposal, not an implementation or a conformance audit. Design preferences below are explicitly recommendations; no user study establishes that one Russian label or mobile layout is objectively best.

The delegated reviewer's T3 browser repeatedly returned `Preview automation snapshot timed out after 15000ms.` An isolated tab was opened, but navigation/snapshot verification did not complete. The CUA fallback had no browsers and returned `Browser is not available: iab`. The delegated findings are grounded in code/CSS; the parent reviewer separately provided DOM measurements from a synthetic local fixture, explicitly attributed below. Neither reviewer established field CLS or real-device behavior.

## Priorities

| Priority | Change                                                                                 | Why first                                                                                                     | Evidence                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| P1       | Preserve source membership in lesson labels                                            | Current labels can misrepresent whole-group lessons and change with the representative copy of a shared event | `src/lib/subgroups.ts:28`, `src/lib/lesson-layout.ts:26`, `src/components/LessonCard.svelte:44`                                      |
| P1       | Keep usable same-group/week snapshots visible; move stale detail into stable status UI | Reduces disappearance and moving content without concealing uncertainty                                       | `src/components/Calendar.svelte:154`, `src/components/ComparisonStatus.svelte:57`, `src/lib/schedules.svelte.ts:31`                  |
| P1       | Remove arbitrary initial group suggestions                                             | Current names/IDs are hardcoded and look like personalized recommendations                                    | `src/components/GroupPicker.svelte:32`                                                                                               |
| P2       | Compact mobile controls before shrinking calendar text                                 | Several independent rows delay the useful schedule; small helper text is already difficult to read            | `src/components/ComparisonToolbar.svelte:193`, `src/components/MobileDayNav.svelte:53`, `src/components/ComparisonStatus.svelte:130` |
| P2       | Consistent plain-language mode labels and concise explanations                         | Current labels vary across toolbar, summary and help                                                          | `src/components/ComparisonToolbar.svelte:30`, `src/components/ComparisonSummary.svelte:62`, `src/components/HelpDialog.svelte:32`    |
| P3       | Focused keyboard navigation, then optional shortcuts                                   | High value without making a dependency or desktop detection a prerequisite                                    | `src/components/GroupStrip.svelte:154`, `src/components/Calendar.svelte:107`                                                         |

## Cached data and stale appearance

The current implementation already keeps calendar cards during a same-key background refetch: `source.pending` is based on `isPending`, whereas `source.fetching` uses `isFetching` (`src/lib/schedules.svelte.ts:63`); the calendar only shows its skeleton when loading and no schedule has a snapshot (`src/components/Calendar.svelte:154`). The detailed desktop timeline has the same condition (`src/components/DayDetail.svelte:93`). Do not describe every refetch as replacing cached cards with skeletons.

The observed cold-load experience can still be slow because TanStack's memory cache must be populated after a restart, a genuinely new group/week has no same-key response yet, and the persistent response path may wait for the network. Trace the actual slow path before changing cache architecture. TanStack documents immediately returning existing query data while refetching in the background; this supports retaining a correct cached response, not displaying a previous week's lessons under a new date. [TanStack caching lifecycle](https://tanstack.com/query/latest/docs/framework/react/guides/caching).

Recommended visible states:

| Data state                                  | Calendar                                                 | Stable status line                                         | Comparison                             |
| ------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| Fresh cached snapshot                       | Normal cards                                             | `Проверено в 10:42`                                        | Normal                                 |
| Usable snapshot, revalidation running       | Keep cards; subtle background treatment if already stale | `Проверяем обновления…` with last check available          | Keep result for these exact selections |
| Revalidation failed, usable snapshot exists | Keep cards, mark affected group/participant sections     | `Сохранённое расписание · проверено …` plus details button | Explain that result uses saved data    |
| One group unavailable, no usable snapshot   | Show available groups; label missing group in status     | `Нет данных для одной группы`                              | No free/presence claim                 |
| Snapshot exceeds retention                  | Do not render it as usable                               | `Сохранённые данные устарели`                              | No comparison claim                    |
| New group/week without cache                | Skeleton only where data is genuinely absent             | `Загружаем…`                                               | Wait for required inputs               |

The code already preserves original freshness deadlines and rejects snapshots past the stale grace period (`src/lib/cache-policy.ts:13`, `src/lib/cache-policy.ts:41`); retain those rules. `compareDay` correctly refuses complete comparisons when a snapshot is missing (`src/lib/domain.ts:66`).

The current yellow warning inserts an arbitrary number of paragraphs directly above the calendar (`src/components/ComparisonStatus.svelte:57`). Replace this with one reserved status row and an expandable/popover explanation. The existing row already has a minimum height and fixed message width (`src/components/ComparisonStatus.svelte:75`, `src/components/ComparisonStatus.svelte:92`), so it is a natural place to consolidate state. Avoid duplicating a warning in both a banner and a toast. Removing this insertion should reduce a potential layout-shift source; it does not prove a CLS improvement until measured. Google recommends reserving space and avoiding unexpected content insertion. [Optimize CLS](https://web.dev/articles/optimize-cls).

Agree with a subtler visual stale treatment, with two safeguards:

- Do not lower opacity on the entire interactive card: it also fades text, focus rings and participant identifiers and resembles disabled UI. Prefer a less saturated background/border while preserving text contrast. Ordinary text generally needs 4.5:1 contrast; large text has a 3:1 threshold. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Dimming cannot be the only stale signal. Keep visible words such as `Сохранённые данные`, a last-check timestamp and an accessible status update. An affected group chip or participant sector can carry a small clock marker. Mixed fresh/stale shared lessons require participant-specific provenance rather than fading every group. [W3C use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

## Compact mobile proposal

Source evidence explains the vertical cost: mobile retains a 77px selected-group strip (`src/components/GroupStrip.svelte:275`), a separate full-width week row and mode row (`src/components/ComparisonToolbar.svelte:193`), a 46px status row (`src/components/ComparisonStatus.svelte:75`), a separate Today/day/week row and 54px weekday buttons (`src/components/MobileDayNav.svelte:53`, `src/components/MobileDayNav.svelte:86`). The header also retains 52px branding plus padding and a margin (`src/components/SiteHeader.svelte:50`, `src/components/SiteHeader.svelte:143`). These accumulate before the schedule. This is code evidence of stacked controls, not a measured screen position.

The parent reviewer then measured a populated **synthetic** fixture at 390×844 CSS pixels: seven lesson cards; calendar top **458.42px**; summary top **992.5px**; toolbar **206.42px** tall; header **77.33px**; status **46px**; mobile view controls **45.33px**; weekday strip **64px**; calendar **473px**. In a three-error unavailable-data scenario, the banner added **130.33px**, moving calendar top to **588.75px** and summary top to **1122.83px**. These DOM observations corroborate the vertical-control issue and the warning insertion cost. They are not measured CLS, and the preview's stale/composited screenshot dimensions were unsuitable as independent pixel evidence.

Recommended first design iteration:

1. Keep one compact brand/action row. Drop decorative vertical cost in an active comparison while retaining the established visual identity.
2. Use a horizontally scrollable selected-group row with a 44–48px visible chip target and a subgroup indicator. Open subgroup/removal/order controls from that chip. Keep the add action visible. This saves a row without introducing tiny remove/subgroup controls inside a chip.
3. Combine the month/week title, previous/next actions and `Сегодня` in one navigation row. Put day/week view in a small view menu, or beside the mode toggle where width allows. Do not duplicate the selected day's heading above a day-only calendar when the weekday strip already identifies it.
4. Use one 44px weekday strip; make mode controls one short row. Put freshness into a stable compact metadata line, not a new alert block.
5. Keep the day calendar as the default. Consider an optional agenda list for dense concurrent events rather than compressing all parallel lanes into unreadable cards. An agenda is a separate product decision, not required for the first compact pass.
6. Replace the always-visible explanatory paragraph under the calendar with a short legend and a help disclosure. Its mobile text is currently 9px (`src/components/Calendar.svelte:343`); compactness should remove repetition rather than further reduce this font.
7. Consider a concise result row close to the calendar heading, e.g. `Без занятий: 12:10–13:30`, with expanded details below. Current mobile summary follows a roughly 429px time grid plus header (`src/components/Calendar.svelte:37`, `src/components/Calendar.svelte:114`) and has a fixed 88px internal scroller (`src/components/ComparisonSummary.svelte:107`). Avoid requiring a second small scroll area to read several intervals.

Do not simply reduce every target to 24px. WCAG 2.2 AA defines a 24×24 CSS pixel minimum with exceptions; larger targets remain easier to activate, and the enhanced criterion is stricter. Aiming for around 44px on frequent mobile controls is a design recommendation. Keep the compact visuals and useful hit areas distinct. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Duration geometry is an intentional product rule (`docs/product.md:24`), and the calendar explicitly keeps a stable clock scale across weeks (`src/components/Calendar.svelte:39`). Start by removing stacked navigation, not by changing duration geometry or clipping the top/bottom of a day. Later, test scrolling to the first lesson without silently hiding early/late events. Validate 320px and 390px widths, long group names, four or more groups, overlapping lessons, an empty day, unavailable data, dark theme, text zoom and the software keyboard in search.

## Russian wording

The product's presence is an inferred interval between first and last in-person lessons, including breaks. Free time is only inside all groups' shared presence, and online lessons still occupy time (`CONTEXT.md:17`, `CONTEXT.md:24`, `docs/product.md:3`). A label must not imply real location, any free time in a day, or guaranteed ability to meet in one building.

| Context                     | Recommended                         | Other reasonable options                       | Pitfall                                                                                      |
| --------------------------- | ----------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Presence mode, short toggle | `В вузе`                            | `Общее время в вузе`, `Пересечение расписаний` | Short wording needs the explanatory definition; the last option is less precise              |
| Free mode, short toggle     | `Без занятий`                       | `Без пар`, `Время для встречи`                 | `Без пар` is conversational; `Время для встречи` can overpromise location/travel feasibility |
| Presence result heading     | `Общее время в вузе`                | `Пересекаемся в вузе`                          | The latter keeps the casual voice but sounds like confirmed presence                         |
| Free result heading         | `Все без занятий`                   | `Общее свободное время`                        | Explain the shared-presence boundary nearby/in help                                          |
| No free interval            | `Нет общего времени без занятий`    | `В этот день не пересекаемся без занятий`      | `Все заняты` is stronger than the data proves                                                |
| Data freshness              | `Проверено …`, `Сохранённые данные` | `Показано сохранённое расписание`              | `Обновлено` can imply that the timetable itself changed                                      |

Suggested help text: `В вузе — общее время между первой и последней очной парой каждой группы.` / `Без занятий — время внутри этого пересечения, когда свободны все. Онлайн-занятия тоже учитываются.` A small caveat remains in help: `Присутствие предполагаем по расписанию. Корпуса могут различаться.` Existing help already acknowledges both facts (`src/components/HelpDialog.svelte:56`).

Use the same names in toolbar, summary, help, calendar legend and accessible labels. Preserve internal `presence`/`free` identifiers and domain definitions unless the domain itself changes. This wording recommendation is editorial judgment, not an externally validated localization finding.

## Add-group popup

The first three rows are selectable hardcoded catalog entries, not skeletons: IDs 373–375 and labels ИВТ-241/242/243 (`src/components/GroupPicker.svelte:32`). They lack a section label explaining why these groups appear. The search already waits for two characters and debounces 300ms (`src/components/GroupPicker.svelte:21`, `src/components/GroupPicker.svelte:42`).

Smallest recommendation: show no rows initially, focus search, and use `Введи название группы` / `Например, ФИТ-232`. Preserve a stable result region while typing so the dialog does not jump. The current result region reserves 120–290px (`src/components/GroupPicker.svelte:176`); make the empty state intentional rather than a blank hole.

Alternative later: show locally stored recent selections under `Недавно добавляли`, excluding already selected groups. A cohort shortcut such as ФИТ-231, ФИТ-232 and МО-231 can be useful for a personal preset, but it should be explicitly named and resolved against real catalog data. Do not invent IDs, imply these are every visitor's groups, or silently treat a program/year prefix as proof of a shared university stream. Hardcoding another three groups would exchange one unexplained recommendation for another.

## Subgroup labels must describe the lesson

`lessonGroupLabel` returns the selected subgroup before examining the event's subgroup membership (`src/lib/subgroups.ts:28`). Consequently a whole-group event becomes `ИВТ-233/2` when subgroup 2 is selected. Existing tests explicitly expect this result (`src/lib/subgroups.test.ts:24`), so a fix must intentionally change those expectations.

Use selection only to filter which lessons are included (`src/lib/domain.ts:4`); use source membership to label each included lesson. A source lesson with no subgroup restriction should display `ИВТ-233` even when subgroup 2 is selected. A source lesson restricted to subgroup 2 should display `ИВТ-233/2`; selecting `Вся группа` continues to show source subgroup distinctions.

There is a second provenance issue: the shared-event map stores only the first group's `Lesson` copy and adds other `Selection` members (`src/lib/lesson-layout.ts:26`). The card then passes that same event to each member's subgroup catalog (`src/components/LessonCard.svelte:44`). If copies of the same event have group-local subgroup membership, one group's copy can label another group incorrectly; changing order or filtering the representative copy can change displayed labels. Preserve each participant's source lesson/membership in the block representation while keeping one shared visual event. Do not add subgroup IDs to the event identity merely to hide this: that would split genuinely shared events. Cover whole-group and subgroup-restricted participants, a shared source identity, reversed input order and selected-subgroup filtering with regression tests.

## Keyboard navigation and TanStack Hotkeys

Native keyboard access already exists in several places: group reordering supports Alt+Left/Right and an announcement (`src/components/GroupStrip.svelte:154`); lesson cards are Bits UI popover triggers; the calendar is a focusable scroll region (`src/components/Calendar.svelte:107`); the page has a skip link (`src/components/ComparisonPage.svelte:239`). Keyboard navigation should extend these patterns before adding global commands. W3C requires comparable keyboard operation for functionality, not a hotkey library. [W3C keyboard guidance](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).

TanStack Hotkeys does have a Svelte adapter, `@tanstack/svelte-hotkeys`, with `createHotkey`, scoped `createHotkeyAttachment`, reactive enabled options, input handling and lifecycle cleanup. The current live homepage says **beta**; some indexed/old pages still say alpha. Treat the current Svelte documentation and the installed version's types as the integration authority, not old blog snippets. [Current Hotkeys homepage](https://tanstack.com/hotkeys/latest), [Svelte guide](https://tanstack.com/hotkeys/latest/docs/framework/svelte/guides/hotkeys), [Svelte quick start](https://tanstack.com/hotkeys/latest/docs/framework/svelte/quick-start).

Recommended order:

1. Add Left/Right day navigation and PageUp/PageDown week navigation scoped to the focused day selector/calendar navigation surface. Preserve native scrolling behavior in the time grid rather than overriding arrows globally. Keep Enter/Space activation and Escape handling in the existing components.
2. If broader commands are useful, add a discoverable shortcut list and a command for group search. Evaluate common browser/OS conflicts before choosing combinations. Ignore text fields, contenteditable and composition events; pause app-level handlers while a dialog or calendar popup owns focus.
3. Avoid global unmodified letter shortcuts unless there is an off/remap mechanism or focus scoping. These can fire through speech input. [W3C character-key shortcut guidance](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html).
4. For a few commands, a small native handler can satisfy YAGNI. TanStack becomes useful when scopes, layouts, conflicts and help metadata would otherwise be rebuilt. No bundle-cost claim is made here because this dependency has not been installed or measured in this project.

Do not equate viewport width or `(hover: hover)` with keyboard availability: a phone/tablet can have a keyboard, and a narrow desktop window remains keyboard-driven. CSS interaction queries describe pointing devices and explicitly do not account for keyboard interfaces. [W3C Media Queries interaction features](https://www.w3.org/TR/mediaqueries-4/#mf-interaction).

If adopting the library, dynamically import a small Svelte keyboard component when a keyboard interaction or explicit `Горячие клавиши` action shows intent; preloading on large screens can be an optimization hint. Initialize Svelte registrations inside the component's normal lifecycle, clean them up on unmount and do not swallow the first key while its module is loading. Ordinary Tab/focus/native activation must remain available at every width.

## Suggested validation for the next implementation

- Regression tests: source-membership labels, shared-event participant provenance and reorder invariance; same-key stale data retained; uncached new week never displays another week's lessons; missing group never yields a complete comparison.
- Browser scenarios: cold and warm start, network delay/failure, partial groups, expired saved data, unchanged refetch, dark theme and long labels. Measure actual layout shifts and time to visible cached content before/after rather than judging skeleton removal alone.
- Mobile tasks: add a group with the software keyboard open, switch day/week, change subgroup, read several free intervals and open a narrow overlapping lesson. Check 320×568 and 390×844 layouts with synthetic non-personal data.
- Accessibility: complete tasks using Tab/Shift+Tab/Enter/Escape; verify focus stays visible, dialogs return focus, status text is announced once, muted cards meet contrast, and touch targets remain usable.

No runtime dependency or application source was changed in this research pass.

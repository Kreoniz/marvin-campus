# Calendar R14 implementation and council record

Date: 2026-10-30. Implementation baseline: `574f368`. Round 1 reviewed
`8f7a0d1`; round 2 reviewed `97ec6b9`. Exactly two council rounds were completed.
Interrupted first-round Terra attempts were retained separately; recovered Terra
reviews are provisional and are not additional rounds or approvals.

| Independent member |            Round 1 | Round 2 |
| ------------------ | -----------------: | ------: |
| Sol interaction    |             7.5/10 |  8.5/10 |
| Sol data           |               8/10 |    9/10 |
| Terra visual       | 7.5/10 provisional |    8/10 |
| Terra product      |   8/10 provisional |  8.5/10 |

Scores describe the reviewed revisions and each member's bounded coverage. Final
post-round-2 fixes received regression checks, not another independent review or
an increased score.

## Delivered scope

1. Day, Week and secondary timelines expand vertically and use page scrolling;
   horizontal schedule navigation remains available.
2. Tall military cards include teachers where complete inline entries fit. Their
   complete popup list starts collapsed; short cards and List retain full access.
3. Lecturer/room grid and List text, metadata and links have a visible opaque halo.
4. Secondary Week detail is timeline-only; primary Day/Week/List remains.
5. Shared cards use full-width ordered member sectors, with readable dense
   remainders and complete membership in details.
6. Desktop Week has Today, including repeated reveal without duplicate history.
7. Unknown document lesson kinds omit the question-mark badge; available document
   cards stay static. Configured originals download as verified PDF/DOCX bytes,
   independently of selected-date coverage.
8. The source-band chooser uses the design-system Select with focus transfer.
9. Narrower time rails/gutters preserve presence-bracket and focus clearance.
10. Compact chips retain drag without a visible grip. Management supports native
    desktop drag, touch move buttons and keyboard alternatives.
11. Legend and settings use the concise labels “В вузе” and “Общие окна”.
12. Themed thin scrollbars reserve space below controls; forced-color and reduced
    motion fallbacks remain.
13. Spotlight lives inside schedule menus, supports several schedules and uses
    pressed fill without decorative checks.
14. Compact header gaps retain 44px action targets.
15. Help shows basics first, with calculations, keyboard and offline details in
    closed disclosures.

## Accepted findings and disposition

Round 1 consolidated five material defects: mobile popup controls outside the
viewport, intermediate management-drag history, duplicate Today history, cold
selected-day reveal consumed before usable geometry, and indistinct mobile
selected dates in forced colors. All were fixed before round 2 and independently
checked in representative round-2 cases.

Round 2 accepted two P2 findings from Sol interaction. The final patch:

- Places compact fine-pointer hover previews beside the card when a horizontal
  side fits. With neither side available, details require an explicit press.
  Bounded compact press/touch placement and desktop hover pinning remain.
- Restricts strip drag-click suppression to physical chip targets. Portaled menu
  actions bypass capture suppression; fresh keyboard activation clears stale
  suppression. Actual drag-release suppression and fresh pointer reset remain.

Other round-2 members reported no material defect within their checked scope.
That is bounded evidence, not blanket certification. No third council was run.

## Final validation and limits

TypeScript, lint, all **116 frontend tests**, production build and formatting of
changed files passed. The existing main JavaScript chunk warning remains at
approximately **722 kB minified**. No dependencies or backend source changed in
the final patch; earlier Go race and original-serving checks remain applicable
and were not rerun as fresh final-pass checks.

Final actual-app Chromium checks used isolated sequential contexts with service
workers blocked. The confirmation interaction harness passed **13/13** cases:
coordinate hover/pin/second-close at desktop, 700×720 and 900×480; management
history/cancellation and alternatives; strip/menu focus; Today/repeated reveal;
initial reveal; mobile bounds and forced colors. Three additional short-height
coordinate runs passed, including normal motion. The first broad run retained
one 900×480 pinning failure; a diagnostic run and subsequent uninstrumented runs
passed without a further source change. Its cause was not established, so
intermittent timing remains a limitation rather than a claimed resolved cause.

Additional harnesses passed seven mixed-input/publication/dense cases, nine
popup/access cases, and fourteen card/resource result groups. Seven gallery
acceptance cases plus one separately labelled diagnostic passed. Actual popup
checks compare complete exact-date fields, teachers and printed intervals to the
local API. Neutral eight-member/nine-entry and 30-selection fixtures are labelled
as fixtures, including distinct unavailable and empty states.

Both actual original downloads completed through the browser and matched the
configured files byte-for-byte: PDF **145,063 bytes**, DOCX **77,053 bytes**.
Earlier round-2 data review also compared all represented imported weeks/lessons
and coverage decisions; that audit was not repeated by the final frontend pass.
Document availability remains independent of coverage and snapshot usability.

Screenshots and operational evidence remain outside tracked documentation.
The gallery labels earlier R13 images as local-before references, never
production; current screenshots use actual app data except explicitly marked
dense fixtures. No screenshots, attachments, imported records or identities are
included in this tracked record.

Touch and forced colors are emulated Chromium. Physical devices, Firefox/WebKit,
screen-reader speech, software keyboards, zoom matrix, formal contrast ratios,
full PWA/offline lifecycle and every refresh/retention race were not certified.
No service restart, staging, commit, push or deployment was performed by this
final implementation pass. Existing local frontend/API services remain running.

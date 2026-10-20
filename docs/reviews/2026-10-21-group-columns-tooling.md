# Fixed group columns and frontend tooling

Date: 2026-10-21. React migration branch only; no production or main changes.

## User decisions and implementation

- The compact day view uses permanent group columns in selection order. Empty
  groups reserve space; unavailable groups have an explicit unknown-data label.
  Column headers retain the group's color marker. Cards remain at most 160 px
  wide. Dense selections scroll horizontally inside the calendar.
- Shared source events repeat only in their participants' columns, retaining the
  same block, participant list, freshness and popover. They do not span unrelated
  groups. Distinct overlapping events split only their own group slot.
  `group-lanes.ts` is a pure display projection; comparison calculations and the
  existing week-grid overlap layout remain unchanged.
- The selected week column uses the published DS selection color at 50% strength.
  Presence remains amber and free windows green. The selected-day heading is bold.
- The subgroup display toggle is an icon beside data status and link copying.
  It retains its local preference and keyboard toggle semantics. A separate
  single-option header popover is no longer needed.
- Contrasting subgroup labels and patterned edge strips are two mockup concepts,
  awaiting a user choice. Neither replaces the existing shades in the app yet.

## Simplicity review

An independent subagent reviewed feature boundaries, runtime dependencies,
controller responsibilities, unused code and tooling. The existing app/features/
shared structure is sufficient; a new state or routing framework is unnecessary.

Implemented bounded cleanup:

- Removed the unused `motion.ts`; reduced-motion handling already uses CSS/media
  queries at the call sites.
- Replaced serialized `--chip:` declarations and repeated string slicing with
  `chipColor`, which returns a CSS color value. All 30 palette values remain
  identical.
- Removed the redundant settings popup and its header slot.

Optional later cleanup: extract the already self-contained schedule query/cache
hook from the comparison controller, and name long mode/freshness class
conditions. These are maintenance opportunities, not required fixes. Redundant
legacy normalized layout fields should be considered separately after the new
layout is reviewed.

## Tooling

Standalone Oxlint 1.89.0 and Oxfmt 0.74.0 replace Prettier, retaining Vite, pnpm,
TypeScript and Node's test runner. Formatting remains single quotes and 80
columns, without import, package or Tailwind sorting. CI runs both lint and format
checks alongside the existing checks. React Hooks and JSX accessibility rules
are enabled. React Compiler diagnostics are disabled because this build does not
use the compiler. Named scrollable regions remain keyboard-focusable; custom DS
focus management is distinct from native DOM autofocus.

## Verification and limits

- TypeScript, 72 Node tests, Oxlint, Oxfmt, Vite production build, diff and
  private-file checks pass. Six new tests cover projection, reserved empty and
  unknown slots, order, shared events and local overlap boundaries.
- Browser checks at 320, 430, 844×390 and 1280 px found no horizontal page
  overflow or cards outside their calendar columns. Dense day grids intentionally
  scroll internally. Compact status actions are 44×44 px.
- Checked real shared lessons among nonadjacent group columns: copies appear
  only in participant columns, and their popover retains the full participant
  list. Checked both themes, selected-column color, bold heading and keyboard
  activation of the icon toggle without changing the URL.
- Independent skeptical source review found no remaining blocking issue after
  adding the unavailable-column label. No screen-reader or physical-device test
  was performed. The existing main-chunk size advisory remains in Vite output.

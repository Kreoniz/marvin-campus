# React UI refinements

## Scope

- React code is grouped under `app`, `features/comparison`, `features/groups`,
  `features/schedule` and `shared/ui`. Pure calculations and existing tests remain
  in `src/lib`; the comparison hook belongs to its feature.
- Removed app component stylesheets. Tailwind utilities live beside markup;
  the stylesheet entry only loads Tailwind/unlikely-ui, the font and theme/variant
  declarations. Computed schedule coordinates and categorical colors remain
  dynamic styles. No dependency or DS fork was added.
- Restored DS typography by removing the unlayered font reset. Contextual
  headings use scoped utility sizes; editable search remains 16 pixels.
- Stabilized search geometry, filled allocated day lanes, removed redundant
  green backgrounds and simplified freshness rows without discarding timestamps.
- Mobile refinements are a separate commit after the structural and core fixes,
  so they can be reverted independently.

## Mobile behavior

- Grouped comparison controls/result/freshness; no recurring single-group upsell.
- Kept direct day/week switching and seven-day navigation. Week arrows are
  44 by 44 pixels. Today is in the date picker at widths up to 360 pixels.
- Used a 32-pixel time rail with short visual hour labels and full accessible
  times. Preserved the common time scale and event durations.
- Short landscape uses compact controls, arranged horizontally when space
  permits, and does not duplicate the desktop day timeline.
- Lesson details use more of the narrow viewport. No new agenda or weekly
  result mode, automatic axis cropping or background scroll jumps were added.

## Validation

- TypeScript, all 61 existing tests, production build and diff/format checks.
- Independent review of actual DOM/computed styles, both themes, date keyboard
  navigation, URLs, semantic token colors and preserved unknown/saved states.
- Chromium CSS viewports: 320, 390, 430, 844 by 390, and desktop. No page-level
  horizontal overflow. Week and dense simultaneous events may scroll internally.
- A two-group example at 390 by 844 starts the grid at 369 pixels versus 421
  after the core fixes. Short landscape starts at 247 pixels; desktop retains
  its week grid and selected-day detail.
- At 390 by 844, the search dialog and input kept their positions from empty
  query through two entered characters: dialog height 628, top 108, input top 301.
- Verified hourly grid gradients and `container-type: size` after catching a
  Tailwind candidate immediately adjacent to a template interpolation. Utility
  boundaries now contain spaces so the scanner includes these classes.
- Build still reports the existing main-chunk size advisory. Transfer/CPU/LCP
  profiling was not part of this UI change; no performance improvement is claimed.

These checks do not establish full WCAG conformance. Physical mobile keyboards,
screen readers, touch/coarse pointer and text zoom still need device validation.
Production, backend and main were not changed.

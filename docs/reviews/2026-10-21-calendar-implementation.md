# Calendar refinements

Implemented in the separate React branch after the 20–21 October review.
No production deployment or change to main.

## Changes

- Presence highlights use dedicated amber fill/edge roles, with theme-specific
  OKLCH values. Calendar, selected-day timeline and legend share the roles.
  Saved ranges retain the mode color, a weaker fill and dashed edges.
- Vertical cards keep the 160 px maximum and a capped 166 px lane pitch, giving
  a 6 px gap. Overlap components, source identity, time position and duration
  calculations are unchanged. The horizontal timeline still uses temporal width.
- Card press feedback uses an inset shadow without translation.
- The header retains one desktop auto margin, keeping decoration beside actions
  on the right; compact actions keep their own auto margin.
- A public unlikely-ui Checkbox in “Вид расписания” enables subgroup shades.
  It defaults off and persists locally. Source membership determines the shade;
  whole-group, ambiguous, missing and saved membership keep the base palette.
  Parallel bundles keep their base background, while individual fresh events
  may use their subgroup shade in details. Subgroups beyond 1/2 fall back to base.

Related colors are derived from the DS category tokens without new dependencies:
[good-css OKLCH specimen](https://good-css.com/specimen/oklch-color),
[MDN relative OKLCH](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch).
New semantic presence roles do not override DS warning or selection roles.

## Validation

- TypeScript and production build pass; 66 tests pass, including five new tests
  for source subgroup membership and fallback behavior.
- Browser: at viewport 430 px the two evening cards remain 160 px wide and have
  a 6 px gap, compared with 26 px before. Trusted pointerdown/up has identical
  card coordinates and no translation.
- Settings: keyboard Tab/Space toggles the Checkbox; Escape restores focus to
  its trigger. Preference survives navigation. At 320 px the popup stays inside
  the viewport, its Checkbox target is 44 px tall, and the label wraps.
- No page-level horizontal overflow at 320/430 px or 844 × 390 landscape.
  Dense calendar content retains intentional internal horizontal scrolling.
- Theme QA: amber highlights in both views and right-aligned desktop decoration
  were checked with computed styles and screenshots. Browser-composited subgroup
  colors were measured for all six DS colors, two subgroups and both themes.
  Lowest text/background contrast: about 6.08:1 dark and 9.33:1 light, using the
  ordinary card foreground. This is not a claim of full WCAG conformance.
- Independent Astra review found no concrete regressions in geometry, saved
  states, portal theme handling, preference flow or generated utilities.

Physical mobile devices and screen readers were not tested. The existing main
bundle-size advisory remains. Shared-lesson layout is unchanged: four interactive
concepts were prepared separately for choosing a subsequent iteration.

# Mobile controls and installation icon — 2026-10-19

## Implemented

- Mobile day/week selection is a two-button group with a pressed state and
  direct activation. Its controls sit outside the week-navigation hotkey scope.
- The short week label omits a repeated month. On narrow screens longer ranges
  wrap within the same control row instead of truncating the date.
- The mobile comparison panel uses the full available width, recovering the
  previous 20–24px outer inset. Header, controls and card content keep spacing.
- Online lessons have a two-pixel dashed outline. Shared, ordinary and saved
  cards have contrasting outline colors in both themes.
- Dark 192px, 512px and Apple touch icons replace the installation references.
  The stronger dark character outline has an ivory keyline. Versioned paths
  are part of the PWA shell and build hash; the launch background is dark.
  Provenance and the exact generation prompt are in [assets](../assets.md).
- [Analytics](../analytics.md) now documents all 15 existing named events,
  triggers and parameters. No tracking event or property was added.

## Time scale proposal

Keep hourly lines, display `8`, `9`, `10` instead of `08:00`, and narrow the
mobile rail from 46px to about 28px. This gives cards another 18px without
losing their temporal alignment. Exact lesson start/end times remain in the
details and accessible card labels. Removing the rail entirely would make
parallel lessons harder to compare. This remains a visual proposal; the
application's time rail has not been changed.

## Validation

- Svelte check: zero errors and warnings; frontend tests: 59 passed; production
  build passed.
- Browser checks used an isolated synthetic source and database at 320px,
  390px and 1280px. No page-level horizontal overflow was observed. On mobile
  the comparison starts at the left content edge; desktop retains its 20px inset.
- A single click selects week/day; returning to day resets horizontal scroll.
  Arrow keys on the new toggle do not change the displayed week. A two-month
  date range fits at 320px within the 46px-high control row.
- Fresh shared online cards and saved ordinary online cards retained the
  two-pixel dashed border in light and dark themes. Saved-data status remained
  visible after an injected source failure.
- Built manifest image sizes, opaque RGB output, stripped metadata and offline
  precache paths were verified. The bright icon foreground has a maximum
  radius of approximately 167.5px around the 512px canvas center, inside its
  204.8px maskable safe radius. The Apple touch icon is 180×180.

`mobileView` remains Svelte 5 `$bindable` state: the two buttons write the same
value that the previous select used, and the parent's `bind:mobileView` updates
the calendar. Moving the buttons outside `data-schedule-week` preserves that
state change without accidentally turning their arrow keys into week navigation.

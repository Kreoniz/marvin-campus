# Calendar and VUC presentation polish

This follow-up implements the owner's latest interface feedback locally. It is not a deployment or an additional council round.

## Changes

- Presence brackets have their own gutter, clear of lesson borders and the external hover/focus outline. Fixed card widths and domain intervals remain unchanged.
- Personal VUC uses the published unlikely-ui Select. Selecting an option keeps the lesson popup pinned and does not change comparison participants or links.
- Tall military cards, including source references, fit complete personal VUC entries to measured free space. Status and an accurate remaining count retain reserved space. All printed intervals wrap.
- The VUC calendar comes before result and document explanations, defaults to 09:00, preserves real earlier/later events, and uses page scrolling vertically. The repeated secondary VUC calendar was removed.
- Mobile puts the calendar directly after date controls. Brief results, freshness and closed document notes follow it. Source headings have a smaller minimum height and still grow with long labels.
- Result cards show intervals or one unavailable/no-overlap result, plus a short partial count. Membership and qualifications are closed by default; expanded cards grow naturally without an internal scrollbar. The redundant footer separator was removed.
- Active teacher/room spotlights use categorical fills in grid and list. Focus controls transition color over 150ms, honoring reduced motion.
- Selection-strip edges fade only where additional chips remain offscreen; visible keyboard focus and forced colors disable the fade. Excluded VUC outlines stay inside the common 44px chip height. Header actions have smaller gaps and date labels are centered.
- TanStack Hotkeys adds physical Vim keys with persistent opt-out: h/l, Shift+h/l, j/k, gg/Shift+g, t, /, 1/2/3 and ?. Editable fields, composition and visible overlays retain keyboard ownership.

## Validation

- TypeScript, lint, production build and 114 tests pass.
- Actual-app checks cover 320/390/700px mobile widths and desktop, DS selection with parent-popup pinning, Russian physical keys, composition/input/dialog guards, view/date/scroll commands and the persisted shortcut opt-out.
- Actual military data fits four personal entries; synthetic long entries with 3, 8 and 30 selected schedules retain unclipped status, complete visible rows and the correct remaining count at 240/320/520/800px heights.
- Week and source-oriented Day brackets leave five pixels between the colored edge and the card body, including room for the three-pixel external interaction outline. VUC Day/Week show the full vertical range without a local vertical scrollbar.
- Spotlight text contrast was measured in dark and light themes; both grid and list retain the same categorical fill. Keyboard focus disables the edge fade.
- Browser checks recorded no page errors. Screenshots are local evidence and are not tracked with source data.

The build still reports its existing large-chunk warning: the main chunk is approximately 716 kB minified (230 kB gzip). No backend, source-data, deployment or comparison-calculation change is included.

## Primary references

- [TanStack React Hotkeys](https://tanstack.com/hotkeys/latest/docs/framework/react/guides/hotkeys): physical key codes, input handling and hook options.
- [Sequences](https://tanstack.com/hotkeys/latest/docs/framework/react/guides/sequences): arrays registered through useHotkeys; the removed useHotkeySequence API is not used.
- [Provider and scopes](https://tanstack.com/hotkeys/latest/docs/framework/react/guides/hotkeys-provider-and-scopes): the small integration needs no provider.

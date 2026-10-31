# unlikely-ui alpha.3 — app integration verification

The app dependency changed from exact `0.1.0-alpha.2` to exact
`0.1.0-alpha.3`, using `pnpm add -E unlikely-ui@0.1.0-alpha.3` from the app
root with the existing mise/pnpm setup. The manifest and lockfile belong to the
same integration commit. The existing pnpm release-age exception now names only
alpha.3; runtime pins and other dependencies are unchanged.

Verification was completed as a separate upgrade after Campus 0.2.0. The
published 0.2.0 tag and image retain their checked alpha.2 dependency set.
The integration is included in [Campus 0.2.1](../releases/0.2.1.md); activation
evidence is recorded separately in the deployment runbook.

## Integration decisions

- Followed the [version-matched migration guide](https://github.com/Kreoniz/unlikely-ui/blob/v0.1.0-alpha.3/USAGE.md#upgrades-and-validation).
  `Dialog.Content` now supplies a corner close button by default. HelpDialog,
  DisplaySettings and GroupPicker explicitly opt out with
  `showCloseButton={false}`, retaining their existing Russian close controls.
- The application Theme explicitly sets `lang="ru"`. Built-in Dialog and
  Popover portals inherit that language and the originating appearance; the
  document already declares Russian independently.
- GroupPicker keeps its custom bare `Combobox.Input` layout. No composed-input
  replacement, import rewrite or extra trigger/clear buttons were introduced.
  The app does not use removable ComboboxChip controls.
- The app retains its Omsk date policy, local-noon Calendar conversion, Russian
  locale, explicit today, date bounds and URL serialization. ScrollArea retains
  its explicit compound parts and app-owned scrollbar visibility policy.
- These dialogs have no dirty-save workflow or busy dismissal guard to migrate.
  Search can close during a pending request; completing or cancelling that
  request must not reopen the dialog or steal focus. Settings remain immediate.

## Validation

Passed with alpha.3 installed:

- Frozen-lockfile installation and supply-chain policy verification.
- App `check`, `lint`, all 140 existing tests and production `build`.
- Changed-file formatting and `git diff --check`.
- Eleven unique Chromium scenarios using the actual app and isolated neutral
  HTTP fixtures, with no university or production-data requests:
  Help, Settings and Search in both themes; custom Russian close names without
  an extra English Close; tab containment after focus transfer, Escape,
  backdrop/custom dismissal and focus return; bare-input keyboard search and
  add; closing pending search without focus theft; Russian Calendar month
  controls, keyboard date selection and Omsk Today from a Los Angeles browser
  timezone; 320px light/dark dialogs, explicit horizontal ScrollArea composition
  and keyboard scrolling, shared-lesson Popover and Week; 320px Calendar bounds,
  portal language/theme and keyboard focus return. No page errors were recorded.

No application regression was established in these checks. The existing
bundle-size warning remains: the main JS chunk is 730.82 kB, 234.85 kB gzip.
Visual inspection covered the narrow settings/search/calendar captures.

## Evidence limits

The shared preview navigation and snapshot both timed out, so the browser
checks used isolated Playwright Chromium. An initial harness incorrectly
expected the mobile Day surface on desktop and was stopped. The subsequent
pass exposed premature assertions around Base UI focus guards, lazy Calendar
loading and cancellation of a pending request on dialog closure. Corrected
state-based waits and cancellation handling passed all six affected cases;
the successful cases were retained, with a separate narrow Calendar check.
Those attempts remain in ignored local evidence rather than being discarded.

Browser checks exercised the Vite app; the production build was checked
separately. This is Chromium coverage, not physical-device or cross-browser
certification, nor validation of the library's unexported gallery experiments.

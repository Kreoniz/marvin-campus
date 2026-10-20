# React and unlikely-ui migration

The owner requested the published design system and React in an isolated
worktree. Branch: `feat/react-unlikely-ui`, based on `main` at `af9739f`.
This is a local preview; production and the main branch were not changed.

## Implementation

- React/React DOM 19.3.1, TanStack React Query 5.104.5 and the exact published
  `unlikely-ui@0.1.0-alpha.1`. Its shipped usage guide and public declarations
  were inspected before implementation. Components use public package subpaths.
- Buttons, cards, dialogs, combobox, subgroup selects, popovers, segmented
  radios, calendar, notifications and skeletons use the design system.
  Theme boundaries carry light/dark settings and the mint accent into portals.
  Schedule geometry remains application CSS; category fills and selection
  colors use separate semantic roles. The chosen M2 and public name remain.
- `use-comparison.ts` owns the selected view, URL/history, async opening,
  queries, saved snapshots, deadlines, catalogs, colors and analytics.
  `pwa.ts` exposes the worker/install state through `useSyncExternalStore`.
- Svelte, Bits UI and their build tooling were removed. Go/net/http/SQLite,
  pure schedule calculations, URL codecs and the service worker contract remain.
- The date picker is loaded on demand. Both generated JS chunks, the mascot,
  fonts, icons and the complete design-system license enter the offline cache.
  The main chunk remains above Vite's advisory 500 kB threshold; this is a
  further performance optimization opportunity before production rollout.

## Verification

- TypeScript and all 61 existing behavior tests passed; the production bundle
  builds. No pure calculation tests were weakened or removed.
- Browser flows exercised public group search with pointer/keyboard selection,
  subgroup changes without reloading full weeks, day/week toggle, mode/date
  changes, readable URLs, Back/Forward, ordering focus and lesson popovers.
- Independent state/skeptic and UI reviews found a clipped date label, inherited
  mobile line heights and a keyboard guard that counted closed listboxes as
  open. All were fixed and retested. The summary's placeholder now uses valid
  block nesting rather than putting the library's block Skeleton inside a p.
- At 320 and 390 pixels the reviewed controls fit without page overflow.
  Dark appearance was checked in group, date and lesson portals.
- The built PWA offered and activated a new shell while preserving comparison
  state. With the local API stopped, reloading its saved comparison still
  rendered all 28 lesson cards, retained the original check time and marked
  cards/results as saved. The local API was then restored. Hard cache-expiry
  rules retain their existing automated coverage.

## Local development

Run the Go API with a separate ignored local database and chosen listen port.
For example, `LISTEN_ADDR=127.0.0.1:8086 go run ./cmd/campus`, then
`CAMPUS_API_ORIGIN=http://127.0.0.1:8086 pnpm dev --host 127.0.0.1 --port 5175`.
The Vite app is at <http://127.0.0.1:5175>; a built app is also served by the
Go API after `pnpm build`. No production database or secrets are needed.

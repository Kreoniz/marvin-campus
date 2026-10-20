# Architecture

- `cmd/campus`: application configuration and graceful HTTP shutdown.
- `internal/httpapi`: routes, validation, response policies and client limits.
- `internal/cache`: SQLite snapshots, freshness, same-key load coalescing and
  admission of at most 32 distinct refreshes. Fresh hits and existing-flight
  joins do not consume another refresh slot. Eviction recency writes have minute
  precision; snapshot check and expiry times are independent of recency.
- `internal/upstream`: one active source request, at most 32 admitted requests,
  cancellable queue waiting (25 seconds), 500 ms spacing and source cooldowns.
- `internal/schedule`: normalization and source cache lifetimes.
- `internal/share`: reading permanent legacy comparisons. Public creation is
  disabled; the existing database and links are retained.
- `src/lib`: pure schedule calculations, reversible URL encoding, query options,
  selection state, link synchronization, PWA integration and analytics policy.
- `src/components`: React components use unlikely-ui controls and semantic theme tokens.
  The app owns schedule geometry in schedule.css, control layout in controls.css
  and shared page layout in app.css. TanStack React Query owns browser request state;
  the service worker owns persistent offline responses. The active view reads
  exact group/week saved responses with `saved-schedules.ts`, orchestrated by
  `use-comparison.ts`, while normal requests run. This transient fallback never overwrites Query data or errors.
  Deadline timers update stale/expired state in an idle tab and on Omsk Monday.
  Unknown groups in readable links resolve through a pool of three catalog
  lookups; URL order and ambiguity rejection are preserved.

The API returns 429 plus Retry-After for a client limit, and 503 plus Retry-After
for local refresh saturation. Source failure is separate; saved data remains
visible with an honest warning. The generous per-client burst permits loading
up to 30 groups behind a shared NAT. Forwarded addresses are considered only
when the direct peer belongs to explicitly configured trusted proxy CIDRs.

## Reversible group codes

`ФИТ-232` stays `fit-232`. Letter tokens that can be decoded in more than one way
are separated after `~`: `Ю-232` is `~yu-232`, `ЫУ-232` is `~y_u-232`, `Ц-232`
is `~ts-232`, and `ТС-232` is `~t_s-232`. Latin original letters use l-prefixed
tokens: `FIT-232` is `~lf_li_lt-232`. This preserves alphabet identity and mixed
codes. The decoder accepts a compact code only when it has exactly one decoding.
No format-version parameter is required. Old ambiguous unseparated codes require
a fresh link rather than an arbitrary choice of the first matching group.

`s2` means public subgroup number 2. Exceptional catalog names use `gID`; a
subgroup without a public number uses `sidID`. Old `/s/id` comparisons already
contain source IDs and remain readable. Duplicate catalog names with distinct
source IDs must be resolved through explicit selection, never first-match lookup.

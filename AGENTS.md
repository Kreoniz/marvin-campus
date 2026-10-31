# Working conventions

- Public name: Кампус (Campus); repository and Go module: marvin-campus.
- Read README.md, docs/product.md and docs/architecture.md before implementation. Use the user's current design references.
- Implement with Go, net/http and SQLite on the backend; React 19, TypeScript, Vite, pnpm, Tailwind CSS v4 and unlikely-ui on the frontend. Match the supplied mockups; the original React component library is not a requirement.
- Telegram integration and Telegram buttons are deferred. After implementation, teach the user Go and React through this project's code, building on their Python, Node and older Svelte experience.
- Keep the solution small; prioritize YAGNI, KISS and then DRY. Add only dependencies with clear value.
- Use small atomic Conventional Commits. Run the narrowest relevant validation.
- Read CONTEXT.md for domain terms. Keep schedule calculations pure. Never interpret an unavailable group's data as an empty schedule.
- This app owns only Umami tracker integration and its events; analytics service operations are maintained separately.
- Keep secrets in ignored environment files; do not print credentials.
- Never track private operator notes, actual server IPs, SSH configuration, personal filesystem paths, student identities, database dumps, logs or backups. Use neutral examples in repository documentation; keep operational records outside Git.
- Before pushing, review the staged diff, run the affected validation below and the privacy checks in docs/security.md. Full release gates are separate from ordinary iteration. Preserve third-party asset licenses. Do not add an open source license without the owner's choice.
- Rewrite published history only on the user's explicit request, after verifying a private backup of all refs and uncommitted files. Use force-with-lease with an explicit expected remote SHA; stop and inspect if the lease fails. Verify a fresh clone and prevent old refs from reintroducing removed history. Ordinary work uses small atomic Conventional Commits.

## Testing

- Test meaningful behavior: calculations, state transitions, HTTP contracts, persistence, privacy, parsing, saved links and accessibility interactions. Unknown or unavailable data must remain distinct from empty schedules.
- For logic/data/protocol bugs, first reproduce the failure with the smallest relevant regression. Extend an existing case or table before adding a test. Cover each contract at its lowest sufficient layer; do not repeat it through wrappers or in unrelated suites.
- Skip tests for type guarantees, trivial expressions, callback forwarding, copy, static rendered attributes or private implementation details. Remove a duplicate only when the retained case protects the same behavior; do not target a test count or delete useful coverage because its code is short.
- Keep schedule logic pure and exercise real core logic. Use isolated SQLite or filesystem fixtures when persistence, queries, transactions or file semantics matter; substitute external HTTP and other external boundaries. Parser fixtures must be reduced and neutral. Tests must not require live university access or writable production data.
- Use explicit clocks and await observable state, channels or completion signals. Do not synchronize with arbitrary sleeps, polling loops or retries that hide failures. Real timing checks need a timing contract; distinguish sandbox/listener failures from application failures.
- During iteration run only affected tests, scoped lint/format and relevant type checking. For example, use `mise exec -- node --test src/lib/url.test.ts` or `mise exec -- go test -run '^TestExactName$' ./internal/httpapi` with the actual affected file/test. Do not run whole-repository suites, repeated builds or browser matrices by default. Broaden only for an explicit request or a stated uncovered integration risk; CI owns the routine full suites.
- Pure visual changes use before/after captures, without permanent spacing/color/alignment tests. Collision safety, shared-event identity, keyboard behavior, history and focus are behavioral contracts even when expressed through geometry. Avoid freezing incidental pixel values or duplicating layout formulas in expectations.
- When an interaction needs browser proof, make one focused integrated pass after implementation. Recheck affected cases after a fix or unresolved failure; reuse successful evidence for unchanged code. Keep disposable browser scripts and screenshots outside Git unless they are maintained test fixtures.
- Documentation-only changes need factual, link and command checks, not an application build. Release/security and exact-artifact activation checks remain in docs/security.md and docs/deployment.md; their command lists are not a checklist for every edit. Report checks actually run and material limits.

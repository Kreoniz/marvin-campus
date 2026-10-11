# Working conventions

- Project name: Marvin Campus; repository name: marvin-campus.
- Read README.md, docs/product.md and docs/architecture.md before implementation. Use the user's current design references.
- Implement with Go, net/http and SQLite on the backend; Svelte 5, TypeScript, Vite, pnpm, Tailwind CSS v4 and Bits UI on the frontend. Match the supplied mockups; the original React component library is not a requirement.
- Telegram integration and Telegram buttons are deferred. After implementation, teach the user Go and Svelte 5 through this project's code, building on their Python, Node and older Svelte experience.
- Keep the solution small; prioritize YAGNI, KISS and then DRY. Add only dependencies with clear value.
- Use small atomic Conventional Commits. Run the narrowest relevant validation.
- Read CONTEXT.md for domain terms. Keep schedule calculations pure. Never interpret an unavailable group's data as an empty schedule.
- This app owns only Umami tracker integration and its events; analytics service operations are maintained separately.
- Keep secrets in ignored environment files; do not print credentials.
- Never track private operator notes, actual server IPs, SSH configuration, personal filesystem paths, student identities, database dumps, logs or backups. Use neutral examples in repository documentation; keep operational records outside Git.
- Before pushing, review the staged diff and run the checks in docs/security.md. Preserve third-party asset licenses. Do not add an open source license without the owner's choice.
- Rewrite published history only on the user's explicit request, after verifying a private backup of all refs and uncommitted files. Use force-with-lease with an explicit expected remote SHA; stop and inspect if the lease fails. Verify a fresh clone and prevent old refs from reintroducing removed history. Ordinary work uses small atomic Conventional Commits.

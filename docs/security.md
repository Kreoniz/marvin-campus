# Repository and release checks

Keep credentials, operator notes, actual server addresses, SSH configuration,
private paths, database dumps, logs, backups and personal student data outside
tracked files. Ignoring a file does not remove it from Git history. Use neutral
documentation and explicitly stage reviewed files.

Before pushing:

```sh
python3 scripts/check-private-files.py --history
gitleaks git . --log-opts=--all --redact
gitleaks dir . --redact
pnpm check
pnpm lint
pnpm format:check
pnpm test
pnpm build
go test -race ./...
go vet ./...
```

Run the directory scan on the prepared tracked release tree, not a directory
containing private `.env` files or backups. Redacted reports belong outside Git.
CI pins its actions and Gitleaks binary and runs the history/current-tree checks.
Secret-pattern scans are not proof of rights to images or absence of hidden
data in image pixels; inspect raster metadata and provenance separately.

## History replacement

Only rewrite published history on explicit owner instruction. Verify a private
backup of all refs, worktree changes and relevant Git objects first. Record the
remote main SHA, prepare and test the sanitized tree as a new root commit, then
push only main with `--force-with-lease=refs/heads/main:<expected-SHA>`. A failed
lease requires inspection of new remote work, not a blind force retry.

Check all remote branches/tags, clone again and repeat scans and validation.
Keep old operational provenance privately and ensure old refs or clones cannot
accidentally reintroduce the removed history. Old commits can remain in other
clones, forks, PR references or GitHub caches; a force push alone does not purge
those copies. If credentials are discovered, revoke/rotate them first.

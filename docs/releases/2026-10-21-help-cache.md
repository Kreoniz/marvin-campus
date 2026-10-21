# Shorter help and current-week cache — 2026-10-21

Production: <https://campus.kreoniz.ru>.
Application revision: `1c81a436ab00dc57004facca8a3908ca51180b63`.
Image: `marvin-campus:2026-10-21-help-1`.
Runtime image ID:
`sha256:bd4123c53106b8b62a9433b114750455d4a178bdfa30083a99037dd770722555`.

The owner requested simpler help and less frequent current-week updates before
recording a demo. Help now explains the two comparison modes, opening a lesson,
saved-data markers and installation. Keyboard instructions are collapsed.
Implementation details about colors, badges and cache lifetimes were removed.

Current-week freshness is now 30 minutes in Go and the browser. Future weeks
remain one hour, past weeks and group searches one day. Refreshes are on demand,
not a background polling promise. Existing snapshots keep their original
deadline: old ten-minute responses are not extended or erased. Their next
successful source refresh uses the new policy.

## Validation

- TypeScript, Oxlint, Oxfmt, 67 frontend tests, build, Go race tests and vet passed.
  Updated regressions cover reuse after 20 minutes, the 30-minute deadline,
  Monday's future-to-current transition and retained older server deadlines.
- History/private-file and Gitleaks history/tracked-tree scans passed.
- The exact Docker image passed 38 local HTTP checks and public HTTPS passed
  the same 38 checks, including all 35 static hashes, CSP and PWA identity.
- Fresh schedules for two groups in the local runtime and a fresh public
  production snapshot have a 1,800-second lifetime. Repeated reads retain
  the same check/expiry seconds; SQLite stores timestamps at second precision.
  An existing production response was also observed retaining its old
  600-second lifetime, consistent with the transition policy above.
- Browser DOM checks verified the new help and collapsed keyboard section,
  including an actual 390×844 viewport. Updating the preceding PWA preserved
  the comparison URL and activated shell `campus-shell-2927dcf0bac1`.
  Preview screenshots were not used as visual evidence.
- [GitHub CI](https://github.com/Kreoniz/marvin-campus/actions/runs/39535663359)
  could not start because of the account's billing/spending limit; its
  annotation was checked. Local and image checks passed independently.

Activation verified a consistent, protected SQLite backup and all 108 legacy
links, including a stored payload through the public API. The data volume,
Compose, shared proxy and non-image environment settings are unchanged.
The container is healthy, non-root, read-only and exposes no host port.
The previous `marvin-campus:2026-10-21-react-1` image and protected backups
remain available for rollback.

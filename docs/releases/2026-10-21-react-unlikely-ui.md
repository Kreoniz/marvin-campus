# React and unlikely-ui — 2026-10-21

The owner explicitly requested merging the React branch into main and deploying
production. Main advanced from `af9739f` to the checked application revision
`002648811ec889d91ceb265922d8cb26b74f63c2` by fast-forward, then was pushed.

Production: <https://campus.kreoniz.ru>.
Image: `marvin-campus:2026-10-21-react-1`.
Runtime image ID:
`sha256:9f69eafe622cb04607a4edce9a98e4add8954ad82bd31c8cf4a49339e2554abd`.

## Result

The frontend uses React 19, TypeScript, Vite, Tailwind CSS v4 and the published
`unlikely-ui` package. Oxlint and Oxfmt handle linting and formatting. Go,
net/http, SQLite and the backend source are unchanged from the preceding main.

The release includes compact mobile navigation, fixed group columns in the
mobile day view, restored amber presence highlights, static lesson cards on
press, and the reviewed desktop header arrangement. Subgroup shade variations
were removed at the owner's request; subgroup numbers remain visible. The
proposed subgroup marker concepts are deferred.

Public name Кампус, M2 artwork, mint accent, both themes, readable and legacy
links, stored choices, PWA identity, cached schedule semantics and analytics
minimization are preserved. Implementation decisions and known tradeoffs are
recorded in the [migration review](../reviews/2026-10-20-react-unlikely-ui.md)
and [group-column review](../reviews/2026-10-21-group-columns-tooling.md).

## Validation

- TypeScript, Oxlint, Oxfmt, all 67 frontend tests and the production build passed.
  Go race tests and vet passed. The Docker build independently ran TypeScript,
  the frontend tests and its production build from the exact tracked revision.
- Private-file/history and Gitleaks full-history/tracked-tree scans passed.
  Third-party license files remain in the runtime and PWA shell.
- The exact runtime image passed 38 local HTTP checks. Independent public HTTPS
  checks also passed all 38: health, application routes, HTML metadata, CSP,
  manifest identity, and all static files. All 35 static hashes, including the
  app shell, match the extracted runtime image.
- Public catalog searches and current-week schedules for two groups returned
  valid, non-stale snapshots with lessons and freshness timestamps.
- A browser with the preceding Svelte PWA offered **Обновить**. Activating it
  loaded the React entry `index-Bc_g6TtE.js`, preserved the comparison URL,
  both selected subgroups, date, mode and light theme, and retained the
  `11:10–11:35` common break. The old shell cache was removed; the active shell
  is `campus-shell-c8f9e7d7a3ee`, alongside the existing public-data cache.
  No application alert was present after updating.
- Browser DOM checks worked, but preview screenshots repeatedly timed out with
  `Preview automation snapshot timed out after 15000ms.` The resize tool also
  failed to apply the requested viewport. A fresh mobile visual inspection was
  therefore not completed during this deployment; earlier design reviews are
  not presented as new production screenshot evidence.
- [GitHub CI](https://github.com/Kreoniz/marvin-campus/actions/runs/39534349144)
  could not start because of the account's billing/spending limit. The run's
  annotation was checked; this is separate from the successful local and image
  validations above.

## Activation and rollback

Activation verified the transferred image archive hash and revision, then made
a consistent SQLite backup and protected copy of the previous image setting.
The new container is healthy, runs as the existing non-root user with a
read-only filesystem, and exposes no host port.

SQLite integrity, all 108 existing legacy-link rows, the data volume, Compose,
shared proxy configuration and non-image environment settings were preserved.
A stored legacy link was independently read through the public API and matched
its stored payload. Protected backup permissions and integrity were checked
again after activation.

The previous `marvin-campus:2026-10-20-campus-1` image and protected backups are
retained. Activation automatically restores that healthy image if its checks
fail. A later application rollback selects the retained image and its saved
image setting; this frontend-only release needs no database restore.

Existing PWA clients can choose **Обновить** without clearing site storage.

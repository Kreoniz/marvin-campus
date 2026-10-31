# Deployment

Deployment remains manual by the owner's choice. GitHub CI validates the
repository; the 0.2.2 main revision passed its validation job. No deployment
credentials or SSH key installation was required for this release.

## Current release 0.2.2 — 2026-10-31

[Campus 0.2.2](https://github.com/Kreoniz/marvin-campus/releases/tag/v0.2.2)
is active at <https://campus.kreoniz.ru> from revision
`4165588c1b3b6690851c999a7fa9c1199f45858b`, image
`marvin-campus:4165588c1b3b6690851c999a7fa9c1199f45858b`, with OCI version
`0.2.2` and image config ID
`sha256:00beaf8ceadfc4b4f196a8a0c6376f966f4572c00d78d34239090a696b6d812f`.
The compressed image archive SHA-256 is
`ef2368072db4bd1b51e9f4e6f431041b3a1223b936c0bfd801832ac835b84de2`.
[GitHub CI](https://github.com/Kreoniz/marvin-campus/actions/runs/41166394948) passed
on the exact source revision identified by the Git tag and image.

The receiver activated the healthy image at `2026-10-31T04:00:21Z` after a
consistent SQLite backup. All 108 legacy comparisons retained their count and
digest. Separate before/after hashes confirmed unchanged Compose, non-image
environment and VUC dataset/originals. Hardening, networking and the existing
volume were preserved. The previous healthy
`marvin-campus:988ea766bcc9120e417b04a6282aaf96a97a4e34` image and
private backups remain available for rollback.

Independent HTTPS verification matched all 35 built files, health, three
app-shell routes, six VUC week responses and the exact 77,053-byte original.
The isolated local runtime passed the same HTTP checks before activation.

The spotlight reload failure was reproduced before the fix. Two new storage
regressions and nine focused app browser scenarios passed, including delayed
link/workspace restoration, removal, clearing, separate VUC preferences and
320px layouts. Release checks passed: all 134 frontend tests, TypeScript, lint,
formatting, production build and privacy/Gitleaks scans; CI also passed Go
race/vet. Unchanged importer/updater and receiver checks were reused. The existing
bundle-size warning remains. See [release behavior and browser limits](releases/0.2.2.md).

## Previous release 0.2.1 — 2026-10-31

[Campus 0.2.1](https://github.com/Kreoniz/marvin-campus/releases/tag/v0.2.1)
was activated at <https://campus.kreoniz.ru> from revision
`988ea766bcc9120e417b04a6282aaf96a97a4e34`, image
`marvin-campus:988ea766bcc9120e417b04a6282aaf96a97a4e34`, with OCI version
`0.2.1` and image config ID
`sha256:ee7061ba3d4353cbd8cab955fc4ad387eca1595eeecceff30de05314e3077f21`.
The compressed image archive SHA-256 is
`fceeae27668d83628e80183825c42093a3f627327d9c50d531275c8d0a17b77c`.
[GitHub CI](https://github.com/Kreoniz/marvin-campus/actions/runs/41161332880)
passed on the exact release revision. The Git tag and runtime image identify
that same commit; the activation record is a later documentation-only commit.

The receiver activated the healthy image at `2026-10-31T02:48:35Z` after
creating a consistent SQLite backup. All 108 legacy comparisons retained their
count and digest. Separate before/after hashes confirmed unchanged Compose,
non-image environment settings and current VUC dataset/originals. Container
hardening, networking, the named volume and absence of host ports were retained.
The previous healthy `marvin-campus:440ad797b815387892aa69e12456b47bd791d713`
image and private backups remain available for rollback.

Independent HTTPS verification matched all 35 built files, public health,
three app-shell routes, all six VUC week responses and the exact 77,053-byte
original. Historical original access remained unavailable. The isolated local
runtime passed the same HTTP checks before activation.

Release validation passed: 132 frontend tests, TypeScript, lint, tracked-tree
formatting, production build, privacy and Gitleaks scans. CI also passed Go race
and vet. Eleven existing actual-app alpha.3 Chromium scenarios apply to the
unchanged UI implementation. Importer/updater and receiver source trees are
identical to 0.2.0, so their nine and 17 successful checks were reused. The
existing frontend bundle-size warning remains. See [the release changes](releases/0.2.1.md)
and [browser coverage limits](reviews/2026-10-31-unlikely-ui-alpha3.md).

## Previous release 0.2.0 — 2026-10-31

[Campus 0.2.0](https://github.com/Kreoniz/marvin-campus/releases/tag/v0.2.0)
was activated at <https://campus.kreoniz.ru> from merge revision
`440ad797b815387892aa69e12456b47bd791d713`, image
`marvin-campus:440ad797b815387892aa69e12456b47bd791d713`, with OCI version
`0.2.0` and image config ID
`sha256:7a0008afdaedefca83f97fbc879ad826be7ea48b3998f3445767dcdfbe8f871c`.
The compressed image archive SHA-256 is
`9dc73ad52a7ce86cfe59304e00e6cbdf15c2d9029b4c6a8afc13d5c6b6549eec`.
[PR 4](https://github.com/Kreoniz/marvin-campus/pull/4) was merged after successful
GitHub CI. The tag, image revision and merged source identify the same commit.

The receiver activated the image at `2026-10-31T02:10:23Z`, after verifying its
provenance and creating a consistent SQLite backup. All 108 legacy comparisons
retained their count and digest. Non-image environment settings, networking,
container hardening and the named volume were preserved, apart from the two
explicit VUC configuration fields described below. The previous healthy
`marvin-campus:cf8dffa29446d7176d4ad33b19ffcd7e63565780` image and private backups
remain available for rollback.

The current semester document set is stored in the existing data volume,
outside the image and Git: six platoons and 476 imported lessons. A separate
Compose override adds only `VUC_DATA_PATH` and `VUC_ORIGINALS_DIR`; the base
production Compose file is unchanged. The previous configuration was backed up
before adding this override. See [the document workflow](vuc.md).

Independent HTTPS verification matched all 35 built file hashes, public health
and three app-shell routes. All six VUC week endpoints responded with the
expected type, the current original download matched its supplied 77,053 bytes
exactly, and a historical original remained unavailable. This release used DOCX;
successful live PDF parsing was not exercised.

Release checks passed: 140 frontend tests, TypeScript, lint, tracked-tree
formatting, build, Go race tests/vet, nine importer/updater tests, 17 receiver
validation/rollback tests and privacy/history/Gitleaks scans. Two compiled-image
browser scenarios covered the lane setting, shared-card popup and current VUC
download presentation. Their tested candidate and the merged release image have
identical runtime layers. The existing frontend bundle-size warning remains.

The first streamed upload timed out before activation. Uploading the same archive
to private staging and feeding it locally to the unchanged receiver succeeded;
its checksum, size, provenance, backup and rollback checks were retained.

## Previous release — 2026-10-30

The approved calendar UI was activated at <https://campus.kreoniz.ru> from revision
`cf8dffa29446d7176d4ad33b19ffcd7e63565780`, image
`marvin-campus:cf8dffa29446d7176d4ad33b19ffcd7e63565780` with image ID
`sha256:6018701a838d9d6fcd21d77b2ee6329f6bda918a7cc195dfb9a8e1ebd9bb98d4`.
The compressed image archive SHA-256 is
`7e4f119f7d38f7d141c60e1f11789568227c1e6e2f5e179860660be0a9f300ac`.

The manual receiver verified provenance, created a consistent SQLite backup,
activated a healthy container and preserved the count and digest of all 108
legacy comparisons. Production Compose, networking, the named volume and all
non-image environment settings were retained. Independent HTTPS verification
matched all 35 built file hashes, health and two app-shell routes. The previous
`marvin-campus:2026-10-24-ui-1` image remains available for rollback.

Release checks passed: 76 frontend tests, TypeScript, lint, tracked-tree
formatting, build, Go race tests/vet, 17 receiver validation/rollback tests and
privacy/history/Gitleaks scans. [PR 3](https://github.com/Kreoniz/marvin-campus/pull/3)
was merged into `main` as `94d082a6fb975ab211498da0bbf6cc74f77913b3`; animation and
teacher/room work were not included in that release.
At that time GitHub Actions jobs were blocked by account payments/spending
limits, and the owner chose manual delivery. No deployment secrets were installed
in GitHub. This historical restriction did not affect the 0.2.0 validation job.

## Release artifact

Build from the exact committed tracked tree. Keep local reports, environment
files and other untracked material out of the build context. Use Node 26 in the
frontend image and preserve the project's pinned pnpm version.

Tag the image `marvin-campus:<full 40-character commit SHA>` and attach these
OCI labels at build time:

- `org.opencontainers.image.source=https://github.com/Kreoniz/marvin-campus`
- `org.opencontainers.image.revision=<the same full commit SHA>`
- `org.opencontainers.image.version=<the package version, for example 0.2.0>`

An additional build/run URL label is useful for CI-built images but is optional
for manual releases. Export the single tag with `docker save`, compress it with
gzip, and record the SHA-256 of the compressed archive.

## Receiver installation

The receiver assumes the existing Campus project at `/opt/marvin-campus`,
Compose project `marvin-campus`, service `app`, the existing `.env` and cache
volume `marvin-campus_cache` mounted at `/data`. The database is
`/data/campus.sqlite`. Verify these facts against the live host before use.
Do not replace production Compose with the repository's example: production
networking, DNS, proxy membership and environment must remain unchanged.

Install `deploy/receive.sh` and `deploy/receive.py` root-owned, without group or
world write permission, under `/opt/marvin-campus/deploy/`. The host requires
Python 3.11 or newer, Docker with Compose, and normal HTTPS certificate trust.
The receiver makes no university-source requests and requires no application
credentials. It must run through the existing authorized admin SSH connection.

For the manual release, set `SSH_ORIGINAL_COMMAND` to the exact string
`deploy <revision> <compressed archive SHA-256>` when invoking the installed
receiver, and pipe the archive to its standard input. Use the existing private
SSH alias; never put host addresses or private key paths in this repository.
The receiver accepts no other commands. A future restricted deployment key can
force this same receiver, but installing such a key is outside this release.

## Activation and rollback

The receiver serializes deployments and bounds compressed input to 256 MiB and
expanded input to 768 MiB. It validates every tar entry, the single expected
RepoTag, the image config's source/revision labels and non-root command before
loading the archive. Modern `docker save` archives with `blobs/sha256` config
paths are supported. The config hash is checked against the loaded image ID.
Existing immutable image tags cannot be overwritten with different contents.

Before activation, the previous image must be healthy and still match its tag.
The receiver saves the existing environment file and a consistent SQLite backup
using SQLite's backup API. `quick_check` must pass. Backup files and immutable
release evidence remain root-private under the host's `backups` directory.
The count and digest of legacy comparisons are checked without recording their
payloads in the evidence.

Only `CAMPUS_IMAGE` changes in `.env`; Compose is run with no build or pull and
without recreating dependencies. The receiver checks image ID, non-root user,
read-only root filesystem, capability drops, no-new-privileges, the named cache
volume and absence of host port publication. It then checks internal health,
the canonical public `/`, referenced JS/CSS assets, service worker and manifest.
Internal and public file hashes must agree. The canonical `/` is intentional:
other app-shell routes can have route-specific social metadata.

Failed activation restores the previous environment and healthy image, and the
command returns a failure status. The previous image and backups are retained;
there is no automatic pruning. The receiver does not restore the database during
an image rollback. Releases requiring incompatible database migrations need a
separate migration and recovery plan.

To verify an archive locally without Docker or production access:

```sh
python3 deploy/receive.py --check-archive REVISION ARCHIVE_SHA256 image.tar.gz
```

Run the receiver's validation/rollback tests before a release:

```sh
python3 -m unittest discover -s deploy -p 'test_*.py'
```

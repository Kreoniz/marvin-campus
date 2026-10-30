# Deployment

Deployment remains manual. GitHub CI validates the repository; automatic delivery
is deferred by the owner's choice while GitHub Actions billing is unavailable.
No deployment credentials or SSH key installation is required for this release.

## Release artifact

Build from the exact committed tracked tree. Keep local reports, environment
files and other untracked material out of the build context. Use Node 26 in the
frontend image and preserve the project's pinned pnpm version.

Tag the image `marvin-campus:<full 40-character commit SHA>` and attach these
OCI labels at build time:

- `org.opencontainers.image.source=https://github.com/Kreoniz/marvin-campus`
- `org.opencontainers.image.revision=<the same full commit SHA>`

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

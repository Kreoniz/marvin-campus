#!/usr/bin/env python3
"""Receive one bounded image archive and activate it with a guarded rollback."""
import fcntl
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import re
import select
import signal
import shutil
import sqlite3
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
from urllib.request import urlopen

ROOT = Path('/opt/marvin-campus')
SOURCE = 'https://github.com/Kreoniz/marvin-campus'
PUBLIC = 'https://campus.kreoniz.ru'
VOLUME = 'marvin-campus_cache'
MAX_ARCHIVE = 256 * 1024 * 1024
MAX_TAR = 768 * 1024 * 1024
ENV = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': pwd.getpwuid(os.geteuid()).pw_dir}
COMPOSE = ['docker', 'compose', '--project-directory', str(ROOT), '--env-file', str(ROOT / '.env'), '-p', 'marvin-campus']


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def run(args, timeout=45, check=True):
    result = subprocess.run(args, cwd=ROOT, env=ENV, capture_output=True, timeout=timeout)
    if check:
        require(result.returncode == 0, f'{args[0]} command failed (exit {result.returncode})')
    return result


def output(args):
    return run(args).stdout.decode().strip()


def protected(path, directory=False):
    info = path.lstat()
    require(info.st_uid == 0 and not info.st_mode & 0o022, 'Deployment path must be root-owned and not writable by other users')
    require(stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode), 'Unexpected deployment path type')


def private_dir(path):
    path.mkdir(mode=0o700, parents=False, exist_ok=True)
    protected(path, directory=True)
    require(not path.stat().st_mode & 0o077, 'Deployment working directory must be private')


def receive(path, expected):
    digest = hashlib.sha256()
    total = 0
    deadline = time.monotonic() + 180
    with path.open('xb') as target:
        while True:
            left = deadline - time.monotonic()
            require(left > 0 and select.select([sys.stdin.fileno()], [], [], left)[0], 'Archive receive timeout')
            chunk = os.read(sys.stdin.fileno(), 1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            require(total <= MAX_ARCHIVE, 'Compressed archive exceeds limit')
            digest.update(chunk)
            target.write(chunk)
    require(total > 0 and digest.hexdigest() == expected, 'Archive checksum mismatch')
    return total


def archive_check(archive, revision, expected, work):
    require(archive.stat().st_size <= MAX_ARCHIVE, 'Compressed archive exceeds limit')
    with archive.open('rb') as source:
        require(hashlib.file_digest(source, 'sha256').hexdigest() == expected, 'Archive checksum mismatch')
    raw = work / 'image.tar'
    total = 0
    with gzip.open(archive, 'rb') as source, raw.open('xb') as target:
        while chunk := source.read(1024 * 1024):
            total += len(chunk)
            require(total <= MAX_TAR, 'Expanded archive exceeds limit')
            target.write(chunk)
    with tarfile.open(raw, mode='r:') as image:
        members = {}
        for member in image:
            require(len(members) < 4096, 'Too many archive entries')
            path = PurePosixPath(member.name)
            require(not path.is_absolute() and '..' not in path.parts and str(path) not in members, 'Unsafe or duplicate archive path')
            require((member.isfile() or member.isdir()) and not member.issparse(), 'Archive links, sparse files and special entries are not allowed')
            members[str(path)] = member
        def read_json(name, limit):
            require(name in members and members[name].isfile() and members[name].size <= limit, 'Missing or oversized image metadata')
            data = image.extractfile(members[name]).read()
            return data, json.loads(data)
        _, manifest = read_json('manifest.json', 1024 * 1024)
        require(isinstance(manifest, list) and len(manifest) == 1, 'Archive must contain exactly one image')
        metadata = manifest[0]
        require(metadata.get('RepoTags') == [f'marvin-campus:{revision}'], 'Unexpected image tag')
        config_name = metadata.get('Config')
        require(isinstance(config_name, str), 'Missing image config path')
        config_bytes, config = read_json(config_name, 8 * 1024 * 1024)
        layers = metadata.get('Layers')
        require(isinstance(layers, list) and layers and all(isinstance(p, str) and p in members and members[p].isfile() for p in layers), 'Missing image layers')
        labels = config.get('config', {}).get('Labels', {})
        require(labels.get('org.opencontainers.image.revision') == revision and labels.get('org.opencontainers.image.source') == SOURCE, 'Image provenance labels do not match')
        user = config.get('config', {}).get('User')
        require(user in ('campus', '10001', '10001:10001'), 'Image must use the Campus non-root user')
        require(config.get('config', {}).get('Cmd') == ['/app/campus'] and not config.get('config', {}).get('Entrypoint'), 'Unexpected image command')
        image_id = 'sha256:' + hashlib.sha256(config_bytes).hexdigest()
    return raw, image_id


def container():
    ident = output(COMPOSE + ['ps', '-q', 'app'])
    require(re.fullmatch(r'[0-9a-f]{64}', ident) is not None, 'Expected one running Campus container')
    template = ('{"id":{{json .Id}},"imageId":{{json .Image}},"image":{{json .Config.Image}},'
                '"user":{{json .Config.User}},"running":{{json .State.Running}},'
                '"health":{{json .State.Health.Status}},"readonly":{{json .HostConfig.ReadonlyRootfs}},'
                '"caps":{{json .HostConfig.CapDrop}},"security":{{json .HostConfig.SecurityOpt}},'
                '"ports":{{json .HostConfig.PortBindings}},"mounts":{{json .Mounts}}}')
    return json.loads(output(['docker', 'inspect', '--format', template, ident]))


def image_id(tag):
    result = run(['docker', 'image', 'inspect', '--format', '{{.Id}}', tag], check=False)
    return result.stdout.decode().strip() if result.returncode == 0 else None


def runtime_check(state, expected):
    require(state['imageId'] == expected and state['running'] and state['health'] == 'healthy', 'Candidate container is not healthy with the expected image')
    require(state['user'] in ('campus', '10001', '10001:10001') and state['readonly'], 'Container privilege settings changed')
    require('ALL' in (state['caps'] or []) and any(value.startswith('no-new-privileges') for value in (state['security'] or [])), 'Container hardening is missing')
    require(not state['ports'], 'Campus must not publish a host port')
    require(any(m.get('Name') == VOLUME and m.get('Destination') == '/data' and m.get('RW') for m in state['mounts']), 'Expected cache volume is not mounted')


def ready(expected):
    deadline = time.monotonic() + 125
    while True:
        try:
            state = container()
        except (RuntimeError, subprocess.TimeoutExpired):
            state = None
        if state and state['running'] and state['health'] == 'healthy':
            runtime_check(state, expected)
            return state
        require(time.monotonic() < deadline, 'Container did not become healthy before timeout')
        time.sleep(2)


def database(volume_path):
    cache = Path(volume_path) / 'campus.sqlite'
    require(cache.is_file() and not cache.is_symlink(), 'Existing cache database not found')
    return cache


def shared_digest(connection):
    digest = hashlib.sha256()
    count = 0
    for row in connection.execute('SELECT id, payload, created FROM shared_views ORDER BY id'):
        for value in row:
            data = value if isinstance(value, bytes) else str(value).encode()
            digest.update(len(data).to_bytes(8, 'big'))
            digest.update(data)
        count += 1
    return {'count': count, 'sha256': digest.hexdigest()}


def db_state(cache):
    with sqlite3.connect(cache.as_uri() + '?mode=ro', uri=True, timeout=15) as connection:
        return shared_digest(connection)


def backup_database(cache, destination):
    deadline = time.monotonic() + 60
    def progress(*_):
        require(time.monotonic() < deadline, 'Database backup timeout')
    with sqlite3.connect(cache.as_uri() + '?mode=ro', uri=True, timeout=15) as source, sqlite3.connect(destination) as target:
        source.backup(target, pages=256, progress=progress, sleep=0.1)
        require(target.execute('PRAGMA quick_check').fetchall() == [('ok',)], 'Database backup failed quick_check')
        return shared_digest(target)


def atomic_env(data):
    target = ROOT / '.env'
    info = target.stat()
    name = None
    try:
        with tempfile.NamedTemporaryFile(dir=ROOT, prefix='.env-deploy-', delete=False) as temporary:
            name = temporary.name
            temporary.write(data)
            temporary.flush()
            os.fsync(temporary.fileno())
            os.fchmod(temporary.fileno(), stat.S_IMODE(info.st_mode))
            os.fchown(temporary.fileno(), info.st_uid, info.st_gid)
        os.replace(name, target)
    finally:
        if name is not None:
            Path(name).unlink(missing_ok=True)


def local_get(ident, path):
    data = run(['docker', 'exec', ident, 'wget', '-q', '-T', '8', '-O', '-', 'http://127.0.0.1:8080' + path], timeout=12).stdout
    require(len(data) <= 16 * 1024 * 1024, 'Unexpected static response size')
    return data


def public_get(path):
    with urlopen(PUBLIC + path, timeout=12) as response:
        require(response.status == 200, 'Public endpoint did not return HTTP 200')
        data = response.read(16 * 1024 * 1024 + 1)
    require(len(data) <= 16 * 1024 * 1024, 'Unexpected public response size')
    return data


def smoke(state):
    require(json.loads(local_get(state['id'], '/api/health')).get('status') == 'ok', 'Internal health check failed')
    index = local_get(state['id'], '/')
    paths = re.findall(rb'(?:src|href)="(/assets/[A-Za-z0-9_./-]+\.(?:js|css))"', index)
    require(paths and len(paths) <= 32, 'App shell has no expected assets')
    paths = ['/', '/sw.js', '/manifest.webmanifest'] + sorted({p.decode() for p in paths})
    hashes = {}
    for path in paths:
        require('..' not in path, 'Unsafe asset URL')
        internal = local_get(state['id'], path)
        require(internal == public_get(path), 'Public app shell or assets differ from the candidate image')
        hashes[path] = hashlib.sha256(internal).hexdigest()
    require(json.loads(public_get('/api/health')).get('status') == 'ok', 'Public health check failed')
    return hashes


def deploy(revision, checksum):
    require(os.geteuid() == 0, 'Receiver must run as root')
    protected(ROOT, directory=True)
    protected(ROOT / 'deploy', directory=True)
    protected(ROOT / '.env')
    work_root = ROOT / 'deploy' / 'tmp'
    private_dir(work_root)
    lock = os.open(ROOT / 'deploy' / '.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with tempfile.TemporaryDirectory(dir=work_root, prefix='release-') as folder:
        work = Path(folder)
        archive = work / 'image.tar.gz'
        compressed_size = receive(archive, checksum)
        raw, expected = archive_check(archive, revision, checksum, work)
        print('Archive and image provenance verified.', flush=True)
        previous = container()
        runtime_check(previous, previous['imageId'])
        require(image_id(previous['image']) == previous['imageId'], 'Previous image tag has drifted')
        tag = f'marvin-campus:{revision}'
        existing = image_id(tag)
        require(existing is None or existing == expected, 'Refusing to overwrite an immutable image tag')
        env = (ROOT / '.env').read_bytes()
        require(len(re.findall(rb'^CAMPUS_IMAGE=.*$', env, flags=re.M)) == 1, 'Expected exactly one CAMPUS_IMAGE assignment')
        require(re.search(rb'^CAMPUS_IMAGE=' + re.escape(previous['image'].encode()) + rb'\r?$', env, flags=re.M) is not None, 'Existing image selection differs from the running container')
        selected_env = re.sub(rb'^CAMPUS_IMAGE=.*$', b'CAMPUS_IMAGE=' + tag.encode(), env, flags=re.M)
        backup_root = ROOT / 'backups'
        private_dir(backup_root)
        backup = backup_root / (time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + revision[:12])
        backup.mkdir(mode=0o700)
        shutil.copyfile(ROOT / '.env', backup / 'environment')
        volume = output(['docker', 'volume', 'inspect', '--format', '{{.Mountpoint}}', VOLUME])
        cache = database(volume)
        links = backup_database(cache, backup / 'campus.sqlite')
        evidence = {'revision': revision, 'source': SOURCE, 'archiveSha256': checksum, 'archiveBytes': compressed_size,
                    'imageId': expected, 'previousImageId': previous['imageId'], 'previousImage': previous['image'], 'sharedViews': links}
        (backup / 'evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
        run(['docker', 'load', '--input', str(raw)], timeout=180)
        require(image_id(tag) == expected, 'Loaded image ID differs from the archive config')
        switched = False
        try:
            switched = True
            atomic_env(selected_env)
            run(COMPOSE + ['up', '-d', '--no-deps', '--no-build', '--pull', 'never', 'app'], timeout=90)
            state = ready(expected)
            evidence['assets'] = smoke(state)
            require(db_state(cache) == links, 'Legacy comparisons changed during activation')
        except BaseException:
            if switched:
                for signum in (signal.SIGHUP, signal.SIGINT, signal.SIGTERM):
                    signal.signal(signum, signal.SIG_IGN)
                atomic_env(env)
                run(COMPOSE + ['up', '-d', '--no-deps', '--no-build', '--pull', 'never', 'app'], timeout=90)
                ready(previous['imageId'])
                print('Activation failed; previous healthy image restored.', file=sys.stderr, flush=True)
            raise
        evidence['activatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        (backup / 'evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
        print(f'Deployed {revision}; image {expected}; archive {checksum}; legacy comparisons {links["count"]}; public assets verified.', flush=True)


def main():
    os.umask(0o077)
    if len(sys.argv) == 5 and sys.argv[1] == '--check-archive':
        revision, checksum, name = sys.argv[2:]
        require(re.fullmatch(r'[0-9a-f]{40}', revision) and re.fullmatch(r'[0-9a-f]{64}', checksum), 'Invalid archive check arguments')
        archive = Path(name).resolve()
        with tempfile.TemporaryDirectory(dir=archive.parent, prefix='check-') as work:
            _, expected = archive_check(archive, revision, checksum, Path(work))
            print(json.dumps({'revision': revision, 'imageId': expected, 'archiveSha256': checksum}))
        return
    require(len(sys.argv) == 1, 'Unexpected receiver arguments')
    match = re.fullmatch(r'deploy ([0-9a-f]{40}) ([0-9a-f]{64})', os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    require(match is not None, 'Expected exact command: deploy <revision> <archive checksum>')
    def interrupted(signum, _):
        raise RuntimeError(f'Deployment interrupted by signal {signum}')
    for signum in (signal.SIGHUP, signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, interrupted)
    deploy(*match.groups())


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Deployment failed: {type(error).__name__}: {error}', file=sys.stderr)
        sys.exit(1)

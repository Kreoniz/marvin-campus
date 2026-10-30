import copy
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('receiver', Path(__file__).with_name('receive.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
REV = 'a' * 40
DIG = 'b' * 64
TAG = 'marvin-campus:' + REV
EXPECTED = 'sha256:' + 'c' * 64
OLD = 'sha256:' + 'd' * 64

class ReceiverTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix='campus-receiver-test-')
        self.root = Path(self.folder.name).resolve()
        self.addCleanup(self.folder.cleanup)

    def make_archive(self, change=None, extra=None):
        config = {'config': {'User': 'campus', 'Cmd': ['/app/campus'], 'Labels': {'org.opencontainers.image.source': m.SOURCE, 'org.opencontainers.image.revision': REV}}}
        manifest = [{'Config': 'blobs/sha256/config', 'RepoTags': [TAG], 'Layers': ['blobs/sha256/layer']}]
        if change: change(config, manifest)
        payloads = [('manifest.json', json.dumps(manifest).encode()), ('blobs/sha256/config', json.dumps(config).encode()), ('blobs/sha256/layer', b'layer')]
        archive = self.root / 'image.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            for name, data in payloads:
                info=tarfile.TarInfo(name);info.size=len(data);tar.addfile(info,io.BytesIO(data))
            if extra: extra(tar)
        checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
        work=self.root/'expanded';work.mkdir()
        return archive, checksum, work

    def check_bad(self, change=None, extra=None):
        archive, checksum, work=self.make_archive(change,extra)
        with self.assertRaises((RuntimeError, ValueError, KeyError)):
            m.archive_check(archive,REV,checksum,work)

    def test_modern_archive(self):
        archive, checksum, work=self.make_archive()
        raw, ident=m.archive_check(archive,REV,checksum,work)
        self.assertTrue(raw.is_file());self.assertRegex(ident,r'^sha256:[a-f0-9]{64}$')
    def test_extra_tag(self): self.check_bad(lambda c, rows:rows[0]['RepoTags'].append('other:tag'))
    def test_second_image(self): self.check_bad(lambda c, rows:rows.append(copy.deepcopy(rows[0])))
    def test_wrong_revision(self): self.check_bad(lambda c, rows:c['config']['Labels'].update({'org.opencontainers.image.revision':'f'*40}))
    def test_wrong_source(self): self.check_bad(lambda c, rows:c['config']['Labels'].update({'org.opencontainers.image.source':'https://invalid.example'}))
    def test_root_user(self): self.check_bad(lambda c, rows:c['config'].update(User='root'))
    def test_wrong_command(self): self.check_bad(lambda c, rows:c['config'].update(Cmd=['/bin/sh']))
    def test_missing_layer(self): self.check_bad(lambda c, rows:rows[0].update(Layers=['not-present']))
    def test_traversal(self):
        def extra(tar):
            info=tarfile.TarInfo('../escape');info.size=1;tar.addfile(info,io.BytesIO(b'x'))
        self.check_bad(extra=extra)
    def test_symlink(self):
        def extra(tar):
            info=tarfile.TarInfo('link');info.type=tarfile.SYMTYPE;info.linkname='/etc/passwd';tar.addfile(info)
        self.check_bad(extra=extra)
    def test_duplicate_metadata(self):
        def extra(tar):
            info=tarfile.TarInfo('./manifest.json');info.size=2;tar.addfile(info,io.BytesIO(b'[]'))
        self.check_bad(extra=extra)
    def test_bad_checksum(self):
        archive, checksum, work=self.make_archive()
        with self.assertRaisesRegex(RuntimeError,'checksum'):m.archive_check(archive,REV,'0'*64,work)
    def test_compressed_limit(self):
        archive, checksum, work=self.make_archive()
        with patch.object(m,'MAX_ARCHIVE',1),self.assertRaisesRegex(RuntimeError,'Compressed'):m.archive_check(archive,REV,checksum,work)
    def test_expanded_limit(self):
        archive, checksum, work=self.make_archive()
        with patch.object(m,'MAX_TAR',1),self.assertRaisesRegex(RuntimeError,'Expanded'):m.archive_check(archive,REV,checksum,work)
    def test_command_rejection(self):
        for command in ['', 'deploy '+REV+' '+DIG+'\n', 'deploy '+REV+' '+DIG+';id', 'deploy '+REV.upper()+' '+DIG, 'deploy\t'+REV+' '+DIG, 'check '+REV+' '+DIG]:
            with self.subTest(command=command),patch.object(m.sys,'argv',['receive.py']),patch.dict(m.os.environ,{'SSH_ORIGINAL_COMMAND':command}),patch.object(m,'deploy') as deploy,self.assertRaises(RuntimeError):
                m.main()
            deploy.assert_not_called()

    def activation(self, fail=False):
        (self.root/'deploy').mkdir();(self.root/'volume').mkdir();(self.root/'volume'/'campus.sqlite').write_bytes(b'fake')
        initial=b'# retained\nCAMPUS_IMAGE=marvin-campus:previous\nOTHER="some value"\n'
        (self.root/'.env').write_bytes(initial)
        previous={'imageId':OLD,'image':'marvin-campus:previous','id':'container'}
        state={'id':'new-container'}
        links={'count':108,'sha256':'e'*64}
        loaded=[False];commands=[]
        def receive(path,checksum):path.write_bytes(b'archive');return 7
        def config(archive,revision,checksum,work):
            raw=work/'image.tar';raw.write_bytes(b'raw');return raw,EXPECTED
        def image_id(tag):return OLD if tag=='marvin-campus:previous' else EXPECTED if loaded[0] else None
        def run(args,**kwargs):
            commands.append(args)
            if args[:2]==['docker','load']:loaded[0]=True
            if fail and 'up' in args and TAG.encode() in (self.root/'.env').read_bytes():raise RuntimeError('simulated activation failure')
        def backup(cache,dest):dest.write_bytes(b'backup');return links
        with patch.object(m,'ROOT',self.root),patch.object(m.os,'geteuid',return_value=0),patch.object(m,'protected'),patch.object(m,'receive',side_effect=receive),patch.object(m,'archive_check',side_effect=config),patch.object(m,'container',return_value=previous),patch.object(m,'runtime_check'),patch.object(m,'image_id',side_effect=image_id),patch.object(m,'output',return_value=str(self.root/'volume')),patch.object(m,'backup_database',side_effect=backup),patch.object(m,'run',side_effect=run),patch.object(m,'ready',return_value=state) as ready,patch.object(m,'smoke',return_value={'/':'f'*64}),patch.object(m,'db_state',return_value=links),patch.object(m.signal,'signal'):
            if fail:
                with self.assertRaisesRegex(RuntimeError,'simulated'):m.deploy(REV,DIG)
                self.assertEqual((self.root/'.env').read_bytes(),initial)
                ready.assert_called_once_with(OLD)
            else:
                m.deploy(REV,DIG)
                self.assertEqual((self.root/'.env').read_bytes(),initial.replace(b'marvin-campus:previous',TAG.encode()))
                ready.assert_called_once_with(EXPECTED)
        self.assertTrue(list((self.root/'backups').glob('*/campus.sqlite')))
        self.assertEqual(len(list((self.root/'deploy'/'tmp').iterdir())),0)
        self.assertTrue(any(args[:2]==['docker','load'] for args in commands))
    def test_activation_changes_only_image_selection(self): self.activation()
    def test_activation_failure_restores_old_environment_and_image(self): self.activation(fail=True)

if __name__=='__main__':unittest.main(verbosity=2)

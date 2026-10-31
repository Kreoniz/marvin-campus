"""Exercise the real operator command with synthetic documents, never live data."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from test_import_vuc import make_document

SCRIPT = Path(__file__).with_name('update-vuc.py')


def fixture(path, title='с 03 сентября по 10 сентября 2026 г.', day='03\n09', platoon='101'):
    row = [(day, 1), (platoon, 1), ('Учебный предмет', 1)] + [('', 1)] * 5
    make_document(path, [(title, [100] * 8, [1] * 8, [row])])


class UpdateTests(unittest.TestCase):
    def run_update(self, output, *inputs):
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, inputs),
                               '--output-dir', str(output)], capture_output=True, text=True)

    def test_explicit_replacement_ignores_old_files_and_mtime_preserves_exact_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            old, current = root / 'old.docx', root / 'current.docx'
            fixture(old, 'с 04 сентября по 11 сентября 2025 г.', '04\n09')
            fixture(current)
            # A newer archive must not be picked up by scanning or date guessing.
            os.utime(old, (2100000000, 2100000000))
            os.utime(current, (1000000000, 1000000000))
            previous, active = root / 'previous', root / 'active'
            self.assertEqual(self.run_update(previous, old).returncode, 0)
            previous_json = (previous / 'schedules.json').read_bytes()
            result = self.run_update(active, current, current)
            self.assertEqual(result.returncode, 0, result.stderr)
            dataset = json.loads((active / 'schedules.json').read_text())
            self.assertEqual(len(dataset['schedules']), 1)
            entry = dataset['schedules'][0]
            self.assertEqual(entry['coveredDates'], ['2026-09-03'])
            digest = hashlib.sha256(current.read_bytes()).hexdigest()
            self.assertEqual(entry['documentSHA256'], digest)
            originals = list((active / 'originals').iterdir())
            self.assertEqual([p.name for p in originals], [digest + '.docx'])
            self.assertEqual(originals[0].read_bytes(), current.read_bytes())
            self.assertEqual(originals[0].stat().st_mode & 0o777, 0o600)
            self.assertEqual((previous / 'schedules.json').read_bytes(), previous_json)
            self.assertTrue(old.exists())
            # Re-import elsewhere is deterministic apart from the import timestamp.
            again = root / 'again'
            self.assertEqual(self.run_update(again, current).returncode, 0)
            self.assertEqual(json.loads((again / 'schedules.json').read_text())['schedules'], dataset['schedules'])

    def test_failure_leaves_prior_set_and_inputs_untouched_and_no_partial_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'source.docx'
            fixture(source)
            active = root / 'active'
            self.assertEqual(self.run_update(active, source).returncode, 0)
            before = (active / 'schedules.json').read_bytes()
            self.assertNotEqual(self.run_update(active, source).returncode, 0)
            self.assertEqual((active / 'schedules.json').read_bytes(), before)
            bad = root / 'bad.docx'
            make_document(bad, [])
            failed = root / 'failed'
            self.assertNotEqual(self.run_update(failed, source, bad).returncode, 0)
            self.assertFalse(failed.exists())
            self.assertEqual(list(root.glob('.vuc-prepare-*')), [])
            self.assertTrue(source.exists())
            self.assertEqual((active / 'schedules.json').read_bytes(), before)

    def test_all_explicit_inputs_are_included_and_paths_with_spaces_work(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            first, second = root / 'one input.docx', root / 'two input.docx'
            fixture(first)
            fixture(second, platoon='102')
            active = root / 'semester set'
            result = self.run_update(active, first, second)
            self.assertEqual(result.returncode, 0, result.stderr)
            dataset = json.loads((active / 'schedules.json').read_text())
            self.assertEqual(len(dataset['schedules']), 2)
            self.assertEqual(len(list((active / 'originals').iterdir())), 2)
            self.assertIn("VUC_DATA_PATH='", result.stdout)


if __name__ == '__main__':
    unittest.main()

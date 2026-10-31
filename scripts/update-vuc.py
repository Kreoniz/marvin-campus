#!/usr/bin/env python3
"""Prepare a new active VUC input set and exact originals; never switch a server.

Every input is explicit. The output directory must be new, so previous semester
sets and running API data remain untouched. DOCX needs only Python; PDF also
needs pdfplumber in this same tool environment (see docs/vuc.md).
"""

import argparse
import hashlib
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile

MAX_INPUT = 16 * 1024 * 1024
MAX_TOTAL = 64 * 1024 * 1024


def prepare(inputs, output):
    if not 1 <= len(inputs) <= 10:
        raise ValueError("Provide one to ten explicit PDF/DOCX inputs")
    if output.exists() or output.is_symlink():
        raise ValueError("Output directory already exists; choose a new set path")
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=".vuc-prepare-", dir=output.parent))
    try:
        originals = staging / "originals"
        originals.mkdir(mode=0o700)
        frozen = []
        total = 0
        for source in inputs:
            suffix = source.suffix.lower()
            if suffix not in (".pdf", ".docx") or not source.is_file():
                raise ValueError("Every input must be a PDF/DOCX file")
            with source.open("rb") as handle:
                content = handle.read(MAX_INPUT + 1)
            if len(content) > MAX_INPUT:
                raise ValueError("Source document exceeds 16 MiB")
            digest = hashlib.sha256(content).hexdigest()
            target = originals / (digest + suffix)
            if target in frozen:
                continue
            total += len(content)
            if total > MAX_TOTAL:
                raise ValueError("Originals exceed 64 MiB in total")
            with target.open("xb") as handle:
                handle.write(content)
            target.chmod(0o600)
            frozen.append(target)
        # Parse the frozen copies, so parsed hashes and download bytes always
        # agree even if an input is replaced while this command is running.
        subprocess.run([
            sys.executable, str(Path(__file__).with_name("import-vuc.py")),
            *map(str, frozen), "--out", str(staging / "schedules.json"),
        ], check=True)
        if output.exists() or output.is_symlink():
            raise ValueError("Output appeared during preparation; left it unchanged")
        staging.rename(output)
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    try:
        prepare(args.inputs, args.output_dir)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Preparation failed: {error}\n")
    print("Prepared a new input set. Existing API and previous sets are unchanged.")
    print("Use both settings on the next operator-controlled API start:")
    print("VUC_DATA_PATH=" + shlex.quote(str(args.output_dir / "schedules.json")))
    print("VUC_ORIGINALS_DIR=" + shlex.quote(str(args.output_dir / "originals")))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Reject private artifacts, SSH paths and non-example public server IPs."""
import argparse
import ipaddress
from pathlib import Path
import re
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--history', action='store_true')
args = parser.parse_args()
blocked = re.compile(r'(^|/)(HANDOFF\.md|handoff|\.private|\.env(?!\.example$))($|/)|\.(sqlite[^/]*|bundle|tar|log)$|(^|/)gitleaks[^/]*\.json$')
ssh_path = re.compile(r'/(?:home|Users)/[^/\s]+/\.ssh(?:/|\b)')
ipv4 = re.compile(r'(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])')
resolvers = {'1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4'}
issues = set()

def inspect(path, data):
    if blocked.search(path):
        issues.add((path, 'private artifact'))
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        return
    if ssh_path.search(text):
        issues.add((path, 'personal SSH path'))
    for match in ipv4.finditer(text):
        try:
            ip = ipaddress.ip_address(match.group())
        except ValueError:
            continue
        if ip.is_global and str(ip) not in resolvers:
            issues.add((path, 'non-example public IP'))

paths = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
for name in filter(None, paths):
    path = Path(name)
    if path.is_file():
        inspect(name, path.read_bytes())

if args.history:
    objects = subprocess.check_output(['git', 'rev-list', '--objects', '--all']).decode().splitlines()
    with subprocess.Popen(['git', 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE) as batch:
        for entry in objects:
            oid, _, name = entry.partition(' ')
            batch.stdin.write((oid + '\n').encode())
            batch.stdin.flush()
            header = batch.stdout.readline().decode().split()
            if len(header) != 3:
                raise RuntimeError('Cannot read Git object')
            data = batch.stdout.read(int(header[2]))
            batch.stdout.read(1)
            if header[1] in {'blob', 'commit'}:
                inspect(name or '(commit message)', data)
        batch.stdin.close()
        batch.wait()

for path, reason in sorted(issues):
    print(f'{path}: {reason}')  # Never print matched private values.
print(f'Private-file check: {len(issues)} issue(s)')
sys.exit(bool(issues))

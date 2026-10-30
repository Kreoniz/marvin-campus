#!/bin/sh
# Installed root-owned at /opt/marvin-campus/deploy/receive.sh.
set -eu
umask 077
exec /usr/bin/python3 -I /opt/marvin-campus/deploy/receive.py

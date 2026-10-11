#!/bin/sh
set -eu
security_tools_dir=${TMPDIR:-/tmp}/campus-security-tools
mkdir -p "$security_tools_dir"
curl --fail --silent --show-error --location \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz \
  -o "$security_tools_dir/gitleaks.tar.gz"
printf '%s  %s\n' 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb \
  "$security_tools_dir/gitleaks.tar.gz" | sha256sum -c -
tar -xzf "$security_tools_dir/gitleaks.tar.gz" -C "$security_tools_dir" gitleaks
"$security_tools_dir/gitleaks" version

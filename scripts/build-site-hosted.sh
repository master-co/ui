#!/usr/bin/env bash
# The Cloudflare Pages build command for pages-stable: `bun run build:site:cloudflare-pages`.
# It builds only a commit with a completed release and deploys only the exact output CI verified.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

release_evidence_dir=$(mktemp -d "${TMPDIR:-/tmp}/master-ui-pages-release.XXXXXX")
trap 'rm -rf "$release_evidence_dir"' EXIT

# Fail before installing or building if this Git commit has no completed release.
# Only this helper's fixed, validated public metadata is exported; never eval it.
node scripts/pages-site-release.mjs hosted-prepare "$release_evidence_dir"
while IFS='=' read -r release_env_name release_env_value; do
  case "$release_env_name" in
    PUBLIC_VERSION|PUBLIC_URL) export "$release_env_name=$release_env_value" ;;
    *) echo "Unexpected hosted release environment field" >&2; exit 1 ;;
  esac
done < "$release_evidence_dir/environment"
bun install --frozen-lockfile

bun run build
node scripts/pages-site-release.mjs hosted-verify "$release_evidence_dir"

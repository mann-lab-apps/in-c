#!/usr/bin/env bash
set -euo pipefail

mode="$1"
test_scope="$2"
source_dir="$(cd "$3" && pwd)"
mkdir -p "$4"
evidence_dir="$(cd "$4" && pwd)"
qa_dir="$(cd "$(dirname "$0")" && pwd)"
source_sha="$(git -C "$source_dir" rev-parse HEAD)"
qa_sha="$(git -C "$qa_dir" rev-parse HEAD)"
case "$mode:$test_scope" in
  baseline:focused|trace:focused|baseline:shard|trace:shard|timeout:focused) ;;
  *) echo "Unknown diagnostic mode or scope" >&2; exit 2 ;;
esac
test "$source_sha" = '7451ea7c1a57fa25ae2830e2b3e5405acdb3d0ec'
test -z "$(git -C "$source_dir" status --porcelain)"
test -z "$(ls -A "$evidence_dir")"

phase_file="$source_dir/src/renderer/src/metadata-ci-phase-probe.ts"
timeout_file="$source_dir/src/renderer/src/metadata-ci-timeout.test.ts"
patch_applied=false
phase_copied=false
timeout_copied=false
cleanup() {
  local result="$?"
  if "$timeout_copied"; then rm -f "$timeout_file"; fi
  if "$phase_copied"; then rm -f "$phase_file"; fi
  if "$patch_applied"; then git -C "$source_dir" apply --reverse "$qa_dir/metadata-phases.patch"; fi
  test -z "$(git -C "$source_dir" status --porcelain)"
  exit "$result"
}
trap cleanup EXIT

if [[ "$mode" != baseline ]]; then
  test ! -e "$phase_file"
  cp "$qa_dir/phase-probe.ts" "$phase_file"
  phase_copied=true
fi
if [[ "$mode" == trace ]]; then
  git -C "$source_dir" apply --check "$qa_dir/metadata-phases.patch"
  git -C "$source_dir" apply "$qa_dir/metadata-phases.patch"
  patch_applied=true
fi
if [[ "$mode" == timeout ]]; then
  test ! -e "$timeout_file"
  cp "$qa_dir/timeout-probe.fixture.ts" "$timeout_file"
  timeout_copied=true
fi

args=(test -- --maxWorkers=1 --silent=passed-only --reporter=default "--reporter=$qa_dir/case-timings.mjs")
if [[ "$test_scope" == shard ]]; then
  args+=(--shard=1/4)
elif [[ "$mode" == timeout ]]; then
  args+=(src/renderer/src/metadata-ci-timeout.test.ts)
else
  args+=(src/renderer/src/App.notation-exchange.test.tsx -t studio.metadata-save-feedback)
fi
export STUDIO_CI_PHASE_FILE="$evidence_dir/phases.jsonl"
export STUDIO_CI_CASE_FILE="$evidence_dir/cases.jsonl"
touch "$STUDIO_CI_PHASE_FILE" "$STUDIO_CI_CASE_FILE"

node --input-type=module - "$evidence_dir" "$mode" "$test_scope" "$source_sha" "$qa_sha" "${args[@]}" <<'JS'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
const [output, mode, scope, sourceSha, qaSha, ...args] = process.argv.slice(2)
const info = {
  mode, scope, sourceSha, qaSha,
  command: ['npm', ...args],
  node: process.version, architecture: process.arch, os: process.platform,
  macOS: process.platform === 'darwin' ? execFileSync('sw_vers', ['-productVersion'], { encoding:'utf8' }).trim() : null,
  runnerImage: process.env.ImageOS ?? null, runnerImageVersion: process.env.ImageVersion ?? null,
  gitHubRun: process.env.GITHUB_RUN_ID ?? null,
  startedAt: new Date().toISOString(),
}
writeFileSync(join(output, 'run.json'), JSON.stringify(info, null, 2) + '\n')
console.log('Studio test timing setup', JSON.stringify(info))
JS

set +e
(cd "$source_dir" && npm "${args[@]}") 2>&1 | tee "$evidence_dir/vitest.log"
pipeline=("${PIPESTATUS[@]}")
set -e
test_exit="${pipeline[0]}"
printf '%s\n' "$test_exit" > "$evidence_dir/test-exit.txt"
if [[ "${pipeline[1]}" != 0 ]]; then
  echo "Could not save the Vitest log" >&2
  [[ "$test_exit" != 0 ]] && exit "$test_exit"
  exit 2
fi
if ! node "$qa_dir/summarize.mjs" "$evidence_dir"; then
  [[ "$test_exit" != 0 ]] && exit "$test_exit"
  exit 2
fi
exit "$test_exit"

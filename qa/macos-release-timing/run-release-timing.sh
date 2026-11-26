#!/usr/bin/env bash
set -euo pipefail

mode=trace
test_scope="$1"
source_dir="$(git rev-parse --show-toplevel)"
qa_dir="$(cd "$(dirname "$0")" && pwd)"
source_sha="$(git -C "$source_dir" rev-parse HEAD)"
qa_sha="$source_sha"
args=(test -- --maxWorkers=1 --silent=passed-only)
case "$test_scope" in
  shard) args+=(--shard=1/4) ;;
  focused) args+=(src/renderer/src/App.notation-exchange.test.tsx -t studio.metadata-save-feedback) ;;
  *) exit 2 ;;
esac

warn() {
  printf '::warning::%s\n' "$1" >&2
}

cd "$source_dir"
if ! mkdir -p "$2" || ! evidence_dir="$(cd "$2" && pwd)" ||
   ! existing="$(ls -A "$evidence_dir")" || [[ -n "$existing" ]]; then
  warn 'Could not initialize the Studio timing directory. Running Vitest with standard output.'
  unset STUDIO_CI_PHASE_FILE STUDIO_CI_CASE_FILE
  exec npm "${args[@]}"
fi
export STUDIO_CI_PHASE_FILE="$evidence_dir/phases.jsonl"
export STUDIO_CI_CASE_FILE="$evidence_dir/cases.jsonl"
if ! touch "$STUDIO_CI_PHASE_FILE" "$STUDIO_CI_CASE_FILE"; then
  warn 'Could not initialize the Studio timing files. Running Vitest with standard output.'
  unset STUDIO_CI_PHASE_FILE STUDIO_CI_CASE_FILE
  exec npm "${args[@]}"
fi
args+=(--reporter=default "--reporter=$qa_dir/case-timings.mjs")

if ! node --input-type=module - "$evidence_dir" "$mode" "$test_scope" "$source_sha" "$qa_sha" "${args[@]}" <<'JS'
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
then
  warn 'Could not save the Studio timing run metadata'
fi

set +e
(cd "$source_dir" && npm "${args[@]}") 2>&1 | tee "$evidence_dir/vitest.log"
pipeline=("${PIPESTATUS[@]}")
set -e
test_exit="${pipeline[0]}"
printf 'Vitest exit code: %s\n' "$test_exit"
if ! printf '%s\n' "$test_exit" > "$evidence_dir/test-exit.txt"; then
  warn 'Could not save the Vitest exit code'
fi
if [[ "${pipeline[1]}" != 0 ]]; then
  warn 'Could not save the Vitest log'
fi
if ! node "$qa_dir/summarize.mjs" "$evidence_dir"; then
  warn 'Could not summarize the Vitest timing evidence'
fi
exit "$test_exit"

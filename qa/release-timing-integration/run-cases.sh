#!/usr/bin/env bash
set -euo pipefail
mode="$1"
source_dir="$(cd "$2" && pwd)"
mkdir -p "$3"
evidence="$(cd "$3" && pwd)"
qa_dir="$(cd "$(dirname "$0")" && pwd)"
runner="$source_dir/qa/macos-release-timing/run-release-timing.sh"
export STUDIO_QA_REAL_NPM="$(command -v npm)"

run_case() {
  local name="$1" fault="$2" expected="$3" qa_result
  local output="$evidence/$name"
  if [[ "$name" == init ]]; then printf 'existing file\n' > "$output"; fi
  set +e
  (cd "$source_dir" && PATH="$qa_dir/shim:$PATH" STUDIO_QA_FAULT="$fault" \
    bash "$runner" focused "$output") > "$evidence/$name-console.log" 2>&1
  qa_result=$?
  set -e
  printf '%s\n' "$qa_result" > "$evidence/$name.exit"
  printf 'Vitest wrapper %s exit %s, expected %s\n' "$name" "$qa_result" "$expected"
  if [[ "$qa_result" != "$expected" ]]; then
    tail -45 "$evidence/$name-console.log" >&2
    exit 2
  fi
}

use_timeout_fixture() {
  target="$source_dir/src/renderer/src/App.notation-exchange.test.tsx"
  backup="$(mktemp)"
  cp "$target" "$backup"
  trap 'cp "$backup" "$target"; rm -f "$backup"' EXIT
  cp "$qa_dir/timeout.fixture.ts" "$target"
}

case "$mode" in
  shard)
    (cd "$source_dir" && bash "$runner" shard "$evidence/shard")
    ;;
  timeout)
    use_timeout_fixture
    run_case timeout none 1
    node "$qa_dir/verify-cases.mjs" timeout "$evidence"
    exit "$(cat "$evidence/timeout.exit")"
    ;;
  faults)
    run_case writers writers 0
    run_case summary summary 0
    run_case init none 0
    run_case exit-record exit-record 0
    use_timeout_fixture
    run_case partial-summary partial-summary 1
    node "$qa_dir/verify-cases.mjs" faults "$evidence"
    ;;
  *) exit 2 ;;
esac

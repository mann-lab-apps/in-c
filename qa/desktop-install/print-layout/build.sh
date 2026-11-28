#!/bin/bash
set -euo pipefail
architecture=$1
harness=$2
scratch=$3
proof=$4
export CSC_IDENTITY_AUTO_DISCOVERY=false
cd "$scratch/product"
mkdir -p "$scratch/packages" "$proof"
case "${STUDIO_QA_LAYOUT_CANDIDATE:-full}" in
  full)
    patch_name=candidate.patch.gz
    patch_sha=7d8e3b85379f50caadd164e24bb3e46f83ece28ee50eb2c741e16c3a8b5444cc
    ;;
  plan-only)
    patch_name=plan-only.patch.gz
    patch_sha=3f0741e90f50448fbefbfcf66e8363960d6d7a7b2ab7c0154e38db7d7a8bb78a
    ;;
  auto-print)
    patch_name=auto-print.patch.gz
    patch_sha=3efaf3f1c6b876836c531fd2655fa3bece33a075444700b60c965096a529bee9
    ;;
  *) exit 2 ;;
esac
gzip -dc "$harness/$patch_name" > "$scratch/candidate.patch"
test "$(shasum -a 256 "$scratch/candidate.patch" | cut -d ' ' -f1)" = "$patch_sha"
printf '%s\n' "$patch_sha" > "$proof/candidate-patch-sha256.txt"

if [ ! -f "$scratch/instrumented" ]; then
  cp src/renderer/src/App.tsx "$scratch/base-App.tsx"
  grep -q '^2a14068892434d0c76d619c16f831a6dfaed1c1a$' "$scratch/product-sha"
  python3 "$harness/prepare.py"
  if [ "${STUDIO_QA_OPEN_PHASES:-0}" = 1 ]; then
    python3 "$harness/prepare-open-phases.py"
    cp src/renderer/src/App.tsx "$scratch/base-App.tsx"
  fi
  node "$harness/make-fixture.cjs" "$proof/fixture.chromatics" "$scratch/fixture.cjs" "${STUDIO_QA_SCORE_SIZE:-original}"
  touch "$scratch/instrumented"
fi

for variant in base candidate; do
  if [ -d "$scratch/packaged-out-$architecture-$variant" ]; then
    PACKAGE_DIRECTORY="$scratch/packages/$architecture-$variant" npm run verify:package-content >> "$proof/package-$architecture-$variant.log" 2>&1
    continue
  fi
  cp "$scratch/base-App.tsx" src/renderer/src/App.tsx
  if [ "$variant" = candidate ]; then
    git apply --whitespace=error "$scratch/candidate.patch"
  fi
  if [ ! -d "$scratch/built-$variant" ]; then
    npm run build > "$proof/build-$variant.log" 2>&1
    mv out "$scratch/built-$variant"
  fi
  cp -R "$scratch/built-$variant" out
  node - "$scratch" "$architecture" "$variant" <<'JS'
const fs = require('node:fs')
const [scratch, architecture, variant] = process.argv.slice(2)
const config = require('./package.json').build
config.mac.identity = null
config.mac.notarize = false
config.directories = { ...config.directories, output: `${scratch}/packages/${architecture}-${variant}` }
if (process.env.STUDIO_QA_ELECTRON_ZIPS) config.electronDist = process.env.STUDIO_QA_ELECTRON_ZIPS
fs.writeFileSync(scratch + '/qa-builder.json', JSON.stringify(config))
JS
  ./node_modules/.bin/electron-builder --config "$scratch/qa-builder.json" --dir "--$architecture" --publish never > "$proof/package-$architecture-$variant.log" 2>&1
  bundle=("$scratch/packages/$architecture-$variant"/mac*/*.app)
  test "${#bundle[@]}" -eq 1
  codesign --force --sign - --deep "${bundle[0]}" >> "$proof/package-$architecture-$variant.log" 2>&1
  codesign --verify --strict --deep "${bundle[0]}" >> "$proof/package-$architecture-$variant.log" 2>&1
  mv out "$scratch/packaged-out-$architecture-$variant"
  PACKAGE_DIRECTORY="$scratch/packages/$architecture-$variant" npm run verify:package-content >> "$proof/package-$architecture-$variant.log" 2>&1
done

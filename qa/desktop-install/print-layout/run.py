import hashlib
import json
import os
from pathlib import Path
import plistlib
from shutil import copyfile, copytree
import statistics
import subprocess
import sys


architecture, scratch_dir, proof_dir, driver_file = sys.argv[1:]
scratch, proof, driver = Path(scratch_dir), Path(proof_dir), Path(driver_file)
assert architecture in {'x64', 'arm64'}


def sha(path):
    with path.open('rb') as file:
        return hashlib.file_digest(file, 'sha256').hexdigest()


def check_output(*command):
    return subprocess.check_output(command, text=True, timeout=35).strip()


packages = {}
for variant in ['base', 'candidate']:
    app, = (scratch / 'packages' / f'{architecture}-{variant}').glob('mac*/*.app')
    plist = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
    assert plist['CFBundleShortVersionString'] == '0.1.0-alpha.46'
    exe = app / 'Contents/MacOS' / plist['CFBundleExecutable']
    assert check_output('lipo', '-archs', exe) == ('x86_64' if architecture == 'x64' else 'arm64')
    framework = app / 'Contents/Frameworks/Electron Framework.framework/Versions/A'
    assert plistlib.loads((framework / 'Resources/Info.plist').read_bytes())['CFBundleVersion'] == '42.11.18'
    asar = app / 'Contents/Resources/app.asar'
    text = check_output('otool', '-s', '__TEXT', '__text', exe).splitlines()[1:]
    code_sha = hashlib.sha256('\n'.join(text).encode()).hexdigest()
    scripts = check_output('node', '-e', """
      const { createHash } = require('node:crypto')
      const { extractFile } = require(process.argv[1])
      console.log(JSON.stringify(['out/main/index.js', 'out/preload/index.js'].map(file =>
        createHash('sha256').update(extractFile(process.argv[2], file)).digest('hex'))))
    """, str(scratch / 'product/node_modules/@electron/asar'), str(asar))
    packages[variant] = {'executable': str(exe), 'asar': str(asar), 'asarSha256': sha(asar),
        'frameworkSha256': sha(framework / 'Electron Framework'), 'executableSha256': sha(exe),
        'machineCodeSha256': code_sha, 'mainAndPreloadSha256': json.loads(scripts)}

assert packages['base']['frameworkSha256'] == packages['candidate']['frameworkSha256']
assert packages['base']['machineCodeSha256'] == packages['candidate']['machineCodeSha256']
assert packages['base']['mainAndPreloadSha256'] == packages['candidate']['mainAndPreloadSha256']
assert packages['base']['asarSha256'] != packages['candidate']['asarSha256']
with (proof / f'{architecture}-packages.json').open('w') as output:
    json.dump(packages, output, indent=2)

if architecture == 'x64':
    assert check_output('/usr/bin/arch', '-x86_64', '/usr/sbin/sysctl', '-in', 'sysctl.proc_translated') == '1'
env = {**os.environ, 'STUDIO_QA_APP_VERSION': '0.1.0-alpha.46',
       'STUDIO_QA_FORCE_ROSETTA': '1' if architecture == 'x64' else '0'}
env.pop('STUDIO_QA_INPUT', None)


def run(variant, label, roundtrip=False):
    work = scratch / 'trials' / architecture / f'{label}-{variant}'
    files = work / 'files'
    files.mkdir(parents=True)
    copyfile(proof / 'fixture.chromatics', files / 'input.chromatics')
    info = packages[variant]
    trial_env = {**env, 'STUDIO_QA_PRINT_DIR': str(files), 'STUDIO_QA_LAYOUT_VARIANT': variant,
        'STUDIO_QA_LAYOUT_ROUNDTRIP': '1' if roundtrip else '0', 'TMPDIR': str(work)}
    saved = proof / f'{architecture}-{label}-{variant}'
    saved.mkdir()
    with (saved / 'driver.log').open('wb') as log:
        try:
            subprocess.run(['node', driver, 'layout', info['executable'], work, info['asarSha256']],
                check=True, stdout=log, stderr=subprocess.STDOUT, env=trial_env, timeout=300)
        finally:
            if (work / 'results').exists():
                copytree(work / 'results', saved, dirs_exist_ok=True)
    measurements = json.loads((saved / 'first-open.json').read_text())['details']
    print('LAYOUT ' + json.dumps({'architecture': architecture, 'trial': label, 'variant': variant,
        **measurements}), flush=True)
    return measurements


# Prime both executable paths, then alternate the pairing order.
for variant in ['base', 'candidate']:
    run(variant, 'prime')
pairs = []
for i in range(int(os.environ.get('STUDIO_QA_LAYOUT_PAIRS', '3'))):
    order = ['base', 'candidate'] if i % 2 == 0 else ['candidate', 'base']
    pair = {variant: run(variant, f'pair{i+1}') for variant in order}
    assert pair['base']['layout'] == pair['candidate']['layout']
    pairs.append(pair)
proof_file = proof / f'{architecture}-comparison.json'
report = {'architecture': architecture, 'host': check_output('sw_vers'),
    'pairs': pairs, 'medians': {variant: {key: statistics.median(pair[variant][key] for pair in pairs)
        for key in ['fcpMs', 'openMs', 'screenWallMs', 'devtoolsWallMs', 'startPlanCalls', 'planCalls']}
        for variant in ['base', 'candidate']}}
proof_file.write_text(json.dumps(report, indent=2) + '\n')
for variant in ['base', 'candidate']:
    run(variant, 'roundtrip', roundtrip=True)

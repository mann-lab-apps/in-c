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
phase = os.environ.get('STUDIO_QA_LAYOUT_PHASE', 'both')
assert phase in {'both', 'timing', 'roundtrip'}
measure_open_phases = os.environ.get('STUDIO_QA_OPEN_PHASES') == '1'


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
                check=True, stdout=log, stderr=subprocess.STDOUT, env=trial_env, timeout=900 if roundtrip else 400)
        finally:
            if (work / 'results').exists():
                copytree(work / 'results', saved, dirs_exist_ok=True)
    measurements = json.loads((saved / 'first-open.json').read_text())['details']
    if measure_open_phases:
        data = (saved / 'first-open-process.log').read_text().splitlines()
        prefix = 'QA_NATIVE_OPEN '
        line, = (line for line in data if line.startswith(prefix))
        measurements['mainOpenMs'] = json.loads(line.removeprefix(prefix))
        renderer = measurements['openPhaseMs']
        duration = sum(value for key, value in renderer.items() if key != 'planCallsMs')
        assert abs(duration - measurements['openMs']) < 0.1
        assert len(renderer['planCallsMs']) == measurements['planCalls']
        assert len(measurements['startupPlanMs']) == measurements['startPlanCalls']
        assert measurements['lyricWidthMs'], 'opening must measure the score minimum widths'
        if os.environ.get('STUDIO_QA_LAYOUT_CANDIDATE') == 'plan-only':
            assert measurements['lyricWidthBeforeOpenMs'], 'plan-only retains initial minimum width measurement'
        if os.environ.get('STUDIO_QA_LAYOUT_CANDIDATE') == 'auto-print':
            plan_details = measurements['startupPlanDetails'] + measurements['openPlanDetails']
            assert len(plan_details) == len(measurements['startupPlanMs']) + len(renderer['planCallsMs'])
            if os.environ.get('STUDIO_QA_AUTOMATIC_PAGES') == '1':
                expected = 4 if variant == 'base' else 1
                assert all(plan == {'evaluations': expected, 'targetPages': 'auto'} for plan in plan_details)
            else:
                assert all(plan['targetPages'] == 2 and plan['evaluations'] >= 1 for plan in plan_details)
    print('LAYOUT ' + json.dumps({'architecture': architecture, 'trial': label, 'variant': variant,
        **measurements}), flush=True)
    return measurements


if phase in {'both', 'timing'}:
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
    fixture_path = proof / 'fixture.chromatics'
    fixture = json.loads(fixture_path.read_text())
    staves = [staff for part in fixture['score']['parts'] for staff in part['staves']]
    report = {'architecture': architecture, 'host': check_output('sw_vers'),
        'fixture': {'sha256': sha(fixture_path), 'bytes': fixture_path.stat().st_size,
            'measuresPerStaff': [len(staff['measures']) for staff in staves],
            'eventCount': sum(len(voice['events']) for staff in staves for measure in staff['measures']
                for voice in measure['voices'])},
        'pairs': pairs, 'medians': {variant: {key: statistics.median(pair[variant][key] for pair in pairs)
            for key in ['fcpMs', 'openMs', 'screenWallMs', 'devtoolsWallMs', 'startPlanCalls', 'planCalls']}
            for variant in ['base', 'candidate']}}
    proof_file.write_text(json.dumps(report, indent=2) + '\n')

if phase in {'both', 'roundtrip'}:
    for variant in ['base', 'candidate']:
        run(variant, 'roundtrip', roundtrip=True)

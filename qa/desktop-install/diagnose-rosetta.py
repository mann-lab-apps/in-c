from hashlib import file_digest
import json
import os
from pathlib import Path
import platform
import plistlib
from shutil import copytree
import subprocess
import sys
from tempfile import TemporaryDirectory

from mac_smoke import run_smoke


def hash_file(path):
    with path.open('rb') as stream:
        return file_digest(stream, 'sha256').hexdigest()


def command(*args, timeout=90):
    return subprocess.run(args, check=True, text=True, capture_output=True, timeout=timeout).stdout.strip()


proof = Path(sys.argv[1]).resolve()
first = sys.argv[2]
assert first in {'app-first', 'node-first'}
proof.mkdir(parents=True)
assert platform.machine() == 'arm64'
translated = ['/usr/bin/arch', '-x86_64']
assert command(*translated, '/usr/sbin/sysctl', '-in', 'sysctl.proc_translated') == '1'
version = '0.1.0-alpha.46'
name = 'Ddirori-Studio-0.1.0-alpha.46-mac-universal.dmg'
url = f'https://github.com/mann-lab-apps/in-c/releases/download/v{version}/{name}'
expected_dmg = '6c415659fec6c352eae675977a49559ecd1d5d4a52750ecd0326fc3fe51facdc'
expected_asar = 'fda87b4617988917535eaf5d21b0c8a3d0136a31e3aae45802cc532b1fa85e8c'
expected_executable = '724bcaed613ee58ec193db179c53b3bb86932329bfc7b17c0dc5067392ae3779'
ref = f'refs/tags/v{version}^{{}}'
assert command('git', 'ls-remote', 'https://github.com/mann-lab-apps/in-c.git', ref).split()[0] == '2a14068892434d0c76d619c16f831a6dfaed1c1a'

report = {'order': first, 'host': command('/usr/bin/sw_vers'), 'sha256': expected_dmg, 'probes': {}}
with TemporaryDirectory(dir=os.environ.get('RUNNER_TEMP')) as tmp:
    work = Path(tmp)
    dmg, mount = work / name, work / 'mount'
    mount.mkdir()
    subprocess.run(['curl', '-fsSL', '--proto', '=https', '--proto-redir', '=https', '--retry', '2',
                    '--connect-timeout', '15', '--max-time', '150', '-o', dmg, url], check=True)
    assert hash_file(dmg) == expected_dmg
    command('hdiutil', 'attach', '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount, dmg)
    try:
        source, = mount.glob('*.app')
        app = work / source.name
        command('/usr/bin/ditto', source, app)
    finally:
        command('hdiutil', 'detach', mount)
    command('codesign', '--verify', '--deep', '--strict', app)
    info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
    assert info['CFBundleShortVersionString'] == version and info['CFBundleIdentifier'] == 'com.mannlab.inc'
    executable = app / 'Contents/MacOS' / info['CFBundleExecutable']
    assert hash_file(executable) == expected_executable
    assert hash_file(app / 'Contents/Resources/app.asar') == expected_asar
    env = {**os.environ, 'STUDIO_QA_APP_VERSION': version, 'TMPDIR': str(work) + '/'}
    env.pop('ELECTRON_RUN_AS_NODE', None)
    env.pop('ELECTRON_RENDERER_URL', None)

    def app_trial(label, rosetta):
        home = work / label
        invocation = ['node', Path(__file__).with_name('drive.cjs'), 'startup', executable, home, expected_asar]
        try:
            result = run_smoke(proof, label, invocation,
                               {**env, 'STUDIO_QA_FORCE_ROSETTA': '1' if rosetta else '0'}, timeout=240)
        finally:
            if (home / 'results').is_dir():
                copytree(home / 'results', proof / label)
        startup = json.loads((home / 'results/startup.json').read_text())
        assert result['exitCode'] == 0 and not result['timedOut']
        assert startup['forceRosetta'] == rosetta and startup['exit']['code'] == 0
        assert startup['offlineStartScreen']['width'] == 150 and startup['appAsarSha256'] == expected_asar
        timing = startup['startupTiming']
        assert timing['browserListeningMs'] is not None
        report['probes'][label] = {
            'browserListeningMs': timing['browserListeningMs'], 'rendererTargetMs': startup['rendererTargetMs'],
            'startScreenMs': startup['startScreenMs'], 'documentTiming': timing['documentTiming'], 'samples': timing['samples'],
        }
        print('STARTUP ' + json.dumps({label: report['probes'][label]}), flush=True)

    def node_trial(label, rosetta):
        profile = work / label
        profile.mkdir()
        prefix = translated if rosetta else []
        program = '''console.log("PACKAGED_APP_SMOKE_OK " + JSON.stringify({
            arch: process.arch, electron: process.versions.electron, node: process.versions.node
        }));'''
        result = run_smoke(proof, label, [*prefix, executable, '-e', program, '--', '--piano-audit'],
                           {**env, 'ELECTRON_RUN_AS_NODE': '1', 'DDIRORI_PIANO_QA_DATA': str(profile)}, timeout=150)
        assert not result['timedOut'] and result['exitCode'] == 0 and result['smoke'], result
        assert result['smoke']['arch'] == ('x64' if rosetta else 'arm64')
        report['probes'][label] = {'elapsedSeconds': result['elapsedSeconds'], **result['smoke']}
        print('STARTUP ' + json.dumps({label: report['probes'][label]}), flush=True)

    if first == 'app-first':
        app_trial('rosetta-app-first', True)
        app_trial('rosetta-app-repeat', True)
        node_trial('rosetta-node-after-app', True)
    else:
        node_trial('rosetta-node-first', True)
        app_trial('rosetta-app-after-node', True)
    app_trial('native-app', False)
    node_trial('native-node', False)

(proof / 'comparison.json').write_text(json.dumps(report, indent=2) + '\n')

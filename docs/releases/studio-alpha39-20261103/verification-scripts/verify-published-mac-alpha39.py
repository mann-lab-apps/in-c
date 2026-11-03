import json, os, plistlib, subprocess, tempfile, time, hashlib, shutil, unicodedata
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path

root = Path.cwd()
published = root / 'out/release-qa/published-alpha39'
dmg = published / 'Ddirori-Studio-0.1.0-alpha.39-mac-universal.dmg'
assert dmg.is_file()
mount = Path(tempfile.mkdtemp(prefix='studio-alpha39-published-'))
report = {'version': '0.1.0-alpha.39', 'artifact': str(dmg), 'checks': [],
          'observedAtKst': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
          'releaseSource': '188d4ef40422a221e64a97c6afc78e00000d1c94'}
attached = False
output = root / 'out/release-qa/published-mac-alpha39'
output.mkdir(exist_ok=True)

def run(name, command, env=None, timeout=120):
    started = time.monotonic()
    result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=timeout)
    text = result.stdout + result.stderr
    (output / (name + '.log')).write_text(text)
    report['checks'].append({'name': name, 'exitCode': result.returncode,
                             'seconds': round(time.monotonic() - started, 3)})
    assert result.returncode == 0, (name, text[-1800:])
    return text

try:
    run('attach', ['hdiutil', 'attach', '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', str(mount), str(dmg)])
    attached = True
    app = next(mount.glob('*.app'))
    info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
    assert info['CFBundleShortVersionString'] == '0.1.0-alpha.39'
    assert info['CFBundleIdentifier'] == 'com.mannlab.inc'
    assert info['CFBundleName'] == info['CFBundleExecutable']
    assert unicodedata.normalize('NFC', app.name) == '띠로리 Studio.app'
    assert info['CFBundleDisplayName'] == '띠로리 Studio'
    report['bundleMetadata'] = {key: info.get(key) for key in [
        'CFBundleName', 'CFBundleExecutable', 'CFBundleDisplayName',
        'CFBundleShortVersionString', 'CFBundleVersion', 'CFBundleIconFile']}
    icon = app / 'Contents/Resources' / info['CFBundleIconFile']
    assert icon.is_file(), icon
    assert icon.read_bytes() == (root / 'build/icon.icns').read_bytes()
    report['iconSha256'] = hashlib.sha256(icon.read_bytes()).hexdigest()
    report['iconMatchesVerifiedBrandAsset'] = True
    run('icon-preview', ['sips', '-s', 'format', 'png', str(icon), '--out', str(output / 'published-icon.png')])
    executable = app / 'Contents/MacOS' / info['CFBundleExecutable']
    architectures = run('architectures', ['lipo', '-archs', str(executable)]).split()
    assert set(architectures) == {'arm64', 'x86_64'}, architectures
    report['architectures'] = architectures
    report['bundleIdentifier'] = info['CFBundleIdentifier']
    run('codesign', ['codesign', '--verify', '--deep', '--strict', '--verbose=2', str(app)])
    run('signing-identity', ['codesign', '-dv', '--verbose=4', str(app)])
    run('stapler', ['xcrun', 'stapler', 'validate', str(app)])
    run('gatekeeper', ['spctl', '--assess', '--verbose=2', '--type', 'execute', str(app)])
    env = os.environ.copy()
    env.pop('ELECTRON_RUN_AS_NODE', None)
    env['DDIRORI_PIANO_QA_DATA'] = tempfile.mkdtemp(prefix='studio-alpha39-published-smoke-')
    smoke_temp = output / 'smoke-temp'
    smoke_temp.mkdir(exist_ok=True)
    env['TMPDIR'] = str(smoke_temp) + '/'
    report['isolatedProfile'] = env['DDIRORI_PIANO_QA_DATA']
    report['isolatedTemporaryFiles'] = str(smoke_temp)
    smoke = run('smoke', [str(executable), '--smoke-test', '--piano-audit', '--mute-audio'], env, 30)
    assert 'PACKAGED_APP_SMOKE_OK' in smoke
    result_line = next(line for line in smoke.splitlines() if line.startswith('PACKAGED_APP_SMOKE_OK '))
    report['nativeSmokeResult'] = json.loads(result_line.split(' ', 1)[1])
    report['smokeArtifacts'] = []
    for item in sorted(smoke_temp.iterdir()):
        if item.is_file() and item.name.startswith('in-c-native-'):
            report['smokeArtifacts'].append({'name': item.name, 'bytes': item.stat().st_size,
                'sha256': hashlib.sha256(item.read_bytes()).hexdigest()})
    piano = env | {'PIANO_PACKAGED_APP': str(executable), 'PIANO_PACKAGE_QA_OUTPUT': str(output / 'piano'), 'PIANO_QA_ISOLATE_INPUT': '1'}
    run('piano', ['node', 'out/brand-qa/piano-offline-muted.mjs', '--seconds=12'], piano, 60)
    report['automatedNativeSmoke'] = 'passed; generated fixtures and isolated userData'
    report['piano'] = 'passed; muted 12-second offline graph/sample QA; not listening/endurance approval'
    report['interactiveInstallationOrOsDialogs'] = 'not performed'
    report['status'] = 'passed'
except Exception as error:
    report['status'] = 'failed'
    report['error'] = repr(error)
    raise
finally:
    if attached:
        result = subprocess.run(['hdiutil', 'detach', str(mount)], capture_output=True, text=True, timeout=60)
        report['detached'] = result.returncode == 0
        assert result.returncode == 0, result.stderr
    if mount.exists() and not any(mount.iterdir()):
        mount.rmdir()
    (root / 'docs/releases/studio-alpha39-20261103/published-mac.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

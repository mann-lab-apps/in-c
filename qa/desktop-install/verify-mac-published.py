from datetime import datetime, timezone
from hashlib import file_digest, sha256
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory
from zipfile import ZipFile
import json
import os
import plistlib
import re
import stat
import subprocess
import sys
import time
import unicodedata

root = Path(sys.argv[1]).resolve()
release = json.loads((root / 'release.json').read_text())
tag = sys.argv[2]
version = tag.removeprefix('v')
prefix = f'Ddirori-Studio-{version}-'
repository = 'https://github.com/mann-lab-apps/in-c'
download_root = f'{repository}/releases/download/{tag}'
mac_dmg = prefix + 'mac-universal.dmg'
mac_zip = prefix + 'mac-universal.zip'
windows = [prefix + 'windows-x64-setup.exe', prefix + 'windows-x64-portable.exe']
linux = prefix + 'linux-x86_64.AppImage'
assets = {asset['name']: asset for asset in release['assets']}
expected = {mac_dmg, mac_zip, *windows, linux, 'SHA256SUMS.txt'}
assert release['tagName'] == tag and release['isPrerelease'] and not release['isDraft']
assert release['url'] == f'{repository}/releases/tag/{tag}'
assert len(release['assets']) == len(expected) and set(assets) == expected
for name, asset in assets.items():
    assert asset['url'] == f'{download_root}/{name}', asset['url']
    assert asset['size'] > 0
    assert re.fullmatch(r'sha256:[0-9a-f]{64}', asset['digest']), name

curl = ['curl', '-fLsS', '--proto', '=https', '--proto-redir', '=https',
        '--connect-timeout', '15', '--max-time', '300']
checksums = root / 'SHA256SUMS.txt'
subprocess.run([*curl, '--retry', '3', '-o', str(checksums), assets[checksums.name]['url']], check=True)
expected_digests = {}
for line in checksums.read_text().splitlines():
    digest, name = line.split(maxsplit=1)
    assert name not in expected_digests and re.fullmatch('[a-f0-9]{64}', digest), line
    expected_digests[name] = digest
assert set(expected_digests) == expected - {checksums.name}

def disk_hash(path):
    with path.open('rb') as stream:
        return file_digest(stream, 'sha256').hexdigest()

def verify_receipt(name, size, digest):
    asset = assets[name]
    assert size == asset['size'], (name, size, asset['size'])
    assert 'sha256:' + digest == asset['digest'], name
    if name != checksums.name:
        assert digest == expected_digests[name], name
    return {'name': name, 'url': asset['url'], 'id': asset['id'], 'bytes': size, 'sha256': digest}

def receive(name, path=None):
    received = root / name
    if received.is_file():
        receipt = verify_receipt(name, received.stat().st_size, disk_hash(received))
        with received.open('rb') as stream:
            header = stream.read(64 * 1024)
        print(f'PASS {name} {receipt["bytes"]} bytes {receipt["sha256"]}', flush=True)
        return receipt, header
    for attempt in range(3):
        digest = sha256()
        size = 0
        header = bytearray()
        completed = False
        with subprocess.Popen([*curl, assets[name]['url']], stdout=subprocess.PIPE) as client:
            output = path.open('wb') if path else None
            try:
                for chunk in iter(lambda: client.stdout.read(1024 * 1024), b''):
                    size += len(chunk)
                    digest.update(chunk)
                    if len(header) < 64 * 1024:
                        header.extend(chunk[:64 * 1024 - len(header)])
                    if output:
                        output.write(chunk)
                completed = client.wait() == 0
            except BaseException:
                client.terminate()
                raise
            finally:
                if output:
                    output.close()
        if completed:
            receipt = verify_receipt(name, size, digest.hexdigest())
            print(f'PASS {name} {size} bytes {digest.hexdigest()}', flush=True)
            return receipt, bytes(header)
        if attempt < 2:
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f'Failed to download full asset {name}')

def run(name, command, *, timeout=120, env=None):
    result = subprocess.run(command, text=True, capture_output=True, timeout=timeout, env=env)
    log = root / f'{name}.log'
    log.write_text(result.stdout + result.stderr)
    if result.returncode:
        raise RuntimeError(f'{name} exited {result.returncode}, see {log}')
    return result.stdout + result.stderr

def hash_link(target):
    return 'link:' + target

def normalized(path):
    return unicodedata.normalize('NFC', str(path))

def mounted_hashes(app):
    hashes = {}
    for current, dirnames, filenames in os.walk(app, followlinks=False):
        parent = Path(current)
        for basename in dirnames + filenames:
            member = parent / basename
            relative = normalized(member.relative_to(app))
            if member.is_symlink():
                hashes[relative] = hash_link(os.readlink(member))
            elif member.is_file():
                hashes[relative] = disk_hash(member)
    return hashes

def zip_hashes(archive):
    hashes = {}
    with ZipFile(archive, metadata_encoding="utf-8") as zipped:
        for entry in zipped.infolist():
            member = PurePosixPath(entry.filename)
            if not member.parts or normalized(member.parts[0]) != '띠로리 Studio.app' or entry.is_dir():
                continue
            relative = normalized(PurePosixPath(*member.parts[1:]))
            assert relative not in hashes, relative
            with zipped.open(entry) as stream:
                if stat.S_ISLNK(entry.external_attr >> 16):
                    hashes[relative] = hash_link(stream.read().decode('utf-8'))
                else:
                    hashes[relative] = file_digest(stream, 'sha256').hexdigest()
    return hashes

def verify_mac(mount):
    app, = tuple(mount.glob('*.app'))
    assert normalized(app.name) == '띠로리 Studio.app'
    info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
    assert info['CFBundleDisplayName'] == '띠로리 Studio'
    assert info['CFBundleShortVersionString'] == version
    assert info['CFBundleIdentifier'] == 'com.mannlab.inc'
    executable = app / 'Contents/MacOS' / info['CFBundleExecutable']
    architecture = run('mac-architectures', ['lipo', '-archs', executable]).split()
    assert set(architecture) == {'arm64', 'x86_64'}
    run('mac-codesign', ['codesign', '--verify', '--deep', '--strict', '--verbose=2', app])
    identity = run('mac-identity', ['codesign', '-dv', '--verbose=4', app])
    assert 'Authority=Developer ID Application:' in identity
    run('mac-stapler', ['xcrun', 'stapler', 'validate', app])
    gatekeeper = run('mac-gatekeeper', ['spctl', '--assess', '--verbose=2', '--type', 'execute', app])
    assert 'Notarized Developer ID' in gatekeeper
    smokes = {}
    architectures_to_run = ['arm64']
    if subprocess.run(['/usr/bin/arch', '-x86_64', '/usr/bin/true'],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
        architectures_to_run.append('x86_64')
    for cpu in architectures_to_run:
        profile = mount.parent / f'profile-{cpu}'
        profile.mkdir()
        env = os.environ.copy()
        env.pop('ELECTRON_RUN_AS_NODE', None)
        env.pop('ELECTRON_RENDERER_URL', None)
        env['DDIRORI_PIANO_QA_DATA'] = str(profile)
        env['TMPDIR'] = str(profile) + '/'
        smoke_log = run(f'mac-smoke-{cpu}', ['/usr/bin/arch', f'-{cpu}', executable,
                        '--smoke-test', '--piano-audit', '--mute-audio'], timeout=60, env=env)
        marker = next(line for line in smoke_log.splitlines() if line.startswith('PACKAGED_APP_SMOKE_OK '))
        smokes[cpu] = json.loads(marker.split(' ', 1)[1])
    hashes = mounted_hashes(app)
    return {
        'name': info['CFBundleDisplayName'], 'version': version, 'appId': info['CFBundleIdentifier'],
        'architectures': architecture, 'signing': 'Developer ID', 'notarization': 'stapler validate passed',
        'gatekeeper': gatekeeper.strip(), 'bundleEntries': len(hashes),
        'appAsarSha256': hashes['Contents/Resources/app.asar'],
        'executableSha256': hashes[normalized(executable.relative_to(app))],
        'smoke': smokes,
    }, hashes

receipts = [verify_receipt(checksums.name, checksums.stat().st_size, disk_hash(checksums))]
with TemporaryDirectory(prefix='studio-alpha45-published-', dir=root) as directory:
    work = Path(directory)
    artifact = (root / mac_dmg) if (root / mac_dmg).is_file() else (work / mac_dmg)
    receipt, _ = receive(mac_dmg, artifact)
    receipts.append(receipt)
    mount = work / 'mount'
    mount.mkdir()
    run('mac-dmg-attach', ['hdiutil', 'attach', '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount, artifact])
    try:
        mac, dmg_hashes = verify_mac(mount)
    finally:
        run('mac-dmg-detach', ['hdiutil', 'detach', mount], timeout=60)
    if artifact.parent == work:
        artifact.unlink()
    (root / 'mac-dmg-bundle-hashes.json').write_text(json.dumps(dmg_hashes, ensure_ascii=False, indent=2) + '\n')
    artifact = (root / mac_zip) if (root / mac_zip).is_file() else (work / mac_zip)
    receipt, _ = receive(mac_zip, artifact)
    receipts.append(receipt)
    zip_entries = zip_hashes(artifact)
    zip_only = sorted(zip_entries.keys() - dmg_hashes.keys())
    dmg_only = sorted(dmg_hashes.keys() - zip_entries.keys())
    changed = sorted(name for name in zip_entries.keys() & dmg_hashes.keys() if zip_entries[name] != dmg_hashes[name])
    differences = {'zipOnly': zip_only, 'dmgOnly': dmg_only, 'different': changed}
    (root / 'mac-bundle-comparison.json').write_text(json.dumps(differences, ensure_ascii=False, indent=2) + '\n')
    assert zip_entries == dmg_hashes, differences

report = {
    'tag': tag, 'releaseUrl': release['url'], 'publishedAt': release['publishedAt'],
    'checkedAt': datetime.now(timezone.utc).isoformat(), 'verifiedMacAssets': receipts,
    'macDmg': mac, 'macZip': {'identicalVerifiedBundleEntries': mac['bundleEntries']},
}
(root / 'download-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('PASS published macOS and checksums digests, macOS signed bundle, launch and ZIP bundle equality', flush=True)

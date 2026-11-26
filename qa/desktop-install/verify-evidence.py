from fractions import Fraction
from hashlib import sha256
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import json
import os
import subprocess
import sys


windows, linux, candidate = (Path(arg).resolve() for arg in sys.argv[1:])
schema = candidate / "src/musicxml/schema/musicxml-4.0"
schema_env = {**os.environ, "XML_CATALOG_FILES": (schema / "catalog.xml").as_uri()}


def read(file):
    return json.loads(file.read_text(encoding="utf-8-sig"))


def unique(root, name):
    matches = list(root.rglob(name))
    assert len(matches) == 1, (name, matches)
    return matches[0]


def digest(file):
    return sha256(file.read_bytes()).hexdigest()


def score_pitch(score):
    return score["parts"][0]["staves"][0]["measures"][0]["voices"][0]["events"][0]["pitch"]


def check_native(file, report, version, snapshot=None):
    doc = read(file)
    assert doc["version"] == version and report["savedVersion"] == version
    assert digest(file) == report["savedSha256"] and report["reopened"]
    assert score_pitch(doc["score"]) == report["savedPitch"]
    if snapshot is not None:
        assert score_pitch(doc["score"]) == score_pitch(snapshot["score"])
    if version == 3:
        assert doc["score"]["hairpins"][0]["endTime"]["tick"] == report["endTick"] == 20160


def check_mxl(file, native_file, report):
    assert digest(file) == report["mxl"]
    with ZipFile(file) as archive:
        assert archive.testzip() is None
        container = ET.fromstring(archive.read("META-INF/container.xml"))
        xml = archive.read(container.find("./rootfiles/rootfile").attrib["full-path"])
    score = ET.fromstring(xml)
    assert score.findtext("work/work-title") == read(native_file)["score"]["title"]
    measure = score.find("part/measure")
    note = measure.find("note/pitch")
    note_pitch = dict(step=note.findtext("step"), octave=int(note.findtext("octave")),
                      alter=int(note.findtext("alter", "0")))
    assert note_pitch == {**{"alter": 0}, **report["savedPitch"]}
    cursor = 0
    stops = []
    divisions = int(measure.findtext("attributes/divisions"))
    for item in measure:
        if item.tag == "direction":
            for wedge in item.findall("direction-type/wedge"):
                if wedge.get("type") == "stop":
                    offset = int(item.findtext("offset", "0"))
                    stops.append((Fraction(cursor + offset, divisions), item.findtext("voice")))
        if item.tag in ("backup", "forward") or (item.tag == "note" and item.find("chord") is None):
            cursor += (-1 if item.tag == "backup" else 1) * int(item.findtext("duration", "0"))
    assert stops == [(Fraction(3, 2), "1")], stops
    subprocess.run(["xmllint", "--nonet", "--noout", "--schema", str(schema / "musicxml.xsd"), "-"],
                   input=xml, env=schema_env, check=True)


install_summary = read(unique(windows, "summary.json"))
setup_names = ("candidate-fresh", "published", "candidate-upgrade", "published-reinstalled")
fresh_setup, published, upgrade, reinstalled = (read(unique(windows, name + ".json")) for name in setup_names)
previous_version = "0.1.0-alpha.43"
candidate_version = "0.1.0-alpha.44"
assert install_summary["appId"] == "com.mannlab.inc"
assert install_summary["publishedToCandidate"] == "version upgrade"
assert install_summary["publishedVersion"] == previous_version and install_summary["candidateVersion"] == candidate_version
assert install_summary["portableFileName"] == f"Ddirori-Studio-{candidate_version}-windows-x64-portable.exe"
for stage, expected in ((fresh_setup, candidate_version), (published, previous_version),
                        (upgrade, candidate_version), (reinstalled, previous_version)):
    assert stage["exit"] == 0 and stage["displayVersion"] == expected
    assert stage["source"] == f"Ddirori-Studio-{expected}-windows-x64-setup.exe"
    assert stage["appId"] == install_summary["appId"]
    assert stage["installPath"] == upgrade["installPath"]
assert published["installerSha256"] == "f6676b55be65457373988774cb97dfab37ab1f016c98a19d31b9aeee9f2d45a6"
assert reinstalled["installerSha256"] == published["installerSha256"]
assert reinstalled["appAsarSha256"] == published["appAsarSha256"]
assert fresh_setup["appAsarSha256"] == upgrade["appAsarSha256"] == install_summary["candidateAsarSha256"]
assert published["appAsarSha256"] != upgrade["appAsarSha256"]

fresh_app = read(unique(windows, "fresh.json"))
assert fresh_app["appAsarSha256"] == fresh_setup["appAsarSha256"]
assert fresh_app["details"]["autosaveVersion"] == candidate_version
check_native(unique(windows, "fresh.chromatics"), fresh_app["details"], 3)
print("PASS Windows fresh installed candidate, saved and reopened v3")

for version in (2, 3):
    key = f"v{version}"
    old = read(unique(windows, f"published-{key}.json"))
    new = read(unique(windows, f"installed-recovered-{key}.json"))
    source = unique(windows, f"recovered-{key}.chromatics").parent / f"source-{key}.chromatics"
    before = source.parent / f"before-{key}.json"
    after = source.parent / f"after-{key}.json"
    assert old["appAsarSha256"] == published["appAsarSha256"]
    assert old["exitKind"] == "interrupted-after-autosave"
    assert new["appAsarSha256"] == upgrade["appAsarSha256"]
    assert old["profile"] == new["profile"] and new["details"]["recentRecovered"]
    assert new["sharedDefault"] == (version == 3)
    assert digest(source) == old["details"]["original"] == new["details"]["original"]
    assert digest(before) == old["details"]["recovery"] == new["details"]["beforeRecovery"]
    assert digest(after) == new["details"]["afterRecovery"] != digest(before)
    old_snapshot, new_snapshot = read(before), read(after)
    assert old_snapshot["metadata"]["version"] == old["details"]["autosaveVersion"] == previous_version
    assert new_snapshot["metadata"]["version"] == new["details"]["autosaveVersion"] == candidate_version
    assert old_snapshot["score"] == new_snapshot["score"]
    recovered = unique(windows, f"recovered-{key}.chromatics")
    check_native(recovered, new["details"], version, old_snapshot)
    print("PASS Windows alpha.43 to alpha.44 upgrade, recovery and reopen", key)

    old_reader = read(unique(windows, f"previous-read-{key}.json"))
    assert old_reader["appAsarSha256"] == published["appAsarSha256"]
    assert old_reader["expectedAppVersion"] == previous_version and old_reader["profile"] != new["profile"]
    assert old_reader["details"]["original"] == digest(recovered)
    roundtrip = unique(windows, f"alpha43-roundtrip-{key}.chromatics")
    check_native(roundtrip, old_reader["details"], version, read(recovered))
    assert read(roundtrip)["score"].get("hairpins") == read(recovered)["score"].get("hairpins")
    print("PASS published alpha.43 opens and round-trips alpha.44 Native", key)

for root, expected_platform in ((windows, "win32"), (linux, "linux")):
    delivery = read(unique(root, "distribution.json"))
    details = delivery["details"]
    assert delivery["platform"] == expected_platform and delivery["arch"] == "x64"
    assert details["autosaveVersion"] == candidate_version
    if expected_platform == "win32":
        assert delivery["deliveryMode"] == "portable-exe"
        assert delivery["appAsarSha256"] == install_summary["candidateAsarSha256"]
    else:
        assert delivery["deliveryMode"] in {"appimage-fuse", "appimage-extract-and-run"}
        assert delivery["sharedDefault"]
        expected_asset = f"Ddirori-Studio-{candidate_version}-linux-x86_64.AppImage"
        assert Path(delivery["executable"]).name == expected_asset
        assert Path(unique(linux, "asset-sha256.txt").read_text().split()[-1]).name == expected_asset
    native = unique(root, "distribution.chromatics")
    assert digest(native.parent / "source-v3.chromatics") == details["original"]
    check_native(native, details, 3)
    check_mxl(unique(root, "distribution.mxl"), native, details)
    print("PASS distribution launcher, Native v3, MXL score and fixed XSD", delivery["deliveryMode"])

portable_default = read(unique(windows, "portable-default.json"))
installed_default = read(unique(windows, "installed-recovered-v3.json"))
assert portable_default["deliveryMode"] == "portable-exe" and portable_default["sharedDefault"]
assert portable_default["appAsarSha256"] == installed_default["appAsarSha256"]
assert portable_default["profile"] == installed_default["profile"]
assert portable_default["details"]["recentFromInstalled"] and portable_default["details"]["reopened"]
installed_file = unique(windows, portable_default["details"]["installedFile"])
assert digest(installed_file) == portable_default["details"]["sha256"] == installed_default["details"]["savedSha256"]
print("PASS Windows portable default profile sees and reopens the installed application's recent score")

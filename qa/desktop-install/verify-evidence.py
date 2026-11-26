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
setup_names = ("candidate-fresh", "published", "candidate-replacement")
fresh_setup, published, replacement = (read(unique(windows, name + ".json")) for name in setup_names)
assert install_summary["appId"] == "com.mannlab.inc"
assert install_summary["publishedToCandidate"] == "same-version replacement"
for stage in (fresh_setup, published, replacement):
    assert stage["exit"] == 0 and stage["displayVersion"] == "0.1.0-alpha.43"
    assert stage["appId"] == install_summary["appId"]
    assert stage["installPath"] == replacement["installPath"]
assert published["installerSha256"] == "f6676b55be65457373988774cb97dfab37ab1f016c98a19d31b9aeee9f2d45a6"
assert fresh_setup["appAsarSha256"] == replacement["appAsarSha256"] == install_summary["candidateAsarSha256"]
assert published["appAsarSha256"] != replacement["appAsarSha256"]

fresh_app = read(unique(windows, "fresh.json"))
assert fresh_app["appAsarSha256"] == fresh_setup["appAsarSha256"]
check_native(unique(windows, "fresh.chromatics"), fresh_app["details"], 3)
print("PASS Windows fresh installed candidate, saved and reopened v3")

for version in (2, 3):
    key = f"v{version}"
    old = read(unique(windows, f"published-{key}.json"))
    new = read(unique(windows, f"installed-recovered-{key}.json"))
    source = unique(windows, f"recovered-{key}.chromatics").parent / f"source-{key}.chromatics"
    before = source.parent / f"before-{key}.json"
    assert old["appAsarSha256"] == published["appAsarSha256"]
    assert old["exitKind"] == "interrupted-after-autosave"
    assert new["appAsarSha256"] == replacement["appAsarSha256"]
    assert old["profile"] == new["profile"] and new["details"]["recentRecovered"]
    assert new["sharedDefault"] == (version == 3)
    assert digest(source) == old["details"]["original"] == new["details"]["original"]
    assert digest(before) == old["details"]["recovery"] == new["details"]["beforeRecovery"]
    check_native(unique(windows, f"recovered-{key}.chromatics"), new["details"], version, read(before))
    print("PASS Windows same-version installer replacement, recovery and reopen", key)

for root, expected_platform in ((windows, "win32"), (linux, "linux")):
    delivery = read(unique(root, "distribution.json"))
    details = delivery["details"]
    assert delivery["platform"] == expected_platform and delivery["arch"] == "x64"
    if expected_platform == "win32":
        assert delivery["deliveryMode"] == "portable-exe"
        assert delivery["appAsarSha256"] == install_summary["candidateAsarSha256"]
    else:
        assert delivery["deliveryMode"] in {"appimage-fuse", "appimage-extract-and-run"}
        assert delivery["sharedDefault"]
    native = unique(root, "distribution.chromatics")
    assert digest(native.parent / "source-v3.chromatics") == details["original"]
    check_native(native, details, 3)
    check_mxl(unique(root, "distribution.mxl"), native, details)
    print("PASS distribution launcher, Native v3, MXL score and fixed XSD", delivery["deliveryMode"])

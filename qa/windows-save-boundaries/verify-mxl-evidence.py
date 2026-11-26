from fractions import Fraction
from hashlib import sha256
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import json
import os
import subprocess
import sys


artifacts, candidate = (Path(arg).resolve() for arg in sys.argv[1:])
summary = json.loads((artifacts / "summary.json").read_text(encoding="utf-8"))
candidate_sha = subprocess.check_output(
    ["git", "-C", str(candidate), "rev-parse", "HEAD"], text=True
).strip()
assert summary["candidateSha"] == candidate_sha
scenarios = ["replace", "new-destination", "replace-envelope"]
if summary["platform"] == "win32":
    assert (summary["arch"], summary["filesystem"]) == ("x64", "NTFS")
    scenarios += ["locked-original", "locked-copy"]
expected_cases = {(width, scenario) for width in (960, 1400) for scenario in scenarios}
assert len(summary["results"]) == len(expected_cases)
assert {(case["width"], case["scenario"]) for case in summary["results"]} == expected_cases
schema = candidate / "src/musicxml/schema/musicxml-4.0"
schema_env = {**os.environ, "XML_CATALOG_FILES": (schema / "catalog.xml").as_uri()}


def checked_hash(file, expected):
    actual = sha256(file.read_bytes()).hexdigest()
    assert actual == expected, (file, actual, expected)


def read_score(file):
    with ZipFile(file) as archive:
        assert archive.testzip() is None, file
        assert len(set(archive.namelist())) == len(archive.namelist()), file
        container = ET.fromstring(archive.read("META-INF/container.xml"))
        score_path = container.find("./rootfiles/rootfile").attrib["full-path"]
        name = PurePosixPath(score_path)
        assert not name.is_absolute() and ".." not in name.parts, file
        return archive.read(score_path)


def checked_score(folder, file_name, saved_hash, title, pitch):
    file = folder / file_name
    checked_hash(file, saved_hash)
    xml = read_score(file)
    score = ET.fromstring(xml)
    assert score.findtext("work/work-title") == title, file
    measure = score.find("part/measure")
    note = measure.find("note/pitch")
    actual_pitch = dict(
        step=note.findtext("step"),
        alter=int(note.findtext("alter", "0")),
        octave=int(note.findtext("octave")),
    )
    assert actual_pitch == pitch, (file, actual_pitch, pitch)
    divisions = int(measure.findtext("attributes/divisions"))
    cursor = 0
    stops = []
    for item in measure:
        if item.tag == "direction":
            for wedge in item.findall("direction-type/wedge"):
                if wedge.get("type") == "stop":
                    offset = int(item.findtext("offset", "0"))
                    stops.append((Fraction(cursor + offset, divisions), item.findtext("voice")))
        if item.tag in ("backup", "forward") or (item.tag == "note" and item.find("chord") is None):
            cursor += (-1 if item.tag == "backup" else 1) * int(item.findtext("duration", "0"))
    assert stops == [(Fraction(3, 2), "1")], (file, stops)
    subprocess.run(
        ["xmllint", "--nonet", "--noout", "--schema", str(schema / "musicxml.xsd"), "-"],
        input=xml, env=schema_env, check=True,
    )


for case in summary["results"]:
    folder = artifacts / case["folder"]
    assert case["format"] == "mxl" and case["pass"] and case["exitCode"] == 0, case
    evidence = json.loads((folder / "result.json").read_text(encoding="utf-8"))
    for key in ("width", "scenario", "format"):
        assert evidence[key] == case[key], case
    assert (evidence["platform"], evidence["arch"]) == (summary["platform"], summary["arch"])
    first, *remaining = evidence["logs"]
    assert first["tempFilesCleaned"] and first["selection"], case
    assert "저장하지 않은 변경" in first["unsaved"], case

    if case["scenario"] in {"replace", "replace-envelope"}:
        canceled, saved, second = remaining
        assert first["replacement"]["operation"] == second["replacement"]["operation"] == "replace"
        assert first["replacement"]["pid"] != first["editorPid"]
        assert second["replacement"]["pid"] != first["editorPid"]
        assert first["backupHash"] == first["initial"]
        assert first["actualOriginal"] == first["expectedOriginal"] == canceled["original"]
        assert canceled["confirmationCanceled"] and canceled["selectionCanceled"]
        assert canceled["recovery"] == first["recovery"]
        assert saved["directlySaved"] and second["secondConflictPreserved"] and second["tempFilesCleaned"]
        assert second["actualOriginal"] == second["expectedOriginal"]
        checked_hash(folder / "external-before-conflict.mxl", first["expectedOriginal"])
        checked_hash(folder / "recovery-after-conflict.json", first["recovery"])
        checked_hash(folder / "original.mxl", second["expectedOriginal"])
        checked_hash(folder / "recovery-after-second-conflict.json", second["recovery"])
        if case["scenario"] == "replace-envelope":
            before = folder / "original-before-repack.mxl"
            during = folder / "external-before-conflict.mxl"
            checked_hash(before, first["initial"])
            assert first["initial"] != first["expectedOriginal"]
            assert read_score(before) == read_score(during), case
            with ZipFile(during) as archive:
                assert archive.read("qa-container-rewrite.txt") == b"Same score, new archive member"
        checked_score(folder, "reopened-and-saved.mxl", saved["saved"], saved["adoptedTitle"], saved["savedPitch"])
    elif case["scenario"] == "new-destination":
        saved, = remaining
        assert first["creation"]["operation"] == "create" and first["creation"]["pid"] != first["editorPid"]
        assert first["expectedDestination"] == first["destination"] == saved["destination"]
        assert first["original"] == saved["original"] and saved["reopened"]
        checked_hash(folder / "original.mxl", first["original"])
        checked_hash(folder / "occupied.mxl", first["expectedDestination"])
        checked_hash(folder / "recovery-after-conflict.json", first["recovery"])
        checked_score(folder, "save-copy.mxl", saved["saved"], saved["title"], saved["savedPitch"])
    else:
        saved, = remaining
        assert first["lockPid"] != first["editorPid"]
        assert first["error"]["code"] in {"EACCES", "EPERM", "EBUSY"}
        assert saved["retry"] == "passed"
        checked_hash(folder / "original-at-failure.mxl", first["original"])
        checked_hash(folder / "recovery-after-locked-save.json", first["recovery"])
        if case["scenario"] == "locked-copy":
            assert saved["destination"] == "save-copy.mxl" and saved["recoveryAfterRetry"] == first["recovery"]
            checked_hash(folder / "original.mxl", first["original"])
        else:
            assert saved["destination"] == "original.mxl" and saved["recoveryAfterRetry"] is None
        checked_score(folder, saved["destination"], saved["saved"], saved["title"], saved["savedPitch"])
    print("PASS independent file hashes, MXL score and XSD", case["folder"])

print("PASS packaged MXL evidence", len(expected_cases), summary["platform"], summary["arch"])

from pathlib import Path

from piano_performance.local_manifest import load_local_manifest


def test_load_local_manifest_example() -> None:
    manifest = load_local_manifest(Path("data/manifest.example.json"))

    assert manifest.version == 1
    assert len(manifest.entries) == 3
    assert manifest.entries[0].candidateId == "chopin-impromptu-1-op29-levy"


def test_missing_file_summary_does_not_fail() -> None:
    manifest = load_local_manifest(Path("data/manifest.example.json"))

    summary = manifest.summary(Path.cwd())

    assert summary["entryCount"] == 3
    assert summary["readiness"]["missing"] == 3
    assert all(entry["readiness"] == "missing" for entry in summary["entries"])

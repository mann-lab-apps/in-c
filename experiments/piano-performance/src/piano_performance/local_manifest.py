from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from pydantic import BaseModel, Field

from piano_performance.paths import default_paths


class LocalManifestEntry(BaseModel):
    candidateId: str
    workTitle: str
    composer: str
    scorePath: str
    performanceMidiPath: str | None = None
    audioPath: str | None = None
    sidecarPath: str
    sourceUrl: str
    imslpFileId: str
    license: str
    attribution: str
    territoryRiskKo: str
    allowedForMvpExperiment: bool
    notes: str = ""

    def resolved_paths(self, base_dir: Path) -> dict[str, Path | None]:
        return {
            "scorePath": _resolve_optional(base_dir, self.scorePath),
            "performanceMidiPath": _resolve_optional(base_dir, self.performanceMidiPath),
            "audioPath": _resolve_optional(base_dir, self.audioPath),
            "sidecarPath": _resolve_optional(base_dir, self.sidecarPath),
        }

    def file_status(self, base_dir: Path) -> dict[str, bool]:
        return {
            key: path.exists() if path is not None else False
            for key, path in self.resolved_paths(base_dir).items()
        }

    def readiness(self, base_dir: Path) -> str:
        if not self.allowedForMvpExperiment:
            return "blocked"
        status = self.file_status(base_dir)
        if status["scorePath"] and status["sidecarPath"] and (
            status["performanceMidiPath"] or status["audioPath"]
        ):
            return "ready"
        return "missing"


class LocalManifest(BaseModel):
    version: int
    createdAt: str
    description: str
    entries: list[LocalManifestEntry] = Field(default_factory=list)

    def find_entry(self, candidate_id: str) -> LocalManifestEntry | None:
        return next((entry for entry in self.entries if entry.candidateId == candidate_id), None)

    def summary(self, base_dir: Path) -> dict[str, object]:
        readiness = Counter(entry.readiness(base_dir) for entry in self.entries)
        return {
            "entryCount": len(self.entries),
            "readiness": dict(readiness),
            "entries": [
                {
                    "candidateId": entry.candidateId,
                    "allowedForMvpExperiment": entry.allowedForMvpExperiment,
                    "readiness": entry.readiness(base_dir),
                    "files": entry.file_status(base_dir),
                }
                for entry in self.entries
            ],
        }


def _resolve_optional(base_dir: Path, path: str | None) -> Path | None:
    if not path:
        return None
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    return base_dir / candidate


def load_local_manifest(path: Path) -> LocalManifest:
    with path.open(encoding="utf-8") as file:
        payload = json.load(file)
    return LocalManifest.model_validate(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarize local piano performance data manifest.")
    parser.add_argument("--manifest", type=Path, default=Path("data/manifest.example.json"))
    args = parser.parse_args()

    paths = default_paths()
    manifest_path = args.manifest
    if not manifest_path.is_absolute():
        manifest_path = paths.root / manifest_path
    manifest = load_local_manifest(manifest_path)
    print(json.dumps(manifest.summary(paths.root), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

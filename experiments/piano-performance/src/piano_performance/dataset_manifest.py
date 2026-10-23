from __future__ import annotations

import argparse
import json
from collections import Counter
from collections.abc import Iterable
from pathlib import Path

from pydantic import BaseModel, Field

from piano_performance.paths import default_paths

OPEN_LICENSE_MARKERS = (
    "creative commons zero",
    "public domain",
    "creative commons attribution 4.0",
    "creative commons attribution-share alike",
)
BLOCKED_LICENSE_MARKERS = (
    "noncommercial",
    "non-commercial",
    "no derivatives",
    "noderivs",
    "performance restricted",
    "non-pd",
)


class Candidate(BaseModel):
    id: str
    instrument: str
    composer: str
    workTitle: str
    movementOrSelection: str
    imslpWorkUrl: str
    imslpFileIds: list[str] = Field(default_factory=list)
    scoreStatus: str
    recordingStatus: str
    recordingCountOnPage: int
    selectedRecordingCount: int
    performers: list[str] = Field(default_factory=list)
    recordingLicense: str
    scoreLicense: str
    fileFormats: list[str] = Field(default_factory=list)
    durationSeconds: int | None = None
    territoryTags: list[str] = Field(default_factory=list)
    territoryRiskKo: str
    alignmentDifficulty: str
    modelUse: list[str] = Field(default_factory=list)
    priority: str
    notes: str = ""

    @property
    def is_blocked_by_license(self) -> bool:
        license_text = self.recordingLicense.lower()
        return any(marker in license_text for marker in BLOCKED_LICENSE_MARKERS)

    @property
    def has_open_license_marker(self) -> bool:
        license_text = self.recordingLicense.lower()
        return any(marker in license_text for marker in OPEN_LICENSE_MARKERS)


class SeedManifest(BaseModel):
    version: int
    createdAt: str
    scope: str
    legalNote: str
    qualityPolicy: str
    candidates: list[Candidate]
    blockedExamples: list[dict] = Field(default_factory=list)
    nextSteps: list[str] = Field(default_factory=list)

    def filter_candidates(
        self,
        *,
        instrument: str | None = None,
        statuses: Iterable[str] | None = None,
        priorities: Iterable[str] | None = None,
        require_open_license: bool = False,
    ) -> list[Candidate]:
        status_set = set(statuses or [])
        priority_set = set(priorities or [])
        results: list[Candidate] = []
        for candidate in self.candidates:
            if instrument and candidate.instrument != instrument:
                continue
            if status_set and candidate.recordingStatus not in status_set:
                continue
            if priority_set and candidate.priority not in priority_set:
                continue
            if require_open_license and (
                candidate.is_blocked_by_license or not candidate.has_open_license_marker
            ):
                continue
            results.append(candidate)
        return results

    def summary(self) -> dict[str, object]:
        return {
            "candidateCount": len(self.candidates),
            "byInstrument": dict(Counter(c.instrument for c in self.candidates)),
            "byStatus": dict(Counter(c.recordingStatus for c in self.candidates)),
            "byPriority": dict(Counter(c.priority for c in self.candidates)),
            "totalSelectedRecordings": sum(c.selectedRecordingCount for c in self.candidates),
        }


def load_seed_manifest(path: Path | None = None) -> SeedManifest:
    manifest_path = path or default_paths().seed_manifest
    with manifest_path.open(encoding="utf-8") as file:
        payload = json.load(file)
    return SeedManifest.model_validate(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarize IMSLP piano performance seed metadata.")
    parser.add_argument("--manifest", type=Path, default=None)
    parser.add_argument("--instrument", default="piano")
    parser.add_argument("--require-open-license", action="store_true")
    args = parser.parse_args()

    manifest = load_seed_manifest(args.manifest)
    candidates = manifest.filter_candidates(
        instrument=args.instrument,
        require_open_license=args.require_open_license,
    )
    print(json.dumps(manifest.summary(), ensure_ascii=False, indent=2))
    print(json.dumps([c.id for c in candidates], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

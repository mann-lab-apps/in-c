from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = PACKAGE_ROOT.parents[1]


@dataclass(frozen=True)
class ExperimentPaths:
    root: Path = PACKAGE_ROOT
    data: Path = PACKAGE_ROOT / "data"
    raw: Path = PACKAGE_ROOT / "data" / "raw"
    interim: Path = PACKAGE_ROOT / "data" / "interim"
    processed: Path = PACKAGE_ROOT / "data" / "processed"
    runs: Path = PACKAGE_ROOT / "runs"
    models: Path = PACKAGE_ROOT / "models"
    seed_manifest: Path = (
        REPO_ROOT / "docs" / "product" / "imslp-piano-performance-engine-seed.json"
    )

    def ensure_runtime_dirs(self) -> None:
        for path in (self.raw, self.interim, self.processed, self.runs, self.models):
            path.mkdir(parents=True, exist_ok=True)


def default_paths() -> ExperimentPaths:
    return ExperimentPaths()

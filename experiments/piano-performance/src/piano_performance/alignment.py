from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import yaml

from piano_performance.features import AlignmentPair, PerformanceEvent, ScoreEvent
from piano_performance.local_manifest import load_local_manifest
from piano_performance.paths import default_paths


@dataclass(frozen=True)
class AlignmentInput:
    candidate_id: str
    method: str
    score_path: Path | None
    performance_midi_path: Path | None
    audio_path: Path | None
    seconds_per_beat: float = 0.5


@dataclass(frozen=True)
class AlignmentResult:
    candidate_id: str
    method: str
    status: str
    pairs: list[AlignmentPair]
    score_event_count: int
    performance_event_count: int
    notes: str = ""

    def to_json_dict(self) -> dict[str, object]:
        return {
            "candidateId": self.candidate_id,
            "method": self.method,
            "status": self.status,
            "scoreEventCount": self.score_event_count,
            "performanceEventCount": self.performance_event_count,
            "pairCount": len(self.pairs),
            "pairs": [asdict(pair) for pair in self.pairs],
            "notes": self.notes,
        }


def simple_onset_alignment(
    score_events: list[ScoreEvent],
    performance_events: list[PerformanceEvent],
    *,
    candidate_id: str,
    seconds_per_beat: float = 0.5,
) -> AlignmentResult:
    remaining = list(enumerate(sorted(performance_events, key=lambda event: event.onset_seconds)))
    pairs: list[AlignmentPair] = []

    for score_event in sorted(score_events, key=lambda event: event.onset_beats):
        match_position = _find_matching_performance_position(score_event, remaining)
        if match_position is None:
            continue
        original_index, performance_event = remaining.pop(match_position)
        expected_onset_seconds = score_event.onset_beats * seconds_per_beat
        pairs.append(
            AlignmentPair(
                score_note_id=score_event.note_id,
                performance_event_index=original_index,
                timing_offset_seconds=performance_event.onset_seconds - expected_onset_seconds,
            )
        )

    status = "aligned" if pairs else "empty"
    return AlignmentResult(
        candidate_id=candidate_id,
        method="simple-onset",
        status=status,
        pairs=pairs,
        score_event_count=len(score_events),
        performance_event_count=len(performance_events),
        notes="Pitch-aware greedy onset alignment for smoke tests only.",
    )


def align_score_to_performance_midi(alignment_input: AlignmentInput) -> AlignmentResult:
    raise NotImplementedError(
        "Real MIDI parsing is deferred. Use simple_onset_alignment with extracted events first."
    )


def align_score_to_audio_reference(alignment_input: AlignmentInput) -> AlignmentResult:
    raise NotImplementedError(
        "Audio waveform alignment is deferred to a later synctoolbox or DTW spike."
    )


def _find_matching_performance_position(
    score_event: ScoreEvent,
    remaining: list[tuple[int, PerformanceEvent]],
) -> int | None:
    if not remaining:
        return None
    for index, (_original_index, performance_event) in enumerate(remaining):
        if performance_event.midi_pitch == score_event.midi_pitch:
            return index
    return 0


def _dummy_alignment_for_candidate(candidate_id: str, seconds_per_beat: float) -> AlignmentResult:
    score_events = [
        ScoreEvent("n1", 0.0, 1.0, 60),
        ScoreEvent("n2", 1.0, 1.0, 64),
        ScoreEvent("n3", 2.0, 1.0, 67),
    ]
    performance_events = [
        PerformanceEvent(None, 0.02, 0.48, 60, 82),
        PerformanceEvent(None, 0.54, 0.46, 64, 88),
        PerformanceEvent(None, 1.08, 0.51, 67, 91),
    ]
    return simple_onset_alignment(
        score_events,
        performance_events,
        candidate_id=candidate_id,
        seconds_per_beat=seconds_per_beat,
    )


def run_alignment_smoke(config_path: Path) -> dict[str, object]:
    paths = default_paths()
    with config_path.open(encoding="utf-8") as file:
        config = yaml.safe_load(file) or {}

    manifest_path = Path(config["local_manifest"])
    if not manifest_path.is_absolute():
        manifest_path = paths.root / manifest_path
    manifest = load_local_manifest(manifest_path)
    candidate_id = config["candidate_id"]
    entry = manifest.find_entry(candidate_id)
    if entry is None:
        raise ValueError(f"Candidate not found in local manifest: {candidate_id}")

    result = _dummy_alignment_for_candidate(
        candidate_id,
        seconds_per_beat=float(config.get("seconds_per_beat", 0.5)),
    )
    output_dir = Path(config.get("output_dir", "runs/alignment-smoke"))
    if not output_dir.is_absolute():
        output_dir = paths.root / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{candidate_id}.alignment.json"
    output_path.write_text(
        json.dumps(result.to_json_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return {"outputPath": str(output_path), "result": result.to_json_dict()}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run alignment smoke test with dummy events.")
    parser.add_argument("--config", type=Path, default=Path("configs/alignment_smoke.yaml"))
    args = parser.parse_args()
    config_path = args.config
    if not config_path.is_absolute():
        config_path = default_paths().root / config_path
    print(json.dumps(run_alignment_smoke(config_path), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

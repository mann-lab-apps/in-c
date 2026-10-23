from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class ScoreEvent:
    note_id: str
    onset_beats: float
    duration_beats: float
    midi_pitch: int
    notated_velocity_hint: float | None = None


@dataclass(frozen=True)
class PerformanceEvent:
    note_id: str | None
    onset_seconds: float
    duration_seconds: float
    midi_pitch: int
    velocity: int


@dataclass(frozen=True)
class PedalEvent:
    time_seconds: float
    value: float


@dataclass(frozen=True)
class AlignmentPair:
    score_note_id: str
    performance_event_index: int
    timing_offset_seconds: float


@dataclass(frozen=True)
class PerformanceFeatureBatch:
    inputs: np.ndarray
    targets: np.ndarray
    feature_names: list[str]
    target_names: list[str]


def extract_score_events_from_musicxml(path: Path) -> list[ScoreEvent]:
    raise NotImplementedError(f"MusicXML parsing is out of scope for the MVP skeleton: {path}")


def extract_performance_events_from_midi(path: Path) -> list[PerformanceEvent]:
    raise NotImplementedError(f"MIDI parsing is out of scope for the MVP skeleton: {path}")


def extract_audio_reference_features(path: Path) -> np.ndarray:
    raise NotImplementedError(
        f"Audio feature extraction is out of scope for the MVP skeleton: {path}"
    )


def build_note_level_features(
    score_events: list[ScoreEvent],
    performance_events: list[PerformanceEvent],
    alignment: list[AlignmentPair],
) -> PerformanceFeatureBatch:
    if not score_events or not performance_events or not alignment:
        return PerformanceFeatureBatch(
            inputs=np.empty((0, 4), dtype=np.float32),
            targets=np.empty((0, 2), dtype=np.float32),
            feature_names=["onset_beats", "duration_beats", "midi_pitch", "notated_velocity_hint"],
            target_names=["timing_offset_seconds", "velocity"],
        )

    score_by_id = {event.note_id: event for event in score_events}
    inputs: list[list[float]] = []
    targets: list[list[float]] = []
    for pair in alignment:
        score_event = score_by_id[pair.score_note_id]
        performance_event = performance_events[pair.performance_event_index]
        inputs.append(
            [
                score_event.onset_beats,
                score_event.duration_beats,
                float(score_event.midi_pitch),
                score_event.notated_velocity_hint or 0.0,
            ]
        )
        targets.append([pair.timing_offset_seconds, float(performance_event.velocity)])

    return PerformanceFeatureBatch(
        inputs=np.asarray(inputs, dtype=np.float32),
        targets=np.asarray(targets, dtype=np.float32),
        feature_names=["onset_beats", "duration_beats", "midi_pitch", "notated_velocity_hint"],
        target_names=["timing_offset_seconds", "velocity"],
    )

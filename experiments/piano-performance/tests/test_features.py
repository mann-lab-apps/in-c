from piano_performance.features import (
    AlignmentPair,
    PerformanceEvent,
    ScoreEvent,
    build_note_level_features,
)


def test_build_note_level_features_empty() -> None:
    batch = build_note_level_features([], [], [])

    assert batch.inputs.shape == (0, 4)
    assert batch.targets.shape == (0, 2)


def test_build_note_level_features_from_aligned_events() -> None:
    batch = build_note_level_features(
        [ScoreEvent("n1", 1.0, 0.5, 60, 0.75)],
        [PerformanceEvent("n1", 1.03, 0.48, 60, 88)],
        [AlignmentPair("n1", 0, 0.03)],
    )

    assert batch.inputs.shape == (1, 4)
    assert batch.targets.shape == (1, 2)
    assert batch.targets[0, 1] == 88

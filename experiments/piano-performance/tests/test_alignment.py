from pathlib import Path

from piano_performance.alignment import run_alignment_smoke, simple_onset_alignment
from piano_performance.features import PerformanceEvent, ScoreEvent


def test_simple_onset_alignment_pairs_same_pitch_events() -> None:
    result = simple_onset_alignment(
        [
            ScoreEvent("n1", 0.0, 1.0, 60),
            ScoreEvent("n2", 1.0, 1.0, 64),
        ],
        [
            PerformanceEvent(None, 0.03, 0.5, 60, 80),
            PerformanceEvent(None, 0.55, 0.5, 64, 90),
        ],
        candidate_id="candidate",
        seconds_per_beat=0.5,
    )

    assert result.status == "aligned"
    assert len(result.pairs) == 2
    assert result.pairs[0].score_note_id == "n1"
    assert round(result.pairs[1].timing_offset_seconds, 2) == 0.05


def test_alignment_smoke_writes_result(tmp_path) -> None:
    config_path = tmp_path / "alignment.yaml"
    output_dir = tmp_path / "alignment-output"
    config_path.write_text(
        "\n".join(
            [
                "local_manifest: data/manifest.example.json",
                "candidate_id: chopin-impromptu-1-op29-levy",
                "method: simple-onset",
                f"output_dir: {output_dir}",
                "seconds_per_beat: 0.5",
            ]
        ),
        encoding="utf-8",
    )

    payload = run_alignment_smoke(config_path)

    output_path = Path(payload["outputPath"])
    assert output_path.exists()
    assert payload["result"]["pairCount"] == 3

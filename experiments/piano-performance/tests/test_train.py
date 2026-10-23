import json

from piano_performance.evaluate import regression_metrics
from piano_performance.train import TrainConfig, train_smoke


def test_regression_metrics() -> None:
    import torch

    metrics = regression_metrics(torch.tensor([1.0, 3.0]), torch.tensor([2.0, 1.0]))

    assert metrics["mae"] == 1.5
    assert round(metrics["rmse"], 6) == 1.581139


def test_train_smoke_writes_metrics(tmp_path) -> None:
    config = TrainConfig(
        epochs=1,
        batch_size=2,
        sequence_length=3,
        input_dim=4,
        hidden_dim=8,
        dummy_batches=1,
        run_name="test",
    )

    result = train_smoke(config, run_dir=tmp_path)

    assert result["device"] == "cpu" or result["device"] in {"mps", "cuda"}
    metrics_path = tmp_path / "metrics.json"
    assert metrics_path.exists()
    payload = json.loads(metrics_path.read_text(encoding="utf-8"))
    assert payload["metrics"]["mae"] >= 0

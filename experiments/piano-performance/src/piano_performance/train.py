from __future__ import annotations

import argparse
import json
import random
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import torch
import yaml

from piano_performance.evaluate import regression_metrics
from piano_performance.model import NoteExpressionModel, make_dummy_batch
from piano_performance.paths import default_paths


@dataclass(frozen=True)
class TrainConfig:
    seed: int = 42
    device: str = "auto"
    epochs: int = 1
    batch_size: int = 8
    sequence_length: int = 16
    input_dim: int = 8
    hidden_dim: int = 32
    learning_rate: float = 0.001
    dummy_batches: int = 3
    run_name: str = "smoke"


def load_config(path: Path) -> TrainConfig:
    with path.open(encoding="utf-8") as file:
        payload = yaml.safe_load(file) or {}
    return TrainConfig(**payload)


def select_device(requested: str = "auto") -> torch.device:
    if requested != "auto":
        return torch.device(requested)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def create_run_dir(run_name: str) -> Path:
    paths = default_paths()
    paths.ensure_runtime_dirs()
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    run_dir = paths.runs / f"{stamp}-{run_name}"
    run_dir.mkdir(parents=True, exist_ok=False)
    return run_dir


def train_smoke(config: TrainConfig, run_dir: Path | None = None) -> dict[str, object]:
    set_seed(config.seed)
    device = select_device(config.device)
    model = NoteExpressionModel(config.input_dim, config.hidden_dim).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)
    loss_fn = torch.nn.MSELoss()

    last_metrics: dict[str, float] = {"mae": 0.0, "rmse": 0.0}
    last_loss = 0.0
    for _epoch in range(config.epochs):
        model.train()
        for _batch_index in range(config.dummy_batches):
            features, targets = make_dummy_batch(
                batch_size=config.batch_size,
                sequence_length=config.sequence_length,
                input_dim=config.input_dim,
                device=device,
            )
            predictions = model(features)
            loss = loss_fn(predictions, targets)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            last_loss = loss.item()
            last_metrics = regression_metrics(predictions, targets)

    payload: dict[str, object] = {
        "device": str(device),
        "loss": last_loss,
        "metrics": last_metrics,
        "config": asdict(config),
    }

    output_dir = run_dir or create_run_dir(config.run_name)
    (output_dir / "config.json").write_text(
        json.dumps(asdict(config), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "metrics.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run dummy smoke training for piano performance model."
    )
    parser.add_argument("--config", type=Path, default=Path("configs/smoke.yaml"))
    args = parser.parse_args()
    config = load_config(args.config)
    result = train_smoke(config)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

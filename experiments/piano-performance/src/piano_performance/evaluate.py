from __future__ import annotations

import math

import torch


def regression_metrics(predictions: torch.Tensor, targets: torch.Tensor) -> dict[str, float]:
    if predictions.shape != targets.shape:
        raise ValueError(
            f"Shape mismatch: predictions={predictions.shape}, targets={targets.shape}"
        )
    error = predictions.detach() - targets.detach()
    mae = error.abs().mean().item()
    rmse = math.sqrt(torch.square(error).mean().item())
    return {"mae": mae, "rmse": rmse}

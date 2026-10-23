from __future__ import annotations

import torch
from torch import nn


class NoteExpressionModel(nn.Module):
    """Tiny baseline: note feature sequence -> timing offset and velocity."""

    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int = 2) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        if features.ndim != 3:
            raise ValueError("Expected features shaped [batch, sequence, input_dim].")
        return self.network(features)


def make_dummy_batch(
    *,
    batch_size: int,
    sequence_length: int,
    input_dim: int,
    device: torch.device,
) -> tuple[torch.Tensor, torch.Tensor]:
    features = torch.randn(batch_size, sequence_length, input_dim, device=device)
    timing = features[..., 0:1] * 0.03
    velocity = torch.sigmoid(features[..., 1:2]) * 127.0
    targets = torch.cat([timing, velocity], dim=-1)
    return features, targets

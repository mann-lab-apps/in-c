import pytest
import torch

from piano_performance.model import NoteExpressionModel, make_dummy_batch


def test_model_forward_shape() -> None:
    device = torch.device("cpu")
    model = NoteExpressionModel(input_dim=8, hidden_dim=16)
    features, _targets = make_dummy_batch(
        batch_size=2,
        sequence_length=4,
        input_dim=8,
        device=device,
    )

    outputs = model(features)

    assert outputs.shape == (2, 4, 2)


def test_model_rejects_unbatched_shape() -> None:
    model = NoteExpressionModel(input_dim=8, hidden_dim=16)

    with pytest.raises(ValueError):
        model(torch.randn(4, 8))

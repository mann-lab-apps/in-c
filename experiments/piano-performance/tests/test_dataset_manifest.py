from piano_performance.dataset_manifest import load_seed_manifest


def test_load_seed_manifest() -> None:
    manifest = load_seed_manifest()

    assert manifest.version == 1
    assert len(manifest.candidates) >= 10
    assert manifest.summary()["byInstrument"]["piano"] >= 10


def test_filter_candidates_by_status_priority_and_license() -> None:
    manifest = load_seed_manifest()

    candidates = manifest.filter_candidates(
        instrument="piano",
        statuses=["cleared-metadata-candidate"],
        priorities=["high"],
        require_open_license=True,
    )

    assert candidates
    assert all(candidate.instrument == "piano" for candidate in candidates)
    assert all(
        candidate.recordingStatus == "cleared-metadata-candidate" for candidate in candidates
    )
    assert all(candidate.priority == "high" for candidate in candidates)
    assert all(not candidate.is_blocked_by_license for candidate in candidates)

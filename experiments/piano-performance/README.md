# Piano Performance Engine Experiments

IMSLP 피아노 후보를 바탕으로 `score/metadata -> expressive MIDI/performance features` 실험을 시작하기 위한 독립 Python 작업공간이다.

이번 MVP는 실제 IMSLP 파일 다운로드, 대량 크롤링, OMR, alignment 모델 구현, neural virtual instrument 학습을 하지 않는다. 먼저 seed manifest를 읽고, dummy data로 PyTorch 학습 루프와 실험 기록 구조가 동작하는지 확인한다.

## Setup

권장 실행 환경은 Python 3.11 이상과 `uv`다.

```sh
cd experiments/piano-performance
uv sync
```

오디오/MIDI 파싱 라이브러리까지 한 번에 준비하려면:

```sh
uv sync --extra audio
```

## Commands

Seed 후보 요약:

```sh
uv run python -m piano_performance.dataset_manifest
```

Local data manifest 요약:

```sh
uv run python -m piano_performance.local_manifest --manifest data/manifest.example.json
```

Alignment smoke:

```sh
uv run python -m piano_performance.alignment --config configs/alignment_smoke.yaml
```

Dummy smoke training:

```sh
uv run python -m piano_performance.train --config configs/smoke.yaml
```

Tests:

```sh
uv run pytest
```

Lint:

```sh
uv run ruff check src tests
```

## Scope

- PyTorch baseline skeleton.
- CPU/MPS/CUDA device auto detection.
- IMSLP seed JSON loader.
- Manifest filtering by instrument, status, license, and priority.
- Local manifest validation that reports missing files without failing.
- Score/performance alignment interface and dummy onset matching smoke.
- Feature extraction interfaces for future MIDI/audio/alignment work.
- Dummy train/evaluate loop with metrics JSON output.

## Out Of Scope

- IMSLP 자동 다운로드.
- IMSLP 로그인, 우회 접근, membership-only 접근.
- 실제 음원/악보 파일 커밋.
- OMR/MusicXML 변환.
- 실제 score-audio alignment.
- IMSLP PDF를 자동으로 MusicXML로 변환하는 작업.
- production-quality listening QA.
- 법률 판단 확정.

## Manual Data Flow

실제 다운로드를 시작하기 전에 `docs/product/imslp-piano-performance-download-plan.md`를 다시 확인한다.

1. `data/raw/<candidate-id>/` 아래에 수동으로 받은 파일을 둔다.
2. 같은 디렉터리에 sidecar JSON을 둔다.
3. `data/local-manifest.json`을 만들고 `data/manifest.example.json` 형식을 따른다.
4. 아래 명령으로 누락 파일과 권리 플래그를 확인한다.

```sh
uv run python -m piano_performance.local_manifest --manifest data/local-manifest.json
```

첫 spike에서는 실제 audio waveform alignment로 바로 가지 않는다. 먼저 score MIDI 또는 직접 만든 최소 MusicXML/MIDI fixture와 performance MIDI fixture를 넣고, `simple-onset` alignment가 expected pair를 만드는지 확인한다.

## Next Steps

1. 다운로드 manifest를 별도로 만들고, 수동 권리 검토를 기록한다.
2. 짧은 후보부터 raw data를 채운다: Chopin Impromptu No.1, Impromptu No.2, Polonaise B.6.
3. 악보 PDF와 녹음 파일마다 source URL, IMSLP file ID, license, attribution sidecar JSON을 둔다.
4. MusicXML 또는 MIDI score source를 확보한 뒤 alignment spike를 시작한다.
5. 실제 feature format을 고정한 뒤 dummy dataset을 real dataset adapter로 교체한다.

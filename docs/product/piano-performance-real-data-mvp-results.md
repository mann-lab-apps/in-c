# 실제 피아노 연주 모델 MVP 검증 결과

검증일: 2026-10-30. 기존 학습일: 2026-10-26.

실제 피아노 녹음의 전사 라벨로 학습한 checkpoint를 재사용해, BWV 846의 192음 악보에서 기본/모델 비교 재생을 연결했다. 모든 음의 pitch/onset/duration 보존, 모델의 예약 시각·세기 적용, 동일 음색, 정지·재개, 다른 악보 거부와 편집 후 예측 해제를 확인했다. `performanceLab=1` 개발 옵션에서 재현할 수 있다.

**현재 성과는 실제 데이터 파이프라인과 앱 연결 검증이다.** 평가 작품의 velocity MAE는 학습 평균 baseline보다 낮지만, timing 개선은 약 0.07ms로 매우 작다. 학습 1작품·검증 1작품·평가 1작품이며, 모두 바흐/같은 연주자다. 음악적 품질과 청음은 미확인이다.

## 데이터와 split

연주자는 Kimiko Ishizaka다. 실제 다운로드 바이트는 Wikimedia Commons의 Open Well-Tempered Clavier OGG이며, 기계가 읽을 악보는 Mutopia MIDI다. 기존 원본·전사·feature·checkpoint를 덮어쓰거나 다시 다운로드하지 않았다.

| 작품 | split | 원본 녹음 길이 | 처리 구간 | 전사 음표 | 구간 악보 음표 | 채택 음표 | 채택 onset 범위 |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| BWV 846 Prelude | train | 162.920초 | 0–60초 | 218 | 192 | 192 | 1.434–52.723초 |
| BWV 850 Prelude | validation | 92.627초 | 0–60초 | 537 | 319 | 319 | 0.927–35.984초 |
| BWV 851 Prelude | test | 98.053초 | 0–60초 | 552 | 373 | 371 | 1.432–40.789초 |
| 합계 | 작품별 분리 | 353.600초 | 180초 처리 | 1,307 | 884 | 882 | 각 구간 끝의 잔여 오디오 제외 |

악보 선택은 BWV 846의 1–12마디/0–48 quarter beats, BWV 850의 1–16마디/0–64 quarter beats, BWV 851의 1–16마디/0–48 quarter beats다. 반복 없이 원순서로 사용했다. onset 범위는 선택된 음표의 시작 시각 범위이고, 처리한 180초 전체가 학습된 것은 아니다. 실제 학습 입력은 train의 192음뿐이다.

작품 ID, 원본 score/performance 파일 해시, 전사본의 원본 오디오 해시를 기준으로 split 누수를 검사했다. 동일 녹음에서 만든 전사본을 다른 split으로 넣는 경우도 거부한다. 작품 ID의 의미와 편집 판본 일치는 수동 선정에 의존한다.

## 출처와 이용 조건

녹음과 악보의 라이선스를 각각 기록했다. 2026-10-30 원문 표기와 기존 파일 SHA256을 재확인했다.

| 작품 | 실제 녹음 출처 | 악보 MIDI 출처 |
| --- | --- | --- |
| BWV 846 | [Commons 개별 파일, CC0](https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.ogg) | [Mutopia 5, Public Domain](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=5) |
| BWV 850 | [Commons 개별 파일, CC0](https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_09_Prelude_No._5_in_D_major,_BWV_850.ogg) | [Mutopia 1496, Public Domain](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1496) |
| BWV 851 | [Commons 개별 파일, CC0](https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_11_Prelude_No._6_in_D_minor,_BWV_851.ogg) | [Mutopia 538, Public Domain](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=538) |

attribution은 Bach/연주자/프로젝트와 Mutopia의 기보자를 보존한다. BWV 846 Mutopia 페이지의 원판 source는 `Unknown`이며 기보자의 public-domain dedication과 별도로 남긴다. BWV 850/851은 Breitkopf & Härtel 1866 출처 표기가 있다. 원판·지역권·기보 일치의 프로덕션 검토를 완료했다는 뜻은 아니다.

[IMSLP BWV 846 페이지](https://imslp.org/wiki/Prelude_and_Fugue_in_C_major,_BWV_846_(Bach,_Johann_Sebastian))의 관련 #409987/#409989는 같은 연주의 FLAC/MP3이고 CC BY 4.0 표기다. 이 작업에서 받은 Commons OGG에 그 파일 ID나 라이선스를 전용하지 않았다. 기존 seed 전체가 검증됐다는 주장도 하지 않는다.

전사 모델의 조건은 다음처럼 분리했다.

- 코드: `piano-transcription-inference==0.0.6`. [공식 PyPI 메타데이터](https://pypi.org/pypi/piano-transcription-inference/0.0.6/json)의 MIT classifier를 확인했다. 별도 LICENSE 파일/전문이 확인됐다는 의미는 아니다. 원래 [학습 저장소 README](https://github.com/bytedance/piano_transcription)는 Apache 2.0을 표기하므로 두 저장소의 표기를 혼용하지 않는다.
- 가중치: Qiuqiang Kong (2020), [Zenodo 4034264](https://doi.org/10.5281/zenodo.4034264). [공식 API](https://zenodo.org/api/records/4034264)의 CC BY 4.0, 171,966,578바이트와 MD5를 확인했다. SHA256도 전사 sidecar와 일치한다.
- 사전학습 데이터: 공식 학습 저장소는 MAESTRO V2.0.0 사용을 설명한다. [MAESTRO 공식 페이지](https://magenta.withgoogle.com/datasets/maestro)의 데이터 라이선스는 CC BY-NC-SA 4.0이다. 가중치의 별도 표기만으로 상용 사용 권리가 확정됐다고 해석하지 않는다. 가중치 공개 record만으로 학습 데이터 전체의 법적 계보가 확인됐다는 주장도 하지 않는다.

이번 작업의 허용 판단은 로컬 MVP 실험 범위다. 한국·미국·캐나다·출처국의 정식 학습/배포/상용 검토는 별도다. 코드 classifier의 범위와 MAESTRO 조건의 영향도 그 검토에 포함한다. 실제 데이터·전사 라벨·가중치·학습 모델은 배포하거나 git에 추가하지 않았다.

## 전사·정렬 확인

전사 환경은 Python 3.12.13, torch 2.14.1, librosa 1.0.0, torchlibrosa 0.1.0, numpy 2.5.4, soundfile 0.14.0이다. 원본 OGG에서 16kHz mono 60초를 만들었고, 저장된 PCM16 clip이 원본 구간과 양자화 오차 범위에서 일치함을 재검증했다. CPU/4 threads 실행 기록이 있다. CUDA는 이번 환경에서 실행하지 않았고, 전사 패키지의 MPS 경로는 지원하지 않는다.

음표의 유한값·시간 경계·양의 길이·피아노 음역·velocity·중복을 검사했다. 전사 JSON과 MIDI는 tick 양자화 허용 범위 안에서 일치했다. 가까운 화음 onset이 동일 tick으로 반올림되어 순서가 바뀔 수 있어 pitch별로 비교한다. 비정상 이벤트는 0개다. velocity 범위는 각각 33–82, 29–94, 33–100이다.

실제 녹음의 음표·velocity는 **pseudo-label**이다. velocity는 음량과 녹음 조건에 의존한다. offset 정확도는 사람 정답으로 평가하지 않았다. pedal 추정은 저장/학습/앱 재생 대상에서 제외했다.

정렬은 짧고 반복이 전개된 악보를 대상으로 음높이 순서의 삽입/삭제 DP를 수행한다. 35ms 내 화음은 pitch 순서로 정규화하며 원본 performance index를 유지한다. 주변 8박으로 로컬 선형 템포를 추정하고 해당 onset 전체를 제외해 timing 잔차를 만든다. 목표는 전체 루바토 재현이 아니라 로컬 템포에서의 ±150ms 미세 타이밍과 velocity다. 최소 coverage는 80%다.

| 작품 | 고정 템포 매칭 coverage | 순서 기반 채택 coverage | 제외 |
| --- | ---: | ---: | --- |
| BWV 846 | 25.52% | 100% | 없음 |
| BWV 850 | 25.39% | 100% | 없음 |
| BWV 851 | 17.43% | 99.46% | 시작 2음, 잔차 약 +306/+258ms |

순서 기반 경로와 각 작품의 시작·중간·끝 8개 대응음을 CQT 스펙트럼 위에 그려 시각 확인했다. BWV 846/850의 대표 구간에서 큰 패턴 이동은 보이지 않았다. BWV 851은 시작의 반복 저음 대응이 불안정하며 해당 2음은 이미 제외되어 있다. 중간·끝의 대표 대응은 시간 진행과 스펙트럼에 맞는다. 모든 음표의 정확도를 사람이 확인한 결과는 아니며, 경계 템포 추정과 반복 음형의 모호함은 남아 있다. 잔차 통계는 정답 대비 정렬 오차가 아니다.

그림과 전체 제외 목록: `experiments/piano-performance/runs/real-audit-20261030-final/`의 작품별 PNG와 alignment JSON.

## checkpoint와 평가

기존 `runs/real-wtc-first/model/`의 checkpoint를 그대로 재사용했다. 현재 raw/label 해시와 정렬 pairs/targets가 기존 checkpoint receipt와 일치하고, 재로딩한 모델의 기록된 validation/test 지표가 재현됐다. 새 데이터 준비 명령의 NPZ도 기존 train/validation/test feature·target과 배열 단위로 동일하다. 이 작업에서 test 결과에 맞춰 모델·데이터·정렬을 튜닝하지 않았다.

모델은 8개 note feature → hidden 32의 MLP → timing/velocity 2출력이다. 500 epoch 실행 중 validation MSE가 가장 낮은 checkpoint를 선택했다. seed 42, Adam learning rate 0.01, CPU다. 기존 run에는 선택된 epoch 번호가 남아 있지 않아 사후 추정하지 않았다.

| split | 모델 timing MAE | 평균 baseline timing MAE | 모델 velocity MAE | 평균 baseline velocity MAE |
| --- | ---: | ---: | ---: | ---: |
| train | 18.550ms | 18.690ms | 20.292 | 7.186 |
| validation | 14.608ms | 14.638ms | 9.359 | 17.837 |
| test | 21.937ms | 22.008ms | 9.089 | 18.249 |

baseline은 train 라벨 평균을 모든 음에 출력한다. velocity 단위는 MIDI 1–127이다. train 지표는 선택된 checkpoint의 학습셋 적합도이며 validation/test와 구분한다. validation 선택 모델의 train velocity는 baseline보다 나쁘다. 작품별 평균 세기 차이에 맞는 checkpoint가 선택됐을 가능성이 있어, note별 표현을 학습했다는 근거로 삼지 않는다. 고정 4박/16박 주기 feature는 특히 BWV 851의 3/4 마디 구조를 직접 표현하지 않는다.

test timing 개선은 약 0.071ms다. 전사 추정/양자화의 해상도와 현재 데이터 규모를 고려해 음악적으로 의미 있는 개선이라고 주장하지 않는다. 이 값은 이미 확인했던 test 지표의 재현이며 새 독립 평가가 아니다. 작곡가·연주자 다양성, 모델의 시퀀스 맥락, 큰 루바토, pedal, 실제 피아노 음색은 후속 범위다.

## 재현 명령

설치, 수동 원본/가중치 준비, 새 전사와 새 학습 명령은 [실험 README](../../experiments/piano-performance/README.md#실제-데이터-재현)에 있다. 원본이나 가중치가 없으면 해당 개별 출처를 검토해 준비한다. 자동 수집과 가중치 자동 다운로드는 수행하지 않는다.

이미 있는 파일로 검증하려면 실험 디렉터리에서 새 output을 지정한다.

```sh
uv sync --frozen --extra transcription
uv run --extra transcription python -m piano_performance.audit \
  --dataset data/training.local.json --checkpoint runs/real-wtc-first/model \
  --weights models/transcription/kong-4034264.pth \
  --output runs/my-real-audit --plots
uv run --extra transcription pytest
uv run --extra transcription ruff check src tests scripts
```

앱 자동 검증은 저장소 루트에서:

```sh
npm test -- src/renderer/src/playback
npm run build
PIANO_CHECKPOINT=experiments/piano-performance/runs/real-wtc-first/model \
PIANO_TRAINING_KIND=audio-transcribed \
PIANO_SCORE_XML=experiments/piano-performance/data/interim/bwv846-60s/score.musicxml \
PIANO_QA_OUTPUT=out/my-piano-real-qa \
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron scripts/verify-piano-performance.cjs
```

직접 비교할 때는 `performanceLab=1`로 앱을 열어 위 MusicXML을 가져오고, 패널에서 현재 악보 request를 내보낸다. 실험 디렉터리에서:

```sh
uv run --extra transcription python -m piano_performance.infer \
  --checkpoint runs/real-wtc-first/model \
  --request /absolute/path/to/score-request.json --output runs/my-real-prediction
```

생성된 `expression.json`을 같은 악보에 불러와 기본/모델을 번갈아 재생한다. 출처는 “실제 녹음 · 전사 추정값”으로 표시된다. 두 모드는 기존 triangle oscillator를 사용한다. 앱용 JSON은 앱이 내보낸 request로 생성하며 standalone `--score` JSON을 대신 넣지 않는다. 악보나 템포를 편집하면 request부터 다시 만든다.

## 검증 근거와 파일

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| 원본/clip/전사/가중치 계보, split, 정렬 타깃, 지표 재현 | PASS | `runs/real-audit-20261030-final/audit.json` |
| 새 데이터 준비와 다성부 MusicXML 변환 | PASS | `runs/real-prepared-20261030/`, 기존 배열/192음 비교 |
| Python 테스트 | 44 PASS | 전사 범위·출처/해시·split·정렬·악보 보존·checkpoint/추론 |
| Ruff | PASS | `src tests scripts` |
| TypeScript playback 테스트 | 75 PASS | 프로필·출처·편집·비동기 로딩·재생 회귀 포함 |
| 타입 검사와 앱 빌드 | PASS | `npm run build` |
| 실제 모델과 192음 악보의 Electron 비교 | PASS | `out/piano-performance-real-qa-20261030-final/results.json` |
| 스피커 청음·OS 파일 선택창 | 미확인 | QA는 파일 선택/IPC를 주입하며 실제 renderer/Web Audio를 검사 |

Python 테스트는 외부 파일/가중치/네트워크를 필수로 하지 않는다. 실제 자산 검증은 별도 audit/Electron integration 명령이다. 전체 앱·다른 앱·원격 CI·패키징을 검증했다는 뜻은 아니다. BWV 851 MIDI의 tempo/time-signature가 non-zero track에 있다는 pretty_midi 경고는 남아 있다. score는 tick/resolution으로 읽고 실제 템포를 별도 추정하며, 이 경고를 무시해 기준 템포를 신뢰하지 않는다. 빌드의 기존 Zod 주석 경고도 성공 여부와 별개다.

확인할 로컬 파일:

- checkpoint: `experiments/piano-performance/runs/real-wtc-first/model/{weights.pt,model.json}`
- 앱 악보/sidecar: `experiments/piano-performance/data/interim/bwv846-60s/score.musicxml`, `score.musicxml.json`
- 앱 request: `out/piano-performance-real-qa-20261030-final/score-request.json`
- 모델 JSON/MIDI: `out/piano-performance-real-qa-20261030-final/prediction/{expression.json,expressive.mid}`
- 화면: 같은 QA 디렉터리의 `comparison-960.png`, `comparison-1400.png`
- 데이터 검증/정렬 그림: `experiments/piano-performance/runs/real-audit-20261030-final/`

위 산출물은 git 제외 대상이다. 추적하는 문서/코드에는 출처·재현 명령·집계와 아래 SHA256만 남긴다.

| 대상 | SHA256 |
| --- | --- |
| train 녹음 BWV 846 | `abce13d492fbc909db3a00b27c66774220441bb31903f93cf2aef2d4084d93d2` |
| validation 녹음 BWV 850 | `73e1a0d9f4aa5f8e14fe6d7c75270721aa0e618a5731ce7b1d98d53b030425d9` |
| test 녹음 BWV 851 | `2d1ba388b23faa085360c432918761d78e9167d1d6ab7fac1673ba8a18a3386c` |
| 데이터 manifest | `a5a7012b0b9e74a65103fc1fece6544a1c9cc3f496ee1ab652941b90d2cc25ad` |
| 학습 checkpoint | `676fc68835dae2bfd70d6eac63e0d7a87bd09b3650a89f59a2f969cdf2ec4b62` |
| checkpoint metadata | `a3b6472e7322a073efefdf3d17cd5e222a4e75812f4f79d624d1d31278fe11e9` |
| 전사 가중치 | `c3fa9730725bf4a762f1c14bc80cd5986eacda01b026f5a4a2525cd607876141` |
| 앱 MusicXML | `f6de01c90e40de0f6269a5082c380c34213c73170400020ae1e248c15b96e4ce` |

악보 MIDI·전사 MIDI·clip의 전체 해시와 실행 라이브러리 버전, 검증 코드 해시는 `audit.json`에 있다. 앱 JSON의 modelId는 checkpoint 해시이고 provenance에 metadata 해시, 학습 source URL/license/attribution, 전사 모델 정보를 보존한다.

## 다음 작업

1. 원음/기본/모델을 사람이 청음하고 프레이징·세기·타이밍에 대한 평가를 기록한다.
2. validation에서 평균 세기 편향과 거의 없는 timing 개선을 분석한다. test에 맞춰 재튜닝하지 않는다.
3. 권리를 검토한 다른 작곡가·연주자의 학습 작품과 새로운 평가 작품을 확보한다.
4. 그 근거를 바탕으로 meter/sequence context, tempo map/pedal, 피아노 sampler와 production QA를 검토한다.

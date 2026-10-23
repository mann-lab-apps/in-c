# IMSLP 피아노 연주 엔진 MVP

작성일: 2026-10-13

## 목표

IMSLP의 자유 이용 가능성이 있는 피아노 악보/녹음 후보를 seed dataset으로 정리하고, 나중에 `악보 -> expressive MIDI -> 기존 샘플러 렌더링` 실험으로 이어질 최소 작업 단위를 만든다.

이번 MVP는 음원 퀄리티를 정밀 QA하지 않는다. 먼저 권리/출처/작품 구조가 비교적 안전한 후보를 모아 “실제로 정렬 실험을 시작할 수 있는가”를 확인한다.

## MVP 판단

- 1차 악기는 피아노로 둔다.
- neural 가상악기나 end-to-end score-to-audio 모델은 이번 MVP 범위가 아니다.
- 목표 데이터는 “고품질 음색 모델 학습용 audio corpus”가 아니라 “악보와 실제 연주 사이의 timing, velocity, pedal, phrasing 차이를 관찰할 수 있는 후보 목록”이다.
- 음원 품질 QA는 프로덕션 버전에서 별도 단계로 승격한다.
- IMSLP의 권리 표시는 최종 법률 판단이 아니라 후보 분류 근거로만 사용한다.

## 이번 MVP 산출물

1. `docs/product/imslp-piano-performance-engine-seed.json`
   - IMSLP 작품 URL, 파일 ID, 연주자, 라이선스, 파일 형식, 길이, 정렬 난이도, 사용 목적을 기록한다.
   - 실제 파일은 다운로드하지 않는다.

2. 첫 실험셋 기준
   - `cleared-metadata-candidate` 또는 `candidate` 상태의 피아노 독주 후보 10개.
   - Public Domain dedicated, CC0, CC BY 4.0 중심.
   - NC, ND, Performance Restricted, Non-PD US/EU 표기가 있는 녹음은 seed에는 넣지 않거나 `blocked`로 둔다.

3. 다음 단계 준비
   - 다운로드 계획.
   - 악보 판본 선택.
   - MusicXML/OMR 필요 여부 판단.
   - score-audio alignment 파이프라인 설계.

## 최소 파이프라인

```text
IMSLP 후보 메타데이터
-> 수동 권리 검토
-> 수동 다운로드 계획
-> 악보 PDF 또는 MusicXML 확보
-> score/audio alignment
-> expressive MIDI event 추출
-> 기존 피아노 sampler 렌더링
-> 실제 녹음과 timing/dynamics 비교
```

## 성공 기준

- 10개 내외 피아노 독주 후보가 JSON으로 남는다.
- 각 후보는 IMSLP 작품 URL과 파일 ID를 가진다.
- 악보 권리와 녹음 권리를 분리해서 기록한다.
- CC BY 후보는 attribution 필요성을 명시한다.
- 한국 서비스 가능성은 `territoryRiskKo`로 보수적으로 표시한다.
- 다운로드/학습/배포는 하지 않는다.

## 이번에 의도적으로 미루는 것

- 녹음 음질 정밀 QA.
- 실제 음원 다운로드.
- 대량 크롤링.
- 자동 IMSLP downloader.
- MusicXML/OMR 구현.
- alignment 모델 구현.
- neural virtual instrument 학습.
- 상업 서비스 권리 확정.

## MVP 후보 우선순위

1. Bach, Goldberg Variations, BWV 988
   - Open Goldberg / Kimiko Ishizaka / CC0.
   - IMSLP에 녹음 수가 많고 Open Goldberg 세트가 명확하다.

2. Chopin, Ballade No.3, Op.47
   - Musopen 계열 Public Domain dedicated FLAC/MP3 후보.

3. Chopin, Ballade No.4, Op.52
   - Musopen 계열 Public Domain dedicated 후보가 여러 연주자로 존재해 표현 비교 가치가 높다.

4. Beethoven, Piano Sonata No.14, Op.27 No.2
   - Paul Pitman / Musopen / Public Domain dedicated.
   - 악장 분리라 alignment 실험 단위로 좋다.

5. Chopin 짧은 독주곡 묶음
   - Impromptu No.1, Impromptu No.2, Barcarolle, Andante spianato, Allegro de concert, Polonaise in G-sharp minor.
   - CC BY 4.0 attribution 의무는 있지만 MVP 실험 후보로는 다루기 쉽다.

## QA를 나중에 붙일 때의 기준

프로덕션 후보로 승격할 때만 아래 항목을 본다.

- 배경 잡음.
- 과도한 잔향.
- clipping.
- 동적 범위.
- 페달 번짐.
- 악보와 반복 구조 차이.
- 박자 안정성.
- 동일 작품 다중 연주 확보 여부.
- lossless 파일 접근 가능 여부.

## 5분 결론

음원 퀄리티를 엄격히 고르지 않으면 IMSLP/Musopen 계열 피아노 후보만으로 MVP는 가능하다. 다만 이 MVP는 “좋은 가상악기 만들기”가 아니라 “악보와 실제 연주 사이의 표현 정보를 뽑아낼 수 있는지 확인하는 작은 실험셋”이다. 품질 QA와 법률 검토는 프로덕션 승격 단계로 분리한다.

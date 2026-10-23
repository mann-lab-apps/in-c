# IMSLP 피아노 연주 엔진 다운로드 계획

작성일: 2026-10-13

## 목적

`experiments/piano-performance`의 첫 실제 데이터 흐름을 만들기 전에, 어떤 파일을 수동으로 받을지와 파일별 권리/출처 메타데이터를 어떻게 남길지 고정한다.

이번 계획은 실제 다운로드를 수행하지 않는다. IMSLP 자동 다운로드, 대량 크롤링, 로그인, membership-only 접근, 우회 접근도 구현하지 않는다.

## 결론

첫 alignment spike는 3개 후보로 시작한다.

1. Chopin, Impromptu No.1, Op.29
2. Chopin, Impromptu No.2, Op.36
3. Chopin, Polonaise in G-sharp minor, B.6

이유는 모두 짧은 피아노 독주곡이고, seed manifest에서 CC BY 4.0 계열 Musopen 후보로 분류되어 있으며, 긴 변주곡/소나타보다 반복 구조와 악장 분리가 단순하기 때문이다.

## Alignment 방향

MVP에서는 audio waveform alignment보다 performance MIDI alignment를 먼저 한다.

- 1차: score MIDI 또는 최소 MusicXML/MIDI fixture와 performance MIDI 사이의 note onset matching.
- 2차: 실제 녹음 오디오를 참조로 넣되, feature extraction과 DTW는 별도 spike로 분리.
- 3차: `partitura` 기반 symbolic score/performance 처리 또는 `synctoolbox` 기반 score-audio alignment를 검토.

라이브러리 판단:

- `pretty_midi`는 MIDI 파일을 읽고 note, tempo, chroma 같은 정보를 다루기 쉬워 MVP의 symbolic smoke test에 적합하다.
- `partitura`는 MusicXML, MIDI score, MIDI performance, score-performance alignment를 명확히 분리해 다루므로 다음 단계 후보로 좋다.
- `synctoolbox`는 DTW 기반 music synchronization과 score-audio 예제를 제공하므로 실제 오디오 alignment 단계에 적합하지만, 지금은 설치/데이터/feature 부담이 크다.

## 수동 다운로드 체크리스트

다운로드 전에 각 IMSLP work page와 file page를 다시 확인한다.

- IMSLP work URL 확인.
- score file ID와 recording file ID를 분리 기록.
- 악보 권리와 녹음 권리를 분리 기록.
- `CC BY` attribution 문구 확인.
- `CC NC`, `CC ND`, `Performance Restricted`, `Non-PD US/EU`, 출처 불명은 제외.
- 한국 서비스 가능성은 `needs-legal-review`로 남긴다.
- 파일을 받은 뒤 같은 stem의 sidecar JSON을 작성한다.

## 후보별 계획

| 우선순위 | candidateId | 작품 | recording file ID | recording license | 예상 raw 경로 | score source |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `chopin-impromptu-1-op29-levy` | Chopin, Impromptu No.1, Op.29 | `#473658` | CC BY 4.0 | `data/raw/chopin-impromptu-1-op29/recording.mp3` | IMSLP PDF 또는 수동 MusicXML/MIDI fixture |
| 2 | `chopin-impromptu-2-op36-levy` | Chopin, Impromptu No.2, Op.36 | `#473659` | CC BY 4.0 | `data/raw/chopin-impromptu-2-op36/recording.mp3` | IMSLP PDF 또는 수동 MusicXML/MIDI fixture |
| 3 | `chopin-polonaise-b6-faulkner` | Chopin, Polonaise in G-sharp minor, B.6 | `#473666` | CC BY 4.0 | `data/raw/chopin-polonaise-b6/recording.mp3` | IMSLP PDF 또는 수동 MusicXML/MIDI fixture |
| 4 | `beethoven-moonlight-op27-2-pitman` | Beethoven, Moonlight Sonata Op.27 No.2, I only | `#354249` | Public Domain dedicated | `data/raw/beethoven-moonlight-op27-2-i/recording.mp3` | IMSLP PDF 또는 수동 movement fixture |

## Sidecar 예시

```json
{
  "candidateId": "chopin-impromptu-1-op29-levy",
  "sourceUrl": "https://imslp.org/wiki/Impromptu_No.1,_Op.29_(Chopin,_Fr%C3%A9d%C3%A9ric)",
  "imslpFileId": "#473658",
  "license": "Creative Commons Attribution 4.0",
  "attribution": "Frank Levy / Musopen, as listed by IMSLP",
  "downloadedAt": "YYYY-MM-DD",
  "territoryRiskKo": "needs-legal-review",
  "allowedForMvpExperiment": true,
  "notes": "Manual download only. Re-check file page before use."
}
```

## Expected Local Manifest

실제 파일을 받은 뒤 `experiments/piano-performance/data/local-manifest.json`을 만들되, 이 파일은 git에 커밋하지 않는다. 예시 형식은 `experiments/piano-performance/data/manifest.example.json`에 둔다.

각 entry는 다음 파일을 가리킨다.

- `scorePath`: MusicXML/MIDI/PDF score source.
- `performanceMidiPath`: 있으면 performance MIDI. 첫 spike에서는 직접 만든 fixture도 가능.
- `audioPath`: 실제 녹음 참조 파일.
- `sidecarPath`: 권리/출처 sidecar JSON.

## Blocked 조건

아래 중 하나라도 해당하면 `allowedForMvpExperiment: false`로 둔다.

- `CC NC`
- `CC ND`
- `Performance Restricted`
- `Non-PD US/EU` 등 지역권 리스크가 직접 표시된 녹음
- IMSLP 외부 상업 링크만 존재
- source URL 또는 file ID를 확인할 수 없음
- attribution 문구를 보존할 수 없음

## 다음 목표 후보

1. 수동으로 1개 후보만 다운로드한다.
2. sidecar JSON과 local manifest를 작성한다.
3. score MIDI fixture와 performance MIDI fixture를 만들어 simple onset alignment smoke를 실행한다.
4. 결과를 보고 `partitura` 도입 여부를 결정한다.

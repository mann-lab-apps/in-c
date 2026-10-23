# 클래식 로컬 라이브러리 목표모드 프롬프트

작성일: 2026-10-13

## 목적

IMSLP를 중심으로 피아노 연주 엔진 또는 향후 가상악기 실험에 쓸 수 있는 악보-음원 후보를 수집한다. 이 단계의 목표는 모델을 학습시키는 것이 아니라, 나중에 학습 가능한 데이터셋으로 정리할 수 있는 후보 목록과 권리/품질 판단 근거를 남기는 것이다.

1차 악기는 피아노로 둔다. 기타는 사용자 선호가 크고 악기성이 강하므로 비교군과 2차 후보로 함께 살핀다.

## 기본 판단

- IMSLP 기준으로 피아노는 악보와 녹음 수가 많아 첫 파이프라인에 적합하다.
- 기타는 악보는 충분히 많지만 실제 자유 녹음이 듬성듬성해 IMSLP만으로는 데이터셋 규모가 작을 수 있다.
- 첫 목표는 neural 가상악기보다 `악보 -> expressive MIDI -> 기존 샘플러 렌더링` 파이프라인에 필요한 자료를 모으는 것이다.
- 실제 음원 다운로드, 대량 크롤링, 계정 로그인, 우회 접근은 하지 않는다.
- IMSLP의 저작권 표시는 최종 법률 판단이 아니라 후보 분류 근거로만 사용한다.

## 공통 수집 원칙

- 모든 작업 요약과 판단 근거는 한글로 작성한다.
- IMSLP 작품 페이지, 파일 ID, 라이선스 문구, 연주자, 업로드일, 파일 형식, 길이, 지역 표시를 함께 남긴다.
- 악보 권리와 녹음 권리를 반드시 분리해 기록한다.
- `Public Domain`, `CC0`, `CC BY`, `CC BY-SA`는 후보로 볼 수 있지만, 각각 의무와 위험을 따로 적는다.
- `CC NC`, `CC ND`, `Performance Restricted`, 출처 불명, 권리자 불명, 지역 표시가 애매한 항목은 학습 후보에서 제외하거나 `blocked`로 둔다.
- 한국 서비스 가능성은 별도 `territoryRiskKo` 필드로 남기되, 법률 자문처럼 단정하지 않는다.
- IMSLP 외부 링크, Naxos, 상업 녹음, YouTube/Spotify/Apple Music 미리듣기는 학습 후보에서 제외한다.
- 여러 연주자가 같은 작품을 연주한 경우 정렬/표현 학습 가치가 높으므로 우선순위를 올린다.
- MIDI/합성 음원은 실제 연주 모델 학습용과 분리해 `synthetic-reference`로만 기록한다.

## 1. IMSLP 피아노 자료 수집 프롬프트

```text
목표: IMSLP에서 피아노 연주 엔진 실험에 쓸 수 있는 악보-실제 녹음 후보를 수집하고, 학습 가능성 기준으로 우선순위를 매긴다.

범위:
- 1차 대상은 피아노 독주 작품이다.
- 기타 독주 작품은 비교군으로 5-10개만 살핀다.
- 실제 파일은 다운로드하지 않는다.
- 대량 크롤링이나 자동 반복 다운로드를 하지 않는다.
- 계정 로그인, 유료 멤버십, 우회 접근, 상업 녹음 링크 수집은 하지 않는다.
- 코드와 앱 구현은 수정하지 않는다.
- 결과는 문서 또는 JSON 초안으로 남긴다.

진행:
1. IMSLP의 피아노 관련 카테고리와 대표 작품 페이지를 확인한다.
   - `Category:For piano`
   - `Category:Scores featuring the piano`
   - 대표 작곡가: Bach, Beethoven, Chopin, Schumann, Liszt, Debussy, Satie, Scriabin
2. 피아노 독주 후보를 20-30개 수집한다.
   - 한 작품 페이지에 실제 Recordings가 여러 개 있는 작품을 우선한다.
   - 악보가 명확히 Public Domain인 작품을 우선한다.
   - 녹음 라이선스가 Public Domain, CC0, CC BY, CC BY-SA인 항목을 우선한다.
   - NC/ND/Performance Restricted는 제외하거나 blocked로 둔다.
3. 기타 독주 후보를 5-10개만 비교군으로 수집한다.
   - Tárrega, Sor, Carcassi, Giuliani, Barrios 계열을 우선 확인한다.
   - 실제 Recordings가 거의 없으면 그 사실을 결론에 명확히 적는다.
4. 후보마다 아래 필드를 채운다.
   - `id`
   - `instrument`
   - `composer`
   - `workTitle`
   - `movementOrSelection`
   - `imslpWorkUrl`
   - `imslpFileIds`
   - `scoreStatus`
   - `recordingStatus`
   - `recordingCountOnPage`
   - `selectedRecordingCount`
   - `performers`
   - `recordingLicense`
   - `scoreLicense`
   - `fileFormats`
   - `durationSeconds`
   - `territoryTags`
   - `territoryRiskKo`
   - `alignmentDifficulty`
   - `modelUse`
   - `priority`
   - `notes`
5. 후보 상태를 아래 기준으로 분류한다.
   - `cleared-metadata-candidate`: 권리/출처/형식이 좋아 보이고 다음 검토로 넘길 수 있음
   - `candidate`: 좋아 보이나 attribution, share-alike, 지역권, 품질 확인이 더 필요함
   - `synthetic-reference`: MIDI/합성 음원이라 실제 연주 학습용은 아니지만 비교에는 쓸 수 있음
   - `needs-review`: 지역권, 발행연도, 라이선스, 파일 출처가 애매함
   - `blocked`: NC, ND, Performance Restricted, 상업 링크, 출처 불명 등으로 제외
6. 정렬 난이도를 평가한다.
   - `low`: 단일 악장/짧은 소품/박자 안정/악보 구조 단순
   - `medium`: 루바토가 많거나 반복/장식음/페달이 많은 작품
   - `high`: 긴 소나타, 구조가 복잡한 곡, 자유 템포, 녹음 품질이 낮은 항목
7. 모델 사용 목적을 분리한다.
   - `expressive-midi`: 악보에서 타이밍, velocity, 페달, 프레이징을 예측
   - `audio-rendering-reference`: 렌더링 품질 비교용 참조
   - `neural-instrument-later`: 향후 음색 모델 후보
   - `exclude`
8. 마지막에 피아노와 기타 중 어느 쪽이 첫 데이터셋에 적합한지 다시 판단한다.

출력:
- 피아노 후보 20-30개 표
- 기타 비교 후보 5-10개 표
- `cleared-metadata-candidate` 상위 10개
- 제외한 후보와 제외 이유
- IMSLP에서 보인 데이터 편향
- 데이터셋으로 발전시키기 위한 다음 작업
- 필요한 추가 소스 후보
- 사용자가 5분 안에 확인할 결론

완료 조건:
- 실제 파일 다운로드 없이 후보 메타데이터가 남는다.
- 피아노 첫 파이프라인에 쓸 상위 후보가 10개 이상 선정된다.
- 기타를 1차로 쓰기 어려운지 또는 가능한지 근거가 남는다.
- 권리 검토가 필요한 항목은 안전하게 `needs-review` 또는 `blocked`로 남는다.
- 다음 목표모드에서 다운로드 계획 또는 정렬 파이프라인 설계로 이어질 수 있다.
```

## 2. 후보 JSON 스키마 초안

```json
{
  "id": "beethoven-moonlight-op27-2",
  "instrument": "piano",
  "composer": "Ludwig van Beethoven",
  "workTitle": "Piano Sonata No.14, Op.27 No.2",
  "movementOrSelection": "Complete or movement-level",
  "imslpWorkUrl": "https://imslp.org/wiki/...",
  "imslpFileIds": ["#000000"],
  "scoreStatus": "public-domain",
  "recordingStatus": "candidate",
  "recordingCountOnPage": 0,
  "selectedRecordingCount": 0,
  "performers": [],
  "recordingLicense": "unknown",
  "scoreLicense": "Public Domain",
  "fileFormats": ["mp3"],
  "durationSeconds": null,
  "territoryTags": [],
  "territoryRiskKo": "needs-legal-review",
  "alignmentDifficulty": "medium",
  "modelUse": ["expressive-midi"],
  "priority": "high",
  "notes": ""
}
```

## 3. 다음 목표모드 후보

```text
목표: IMSLP 피아노 후보 메타데이터를 바탕으로 다운로드 없이 score-audio alignment 가능성을 평가하고, 첫 실험셋 10개를 확정한다.

범위:
- 실제 파일 다운로드는 하지 않는다.
- 후보별 악보 판본과 녹음 길이, 악장 구조, 반복 여부, 파일 형식을 비교한다.
- MusicXML이 없으면 PDF 악보 OCR/OMR 필요성을 표시한다.
- 동일 작품 다중 연주가 있는 경우 표현 학습 우선순위를 올린다.

출력:
- 첫 실험셋 10개
- OMR 필요 후보와 난이도
- alignment 난이도
- 권리 검토 남은 항목
- 다운로드 계획 초안
- 정렬 파이프라인 설계 메모
```

## 메모

이 프롬프트는 법률 자문을 대체하지 않는다. 정식 학습, 배포, 상업 서비스 전에는 한국, 미국, 캐나다, 출처국 기준으로 악보와 녹음 권리를 다시 검토해야 한다.

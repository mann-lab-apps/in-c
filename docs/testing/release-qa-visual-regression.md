# Release QA Visual Regression

작성일: 2026-07-14
업데이트: 2026-07-15

## 목적

릴리즈 후보마다 같은 악보를 사용해 첫 system fermata clipping, 좁은 폭 system right
overflow, dynamics/staff placement 겹침 같은 시각 회귀를 확인한다.

## Fixture

- MusicXML: `src/musicxml/fixtures/release-qa.musicxml`
- 포함 요소: tempo, rehearsal mark, staff text, dynamics, hairpin, tie, fermata,
  staccato/accent, breath mark, caesura, whole rest.

이 fixture는 사람이 직접 앱에서 열어보는 수동 QA와 자동 bounds 테스트가 공유하는
기준 악보다.

## 자동 검증

```bash
npm test -- src/musicxml/musicxml.test.ts src/renderer/src/notation/system-layout.test.ts
npm run verify:notation-snapshots
npm run verify:visual-regression
npm run test:components
```

검증 기준:

- MusicXML fixture가 parse되고 각 measure rhythm이 exact여야 한다.
- desktop 폭과 narrow 폭 모두에서 system right edge가 render width 안에 있어야 한다.
- 첫 system의 rehearsal mark와 fermata 기준 y 위치가 viewBox 상단 여백 안에 있어야 한다.
- dynamics baseline이 staff 아래에 있으면서 system height 밖으로 나가지 않아야 한다.
- Electron snapshot baseline이 desktop 1400px와 compact 960px에서 tempo, rehearsal
  mark, fermata, dynamics, hairpin, slur metric을 유지해야 한다.
- App 셸이 jsdom에서 시작 화면, toolbar, 재생 컨트롤, fixture-mode entry를 렌더링해야 한다.

## Snapshot 확장 기준

Electron screenshot snapshot은 `scripts/verify-notation-snapshots.cjs`로 실행한다.
스크립트는 release QA fixture를 렌더링하고 PNG를 임시 폴더에 저장한 뒤,
`docs/testing/notation-snapshot-baseline.json`의 viewport별 metric baseline과 비교한다.

- viewport: desktop 1400px, compact 960px.
- snapshot 대상: 첫 system 상단, tempo/rehearsal/fermata, dynamics/hairpin/slur 영역.
- baseline 갱신: 의도한 시각 변화가 있을 때만 `npm run verify:notation-snapshots:update`.
- pixel diff는 font/rendering 차이에 민감하므로 현재 blocker는 metric diff다. 실제 PNG는
  실패 조사 artifact로 사용한다.

## 수동 QA 연결

릴리즈 전에는 `release-qa.musicxml`을 앱에서 열고 다음을 확인한다.

- 첫 system의 fermata와 rehearsal mark가 잘리지 않는다.
- 창 폭을 줄여도 마지막 마디선이 보인다.
- dynamics와 hairpin이 오선과 겹치지 않는다.
- MusicXML export/import 후 주요 표현이 유지된다.

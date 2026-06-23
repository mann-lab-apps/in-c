# 단성부 MVP 회귀 기준

## 공통 Fixture

`src/testing/single-voice-mvp-fixture.ts`의 8마디 악보를 score-core,
MusicXML, playback, renderer layout과 Electron 검증에서 함께 사용한다.

fixture는 다음 요소를 포함한다.

- 4/4, 높은음자리표, G장조
- 4분음표, 8분음표, 16분음표와 쉼표
- 점4분음표와 겹점4분음표
- 조표의 F sharp와 같은 마디의 F natural 문맥
- 마디 경계를 넘는 C5 타이
- 자동 8분음표 빔
- 음표·쉼표·음표로 구성된 3:2 셋잇단음표
- 8마디의 여러 system 줄바꿈

## 자동 검증

`npm test`는 다음 의미를 검증한다.

- 모든 마디의 exact-fill과 tuplet/tie 관계 정합성
- 순차 입력 후 마디 이동과 새 마디 생성
- duration 변경, 삭제와 복합 undo/redo
- MusicXML 왕복 후 ID와 무관한 음악 의미 동등성
- 타이 병합과 tuplet 비율을 포함한 playback 시작 시각
- desktop 및 최소 폭 system 배치와 event 선택 순서

`createScoreSemanticSnapshot()`은 저장 과정에서 바뀔 수 있는 score, staff,
measure와 event ID를 비교하지 않는다. 대신 measure 속성, event 위치,
실제 pitch, duration, tie와 tuplet 멤버 순서를 비교한다.

## Electron 검증

프로덕션 빌드 후 다음 명령을 실행한다.

```bash
npm run verify:mvp
```

이 스크립트는 1400px과 1100px 창에서 공통 fixture를 열고 다음을 검사한다.

- 8개 measure와 33개 event가 SVG에 존재한다.
- 모든 event 중심 좌표가 measure 영역 안에 있다.
- system별 마지막 measure가 사용 가능한 전체 폭을 채운다.
- tuplet과 tie SVG 그룹이 생성된다.
- toolbar에 수평 overflow가 없다.
- 선택 음표를 G7과 G0까지 이동해도 음표 머리, 기둥과 덧줄의 SVG 경계가
  잘리지 않는다.

캡처는 운영체제의 임시 디렉터리에 `in-c-mvp-desktop.png`와
`in-c-mvp-minimum.png`, `in-c-mvp-out-of-staff-high.png`,
`in-c-mvp-out-of-staff-low.png`로 저장한다.

## CI 경계

GitHub Actions의 `test` job은 `npm test`와 production build를 실행한다.
`electron-mvp` job은 Linux 가상 디스플레이에서 sandbox 권한이 없는
호스팅 runner에 맞춘 `npm run verify:mvp:ci`를 실행해 실제 SVG 좌표와
viewport 회귀를 검사한다.

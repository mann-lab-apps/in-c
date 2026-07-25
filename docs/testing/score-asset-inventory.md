# 악보 예제·QA 자산 구분 기준

이 문서는 저장소의 악보 자산이 사용자 예제인지, 품질 확인을 위한 QA 전용
fixture인지 구분한다. `fixture`는 같은 조건으로 오류를 다시 확인하기 위해 고정한
테스트 자료를 뜻한다.

## 인수 기준

- public Compositions, release QA MusicXML, renderer snapshot 기준, 앱 demo score의
  목적과 위치를 구분한다.
- 각 자산군에 검증 명령과 사용자 노출 여부를 적는다.
- QA 전용 자산은 설명 없이 사용자 콘텐츠로 공개하지 않는다.
- 사용자 예제는 자동 테스트에 재사용하더라도 공개 목적과 출처 설명을 유지한다.

## 자산 인벤토리

| 자산군 | 위치 | 목적 | 검증 명령 | 사용자 노출 |
| --- | --- | --- | --- | --- |
| public Compositions | `site/public/compositions/*.musicxml`, `site/public/compositions/*.pdf`, `site/compositions-catalog.json` | 사용자가 사이트에서 듣고, 보고, Chromatics로 열어 보는 학습 예제 | `npm run verify:site-content` | 공개. catalog의 상태와 저작권·출처 설명을 함께 제공한다. |
| release QA MusicXML | `src/musicxml/fixtures/release-qa.musicxml` | 릴리즈마다 표현 기호, 좁은 화면 배치, MusicXML 왕복 결과를 같은 악보로 확인 | `npm run verify:visual-regression` | 비공개. QA 문서에서 파일 경로만 안내한다. |
| 기본 MusicXML fixture | `src/musicxml/fixtures/single-part-treble.musicxml` | 단일 파트의 가져오기·내보내기와 기본 음표·쉼표 해석을 자동 검증 | `npm test -- src/musicxml/musicxml.test.ts` | 비공개. 테스트 입력으로만 사용한다. |
| 단성부 MVP fixture | `src/testing/single-voice-mvp-fixture.ts` | score-core, MusicXML, 재생, 레이아웃이 같은 8마디 기준을 공유하도록 함 | `npm test -- src/testing/single-voice-mvp-regression.test.ts` | 비공개. 제품 예제가 아닌 코드 기반 회귀 자료다. |
| renderer snapshot 기준 | `docs/testing/notation-snapshot-baseline.json` | 화면 크기별 악보 위치와 크기 수치의 의도하지 않은 변화를 감지 | `npm run verify:notation-snapshots` | 비공개. 사용자 악보가 아니라 자동 비교 기준값이다. |
| 앱 demo score | `src/renderer/src/notation/demo-score.ts` | 앱의 기본 편집 상태와 편집기 단위 테스트에 작은 악보 상태를 제공 | `npm run test:components` | 앱 내부 초기 상태로 보일 수 있다. 완성된 학습 콘텐츠나 공개 Composition으로 소개하지 않는다. |

## 노출 판단 기준

사용자에게 공개하는 악보는 `site/compositions-catalog.json`에 등록하고, 제목, 난이도,
출처, 저작권 설명, 실제 자산 경로를 함께 검증한다. 자동 테스트에 같은 파일을
재사용해도 이 공개 목적은 바뀌지 않는다.

QA 전용 fixture와 snapshot 기준은 재현성을 위해 내용과 경로를 고정한다. 사용자가
선택할 예제로 전환하려면 catalog 등록, 출처·저작권 확인, 사용자 설명을 별도 작업으로
검토한다. 테스트 통과만으로 공개 가능한 콘텐츠라고 판단하지 않는다.

## 관련 작업과 문서

- 첫 악보 튜토리얼: [GitHub 이슈 #324](https://github.com/mann-lab-apps/in-c/issues/324)
- MusicXML 지원 범위와 예제: [GitHub 이슈 #325](https://github.com/mann-lab-apps/in-c/issues/325)
- release QA fixture 사용법: [Release QA Visual Regression](release-qa-visual-regression.md)
- 단성부 공통 fixture: [단성부 MVP 회귀 기준](single-voice-mvp-regression.md)
- 릴리즈 수동 확인: [Manual Score Completion QA](../releases/manual-score-completion-qa.md)
- MusicXML 기본 fixture: [MusicXML MVP](../musicxml-mvp.md#fixture)

## 검증 기준

- 위 자산군 중 위치, 목적, 검증 명령, 사용자 노출 여부가 하나라도 없으면 실패한다.
- QA 전용 자산을 공개 예제로 안내하거나 public Compositions를 테스트 전용으로
  설명하면 실패한다.
- 관련 문서의 상대 링크가 실제 파일을 가리키지 않으면 실패한다.
- `git diff --check`가 실패하면 완료로 보지 않는다.

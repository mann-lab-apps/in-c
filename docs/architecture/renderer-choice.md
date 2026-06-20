# 악보 렌더링 엔진 선정

작성일: 2026-06-19

## 결정

MVP의 편집용 악보 렌더러로 **VexFlow 5.0.0**을 사용한다.

VexFlow는 score-core 모델을 MusicXML이나 MEI로 직렬화하지 않고도 음표와
마디 단위의 SVG 요소로 직접 변환할 수 있다. 렌더링된 요소와 score-core의
event ID를 연결할 수 있어 선택, 강조, 키보드 편집, 재생 커서 같은 상호작용을
점진적으로 구현하기에 가장 적합하다.

이번 프로토타입은 다음 흐름을 검증한다.

1. `src/score-core`의 `Score`를 VexFlow 음표와 voice로 변환한다.
2. SVG로 두 마디를 렌더링한다.
3. SVG 음표에 score-core event ID를 연결한다.
4. 음표와 쉼표 클릭 시 선택 상태를 갱신하고 다시 강조해 렌더링한다.

## 후보 비교

| 기준 | VexFlow 5.0.0 | OpenSheetMusicDisplay 2.0.0 | Verovio 6.2.0 |
| --- | --- | --- | --- |
| 주 입력 | JavaScript/TypeScript 객체 | MusicXML | MEI 중심, MusicXML 등 변환 지원 |
| 출력 | SVG, Canvas | SVG, PNG | SVG |
| score-core 직접 연결 | 좋음 | MusicXML 변환 계층 필요 | MEI 또는 지원 포맷 변환 계층 필요 |
| 음표 단위 상호작용 | 직접 SVG 요소와 연결 가능 | 제한적인 표시 변경은 가능 | XML ID 기반 조회와 상호작용 가능 |
| 편집기 적합성 | 높음. 배치 책임도 애플리케이션에 있음 | 낮음. 공식 문서에서 완전한 인터랙티브 편집기가 아니라고 명시 | 중간. 고품질 engraver지만 MEI 중심 구조와 WASM 경계 필요 |
| MusicXML 표시 | 직접 파서 필요 | 가장 강함 | 변환을 통해 지원 |
| 라이선스 | MIT | BSD-3-Clause | LGPL-3.0-or-later |

## 후보별 판단

### VexFlow

- TypeScript로 작성되었으며 브라우저에서 SVG와 Canvas를 출력한다.
- 고수준 API와 저수준 API를 모두 제공한다.
- 음표, voice, stave를 직접 구성해야 하므로 레이아웃 어댑터를 우리가
  유지해야 한다.
- 그 비용 대신 score-core를 렌더링과 편집의 단일 원본으로 유지할 수 있다.

### OpenSheetMusicDisplay

- MusicXML을 브라우저 악보로 표시하는 목적에는 가장 빠른 선택이다.
- 내부 수정 가능한 모델과 음표 색상 변경 등 제한된 상호작용을 제공한다.
- 공식 문서에서 긴 악보 렌더링 비용과 음표 이동/추가가 어려운 점을 명시하고
  있어 편집기의 주 렌더러로는 맞지 않는다.
- 향후 MusicXML import 결과 비교나 읽기 전용 미리보기 도구로 재평가할 수 있다.

### Verovio

- C++ 기반 engraver이며 JavaScript에서는 WASM 툴킷으로 동작한다.
- MEI를 중심으로 고품질 SVG, XML ID 조회, 재생 시점 요소 조회를 지원한다.
- 문서/연구용 MEI 워크플로와 복잡한 사보 품질에는 강하다.
- 현재 score-core를 MEI로 변환하고 다시 편집 결과를 동기화하는 비용이 MVP에
  비해 크다.

## 현재 프로토타입 범위

지원:

- 단일 part와 staff
- 여러 measure의 첫 voice
- 기본 음표와 쉼표 길이
- G/F/C/percussion clef 매핑
- 반음과 겹반음 표시
- 점음표 표시
- 박자표와 이벤트 tick 기반 자동 beam
- SVG event 선택과 강조

아직 지원하지 않음:

- 다성부 충돌 해결과 stem 정책
- tie, slur, tuplet
- 조표 이름 변환과 임시표 문맥
- 페이지/시스템 자동 나눔
- 가사, 아티큘레이션, 다이내믹
- 큰 악보를 위한 부분 렌더링

## 다음 구현 원칙

- VexFlow 객체를 score-core에 저장하지 않는다.
- 변환 코드는 renderer의 adapter 계층에 둔다.
- 선택 상태는 score-core event ID로 관리한다.
- MusicXML import는 먼저 score-core로 변환하고, VexFlow는 score-core만
  렌더링한다.
- 복잡한 사보 기능이 VexFlow 위에서 과도한 자체 구현을 요구하는 시점에
  Verovio 또는 별도 engraving 계층을 다시 평가한다.

## 참고 자료

- VexFlow: https://github.com/vexflow/vexflow
- OpenSheetMusicDisplay: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay
- OSMD limitations: https://opensheetmusicdisplay.github.io/classdoc/
- Verovio: https://github.com/rism-digital/verovio
- Verovio toolkit methods: https://book.verovio.org/toolkit-reference/toolkit-methods.html

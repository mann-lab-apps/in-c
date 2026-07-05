# 피쳐맵

이 문서는 현재 제품이 어떤 기능 영역으로 구성되어 있는지 보여주는 진입점이다.
로드맵, 우선순위, TODO, 의사결정 근거는 다루지 않는다. 남은 작업과 논의는
GitHub 이슈에 남기고, 구체 동작 검토 기준은 `docs/product/acceptance/*.feature`
에 둔다.

## 보기

- [HTML 피쳐맵](./feature-map.html): 같은 데이터를 시각 지도와 상세 표로 렌더링한다.
- [피쳐맵 데이터](./feature-map-data.js): 기능 목록, 상태, 인수 시나리오, 관련 문서의 원본이다.
- [인수 시나리오 목록](./acceptance/README.md): 기능별 Gherkin 검토 기준을 관리한다.
- [AI Agent 협업 워크플로우](./agent-workflow.md): 작업 전후 문서 갱신 방식을 정리한다.

## 관리 방식

- 기능 목록을 추가하거나 수정할 때는 `feature-map-data.js`를 먼저 갱신한다.
- `feature-map.html`은 `feature-map-data.js`만 읽어 시각 지도와 상세 표를 만든다.
- 인수 시나리오가 필요한 기능은 `docs/product/acceptance/*.feature`에 기준을 추가하고
  `feature-map-data.js`의 `acceptance` 필드에 연결한다.
- 논의 히스토리와 우선순위는 이 문서에 쌓지 않고 GitHub 이슈에 남긴다.

## 상태 값

- `지원`: 현재 앱에서 기본 흐름을 사용할 수 있다.
- `부분 지원`: 동작은 있으나 예외 상황, UX, 자동화, 확장성이 아직 부족하다.
- `미지원`: 아직 사용자 기능으로 제공하지 않는다.
- `실험`: 방향을 검증 중인 기능이나 문서 체계다.
- `보류`: 현재 방향에서는 의도적으로 뒤로 미룬다.

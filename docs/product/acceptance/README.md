# Gherkin 인수 시나리오

이 디렉토리는 사용자가 직접 체감하는 기능 동작을 Gherkin `.feature` 파일로
정리한다. 목적은 무거운 요구사항 문서가 아니라, 작업 결과를 검토할 때 기준이
되는 짧은 인수 시나리오를 쌓는 것이다.

## 역할

- AI Agent는 사용자 입력, 선택 상태, 삭제 정책처럼 동작 해석이 중요한 작업을
  시작하기 전에 관련 `.feature` 파일을 찾거나 갱신한다.
- 사용자는 작업이 끝난 뒤 앱 동작과 `.feature` 파일을 함께 보며 기대와 다른
  부분을 지적한다.
- 시나리오는 구현 지시서가 아니라, 사용자가 어떤 행동을 했을 때 무엇을
  통과로 볼지 합의하는 문서다.
- Cucumber 같은 실행 도구와의 결합은 나중에 검토한다. 지금은 Gherkin 문법을
  협업 언어로 사용한다.

## 작업 방식

기본 흐름:

1. AI Agent가 작업 전 관련 `.feature` 파일을 확인한다.
2. 관련 파일이 없고 사용자 체감 동작이 바뀌는 작업이면 작은 시나리오 초안을
   추가한다.
3. 구현 중 기준이 바뀌면 코드와 함께 시나리오도 갱신한다.
4. PR 전에는 실제 동작이 시나리오와 어긋나지 않는지 확인한다.
5. 사용자는 작업 결과를 검토하면서 시나리오의 Given, When, Then이 기대와
   맞는지 피드백한다.

예외적으로 삭제 정책, 입력 모드, 파일 복구처럼 해석 여지가 큰 기능은 구현 전에
시나리오 초안을 먼저 놓고 사용자와 합의한다.

## 기존 문서와의 관계

- `docs/product/acceptance/*.feature`: 현재 작업 검토의 핵심 문서.
- `docs/product/feature-map.md`: 현재 제품 기능 영역과 상태를 보는 지도.
- `docs/product/agent-workflow.md`: AI Agent가 시나리오를 언제 확인하고 갱신할지
  정리한 절차.

## 파일 작성 규칙

- 기능 하나 또는 강하게 연결된 행동 하나를 한 `.feature` 파일에 담는다.
- Feature 이름은 사용자가 이해하는 행동으로 쓴다.
- 정상 흐름을 먼저 쓰고, 중요한 경계 조건만 추가한다.
- 아직 합의가 필요한 시나리오는 `@discussion` 태그를 붙인다.
- 자동화되지 않은 시나리오라도 실제 검토 기준으로 유효하면 남긴다.

## 현재 시나리오

- `start-and-recovery.feature`: 시작화면과 자동저장 복구본으로 작업을 시작한다.
- `score-setup.feature`: 새 악보를 만들고 제목, 박자표, 조표를 설정한다.
- `note-input.feature`: 음가를 선택하고 음표와 쉼표를 입력한다.
- `rest-to-note.feature`: 선택된 쉼표를 같은 위치와 같은 음가의 음표로 바꾼다.
- `rhythm-duration.feature`: 선택 이벤트의 음가를 바꾸고 남은 시간을 정리한다.
- `delete-event.feature`: 선택 이벤트를 삭제하고 마디 길이를 유지한다.
- `augmentation-dots.feature`: 점음표와 겹점음표를 입력한다.
- `tuplets.feature`: 셋잇단음표를 입력하고 해제한다.
- `range-selection.feature`: 연속 이벤트 범위를 선택하고 편집 대상으로 삼는다.
- `layout-rendering.feature`: system 줄바꿈, 마디 폭, 빔, 덧줄, 선택 표시를 확인한다.
- `playback.feature`: 재생, 일시정지, 정지, 템포, 타이/셋잇단 재생을 확인한다.
- `import-export.feature`: MusicXML 가져오기, MusicXML 내보내기, PDF 변환을 확인한다.
- `distribution-download.feature`: 배포 페이지와 운영체제별 다운로드 흐름을 확인한다.
- `columns.feature`: Columns에서 클래식 이해 마인드맵을 따라 칼럼을 읽는 흐름을 확인한다.

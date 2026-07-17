# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@start-screen @recovery @atdd-draft
Feature: 시작화면과 복구본으로 작업을 시작하기
  사용자는 앱을 열었을 때 새 악보, 가져오기, 최근 파일, 복구본 중
  적절한 시작 행동을 고를 수 있어야 한다.

  Scenario: 앱 실행 후 시작화면을 본다
    Given 앱이 일반 실행 모드로 시작된다
    When 앱 창이 열린다
    Then 사용자는 시작화면을 본다
    And 시작화면에는 새 악보 만들기, MusicXML 가져오기가 표시된다
    And 최근 MusicXML 파일 영역이 표시된다
    And 복구 가능한 작업이 있으면 복구본 열기가 표시된다

  Scenario: 자동저장 복구본을 연다
    Given 이전 작업의 자동저장 복구본이 있다
    When 사용자가 복구본 열기를 선택한다
    Then 앱은 복구본의 악보를 연다
    And 복구된 악보의 제목, 박자표, 조표, 이벤트가 표시된다

  Scenario: 복구본이 없으면 복구 진입점이 방해되지 않는다
    Given 이전 작업의 자동저장 복구본이 없다
    When 앱이 시작화면을 보여준다
    Then 사용자는 새 악보 만들기 또는 MusicXML 가져오기를 선택할 수 있다
    And 사용할 수 없는 복구 행동이 주요 흐름을 방해하지 않는다

  Scenario: 최근 MusicXML 파일을 다시 연다
    Given 최근에 가져온 MusicXML 파일이 있다
    When 사용자가 시작화면의 최근 파일을 선택한다
    Then 앱은 해당 MusicXML 파일을 다시 읽어 악보로 연다
    And 최근 파일 목록은 마지막으로 연 파일을 위에 표시한다

  Scenario: 최근 MusicXML 파일이 사라진 경우 목록에서 정리한다
    Given 최근 파일 목록에 더 이상 접근할 수 없는 MusicXML 파일이 있다
    When 사용자가 해당 최근 파일을 선택한다
    Then 앱은 최근 파일을 찾을 수 없다는 안내를 보여준다
    And 사용자는 해당 항목을 최근 파일 목록에서 지울 수 있다

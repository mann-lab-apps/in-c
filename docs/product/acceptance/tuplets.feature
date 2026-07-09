# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@rhythm-editing @tuplets @atdd-draft
Feature: 셋잇단음표를 입력하고 해제하기
  사용자는 선택 상태나 입력 커서 상태에서 셋잇단음표를 만들고, 필요하면 해제할 수
  있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  Scenario: 선택된 세 이벤트를 셋잇단음표로 묶는다
    Given 같은 마디 안에 같은 음가의 연속된 이벤트 3개가 있다
    And 첫 번째 이벤트가 선택되어 있다
    When 사용자가 셋잇단음표 동작을 실행한다
    Then 세 이벤트는 하나의 3:2 셋잇단음표 그룹으로 묶인다
    And 셋잇단음표 번호와 괄호가 표시된다
    And 마디의 전체 박자 길이는 변하지 않는다

  Scenario: 입력 커서에서 세 이벤트를 입력해 셋잇단음표를 만든다
    Given 입력 커서가 마디 안의 충분한 빈 시간에 있다
    When 사용자가 셋잇단음표 입력을 시작한다
    And 사용자가 "C", "D", "E"를 차례로 입력한다
    Then 세 음표는 하나의 3:2 셋잇단음표 그룹으로 추가된다
    And 마디의 전체 박자 길이는 변하지 않는다

  @discussion
  Scenario: 셋잇단음표 입력 도중에도 진행 상태를 이해할 수 있다
    Given 입력 커서에서 셋잇단음표 입력을 시작했다
    When 사용자가 첫 번째 음표를 입력한다
    Then 사용자는 셋잇단음표 입력이 진행 중임을 알 수 있다
    When 사용자가 두 번째 음표를 입력한다
    Then 사용자는 셋잇단음표 입력이 2/3 진행됐음을 알 수 있다

  Scenario: 이미 셋잇단음표인 그룹을 다시 실행하면 해제한다
    Given 3:2 셋잇단음표 그룹 안의 이벤트가 선택되어 있다
    When 사용자가 셋잇단음표 동작을 다시 실행한다
    Then 선택된 셋잇단음표 그룹은 해제된다
    And 남은 이벤트들은 유효한 일반 리듬으로 정리된다
    And 마디의 전체 박자 길이는 변하지 않는다

  Scenario: 필요한 시간이 부족하면 셋잇단음표 생성을 거부한다
    Given 입력 커서 뒤에 셋잇단음표가 들어갈 충분한 시간이 없다
    When 사용자가 셋잇단음표 입력을 시작한다
    Then 셋잇단음표 입력은 시작되지 않는다
    And 사용자는 충분한 시간이 없다는 피드백을 받는다

  Scenario: relation을 깨뜨리는 셋잇단음표 편집은 이유를 안내한다
    Given 타이 또는 다른 음가가 포함된 구간의 이벤트가 선택되어 있다
    When 사용자가 셋잇단음표 동작을 실행한다
    Then 앱은 score를 변경하지 않는다
    And 사용자는 타이 해제, 같은 음가 필요, 충분한 연속 시간 같은 실패 이유를 확인한다

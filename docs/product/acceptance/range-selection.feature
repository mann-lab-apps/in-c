# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@selection @range-editing @atdd-draft
Feature: 범위를 선택해 편집하기
  사용자는 연속된 이벤트를 범위로 선택하고, 이후 삭제나 일괄 편집의 대상으로 삼을
  수 있어야 한다.

  Scenario: Shift와 방향키로 연속 이벤트 범위를 선택한다
    Given 여러 이벤트가 있는 단성부 악보가 열려 있다
    And 첫 번째 이벤트가 선택되어 있다
    When 사용자가 Shift를 누른 채 오른쪽 화살표를 누른다
    Then 첫 번째 이벤트부터 다음 이벤트까지 범위 선택된다
    And 선택된 범위는 일반 단일 선택과 구분되어 보인다

  Scenario: 드래그로 연속 이벤트 범위를 선택한다
    Given 여러 이벤트가 있는 단성부 악보가 열려 있다
    When 사용자가 이벤트들을 포함하도록 드래그한다
    Then 드래그 영역 안의 연속 이벤트가 범위 선택된다
    And 선택 범위의 시작과 끝을 시각적으로 알 수 있다

  Scenario: 범위 선택 상태에서 삭제한다
    Given 같은 마디 안의 연속된 이벤트 범위가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 선택 범위의 이벤트가 삭제된다
    And 삭제된 전체 길이는 유효한 리듬으로 정리된다
    And 각 마디의 전체 박자 길이는 변하지 않는다
    And 사용자는 Undo 한 번으로 범위 삭제 전 상태로 돌아갈 수 있다

  Scenario: 여러 마디에 걸친 범위는 아직 삭제하지 않는다
    Given 여러 마디에 걸친 이벤트 범위가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 악보는 변경되지 않는다
    And 사용자는 같은 마디의 연속 범위만 지울 수 있다는 안내를 본다

  @discussion
  Scenario: 범위 선택 상태에서 복사하거나 붙여넣는다
    Given 연속된 이벤트 범위가 선택되어 있다
    When 사용자가 복사 또는 붙여넣기를 실행한다
    Then 앱은 아직 지원하지 않는 편집 범위임을 안내한다
    And 후속 구현은 같은 성부의 박자 길이 불변식을 깨지 않는 경우부터 다룬다

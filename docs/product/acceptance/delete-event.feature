# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@rhythm-editing @delete @atdd-draft
Feature: 선택 이벤트를 삭제하기
  사용자는 잘못 입력한 음표나 쉼표를 쉼표로 변환하는 것이 아니라 삭제할 수 있어야
  한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  @scenario-delete-event-merge-into-previous
  Scenario: 첫 이벤트가 아닌 음표를 삭제하면 삭제 위치부터 뒤 쉼표로 정리된다
    Given "4/4" 악보의 1번째 마디에 "quarter" 음표, "quarter" 음표, "half" 쉼표가 있다
    And 두 번째 "quarter" 음표가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 첫 번째 음표의 음가는 "quarter" 그대로 유지된다
    And 선택되었던 두 번째 음표 위치부터 마디 끝까지 쉼표로 정리된다
    And 1번째 마디의 전체 박자 길이는 변하지 않는다

  @scenario-delete-event-shift-leading-event
  Scenario: 첫 이벤트를 삭제해도 뒤 이벤트를 앞으로 당기지 않는다
    Given "4/4" 악보의 1번째 마디에 "quarter" 음표, "quarter" 쉼표, "half" 쉼표가 있다
    And 첫 번째 "quarter" 음표가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 첫 번째 음표 위치부터 뒤따르는 쉼표 구간이 쉼표로 병합된다
    And 뒤 이벤트들은 삭제 전 시작 위치를 유지한다
    And 1번째 마디의 전체 박자 길이는 변하지 않는다

  @scenario-delete-event-remove-rest
  Scenario: 쉼표를 삭제하면 뒤따르는 쉼표 구간과 병합된다
    Given "4/4" 악보의 1번째 마디에 "quarter" 음표, "quarter" 쉼표, "quarter" 쉼표, "quarter" 음표가 있다
    And "quarter" 쉼표가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 선택되었던 쉼표와 뒤따르는 쉼표는 하나의 쉼표 구간으로 정리된다
    And 앞 이벤트의 음가는 변하지 않는다
    And 1번째 마디의 전체 박자 길이는 변하지 않는다

  @tie @scenario-delete-event-clean-ties
  Scenario: 타이 인접 구간을 삭제하면 남은 타이 관계가 유효하게 정리된다
    Given 마디 경계를 넘는 타이 음표가 있는 악보가 열려 있다
    And 타이와 인접한 이벤트가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 삭제 후 남은 이벤트의 타이 관계는 유효하다
    And 각 마디의 전체 박자 길이는 변하지 않는다

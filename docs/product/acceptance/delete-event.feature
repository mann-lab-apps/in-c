# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@rhythm-editing @delete @atdd-draft
Feature: 선택 이벤트를 삭제하기
  사용자는 잘못 입력한 음표나 쉼표를 쉼표로 변환하는 것이 아니라 삭제할 수 있어야
  한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  @scenario-delete-event-merge-into-previous
  Scenario: 첫 이벤트가 아닌 이벤트를 삭제하면 앞 이벤트에 길이가 가산된다
    Given "4/4" 악보의 1번째 마디에 "quarter" 음표, "quarter" 음표, "half" 쉼표가 있다
    And 두 번째 "quarter" 음표가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 첫 번째 음표의 음가는 "half"가 된다
    And 선택되었던 두 번째 음표는 제거된다
    And 1번째 마디의 전체 박자 길이는 변하지 않는다

  @scenario-delete-event-shift-leading-event
  Scenario: 첫 이벤트를 삭제하면 뒤 이벤트가 앞으로 당겨진다
    Given "4/4" 악보의 1번째 마디에 "quarter" 음표, "quarter" 쉼표, "half" 쉼표가 있다
    And 첫 번째 "quarter" 음표가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 뒤 이벤트들은 삭제된 길이만큼 앞으로 당겨진다
    And 마디 끝에는 삭제된 길이를 보존하는 쉼표가 생긴다
    And 1번째 마디의 전체 박자 길이는 변하지 않는다

  @scenario-delete-event-remove-rest
  Scenario: 쉼표를 삭제해도 새 쉼표가 추가로 늘어나지 않는다
    Given "4/4" 악보의 1번째 마디에 "quarter" 음표, "quarter" 쉼표, "half" 쉼표가 있다
    And "quarter" 쉼표가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 선택되었던 쉼표는 제거된다
    And 삭제된 길이는 앞 이벤트에 가산된다
    And 1번째 마디의 전체 박자 길이는 변하지 않는다

  @tie @scenario-delete-event-clean-ties
  Scenario: 타이 인접 구간을 삭제하면 남은 타이 관계가 유효하게 정리된다
    Given 마디 경계를 넘는 타이 음표가 있는 악보가 열려 있다
    And 타이와 인접한 이벤트가 선택되어 있다
    When 사용자가 Backspace를 누른다
    Then 삭제 후 남은 이벤트의 타이 관계는 유효하다
    And 각 마디의 전체 박자 길이는 변하지 않는다

# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@rhythm-editing @dots @atdd-draft
Feature: 점음표와 겹점음표를 입력하기
  사용자는 선택된 음표나 쉼표에 점을 추가해 실제 길이를 늘릴 수 있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  @scenario-augmentation-dots-add-first-dot
  Scenario Outline: 선택 이벤트에 점을 추가한다
    Given <duration> <event_type>가 선택되어 있다
    And 선택된 이벤트 뒤에 점을 적용할 충분한 시간이 있다
    When 사용자가 점 추가 동작을 실행한다
    Then 선택된 이벤트는 점이 1개 붙은 <duration> <event_type>가 된다
    And 선택된 이벤트의 실제 길이는 <dotted_duration>이 된다
    And 마디의 전체 박자 길이는 변하지 않는다

    Examples:
      | duration  | event_type | dotted_duration |
      | "quarter" | "note"     | "dotted-quarter" |
      | "quarter" | "rest"     | "dotted-quarter" |

  @scenario-augmentation-dots-add-second-dot
  Scenario: 이미 점이 있는 이벤트에 점을 하나 더 추가한다
    Given 점이 1개 붙은 "quarter" 음표가 선택되어 있다
    And 선택된 이벤트 뒤에 겹점 길이를 적용할 충분한 시간이 있다
    When 사용자가 점 추가 동작을 실행한다
    Then 선택된 이벤트는 겹점 "quarter" 음표가 된다
    And 마디의 전체 박자 길이는 변하지 않는다

  @scenario-augmentation-dots-reject-without-room
  Scenario: 충분한 시간이 없으면 점 추가를 거부한다
    Given 마디 마지막 위치의 "quarter" 음표가 선택되어 있다
    And 선택된 이벤트 뒤에 점 길이를 적용할 시간이 없다
    When 사용자가 점 추가 동작을 실행한다
    Then 선택된 이벤트는 점이 없는 "quarter" 음표로 유지된다
    And 사용자는 점을 추가할 수 없다는 피드백을 받는다

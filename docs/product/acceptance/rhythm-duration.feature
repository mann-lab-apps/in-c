# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@rhythm-editing @duration @atdd-draft
Feature: 선택 이벤트의 음가를 바꾸기
  사용자는 이미 입력된 음표나 쉼표의 음가를 바꾸면서도 마디 길이를 유지할 수
  있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  Scenario Outline: 선택 이벤트를 더 짧은 음가로 바꾸면 남은 시간이 쉼표로 채워진다
    Given <time_signature> 악보의 <measure_number>번째 마디에 <original_duration> <event_type>가 선택되어 있다
    When 사용자가 음가 <new_duration>을 선택한다
    Then 선택된 이벤트의 음가는 <new_duration>이 된다
    And 줄어든 시간은 유효한 쉼표로 채워진다
    And <measure_number>번째 마디의 전체 박자 길이는 변하지 않는다

    Examples:
      | time_signature | measure_number | original_duration | event_type | new_duration |
      | "4/4"          | 1              | "quarter"         | "note"     | "eighth"     |
      | "4/4"          | 1              | "half"            | "rest"     | "quarter"    |

  Scenario Outline: 선택 이벤트를 더 긴 음가로 바꾸면 뒤 이벤트를 소비한다
    Given <time_signature> 악보의 <measure_number>번째 마디에 <first_duration> 음표가 선택되어 있다
    And 선택된 이벤트 바로 뒤에 <next_duration> 쉼표가 있다
    When 사용자가 음가 <new_duration>을 선택한다
    Then 선택된 이벤트의 음가는 <new_duration>이 된다
    And 소비된 뒤 쉼표는 제거되거나 남은 길이만큼 줄어든다
    And <measure_number>번째 마디의 전체 박자 길이는 변하지 않는다

    Examples:
      | time_signature | measure_number | first_duration | next_duration | new_duration |
      | "4/4"          | 1              | "quarter"      | "quarter"     | "half"       |
      | "4/4"          | 1              | "eighth"       | "eighth"      | "quarter"    |

  Scenario: 뒤 이벤트를 소비할 수 없으면 음가 변경을 거부한다
    Given "4/4" 악보의 1번째 마디 마지막 위치에 "quarter" 음표가 선택되어 있다
    And 선택된 이벤트 뒤에 충분한 빈 시간이 없다
    When 사용자가 음가 "half"를 선택한다
    Then 선택된 이벤트의 음가는 "quarter"로 유지된다
    And 사용자는 음가를 늘릴 수 없다는 피드백을 받는다
    And 1번째 마디의 전체 박자 길이는 변하지 않는다

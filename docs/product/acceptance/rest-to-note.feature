# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md
# Legacy context: docs/product/story-map.md
# Related story: STORY-MVP-002

@story-mvp-002 @note-input @atdd-draft
Feature: 쉼표를 음표로 바꾸기
  사용자는 이미 놓인 쉼표를 지우거나 새 이벤트를 삽입하지 않고,
  같은 위치와 같은 음가의 음표로 바꿀 수 있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다
    And 현재 입력 음가는 "quarter"이다

  Scenario Outline: 선택된 쉼표에 음이름을 입력하면 같은 음가의 음표로 바뀐다
    Given <time_signature> 악보의 <measure_number>번째 마디에 <rest_duration> 쉼표가 선택되어 있다
    And 선택된 쉼표의 시작 위치는 <start_beat>이다
    When 사용자가 <pitch_key>를 입력한다
    Then 선택된 이벤트는 <pitch_name> 음표가 된다
    And 선택된 이벤트의 음가는 <rest_duration>이다
    And 선택된 이벤트의 시작 위치는 <start_beat>이다
    And <measure_number>번째 마디의 전체 박자 길이는 변하지 않는다
    And 선택 상태는 새로 바뀐 음표에 남아 있다

    Examples:
      | time_signature | measure_number | rest_duration | start_beat | pitch_key | pitch_name |
      | "4/4"          | 1              | "quarter"     | 1          | "C"       | "C4"       |
      | "4/4"          | 1              | "eighth"      | 2.5        | "G"       | "G4"       |
      | "3/4"          | 2              | "half"        | 2          | "A"       | "A4"       |

  @korean-input
  Scenario: 한글 입력 상태에서도 물리 음이름 키로 쉼표를 음표로 바꾼다
    Given "4/4" 악보의 1번째 마디에 "quarter" 쉼표가 선택되어 있다
    And 사용자의 키보드 입력기가 한글 상태이다
    When 사용자가 물리 "C" 키를 누른다
    Then 선택된 이벤트는 "C4" 음표가 된다
    And 선택된 이벤트의 음가는 "quarter"이다
    And 1번째 마디의 전체 박자 길이는 변하지 않는다

  @discussion
  Scenario Outline: 온마디쉼표 표기는 실제 마디 길이에 맞는 음표로 바뀐다
    Given <time_signature> 악보의 <measure_number>번째 마디가 온마디쉼표 표기로 비어 있다
    And 그 온마디쉼표가 선택되어 있다
    When 사용자가 <pitch_key>를 입력한다
    Then 선택된 이벤트는 <pitch_name> 음표가 된다
    And 선택된 이벤트의 실제 길이는 <measure_duration>이다
    And <measure_number>번째 마디의 전체 박자 길이는 변하지 않는다

    Examples:
      | time_signature | measure_number | pitch_key | pitch_name | measure_duration |
      | "3/4"          | 1              | "C"       | "C4"       | "dotted-half"    |
      | "6/8"          | 1              | "C"       | "C4"       | "dotted-half"    |

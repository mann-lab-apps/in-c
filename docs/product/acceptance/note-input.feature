# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@note-input @atdd-draft
Feature: 음표와 쉼표를 입력하기
  사용자는 마우스 없이도 음가를 고르고, 음표와 쉼표를 이어서 입력할 수 있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  Scenario Outline: 음가를 선택한 뒤 음표를 입력한다
    Given 현재 입력 위치가 선택되어 있다
    When 사용자가 음가 <duration_key>를 선택한다
    And 사용자가 <pitch_key>를 입력한다
    Then 현재 위치에는 <duration_name> <pitch_name> 음표가 입력된다
    And 마디의 전체 박자 길이는 유효하게 유지된다
    And 선택 상태는 입력된 음표에 남아 있다

    Examples:
      | duration_key | duration_name | pitch_key | pitch_name |
      | "3"          | "quarter"     | "C"       | "C4"       |
      | "4"          | "eighth"      | "G"       | "G4"       |
      | "5"          | "sixteenth"   | "A"       | "A4"       |

  Scenario: 선택된 음표의 음높이를 바꾼다
    Given "quarter" "C4" 음표가 선택되어 있다
    When 사용자가 "E"를 입력한다
    Then 선택된 이벤트는 "quarter" "E4" 음표가 된다
    And 선택된 이벤트의 시작 위치는 변하지 않는다
    And 마디의 전체 박자 길이는 변하지 않는다

  Scenario: 선택된 이벤트를 같은 음가의 쉼표로 바꾼다
    Given "eighth" "G4" 음표가 선택되어 있다
    When 사용자가 "R"을 입력한다
    Then 선택된 이벤트는 "eighth" 쉼표가 된다
    And 선택된 이벤트의 시작 위치는 변하지 않는다
    And 마디의 전체 박자 길이는 변하지 않는다

  Scenario: Inspector에서 선택 이벤트 속성을 수정한다
    Given "quarter" "C4" 음표가 선택되어 있다
    When 사용자가 Inspector에서 음가를 "eighth"로 바꾼다
    Then 선택된 이벤트는 "eighth" 음가가 된다
    When 사용자가 Inspector에서 점을 추가한다
    Then 선택된 이벤트에는 점이 추가된다
    When 사용자가 Inspector에서 샤프를 선택한다
    Then 선택된 이벤트에는 샤프가 적용된다
    When 사용자가 Inspector에서 쉼표로 변환을 실행한다
    Then 선택된 이벤트는 같은 위치와 음가의 쉼표가 된다
    And 각 변경은 Undo로 되돌릴 수 있다

  Scenario: 선택한 음표의 아티큘레이션을 토글한다
    Given "quarter" "C4" 음표가 선택되어 있다
    When 사용자가 Inspector에서 스타카토를 켠다
    Then 선택된 음표 데이터에는 스타카토가 저장된다
    When 사용자가 Inspector에서 스타카토를 다시 끈다
    Then 선택된 음표 데이터에서 스타카토가 제거된다
    And 쉼표에는 아티큘레이션을 추가할 수 없다

  Scenario: 마지막 이벤트 뒤 입력 커서에서 새 음표와 쉼표를 추가한다
    Given 마지막 이벤트가 선택되어 있다
    When 사용자가 오른쪽 화살표를 누른다
    Then 마지막 이벤트 뒤에 입력 커서가 표시된다
    When 사용자가 "3" 음가를 선택한다
    And 사용자가 "D"를 입력한다
    Then 입력 커서 위치에 "quarter" "D4" 음표가 추가된다
    When 사용자가 오른쪽 화살표를 누른다
    And 사용자가 "R"을 입력한다
    Then 다음 입력 위치에 "quarter" 쉼표가 추가된다

  @korean-input
  Scenario: 한글 입력 상태에서도 물리 키로 기본 입력을 수행한다
    Given 사용자의 키보드 입력기가 한글 상태이다
    And 현재 입력 위치가 선택되어 있다
    When 사용자가 물리 "C" 키를 누른다
    Then 현재 위치에는 "C4" 음표가 입력된다
    When 사용자가 물리 "R" 키를 누른다
    Then 선택된 이벤트는 같은 음가의 쉼표가 된다

  @korean-input
  Scenario: 한글 입력 상태에서도 핵심 편집 단축키를 물리 키로 수행한다
    Given 사용자의 키보드 입력기가 한글 상태이다
    And "quarter" "C4" 음표가 선택되어 있다
    When 사용자가 물리 "4" 키를 누른다
    Then 선택된 이벤트는 "eighth" 음가로 바뀐다
    When 사용자가 물리 "." 키를 누른다
    Then 선택된 이벤트에는 점이 추가된다
    When 사용자가 물리 "," 키를 누른다
    Then 선택된 이벤트의 점이 제거된다
    When 사용자가 물리 "L" 키를 누른다
    Then 앱은 선택된 음표에 타이를 적용하거나 불가능한 이유를 안내한다
    When 사용자가 물리 "T" 키를 누른다
    Then 앱은 셋잇단음표 동작을 실행하거나 불가능한 이유를 안내한다
    When 사용자가 실행 취소 단축키를 누른다
    Then 직전 편집은 실행 취소된다

# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@score-setup @atdd-draft
Feature: 새 악보를 설정하기
  사용자는 앱을 처음 열었을 때 제목, 박자표, 조표가 분명한 단성부 악보를
  시작할 수 있어야 한다.

  @scenario-score-setup-create-with-selected-settings
  Scenario Outline: 시작화면에서 새 악보를 만든다
    Given 앱이 시작화면을 보여준다
    When 사용자가 새 악보 만들기를 선택한다
    And 제목을 <title>로 입력한다
    And 부제목을 <subtitle>로 입력한다
    And 박자표를 <time_signature>로 선택한다
    And 조표를 <key_signature>로 선택한다
    Then 악보 제목은 <title>로 표시된다
    And 악보 부제목은 <subtitle>로 표시된다
    And 첫 system에는 <time_signature> 박자표가 표시된다
    And 첫 system에는 <key_signature> 조표가 표시된다
    And 첫 마디는 선택 가능한 빈 마디 상태로 표시된다

    Examples:
      | title          | subtitle | time_signature | key_signature |
      | "Untitled"     | "in-C"   | "4/4"          | "C major"     |
      | "Etude in G"   | "draft"  | "3/4"          | "G major"     |
      | "Six Eight"    | "sketch" | "6/8"          | "F major"     |

  Scenario: 생성된 악보의 제목과 부제목을 수정한다
    Given 새 악보가 열려 있다
    When 사용자가 제목을 "Morning Phrase"로 수정한다
    And 사용자가 부제목을 "for flute"로 수정한다
    Then 악보 제목은 "Morning Phrase"로 표시된다
    And 악보 부제목은 "for flute"로 표시된다

  @scenario-score-setup-change-time-and-key-signatures
  Scenario Outline: 생성 후 박자표나 조표를 변경한다
    Given <original_time> 박자표와 <original_key> 조표의 악보가 열려 있다
    When 사용자가 박자표를 <new_time>로 변경한다
    And 사용자가 조표를 <new_key>로 변경한다
    Then 첫 system에는 <new_time> 박자표가 표시된다
    And 첫 system에는 <new_key> 조표가 표시된다
    And 각 마디는 새 박자표 안에서 overflow 없이 exact-fill 상태로 남아 있다
    And 기존 음표의 실제 pitch 의미는 유지된다
    And MusicXML로 내보냈다가 다시 가져와도 박자표와 조표 의미가 유지된다

    Examples:
      | original_time | original_key | new_time | new_key   |
      | "4/4"         | "C major"    | "3/4"    | "G major" |

  @scenario-score-setup-reject-overflowing-time-signature
  Scenario: 박자표 변경으로 음표가 마디를 넘치면 변경하지 않는다
    Given 4/4 박자표의 악보에 온음표가 입력되어 있다
    When 사용자가 해당 마디의 박자표를 3/4로 변경한다
    Then 박자표 변경은 적용되지 않는다
    And 사용자는 선택한 마디의 리듬이 새 박자표에 맞지 않는다는 안내를 본다

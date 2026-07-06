# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@score-setup @atdd-draft
Feature: 새 악보를 설정하기
  사용자는 앱을 처음 열었을 때 제목, 박자표, 조표가 분명한 단성부 악보를
  시작할 수 있어야 한다.

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

  @discussion
  Scenario Outline: 생성 후 박자표나 조표를 변경한다
    Given <original_time> 박자표와 <original_key> 조표의 악보가 열려 있다
    When 사용자가 박자표를 <new_time>로 변경한다
    And 사용자가 조표를 <new_key>로 변경한다
    Then 첫 system에는 <new_time> 박자표가 표시된다
    And 첫 system에는 <new_key> 조표가 표시된다
    And 기존 마디의 음악 시간은 유효한 상태로 남아 있다

    Examples:
      | original_time | original_key | new_time | new_key   |
      | "4/4"         | "C major"    | "3/4"    | "G major" |

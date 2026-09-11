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

  @scenario-score-setup-create-grand-staff-score
  Scenario: 새 악보 마법사에서 피아노 grand staff 악보를 만든다
    Given 앱이 시작화면을 보여준다
    When 사용자가 새 악보 만들기를 선택한다
    And 악보 구성을 "피아노 grand staff"로 선택한다
    Then 생성된 악보에는 하나의 피아노 part와 높은음자리표/낮은음자리표 staff가 있다
    And 각 staff에는 선택한 마디 수만큼 빈 마디가 준비된다
    And 악보 미리보기에는 Piano와 Staff 2 보표가 stacked staff로 표시된다
    And 낮은음자리표 staff의 이벤트를 선택하면 note input target이 해당 staff에 유지된다

  @scenario-score-setup-create-ensemble-score
  Scenario: 새 악보 마법사에서 2-4파트 앙상블 악보를 만든다
    Given 앱이 시작화면을 보여준다
    When 사용자가 새 악보 만들기를 선택한다
    And 악보 구성을 앙상블 프리셋으로 선택한다
    Then 생성된 악보에는 여러 part와 각 part의 기본 staff가 있다
    And 각 staff에는 선택한 마디 수만큼 빈 마디가 준비된다
    And viola와 cello처럼 part 성격에 맞는 기본 음자리표가 배정된다
    And 악보 미리보기에는 각 part/staff가 stacked staff로 표시된다

  @scenario-score-setup-edit-active-part-label
  Scenario: 현재 파트 이름을 수정한다
    Given 여러 part가 있는 악보가 열려 있다
    When 사용자가 악보 탭에서 현재 파트 이름을 바꾼다
    Then score의 해당 part 이름이 변경된다
    And 악보 미리보기와 입력 보표 목록은 변경된 이름을 사용한다

  @scenario-score-setup-edit-score-structure
  Scenario: 악보 탭에서 part와 staff 구조를 편집한다
    Given 편집 가능한 악보가 열려 있다
    When 사용자가 악보 탭에서 새 part를 추가한다
    Then score에는 같은 마디 수를 가진 새 part와 staff가 생긴다
    And 입력 보표는 새 part의 staff를 가리킨다
    When 사용자가 현재 part에 staff를 추가한다
    Then 해당 part에는 같은 마디 수와 기본 clef를 가진 새 staff가 생긴다
    When 사용자가 현재 staff를 삭제한다
    Then 해당 part에는 하나 이상의 staff가 남는다
    When 사용자가 현재 part를 삭제한다
    Then score에는 하나 이상의 part가 남는다

  @scenario-score-setup-add-instrument-library-part
  Scenario: 악보 탭에서 악기 라이브러리 preset으로 part를 추가한다
    Given 편집 가능한 악보가 열려 있다
    When 사용자가 악보 탭에서 첼로 preset을 선택하고 새 part를 추가한다
    Then score에는 첼로 이름과 약어를 가진 part가 생긴다
    And 첼로 part의 기본 staff는 낮은음자리표를 사용한다
    When 사용자가 피아노 preset을 선택하고 새 part를 추가한다
    Then score에는 높은음자리표와 낮은음자리표를 가진 피아노 grand staff part가 생긴다
    And 입력 보표는 새로 추가한 part의 첫 staff를 가리킨다

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

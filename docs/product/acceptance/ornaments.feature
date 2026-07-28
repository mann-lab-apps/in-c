# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@notation @ornaments @atdd-draft
Feature: 장식음을 입력하고 MusicXML로 유지하기
  사용자는 선택한 음표에 장식음을 추가하거나 해제하고, 여러 장식음을 함께 저장할 수 있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  @scenario-ornaments-add-selected-note
  Scenario: 선택한 음표에 장식음을 추가한다
    Given 장식음이 없는 음표 하나가 선택되어 있다
    When 사용자가 tr 장식음을 선택한다
    Then 선택한 음표에 tr 장식음이 추가된다
    And 다른 음표의 음높이와 음가는 바뀌지 않는다

  @scenario-ornaments-remove-selected-note
  Scenario: 선택한 음표에서 같은 장식음을 해제한다
    Given tr 장식음이 있는 음표 하나가 선택되어 있다
    When 사용자가 tr 장식음을 다시 선택한다
    Then 선택한 음표에서 tr 장식음이 해제된다

  @scenario-ornaments-keep-multiple
  Scenario: 여러 장식음을 함께 유지한다
    Given tr 장식음이 있는 음표 하나가 선택되어 있다
    When 사용자가 mord.와 turn 장식음을 차례로 선택한다
    Then 선택한 음표에 tr, mord., turn 장식음이 함께 남는다

  @scenario-ornaments-musicxml-round-trip
  Scenario: MusicXML 저장과 다시 가져오기 뒤 장식음 종류를 유지한다
    Given tr, mord., turn 장식음이 있는 악보가 열려 있다
    When 사용자가 MusicXML로 저장한 뒤 다시 가져온다
    Then 해당 음표의 세 장식음 종류가 저장 전과 같다

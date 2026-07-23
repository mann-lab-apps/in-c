# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@lyrics @musicxml @atdd-draft
Feature: 선택한 음표에 가사를 입력하고 저장하기
  사용자는 선택한 음표에 가사를 입력하고 MusicXML로 저장한 뒤에도 그 의미를 유지할 수 있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  @scenario-lyrics-edit-selected-note
  Scenario: 선택한 음표에 가사와 절 번호를 입력한다
    Given 가사를 넣을 음표가 선택되어 있다
    When 사용자가 가사 절과 내용을 입력한다
    Then 선택한 음표에 입력한 가사가 표시된다
    And 입력 결과를 알리는 상태 문구가 보인다

  @scenario-lyrics-block-note-shortcuts
  Scenario: 가사 입력 중 음표 입력 단축키를 막는다
    Given 가사 입력 칸에 키보드 초점이 있다
    When 사용자가 음표 입력에 쓰이는 글자나 Space를 입력한다
    Then 해당 문자는 가사 편집에만 사용된다
    And 악보에 새 음표가 입력되지 않는다

  @scenario-lyrics-musicxml-round-trip
  Scenario: MusicXML 왕복에서 가사 의미를 유지한다
    Given 절 번호, 음절 위치, 멜리스마 정보가 있는 가사가 입력되어 있다
    When MusicXML로 저장한 뒤 다시 가져온다
    Then 가사 본문과 절 번호가 유지된다
    And 음절 위치와 멜리스마 정보가 유지된다

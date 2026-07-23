# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@notation @tremolo @atdd-draft
Feature: 트레몰로 표시를 입력하고 유지하기
  사용자는 선택한 음표에 트레몰로를 표시하고 저장·불러오기와 재생에서도 같은 정보를 유지할 수 있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  @scenario-tremolo-apply-selected-note
  Scenario: 선택한 음표에 트레몰로를 표시한다
    Given 음표 하나가 선택되어 있다
    When 사용자가 트레몰로 3줄을 선택한다
    Then 선택한 음표에 트레몰로 3줄이 저장된다
    And 악보에 트레몰로 3줄이 표시된다

  @scenario-tremolo-musicxml-round-trip
  Scenario: MusicXML 저장과 불러오기 뒤 트레몰로를 유지한다
    Given 트레몰로 3줄이 표시된 음표가 있다
    When 사용자가 MusicXML로 저장한 뒤 다시 불러온다
    Then 해당 음표의 트레몰로 종류와 줄 수가 유지된다

  @scenario-tremolo-playback-data
  Scenario: 재생 데이터에 트레몰로 정보를 유지한다
    Given 트레몰로 3줄이 표시된 음표가 있다
    When 앱이 악보의 재생 데이터를 만든다
    Then 해당 음표의 재생 이벤트에 트레몰로 종류와 줄 수가 유지된다

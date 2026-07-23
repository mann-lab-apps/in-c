# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@notation @clef @atdd-draft
Feature: 선택한 마디의 음자리표를 바꾸고 유지하기
  사용자는 선택한 마디의 음자리표를 바꾸고, 같은 음높이를 새 음자리표에 맞는 위치에서 보며, 저장·불러오기 뒤에도 같은 음자리표를 유지할 수 있어야 한다.

  Background:
    Given 앱이 편집 가능한 단성부 악보를 열어 둔다

  @scenario-clef-change-selected-measure
  Scenario: 선택한 마디의 음자리표를 바꾼다
    Given 음표가 있는 마디가 선택되어 있다
    When 사용자가 낮은음자리표를 선택한다
    Then 선택한 마디의 음자리표가 낮은음자리표로 바뀐다
    And 다른 마디의 음자리표는 바뀌지 않는다
    And 변경 결과를 알리는 상태 문구가 보인다

  @scenario-clef-staff-position
  Scenario: 같은 음높이를 음자리표에 맞는 오선 위치에 표시한다
    Given C4 음표가 있는 악보가 있다
    When C4를 높은음자리표와 낮은음자리표로 각각 표시한다
    Then C4는 서로 다른 오선 위치에 보인다
    And C4의 실제 음높이는 바뀌지 않는다

  @scenario-clef-musicxml-round-trip
  Scenario: MusicXML 저장과 불러오기 뒤 음자리표를 유지한다
    Given 낮은음자리표로 바꾼 마디가 있다
    When 사용자가 MusicXML로 저장한 뒤 다시 불러온다
    Then 해당 마디의 음자리표 기호와 오선 번호가 유지된다

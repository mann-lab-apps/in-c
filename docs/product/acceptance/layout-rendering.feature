# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@layout @engraving @atdd-draft
Feature: 악보를 읽기 좋게 배치하기
  사용자는 입력한 악보가 화면 폭과 음표 위치에 맞춰 읽기 좋은 오선보로 보이기를
  기대한다.

  Scenario: 여러 마디가 화면 폭에 맞춰 자동으로 system을 나눈다
    Given 여러 마디가 있는 단성부 악보가 열려 있다
    When 사용자가 악보 화면을 확인한다
    Then 마디들은 사용 가능한 폭에 맞춰 여러 system으로 나뉜다
    And 각 system의 마지막 마디는 사용 가능한 전체 폭을 채운다
    And 모든 이벤트는 자신이 속한 마디 영역 안에 그려진다

  Scenario: 음악 내용에 따라 마디 폭이 계산된다
    Given 음표 개수가 다른 여러 마디가 있는 악보가 열려 있다
    When 사용자가 악보 화면을 확인한다
    Then 각 마디 폭은 음악 내용과 최소 간격을 고려해 배치된다
    And 한 마디만 남은 마지막 system도 지나치게 짧게 쪼그라들지 않는다

  Scenario: 8분음표 이하 음표는 박자 구조에 맞게 빔으로 묶인다
    Given 8분음표와 16분음표가 섞인 단성부 악보가 열려 있다
    When 사용자가 악보 화면을 확인한다
    Then 빔은 박자 구조를 기준으로 묶인다
    And 빔은 음표 머리와 기둥을 가리지 않는다

  @discussion
  Scenario: 복잡한 박자와 리듬에서도 빔이 읽기 어렵게 무너지지 않는다
    Given 복합 박자와 짧은 음가가 섞인 단성부 악보가 열려 있다
    When 사용자가 악보 화면을 확인한다
    Then 빔은 같은 박 안의 리듬 구조를 이해할 수 있게 표시된다
    And 빔 기울기와 위치가 음표 읽기를 방해하지 않는다

  Scenario: 오선 밖 음표도 덧줄과 함께 잘리지 않는다
    Given 높은 음역과 낮은 음역의 음표가 있는 악보가 열려 있다
    When 사용자가 악보 화면을 확인한다
    Then 오선 밖 음표에는 필요한 덧줄이 표시된다
    And 음표 머리, 기둥, 덧줄은 화면이나 SVG 경계에서 잘리지 않는다

  Scenario: 선택 이벤트, 입력 커서, 재생 커서는 서로 구분되어 보인다
    Given 선택된 이벤트가 있는 악보가 열려 있다
    When 사용자가 마지막 이벤트 뒤로 이동한다
    Then 입력 커서는 선택 이벤트와 다른 시각 표현으로 표시된다
    And 사용자는 현재 상태가 선택인지 새 입력 위치인지 구분할 수 있다
    When 악보가 재생 중인 위치를 표시한다
    Then 재생 커서는 선택 이벤트와 입력 커서와 다른 시각 표현으로 표시된다

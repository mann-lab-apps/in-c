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

  Scenario: 복잡한 박자와 리듬에서도 빔이 읽기 어렵게 무너지지 않는다
    Given 복합 박자와 짧은 음가가 섞인 단성부 악보가 열려 있다
    When 사용자가 악보 화면을 확인한다
    Then 빔은 같은 박 안의 리듬 구조를 이해할 수 있게 표시된다
    And 2/4, 3/4, 4/4에서는 4분음표 박 단위로 빔이 나뉜다
    And 6/8에서는 점4분음표 박 단위로 빔이 나뉜다
    And 쉼표, 긴 음가, 시간 gap, 박 경계에서는 빔이 끊긴다
    And 같은 박 안의 점8분음표와 16분음표는 함께 빔으로 묶인다
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

  Scenario: 선택한 마디 앞에 수동 system break를 지정한다
    Given 여러 마디가 있는 단성부 악보가 열려 있다
    And 첫 마디가 아닌 마디가 선택되어 있다
    When 사용자가 시스템 나누기를 추가한다
    Then 선택한 마디는 새 system의 첫 마디로 배치된다
    And 각 system의 마지막 마디는 사용 가능한 전체 폭을 채운다
    When 사용자가 같은 마디에서 시스템 나누기를 다시 실행한다
    Then 수동 system break는 해제되고 자동 줄바꿈 규칙이 다시 적용된다

  Scenario: 선택한 마디 앞에 수동 page break를 지정한다
    Given 여러 마디가 있는 단성부 악보가 열려 있다
    And 첫 마디가 아닌 마디가 선택되어 있다
    When 사용자가 페이지 나누기를 추가한다
    Then 선택한 마디는 새 페이지의 첫 system으로 배치된다
    And 화면 렌더링은 page break를 system break보다 강한 layout hint로 취급한다
    When 사용자가 같은 마디에서 페이지 나누기를 다시 실행한다
    Then 수동 page break는 해제되고 자동 줄바꿈 규칙이 다시 적용된다

  Scenario: 선택한 마디에 리허설 마크를 입력한다
    Given 여러 마디가 있는 단성부 악보가 열려 있다
    And 마디가 선택되어 있다
    When 사용자가 리허설 마크 "A"를 입력한다
    Then 선택한 마디 위에는 박스 형태의 "A" 마크가 표시된다
    And MusicXML로 내보냈다가 다시 가져와도 리허설 마크가 유지된다

  Scenario: 선택한 마디에 스태프 텍스트를 입력한다
    Given 여러 마디가 있는 단성부 악보가 열려 있다
    And 마디가 선택되어 있다
    When 사용자가 스태프 텍스트 "dolce"를 입력한다
    Then 선택한 마디 위에는 "dolce" 텍스트가 표시된다
    And 텍스트 입력 중에는 음표 입력 단축키가 실행되지 않는다
    And MusicXML로 내보냈다가 다시 가져와도 스태프 텍스트가 유지된다

  Scenario: 선택한 마디에 다이내믹을 입력한다
    Given 여러 마디가 있는 단성부 악보가 열려 있다
    And 마디가 선택되어 있다
    When 사용자가 다이내믹 "mf"를 선택한다
    Then 선택한 마디 아래에는 "mf" 다이내믹이 표시된다
    And MusicXML로 내보냈다가 다시 가져와도 다이내믹이 유지된다

  Scenario: 선택 범위에 헤어핀을 입력한다
    Given 여러 음표가 범위로 선택되어 있다
    When 사용자가 크레셴도 헤어핀을 추가한다
    Then 선택 범위 아래에는 점점 벌어지는 헤어핀이 표시된다
    When 사용자가 디미누엔도 헤어핀을 추가한다
    Then 선택 범위 아래에는 점점 닫히는 헤어핀이 표시된다
    And 헤어핀이 system 줄바꿈을 지나면 각 system에서 이어지는 segment로 표시된다
    And MusicXML로 내보냈다가 다시 가져와도 wedge 정보가 유지된다

  Scenario: 선택한 음표에 아티큘레이션을 입력한다
    Given 음표가 선택된 단성부 악보가 열려 있다
    When 사용자가 스타카토를 켠다
    Then 선택한 음표 위에는 스타카토 점이 표시된다
    When 사용자가 악센트를 켠다
    Then 선택한 음표 위에는 악센트 표시가 함께 표시된다
    And MusicXML로 내보냈다가 다시 가져와도 아티큘레이션이 유지된다

  Scenario: 선택한 음표나 쉼표에 페르마타를 입력한다
    Given 음표 또는 쉼표가 선택된 단성부 악보가 열려 있다
    When 사용자가 페르마타를 켠다
    Then 선택한 이벤트 위에는 페르마타가 표시된다
    When 사용자가 페르마타를 다시 끈다
    Then 선택한 이벤트에서 페르마타가 제거된다
    And MusicXML로 내보냈다가 다시 가져와도 페르마타가 유지된다

  Scenario: 선택한 음표나 쉼표에 숨표와 caesura를 입력한다
    Given 음표 또는 쉼표가 선택된 단성부 악보가 열려 있다
    When 사용자가 숨표를 켠다
    Then 선택한 이벤트 위에는 숨표가 표시된다
    When 사용자가 caesura를 켠다
    Then 선택한 이벤트 위에는 caesura 표시가 표시된다
    And MusicXML로 내보냈다가 다시 가져와도 숨표와 caesura가 유지된다

  Scenario: 선택한 음표 범위에 슬러를 입력한다
    Given 여러 음표가 범위로 선택되어 있다
    When 사용자가 슬러를 추가한다
    Then 선택 범위의 첫 음표와 마지막 음표는 곡선 슬러로 연결된다
    And 슬러는 같은 음 사이의 타이와 별도 relation으로 저장된다
    And 슬러가 system 줄바꿈을 지나면 각 system에서 이어지는 곡선 segment로 표시된다
    And 겹친 슬러는 서로 다른 offset과 MusicXML number로 구분된다
    When 사용자가 같은 범위에서 슬러를 다시 실행한다
    Then 슬러는 제거된다
    And MusicXML로 내보냈다가 다시 가져와도 slur start/stop 정보가 유지된다

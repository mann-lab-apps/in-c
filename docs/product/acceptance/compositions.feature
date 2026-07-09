@site @compositions
Feature: Compositions에서 단선율 악보를 찾고 내려받기
  사용자는 공개된 단선율 악보를 둘러보고, 출처와 저작권 메모를 확인한 뒤
  PDF, MusicXML, Chromatics 열기 동선으로 이동할 수 있어야 한다.

  Scenario: 공개 악보를 필터링하고 선택한다
    Given Compositions 페이지가 열려 있다
    When 사용자가 검색어, 난이도, 태그 중 하나로 목록을 좁힌다
    Then 조건에 맞는 공개 악보만 목록에 표시된다
    And 선택한 악보의 상세 정보가 표시된다

  Scenario: 악보 상세에서 출처와 다운로드 동선을 확인한다
    Given 공개 악보가 선택되어 있다
    When 사용자가 악보 상세를 확인한다
    Then 제목, 난이도, 조성, 박자, 출처가 표시된다
    And 저작권/출처 확인 메모가 표시된다
    And PDF 다운로드, MusicXML 다운로드, Chromatics에서 열기 링크가 표시된다

  Scenario: Columns에서 관련 악보로 이동한다
    Given 관련 악보가 연결된 Columns 칼럼이 열려 있다
    When 사용자가 관련 악보 링크를 선택한다
    Then Compositions 페이지에서 해당 악보 상세로 이동한다

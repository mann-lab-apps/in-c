# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@io @musicxml @pdf @atdd-draft
Feature: 악보를 가져오고 저장하기
  사용자는 작성한 악보를 MusicXML로 주고받고, 필요하면 PDF로 변환할 수 있어야 한다.

  Scenario: MusicXML 파일을 가져온다
    Given 앱이 시작화면을 보여준다
    When 사용자가 MusicXML 가져오기를 선택한다
    And 유효한 단성부 MusicXML 파일을 선택한다
    Then 앱은 MusicXML 내용을 악보로 연다
    And 가져온 악보의 제목, 박자표, 조표, 이벤트가 표시된다

  Scenario: MusicXML 가져오기는 지원 범위 밖의 시간 이동을 조용히 해석하지 않는다
    Given MusicXML 문서에 backup 또는 forward가 포함되어 있다
    When 사용자가 MusicXML 가져오기를 선택한다
    Then 앱은 해당 파일을 가져오지 않는다
    And 사용자는 MVP에서 backup 또는 forward를 지원하지 않는다는 안내를 본다

  Scenario: MusicXML 가져오기는 마디별 attribute 변경을 시간축에 맞춰 보존한다
    Given 단일 part, 단일 staff, 단일 voice MusicXML에 마디별 박자표와 조표 변경이 있다
    When 사용자가 MusicXML 가져오기를 선택한다
    Then 각 마디의 박자표와 조표가 score-core measure에 반영된다
    And 각 이벤트의 position은 MusicXML duration 누적으로 정규화된다
    And 다시 MusicXML로 내보냈다가 가져와도 박자표, 조표, duration 의미가 유지된다

  Scenario: 작성한 악보를 MusicXML로 저장한다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 저장을 실행한다
    Then 앱은 현재 악보의 MusicXML 파일을 생성한다
    And 생성된 MusicXML은 다시 가져왔을 때 음악 의미가 유지된다

  Scenario: MusicXML 저장은 자동저장과 구분된다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 파일 작업 UI를 확인한다
    Then MusicXML 가져오기 행동과 저장 행동은 구분되어 보인다
    And 저장 행동은 MusicXML 파일 형식을 안내한다
    And 앱 내부 자동저장 또는 복구 행동과도 구분되어 보인다

  Scenario: 악보를 PDF로 변환한다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 PDF 변환을 실행한다
    Then 앱은 현재 악보의 PDF 파일을 생성한다
    And PDF 변환은 MusicXML 저장과 별도 행동으로 보인다

  @discussion
  Scenario: 악보를 이미지로 내보낸다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 이미지로 내보내기를 실행한다
    Then 앱은 화면 렌더링과 같은 layout의 PNG 파일을 생성한다
    And PDF 변환과 이미지 내보내기는 별도 행동으로 보인다
    And 기본 출력은 흰 배경과 2x 해상도를 사용한다

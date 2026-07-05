# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@io @musicxml @pdf @atdd-draft
Feature: 악보를 가져오고 내보내기
  사용자는 작성한 악보를 MusicXML로 주고받고, 필요하면 PDF로 변환할 수 있어야 한다.

  Scenario: MusicXML 파일을 가져온다
    Given 앱이 시작화면을 보여준다
    When 사용자가 MusicXML 가져오기를 선택한다
    And 유효한 단성부 MusicXML 파일을 선택한다
    Then 앱은 MusicXML 내용을 악보로 연다
    And 가져온 악보의 제목, 박자표, 조표, 이벤트가 표시된다

  Scenario: 작성한 악보를 MusicXML로 내보낸다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 MusicXML 내보내기를 실행한다
    Then 앱은 현재 악보의 MusicXML 파일을 생성한다
    And 생성된 MusicXML은 다시 가져왔을 때 음악 의미가 유지된다

  Scenario: MusicXML 가져오기와 내보내기는 저장 행동과 구분된다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 파일 작업 UI를 확인한다
    Then MusicXML 가져오기 행동과 MusicXML 내보내기 행동은 구분되어 보인다
    And 앱 내부 저장 또는 복구 행동과도 구분되어 보인다

  Scenario: 악보를 PDF로 변환한다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 PDF 변환을 실행한다
    Then 앱은 현재 악보의 PDF 파일을 생성한다
    And PDF 변환은 MusicXML 내보내기와 별도 행동으로 보인다

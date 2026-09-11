# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@io @musicxml @pdf @atdd-draft
Feature: 악보를 가져오고 저장하기
  사용자는 작성한 악보를 MusicXML로 주고받고, 필요하면 PDF로 변환할 수 있어야 한다.

  @scenario-import-export-import-valid-single-voice
  Scenario: MusicXML 파일을 가져온다
    Given 앱이 시작화면을 보여준다
    When 사용자가 MusicXML 가져오기를 선택한다
    And 유효한 단성부 MusicXML 파일을 선택한다
    Then 앱은 MusicXML 내용을 악보로 연다
    And 가져온 악보의 제목, 박자표, 조표, 이벤트가 표시된다

  @scenario-import-export-import-multi-voice
  Scenario: MusicXML 가져오기는 같은 staff의 여러 voice를 보존한다
    Given MusicXML 문서에 backup marker와 voice 1, voice 2 note stream이 포함되어 있다
    When 사용자가 MusicXML 가져오기를 선택한다
    Then 앱은 같은 staff 안에 두 개의 voice를 가진 measure로 가져온다
    And 각 voice의 이벤트 position은 해당 voice의 duration 누적으로 정규화된다
    And 다시 MusicXML로 내보낼 때 다음 voice 앞에 backup marker가 기록된다
    And 내보낸 MusicXML을 다시 가져와도 voice별 음악 내용이 유지된다

  @scenario-import-export-round-trip-grand-staff-structure
  Scenario: MusicXML 저장과 가져오기는 grand staff 구조를 보존한다
    Given 피아노 grand staff 악보가 열려 있다
    When 사용자가 MusicXML로 저장한 뒤 그 파일을 다시 가져온다
    Then 하나의 Piano part와 두 개의 staff가 유지된다
    And 높은음자리표 staff와 낮은음자리표 staff의 clef가 유지된다
    And 각 staff의 마디 수와 full-measure rest skeleton이 유지된다

  @scenario-import-export-round-trip-grand-staff-basic-events
  Scenario: MusicXML 저장과 가져오기는 grand staff의 낮은 staff 음표를 보존한다
    Given 낮은음자리표 staff에 음표가 있는 피아노 grand staff 악보가 열려 있다
    When 사용자가 MusicXML로 저장한 뒤 그 파일을 다시 가져온다
    Then 낮은음자리표 staff의 음표 pitch, duration, position이 유지된다

  @scenario-import-export-round-trip-multi-part-structure
  Scenario: MusicXML 저장과 가져오기는 multi-part 구조를 보존한다
    Given 여러 part로 구성된 앙상블 악보가 열려 있다
    When 사용자가 MusicXML로 저장한 뒤 그 파일을 다시 가져온다
    Then 각 part의 id, 이름, 약어가 유지된다
    And 각 part의 기본 staff와 clef가 유지된다

  @scenario-import-export-round-trip-multi-part-basic-events
  Scenario: MusicXML 저장과 가져오기는 part별 음표를 보존한다
    Given 여러 part 각각에 음표가 있는 앙상블 악보가 열려 있다
    When 사용자가 MusicXML로 저장한 뒤 그 파일을 다시 가져온다
    Then 각 part의 음표 pitch와 duration이 해당 part 안에 유지된다

  @scenario-import-export-unsupported-musicxml-report
  Scenario: MusicXML 가져오기는 아직 지원하지 않는 표기를 경고로 남긴다
    Given MusicXML 문서에 지원되는 음표와 아직 지원하지 않는 articulation, technical, ornament, direction이 함께 있다
    When 사용자가 MusicXML 가져오기를 선택한다
    Then 앱은 지원되는 음표를 악보로 연다
    And 지원하지 않는 표기의 measure, note, MusicXML path가 포함된 warning report를 만든다
    And 사용자는 가져오기 완료 안내에서 경고 개수와 대표 항목을 확인할 수 있다

  @scenario-import-export-export-unsupported-musicxml-report
  Scenario: MusicXML 내보내기는 보존하지 못하는 앱 전용 데이터를 경고로 남긴다
    Given MusicXML이 표현하지 못하는 앱 전용 layout 설정이 있는 악보가 열려 있다
    When 사용자가 MusicXML 저장을 실행한다
    Then 앱은 MusicXML 파일 생성을 계속 진행한다
    And 보존하지 못하는 layout path와 설명이 포함된 export warning report를 만든다
    And 사용자는 저장 완료 안내에서 내보내기 경고 개수와 대표 항목을 확인할 수 있다

  @scenario-import-export-external-app-fixture-qa
  Scenario: 외부 사보앱 호환 MusicXML fixture를 검증한다
    Given MuseScore, Finale, Sibelius, Dorico 호환 seed fixture가 준비되어 있다
    When MusicXML QA harness가 각 fixture를 가져오고 다시 내보낸다
    Then part 이름, staff 수, clef, 기본 note event, voice 구조가 기대값과 일치한다
    And 지원하지 않는 notation이나 direction은 warning report에 기록된다

  @scenario-import-export-preserve-measure-attributes
  Scenario: MusicXML 가져오기는 마디별 attribute 변경을 시간축에 맞춰 보존한다
    Given 단일 part, 단일 staff, 단일 voice MusicXML에 마디별 박자표와 조표 변경이 있다
    When 사용자가 MusicXML 가져오기를 선택한다
    Then 각 마디의 박자표와 조표가 score-core measure에 반영된다
    And 각 이벤트의 position은 MusicXML duration 누적으로 정규화된다
    And 다시 MusicXML로 내보냈다가 가져와도 박자표, 조표, duration 의미가 유지된다

  @scenario-import-export-import-pickup-measure
  Scenario: MusicXML 못갖춘마디의 실제 길이를 가져온다
    Given implicit="yes"이고 4분음표 한 개 길이인 첫 마디가 있다
    When 사용자가 MusicXML 파일을 가져온다
    Then 첫 마디는 4분음표 한 개 길이의 못갖춘마디로 해석된다
    And 첫 음표의 위치와 음높이는 유지된다
    And 못갖춘마디의 실제 길이를 기준으로 리듬이 정확하게 채워졌다고 판정한다

  @scenario-import-export-round-trip-pickup-measure
  Scenario: MusicXML로 다시 저장해도 못갖춘마디의 의미를 유지한다
    Given 4분음표 한 개 길이의 못갖춘마디가 있는 악보가 열려 있다
    When 사용자가 MusicXML로 저장한 뒤 그 파일을 다시 가져온다
    Then 첫 마디의 implicit="yes" 의미가 유지된다
    And 못갖춘마디의 길이와 첫 음표의 위치는 저장 전과 같다
    And 첫 마디가 일반 박자표의 전체 길이로 늘어나지 않는다

  @scenario-import-export-reject-invalid-pickup-measure
  Scenario: 길이가 잘못된 MusicXML 못갖춘마디를 거부한다
    Given implicit="yes"이지만 실제 길이가 0이거나 이벤트가 선언된 길이를 정확히 채우지 않는 첫 마디가 있다
    When 사용자가 MusicXML 파일을 가져온다
    Then 가져오기는 실패한다
    And 잘못된 못갖춘마디가 일반 마디로 조용히 바뀌지 않는다
    And 사용자는 못갖춘마디 길이가 올바르지 않다는 오류를 확인할 수 있다

  @scenario-import-export-round-trip-musical-meaning
  Scenario: 작성한 악보를 MusicXML로 저장한다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 저장을 실행한다
    Then 앱은 현재 악보의 MusicXML 파일을 생성한다
    And 생성된 MusicXML은 다시 가져왔을 때 음악 의미가 유지된다

  @scenario-import-export-distinguish-musicxml-save-from-autosave
  Scenario: MusicXML 저장은 자동저장과 구분된다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 파일 작업 UI를 확인한다
    Then MusicXML 가져오기 행동과 저장 행동은 구분되어 보인다
    And 저장 행동은 MusicXML 파일 형식을 안내한다
    And 앱 내부 자동저장 또는 복구 행동과도 구분되어 보인다

  @scenario-import-export-save-pdf
  Scenario: 악보를 PDF로 변환한다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 PDF 변환을 실행한다
    Then 앱은 현재 악보 제목을 바탕으로 한 PDF 파일 저장을 요청한다
    And PDF 변환은 MusicXML 저장과 별도 행동으로 보인다

  @scenario-import-export-export-midi
  Scenario: 악보를 MIDI로 내보낸다
    Given 편집 가능한 악보가 열려 있다
    When 사용자가 MIDI 내보내기를 실행한다
    Then 앱은 현재 악보 제목을 바탕으로 한 MIDI 파일 저장을 요청한다
    And 생성되는 데이터는 tempo map과 note events를 포함한 Standard MIDI File이다
    And 여러 part는 독립 MIDI track, channel, program으로 분리된다
    And MIDI 내보내기는 MusicXML 저장과 PDF 변환과 별도 행동으로 보인다

  @scenario-import-export-report-pdf-result
  Scenario: PDF 변환 결과를 확인한다
    Given 편집 가능한 단성부 악보가 열려 있다
    When PDF 저장이 성공한다
    Then 사용자는 생성된 파일명을 포함한 완료 안내를 본다
    When 사용자가 PDF 저장을 취소한다
    Then 성공 안내는 표시되지 않는다
    When PDF 저장이 실패한다
    Then 사용자는 실패 이유를 알 수 있는 오류 안내를 본다

  @discussion
  Scenario: 악보를 이미지로 내보낸다
    Given 편집 가능한 단성부 악보가 열려 있다
    When 사용자가 이미지로 내보내기를 실행한다
    Then 앱은 화면 렌더링과 같은 layout의 PNG 파일을 생성한다
    And PDF 변환과 이미지 내보내기는 별도 행동으로 보인다
    And 기본 출력은 흰 배경과 2x 해상도를 사용한다

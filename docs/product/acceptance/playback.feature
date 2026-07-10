# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@playback @atdd-draft
Feature: 작성한 악보를 재생으로 확인하기
  사용자는 악보를 저장하거나 내보내기 전에 소리로 길이와 흐름을 확인할 수 있어야
  한다.

  Background:
    Given 편집 가능한 단성부 악보가 열려 있다

  Scenario: 재생을 시작하고 정지한다
    When 사용자가 재생을 누른다
    Then 악보는 현재 템포로 재생된다
    When 사용자가 정지를 누른다
    Then 재생은 멈춘다
    And 편집 선택 상태는 예측 가능하게 유지된다

  Scenario: 재생을 일시정지하고 다시 이어 듣는다
    Given 악보가 재생 중이다
    When 사용자가 일시정지를 누른다
    Then 재생은 현재 위치에서 멈춘다
    When 사용자가 다시 재생을 누른다
    Then 악보는 멈췄던 위치에서 이어 재생된다

  Scenario: 템포를 조절하면 재생 속도가 바뀐다
    Given 템포가 120 BPM으로 설정되어 있다
    When 사용자가 템포를 90 BPM으로 낮춘다
    And 사용자가 재생을 누른다
    Then 악보는 90 BPM 기준으로 재생된다

  Scenario: 악보 전역 템포 마킹을 수정한다
    Given 단성부 악보가 열려 있다
    When 사용자가 템포를 96 BPM으로 변경한다
    Then 악보 데이터에는 "♩ = 96" 템포 마킹이 저장된다
    And 첫 system 위에는 "♩ = 96" 템포 마킹이 표시된다
    And 재생은 96 BPM 기준으로 시작된다
    And MusicXML로 내보냈다가 다시 가져와도 전역 템포가 유지된다

  @discussion
  Scenario: 다이내믹은 향후 재생 표현 데이터로 보존된다
    Given "mf" 다이내믹이 포함된 악보가 열려 있다
    When 사용자가 악보를 저장하거나 다시 불러온다
    Then 다이내믹 값은 재생 엔진이 해석할 수 있는 score 데이터로 유지된다

  Scenario: 헤어핀은 재생 velocity automation으로 반영된다
    Given crescendo 또는 diminuendo 헤어핀이 포함된 악보가 열려 있다
    When 사용자가 재생을 누른다
    Then 헤어핀 범위의 음량은 시작 dynamic 기준에서 방향에 따라 선형으로 변한다
    And 헤어핀 밖의 이벤트는 해당 마디 dynamic 기준 음량을 유지한다

  Scenario: 페르마타는 재생 길이에 반영된다
    Given 페르마타가 포함된 악보가 열려 있다
    When 사용자가 재생을 누른다
    Then 페르마타가 붙은 이벤트는 기본 길이보다 길게 재생된다
    And 뒤따르는 이벤트의 재생 시작 위치도 늘어난 길이만큼 늦춰진다

  Scenario: 타이와 셋잇단음표는 실제 재생 길이에 반영된다
    Given 타이와 셋잇단음표가 포함된 악보가 열려 있다
    When 사용자가 재생을 누른다
    Then 타이로 이어진 음은 하나의 지속음처럼 들린다
    And 셋잇단음표는 3:2 비율의 길이로 들린다

  @discussion
  Scenario: 재생 위치와 편집 선택 상태가 혼동되지 않는다
    Given 악보가 재생 중이다
    When 사용자가 재생 위치를 확인한다
    Then 사용자는 재생 중인 위치와 편집 선택 상태를 구분할 수 있다
    And 선택된 이벤트는 편집 선택 색을 유지한다
    And 재생 위치는 별도 재생 커서로 표시된다

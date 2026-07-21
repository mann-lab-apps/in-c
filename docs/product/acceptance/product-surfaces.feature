Feature: 제품 표면의 현재 상태를 구분한다
  사용자가 웹, Chromatics, Community를 현재보다 완성된 기능으로 오해하지 않도록
  지금 쓸 수 있는 기능과 실험 중인 기능의 경계를 보여준다.

  @scenario-product-surfaces-work-context
  Scenario: 작품에서 악보와 Columns를 함께 확인한다
    Given 작품에 공개 악보와 하나 이상의 Columns가 연결되어 있다
    When 사용자가 작품 맥락을 확인한다
    Then 악보와 관련 글 사이의 연결을 확인할 수 있다
    And 지원하지 않는 Community 행동은 지원 상태로 표시되지 않는다

  @scenario-product-surfaces-promotion-state
  Scenario: 공연 배너의 실험 상태를 확인한다
    Given 공연 배너가 완전히 구현되지 않았다
    When 사용자가 피쳐맵의 공연 배너 상태를 확인한다
    Then 상태는 "지원"이 아니다
    And 연결 문서에서 배너, 감상 질문, 관련 인물 기준을 확인할 수 있다

  @scenario-product-surfaces-community-state
  Scenario: Community의 공개 범위를 확인한다
    Given 독립 공개 프로필과 클래스 신청은 현재 공개 범위가 아니다
    When 사용자가 피쳐맵의 Community 상태를 확인한다
    Then 상태는 "지원"이 아니며 관계 모델 문서로 연결된다
    And 공개 프로필, 비공개 연락처, 클래스 신청은 현재 제공 기능으로 표시되지 않는다

  @scenario-product-surfaces-open-in-chromatics
  Scenario: Compositions의 편집용 원본을 Chromatics에서 연다
    Given 공개 가능한 악보에 MusicXML 원본이 있다
    When 사용자가 Open in Chromatics를 선택한다
    Then Chromatics는 편집할 수 있는 MusicXML 원본을 연다
    And PDF 변환은 악보 편집과 별도 행동으로 구분된다

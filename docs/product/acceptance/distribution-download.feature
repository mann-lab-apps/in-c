# This file is an ATDD conversation draft, not a full product guide.
# Review workflow: docs/product/acceptance/README.md

@distribution @site @atdd-draft
Feature: 배포 페이지에서 앱을 내려받기
  사용자는 소개 페이지에서 현재 prerelease 앱을 이해하고 운영체제에 맞는 파일을
  내려받을 수 있어야 한다.

  Scenario Outline: 운영체제별 다운로드 파일을 제공한다
    Given 최신 GitHub prerelease가 게시되어 있다
    When 사용자가 다운로드 페이지를 연다
    Then <platform> 다운로드 항목은 현재 prerelease 산출물을 가리킨다
    And 사용자는 파일 이름과 체크섬을 확인할 수 있다

    Examples:
      | platform  |
      | "macOS"   |
      | "Windows" |
      | "Linux"   |

  Scenario: prerelease 상태와 미서명 안내를 숨기지 않는다
    Given 다운로드 페이지가 열려 있다
    When 사용자가 현재 배포 정보를 확인한다
    Then 페이지는 현재 버전이 prerelease임을 알려준다
    And macOS와 Windows의 미서명 설치 주의사항을 확인할 수 있다

  Scenario: 다운로드 페이지의 기본 이벤트가 집계된다
    Given Google Analytics가 설정된 다운로드 페이지가 열려 있다
    When 사용자가 GitHub 링크나 다운로드 링크를 누른다
    Then 기본 페이지 조회와 링크 클릭 이벤트가 전송된다

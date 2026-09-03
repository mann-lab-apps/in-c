# in C Public V1 Store Metadata Draft

이 문서는 App Store Connect와 Play Console에 옮기기 전의 Public V1 제출 문구 초안이다.
실제 제출 전에는 스토어별 길이 제한, 스크린샷, privacy label, support URL을 다시 확인한다.

## Identity

- App name: in C
- Subtitle: 오늘 하나씩 여는 클래식
- Version: 1.0.0+14 RC
- Android Public V1 applicationId: `com.mannlab.clef`
- iOS Public V1 bundle id: `com.mannlab.inc.clef`
- Standalone in C applicationId/bundle id: deferred to V1.1 migration review
- Support contact placeholder: `support@mannlab.app`

Public V1은 기존 Clef lineage applicationId/bundle id를 유지하고, 사용자-facing display name, icon,
store copy, 직접 진입 build flag를 `in C`로 고정한다. 독립 `com.mannlab.inc` applicationId/bundle id는
signing, migration, store listing 영향 검토 후 V1.1에서 분리한다.

## Short Description

작품 중심으로 클래식을 발견하고 듣기와 공연으로 이어집니다.

## Full Description Draft

in C는 클래식 음원을 직접 제공하지 않고, 오늘 들어볼 작품을 고른 뒤 YouTube, Spotify,
Apple Music, Melon 같은 외부 플랫폼으로 이어주는 클래식 디스커버리 앱입니다.

작품, 작곡가, 악기, 시대, 분위기, 공연 정보를 따라 다음 작품을 찾고 My Music에 저장해 다시 들을
루틴을 만들 수 있습니다. 처음 듣는 사람도 30초 포인트와 짧은 감상 문장으로 시작하고, 익숙해진
작품은 비슷한 작품과 실제 공연으로 이어집니다.

## Keywords

- classical music
- 클래식
- 작곡가
- 공연
- 음악추천
- 오케스트라

## Screenshot Candidates

- Today
- Work Detail
- Discover
- My Music
- Concerts

Catalog Ops, fake direct link, fake preview URL, 내부 운영 용어, funnel/surface/CTA 같은 제품 용어는
스토어 스크린샷에 노출하지 않는다.

## Public Copy Gate

스토어 제출 문구와 일반 사용자 화면에서는 다음 표현을 사용하지 않는다.

- CTA
- surface
- funnel
- Catalog Ops
- fake direct link
- fake preview URL
- internal ops

운영 화면에서는 필요한 용어를 유지할 수 있지만, 스토어 스크린샷 후보와 첫 사용자 flow에는 노출하지 않는다.

## Privacy Summary

- 음원 파일을 host/cache/download하지 않는다.
- 전체 듣기는 외부 플랫폼 link-out으로 처리한다.
- 비로그인 사용자는 local-first 상태 저장을 기본으로 한다.
- 광고주는 개인 raw event가 아니라 aggregate report만 확인한다.
- preview URL은 provider 허용 범위가 확인된 경우에만 사용한다.

## Remaining Verification

- App Store Connect / Play Console 문구 길이와 금칙 표현 검토
- 실제 기기 스크린샷 캡처
- Android install smoke
- TestFlight / Internal Test 업로드 가능 여부 확인

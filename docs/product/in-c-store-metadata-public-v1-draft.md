# in C Public V1 Store Metadata Draft

이 문서는 App Store Connect와 Play Console에 옮기기 전의 Public V1 제출 문구 초안이다.
실제 제출 전에는 스토어별 길이 제한, 스크린샷, privacy label, support URL을 다시 확인한다.

## Identity

- App name: in C
- Subtitle: 오늘 하나씩 여는 클래식
- Version: 1.0.0+14 RC
- Android Public V1 applicationId: `com.mannlab.inc`
- iOS Public V1 bundle id: `com.mannlab.inc.clef`
- Android package requirement: Play Console expects `com.mannlab.inc`
- Support contact placeholder: `support@mannlab.app`
- Category: Music / Entertainment
- Age rating assumption: 4+ / Everyone. in C does not host audio, does not include public posting, and does not expose user-generated public content.
- Permission summary: external link-out and local-first preferences only for in C discovery; no microphone, camera, or location permission is required by this surface.

Public V1 Android build는 Play Console에 등록된 `com.mannlab.inc` package name을 사용한다. 사용자-facing
display name, icon, store copy, 직접 진입 build flag는 `in C`로 고정한다. iOS bundle id는 현재
`com.mannlab.inc.clef`로 남아 있으며 TestFlight signing/provisioning 정리 후 별도 확인한다.

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

## Captured Screenshot Evidence

Android emulator `emulator-5554` / Android 15 / 2560x1600에서 다음 후보를 캡처했다.

- `apps/in_c_sheet/build/store-screenshot-android-today.png`
- `apps/in_c_sheet/build/store-screenshot-android-work-detail.png`
- `apps/in_c_sheet/build/store-screenshot-android-discover.png`
- `apps/in_c_sheet/build/store-screenshot-android-my-music.png`
- `apps/in_c_sheet/build/store-screenshot-android-concerts.png`
- `apps/in_c_sheet/build/store-screenshot-android-preview.png`

Link-out smoke evidence:

- `apps/in_c_sheet/build/store-screenshot-android-linkout.png`

Chrome이 초기 설정 화면을 표시했지만, 앱의 외부 link-out 자체는 crash 없이 provider search fallback을 외부
브라우저로 전달했다. 실제 검색 결과 도달 여부는 테스트 기기의 외부 앱 초기 설정 상태에 의존한다.

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
- 실제 스토어 제출용 device frame/locale별 스크린샷 export
- TestFlight / Internal Test 업로드 가능 여부 확인

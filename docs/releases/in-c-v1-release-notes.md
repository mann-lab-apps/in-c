# in C V1 Release Notes Draft

## Positioning

in C는 클래식 음원을 직접 제공하는 스트리밍 앱이 아니라, 오늘 들을 작품을 고르고 외부 플랫폼에서 전체 듣기로 이어지는 작품 중심 클래식 디스커버리 앱이다.

## Included In V1

- Today의 첫 행동은 "오늘의 한 곡" Daily Pick이며, 30초 listening moment가 primary action이다.
- Daily Pick은 같은 날짜 안에서 안정적으로 유지되고, 날짜가 바뀌면 새 추천으로 넘어간다.
- 추천 거리는 아주 가까움, 한 걸음 확장, 의외의 우회로, 다시 들어볼 때로 구분한다.
- 첫 3일은 가까운 추천 중심으로 신뢰를 만들고, 4-7일 사이 surprise는 최대 1회만 허용한다.
- `아직 모르겠음` reaction 직후에는 surprise 대신 recovery pick으로 낮춰 잡는다.
- iOS local notification MethodChannel bridge로 Daily Pick 알림 권한 요청, 예약, 취소, 알림 탭 오픈 이벤트를 기록한다.
- Today에서 오늘의 작품과 30초/3분 listening guide를 제공한다.
- YouTube, Spotify, Apple Music, Melon 등 외부 플랫폼 검색 또는 검증된 link-out으로 전체 듣기를 연다.
- 작품 저장, reaction, repeat due를 기반으로 My Music에서 다시 들을 루틴을 만든다.
- Work Detail에서 작곡가, 시대, 편성, 작품 번호, 악장/구간, 관련 작품을 보여준다.
- Discover에서 작곡가, 악기, mood, 공연 전 context로 다음 작품을 추천한다.
- Concerts에서 작품/작곡가/악기/지역 기반 공연과 sponsored 공연 card를 보여준다.
- Promotion reporting은 impression, click, save, dismiss, ticket click을 aggregate metric으로 계산한다.
- Catalog Ops에서 Soft Launch readiness와 Public V1 Closeout evidence를 분리해 본다.
- 앱 안에서 남긴 feedback을 `feedback_submit` event로 저장하고, Launch Feedback summary에서 category/blocker를 확인한다.

## Excluded From V1

- 저작권 있는 음원 host/cache/download
- 검증되지 않은 provider direct link
- 검증되지 않은 provider preview URL
- Apple Music Classical 전용 deep link
- KOPIS API key 없는 production remote import
- remote push/APNs 서버 운영
- 광고주에게 개인 raw event 제공

## Release Candidate Rule

Public V1 release-ready YES는 Catalog Ops의 Public V1 Closeout evidence 기준으로만 판단한다. Soft Launch friendly users YES는 공개 V1 READY와 다르다.

## Remaining GAP Categories

- content ops GAP: direct link 검수 미완료, 공연 match 부족, backfill copy review 부족
- production verification GAP: store metadata, screenshot capture, signing/provisioning, release build smoke
- legal review GAP: preview URL 허용 범위, sponsored disclosure 최종 확인
- product quality GAP: 첫 3분 funnel, founder first exposure copy, My Music retention, feedback 반복 이슈

## Current Identity Note

현재 Android/iOS 표시 이름은 `in C`이고 first-pass launcher icon이 적용되어 있다. Public V1 Android build는
Play Console package requirement인 `com.mannlab.inc`를 사용하고, 사용자-facing 앱 이름, 아이콘, store copy,
직접 진입 build flag를 `in C`로 고정한다. iOS bundle id는 signing/provisioning 정리 후 별도 확인한다.

## 2026-09-02 Build Note

in C 직접 진입 QA build는 `--dart-define=IN_C_DISCOVERY_HOME=true`를 사용한다. Android debug/release APK,
release install smoke, Android AAB, iOS no-codesign build, iOS simulator install/launch smoke가 통과했다.
TestFlight upload는 signing/provisioning GAP으로 남아 있다.

## 2026-09-03 RC Note

Store metadata 초안은 `docs/product/in-c-store-metadata-public-v1-draft.md`에 고정한다. Catalog Ops는
app identity decision, store metadata, build/install QA를 별도 release gate로 보여준다.
Android App Bundle과 Android install smoke는 통과했다. iOS TestFlight upload는 아직 Public V1 제출 전 확인해야 한다.

## 2026-09-03 Public V1 Closeout Note

Catalog Ops Closeout에는 남은 GAP의 priority, owner, next action, evidence requirement가 표시된다. 공개
copy는 CTA/surface/funnel/Catalog Ops/fake URL 같은 내부 용어가 store-facing 문구에 섞이지 않는지 별도
gate로 확인한다.

Android install smoke는 direct emulator launch 후 PASS다. `emulator-5554` Android 15에서 release APK
install과 `com.mannlab.inc/.MainActivity` launch가 성공했고, Today, Preview, external link-out, Work
Detail, Discover, My Music, Concerts screenshot evidence를 `apps/in_c_sheet/build/` 아래에 남겼다.

`flutter build ipa --dart-define=IN_C_DISCOVERY_HOME=true`는 archive 단계까지 진행된 뒤 codesign에서 실패했다.
Provisioning profile `Clef`가 현재 Apple Distribution certificate를 포함하지 않아 TestFlight upload는
계속 signing/provisioning GAP이다.

## 2026-09-07 Founder Test And Artifact Policy Note

Catalog Ops에 Founder Test Mode 관찰표를 둔다. 첫 1분 Daily 30초 클릭, 추천 이유 납득, 전체 듣기,
저장 또는 reaction, 감상지도 이해, 다음날 재방문 이유를 5명 기준으로 확인하며 3명 이상 통과해야
Public V1 후보로 본다.

HTTP/HTTPS 음악 검색 fallback은 in-app WebView로 열고, custom scheme/direct app link와 ticket은 외부 앱으로
넘긴다. `external_platform_click` event에는 provider, link type, fallback 여부, surface를 남긴다.

AAB/APK 산출물은 repository에 커밋하지 않는다. 로컬 `releases/`와 `apps/*/releases/`는 보관/업로드용이며,
실제 배포 파일은 GitHub Release 또는 스토어 업로드 흐름에서 관리한다.

## 2026-09-07 Discovery Impact Note

in C의 첫 경험을 `좋아하는 음악 -> 감상 시작점 -> 오늘 30초 -> 귀 트임 -> Next Three`로 강화한다.
온보딩 보상은 입력을 감상 언어로 바꾸고, 10초 귀 트임은 정답 없이 내가 먼저 들은 단서만 감상지도에 남긴다.
`클래식 빨리 맞추기`는 별도 앱 후보로 두며 in C 본체에는 점수/랭킹/속도 경쟁을 넣지 않는다.

Catalog Ops에는 First-Use Wow Gate를 추가한다. 5명 중 4명 이상이 첫 추천의 개인화감을 납득하고,
3명 이상이 취향 연결감과 다음날 재방문 이유를 말해야 Public V1 후보로 본다.

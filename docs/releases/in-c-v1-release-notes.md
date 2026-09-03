# in C V1 Release Notes Draft

## Positioning

in C는 클래식 음원을 직접 제공하는 스트리밍 앱이 아니라, 오늘 들을 작품을 고르고 외부 플랫폼에서 전체 듣기로 이어지는 작품 중심 클래식 디스커버리 앱이다.

## Included In V1

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
- 광고주에게 개인 raw event 제공

## Release Candidate Rule

Public V1 release-ready YES는 Catalog Ops의 Public V1 Closeout evidence 기준으로만 판단한다. Soft Launch friendly users YES는 공개 V1 READY와 다르다.

## Remaining GAP Categories

- content ops GAP: direct link 검수 미완료, 공연 match 부족, backfill copy review 부족
- production verification GAP: app identity, store metadata, signing/provisioning, release build smoke
- legal review GAP: preview URL 허용 범위, sponsored disclosure 최종 확인
- product quality GAP: 첫 3분 funnel, founder first exposure copy, My Music retention, feedback 반복 이슈

## Current Identity Note

현재 Android/iOS 표시 이름은 `in C`이고 first-pass launcher icon이 적용되어 있다. Flutter shell은 아직 Clef 계열 applicationId/bundle id를 사용하므로, Public V1 제출 전 Android applicationId, iOS bundle id, store metadata, 최종 아이콘 device review를 production verification으로 잠가야 한다.

## 2026-09-02 Build Note

in C 직접 진입 QA build는 `--dart-define=IN_C_DISCOVERY_HOME=true`를 사용한다. Android debug/release APK와 iOS no-codesign build는 통과했고, iOS simulator install/launch smoke도 통과했다. Android install smoke는 로컬 AVD가 `adb devices`에 붙지 않아 아직 실행하지 못했다.

## 2026-09-03 RC Note

Store metadata 초안은 `docs/product/in-c-store-metadata-public-v1-draft.md`에 고정한다. Catalog Ops는
app identity, store metadata, build/install QA를 별도 production verification GAP으로 보여준다.
Android App Bundle은 통과했다. Android install smoke와 iOS TestFlight upload는 아직 Public V1 제출 전 확인해야 한다.

# in C V1 QA Plan

## Smoke Flow

1. 앱을 처음 실행하고 "좋아하는 음악에서 시작" onboarding sheet가 뜨는지 확인한다.
2. 좋아하는 곡/작곡가/OST/분위기를 1-3개 입력하거나 건너뛴다.
3. 입력 직후 onboarding 안에서 오늘의 한 곡 후보와 다음 세 작품이 즉시 보이는지 확인한다.
4. Today 첫 화면에서 `오늘의 한 곡` Daily Pick과 30초 primary action이 가장 먼저 보이는지 확인한다.
5. Daily step의 30초 point를 열고 reaction 또는 전체 듣기 link-out을 실행한다.
6. 오늘 완료 상태가 생기고 방금 잡은 포인트와 감상지도 변화가 보이는지 확인한다.
7. Next Three가 바로 맞을 작품 / 한 걸음 확장 / 나중에 열릴 작품으로 보이는지 확인한다.
8. Work Detail로 이동해 작품 여권, 감상지도에서의 역할, 공연장에서 들을 포인트, metadata, 추천 shelf를 확인한다.
9. My Music에서 내 감상지도, 열린 길, 다시 알아본 길, 내 곡이 된 작품, 다음 길, reminder preference, 내 클래식 연대기, saved-but-unopened queue, Taste Map을 확인한다.
10. Preview 첫 화면에서 `공연 전 10분`과 프로그램 붙여넣기 action이 보조 행동으로 보이는지 확인한다.
11. 실제 공연 프로그램 텍스트를 붙여넣고 match candidate가 나타나는지 확인한다.
   - high/medium confidence 후보는 route 후보로 보인다.
   - low confidence 후보는 자동 route에 들어가지 않는다.
   - unmatched line은 숨겨지지 않는다.
12. 10분 프리뷰 route를 만들고 route 안의 첫 30초 point를 연다.
   - `악기가 궁금함` reaction 후 Discover에 해당 편성 기반 shelf가 생기는지 확인한다.
   - direct link가 없거나 실패한 경우 provider 검색 fallback이 열리고 이벤트에 `fallback`이 기록되는지 확인한다.
13. 추천 작품을 열고 recommendation click event가 쌓이는지 확인한다.
14. Concerts에서 관련 공연, sponsored label, 예매처 link-out을 확인한다.
15. Concert Detail에서 10분 프리뷰 생성과 공연 후 30초 회고 저장을 확인한다.
16. promotion card를 save/dismiss하고 우선순위가 낮아지는지 확인한다.
17. 의견 보내기에서 link issue/product quality/crash blocker 의견을 남기고 Catalog Ops Launch Feedback에 집계되는지 확인한다.
18. Catalog Ops의 Founder Test Mode 관찰표를 기준으로 5명 테스트를 기록한다.
19. 5명 Founder Quality 결과를 `feedback_submit` evidence로 넣었을 때 Catalog Ops gate가 YES/NO를 정확히 계산하는지 확인한다.
20. 7일 Daily Pick 시뮬레이션에서 첫 3일은 가까운 추천, 4-7일 중 surprise 최대 1회, `아직 모르겠음` 직후 recovery 추천이 유지되는지 확인한다.
21. iOS local notification permission, schedule, cancel, notification open event가 기록되는지 확인한다.

## Catalog QA

- Catalog Ops 화면에서 error count가 0인지 확인한다.
- Soft Launch friendly users YES와 Public V1 release-ready YES가 분리되어 보이는지 확인한다.
- Public V1 Closeout evidence export만 보고 release-ready YES/NO 이유를 설명할 수 있는지 확인한다.
- App Identity 섹션에서 app name, Android applicationId, iOS bundle id, version, icon/privacy 상태와
  Public V1 identity decision이 보이는지 확인한다.
- Public V1 Android applicationId가 Play Console 요구사항인 `com.mannlab.inc`와 일치하는지 확인한다.
- Launch Feedback 섹션에서 `feedback_submit` category별 count, priority, export text가 보이는지 확인한다.
- release catalog count가 300개 미만이면 content ops GAP으로 남고 Public V1 READY가 되지 않아야 한다.
- listening moment 부족, 외부 link 부족, 악보 link 부족 값이 0인지 확인한다.
- program match 값이 expected program items와 같은지 확인한다.
- preview link coverage는 raw URL 보유와 founder 30 approved preview를 분리해서 확인한다.
- direct link는 verified 상태만 direct로 계산하고, 검색 fallback은 별도 count로 본다.
- KOPIS Production 섹션에서 fixture ready, remote disabled, missing key, field mapping gap이 구분되는지 확인한다.
- Public V1 Closeout의 미통과 gate가 priority, owner, next action, evidence requirement를 함께 보여주는지 확인한다.
- Public Copy 섹션에서 사용자-facing copy가 CTA/surface/funnel/Catalog Ops/fake URL 같은 내부 용어를 포함하지 않는지 확인한다.
- Listening Map 지표에서 founder map coverage, orphan node, broken prerequisite, beginner path coverage가 보이는지 확인한다.
- Founder Test Mode 섹션에서 첫 1분 행동, 추천 이유 납득, 전체 듣기, reaction, 감상지도 이해, 재방문 이유 관찰 항목이 보이는지 확인한다.

## Store And Build QA

- app name, applicationId/bundle id, version, icon, privacy copy, permission summary가 확인 가능한지 본다.
- current display name은 Android/iOS 모두 `in C`로 보이는지 확인한다.
- first-pass launcher icon이 Android/iOS 홈 화면과 앱 전환 화면에서 흐리거나 과하게 복잡하지 않은지 확인한다.
- in C 직접 진입 QA build는 `--dart-define=IN_C_DISCOVERY_HOME=true`를 사용한다.
- 현재 shell의 Android applicationId는 `com.mannlab.inc`, iOS bundle id는 `com.mannlab.inc.clef`이다.
- Android debug build smoke를 실행한다.
- Android release build와 iOS no-codesign build를 실행한다.
- Play Console 준비 전 Android App Bundle build를 실행한다.
- AAB/APK 같은 빌드 산출물은 repo에 커밋하지 않고 `releases/` 또는 `apps/*/releases/` 로컬 보관 후 GitHub Release/스토어 업로드에만 사용한다.
- signing/provisioning 문제는 code blocker가 아니라 production verification GAP으로 분리한다.
- 2026-09-02 기준 Android debug/release APK와 iOS no-codesign build는 PASS다.
- 2026-09-02 기준 iOS simulator install/launch smoke는 PASS다.
- 2026-09-02 기준 Android install smoke는 로컬 AVD가 `adb devices`에 붙지 않아 NOT RUN이다.
- 2026-09-03 기준 Store Metadata 초안은 `docs/product/in-c-store-metadata-public-v1-draft.md`에 둔다.
- 2026-09-03 기준 Android debug/release APK, Android App Bundle, iOS no-codesign, iOS simulator
  install/launch smoke는 PASS다.
- 2026-09-03 기준 Android install smoke는 direct emulator launch 후 PASS다.
  - device: `emulator-5554`
  - OS: Android 15
  - install: `adb install -r build/app/outputs/flutter-apk/app-release.apk` PASS
  - launch: `adb shell am start -n com.mannlab.inc/.MainActivity` PASS
  - captured: Today, Work Detail, Discover, My Music, Concerts, Preview, external link-out
- 2026-09-03 기준 external link-out은 Chrome first-run setup 화면까지 열렸고 앱 crash는 없었다. 실제 검색
  결과 도달은 테스트 기기의 외부 앱 초기 설정 상태에 의존한다.
- 2026-09-03 기준 `flutter build ipa --dart-define=IN_C_DISCOVERY_HOME=true`는 archive 후 codesign에서
  실패했다. Provisioning profile `Clef`에 현재 Apple Distribution certificate가 포함되어 있지 않다.

## Regression

- Clef library import, PDF opening, score detail, practice bridge가 깨지지 않았는지 확인한다.
- in C shell이 Clef 기본 앱 진입을 막지 않는지 확인한다.
- local 저장 상태가 앱 재시작 후 유지되는지 확인한다.
- preview route와 post-concert reflection이 앱 재시작 후 유지되는지 확인한다.
- 외부 플랫폼 link-out 실패 시 앱이 crash하지 않는지 확인한다.
- sponsored 공연 card가 첫 listening CTA보다 아래에 있고, click event 후 Concert Detail로 이어지는지 확인한다.

## Automated Coverage

- seed catalog count and validation
- Public V1 release-ready YES/NO condition
- founder first exposure pool lock
- approved-only direct link apply
- approved-only preview coverage
- search fallback is not direct
- KOPIS disabled/missing key safe state
- KOPIS production status summary
- ConcertProgramMatcher low confidence candidates
- launch week analytics summary
- feedback classification
- feedback sheet submit and Catalog Ops summary
- app identity readiness summary
- public copy smell check
- founder quality gate: 5 users / 3 comeback reasons
- first-use wow gate: 5 users / 4 personal recommendation acceptance
- Public V1 GAP action priority/owner/evidence summary
- search alias and catalog number matching
- taste intake free text and shorthand matching
- taste translation start point / listen-for / next direction
- taste axis score generation
- listening level snapshot generation
- daily listening step founder fallback, saved-unopened priority, unsure recovery
- ear-opening answer event and listening map clue
- daily completion after reaction, full listen, or moment complete
- gentle continuity summary weekly count and recovery copy
- Next Three immediate/stretch/later lanes
- work passport stamp derivation
- My Music listening coordinate and timeline rendering
- ConcertPreviewRoute creation from seeded concert
- Program paste preview candidates and low confidence exclusion
- saved-but-unopened queue
- post-concert reflection persistence
- Taste Map sparse fallback and update after reaction/reflection
- preferred platform sorting and metadata-rich search links
- external platform click properties: provider, link type, fallback, URL
- preview open/play/pause/error event logging
- save/reaction/repeat due persistence
- instrument curiosity reaction shelf
- recommendation shelf generation
- KOPIS fixture parser and program matcher
- promotion reporting and dismiss priority
- sponsored card click-through to Concert Detail
- local-first persistence and sync merge fallback

## Release Risks

- 실제 KOPIS API 연동은 API key, rate limit, 필드 mapping을 운영 환경에서 확인해야 한다.
- 실제 preview playback은 플랫폼별 native channel 구현과 provider preview URL 정책 검증이 필요하다.
- 공연 광고 집행 전에는 sponsor disclosure 문구와 광고 심의 기준을 별도 확인한다.
- Apple Music Classical 전용 direct/deep link는 공식 경로가 검증되기 전까지 Apple Music 또는 web search fallback으로 둔다.

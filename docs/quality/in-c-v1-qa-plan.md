# in C V1 QA Plan

## Smoke Flow

1. 앱을 처음 실행하고 onboarding sheet가 뜨는지 확인한다.
2. 관심 mood, context, 악기, 선호 플랫폼, 지역을 선택한다.
3. Today에서 30초 포인트 보기 guide sheet를 연다.
4. 저장, reaction, 전체 듣기 link-out을 실행한다.
   - `악기가 궁금함` reaction 후 Discover에 해당 편성 기반 shelf가 생기는지 확인한다.
   - direct link가 없거나 실패한 경우 provider 검색 fallback이 열리고 이벤트에 `fallback`이 기록되는지 확인한다.
5. Work Detail로 이동해 metadata와 추천 shelf를 확인한다.
6. 추천 작품을 열고 recommendation click event가 쌓이는지 확인한다.
7. My Music에서 저장 작품과 reaction history를 확인한다.
8. Today 또는 Work Detail의 sponsored 공연 card를 열어 Concert Detail과 프로그램 작품 이동을 확인한다.
9. Concerts에서 관련 공연, sponsored label, 예매처 link-out을 확인한다.
10. promotion card를 save/dismiss하고 우선순위가 낮아지는지 확인한다.
11. 의견 보내기에서 link issue/product quality/crash blocker 의견을 남기고 Catalog Ops Launch Feedback에 집계되는지 확인한다.

## Catalog QA

- Catalog Ops 화면에서 error count가 0인지 확인한다.
- Soft Launch friendly users YES와 Public V1 release-ready YES가 분리되어 보이는지 확인한다.
- Public V1 Closeout evidence export만 보고 release-ready YES/NO 이유를 설명할 수 있는지 확인한다.
- App Identity 섹션에서 app name, Android applicationId, iOS bundle id, version, icon/privacy 상태와 production GAP이 보이는지 확인한다.
- App Identity 섹션에서 current와 target이 분리되어 보이고, current가 Clef 계열이면 release-ready가 NO인지 확인한다.
- Launch Feedback 섹션에서 `feedback_submit` category별 count, priority, export text가 보이는지 확인한다.
- release catalog count가 300개 미만이면 content ops GAP으로 남고 Public V1 READY가 되지 않아야 한다.
- listening moment 부족, 외부 link 부족, 악보 link 부족 값이 0인지 확인한다.
- program match 값이 expected program items와 같은지 확인한다.
- preview link coverage는 raw URL 보유와 founder 30 approved preview를 분리해서 확인한다.
- direct link는 verified 상태만 direct로 계산하고, 검색 fallback은 별도 count로 본다.
- KOPIS Production 섹션에서 fixture ready, remote disabled, missing key, field mapping gap이 구분되는지 확인한다.

## Store And Build QA

- app name, applicationId/bundle id, version, icon, privacy copy, permission summary가 확인 가능한지 본다.
- current display name은 Android/iOS 모두 `in C`로 보이는지 확인한다.
- first-pass launcher icon이 Android/iOS 홈 화면과 앱 전환 화면에서 흐리거나 과하게 복잡하지 않은지 확인한다.
- in C 직접 진입 QA build는 `--dart-define=IN_C_DISCOVERY_HOME=true`를 사용한다.
- 현재 shell의 Android applicationId는 `com.mannlab.clef`, iOS bundle id는 `com.mannlab.inc.clef`이므로 Public V1 제출 전 production verification GAP으로 남긴다.
- Android debug build smoke를 실행한다.
- 가능하면 Android release build와 iOS no-codesign build를 실행한다.
- signing/provisioning 문제는 code blocker가 아니라 production verification GAP으로 분리한다.
- 2026-09-02 기준 Android debug/release APK와 iOS no-codesign build는 PASS다.
- 2026-09-02 기준 iOS simulator install/launch smoke는 PASS다.
- 2026-09-02 기준 Android install smoke는 로컬 AVD가 `adb devices`에 붙지 않아 NOT RUN이다.

## Regression

- Clef library import, PDF opening, score detail, practice bridge가 깨지지 않았는지 확인한다.
- in C shell이 Clef 기본 앱 진입을 막지 않는지 확인한다.
- local 저장 상태가 앱 재시작 후 유지되는지 확인한다.
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
- search alias and catalog number matching
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

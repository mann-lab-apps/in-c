# in C V1 QA Plan

## TestFlight Candidate Freeze: 2026-09-15

Latest first-listen regression: delay local event storage, tap YouTube, and assert launch occurs
before save finishes. Fail storage, verify the warning and same event ID after retry;
listening completion must remain absent. Rejected logging must not trigger provider fallback.
Link7/full1135/analyze/format11/native10 PASS; channel mocks do not verify provider playback.

[Candidate scope, blockers and device checklist](../releases/in-c-testflight-internal-test-candidate.md)
supersede historical shipping claims. Full1132/analyze PASS after a reproduced first-three
composer-concentration defect. The new candidate test proves repeatable simulation/no writes,
known-favorite exclusion, sparse connected fallback and same-day pin survival, not satisfaction.
Do not install the current unsigned archive: it uses Clef's ID and name. Signing identities
exist, but independent in C configuration and App Store Connect checks require owner input.
Actual recording playback/region/window, physical warm/cold notification taps and VoiceOver
remain unverified. Freeze feature work; collect only first-use blockers and test-session feedback.
User evaluation has no mandatory multi-day quota: song fit, listening friction, next-pick trust.

## Current Continuation: 2026-09-15

- [Current evidence](in-c-expanded-v1-evidence-2026-09-15.md) supersedes the historical counts below.
- Onboarding: broad Dvorak Symphony9 input stays verbatim in translation and chips; the candidate
  guide/reason uses the actual selected work. Puccini with only unrelated Mozart candidates must
  not promise familiar melody. Draft preview cannot overwrite saved inputs.
- Unknown titles Lost Stars/Ghost/Interstellar OST/나의 기록/색연필 must not create taste axes,
  matched Next Three lanes or map evidence from title substrings. Explicit listening descriptors
  and all four quick intake choices still work. Unrecognized sentences remain honestly unclassified.
- Reopen stored intake against an empty catalog: no translation and no crash. Excluded anchors
  must not return as a fallback guide when other candidates have already been heard.
- Old unknown-title proximity: withdraw unsupported distance copy while preserving pick identity,
  listening/save/raw input and both stale merge orders. Actual founder quality remains unanswered.
- New isolated simulator64D3F002-45AC-4980-B2AE-D6C5AE6497C3: provisional foreground delivery
  and screenshot evidence are separate from physical permission choice, background banner/tap,
  VoiceOver and actual audio. See dated evidence for the exact code stage covered.

## Current Continuation: 2026-09-14

- My Music -> 추천에서 제외: 한국어/원어 작곡가 검색, 체크/해제, 재열기, 저장 실패 안내/다시 저장을 검증한다. 제외해도 검색·직접 열기·저장·감상 이력은 남고, 새 Daily/Discover/작품 추천에는 나오지 않아야 한다. 현재 당일 pin은 유지한다.
- 모든 작곡가 제외 시 임의로 제외 작품을 fallback하지 않는다. 추천 없음 상태에서 검색과 설정 복귀가 가능해야 한다. 잘못된 제외 JSON은 조용히 무시하지 않고 백업 복구/오류로 처리한다.
- 같은 시각에 제외 후 해제하고 시계를 뒤로 돌려 플랫폼/알림 등 설정을 바꾼다. 예전 제외 snapshot과 양방향 병합해도 해제가 되살아나지 않아야 한다. 이는 remote 검증이 아니다.

- [Current evidence](in-c-expanded-v1-evidence-2026-09-14.md) supersedes older counts/SKIP states below.
- Search failure must recover as well as direct-link failure. Test failed preferred search,
  same-provider direct fallback, total failure/copy query and leaving during delayed failure.
  No intermediate error after successful fallback, no unbounded provider chain, no fake listens.
- Automatic whole-symphony input must not become a claimed favorite movement in Daily reasons.
  With multiple inputs, use a supported closer source; do not claim this proves recommendation value.
- Load a legacy pin with the old favorite-movement assertion: withdraw that unsupported reason,
  retain work/moment/date/completion/save/events, persist, reopen and merge an old snapshot in
  both orders. Today's resolved reason and yesterday's history must not resurrect the assertion.
- On a NEW dedicated simulator named `in C Isolated QA...`, use BOTH
  `IN_C_SIMULATOR_QA=true` and `IN_C_ISOLATED_NOTIFICATION_QA=true` with the existing native target.
  Provisional OS authorization enables real pending/cancel and next-minute foreground delivery
  checks. Full permission choice, background banner, tap and physical-device delivery are separate.
  Never enable this permission helper on a user's existing device or infer consent from provisional.

## Expanded V1 Audit: 2026-09-13

- 내 기록 관리: JSON 확인/복사, 삭제 취소, 확인 후 in C 주 기록/내부 백업 삭제와 재열기를 검증한다. Clef 키는 유지돼야 한다. OS/외부/복사한 백업은 대상이 아니다.
- 삭제 중단 마커, 잘못된 마커, 오래된 저장/병합, 뒤로 간 시계, 같은 키의 동시 store, 알림 취소 실패/늦은 탭을 검증한다. 삭제 후 새 기록은 정상 저장돼야 한다.

- My Music -> 음악 연결 확인: legacy 원문/연결 확인, 검색으로 선택, 연결 해제, 재열기를 검증한다. 해제 후 원문은 남지만 해당 입력의 작품/작곡가/축 근거는 없어야 한다. 저장·실제 반응은 유지한다.
- 동일 시각 선택/해제 충돌은 해제 우선이며 오래된 snapshot과 양방향/3방향 반복 병합해도 되살아나지 않아야 한다. 쓰기 실패를 노출하고 재시도 후 보존을 확인한다.
- 취향 수정 당일은 작품과 감상 기록을 유지하고 기존 추천 이유를 수정 안내로 바꾼다. Next Three와 다음날 Daily는 수정된 데이터로 만든다.

- Current automated checks additionally cover empty/unreviewed/missing-moment catalogs, sparse open_start, unknown intake preview, concert-unsave merge/reload, equal-clock preference/work conflicts, bounded observations, Tab/Enter/Escape and iOS tap/label guidelines.
- Catalog-revision regression now covers removed/unreviewed/invalid/missing moments, preserved history, explained replacement, stale merge, notification route and next day. Native VoiceOver, real provider playback and notification delivery are not inferred from these tests.
- Enter `비발디 봄`, `봄 비발디`, `Vivaldi Spring`, `드뷔시 달빛`: matched work should be specific; `비발디` alone must remain composer evidence, not an invented favorite piece.
- Merge conflicting same-ID input/reflection/reaction/events in both orders and repeatedly. Conflicted feedback must not certify founder/five-user approval. Local and merge history limits must agree.
- Merge three equal-time work snapshots in both associations: accumulating listening dates must not change the selected reaction revision.
- Remove/corrupt only a test primary key while preserving its backup: recover with an explicit warning. Invalid new snapshots must not rotate or overwrite either valid saved value. A corrupt orphan backup is a recovery failure, not a new account.
- Enter generic/different Chopin nocturnes, symphony90/concerto20 and oversized numbers: do not invent a specific favorite or crash. Exact title and Op.9 No.2 remain supported.
- Search may return partial matches, but taste intake must not assert favorites from `b`, `하이` or `비발디 여`. `Bachata Rosa`/`Ravelry` must not become composer evidence. Exact `Bach` and `비발디 봄` remain supported.
- First-day reminder must not claim a missed yesterday. Only an earlier-date pick permits the gentle return invitation; recurring copy must avoid stale relative-day claims. Delivered notifications still need device observation.
- Simulator scheduler verification: run existing integration target with `--dart-define=IN_C_DISCOVERY_HOME=true --dart-define=IN_C_SIMULATOR_QA=true`. Native unauthorized rejection is separate from authorized pending replacement/cancel. If permission is not granted, authorized branch is SKIP/NOT_VERIFIED, even if the overall runner exits successfully. The inspection method is absent from physical-device builds.

Current acceptance/evidence: [work queue](../product/in-c-expanded-v1-work-queue.md),
[execution evidence](in-c-expanded-v1-evidence-2026-09-13.md).
Historical PASS counts below are not current release evidence.

- Check legacy click-only completion: preserve old timestamp, do not show completed or unlock surprise without confirmed evidence.
- Confirm first-session save/like cannot claim a second listening day or personal repertoire.
- Trim recent events/reactions, reopen native preferences, confirm map and continuity remain consistent.
- Compare UTC event times to local dates; separately test midnight, DST and timezone travel on device.
- Enter an unknown song: keep exact input without inventing melody/structure traits or map progress.
- Review all 11 founder inputs; the intake cap must not truncate the later classical references.
- Ops observations begin unanswered. Anonymous/simulation responses do not satisfy human gates; later responses replace earlier answers for the same tester.
- Per-day distance review is tied to its exact recommendation snapshot. It does not create listening events or founder consent.
- Check My Music policy entry at 320px and 1.6 text scale; actual wording must agree with the policy document.
- Example concerts show a clear notice and no enabled booking destination. Real unmatched-program imports must not crash on empty work IDs.
- With reminders enabled, react unsure, correct to liked, change time, disable: inspect the pending request and actually delivered copy separately.
- Physical notification permission/delivery/tap and real audio playback are NOT_VERIFIED until observed. A bridge response or no-codesign build is insufficient.

## Smoke Flow

1. 앱을 처음 실행하고 "좋아하는 음악에서 시작" onboarding sheet가 뜨는지 확인한다.
2. 좋아하는 곡/작곡가/OST/분위기를 1-3개 입력하거나 건너뛴다.
3. 입력 직후 onboarding 안에서 오늘의 한 곡 후보와 다음 세 작품이 즉시 보이는지 확인한다.
4. Today 첫 화면에서 `오늘의 한 곡` Daily Pick과 30초 primary action이 가장 먼저 보이는지 확인한다.
5. Daily step의 30초 point를 열고 reaction 또는 전체 듣기 link-out을 실행한다.
6. 반응 또는 직접 감상 완료를 남겼을 때만 오늘 완료 상태와 지도 변화가 보이는지 확인한다. 외부 링크 이동만으로 완료되면 실패다.
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
21. Catalog Ops의 첫 7일 추천 미리보기에서 작품, 거리감, 30초 지점, 다음 길이 overflow 없이 보이는지 확인한다.
22. Catalog Ops의 Daily Pick 규칙 검사에서 모의 실행임이 명시되고, 실제 사용자 평가가 NOT_VERIFIED로 분리되는지 확인한다. 자동 규칙 PASS가 추천 품질이나 사용 의향 YES로 표시되면 실패다.
23. Founder taste profile에서 선율/산책/밤/구조형 예외가 반영되고, 오페라/바그너/말러가 첫 추천에서 뒤로 밀리는지 확인한다.
24. iOS local notification permission, schedule, cancel, notification open event가 기록되는지 확인한다.
25. 알림 문구가 기본/저장 후/좋음 후/아직 모르겠음 후/놓친 날 상태에 맞게 바뀌는지 확인한다.

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
- daily completion after reaction or explicit moment completion; external link attempts alone must not complete a day
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

### Explicit Preview Approval

- A `listen_direct` link is approval of the full-listening destination, not permission
  to play any same-host preview URL. It must remain needsReview for preview playback.
- Only `listen_preview_approved` with a valid direct destination and a non-search,
  provider-matching preview URL can enable the preview control.
- A search destination, search URL in previewUrl, wrong host, pending or rejected state
  must never enable preview even when a native player reports available.
- Test fixtures are synthetic URLs and must not enter the seed or content approval log.

### Multiple Taste Sources Follow-Up (2026-09-15)

- Supply Carmen Habanera and Chopin Op.9 No.2 in both orders. A new Chopin piano work
  must use the Chopin evidence, not imply a Carmen connection from a global axis.
- Supply Bach Air and Chopin Raindrop. A candidate Chopin nocturne must explain the
  stronger piano/composer connection consistently in draft reward, Next Three and Daily.
- No root/draft novelty slot should contain either supplied favorite. With no novel work
  left, Daily can offer an honest revisit without inventing a saved state.
- Instrument-only input establishes proximity, not a changed musical dimension. Retain
  a positive connected surprise case alongside the unconnected/default-axis rejection.
- Simulated completed dates test scheduling only. First-week human quality remains open.
- Native controlled-catalog onboarding screenshot: `in-c-intake-strongest-bridge.png`.
  Judge original input chips, grounded source/guide, wrapping and overflow independently.
- The first work must not repeat under next path. With only one novel candidate, omit
  the following list instead of displaying a duplicate or inventing extra content.
- Repeated links, saves and intake must leave listening level at its initial state.
  Reactions/completions on one local day count once; three separate confirmed dates survive
  reaction correction and recent-log compaction. Future dates cannot advance current pacing.
  Treat these as pacing checks, never musical-ability or audio-verification evidence.

### Native Notification Entry Follow-Up (2026-09-14)

- `RunnerTests` checks buffered delivery before engine setup, consume-once, duplicate
  Scene/delegate reports, next delivery, dismissal, unrelated request and empty payload.
  These are native contract tests, not an actual OS notification tap.
- On the isolated simulator/physical QA device, schedule an invitation then background the
  app. Tap the delivered invitation from My Music and verify today's work opens only once.
- Repeat after terminating the app. Verify Scene connection preserves the notification
  destination until Flutter is ready, and normal relaunch does not reopen a consumed alert.
- Dismiss an invitation without opening it; no recommendation-open event should appear.
- Repeat on a later delivery of the same recurring request ID; it must still be accepted.
- Permission grant/denial, background banner, physical delivery and VoiceOver require their
  own observations. Provisional simulator authorization does not count as user consent.
- Current CLI has no notification tap command or installed UI automation helper. Do not
  replace this evidence with `simctl push` or direct callback injection and label it a tap.

2026-09-14 회피/푸가 추가 QA:
- 신규 사용자의 오페라 노래 제외가 꺼져 있고 선율 입력만으로 말러·합창이 거부되지 않는다.
- My Music 제외 설정에서 오페라 노래를 켜고 다시 끈 뒤 저장값·재열기·양방향 병합을 확인한다.
- 오페라만 있는 테스트 catalog에서도 제외 해제 화면으로 돌아갈 수 있다.
- 작품 분류는 JSON/import/admin metadata 수정에서 유지되며 잘못된 bool 값을 거부한다.
- `바흐 푸가`는 정확 작품 매칭이 아닌 작곡가 단서이고 실제 BWV 578 후보가 나온다.
- `바흐 BWV 578`과 다른 번호 BWV 542를 구분한다. 검색은 직접 재생이 아니다.
- BWV 578의 표시 길이는 추정이며 실제 녹음 구간·청취를 검증한 것으로 보이지 않아야 한다.
- 실제 오페라 제외 토글·저장 읽기 캡처는 시뮬레이터 증거이며 VoiceOver/실기기는 별도다.

- 실제 KOPIS API 연동은 API key, rate limit, 필드 mapping을 운영 환경에서 확인해야 한다.
- 실제 preview playback은 플랫폼별 native channel 구현과 provider preview URL 정책 검증이 필요하다.
- 공연 광고 집행 전에는 sponsor disclosure 문구와 광고 심의 기준을 별도 확인한다.
- Apple Music Classical 전용 direct/deep link는 공식 경로가 검증되기 전까지 Apple Music 또는 web search fallback으로 둔다.

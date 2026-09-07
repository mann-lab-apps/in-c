# in C V1 Release Checklist

목표: in C를 좋아하는 음악에서 시작하는 클래식 감상 성장 앱으로 공개 V1 배포 가능한
상태까지 검증한다. 공연 전 10분 프리뷰와 공연 후 회고는 핵심 보조 루프로 유지한다.

## Product

- Public V1 release-ready YES/NO는 Catalog Ops의 Public V1 Closeout evidence만 기준으로 판단한다.
- Soft Launch friendly users YES와 Public V1 READY를 같은 상태로 취급하지 않는다.
- founder first exposure pool은 30개 작품 단위로 잠그고, 첫 노출에서 제외할 작품은 catalog에 남기되 Today/Discover starter pool에서 빼야 한다.
- 첫 실행 onboarding은 관심사 설문이 아니라 좋아하는 음악 수집으로 시작한다.
- "라흐 피협 2" 같은 축약 입력, 클래식 외 음악/OST/분위기 입력을 안전하게 받는다.
- "모차르트 교향곡 40번", "하이든 건반 협주곡 2번"처럼 catalog에 정확한 작품이 없지만 작곡가가 보이는 입력은 fake work match 없이 작곡가/원문 힌트로 처리한다.
- Today 첫 화면에서 "오늘의 한 곡" Daily Pick이 가장 먼저 보이고, 30초 listening moment가 primary action이다.
- 같은 날짜의 Daily Pick은 여러 번 열어도 유지되고, 다음 날짜에는 새 pick으로 넘어간다.
- Daily Pick은 아주 가까움 / 한 걸음 확장 / 의외의 우회로 / 다시 들어볼 때 중 하나의 거리감을 보여준다.
- 첫 3일은 가까운 추천 중심이며, 4-7일 안 surprise 추천은 최대 1회만 허용된다.
- `아직 모르겠음` reaction 직후에는 surprise 추천을 하지 않는다.
- Daily step은 저장했지만 아직 전체 듣기 전인 작품, `아직 모르겠음` 회복용 쉬운 작품, 취향 기반 추천, founder pick 순서로 결정된다.
- 오늘 reaction, 전체 듣기, listening moment 완료 중 하나가 있으면 Daily step은 완료 상태로 보인다.
- Daily step reason은 사용자가 넣은 음악/OST/분위기 또는 reaction evidence를 직접 반영한다.
- 선율-first 사용자에게는 선율, 일/독서/산책 맥락, 시대별 기법 힌트가 추천 이유와 Next Three reason에 반영된다.
- 오페라/성악 중심 또는 바그너/말러식 확장은 사용자가 명시적으로 좋아한 경우가 아니면 첫 추천에서 뒤로 밀린다.
- 온보딩 보상은 입력을 감상 시작점, 오늘 들을 지점, 다음 방향으로 즉시 바꿔 보여준다.
- 10초 귀 트임은 정답/점수/랭킹 없이 내가 먼저 들은 단서만 남긴다.
- Daily step 완료 후 방금 잡은 포인트와 감상지도 변화가 보인다.
- Daily Pick 완료 후 My Music에 최근 오늘의 한 곡 history가 보인다.
- Preview 첫 화면에서 Next Three가 바로 맞을 작품 / 한 걸음 확장 / 나중에 열릴 작품으로 보인다.
- Preview 첫 화면에서 공연명/프로그램 붙여넣기와 10분 프리뷰 만들기는 보조 행동으로 보인다.
- seed 공연 또는 붙여넣은 프로그램에서 2-4개 작품 ConcertPreviewRoute가 생성된다.
- route 안에서 30초/3분 listening moment, 저장, reaction, 외부 플랫폼 열기가 동작한다.
- Today 성격의 "오늘 하나만" 추천은 Daily step과 Next Three를 보완한다.
- Work Detail에서 작품 여권이 first meet, preview, 전체 듣기, 저장, reaction stamp를 보여준다.
- 공연 후 30초 회고가 My Music에 저장되고 Taste Map에 반영된다.
- My Music에서 내 감상지도, 열린 길, 다시 알아본 길, 내 곡이 된 작품, 다음 길이 저장 목록보다 먼저 보인다.
- Work Detail에서 이 작품이 감상지도 안에서 어떤 길에 있는지 보인다.
- Discover는 단순 태그 shelf가 아니라 지금 열린 길 / 익숙해진 길 / 아직 낯선 길 / 다음 길 중심으로 시작한다.
- `악기가 궁금함` reaction이 관심 편성으로 이어져 Discover 추천을 바꾼다.
- 외부 플랫폼 click event는 provider, link type, fallback 여부, URL을 기록한다.
- 검색 기반 플랫폼 link는 `전체 듣기`가 아니라 `검색` CTA로 표시한다.
- Work Detail에서 작품명, 원어명, 작곡가, 시대, 편성, 길이, 악장, 작품 번호, 추천 shelf가 보인다.
- Discover에서 mood, 악기, 작곡가, 시대, 입문, 공연 전 shelf가 동작한다.
- My Music에서 preview route history, 저장했지만 아직 전체 듣기 전 queue, 다시 들을 작품,
  reaction history, 공연 후 회고, Taste Map, 선호 플랫폼 설정이 동작한다.
- Concerts에서 관심 작품/작곡가/악기/지역 기반 공연과 sponsored 공연 card가 보인다.
- Today와 Work Detail의 sponsored 공연 card는 click event 기록 후 Concert Detail로 진입한다.
- Concert Detail에서 프로그램 작품과 예매처 destination을 확인할 수 있다.
- Concert Detail에서 10분 프리뷰 생성과 공연 후 회고 입력이 가능하다.
- 공연 card는 첫 청취 CTA보다 위에 노출되지 않는다.
- Sponsored 표기는 명확하며 일반 추천 공연과 구분된다.
- 사용자는 앱 안에서 product quality, link issue, concert issue, copy issue, retention issue, crash/blocker 의견을 남길 수 있다.
- feedback은 local event log의 `feedback_submit`으로 기록되고, Catalog Ops에서 blocker 여부를 집계한다.
- Founder Quality Gate는 5명 테스트 중 3명 이상이 Daily step click, 추천 이유 납득, 전체 듣기, reaction, 감상지도 이해, 다음날 재방문 이유를 통과해야 YES다.
- Catalog Ops의 Founder Test Mode는 첫 1분 행동, 추천 이유 납득, 전체 듣기, reaction, 감상지도 이해, 재방문 이유 관찰표를 보여준다.
- First-Use Wow Gate는 5명 중 4명 이상이 첫 추천의 개인화감을 납득하고, 3명 이상이 취향 연결감과 재방문 이유를 말해야 YES다.

## Catalog

- release seed catalog는 최소 300개 이상의 작품으로 smoke test를 통과한다.
- founder first exposure 30개와 catalog backfill layer를 분리한다.
- founder first exposure 30개는 모두 Listening Map node에 연결된다.
- Listening Map은 orphan node와 broken prerequisite reference를 Catalog Ops에서 드러낸다.
- Public V1 판단에는 founder map coverage와 beginner path coverage를 포함한다.
- catalog backfill 작품은 검색/확장에는 사용할 수 있지만, copy review 전에는 첫 노출 pool에 넣지 않는다.
- Public V1 release catalog 목표는 300개 이상이다.
- 출시 후보 확장 목표는 500-1000개로 관리한다.
- 300개 미만 catalog는 code blocker가 아니라 content ops GAP이지만, Public V1 release-ready YES 조건은 만족하지 못한다.
- 모든 작품은 한국어명, 원어명, 작곡가, 시대, 편성, 길이, catalog number 또는 빈 값, alias, tags, listening moments, external links를 가진다.
- 모든 listening moment는 작품 길이 안의 유효한 시간 범위를 가진다.
- 외부 링크, preview URL, embed URL, score link, ticket URL은 유효한 URL이다.
- 같은 composer 안에서 같은 catalog number가 중복되지 않는다.
- alias 중복은 validation warning으로 확인한다.

## Concerts And Promotions

- KOPIS fixture/import parser가 공연 row를 ClassicalConcert shape로 변환한다.
- 공연 raw program text와 matched work ids는 분리해서 저장한다.
- Program paste flow는 ConcertProgramMatcher high/medium 후보만 route에 넣고 low confidence는
  자동 확정하지 않는다.
- promotion과 concert는 분리 모델로 관리한다.
- promotion impression/click/dismiss, concert save, ticket destination click 이벤트가 기록된다.
- promotion reporting에서 CTR, save rate, dismiss rate, ticket clicks를 확인할 수 있다.

## Tech

- local-first 상태 저장이 동작한다.
- ConcertPreviewRoute와 PostConcertReflection은 local-first 상태에 encode/decode된다.
- ReminderPreference는 local-first로 저장된다.
- iOS local notification은 MethodChannel bridge로 permission request, schedule, cancel, notification open event를 처리한다.
- remote push/APNs 서버 운영은 Public V1 이후 production verification GAP으로 둔다.
- 로그인/Supabase sync는 conflict-safe codec과 merge 정책을 통과한다.
- Admin command reducer로 external link, score link, concert program raw text, promotion create/update/pause를 처리할 수 있다.
- 실제 preview playback은 provider preview URL이 있는 경우에만 시도한다.
- verified 상태가 아닌 direct link와 approved 상태가 아닌 preview URL은 catalog readiness에 반영하지 않는다.
- Public V1 preview gate는 전체 catalog가 아니라 founder first exposure 30개의 approved preview coverage를 기준으로 본다.
- 검색 fallback은 direct listen link가 아니며, UI와 reporting에서도 분리한다.
- 앱은 음원 파일을 직접 host/cache/download하지 않는다.

## App Identity Target

- current display name: `in C`
- Public V1 Android applicationId: `com.mannlab.inc`
- Public V1 iOS bundle id: `com.mannlab.inc.clef`
- target display name: `in C`
- target subtitle: `오늘 하나씩 여는 클래식`
- first-pass launcher icon: `apps/in_c_sheet/assets/brand/in-c-soft-launch-icon.svg`
- Android/iOS launcher PNG resources: first-pass generated, device review required.
- QA build can open the discovery app directly with `--dart-define=IN_C_DISCOVERY_HOME=true`.
- Public V1 Android build는 Play Console package requirement인 `com.mannlab.inc`로 잠근다.
- Clef sheet-reader continuity는 regression suite로 보호한다.

## Store Metadata

- metadata draft: `docs/product/in-c-store-metadata-public-v1-draft.md`
- app name: `in C`
- subtitle: `오늘 하나씩 여는 클래식`
- short description: `작품 중심으로 클래식을 발견하고 듣기와 공연으로 이어집니다.`
- screenshot candidates: Today, Work Detail, Discover, My Music, Concerts
- screenshot exclusions: Catalog Ops, fake direct link, fake preview URL, internal ops terms
- remaining GAP: App Store Connect / Play Console length and policy review.

## Verification

- `flutter test`
- `flutter analyze`
- `flutter build apk --debug`
- `flutter build apk --release`
- 가능하면 `flutter build appbundle --release`
- AAB/APK 산출물은 git commit에 포함하지 않는다. 로컬 `releases/`와 `apps/*/releases/`는 보관/업로드용이며 `.gitignore` 대상이다.
- `flutter build ios --no-codesign`
- 주요 화면 smoke test: Preview -> program paste -> route -> 30초 point -> Work Detail -> 저장 ->
  My Music diary -> Concerts -> Concert Detail -> 예매처 link-out
- 첫 사용 smoke test: Preview -> 오늘 30초 Daily step -> preview sheet -> reaction or 전체 듣기 ->
  완료 상태 -> Next Three -> My Music 이어 듣는 흐름
- 기존 Clef 악보앱 주요 흐름 smoke test

## 2026-09-02 Branding QA Snapshot

- Android/iOS display name: `in C`
- first-pass launcher icon: applied to Android adaptive/legacy resources and iOS AppIcon set.
- in C QA entry: `--dart-define=IN_C_DISCOVERY_HOME=true`
- targeted in C test: PASS
- full Flutter test: PASS
- Flutter analyze: PASS
- Android debug APK build: PASS, `build/app/outputs/flutter-apk/app-debug.apk`
- Android release APK build: PASS, `build/app/outputs/flutter-apk/app-release.apk`
- Android App Bundle build: PASS, `build/app/outputs/bundle/release/app-release.aab`
- Android install smoke: PASS, `emulator-5554` Android 15 installed and launched the release APK.
- iOS no-codesign device build: PASS, `build/ios/iphoneos/Runner.app`
- iOS simulator build/install/launch smoke: PASS on iPhone 17 Pro simulator.
- iOS TestFlight upload: NOT RUN, signing/provisioning required.
- 2026-09-03 repeat QA: targeted/full tests, analyze, Android debug/release/AAB, iOS no-codesign,
  and iOS simulator install/launch smoke all PASS.
- Public V1 app identity decision: Android package is `com.mannlab.inc`; iOS bundle id remains
  `com.mannlab.inc.clef` until signing/provisioning is resolved.

## 2026-09-03 Public V1 Closeout Snapshot

- App identity decision: PASS, Public V1 Android uses `com.mannlab.inc` with `in C` display name, icon,
  store copy, and direct discovery entry.
- Public copy review gate: PASS, store-facing copy is checked for internal terms such as CTA, surface,
  funnel, Catalog Ops, fake direct, and fake preview.
- Catalog Ops now shows Public V1 GAP action rows with priority, owner, next action, and evidence requirement.
- Android install smoke retry: PASS, direct emulator launch attached `emulator-5554`; release APK install and
  `com.mannlab.inc/.MainActivity` launch succeeded.
- Android smoke screenshots: Today, Work Detail, Discover, My Music, Concerts, Preview, and external link-out
  captured under `apps/in_c_sheet/build/`.
- External link-out smoke: PASS with environment note. The app handed YouTube search fallback to Chrome without
  crashing; Chrome showed first-run setup, so final search result display depends on external app setup.
- iOS IPA/TestFlight: GAP, `flutter build ipa` completed archive then failed codesign because provisioning
  profile `Clef` does not include the current Apple Distribution certificate.

## Public V1 Release Candidate Gate

- validation error count: 0
- release catalog count: 300+
- founder first exposure pool: ready
- first 3 minutes funnel smoke: PASS
- safe external link fallback: PASS
- approved-only direct/preview policy: PASS
- sponsored disclosure on all promotion surfaces: PASS
- app identity summary: verified by accepted Public V1 identity decision
- public copy smell check: PASS
- Android install smoke: PASS
- screenshot capture/review: PASS for Android emulator evidence; final store framing/localization still needs console review
- launch feedback blockers: 0
- privacy copy: present and consistent
- Clef regression suite: PASS

## 2026-09-04 Retention Pivot Snapshot

- Product position changed from generic classical recommendation to personal classical listening growth.
- Preview tab now exposes `오늘 30초만` Daily listening step as the first action.
- Daily step uses saved-unopened, unsure recovery, taste-based Next Three, and founder pick fallback.
- My Music now shows gentle continuity summary without XP, league, or punitive streak copy.
- `공연 전 10분` and program paste remain as secondary high-intent loops.
- ConcertPreviewRoute is persisted local-first and can be created from seeded concerts or pasted program text.
- Program paste flow shows match candidates and keeps low confidence matches out of routes until manual review.
- My Music now includes Taste Map, preview route history, saved-but-unopened queue, and post-concert reflections.
- Concert Detail can create a 10-minute preview and accept a 30-second post-concert reflection.
- Targeted in C test: PASS, 55 tests.

## Explicit Non-Goals For V1

- 음원 host/cache/download
- 검증되지 않은 provider direct link
- 검증되지 않은 preview playback
- Apple Music Classical 전용 deep link
- KOPIS API key 없는 production remote import
- standalone `com.mannlab.inc` applicationId/bundle id migration

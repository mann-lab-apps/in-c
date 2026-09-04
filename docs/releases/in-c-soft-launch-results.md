# in C Soft Launch Results

이 문서는 Soft Launch/TestFlight/Internal Test 결과를 Public V1 Closeout으로 넘기기 위한 evidence log다.

## Current Result

- Soft Launch friendly users: Catalog Ops의 Soft Launch Readiness 기준으로 판단한다.
- Public V1 release-ready: Catalog Ops의 Public V1 Closeout 기준으로만 판단한다.
- 현재 코드 기준에서는 release catalog 300개, 검색 fallback, founder first exposure pool을 검증할 수 있다.
- approved preview, store metadata verification, 실제 provider direct link 검수는 별도 GAP으로 남을 수 있다.

## Evidence To Collect

- 첫 3분 funnel: Today view, 30초 guide open, external platform click, save, reaction, recommendation click
- retention: My Music view, next works available, saved-but-unopened count
- link quality: provider별 direct success/failure, fallback usage
- concert value: concert detail view, ticket destination click, sponsored dismiss/save
- feedback: link issue, copy issue, recommendation issue, concert issue, retention issue
- Catalog Ops Launch Feedback: `feedback_submit` category count, blocker count, latest message, export text
- Android install smoke: release APK install/launch, Today, preview, link-out, Work Detail, Discover, My Music,
  Concerts screenshot evidence
- iOS signing: no-codesign build, simulator install/launch, IPA/TestFlight signing result

## Public V1 Decision Rule

Soft Launch에서 나온 반복 문제는 다음 category로 분류한다.

- code blocker: 앱 crash, 저장 손상, link-out flow 중단, validation error
- product quality GAP: 첫 3분 이해 실패, founder copy 문제, 추천 반복, My Music 무가치
- content ops GAP: direct link 검수 미완료, 공연 match 부족, backfill copy review 부족
- production verification GAP: build/signing, store metadata, KOPIS key/config
- legal review GAP: preview URL 허용 범위, sponsored disclosure 최종 검토

Public V1 release-ready YES는 critical code blocker와 critical product quality GAP이 0이고,
Catalog Ops Closeout의 release-ready가 YES일 때만 사용한다.

Public V1 Android app identity는 Play Console package requirement인 `com.mannlab.inc`로 고정한다.
사용자-facing display name, icon, store copy, 직접 진입 build flag는 `in C`로 유지한다. iOS bundle id는
signing/provisioning 정리 후 별도 확인한다.

## 2026-09-03 Public V1 Evidence

- Android release APK install: PASS on `emulator-5554`.
- Android launch: PASS with `com.mannlab.inc/.MainActivity`.
- Android screenshot capture: PASS for Today, Work Detail, Discover, My Music, Concerts, Preview, external link-out.
- Android external link-out: PASS with environment note. Chrome opened first-run setup after the app handed off
  YouTube search fallback.
- iOS no-codesign build: PASS.
- iOS simulator install/launch: PASS.
- iOS IPA/TestFlight: GAP. Archive runs, codesign fails because provisioning profile `Clef` does not include the
  current Apple Distribution certificate.

## Launch Week Hotfix Criteria

- crash/blocker feedback
- external link-out flow failure
- save/reaction persistence failure
- sponsored disclosure missing or placed above first listening CTA
- repeated Today/onboarding comprehension failure
- store review rejection

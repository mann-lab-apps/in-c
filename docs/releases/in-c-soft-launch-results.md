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

## Public V1 Decision Rule

Soft Launch에서 나온 반복 문제는 다음 category로 분류한다.

- code blocker: 앱 crash, 저장 손상, link-out flow 중단, validation error
- product quality GAP: 첫 3분 이해 실패, founder copy 문제, 추천 반복, My Music 무가치
- content ops GAP: direct link 검수 미완료, 공연 match 부족, backfill copy review 부족
- production verification GAP: build/signing, store metadata, KOPIS key/config
- legal review GAP: preview URL 허용 범위, sponsored disclosure 최종 검토

Public V1 release-ready YES는 critical code blocker와 critical product quality GAP이 0이고,
Catalog Ops Closeout의 release-ready가 YES일 때만 사용한다.

Public V1 app identity는 기존 Clef lineage applicationId/bundle id를 유지하고, 사용자-facing display
name, icon, store copy, 직접 진입 build flag를 `in C`로 고정하는 것으로 결정한다. 독립 in C
applicationId/bundle id는 signing, migration, store listing 영향 검토 후 V1.1에서 다룬다.

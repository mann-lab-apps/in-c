# in C V1 Retention Pivot Options

Date: 2026-09-04

## Decision Summary

Public V1 should stop positioning itself as a generic classical recommendation app.
The strongest pivot is:

> 개인 클래식 감상 성장 앱, supported by a Daily 30-second step, Next Three, work passport, and concert preview.

This uses the existing catalog/recommendation/concert infrastructure but changes the first promise from "find a classical work" to "show where my ear can go next."

The intentionally sharper first-use version is:

> 좋아하는 음악을 클래식 감상 언어로 바꾸고, 오늘 들을 30초와 다음 세 길을 여는 앱.

Fast classical guessing can be a separate acquisition app later. In C should only borrow the smallest useful part:
an optional 10-second ear-opening question that records what the user heard first. It should not use scores, rankings,
speed competition, or correct/incorrect framing.

## Position Comparison

| Position | 장점 | 약점 | 기존 앱 대비 차별점 | 단일 사용자 가치 | 리텐션 가능성 | V1 핵심 화면 | 버려야 할 기능 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 클래식 추천 앱 | 이해 쉬움, 구현 쉬움 | Spotify/YouTube/Apple과 정면 비교됨 | 약함 | 낮음 | 낮음 | 추천 홈 | 범용 mood shelf 과다 |
| 작품 중심 디스커버리 앱 | Apple Music Classical과 정합 | 직접 재생이 없어 약함 | metadata는 가능 | 중간 | 중간 | Work Detail | encyclopedia식 설명 |
| 공연 전 예습 앱 | 날짜/상황이 명확, BM 자연스러움 | 공연 데이터 품질 필요, 음악 discovery 중심이 흐려짐 | 강함. 공연 전 10분 문제 해결 | 높음 | 높음 | Concert Preview | 지역 공연 추천 중심 구조 |
| 개인 클래식 감상 성장 앱 | 커뮤니티 없이 강함, 좋아하는 음악에서 즉시 시작 | 추천 reason/copy 품질이 중요 | 강함. 취향을 반복 소비가 아니라 확장 경로로 바꿈 | 높음 | 높음 | Daily Step, Taste Intake, Next Three, Work Passport | 단순 저장함, 태그 나열 |
| 30초 청음 루틴 앱 | 매일 습관 가능, 첫 행동이 작음 | 성장이 보이지 않으면 얕아짐 | 중간-강함 | 높음 | 높음 | Daily Moment | 과한 streak/gamification |
| 공연/음악 link-out 허브 | 현실적, 저작권 안전 | 허브만으로는 약함 | 약함 | 낮음 | 낮음 | Link Hub | 링크 목록 중심 UX |
| Clef/Chromatics 감상-연습 브릿지 | 우리 자산과 연결 | 대중 타겟 좁아짐 | 강함 | 특정 사용자에게 높음 | 중간 | Listen to Practice | 초기 첫 화면 노출 |

## Recommended Position

Recommended Position:
개인 클래식 감상 성장 앱

Why this can retain users:
사용자는 이미 좋아하는 음악은 있지만 클래식 안에서 다음 길을 모른다. in C는 좋아하는 음악을 시작점으로 삼아 바로 맞을 작품, 한 걸음 확장, 나중에 열릴 작품을 나눈다.
Spotify식 endless play와 달리 "내 귀가 어디로 자라는지"를 보여주는 단일 사용자 가치를 만든다.

First 60 seconds:

1. "요즘 좋았던 음악을 알려주세요."
2. 사용자가 곡명/작곡가/OST/분위기를 1-3개 넣는다.
3. 앱이 오늘 30초 Daily step과 감상 좌표를 보여준다.
4. 첫 30초 moment를 바로 연다.

Day 2 comeback:

- "어제 저장한 작품 아직 전체 듣기 전입니다."
- "공연 D-1: 이 3개만 다시 듣고 가세요."
- "비슷한 공연이 이번 주에 있습니다."

Week 2 comeback:

- "지난 공연에서 현악/인상주의에 반응했습니다."
- "그 취향과 연결되는 다음 공연/작품입니다."
- "이번 달 공연 프로그램에 자주 나오는 작품입니다."

Core loop:

좋아하는 음악 입력 -> 감상 시작점 -> 오늘 30초 Daily step -> 귀 트임 단서 ->
reaction/save/link-out -> Next Three -> 작품 여권 -> 다음 Daily step

Killer surface:

Daily 30-second step + Next Three + Work Passport

- 오늘 하나만 열면 충분한 30초 지점
- 바로 맞을 작품
- 한 걸음 확장
- 나중에 열릴 작품
- 각 추천 reason
- 30초/3분 듣기 지점
- 전체 듣기 WebView/link-out
- save/reaction
- 작품별 첫 만남/저장/반응 passport stamp

Features to remove or hide:

- 첫 화면의 많은 mood/context/instrument 선택
- 일반적인 "오늘의 작품" hero 단독 노출
- 설명형 composer biography 과다 노출
- Catalog Ops 및 내부 검수 용어
- 검증되지 않은 preview/direct URL
- 지역 공연 추천 중심 내비게이션

Features to build next:

1. Daily 30-second Step
   - Preview 첫 화면의 단일 행동
   - saved-unopened / unsure recovery / taste-based / founder pick fallback
   - completion after reaction, full listen, or moment complete

2. Taste Intake
   - 좋아하는 클래식/비클래식 음악 free text
   - catalog alias matching
   - unmatched input axis fallback

3. Listening Coordinates
   - 선율형/색채형/리듬형/긴장형/구조형/극적형
   - rule-based score
   - overclaiming 없는 자연어 요약

4. Next Three
   - immediate / stretch / later lane
   - recommendation reason
   - duplicate reduction

5. Work Passport
   - first meet
   - preview/open/listen/save/reaction
   - concert preview/reflection stamp

6. Concert Preview as Context
   - program paste and route remain
   - sponsored concerts stay below listening CTA
   - no generic local event feed positioning

Features to postpone:

- full social feed
- public reviews
- user-generated public content
- native licensed audio
- verified YouTube embedded video playback
- Spotify/Apple account import
- push notification until route value is proven
- paid subscription

## Implementation Backlog

### Slice A: Daily 30-Second Step

Problem:
클래식은 고르고 이해하는 장벽이 높아, 첫 화면에서 추천 목록이 많으면 사용자가 행동하지 않는다.

Scope:
Preview 첫 화면에 오늘 하나의 listening moment만 제안한다. 후보는 저장했지만 아직 전체 듣기 전, 최근 `아직 모르겠음` 회복용 쉬운 작품, 취향 기반 Next Three, founder pick fallback 순서로 고른다.

Acceptance:

- first screen shows Daily step before concert/program surfaces
- opening the step records preview open and then reaction/full listen/completion can mark today complete
- completion is derived from daily events and reactions, not fake progress state
- My Music shows weekly continuity without punitive streak copy

Verification:

- controller tests for candidate priority and completion
- widget smoke for first screen
- My Music continuity rendering

### Slice B: Concert Preview Route

Problem:
사용자가 공연 프로그램을 보고도 무엇부터 들어야 할지 모른다.

Scope:
Concert Detail 또는 새 Preview tab에서 matched works를 10분 route로 묶는다.

Acceptance:

- route contains 2-4 works from concert.programWorkIds
- each work shows one 30-second moment and one 3-minute option when available
- route can be completed without choosing mood/instrument
- save/reaction works inside route
- ticket destination remains below listening actions

Verification:

- route builder unit test
- widget smoke: program -> route -> moment -> save -> ticket

### Slice B: Program Paste Flow

Problem:
사용자의 실제 공연은 seed concert에 없을 수 있다.

Scope:
사용자가 공연명/프로그램 텍스트를 붙여넣으면 ConcertProgramMatcher로 후보를 보여준다.

Acceptance:

- high/medium confidence candidates are shown first
- low confidence candidates require manual confirmation
- unmatched lines remain visible
- no fake concert/direct URL is created

Verification:

- fixture parser test
- low confidence manual review test
- safe rendering test for malformed text

### Slice C: My Music As Diary

Problem:
저장함은 재방문 이유가 약하다.

Scope:
My Music을 "다시 들을 이유"별 queue로 재구성한다.

Acceptance:

- saved but unopened queue
- previewed but not full-listened queue
- reacted works
- concert preview history
- post-concert reflections

Verification:

- persistence test
- queue ordering test
- empty state test

### Slice D: Taste Map

Problem:
사용자는 추천보다 "내가 뭘 좋아하는지" 알고 싶어 한다.

Scope:
reaction/history 기반 rule-based insight를 만든다.

Acceptance:

- shows top instrument/era/mood/context
- distinguishes liked/repeat/unsure
- gives one next action
- avoids overclaiming when data is sparse

Verification:

- insight generation test
- sparse data fallback test
- after reaction update test

### Slice E: Public Copy Reframe

Problem:
현재 문구가 콘텐츠 앱/AI 앱처럼 보인다.

Scope:
Today/Discover/My Music/Concerts 문구를 공연 전후 행동 중심으로 바꾼다.

Acceptance:

- first screen promise mentions concert/listening use case
- no internal product terms in user-facing copy
- fewer choices above first listening action

Verification:

- public copy smell test
- small screen smoke

## What Not To Do

- Spotify처럼 보이는 음악 홈을 만들지 않는다.
- "AI 추천"을 전면에 두지 않는다.
- 클래식 교양 콘텐츠 양을 늘리는 것으로 해결하려 하지 않는다.
- 공연 광고를 상단 배너로 올리지 않는다.
- 검증 안 된 YouTube direct/embed URL을 catalog에 넣지 않는다.

## Final Recommendation

V1의 다음 구현은 새 기능 폭발이 아니라 first experience pivot이어야 한다.

Public V1 gate 문장을 다음으로 바꾼다.

> 5명 중 3명이 실제 공연 프로그램을 넣고 10분 안에 "공연장에서 뭘 들어야 할지 알겠다"고 말하면 soft launch 가능.

그 전까지는 "기능은 많지만 써야 할 이유가 약한 앱" 상태로 본다.

## Evidence Base

Reference analysis:
[discovery-app-retention-patterns.md](../research/discovery-app-retention-patterns.md)

Product strategy:
[in-c-retention-strategy.md](./in-c-retention-strategy.md)

# in C Retention Strategy

Date: 2026-09-04
Product: in C

## Problem

현재 in C는 기능적으로는 클래식 작품 discovery, listening moment, external platform link-out, 공연 연결을 갖췄다.
하지만 사용자가 "이 앱을 왜 다시 열어야 하는지"가 약하다.

핵심 문제는 다음이다.

- "오늘의 작품"은 교양 콘텐츠처럼 보인다.
- 작품 설명은 검색/블로그/프로그램북과 차별이 약하다.
- 음원을 직접 재생하지 않으므로 Spotify식 즉시 보상 루프가 약하다.
- 공연 card는 BM에는 맞지만, 사용자의 현재 일정과 연결되지 않으면 광고처럼 보인다.
- My Music은 아직 "다시 열 이유"보다 "저장함"에 가깝다.

## Recommended Position

> in C는 클래식 추천 앱이 아니라, 사용자가 이미 좋아하는 음악에서 내 클래식 감상지도를 열고 다음 작품으로 데려가는 앱이다.

Public V1의 제품 약속은 다음 문장으로 바꾼다.

> 좋아하는 곡 몇 개만 알려주면, 지금 내 귀가 어디쯤 열려 있는지와 다음 길을 보여준다.

## Core Retention Loops

### Loop 0: 좋아하는 음악에서 시작하는 감상지도

사용자 상황:
클래식에 관심은 있지만, 검색어와 다음 순서를 모른다. 이미 좋아하는 곡은 있지만 그것이 클래식 안에서 어디로 이어지는지 모른다.

첫 행동:
좋아하는 클래식 작품, 작곡가, OST, 영화음악, 게임음악, 분위기를 1-3개 입력한다. 앱은 catalog match와 free text axis fallback으로 시작점을 만든다.

얻는 보상:
"바로 맞을 작품 / 한 걸음 확장 / 나중에 열릴 작품" 세 갈래와 첫 감상지도 노드를 즉시 받는다.

다음 방문 이유:
반응과 저장이 쌓일수록 열린 길, 다시 알아본 길, 내 곡이 된 작품, Next Three가 바뀐다.

필요 데이터:
TasteIntakeItem, matchedWorkId, matchedComposerId, taste axis score, ListeningMapNode, reaction, save, external link click, listening moment complete.

MVP 난이도:
중간. ML 없이 rule-based로 시작하되, 문구가 과장되지 않아야 한다.

리텐션 가능성:
높음. 커뮤니티 없이도 단일 사용자에게 "내 귀가 움직인다"는 반복 보상을 준다.

BM 적합도:
중간-높음. 공연은 중심 기능이 아니라 관심 작품을 실제로 만날 기회로 붙는다.

### Loop 0.25: 오늘 30초 Daily step

사용자 상황:
클래식은 듣고 싶지만 앱을 열 때마다 뭘 고를 에너지가 없다. Duolingo처럼 작고 명확한 첫 행동이 필요하지만, 음악 감상에 점수 경쟁을 붙이면 금방 싸구려처럼 보인다.

첫 행동:
Preview 첫 화면에서 "오늘 30초만" 카드 하나를 연다. 후보는 저장했지만 아직 전체 듣기 전인 작품, 최근 "아직 모르겠음"에 대한 더 쉬운 회복 작품, 취향 기반 Next Three, founder pick 순서로 결정한다.

얻는 보상:
작품 하나를 배웠다는 압박이 아니라 "오늘은 이 지점 하나면 충분하다"는 완료감을 얻는다.

다음 방문 이유:
오늘 반응, 전체 듣기, 완료 기록이 내 감상 좌표와 다음 Daily step을 바꾼다. My Music에는 이번 주 몇 번 열었는지와 이어 들은 날이 부드럽게 보인다.

재방문 장치:
V1에서는 실제 native push를 release GAP으로 두고, local reminder preference만 저장한다. 문구는 "오늘 30초만 열어볼까요?"처럼 초대형으로 유지한다.

필요 데이터:
DiscoveryEvent, ClassicalReaction, UserWorkState, TasteIntakeItem, ListeningMoment, daily completion derived state.

MVP 난이도:
낮음-중간. 별도 streak 저장 없이 event/reaction 날짜에서 derived summary로 만든다.

리텐션 가능성:
높음. 고관여자가 아니어도 "오늘 30초만"은 앱을 다시 열 수 있는 가장 작은 행동이다.

BM 적합도:
중간. 광고보다 습관을 먼저 만들고, 공연은 사용자의 관심 축이 충분히 보일 때 붙인다.

Duolingo에서 가져올 것:
- 매일 바로 시작되는 하나의 작은 task.
- 완료 후 다음 task가 살짝 달라지는 느낌.
- 부담이 낮은 진행감.

Duolingo에서 버릴 것:
- XP, 리그, 과한 streak 압박.
- 틀림/실패 중심의 피드백.
- 음악 감상을 공부 앱처럼 보이게 하는 퀴즈 과잉.

Founder Quality 기준:
5명 중 3명 이상이 첫 1분 안에 Daily step을 누르고, 추천 이유를 납득하고, 전체 듣기나 reaction을 남기고, 감상지도를 이해하고, 다음날 다시 열 이유를 말해야 Public V1 후보로 본다.

### Loop 0.75: 생활코딩식 감상지도

사용자 상황:
사용자는 "클래식을 모른다"라고 느끼지만, 사실 무엇을 모르는지조차 잘 모른다. 이 상태에서는 더 많은 추천보다 현재 위치를 알아보는 화면이 더 필요하다.

첫 행동:
좋아하는 음악을 넣거나 Daily 30초를 완료한다. 앱은 선율, 색채, 리듬, 극적 전환, 긴장, 구조, 악기 소리 중 어느 길이 열렸는지 보여준다.

얻는 보상:
"나는 아무것도 모른다"가 아니라 "선율의 입구는 열렸고, 소리의 색은 다음 길이구나"처럼 자기 위치를 말할 수 있게 된다.

다음 방문 이유:
My Music에서 열린 길, 다시 알아본 길, 내 곡이 된 작품, 아직 낯선 길, 다음 길을 확인하고 오늘 30초로 한 칸 더 연다.

V1 구현:
ListeningMapNode, ListeningMapEdge, UserListeningMapState, ListeningMapProgress를 기존 TasteIntakeItem, UserWorkState, DiscoveryEvent에서 derived view로 만든다. 저장 migration을 늘리지 않고 행동 기록에서 계산한다.

피해야 할 것:
이론 시험, 레벨업, XP, 마스터 완료 같은 표현은 쓰지 않는다. 사용자가 쌓아가는 것은 지식 점수가 아니라 "들을 수 있는 포인트"다.

### Loop 0.5: 작품 여권 / 내 클래식 연대기

사용자 상황:
좋았던 작품을 저장해도 시간이 지나면 왜 저장했는지 잊는다.

첫 행동:
30초 지점 열기, 전체 듣기, 저장, reaction, 공연 후 회고 중 하나를 남긴다.

얻는 보상:
Work Detail에는 작품 여권이, My Music에는 내 클래식 연대기가 생긴다.

다음 방문 이유:
처음엔 낯설었던 작품과 다시 만날 때가 된 작품이 Today/My Music에 올라온다.

필요 데이터:
UserWorkState, DiscoveryEvent, ClassicalReaction, ConcertPreviewRoute, PostConcertReflection derived passport stamp.

MVP 난이도:
낮음-중간. 별도 중복 저장보다 기존 event에서 derived view로 만든다.

리텐션 가능성:
높음. 클래식은 "한 번에 좋아짐"보다 다시 만남이 중요한 장르다.

### Loop 1: 공연 전 10분 프리뷰

사용자 상황:
공연을 예매했거나 갈까 말까 고민 중이다. 프로그램에 낯선 작곡가/작품명이 많다.

첫 행동:
공연명 또는 프로그램 텍스트를 붙여넣는다. 앱은 매칭된 작품 2-4개를 "10분 프리뷰"로 만든다.

얻는 보상:
공연장에서 들을 선율/악기/전환 지점을 미리 안다.

다음 방문 이유:
공연 D-1, 공연 당일, 공연 후 회고에서 다시 연다.

필요 데이터:
공연명, 날짜, 장소, raw program text, matched workIds, listening moments, ticket destination.

MVP 난이도:
중간. 이미 ConcertProgramMatcher와 Concert Detail 기반이 있다.

리텐션 가능성:
높음. 날짜가 있는 이벤트는 자연스러운 재방문 trigger다.

BM 적합도:
매우 높음. sponsored concert card가 광고가 아니라 "내가 들으러 갈 기회"가 된다.

### Loop 2: 공연 후 30초 회고

사용자 상황:
공연을 보고 나왔지만 어떤 곡이 좋았는지 명확히 말하기 어렵다.

첫 행동:
"오늘 들린 순간"에서 기억난 악기/작품/분위기 하나를 고른다.

얻는 보상:
감상을 말로 정리하고 My Music/Taste Map에 남긴다.

다음 방문 이유:
비슷한 공연/작품 추천, 다시 듣기 due.

필요 데이터:
concertId, attendedAt, rememberedWorkIds, reaction, free text optional.

MVP 난이도:
낮음-중간. reaction/event log를 확장하면 된다.

리텐션 가능성:
높음. 공연 경험을 앱 안 개인 기록으로 전환한다.

BM 적합도:
높음. 다음 공연 추천과 자연스럽게 연결된다.

### Loop 3: 내 취향 지도

사용자 상황:
클래식을 좋아하고 싶지만 자기 취향을 설명하기 어렵다.

첫 행동:
저장/좋음/아직 모르겠음/악기가 궁금함 반응을 몇 번 남긴다.

얻는 보상:
앱이 "당신은 어떤 클래식에 반응하는지"를 언어화한다.

다음 방문 이유:
취향 변화, 다음 추천, 공연 선택 도움.

필요 데이터:
work tags, composer, era, instrumentation, mood/context, reaction history, listen/open events.

MVP 난이도:
중간. 현재 태그 기반으로 rule-based insight를 만들 수 있다.

리텐션 가능성:
높음. 커뮤니티 없이도 단일 사용자 가치가 있다.

BM 적합도:
중간-높음. 취향 기반 공연 추천으로 연결 가능하다.

### Loop 4: 저장했지만 아직 전체 듣기 안 한 작품

사용자 상황:
좋아 보여서 저장했지만 실제로 듣지는 않았다.

첫 행동:
My Music에서 "아직 전체 듣기 안 함" queue를 연다.

얻는 보상:
잊힌 저장물이 다시 행동으로 바뀐다.

다음 방문 이유:
저장 목록의 미완료 상태가 남는다.

필요 데이터:
save event, external_platform_click event, completion/reaction.

MVP 난이도:
낮음. 이미 save/click event가 있다.

리텐션 가능성:
중간. Spotify/Pinterest의 saved-for-later 루프와 유사하다.

BM 적합도:
중간. 공연 연결 작품이면 높아진다.

### Loop 5: 오늘 30초에서 3분으로 늘어나는 청음 루틴

사용자 상황:
공연 일정은 없지만 클래식 귀를 조금씩 만들고 싶다.

첫 행동:
앱을 열면 선택지 없이 30초 지점 하나가 제안되고, 원하면 3분 가이드와 전체 듣기로 이어진다.

얻는 보상:
한 가지 들을 포인트를 얻고 끝난다.

다음 방문 이유:
작은 completion, repeat due, 취향 지도 변화.

필요 데이터:
listening moments, repeat due, reaction, taste summary.

MVP 난이도:
낮음.

리텐션 가능성:
높음. 공연 일정이 없어도 반복 방문을 만들 수 있는 V1의 가장 작은 단위다.

BM 적합도:
낮음-중간. 공연과 직접 연결될 때만 강하다.

## Killer Surface

V1의 첫 화면은 "Today"보다 "Preview"가 되어야 한다.

추천 구조:

1. 상단: "오늘 30초만" Daily listening step
2. 즉시 결과: 오늘 작품, 들을 지점, 왜 이 지점인지, 전체 듣기 link-out
3. 보조 row: Next Three
4. 보조 card: 공연명 검색 또는 프로그램 붙여넣기
5. 보조 row: "저장했지만 아직 전체 듣기 안 한 작품"
6. 하단: 관련 공연과 ticket destination

첫 화면에서 태그, 악기, mood를 많이 고르게 하면 안 된다.
Netflix/Spotify/Melon처럼 onboarding은 추천을 jump-start하는 보조 장치이고, 첫 보상보다 앞서면 이탈이 생긴다.

## Recommendation Strategy

in C 추천은 ML보다 reason quality가 중요하다.

Recommendation reason 우선순위:

1. 공연 프로그램에 포함됨
2. 사용자가 저장/반응한 작품과 같은 listening problem을 해결함
3. 같은 악기/편성으로 귀가 이어짐
4. 같은 시대/작곡가로 지식이 이어짐
5. 더 쉬운 anchor work로 후퇴함
6. 더 깊은 related work로 확장함

Avoid:

- "AI가 추천했어요"
- "당신을 위한 클래식"
- mood tag 나열
- 같은 작품 반복 노출
- 검증되지 않은 popular count

## My Music Redesign

My Music은 저장함이 아니라 private listening diary가 되어야 한다.

필수 section:

- 이어 듣는 흐름
- 공연 전 다시 들을 작품
- 저장했지만 전체 듣기 안 한 작품
- 최근 좋았던 listening moment
- 아직 모르겠음이 많았던 작품
- 내 취향 지도
- 공연 후 회고

## Concerts Redesign

Concerts는 광고 목록이 아니라 "내가 더 잘 들을 수 있는 공연"이어야 한다.

정렬 우선순위:

1. 내가 preview 완료한 작품이 포함된 공연
2. 내가 저장한 작곡가/악기와 연결된 공연
3. 이번 주/이번 달 가까운 지역 공연
4. sponsored 공연 중 relevance가 높은 공연
5. 일반 공연 목록

Sponsored disclosure는 유지하되, 문구는 차갑게 광고처럼 만들지 않는다.

Recommended:
"후원 공연"

Avoid:
"광고", "프로모션 캠페인", "sponsored inventory"

## Features To Remove Or Hide

V1 첫 경험에서 숨길 것:

- Catalog Ops
- 과한 metadata table
- mood/context/instrument 선택 onboarding
- 너무 많은 추천 shelf
- provider direct/preview 검수 상태
- 내부 용어: CTA, surface, funnel, ops, fake URL

V1에 남길 것:

- 공연명/프로그램 입력
- 10분 프리뷰
- 30초/3분 moment
- 전체 듣기 WebView/link-out
- 저장/reaction
- 내 취향 지도
- 관련 공연
- 공연 후 회고

## Build Next

P0:

- Concert Preview Builder: concert/program text -> matched works -> 10-minute route
- Today rename/reframe: Today -> Preview 또는 Before the Concert
- My Music diary queue: saved but unopened, previewed, reacted, attended
- Taste Map summary: instrumentation/era/mood/reaction insight
- Post-Concert Reflection sheet

2026-09-04 implementation slice:

- Preview tab now opens with `공연 전 10분` and program paste as the first action.
- `ConcertPreviewRoute` is persisted local-first and can be created from seeded concerts or pasted program text.
- Program paste uses `ConcertProgramMatcher` and excludes low confidence matches from route creation.
- My Music shows preview route history, saved-but-unopened queue, Taste Map, and post-concert reflections.
- Concert Detail exposes 10-minute preview creation and a 30-second post-concert reflection sheet.

P1:

- D-7/D-1/today reminder model without push first
- manual program paste parser UX
- "what to listen for in the hall" editorial field
- founder-curated release rows

P2:

- push notification
- calendar import
- real KOPIS production sync
- verified YouTube embed video IDs
- Apple/Spotify account integration

## Validation Test With 5 Users

Recruit:

- 2 classical-curious users with one upcoming concert
- 1 regular concertgoer
- 1 music student or amateur player
- 1 user who says "classical is hard"

Task:

1. Give them one real concert program.
2. Ask them to use in C for 10 minutes.
3. Ask what they expect to hear in the concert.
4. After use, ask whether they would open it again before the concert.
5. If possible, follow up after the concert and ask what they remembered.

Success signal:

- 4/5 can explain at least one concrete listening point.
- 3/5 say they would reopen before a real concert.
- 3/5 save or react to at least one work.
- 2/5 ask for a real upcoming concert or ticket link.

Failure signal:

- Users describe it as "another classical info app."
- Users skip listening moments and only scan text.
- Users do not understand why concerts are shown.
- Users cannot remember anything specific after 10 minutes.

## Evidence Base

Detailed app-by-app retention analysis is in
[discovery-app-retention-patterns.md](../research/discovery-app-retention-patterns.md).

This strategy is based on three findings:

- Music apps retain through direct playback and listening history, which in C cannot fully copy because it is not a streaming app.
- Content discovery apps retain through continue queues, taste records, and trustworthy row framing, which in C can borrow.
- Event apps retain through date/location urgency, which is the strongest natural loop for a concert-linked classical app.

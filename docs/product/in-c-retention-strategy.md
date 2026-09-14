# in C Retention Strategy

Date: 2026-09-04
Product: in C

## Evidence Boundary: 2026-09-13

아래 리텐션 효과 평가는 제품 가설이며 실제 재방문율 검증 결과가 아니다.
이번 감사는 추천 규칙과 사용자 만족을 분리한다. 첫 7일 모의 실행은 매일 완료한다는 가정이며,
실제 청취·재방문 지표로 사용하지 않는다. 미매칭 곡은 기록만 보존하고 근거 없는 취향 축을 붙이지 않는다.
자동 close/surprise 라벨과 별도로 사람의 너무 가까움/적절함/너무 멂 응답을 기록한다.
초기 3일의 연결감, 의외성의 음악적 설득력, founder의 3일 사용 의향은 실제 응답 전까지 NOT_VERIFIED다.
감상지도에서 다시 알아본 길과 내 곡은 서로 다른 날의 명시적 참여를 요구한다. 클릭/저장만으로 익숙함을 부풀리지 않는다.
남은 작업과 실행 근거: [확장 V1 작업표](in-c-expanded-v1-work-queue.md).

재개 감사에서는 `비발디 봄` 입력의 작품 매칭 누락을 발견해 수정했다. 첫 7일의 연결 근거는 최초
입력뿐 아니라 그동안 사용자가 좋다고 반응한 작품도 포함해 검사한다. 세 취향 시나리오의 규칙
통과는 실제 음악적 만족의 증거가 아니다. 같은 날 추천을 교체하는 예외는 콘텐츠 철회/오류이며,
그때는 교체 안내와 이전 감상 기록 보존을 함께 제공한다.
일반적인 쇼팽 야상곡 입력을 Op.9 No.2 취향으로 자동 치환하던 동작도 제거했다.
좋아한다고 말하지 않은 작품을 추천 근거로 만들지 않는 것이 첫 추천의 신뢰 조건이다.
같은 원칙으로 부분 검색 결과를 자동으로 좋아하는 작품에 넣지 않는다. 또한 첫날 사용자에게
결석한 날이 있다고 말하지 않으며, 반복 알림의 복귀 문구는 특정한 어제를 지칭하지 않는다.

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

First-use impact 약속은 더 좁게 잡는다.

> 좋아하는 음악을 넣으면, 그 감각을 클래식 언어로 바꾸고 오늘 들을 30초 하나와 다음 세 길을 보여준다.

`클래식 빨리 맞추기`는 별도 앱 후보로 둔다. in C 안에서는 정답/속도/점수 경쟁이 아니라
`10초 귀 트임`처럼 내가 먼저 들은 단서를 남기는 micro interaction만 사용한다.

## Founder Taste Calibration

2026-09-14 수정: 아래 초기 가설의 선율 선호를 성악/말러 회피로 일반화하지 않는다.
회피는 사용자가 지정한 작곡가와 `오페라의 노래` 설정에 한정한다. 기본값은 회피 없음이다.
운영용 founder 예시만 원문 회피 취향을 모의 상태에 적용하고 실제 개인 기록에는 쓰지 않는다.
오페라의 기악 서곡·간주곡 포함 여부는 아직 사용자 확인 전이며 현재 설정 대상이 아니다.
바흐 푸가 취향은 BWV 578 후보로 연결하되, 모든 바흐 곡이 푸가라는 설명을 하지 않는다.

V1의 첫 기준 사용자는 다음 취향을 가진 사람으로 둔다.

- 선율에 가장 빨리 반응한다.
- 일, 독서, 산책 중에 들어도 한 줄이 남는 음악을 원한다.
- 베토벤 9번, 드보르작 9번, 모차르트 40번, 쇼팽 야상곡처럼 선율과 구조가 같이 있는 작품을 좋아한다.
- 바흐 푸가처럼 작곡 기법이 들리는 음악은 열려 있지만, 오페라 대부분과 바그너/말러식 과밀한 확장은 초반에 부담스럽다.
- "작곡가가 왜 이렇게 썼는지", "그 시대에 자주 쓰인 장치가 무엇인지"를 짧게 짚어줄 때 더 오래 남는다.

따라서 첫 추천은 공연 정보나 유명 작품 나열보다
"좋아한 곡에서 어떤 감각이 이어지는지", "오늘 어느 30초를 들으면 되는지",
"다음에는 어떤 시대/기법의 문을 열지"를 먼저 보여줘야 한다.
정확한 catalog match가 없으면 가짜 매칭을 만들지 않고 원문 입력과 작곡가 힌트를 그대로 살린다.
초반 추천은 선율, 밤/산책, 집중, 피아노, 바로크/고전의 구조가 잡히는 작품을 올리고,
오페라/성악 중심 또는 바그너/말러식 장거리 확장은 사용자가 명시적으로 좋아한 경우가 아니면 뒤로 둔다.

추천 거리는 다음 원칙을 따른다.

- 너무 같지 않게: 이미 좋아한 곡을 반복 설명하지 않고, 같은 감각을 다른 시대/편성/작곡 방식으로 옮긴다.
- 너무 다르지 않게: 오페라, 과밀한 후기낭만, 긴 성악 작품처럼 진입 장벽이 큰 길은 초반에 갑자기 던지지 않는다.
- 한 번에 한 걸음만: Next Three는 바로 맞을 작품, 한 발 넓히는 작품, 나중에 열릴 작품으로 나뉘어야 한다.
- 추천 이유는 "유명해서"가 아니라 "네가 반응한 감각이 여기서 이렇게 이어져서"라고 설명해야 한다.

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

### Loop 0.25: Daily Pick / 오늘의 한 곡

사용자 상황:
클래식은 듣고 싶지만 앱을 열 때마다 뭘 고를 에너지가 없다. Duolingo처럼 작고 명확한 첫 행동이 필요하지만, 음악 감상에 점수 경쟁을 붙이면 금방 싸구려처럼 보인다.

첫 행동:
Today 첫 화면에서 "오늘의 한 곡" 카드 하나를 연다. 30초 listening moment는 그 곡에 들어가는 가장 작은 입구다. 후보는 저장했지만 아직 전체 듣기 전인 작품, 최근 "아직 모르겠음"에 대한 더 쉬운 회복 작품, 취향 기반 Daily Pick, founder pick 순서로 결정한다.

얻는 보상:
작품 하나를 배웠다는 압박이 아니라 "오늘은 이 지점 하나면 충분하다"는 완료감을 얻는다.

다음 방문 이유:
오늘 반응, 전체 듣기, 완료 기록이 내 감상 좌표와 다음 Daily Pick을 바꾼다. My Music에는 이번 주 몇 번 열었는지, 최근 오늘의 한 곡이 무엇이었는지, 이어 들은 날이 부드럽게 보인다.

재방문 장치:
V1에서는 iOS local notification으로 매일 Daily Pick 알림을 예약한다. remote push/APNs 서버 운영은 release GAP으로 남긴다. 문구는 "오늘 한 곡만 열어볼까요?"처럼 초대형으로 유지한다.
알림 문구는 상태에 따라 달라진다. 저장했지만 전체 듣기 전인 작품이 있으면 다시 여는 문구를 쓰고, `아직 모르겠음` 직후에는 더 가까운 곡으로 간다고 말한다. 놓친 날이 있어도 벌점처럼 말하지 않는다.

첫 7일 품질 기준:
첫 3일은 가까운 시작으로 고정한다. 4-7일 사이에는 의외의 우회로를 최대 1회만 넣고, 그 곡도 기존 감상 축과 연결되는 이유가 있어야 한다. Catalog Ops의 첫 7일 추천 미리보기에서 작품, 거리감, 들을 지점, 다음 길을 확인한다.
Daily Pick 규칙 검사는 첫 7일 생성, 첫 3일 가까운 시작 유형, surprise 최대 1회, 초기 회피 위반 수를 확인한다. 매일 완료했다고 가정한 모의 실행이며 추천 품질이나 founder의 사용 의향을 승인하지 않는다. 거리 적절성 및 실제 사용자 평가는 응답 전 NOT_VERIFIED다.

Founder taste 기준:
선율이 먼저 반응하는 취향, 일/독서/산책 맥락, 작곡가 의도와 시대별 기법에 대한 호기심을 우선 반영한다. 오페라/바그너/말러는 초기 확장에서는 뒤로 두고, 바흐 푸가는 구조형 예외로 유지한다.

필요 데이터:
DiscoveryEvent, ClassicalReaction, UserWorkState, TasteIntakeItem, ListeningMoment, daily completion derived state.

MVP 난이도:
낮음-중간. 별도 streak 저장 없이 event/reaction 날짜에서 derived summary로 만든다.

리텐션 가능성:
높음. 고관여자가 아니어도 "오늘의 한 곡"과 그 안의 30초 지점은 앱을 다시 열 수 있는 가장 작은 행동이다.

BM 적합도:
중간. 광고보다 습관을 먼저 만들고, 공연은 사용자의 관심 축이 충분히 보일 때 붙인다.

Duolingo에서 가져올 것:
- 매일 바로 시작되는 하나의 작은 task.
- 완료 후 다음 task가 살짝 달라지는 느낌.
- 부담이 낮은 진행감.

Duolingo에서 버릴 것:
- XP, 리그, 과한 streak 압박.

### Loop 0.3: 10초 귀 트임

사용자 상황:
클래식 지식은 없지만, 짧게 들으면 무엇인가 먼저 들어온다. 이 첫 감각을 부끄럽지 않게 붙잡아야 한다.

첫 행동:
Daily 30초 앞뒤에서 "처음 먼저 들어온 건 무엇이었나요?" 같은 선택형 질문에 답하거나 건너뛴다.

얻는 보상:
정답을 맞힌 것이 아니라 내 귀가 잡은 단서가 감상지도에 남는다.

다음 방문 이유:
선율, 색채, 리듬, 긴장, 장면감 중 내가 잘 잡는 단서가 조금씩 보인다.

피할 것:
작품명 빨리 맞추기, 랭킹, 점수, 오답 표시, 과한 게임화.

필요 데이터:
`ear_opening_answer` event, answer, axis, mapClue, surface.
- 틀림/실패 중심의 피드백.
- 음악 감상을 공부 앱처럼 보이게 하는 퀴즈 과잉.

Founder Quality 기준:
5명 중 3명 이상이 첫 1분 안에 Daily step을 누르고, 추천 이유를 납득하고, 전체 듣기나 reaction을 남기고, 감상지도를 이해하고, 다음날 다시 열 이유를 말해야 Public V1 후보로 본다.

Founder Test Mode 관찰 항목:
- 첫 1분 안에 Daily 30초를 눌렀는가.
- 추천 이유를 자기 취향과 연결해서 납득했는가.
- 전체 듣기로 넘어갔는가.
- 저장 또는 reaction을 남겼는가.
- 감상지도의 열린 길/다음 길을 이해했는가.
- 내일 다시 열 이유를 자기 말로 설명했는가.

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

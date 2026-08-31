# in C V1 제품 설계

작성일: 2026-08-30

## 설계 기준

이 문서는 검증용 MVP가 아니라, 실제 사용자가 무료 앱으로 받아서 쓸 수 있는 V1을 기준으로 한다.

V1의 목표는 "기능이 있다"가 아니다. 사용자가 다음 행동을 자연스럽게 반복해야 한다.

```text
오늘 하나 들어봄 -> 마음에 걸린 지점을 남김 -> 작품이 라이브러리에 쌓임 ->
다시 들을 이유가 생김 -> 관련 공연/악보/연주자를 발견함 -> 다음 작품으로 이어짐
```

따라서 V1은 아래 세 가지가 동시에 살아야 한다.

- 무료 클래식 청취 루틴.
- 작품 중심 discovery graph.
- 공연 정보 광고/제휴가 자연스럽게 붙는 연결면.

## 제품 한 문장

```text
in C는 클래식을 어디서 들을지는 사용자가 정하게 두고, 무엇을 듣고 어디로 이어갈지는 작품
중심으로 안내하는 무료 클래식 디스커버리 앱이다.
```

## V1 성공 조건

V1이 쓸만하다고 말하려면 다음 조건을 만족해야 한다.

- 첫 실행 30초 안에 오늘 들을 작품 하나가 보인다.
- 로그인 없이도 30초/3분 듣기와 작품 탐색이 가능하다.
- 사용자는 YouTube, Spotify, Apple Music, 국내 스트리밍 앱 중 자기 습관에 맞는 곳으로 이동할 수 있다.
- 작품 상세에는 작곡가, 악장, 들을 지점, 추천 연주, 관련 공연, 악보 link가 함께 있다.
- 공연 광고는 일반 banner가 아니라 작품과 연결된 공연 정보처럼 보인다.
- 저장한 작품은 다시 들을 이유와 일정이 생긴다.
- `악기가 궁금함` 같은 reaction은 관심 편성으로 이어져 Discover 추천을 바꾼다.
- 운영자는 seed catalog, 공연, 광고, 외부 link를 admin에서 관리할 수 있다.
- 데이터는 나중에 추천과 광고 segment로 확장 가능한 구조로 쌓인다.

## 핵심 포지션

### 우리가 아닌 것

- Spotify clone.
- Apple Music Classical clone.
- 공연 예매처.
- 악보 저장소.
- 클래식 강의 앱.
- 커뮤니티 feed 앱.

### 우리가 되는 것

- 오늘 들을 클래식을 골라주는 앱.
- 처음 들어도 붙잡을 지점을 만들어주는 앱.
- 작품을 저장하고 다시 듣게 만드는 앱.
- 작품에서 공연, 악보, 연주자, 플랫폼으로 이어주는 앱.
- 공연 광고가 정보처럼 보이는 클래식 관심 graph 앱.

## 사용자 세그먼트

### Segment A: 관심은 있지만 시작점이 없는 청취자

가장 중요한 초기 segment다.

- 20-40대.
- YouTube Music, Spotify, Apple Music, Melon 중 하나는 이미 쓴다.
- 클래식을 듣고 싶지만 검색어를 모른다.
- "입문 강의"보다는 "오늘 하나 추천"을 원한다.
- 공연도 가보고 싶지만 프로그램이 낯설다.

필요한 것:

- 오늘 들을 작품 1개.
- 긴 설명보다 짧은 listening prompt.
- 부담 없는 reaction.
- 내 앱에서 전체 듣기.
- direct link가 없거나 실패하면 provider 검색 fallback.
- 공연 전 3분 preview.

### Segment B: 공연 관심자

광고 BM과 가장 빨리 연결되는 segment다.

- 이미 공연 예매 경험이 있다.
- 프로그램을 보고도 곡이 낯설어 망설인다.
- 공연 전 미리 듣기와 공연 후 기록이 있으면 좋다.

필요한 것:

- 공연 프로그램 기반 작품 묶음.
- 지역/날짜/공연장 filter.
- 관심 공연 저장.
- 예매처 link-out.
- 공연 전 듣기 queue.

### Segment C: 취미 연주자

초기 retention과 vertical depth에 좋다.

- 피아노, 바이올린, 첼로, 성악 등 취미 학습자.
- 듣는 것과 연습이 분리되어 있다.
- 쉬운 악보, 원곡 듣기, 관련 공연이 연결되면 좋다.

필요한 것:

- 악기별 작품 추천.
- 쉬운 악보/IMSLP/public-domain link.
- 연습 후보 저장.
- 나중에 Clef Practice/Chromatics로 전환.

### Segment D: 공연/레슨/공간 광고주

초기 매출 후보 segment다.

- 개인 연주자, 앙상블, 기획사, 공연장, 레슨 스튜디오, 연습실.
- 대형 광고 플랫폼에서 클래식 관심자를 정교하게 찾기 어렵다.
- 클릭뿐 아니라 작품/작곡가/악기 맥락이 필요하다.

필요한 것:

- 수동 등록 가능한 공연 캠페인.
- 작품/작곡가/악기/지역 tag.
- 노출, 클릭, 저장, 닫기, 예매 link click report.
- 과한 제작 부담 없는 sponsor preview.

## V1 정보 구조

하단 탭은 5개로 간다.

| 탭 | 핵심 목적 | 사용 빈도 |
| --- | --- | --- |
| Today | 매일 들어올 이유 | 매일 |
| Discover | 다음 작품을 찾는 곳 | 주 2-3회 |
| Library | 저장/반복/취향 축적 | 매일-주간 |
| Works | 작품/작곡가 검색 | 필요 시 |
| Concerts | 공연 전환과 광고 BM | 주간 |

`Scores`, `Practice`, `Community`, `Ads Manager`는 하단 탭에 두지 않는다. 작품 상세, 공연 상세,
운영자 도구, 후속 제품으로 분리한다.

## 화면 설계

### 1. Onboarding

목표: 사용자를 오래 붙잡지 않고 첫 작품까지 보낸다.

화면:

- 선호 언어: 기본 한국어.
- 선호 플랫폼: YouTube / Spotify / Apple Music / Melon / Genie / FLO / VIBE / Bugs / 아직 없음.
- 관심 선택: 피아노, 오케스트라, 바이올린, 첼로, 성악, 조용한 곡, 웅장한 곡, 익숙한 멜로디,
  공연 전에 듣기, 처음이라 아무거나.
- 지역 선택: 서울/경기/인천/부산/대구/대전/광주/기타/나중에.
- 알림 선택: 오늘의 작품, 공연 전 reminder, 다시 듣기.

원칙:

- 계정 생성은 건너뛸 수 있다.
- 플랫폼 연결 OAuth는 요구하지 않는다.
- 첫 작품 추천 전에 설문을 3단계 이상 넘기지 않는다.

### 2. Today

목표: 앱을 열자마자 들을 이유를 준다.

구성:

- 오늘의 작품 hero.
- 30초 듣기 button.
- 3분 듣기 button.
- 한 줄 listening prompt.
- 저장, 들림, 다시 듣기, 모르겠음 reaction.
- 내 플랫폼에서 전체 듣기.
- 이어 듣기 queue.
- 오늘의 공연 연결 card.
- 이번 주 많이 저장된 작품.

광고 위치:

- 첫 청취 영역 위에는 광고를 두지 않는다.
- 작품을 30초 이상 듣거나 저장한 뒤 하단에 `이 작품을 실제로 들을 수 있는 공연` card를 둔다.
- sponsored card는 1-2개만 둔다.
- sponsored card click은 바로 예매처로 보내지 않고 공연 상세/프로그램 맥락을 먼저 보여준다.

### 3. Work Detail

목표: 하나의 작품을 중심으로 음악, 설명, 공연, 악보, 외부 플랫폼을 연결한다.

구성:

- 작품명, 작곡가, 시대, 편성, 예상 길이.
- 왜 오늘 들을 만한지 한 줄.
- Listening moments: 30초, 3분, 악장별 주요 지점.
- 추천 recording/video 2-5개.
- Listen on provider sheet.
- 감상 prompt 2-3개.
- 내 reaction timeline.
- 관련 작품: 같은 작곡가, 같은 악기, 비슷한 분위기, 공연 전 추천.
- 관련 공연.
- sponsored 공연 card는 click event를 남긴 뒤 Concert Detail로 이어진다.
- 악보/연습 link.
- 짧은 column.

중요 UX:

- 설명은 접힌 상태로 시작하고, 듣기가 먼저 보인다.
- 작품 저장과 recording 저장을 구분한다.
- 사용자가 특정 연주를 좋아할 수 있으므로 recording별 reaction도 둔다.

### 4. Discover

목표: 검색어가 없는 사용자도 다음 작품을 찾게 한다.

진입 방식:

- 기분: 조용한, 밝은, 어두운, 웅장한, 긴장되는, 위로되는.
- 상황: 출근길, 밤, 집중, 산책, 공연 전, 처음 듣기.
- 악기: 피아노, 바이올린, 첼로, 성악, 오케스트라, 실내악.
- 시대: 바로크, 고전, 낭만, 인상주의, 현대.
- 작곡가: 바흐, 모차르트, 베토벤, 쇼팽, 드뷔시, 라흐마니노프 등.
- 공연 기반: 이번 주 공연되는 작품.

콘텐츠 shelf:

- 처음 듣기 좋은 12곡.
- 3분 안에 붙잡히는 작품.
- 이번 주 서울에서 들을 수 있는 작품.
- 피아노로 시작하는 클래식.
- 영화/광고에서 들어본 멜로디.
- 오늘 저장한 작품과 닮은 곡.

### 5. Library

목표: 사용자가 "내 클래식 취향이 쌓인다"고 느끼게 한다.

구성:

- 저장한 작품.
- 익숙해지는 중.
- 다시 들을 시간.
- 들은 작곡가.
- 관심 악기.
- 관심 공연.
- 내 감상 moments.
- 선호 플랫폼 설정.

Retention 장치:

- `다시 들을 3분`.
- `지난주에 저장한 작품`.
- `공연 전 들어둘 작품`.
- `이제 구분되는 작품`.

### 6. Works

목표: 작품/작곡가/연주자 검색과 탐색을 담당한다.

검색 단위:

- 작품.
- 작곡가.
- 악장.
- 연주자.
- 악기.
- 공연장.

검색 보조:

- 한국어/원어 alias.
- 흔한 별칭.
- "아다지오", "월광", "사계" 같은 fuzzy query.
- 정확한 작품 번호를 몰라도 찾기.

### 7. Concerts

목표: 공연 정보 광고 BM의 핵심 화면이 되되, 사용자에게는 공연 discovery로 느껴지게 한다.

구성:

- 내 관심 작품의 공연.
- 내 지역 공연.
- 이번 주 처음 가기 좋은 공연.
- 공연 전 3분 preview.
- 작곡가별 공연.
- 악기별 공연.
- 공연장별 공연.
- sponsored 공연 card.

공연 card 필수 정보:

- 공연명.
- 날짜/시간.
- 장소/지역.
- 프로그램 중 in C와 matching된 작품.
- 출연자/단체.
- 가격대는 공식 제공/등록된 경우만 표시.
- 예매처 CTA.
- 광고/협찬 표기.

## 콘텐츠 설계

### Seed catalog 규모

MVP 수준의 30-50개가 아니라, V1은 최소 300개 작품을 목표로 한다.

권장 구성:

- 초입문 anchor works: 80개.
- 공연장에서 자주 만나는 works: 100개.
- 악기별 대표 works: 80개.
- 성악/오페라/합창: 40개.
- 한국 사용자가 자주 접하는 광고/영화/드라마 친숙 works: 30개.
- long-tail discovery 후보: 50개.

총 300-400개로 시작하고, 운영으로 1,000개까지 늘린다.

### 작품 metadata

필수:

- titleKo.
- titleOriginal.
- composerKo.
- composerOriginal.
- period.
- instrumentation.
- approximateDuration.
- difficultyForListening.
- moodTags.
- contextTags.
- aliases.
- externalIds.

선택:

- key.
- catalogNumber.
- movements.
- premiere.
- country.
- forms.
- relatedWorks.

### Listening moments

작품마다 최소 1개, 주요 작품은 3-5개를 만든다.

형식:

```text
Moment
- label: "처음 붙잡을 30초"
- startSeconds
- endSeconds
- prompt: "낮은 현이 반복해서 긴장을 만드는지 들어보세요."
- tags: ["repetition", "strings", "tension"]
```

원칙:

- 이론 용어보다 들리는 현상을 우선한다.
- 한 moment는 하나의 질문만 가진다.
- "정답"을 요구하지 않는다.
- 어려운 작품일수록 더 짧게 시작한다.

### Recording curation

작품마다 최소 2개 이상 외부 listening option을 둔다.

- 무료 접근성 높은 YouTube.
- 대형 플랫폼 link: Spotify, Apple Music.
- 국내 플랫폼 link: Melon 등 수동 등록.
- public-domain recording 가능 시 별도 표시.

recording metadata:

- provider.
- title.
- performer.
- conductor.
- ensemble.
- year.
- duration.
- movement.
- url.
- qualityStatus.
- curatorNote.

### Column

긴 글 중심 앱이 아니므로 column은 짧아야 한다.

권장 길이:

- 작품 한 줄: 40자 내외.
- 듣기 전 note: 300자 내외.
- 공연 전 note: 500자 내외.
- 깊게 보기: 별도 접힘.

좋은 문장:

- "이 곡은 처음부터 이해하기보다, 같은 리듬이 몇 번 돌아오는지만 들어도 충분합니다."
- "오늘은 2악장 전체보다 첫 40초의 호흡만 기억해도 됩니다."

피해야 할 문장:

- "반드시 알아야 할 명곡."
- "클래식 입문자 필수 교양."
- "이 곡의 소나타 형식은..."

## 추천 시스템

V1 추천은 완전한 ML보다 rule + editorial + user signal hybrid가 맞다.

### User signals

- 저장한 작품.
- 30초/3분 완료.
- 전체 듣기 link click.
- reaction type.
- 다시 듣기 완료.
- 관심 악기.
- 관심 작곡가.
- 지역.
- 공연 card click/save/dismiss.
- 악보/연습 link click.

### 추천 shelf logic

Today:

- 아직 듣지 않은 anchor work.
- 최근 저장한 작품의 repeat due.
- 관심 악기/분위기와 맞는 작품.
- 이번 주 관심 지역 공연과 연결된 작품.

Discover:

- mood tag.
- instrumentation.
- period.
- composer relation.
- work similarity.
- concert availability.

Concerts:

- saved work match.
- composer match.
- instrument match.
- region match.
- date proximity.
- sponsored priority with relevance floor.

### Relevance floor

공연 광고는 아무리 sponsored라도 relevance floor를 통과해야 한다.

최소 조건 중 하나:

- 사용자가 저장한 작품과 직접 연결.
- 저장한 작곡가와 연결.
- 관심 악기와 연결.
- 선택 지역 안의 클래식 공연.
- 사용자가 본 Discover shelf와 연결.

관련성이 없는 광고는 노출하지 않는다.

## 광고/제휴 설계

### BM 우선순위

1. 공연 정보 광고.
2. 공연 전 preview sponsor.
3. 연주자/앙상블 spotlight.
4. 레슨/클래스 광고.
5. 악보/교재/연습실 제휴.
6. 장기적으로 광고 제거/고급 기능 구독.

구독은 V1 중심 BM이 아니다.

### 광고 상품

#### 작품 연결 공연 카드

가장 중요한 상품이다.

노출:

- Work Detail 관련 공연.
- Today 하단.
- Concerts의 내 관심 작품 section.

과금 후보:

- 고정 게재.
- CPC.
- 예매처 click 기반 CPA는 제휴 후.

#### 공연 전 3분 preview 스폰서

공연 프로그램을 in C에서 듣기 쉬운 queue로 묶어준다.

구성:

- 공연 소개 card.
- 프로그램 중 2-4개 작품.
- 각 작품의 30초/3분 moment.
- 예매 CTA.

이 상품은 작은 기획사/앙상블에게 매력적이다. 단순 banner보다 "공연 전에 들어보고 가세요"라는
콘텐츠가 되기 때문이다.

#### 연주자/앙상블 spotlight

작품, 악기, 지역 context에서 노출한다.

예:

- "이번 주 첼로로 들을 공연."
- "드뷔시를 연주하는 젊은 연주자."
- "서울 실내악 공연."

#### 레슨/클래스/악보 제휴

초기에는 공연보다 후순위다. 다만 취미 연주자 segment에서는 강력하다.

노출:

- 악보 보기 후.
- 같은 작품을 3회 이상 들은 뒤.
- 악기 관심이 명확한 사용자.

### 광고 운영 도구

V1부터 간단한 admin은 필요하다.

기능:

- 공연/광고 등록.
- 작품/작곡가/악기/지역 tag 매칭.
- 노출 기간.
- 예매 URL.
- sponsor label.
- preview 상태.
- 노출 위치 선택.
- 품질 검수 상태.
- basic report.

Report:

- impressions.
- clicks.
- saves.
- dismisses.
- CTR.
- save rate.
- related work clicks.
- ticket destination clicks.

### 사용자 보호 원칙

- 첫 화면 첫 영역에 광고를 두지 않는다.
- 청취 중 audio ad를 넣지 않는다.
- 관련성 없는 banner network를 붙이지 않는다.
- sponsored 표기는 명확히 한다.
- 사용자 관심 graph는 민감 데이터처럼 다룬다.
- 광고 segment는 개인 식별이 아니라 cohort 단위로 제공한다.

## 기존 플랫폼 연결

V1은 platform-native super app이 아니라 platform router다.

### P0 연결

- YouTube embed/link-out.
- Spotify embed/link-out.
- KOPIS 공연 data 또는 동일 shape 수동 data.
- MusicBrainz/Wikidata ID.
- 예매처 URL 수동 등록.

### P1 연결

- Apple Music link-out/MusicKit.
- Melon/Genie/FLO/VIBE/Bugs link-out.
- IMSLP 작품/악보 link.
- CLASSIKA/KBS KONG partnership 후보.

### P2 연결

- Calendar save.
- Apple Music library write-back.
- Spotify playlist export.
- Linkfire/API based smart link campaign.
- 광고주 self-serve.

## 데이터 모델

V1 데이터는 나중에 추천/광고/제휴로 확장 가능해야 한다.

```text
User
- id
- locale
- region
- preferredPlatforms
- onboardingState
- notificationSettings
- createdAt

Composer
- id
- nameKo
- nameOriginal
- birthYear
- deathYear
- period
- country
- aliases
- externalIds

Work
- id
- titleKo
- titleOriginal
- composerId
- period
- instrumentation
- durationSeconds
- catalogNumber
- moodTags
- contextTags
- difficultyForListening
- aliases
- externalIds
- curationStatus

Movement
- id
- workId
- title
- order
- durationSeconds

Recording
- id
- workId
- movementId
- provider
- title
- performer
- conductor
- ensemble
- year
- durationSeconds
- url
- externalId
- qualityStatus
- displayPriority

ListeningMoment
- id
- workId
- movementId
- recordingId
- label
- startSeconds
- endSeconds
- prompt
- tags
- displayPriority

UserWorkState
- userId
- workId
- saved
- familiarityLevel
- firstListenedAt
- lastListenedAt
- repeatDueAt
- totalMomentCompletions
- reactionCounts

Reaction
- id
- userId
- workId
- movementId
- recordingId
- momentId
- type
- note
- occurredAt

ExternalPlatform
- id
- name
- category
- urlScheme
- webBaseUrl
- appStoreUrl
- isActive

ExternalLink
- id
- entityType
- entityId
- platformId
- url
- externalId
- linkType
- displayPriority
- verifiedAt
- status

Concert
- id
- title
- organizer
- venueId
- region
- startsAt
- endsAt
- sourceId
- officialUrl
- status

Venue
- id
- name
- region
- address
- lat
- lng
- officialUrl

ConcertProgramItem
- id
- concertId
- workId
- composerId
- titleRaw
- order
- matchStatus

ConcertPromotion
- id
- concertId
- advertiserName
- sponsorLabel
- campaignType
- startsAt
- endsAt
- targetRegions
- targetWorkIds
- targetComposerIds
- targetInstruments
- status

TicketDestination
- id
- concertId
- promotionId
- platformName
- url
- trackingCode
- isPrimary

EventLog
- id
- userId
- eventType
- entityType
- entityId
- context
- properties
- occurredAt
```

## 운영 시스템

### Catalog Ops

초기에는 자동 수집보다 curated DB가 중요하다.

업무:

- 작품 seed 선정.
- 한국어 title/alias 정리.
- composer/work 외부 ID 매칭.
- YouTube/Spotify/Apple/Melon link 검수.
- listening moment 제작.
- 관련 공연 매칭.

필요 화면:

- Work list.
- Work editor.
- External link checker.
- Moment editor.
- Duplicate/alias merge queue.
- Curation status board.

### Concert Ops

공연 정보는 KOPIS/import와 수동 등록이 섞인다.

업무:

- 공연 import.
- 클래식 genre filter.
- 프로그램 raw text 정리.
- Work matching.
- 예매 URL 등록.
- 광고 여부 설정.
- 노출 기간 관리.

필요 화면:

- Concert list.
- Concert detail editor.
- Program matching tool.
- Promotion campaign editor.
- Sponsor report.

### Editorial Ops

Today와 Discover는 완전 자동화보다 편집 레이어가 있어야 한다.

업무:

- Today hero 선정.
- seasonal shelf.
- 공연 전 preview shelf.
- 초입문 collection.
- push notification copy.
- 품질 검수.

## 기술 범위

### Client

우선순위:

- Mobile-first responsive web 또는 existing app shell 안의 webview/renderer.
- 이후 iOS/Android native wrapper.

필요 기능:

- Today/Discover/Library/Works/Concerts.
- embedded player area.
- provider sheet.
- local-first saved state.
- account sync.
- event tracking.
- notification.

### Backend

필요 module:

- Catalog API.
- User state API.
- Recommendation API.
- Concert API.
- Promotion API.
- Event ingestion.
- Admin API.
- External import jobs.

### Storage

- relational DB: catalog, concerts, promotions, users.
- object storage: generated artwork, preview images, admin uploads.
- analytics/event store: event log and aggregation.
- search index: works, composers, aliases, concerts.

### Search

V1 search는 중요하다.

필요:

- 한국어/영문/원어 alias.
- typo tolerant search.
- composer + work combined query.
- "월광", "사계", "G선상의 아리아" 같은 별칭.
- 공연 프로그램 raw text matching.

### Analytics

핵심 event:

- app_open.
- onboarding_complete.
- work_impression.
- moment_play_start.
- moment_play_complete.
- provider_click.
- work_save.
- reaction_add.
- repeat_complete.
- concert_impression.
- concert_click.
- concert_save.
- promotion_dismiss.
- ticket_click.
- score_click.

## 품질 기준

### UX

- 첫 화면에서 사용자가 뭘 해야 하는지 3초 안에 보여야 한다.
- 첫 청취 CTA는 항상 보인다.
- 광고 card는 content card보다 더 튀면 안 된다.
- 작품 상세에서 설명보다 듣기가 위에 있어야 한다.
- 긴 클래식 title은 줄바꿈과 축약이 안정적이어야 한다.
- 외부 플랫폼으로 나갔다 돌아와도 상태가 유지되어야 한다.

### Content

- seed 작품의 외부 link는 모두 사람이 확인한다.
- listening prompt는 한 문장으로 시작한다.
- 작품 번호/악장 표기는 일관되게 한다.
- 광고 공연은 최소한 날짜/장소/프로그램/예매 link가 있어야 한다.

### Trust

- sponsored 표기는 숨기지 않는다.
- 저작권이 애매한 음원/악보는 직접 host하지 않는다.
- 외부 platform availability를 과장하지 않는다.
- 개인정보/관심사는 광고주에게 개인 단위로 넘기지 않는다.

## 출시 단계

### Alpha: 내부 사용 가능

목표:

- 매일 1곡을 듣고 저장하는 flow가 된다.
- 작품 상세/외부 link/공연 card가 연결된다.

범위:

- 작품 100개.
- 공연 seed 50개.
- YouTube/Spotify link.
- Today/Work Detail/Library.
- event tracking.

### Private Beta: 클래식 관심자 100-300명

목표:

- 7일 내 재방문과 저장률을 본다.
- 공연 card가 정보로 받아들여지는지 본다.

범위:

- 작품 300개.
- Concerts 탭.
- Discover shelves.
- KOPIS/import 또는 수동 feed.
- 공연 promotion report.
- preferred platform setting.

### Public Beta: 무료 배포

목표:

- "무료 클래식 디스커버리 앱"으로 acquisition을 시작한다.
- 공연 광고 상품을 concierge 방식으로 판다.

범위:

- 작품 500-800개.
- 공연 1,000건 이상 누적/수동+import.
- sponsor preview.
- admin console.
- push notification.
- search.
- 계정 sync.

### V1 Launch

목표:

- 일반 사용자가 매주 쓸 이유와 광고주가 구매할 이유를 모두 만든다.

범위:

- 작품 1,000개 이상.
- 주요 외부 플랫폼 link coverage.
- 안정적인 공연 import/matching.
- 광고 campaign/report.
- 추천 shelf 고도화.
- 악보/연습 bridge.
- 앱스토어/웹 배포.

## 성공 지표

### User activation

- 첫 방문 30초/3분 듣기 시작률.
- 첫 방문 작품 저장률.
- 첫 방문 provider click률.
- onboarding skip 후에도 작품 듣기까지 도달하는 비율.

### Retention

- D1/D7/D30 retention.
- 7일 내 repeat listening.
- 저장 작품 수.
- 익숙해지는 중 queue 완료율.
- push open 후 listening 완료율.

### Discovery quality

- Discover shelf click률.
- 검색 성공률.
- 추천 작품 저장률.
- 같은 작곡가/악기 기반 이어듣기 전환.

### Concert/Ad

- 공연 card CTR.
- 공연 card save rate.
- ticket destination click률.
- sponsored card dismiss율.
- 작품 직접 연결 공연 vs 지역 기반 공연 성과.
- 광고주별 report 재구매 의향.

### Content ops

- 작품 link coverage.
- broken link rate.
- 공연 matching accuracy.
- prompt production throughput.
- admin review time.

## 제품 리스크와 대응

### 음원을 직접 제공하지 않아 UX가 약해질 수 있음

대응:

- 30초/3분 moment를 embed/link 기반으로 최대한 가볍게 제공한다.
- provider sheet를 잘 만들어 사용자의 기존 앱으로 자연스럽게 보낸다.
- link-out 후 돌아왔을 때 저장/reaction을 이어갈 수 있게 한다.

### 클래식 metadata가 복잡함

대응:

- 내부 `Work`를 중심 ID로 고정한다.
- 원어/한국어/별칭 alias를 별도 관리한다.
- 자동 import 후 사람이 검수하는 queue를 둔다.

### 공연 광고가 스팸처럼 보일 수 있음

대응:

- first listening 영역 위에 광고를 두지 않는다.
- relevance floor를 통과한 공연만 노출한다.
- dismiss signal을 강하게 반영한다.
- sponsor label은 명확히 표시한다.

### 콘텐츠 운영 비용이 클 수 있음

대응:

- 1,000개 작품 전체를 깊게 쓰지 않는다.
- anchor 작품에만 3-5개 moment를 만들고, 나머지는 1개 moment로 시작한다.
- MusicBrainz/Wikidata/IMSLP/KOPIS를 backbone으로 쓰되, 사용자-facing copy는 내부에서 짧게 쓴다.

### 국내 공연 데이터가 작품 단위로 잘 맞지 않을 수 있음

대응:

- 공연 프로그램 raw text matching + 수동 검수.
- 광고 공연은 광고주가 직접 작품 tag를 제공하게 한다.
- 불확실한 matching은 "관련 가능"으로 낮춰 노출한다.

## 의사결정

V1은 "작게 검증하는 앱"이 아니라 "무료로 배포 가능한 클래식 청취/공연 연결 서비스"로 만든다.
다만 무거운 음원 라이선스, 실시간 커뮤니티, 완전 자동 추천, 광고주 self-serve는 뒤로 둔다.

우리가 먼저 완성해야 할 것은 다음이다.

```text
작품 catalog + listening moment + 외부 플랫폼 연결 + 공연 연결 + 저장/반복 루틴 + 운영 도구
```

이 여섯 가지가 살아 있으면 in C는 단순 유틸앱이 아니라, 실제 사용자 flow와 광고 BM을 가진
상용 서비스의 형태를 갖춘다.

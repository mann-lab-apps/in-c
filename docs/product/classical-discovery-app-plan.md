# 클래식 디스커버리 앱 기획

작성일: 2026-08-30

## 배경

사용자 규모가 가장 큰 음악앱 종류는 음악 스트리밍/디스커버리다. Spotify는 2026 Q2에
777M MAU와 300M Premium subscribers를 보고했고, YouTube Music/Premium과 Tencent Music도
1억 명 이상 결제/구독 규모를 가진다. 음악 학습, 악보, 튜너, 메트로놈 앱은 큰 제품도
있지만 스트리밍/디스커버리 카테고리보다 사용자 풀과 일상 접점이 작다.

다만 in C가 음원 라이선스를 직접 확보해 Spotify를 복제하는 것은 현실적이지 않다.
따라서 앱의 종류는 streaming clone이 아니라 **음원을 직접 소유하지 않는 클래식 음악
디스커버리 companion**으로 잡는다.

## 제품 정의

`in C`는 클래식을 잘 몰라도 무료로 오늘 들을 작품을 발견하고, 들린 지점을 남기고, 공연과
악보와 사람들의 질문으로 이어갈 수 있는 클래식 청취 앱이다.

## 핵심 가설

클래식 입문자는 "음원을 못 구해서"가 아니라 다음 문제 때문에 오래 머물지 못한다.

- 무엇부터 들어야 할지 모른다.
- 듣는 중 어디를 붙잡아야 할지 모른다.
- 들어도 할 말이 없다고 느낀다.
- 작품, 악보, 공연, 해설, 커뮤니티가 흩어져 있다.
- 좋아질 때까지 반복해서 듣는 구조가 없다.

in C는 이 문제를 해결하기 위해 곡 하나를 `재생할 음원`이 아니라 `반복해서 가까워지는
음악 객체`로 다룬다.

## 한국인 타겟 외 부각할 장점

한국어 특화는 초기 획득과 신뢰에 유리하지만, 그것만으로 제품이 커지기는 어렵다.
다음 장점들을 함께 전면에 둔다.

### 1. 음원보다 작품 중심

Spotify/YouTube Music은 track과 artist 중심이다. 클래식에서는 같은 작품도 악장, 편곡,
지휘자, 연주자, 악보, 공연 맥락에 따라 경험이 달라진다. in C는 track playlist가 아니라
작품 페이지를 중심 객체로 둔다.

```text
작품 -> 악장 -> 추천 녹음/영상 -> 악보 -> 감상 질문 -> 관련 공연 -> 연습 모드
```

### 2. "들은 것"을 기록하는 감상 UX

리뷰를 잘 쓰게 하는 앱이 아니라, 듣는 중 작은 지점을 남기게 한다.

- 반복이 들렸음.
- 악기가 바뀐 것 같음.
- 긴장이 풀린 지점.
- 모르겠지만 좋았던 순간.
- 다시 듣고 싶은 20초.

이 데이터는 사용자의 취향을 더 세밀하게 만들고, 나중에 광고/추천에서도 강한 신호가 된다.

### 3. 클래식의 long-tail discovery

대형 스트리밍 앱의 추천은 대중음악과 최신 소비 패턴에 최적화되어 있다. 클래식은 유명
작곡가와 대표곡으로 쏠리기 쉽다. in C는 입문자에게 과도한 지식을 요구하지 않으면서도
작품, 시대, 편성, 분위기, 감상 질문으로 long-tail을 열 수 있다.

### 4. 저작권 리스크가 낮은 시작점

초기에는 음원을 직접 호스팅하지 않는다.

- YouTube/Spotify/Apple Music link-out 또는 embed.
- public-domain 음원과 직접 확보 음원만 자체 player.
- public-domain 악보, 직접 제작 MusicXML, 사용자 업로드 자료 중심.

서비스의 중심 가치는 음원 파일이 아니라 곡 주변의 탐색, 감상, 관계, 연습 데이터다.

### 5. 광고 의도가 선명한 음악 그래프

일반 음악앱의 광고 타겟팅은 장르, mood, playlist, artist fan base, listening context에
가깝다. in C는 클래식 안에서 더 구매 의도에 가까운 신호를 만들 수 있다.

- 특정 공연장/지역 공연 관심.
- 특정 작곡가/작품 반복 청취.
- 악기별 관심과 연습 기록.
- 레슨/클래스 탐색.
- 악보 다운로드/저장.
- 공연 전후 감상 참여.

이 신호는 특히 공연 정보 광고와 잘 맞는다. 공연은 특정 작품, 작곡가, 악기, 지역, 날짜가
명확하기 때문에 일반 배너보다 사용자의 다음 행동으로 보이기 쉽다. 이후 레슨, 악기점, 악보
출판사, 음반/굿즈, 문화공간, 대학/콩쿠르/워크숍 광고로 확장한다.

### 6. 청취에서 연습으로 이어지는 vertical depth

스트리밍 앱은 들은 뒤 끝나는 경우가 많다. in C는 사용자가 어느 작품에 충분히 익숙해지면
Chromatics/Clef Practice로 이어질 수 있다.

```text
듣기 -> 악보 보기 -> 쉬운 편곡 열기 -> 구간 연습 -> 레슨/공연 연결
```

이 depth는 단순 광고 지면보다 더 높은 충성도와 결제 전환을 만들 수 있다.

### 7. 조용한 앱 포지션

대형 음악앱은 계속 재생하고 오래 머물게 만든다. in C는 "오늘 하나를 제대로 듣고 나가도
괜찮은 앱"이 될 수 있다. 클래식 사용자에게는 이 조용함이 오히려 신뢰가 된다.

## 타겟 사용자

### Primary

- 클래식에 관심은 있지만 무엇부터 들을지 모르는 20-40대.
- 공연을 가보고 싶지만 작품과 프로그램이 낯선 사람.
- 음악을 공부하지 않았지만 감상 취향을 조금씩 쌓고 싶은 사람.

### Secondary

- 악기를 배우는 취미 연주자.
- 레슨/클래스/공연을 홍보하고 싶은 음악가와 교육자.
- 공연장, 기획사, 악보/음반/악기 관련 브랜드.

## 핵심 유저 플로우

### 1. 첫 진입

```text
관심 선택 -> 오늘 들을 작품 3개 추천 -> 30초 preview -> 하나 선택
```

관심 선택지는 전문 용어보다 감각 중심으로 둔다.

- 조용한 곡.
- 웅장한 곡.
- 익숙한 멜로디.
- 피아노.
- 오케스트라.
- 공연 전에 듣기.
- 공부/작업 중 듣기.
- 처음이라 아무거나.

### 2. 작품 듣기

```text
작품 페이지 -> 30초 먼저 듣기 -> 짧은 질문 -> 전체 듣기 link/embed
```

작품 페이지 구성:

- 작품명, 작곡가, 짧은 한 줄.
- 30초/3분/전체 듣기.
- "여기서 무엇이 반복되나요?" 같은 감상 질문.
- 연주 버전 2-3개.
- 악보 preview.
- 관련 공연/Columns/질문.

### 3. 들린 지점 남기기

사용자는 긴 글을 쓰지 않아도 된다.

- 다시 듣고 싶음.
- 익숙해짐.
- 악기가 궁금함.
- 여기가 좋음.
- 아직 모르겠음.

이 행동을 timestamp나 section과 연결한다.

### 4. 반복 청취

```text
내 라이브러리 -> 익숙해지는 중 -> 오늘 다시 들을 3분 -> 완료
```

Clef의 spaced repetition 감각을 듣기에도 적용한다. "작품을 외우게 한다"기보다, 사용자가
곡을 구분하고 좋아지는 데 필요한 반복 노출을 만든다.

### 5. 악보/연습 전환

```text
이 멜로디 연주해보기 -> 쉬운 악보 열기 -> Chromatics/Clef Practice
```

처음에는 public-domain 단선율, 쉬운 피아노 편곡, MusicXML demo로 제한한다.

### 6. 공연 전환

```text
이 작품 공연 있음 -> 지역/날짜 확인 -> 관심 저장 -> 공연 전 3분 preview
```

광고 지면으로도 자연스럽다. 사용자는 이미 작품에 관심을 보였고, 공연은 그 관심의 다음
행동이다.

## 첫 버전 정보 구조

### 탭

| 탭 | 역할 |
| --- | --- |
| Today | 오늘 들을 작품, 이어 듣기, 반복 청취 카드 |
| Discover | 큐레이션, mood, 악기, 작곡가, 시대, 공연 전 추천 |
| Library | 저장한 작품, 들은 작품, 익숙해지는 중, 연습 후보 |
| Works | 작품 검색과 상세 |
| Concerts | 작품과 연결된 공연, 광고/제휴 후보 |

`Scores`는 첫 하단 탭으로 두지 않는다. 악보 preview와 Chromatics/Clef Practice 연결은 작품
상세의 다음 행동으로 시작한다. 초기 top funnel은 무료 청취와 공연 전환에 맞춘다.

### 작품 페이지

- 대표 녹음/영상 링크.
- 30초 preview card.
- 감상 질문.
- 연주 버전 비교.
- 악보 보기.
- 관련 Column.
- 관련 공연.
- 사용자 반응.

## 광고/제휴 플랫폼 가설

첫 BM은 **무료 앱 + 공연 정보 광고**다. 구독은 MVP의 중심 BM으로 두지 않는다. 사용자 규모와
관심 signal을 먼저 만들고, 광고는 작품/작곡가/악기/지역 맥락에 맞는 정보형 카드로 제공한다.

기존 플랫폼과는 경쟁보다 연결을 우선한다. in C는 YouTube, Spotify, Apple Music, 국내
스트리밍 앱, KOPIS, 예매처, IMSLP, MusicBrainz/Wikidata를 작품 페이지 아래 묶는 router가
된다. 상세 전략은 [기존 플랫폼 연결 전략](platform-connection-strategy.md)을 따른다.

### 광고주 후보

- 공연장과 기획사.
- 개인 연주자/앙상블.
- 레슨, 클래스, 마스터클래스.
- 악기점, 조율사, 연습실.
- 악보 출판사, 음반/굿즈, 문화예술 브랜드.
- 대학, 콩쿠르, 캠프, 워크숍.

### 광고 상품

| 상품 | 설명 | 초기 구현 |
| --- | --- | --- |
| 작품 연결 공연 카드 | 특정 작품 페이지와 Today 카드에 공연 노출 | 수동 등록 |
| 지역 공연 추천 | 사용자의 지역/관심 작곡가 기반 공연 노출 | 지역/날짜 필터 |
| 공연 전 preview 스폰서 | 공연 프로그램을 3분 듣기 카드로 제작 | concierge 운영 |
| 레슨/클래스 카드 | 악기/수준/관심 작품 기반 추천 | 신청 링크 |
| 악보/교재 추천 | 악보 보기/연습 전환 지점에 노출 | 제휴 링크 |

### 광고 원칙

- 청취 중간을 깨는 audio ad는 초기에는 피한다.
- 작품/공연/악보/레슨 맥락과 관련 없는 배너는 넣지 않는다.
- 광고도 "다음에 할 수 있는 음악 행동"처럼 보여야 한다.
- 광고주가 직접 셀프서브하기 전까지는 수동 등록/검수로 품질을 유지한다.
- Today와 작품 상세의 핵심 청취 영역 위에는 광고를 두지 않는다.
- 공연 광고는 `광고` 또는 `sponsored` 표기를 유지하되, 공연명/날짜/장소/프로그램 정보가 먼저
  읽히게 한다.

### 초기 공연 광고 data

공연 광고는 다음 단위로 등록한다.

```text
ConcertPromotion
- id
- title
- organizer
- venue
- region
- startsAt
- ticketUrl
- relatedWorkIds
- relatedComposerIds
- instruments
- sponsorLabel
- status
```

초기 타겟팅은 자동화하지 않고 다음 규칙으로 충분하다.

- 작품 상세: relatedWorkIds가 일치하는 공연.
- 작곡가 페이지: relatedComposerIds가 일치하는 공연.
- Today 하단: 사용자가 저장한 작곡가/악기와 일치하는 공연.
- Concerts 탭: 지역/날짜/악기 필터.

## MVP와 V1의 관계

이 문서의 MVP는 빠른 검증 단위다. 다만 현재 제품 방향은 단순 MVP에 머물지 않고, 무료로 배포해도
쓸만한 V1 수준까지 올려 잡는다. V1 범위와 품질 기준은 [in C V1 제품 설계](classical-discovery-v1-product-blueprint.md)를 따른다.

## MVP

### 목표

30일 안에 "클래식 디스커버리 앱으로 매일 들어올 이유가 있는가"를 검증한다.

### 포함 범위

- Today 화면.
- 작품 30-50개 seed catalog.
- 외부 음원 링크/영상 embed.
- 작품 상세.
- 감상 반응 버튼.
- 내 라이브러리 저장.
- 반복 청취 Continue card.
- 관련 악보/Columns/공연 연결 슬롯.
- 공연 광고 후보를 수동으로 넣을 수 있는 data model.
- 공연 카드 click/save/dismiss event.
- 무료 사용을 전제로 한 no-paywall flow.

### 제외 범위

- 자체 상업 음원 streaming.
- 자동 추천 알고리즘.
- 실시간 커뮤니티 feed.
- 결제/광고주 self-serve.
- 구독 paywall.
- AI audio-to-score.
- 완전한 연습 채점.

## 데이터 모델 초안

```text
Work
- id
- title
- composer
- period
- instrumentation
- duration
- moodTags
- listeningPrompts

RecordingLink
- id
- workId
- provider
- url
- performer
- year
- label
- isPrimary

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

ListeningMoment
- id
- workId
- label
- startSeconds
- endSeconds
- prompt

UserWorkState
- userId
- workId
- saved
- familiarityLevel
- lastListenedAt
- repeatDueAt
- reactionCounts

PromotionSlot
- id
- workId
- type
- title
- advertiserName
- targetUrl
- startsAt
- endsAt
- status

ConcertPromotion
- id
- title
- organizer
- venue
- region
- startsAt
- ticketUrl
- relatedWorkIds
- relatedComposerIds
- instruments
- sponsorLabel
- status

TicketDestination
- id
- concertPromotionId
- platformName
- url
- trackingCode
- isPrimary

PromotionEvent
- id
- userId
- promotionId
- eventType
- occurredAt
```

## 성공 지표

초기에는 광고 매출보다 engagement quality를 본다.

- 첫 방문자가 작품 하나를 저장하는 비율.
- 30초 preview 후 전체 듣기로 넘어가는 비율.
- 감상 반응을 남긴 비율.
- 7일 내 같은 작품을 다시 듣는 비율.
- 작품 페이지에서 공연/악보/Column으로 이동한 비율.
- 공연 카드 클릭률.
- 공연 카드 저장률.
- 공연 카드 dismiss율.
- "이 앱 덕분에 다음에 들을 곡을 찾았다"는 정성 응답.

광고 플랫폼 가능성은 다음 지표로 본다.

- 작품/작곡가/악기 관심 segment가 충분히 생기는가.
- 공연 카드가 일반 배너보다 자연스럽게 클릭되는가.
- 작품과 직접 연결된 공연 카드가 지역 기반 공연 카드보다 강한가.
- 광고주가 직접 성과를 이해할 수 있는 report를 만들 수 있는가.
- 사용자가 광고를 정보로 받아들이는가.

## 구현 순서

1. `site` 또는 renderer에 Today/Discover prototype을 만든다.
2. seed catalog JSON을 만든다.
3. 작품 상세과 외부 recording link를 연결한다.
4. save/reaction/listening history를 local first로 저장한다.
5. 공연/악보/Column 연결 슬롯을 붙인다.
6. 수동 promotion data를 표시한다.
7. 공연 카드 click/save/dismiss event를 기록한다.
8. 사용성 테스트 후 계정/cloud 저장과 광고주 등록 흐름을 결정한다.

## 제품 판단

이 앱의 첫 화면은 악보 편집기가 아니다. 첫 화면은 **오늘 들을 작품**이어야 한다.

Chromatics와 Clef Practice는 앱의 핵심 엔진이지만 top funnel은 아니다. 사용자는 먼저 듣고,
익숙해지고, 좋아하게 된 뒤에 악보와 연습으로 넘어간다. 이 순서가 사용자 규모가 큰
음악앱 카테고리와 현재 in C의 자산을 동시에 살리는 길이다.

## 참고한 레퍼런스

- Spotify Q2 2026 earnings:
  https://newsroom.spotify.com/2026-08-04/spotify-q2-2026-earnings/
- Spotify Ads targeting:
  https://ads.spotify.com/en-CA/help-center/targeting-options/
- Spotify ad formats:
  https://ads.spotify.com/en-US/ad-formats/
- Spotify advertising strategy:
  https://newsroom.spotify.com/2026-05-21/investor-day-ads-business-growth/
- YouTube Music/Premium 125M milestone:
  https://blog.youtube/inside-youtube/20-years-125-million-subscribers-lyor-cohen/
- Tencent Music 2025 operational metrics:
  https://ir-tc.tencentmusic.com/2026-03-17-Tencent-Music-Entertainment-Group-Announces-Fourth-Quarter-and-Full-Year-2025-Unaudited-Financial-Results

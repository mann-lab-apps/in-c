# Discovery App Retention Patterns

Date: 2026-09-04
Product: in C classical discovery
Scope: product strategy research, not implementation

## Executive Read

in C가 지금 구미가 덜 당기는 이유는 콘텐츠가 부족해서라기보다 반복 사용 상황이 약하기 때문이다.
대형 디스커버리 앱은 대부분 다음 중 하나를 강하게 가진다.

- 지금 바로 소비할 수 있는 콘텐츠: Spotify, YouTube Music, Netflix, TikTok
- 다시 돌아올 개인 기록: Watcha Pedia, Letterboxd, Goodreads, Strava
- 매일 해야 하는 작은 루틴: Duolingo, Headspace
- 시간/장소 기반 긴급성: Fever, DICE, Interpark Ticket, Yes24 Ticket, KOPIS
- 저장할수록 더 좋아지는 취향 그래프: Pinterest, Netflix, Melon, Spotify

in C는 음원을 직접 재생하지 않기 때문에 Spotify의 핵심 루프를 그대로 복제할 수 없다.
대신 Netflix/Pinterest/Watcha식 "선택과 취향 지도"와 DICE/Fever식 "이벤트 기반 긴급성"을 결합하는 편이 더 강하다.

권고 포지션은 다음이다.

> 공연 전 10분 프리뷰 + 공연 후 취향 회고가 있는 클래식 디스커버리 앱

## Reference Retention Matrix

| App | Core Promise | First Hook | Comeback Trigger | Personalization Input | Main Retention Loop | in C 적용 가능성 |
| --- | --- | --- | --- | --- | --- | --- |
| [Spotify](https://newsroom.spotify.com/2021-10-13/adding-that-extra-you-to-your-discovery-oskar-stal-spotify-vice-president-of-personalization-explains-how-it-works/) | 지금 들을 음악을 즉시 재생 | 좋아하는 아티스트 선택 후 홈 추천 | Discover Weekly, Release Radar, Made for You Mix | 청취 기록, 저장, 팔로우, 검색, playlist | 듣기 -> 취향 신호 -> 자동 mix 개선 -> 다시 듣기 | 중간. 추천 확장 방식은 참고 가능하지만 직접 재생 부재가 치명적 |
| [YouTube Music](https://support.google.com/youtubemusic/answer/13468882?hl=en) | 영상/음악을 짧게 훑고 바로 전체 재생 | Samples의 짧은 personalized preview | 새 sample feed, mix, related video | 시청/청취, 좋아요, 저장, 검색 | short preview -> save/full play -> feed 개선 -> 재방문 | 높음. 30초/3분 moment와 가장 직접적으로 연결됨 |
| [Apple Music](https://www.apple.com/apple-music/) | 고품질 음악 구독과 개인화 발견 | listening history 기반 suggestion, concerts near you | favorite artist 알림, personalized playlist | 청취, artist favoriting, 기기/상황 | 듣기 -> 라이브러리/알림 -> 새 음악/공연 -> 재방문 | 중간. 외부 플랫폼 연결과 공연 근처 추천은 참고 가능 |
| [Apple Music Classical](https://apps.apple.com/us/app/apple-music-classical/id1598433714) | 클래식에 맞는 검색, 메타데이터, listening guide | 작곡가/작품/카탈로그 번호 검색이 정확함 | recently played composer/instrument/period 기반 추천 | 작품, 작곡가, 녹음, 악기, 시대 | 정확한 탐색 -> 작품 저장 -> 관련 녹음/작곡가 탐색 | 높음. 작품 중심 구조의 기준. 단, Apple은 직접 재생이 됨 |
| [Melon](https://www.melon.com/musicstory/informView.htm?mstorySeq=16213&pageIndex=1) | 국내 음악 취향 기반 빠른 선곡 | ForYou/DJ 추천 바로 듣기 | 매일 업데이트 추천 카드, mood 전환 | 감상 이력, 좋아요, 검색, 차트 확인, 피드백 | 듣기 -> positive/negative feedback -> 매일 추천 갱신 | 중간. "고민 없는 시작"과 국내 UX 톤 참고 |
| [IDAGIO](https://support.idagio.com/en/articles/3478664-what-is-idagio) | 클래식 전문 스트리밍과 curated discovery | classical catalog, mood/era/instrument 탐색 | curated playlists, weekly mixes, collections | 청취/저장/검색 | 장르 특화 탐색 -> 저장 -> curated 재진입 | 중간. 직접 재생 경쟁은 피하고 classical taxonomy만 참고 |
| [medici.tv](https://www.medici.tv/en/about-us) | 세계적 공연 영상 live/on-demand | 공연 영상을 집에서 바로 볼 수 있음 | weekly livestream, replay catalog, editor curation | 시청/관심 아티스트/장르 | upcoming live -> watch/replay -> curated next event | 높음. in C의 공연 전후 루프와 잘 맞음 |
| [Netflix](https://help.netflix.com/en/node/100639) | 오늘 볼 콘텐츠를 쉽게 고르게 함 | 취향 선택 후 rows/ranking | Continue Watching, personalized rows, new rows | 시청 시작/완료, 평점, 시간대, 언어, 기기 | 선택 -> watch depth -> row/rank 개선 -> continue | 매우 높음. in C는 Spotify보다 Netflix식 진열이 더 적합 |
| YouTube | 관심 영상을 끝없이 발견 | 검색 또는 홈 추천 즉시 재생 | subscriptions, notifications, history-driven home | 시청 시간, 검색, 좋아요, 구독 | watch -> related/home update -> return | 중간. 대형 UGC/영상 재생 루프는 모방 어려움 |
| [TikTok](https://newsroom.tiktok.com/how-tiktok-recommends-videos-for-you?lang=en) | 짧은 영상으로 즉시 몰입 | For You feed가 첫 화면에서 바로 시작 | endless personalized feed | watch completion, likes, comments, follows, not interested | swipe -> implicit signal -> feed 개선 -> more swipes | 낮음-중간. short preview는 참고하되 클래식 신뢰도를 해칠 수 있음 |
| [Watcha Pedia](https://play.google.com/store/apps/details?id=com.frograms.watcha&hl=en) | 본 콘텐츠를 기록하고 취향을 발견 | 별점 하나로 개인 아카이브 시작 | 월간 recap, taste analysis, predicted ratings | 평점, 한줄평, 캘린더, 구독 OTT | log/rate -> taste map -> predicted rating -> next content | 매우 높음. "내 취향 언어화" 모델의 핵심 참고 |
| [Letterboxd](https://letterboxd.com/) | 내 영화 인생을 기록하고 발견 | watched/watchlist/diary로 즉시 기록 | diary, watchlist, lists, year review | watched, rating, like, review, tags, watchlist | watch -> log -> list/stats/social proof -> next watch | 높음. 커뮤니티 없이도 개인 diary와 watchlist는 강함 |
| [Duolingo](https://blog.duolingo.com/improving-the-streak/) | 매일 아주 조금 학습 | 쉬운 첫 lesson과 streak | streak, reminders, daily goal | lesson complete, goal, time | one lesson -> streak/progress -> reminder -> next day | 중간. 3분 청음 루틴에 적용 가능하지만 과한 gamification은 위험 |
| [Headspace](https://www.headspace.com/meditation/daily-meditation) | 짧은 명상으로 매일 상태 개선 | 1-10분 guided session | Today meditation, streak, time/mood routine | completed sessions, time, topic | short session -> calm/progress -> same-time habit | 높음. "작고 자주" 루프를 클래식 감상에 이식 가능 |
| [Goodreads](https://www.goodreads.com/blog/show/3144-join-the-goodreads-reading-challenge) | 읽을 책/읽은 책 기록과 목표 | Reading Challenge, Want to Read | goal progress, yearly challenge, shelves | want/read/currently reading, ratings | save/log -> goal/shelf -> next read | 중간. My Music을 "저장함"이 아니라 "듣기 챌린지"로 바꾸는 참고 |
| [Pinterest](https://help.pinterest.com/en/article/explore-the-home-feed) | 취향을 저장하며 아이디어를 확장 | interest 선택 후 home feed | board updates, more ideas, related ideas | board, save, hide, search, follow | save -> board taste -> related feed -> save more | 매우 높음. 작품/악기/공연을 board처럼 묶는 구조가 맞음 |
| [Strava](https://support.strava.com/en-us/articles/15401987-activity-privacy-controls) | 운동 기록이 성취/분석이 됨 | activity detail과 stats | progress, segments, challenges, achievements | 활동 기록, route, biometrics, goals | activity -> stats/achievement -> next activity | 낮음-중간. 커뮤니티보다 개인 progress/achievement만 차용 |
| [Fever](https://play.google.com/store/apps/details?id=com.feverup.fever&hl=en_US&gl=US) | 도시의 이벤트를 발견하고 예매 | 내 주변/관심 이벤트 탐색 | 날짜/위치 기반 추천, favorite event | 위치, 관심사, favorites | discover -> favorite/ticket -> reminder/local event -> return | 매우 높음. 공연 광고 BM의 UX benchmark |
| [DICE](https://dicefm.zendesk.com/hc/en-gb/articles/22365422759313-Getting-started-with-DICE) | 취향에 맞는 공연을 찾고 티켓을 쉽게 삼 | Spotify/Apple Music 연결로 event 추천 | artist/venue follow, saved event reminder, wait list | 음악 라이브러리, follow, save, location | taste -> event feed -> save/remind/buy -> next show | 매우 높음. in C 공연 연결의 가장 직접적 레퍼런스 |
| [Interpark Ticket](https://ticket.interpark.com/) | 국내 공연/전시/티켓 예매 | 장르/랭킹/공연장 탐색 | 티켓오픈, 랭킹, 모바일티켓, 혜택 | 예매, 관심 공연, 카테고리 | discover/ranking -> ticket/open alert -> mobile ticket | 높음. 국내 공연 funnel 기준 |
| [Yes24 Ticket](https://ticket.yes24.com/MyPage/) | 국내 공연 예매와 맞춤 알림 | 지역/날짜/관심인물/티켓오픈 | 맞춤 알람, 예매 내역, 포인트/쿠폰 | 예매 내역, 관심인물, 지역/날짜 | interest -> alert -> purchase -> history/benefit | 높음. 국내 알림/예매 후 루프 참고 |
| [KOPIS](https://www.kopis.or.kr/por/cs/openapi/openApiFaq.do?menuId=MNU_00074) | 공연 DB와 통계 원천 | 공연/시설/예매통계/API | 데이터 갱신, 통계, program import | 공연 DB, 시설 DB, 통계 | official data -> matching -> local relevance | 높음. 앱 UX보다 데이터 신뢰 원천으로 중요 |

## Borrow/Avoid Notes

| App | Trust Mechanism | Friction Control | Monetization Fit | What in C Can Borrow | What in C Should Avoid |
| --- | --- | --- | --- | --- | --- |
| Spotify | 청취 이력 기반 개인화, playlist 브랜드 | 재생까지 한 탭 | 구독 중심, 일부 sponsored discovery | "because you liked" reason, 저장 기반 다음 추천 | 직접 재생 없는 Spotify식 홈 복제 |
| YouTube Music | watch/listen history와 short preview | Samples에서 짧게 넘김 | 구독/광고 | 30초 moment feed, full listen으로 자연스러운 전환 | 무한 스와이프처럼 가벼워 보이는 클래식 UX |
| Apple Music | favorite artist, curated playlist, 기기 생태계 | 라이브러리와 추천 통합 | 구독 | favorite composer/artist 알림 구조 | Apple 계정/라이브러리 의존 기능 |
| Apple Music Classical | 작품/작곡가/카탈로그 metadata 신뢰 | classical 전용 검색 | Apple Music 구독 연결 | work-first metadata, movement/performer 구조 | 음원 재생이 되는 앱처럼 착각시키는 CTA |
| Melon | 국내 사용자의 익숙한 음악 홈과 ForYou | 고민 없는 카드형 추천 | 구독/광고/차트 | 국내 톤의 간결한 추천 copy, 선호 feedback | 차트/랭킹 중심 대중음악 문법 |
| IDAGIO | classical 전문성과 curated collection | mood/era/instrument 탐색 | 구독 | classical taxonomy, curated collection framing | 전문 스트리밍과 정면 경쟁 |
| medici.tv | 공연 영상 권위와 live schedule | live/replay 선택 | 구독 | 공연 일정과 editor pick 결합 | 영상 소유/중계처럼 보이는 표현 |
| Netflix | 개인화 row와 continue watching | 선택지만 줄여서 노출 | 구독 | row title 품질, continue flow, top pick | 너무 많은 row를 첫 화면에 쌓기 |
| YouTube | history, subscriptions, creator trust | 검색/추천 즉시 재생 | 광고/구독 | related flow와 history-driven comeback | UGC feed처럼 산만한 탐색 |
| TikTok | completion 기반 feed 개선 | 자동 재생, swipe | 광고 | 짧은 preview의 즉시성 | 클래식 감상을 짧은 dopamine feed로 만들기 |
| Watcha Pedia | 평점 예측, 취향 분석, 기록 | 별점 하나로 시작 | OTT 연결/콘텐츠 discovery | reaction을 취향 언어로 바꾸기 | 평점 숫자 예측을 과장하기 |
| Letterboxd | diary/list/watchlist와 social proof | 기록이 짧고 명확함 | 멤버십/광고 | 개인 감상 diary, watchlist, year recap | 공개 리뷰/커뮤니티를 V1에 무리하게 붙이기 |
| Duolingo | streak와 progress | 매우 쉬운 daily action | 구독/광고 | 3분 청음 completion, gentle streak | 죄책감 주는 gamification |
| Headspace | daily session과 상태 개선 약속 | 짧은 guided session | 구독 | "오늘 하나만" guided listening | 명상앱처럼 추상적 위로 copy |
| Goodreads | shelves/challenge/history | want/read/currently reading 구분 | 광고/affiliate | saved, listened, concert-attended 상태 구분 | 책 챌린지식 수량 목표 과다 |
| Pinterest | board와 related ideas | save one, get more ideas | 광고/commerce | 작품/악기/공연 board형 taste graph | 이미지 피드처럼 목적 없는 저장 |
| Strava | activity record와 progress | 기록 후 자동 summary | 구독 | 공연/청음 기록의 개인 progress | 경쟁/랭킹 중심 구조 |
| Fever | 지역/날짜 기반 이벤트 urgency | 지역 이벤트 목록과 ticket CTA | ticketing/sponsored placement | 가까운 공연, 날짜, sold-out/last chance 감각 | 광고가 먼저 보이는 이벤트 마켓 |
| DICE | music taste -> live show 추천 | follow/save/waitlist | ticketing | 수동 taste + 공연 매칭, saved event reminder | 외부 계정 import를 V1 핵심으로 두기 |
| Interpark Ticket | 예매처 신뢰, 랭킹, 티켓오픈 | 구매 funnel 직행 | ticketing/광고 | 국내 예매처 link-out, 티켓오픈 알림 문법 | 예매처 앱과 같은 목록/랭킹 화면 |
| Yes24 Ticket | 관심인물/지역/예매내역 알림 | 마이페이지 중심 | ticketing/광고 | 관심 작곡가/연주자/지역 알림 구조 | 쿠폰/포인트 중심 커머스 UX |
| KOPIS | 공공 데이터 신뢰 | API/import source | 공공 데이터, 직접 BM 아님 | 공연 DB source of truth, program matching | raw DB를 사용자 화면에 그대로 노출 |

## Pattern Library

### Daily Habit

작은 완료 단위가 핵심이다. Duolingo는 streak 조건을 낮춰 day 14 retention을 개선했고, Headspace는 짧고 반복 가능한 session을 daily habit anchor로 쓴다.
in C에 적용하면 "오늘의 작품"보다 "오늘 공연장에서 들릴 1분" 또는 "오늘 귀에 붙일 한 선율"이 낫다.

Avoid: 클래식 지식 퀴즈, 연속 출석 압박, 사용자를 무식하게 느끼게 하는 streak.

### Continue Where You Left Off

Netflix의 Continue Watching, Letterboxd의 watchlist/diary, Goodreads의 currently reading은 "내가 하던 것"으로 재방문을 만든다.
in C에서는 "저장했지만 전체 듣기 안 한 작품", "3분 듣다 멈춘 작품", "공연 전 다시 들어야 할 3개 moment"가 해당한다.

### Because You Liked

Spotify, Netflix, Pinterest, Watcha는 행동 신호를 다음 추천 문맥으로 바꾼다.
in C에서 추천 reason은 "비슷한 분위기"보다 구체적이어야 한다.

- "현악 사운드에 반응해서"
- "느린 악장을 저장해서"
- "아직 모르겠음이 많아서 더 선율이 선명한 작품"
- "이번 주 공연 프로그램에 자주 나와서"

### Taste Profile

Watcha Pedia와 Pinterest가 강하다. 사용자는 단순 추천보다 "내 취향이 언어화되는 경험"에 재방문한다.
in C는 다음 식으로 표현해야 한다.

- "당신은 피아노 독주보다 현악 합주에 더 자주 반응합니다."
- "후기 낭만보다 인상주의 색채 작품을 더 많이 저장했습니다."
- "빠른 1악장보다 느린 2악장 completion이 높습니다."

### Event-Based Urgency

Fever, DICE, Interpark, Yes24는 날짜/위치/티켓오픈/매진/리마인더로 urgency를 만든다.
in C가 가장 차별화할 수 있는 지점이다.

- 공연 D-7: "프로그램 10분 예습 열기"
- 공연 D-1: "내일 들릴 3개 선율"
- 공연 당일: "로비에서 보는 3분 카드"
- 공연 후: "오늘 기억난 작품 저장"

### Social Proof Without Social Network

커뮤니티를 만들지 않아도 social proof는 가능하다.

- "이번 달 서울 공연에 자주 오른 작품"
- "입문자가 많이 저장한 30초 포인트"
- "공연 프로그램에서 자주 만나는 작곡가"
- "예매처 랭킹/공연장 프로그램 기반 큐레이션"

중요: 숫자를 조작하면 안 된다. seed/운영 큐레이션이면 "편집 추천"으로 표시한다.

### Editorial Curation

Apple Music Classical, medici.tv, Netflix row title, Melon ForYou card가 모두 editorial framing을 쓴다.
in C는 AI 요약처럼 보이는 설명보다 "들어야 할 지점" 중심의 편집 문장이 필요하다.

Bad:
"베토벤은 고전주의와 낭만주의를 잇는 위대한 작곡가입니다."

Better:
"1악장 첫 네 음이 다시 돌아올 때, 같은 말이 얼마나 다르게 들리는지 보세요."

### Short-Form Preview

YouTube Music Samples와 TikTok은 짧은 preview에서 강하다.
in C는 short-form을 copy하지 말고 classical listening moment로 바꿔야 한다.

- 30초: 선율/악기/리듬 하나만
- 3분: 작품의 긴장 변화 하나만
- full listen: 외부 플랫폼 WebView/link-out

### Save For Later

Pinterest boards, Goodreads shelves, Letterboxd watchlist는 저장을 "나중의 행동"으로 연결한다.
in C의 My Music은 저장함이 아니라 다음의 대기열이어야 한다.

- 공연 전 다시 듣기
- 전체 듣기 아직 안 함
- 귀에 남은 선율
- 다음 공연 후보

### Post-Experience Reflection

Letterboxd diary, Watcha calendar/review, Strava activity detail은 경험 후 기록으로 retention을 만든다.
in C는 공연 후 30초 회고가 강하다.

- "오늘 실제로 들린 순간"
- "기억난 악기"
- "다음에 더 듣고 싶은 방향"

### Calendar/Location Trigger

DICE/Fever/Interpark/Yes24는 날짜/지역이 핵심이다.
in C는 캘린더 연동 없이도 "지역 + 이번 주 공연"으로 시작 가능하다.

### Seasonal/Trending Shelf

Netflix Top rows, Melon trend, Pinterest Explore는 freshness를 만든다.
in C에서는 "이번 달 공연장에서 자주 보이는 작품", "연말에 자주 만나는 합창/교향곡", "봄 실내악 프로그램"처럼 공연 calendar와 붙여야 한다.

## Cross-App Findings

1. 추천은 retention의 원인이 아니라 결과다. 먼저 저장/청취/시청/관람 같은 반복 행동이 있어야 추천이 신뢰를 얻는다.
2. 직접 재생이 없는 앱은 "바로 소비"보다 "선택, 준비, 기록"에서 가치를 만들어야 한다.
3. 콘텐츠 설명은 약하다. 사용자가 자기 상황에서 곧 쓸 수 있는 설명이 강하다.
4. 홈 row 제목은 기능보다 더 중요하다. "처음 듣기 좋은 작품"보다 "내일 공연장에서 들릴 첫 선율"이 낫다.
5. 커뮤니티 없이도 diary, taste profile, private board, event reminder로 충분한 단일 사용자 retention을 만들 수 있다.

## Sources

- Spotify personalization: https://newsroom.spotify.com/2021-10-13/adding-that-extra-you-to-your-discovery-oskar-stal-spotify-vice-president-of-personalization-explains-how-it-works/
- Spotify recommendation responsibility: https://newsroom.spotify.com/2023-03-06/responsibly-balancing-what-goes-into-your-personalized-recommendations/
- Spotify discovery features: https://newsroom.spotify.com/2026-01-28/music-discovery-features/
- YouTube Music Samples: https://support.google.com/youtubemusic/answer/13468882?hl=en
- YouTube Music personalized mixes: https://blog.youtube/news-and-events/youtube-music-makes-discovery-more/
- Apple Music Classical App Store: https://apps.apple.com/us/app/apple-music-classical/id1598433714
- Apple Music Classical search guide: https://support.apple.com/guide/apple-music-classical/find-music-dev8de5fc472/web
- Apple Music Classical newsroom: https://www.apple.com/newsroom/2023/03/apple-music-classical-is-here/
- Apple Music product page: https://www.apple.com/apple-music/
- Melon ForYou: https://www.melon.com/musicstory/informView.htm?mstorySeq=16213&pageIndex=1
- Kakao Melon service page: https://www.kakaocorp.com/page/service/service/Melon?lang=ko
- IDAGIO support: https://support.idagio.com/en/articles/3478664-what-is-idagio
- IDAGIO Google Play: https://play.google.com/store/apps/details?id=com.idagio.app
- medici.tv about: https://www.medici.tv/en/about-us
- medici.tv subscription: https://www.medici.tv/en/classical-music-subscription/
- Netflix recommendations: https://help.netflix.com/en/node/100639
- TikTok For You recommendations: https://newsroom.tiktok.com/how-tiktok-recommends-videos-for-you?lang=en
- Watcha Pedia Google Play: https://play.google.com/store/apps/details?id=com.frograms.watcha&hl=en
- Letterboxd home: https://letterboxd.com/
- Letterboxd FAQ: https://letterboxd.com/about/faq/
- Duolingo streak improvement: https://blog.duolingo.com/improving-the-streak/
- Headspace daily meditation: https://www.headspace.com/meditation/daily-meditation
- Goodreads Reading Challenge: https://www.goodreads.com/blog/show/3144-join-the-goodreads-reading-challenge
- Pinterest home feed: https://help.pinterest.com/en/article/explore-the-home-feed
- Pinterest boards update: https://newsroom.pinterest.com/news/pinterest-boards-get-ai-powered-upgrade-for-personalized-experience/
- Strava activity privacy/details: https://support.strava.com/en-us/articles/15401987-activity-privacy-controls
- Fever Google Play: https://play.google.com/store/apps/details?id=com.feverup.fever&hl=en_US&gl=US
- DICE getting started: https://dicefm.zendesk.com/hc/en-gb/articles/22365422759313-Getting-started-with-DICE
- DICE app page: https://apps.apple.com/us/app/dice-live-shows/id898358948
- Interpark Ticket: https://ticket.interpark.com/
- Yes24 Ticket MyPage: https://ticket.yes24.com/MyPage/
- KOPIS Open API FAQ: https://www.kopis.or.kr/por/cs/openapi/openApiFaq.do?menuId=MNU_00074

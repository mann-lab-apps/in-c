# 클래식 디스커버리 앱 레퍼런스 후보

작성일: 2026-08-30

## 목적

클래식 디스커버리 앱을 구현하기 전에 실제 참조할 앱을 먼저 고른다. 기준은 세 가지다.

1. 활성 사용자 규모가 큰 음악앱.
2. 클래식이라는 필드에 잘 맞는 음악앱.
3. 국내에서 실제 서비스 중이거나 국내 사용자 습관을 잘 보여주는 앱.

이번 문서는 "이 앱들을 모두 따라 하자"가 아니라, 각 앱에서 어떤 기능 패턴을 배울지와
우리 구현계획으로 어떻게 번역할지를 정리한다.

## 1차 레퍼런스 선정

### 최우선 참조 앱

| 앱 | 선정 이유 | 우리가 볼 기능 |
| --- | --- | --- |
| YouTube Music | 한국 음악앱 사용량 최상위권. 무료/프리미엄, 영상, 커버, 직캠, Samples가 강함 | 짧은 preview, 영상/음원 전환, 무료 funnel, 알고리즘 discovery |
| Spotify | 글로벌 최대급 음악 플랫폼. 2026 Q2 777M MAU, 300M Premium subscribers | 개인화 추천, Discover Weekly, prompt playlist, 광고 타겟팅, fan/context 광고 |
| Melon | 국내 대표 음악앱. 차트, 팬덤, 플레이리스트, 카카오 생태계가 강함 | 차트, Music Home, DJ playlist, Station, 음악서랍, MMA/팬덤 참여 |
| Genie | 국내 상위권. 빠른 선곡, For You, 30초 Sketch Play, AI DJ, 러닝홈 | 첫 곡 기반 연속 추천, 30초 맛보기, 상황/날씨 추천, AI DJ |
| FLO | 국내 상위권. AI 추천, RE;CORD, 아티스트 홈, 팬/공연/커뮤니티 연결 | 청취 기록 회고, 아티스트 애정도, 공연 정보, 팬 커뮤니티 연결 |
| VIBE | 네이버 생태계. AI playlist, party room, karaoke, Billboard 독점 콘텐츠 | AI 믹스, 자동 추천 재생, 같이 듣기, 취향 중심 홈 |
| Bugs | 고음질/플레이리스트/팬덤 특화. essential; 감성 큐레이션 | 고음질 포지션, mood playlist, 예쁜 공유 이미지, 팬덤 기능 |
| Apple Music Classical | 클래식 전용 대형 앱. 작품/작곡가/지휘자 검색과 metadata 구조가 핵심 | work 중심 탐색, composer/work/conductor search, listening guide, complete metadata |
| IDAGIO | 클래식 전용 독립 streaming. search, expert curation, concerts, fair payout | composer/work/performance 비교, curated playlists, collection, concert 연결 |
| Naxos Music Library | 교육기관/도서관에 강한 classical archive. 상세 metadata와 study tool | advanced search, program notes, composer bio, institution playlist, assignment용 playlist |
| KBS KONG | 국내 무료 radio 습관. KBS 1FM 클래식FM과 선곡표/편성표/다시듣기가 있음 | live radio, playlist log, schedule, 다시듣기, 알람/취침 예약 |
| CLASSIKA | 국내 클래식 공연 검색 앱. 작곡가/곡/연주자 검색을 전면에 둠 | 공연 검색, AI program note, 지역/날짜 필터, 리뷰/관람 기록 |

### 보조 참조 앱

| 앱 | 선정 이유 | 우리가 볼 기능 |
| --- | --- | --- |
| Apple Music | 일반 음악앱 안에서 Classical을 어떻게 연결하는지 확인 | Apple Music과 Classical의 shared library, ad-free subscription packaging |
| SoundCloud | creator/fan discovery와 social signal이 강함 | discovery feed, first fans, repost/follow, comments, fan ranking |
| Classical Archives | 고전적인 classical catalog 구조 | Library, Must Know, composer/period/genre radio, personal playlists |
| medici.tv | classical video/concert streaming | live/on-demand concert, program note, favorites/history, weekly livestreams |
| Berliner Philharmoniker Digital Concert Hall | 고품질 공연 영상 구독의 기준 | live concerts, archive, interviews, introductions, 4K/Hi-Res positioning |
| Qobuz | 고음질+editorial music service | album review, biography, hi-res, handpicked selections |
| Soundslice | 악보와 audio/video sync의 강한 레퍼런스 | note-to-time navigation, drag loop, slowdown, score/video sync |
| MuseScore | 악보 catalog와 practice/player 연결 | score search, playback, tempo/loop, practice mode, export |

## 카테고리별 분석

### A. 활성 사용자 규모형

#### YouTube Music

참조 이유:

- 국내 음악앱 MAU 기준 최상위권이다. Wiseapp Retail 기준 2025년 평균 월간 사용자
  980만 명으로 보도되었고, 2026년 중에도 YouTube Music이 국내 최상위권이라는 보도가
  반복된다.
- YouTube 본체와 연결되어 정식 음원, 뮤직비디오, 커버, 라이브, 직캠, 팟캐스트까지
  포괄한다.

핵심 기능:

- ad-supported 무료 사용과 Premium.
- Samples tab.
- Music Tuner.
- music video/audio 전환.
- background play, ad-free, download는 Premium 혜택.
- fan badge/top listener.

우리에게 주는 힌트:

- 첫 화면에서 긴 설명보다 30초 단위 preview를 빠르게 넘기는 discovery가 중요하다.
- 클래식도 "전체 곡 듣기" 전에 짧은 구간을 맛보게 해야 한다.
- 자체 음원 없이도 YouTube link/embed를 통해 초기 content depth를 확보할 수 있다.

#### Spotify

참조 이유:

- 2026 Q2 기준 777M MAU와 300M Premium subscribers를 보고한 최대급 음악 플랫폼이다.
- 광고 플랫폼으로도 고도화되어 genre, interest, playlist, fan base, real-time context
  targeting을 제공한다.

핵심 기능:

- personalized playlist와 Discover Weekly.
- genre controls, prompted playlist.
- library, liked songs, playlist.
- podcast/video/audiobook 확장.
- audio/video/display/carousel ad format.
- self-serve Ads Manager와 audience insight.

우리에게 주는 힌트:

- 광고가 성립하려면 단순 배너보다 사용자의 listening behavior와 context가 쌓여야 한다.
- 우리 앱은 classical 안에서 작품, 작곡가, 악기, 공연장, 지역, 연습 관심을 신호로 쌓을 수 있다.
- 추천 알고리즘은 나중이고, 초기는 editor-picked Today card와 repeat card로 충분하다.

#### Melon

참조 이유:

- 국내 사용자가 음악앱에 기대하는 홈, 차트, 플레이리스트, 팬덤 구조를 가장 잘 보여준다.
- Kakao 공식 서비스 소개는 Daily Mix, DJ playlist, 24Hits, genre hot track, Station,
  search tag, 음악서랍, MMA를 강조한다.

핵심 기능:

- 개인화 Music Home.
- 24Hits/TOP100/HOT100/장르 차트.
- Melon DJ와 Power DJ.
- Station, 오디오/영상/매거진.
- 음악서랍.
- 팬덤/시상식 투표.

우리에게 주는 힌트:

- 국내 사용자는 차트와 큐레이션을 모두 기대한다.
- 클래식에서는 `TOP100`을 그대로 만들기보다 `이번 주 많이 저장한 작품`, `공연 전 많이 듣는 작품`,
  `처음 듣기 좋은 작품` 같은 목적형 차트가 맞다.
- 사용자가 직접 선곡하는 DJ 기능은 나중에 classical playlist curator로 확장 가능하다.

### B. 국내 개인화/팬덤형

#### Genie

참조 이유:

- 국내 상위 음악앱 중 개인화 추천과 빠른 미리듣기 기능이 뚜렷하다.
- 공식 앱 소개는 For You, 빠른 선곡, Sketch Play, 감성 라디오, AI DJ, 러닝홈을 강조한다.

핵심 기능:

- 감상 이력 기반 For You.
- 첫 곡 이후 유사곡을 이어주는 빠른 선곡.
- 30초 Sketch Play와 seeking.
- 상황/날씨 기반 추천.
- 아티스트 믹스채널.
- AI DJ.
- 러닝홈, BPM 기반 메트로놈.

우리에게 주는 힌트:

- in C의 `30초 먼저 듣기`는 Genie Sketch Play와 가장 직접적으로 맞닿는다.
- 클래식에서는 `첫 작품 하나 고르면 비슷한 작품을 이어주는 빠른 선곡`을 만들 수 있다.
- "오늘 비 오는 밤에 듣는 실내악" 같은 상황 추천은 국내 사용자에게 익숙하다.

#### FLO

참조 이유:

- 국내 앱 중 AI 추천, 청취 기록, 아티스트 몰입, 공연/팬 커뮤니티 연결 실험이 활발하다.

핵심 기능:

- AI 음악 추천.
- 나의 RE;CORD.
- 빠른 선곡.
- 여러 곡 한 번에 찾기.
- 재생목록 청소.
- 아티스트 홈, 애정도, 상위리스너 배지.
- 공연 정보와 FLO ZIP fan community 연결.

우리에게 주는 힌트:

- 클래식에서도 `나의 RE;CORD`는 강하다. 예: 올해 가장 많이 들은 작곡가, 처음 저장한 실내악,
  공연 전 가장 많이 들은 작품.
- 팬덤 기능은 K-pop처럼 뜨겁게 만들기보다 `작곡가/연주자/공연장 관심도`로 차분하게 번역한다.
- 공연 정보는 별도 탭보다 작품/연주자 상세 안에 붙을 때 자연스럽다.

#### VIBE

참조 이유:

- 네이버의 취향 중심 음악앱. AI playlist와 party room/karaoke 등 social listening 기능이 있다.

핵심 기능:

- AI 기반 믹스테잎.
- 자동 추천 재생.
- 비슷한 노래보기.
- 편리한 재생목록.
- 싱크가사.
- 파티룸, 노래방.
- Billboard 독점 콘텐츠.

우리에게 주는 힌트:

- 가사 대신 `listening guide`와 `program note sync`가 클래식 버전의 싱크가사가 될 수 있다.
- party room은 초기에 만들 필요 없지만, 공연 전후 같이 듣기/감상 모임에는 참고할 수 있다.

#### Bugs

참조 이유:

- 국내에서 고음질, 감성 큐레이션, essential; 플레이어, 팬덤 기능이 뚜렷하다.

핵심 기능:

- 고음질 FLAC/AAC, Hi-Res 인증 포지션.
- Music PD playlist.
- essential; 전용 플레이어.
- 콜라보 playlist.
- Favorite 투표, 스밍 인증, player skin.
- playlist screenshot import.
- VIP 문화 혜택.

우리에게 주는 힌트:

- 클래식은 음질 민감도가 높으므로 `좋은 녹음으로 듣기` 포지션이 중요하다.
- 공유 이미지는 광고/공연 홍보와 잘 맞는다. 예: `내가 저장한 이번 주 공연 작품 카드`.
- VIP 문화 혜택은 나중에 공연/전시/클래스 제휴로 확장 가능하다.

### C. 클래식 적합형

#### Apple Music Classical

참조 이유:

- 가장 중요한 클래식 전용 앱 레퍼런스다. Apple이 Primephonic을 인수한 뒤 별도 클래식 앱을
  만든 이유 자체가 제품 논리다.
- Apple은 클래식이 작곡가, 작품, 지휘자, 악장, 녹음 버전 등 일반 대중음악과 다른 metadata를
  요구한다고 설명한다.

핵심 기능:

- 5M+ classical tracks, 1.2M recordings.
- composer/work/conductor/catalog number search.
- work, movement, recording, contributor metadata.
- composer biography, work description, album notes.
- Listening Guides.
- Essentials playlist, period/instrument/composer curation.
- Apple Music과 shared library.

우리에게 주는 힌트:

- 우리 앱의 핵심 객체도 track이 아니라 `Work`여야 한다.
- `작품 상세 -> 녹음 버전 -> 악장/구간 -> 감상 질문 -> 악보/공연` 구조가 필요하다.
- Listening Guide는 in C의 가장 강한 차별화 후보다.

#### IDAGIO

참조 이유:

- classical-only streaming을 독립 서비스로 운영한 대표 사례다.
- 190개국 이상 subscriber, 1.6M+ app downloads, 2M+ licensed tracks를 공식 support 문서에서
  설명한다.

핵심 기능:

- composer/work/movement 기반 search.
- 같은 작품의 여러 interpretation 비교.
- expert curated playlists.
- weekly mixes.
- personal collection.
- offline listening.
- concerts/video-on-demand.
- fair payout model.

우리에게 주는 힌트:

- `같은 작품의 다른 연주 비교`는 클래식 discovery의 강한 UX다.
- catalog request도 좋은 기능이다. 사용자가 찾는 작품이 없으면 요청하게 하고, 수요를 backlog로
  삼을 수 있다.

#### Naxos Music Library

참조 이유:

- 교육기관/도서관에서 쓰이는 classical archive 성격이 강하다.
- metadata와 study tool이 풍부해 "클래식 학습용 catalog" 구현에 참고하기 좋다.

핵심 기능:

- 거의 3M tracks.
- composer, artist, work title, label, catalogue number keyword search.
- advanced search: composer, artist, performing group, category, instrument, period, label,
  country, release date.
- composer/artist biography.
- album booklet, inlay card, program note.
- teacher/professor playlist와 assignment playlist.
- recently played, favourites, popular albums.
- gapless playback, 10-second jump, loop, shuffle.
- offline listening.

우리에게 주는 힌트:

- 교육/레슨 확장에는 Naxos식 playlist assignment가 좋다.
- 작곡가/악기/시대/편성 metadata는 광고 segment로도 가치가 있다.
- `program note`와 `booklet`은 in C Columns와 연결할 수 있다.

#### KBS KONG / KBS Classic FM

참조 이유:

- 국내에서 클래식 청취 습관을 무료로 만드는 가장 현실적인 reference다.
- KBS 1FM은 국내 유일 클래식/국악 전문 채널로 설명된다.

핵심 기능:

- 8개 KBS radio channel live.
- 보이는 라디오와 채팅.
- 선곡표.
- 편성표.
- 다시듣기.
- 오리지널/podcast.
- 즐겨찾기, 재생기록, 알람, 취침 예약.
- 간편모드.

우리에게 주는 힌트:

- "지금 나오는 곡 뭐지?"는 클래식에도 강한 pain point다.
- 선곡표와 작품 상세를 연결하면 radio listening에서 앱으로 유입될 수 있다.
- 알람/취침 예약은 클래식 반복 청취에 자연스럽다.

#### CLASSIKA

참조 이유:

- 국내 클래식 공연 검색 문제를 직접 겨냥한 앱이다.
- App Store 설명 기준 작곡가, 곡명, 연주자 검색과 AI 프로그램 노트를 전면에 둔다.

핵심 기능:

- composer/piece/performer search.
- region, venue, genre, date, price filter.
- 공연 상세: cast, program, seat price, venue.
- booking link.
- AI program note.
- reviews/community.
- calendar/bookmark.
- viewed performance history.
- daily classical news summary.

우리에게 주는 힌트:

- 공연 검색은 별도 서비스가 될 수 있지만, in C에서는 작품 페이지의 하위 행동으로 들어가는 것이
  더 강하다.
- AI program note는 사용자가 공연 전에 작품을 듣게 만드는 hook으로 쓸 수 있다.
- 국내 공연 광고 상품을 검증하려면 CLASSIKA류 기능을 반드시 관찰해야 한다.

### D. 공연 영상/프리미엄 감상형

#### medici.tv

참조 이유:

- classical live/on-demand video streaming의 대표 사례다.

핵심 기능:

- 4,500+ concerts/operas/ballets/documentaries/masterclasses/jazz.
- 150+ livestreams per year.
- HD/4K streaming.
- program note.
- curated playlists and weekly selections.
- continue watching, favourites, history.
- subtitles.
- ad-free subscription.

우리에게 주는 힌트:

- 공연 전 preview와 공연 후 archive의 가치를 보여준다.
- in C는 직접 공연 영상을 제공하기보다 `공연 전 3분 preview`, `관련 영상 링크`, `program note`부터
  시작한다.

#### Berliner Philharmoniker Digital Concert Hall

참조 이유:

- 단일 오케스트라가 자체 media platform을 운영하는 최고 수준 reference다.

핵심 기능:

- 시즌 40개 이상 live broadcast.
- 900개 이상 concert archive.
- interviews, documentaries, introductions.
- 4K UHD, Hi-Res Audio, Dolby Atmos.
- 7일 free trial, monthly/yearly subscription.
- TV/mobile/tablet app.

우리에게 주는 힌트:

- 공연/단체가 직접 audience relationship을 소유하는 모델이다.
- 국내 공연장/앙상블도 작은 버전의 `Digital Concert Room`을 원할 수 있다.
- 광고보다 sponsorship/제휴/프리뷰 제작 상품으로 이어질 수 있다.

## 기능 패턴별 구현 번역

| 기능 패턴 | 참조 앱 | 우리 구현 |
| --- | --- | --- |
| Today/For You 홈 | Spotify, Melon, Genie, FLO, VIBE | 오늘 들을 작품 3개, 이어 듣기, 반복 청취 카드 |
| 30초 preview | YouTube Music Samples, Genie Sketch Play | 작품의 30초/3분 핵심 구간 카드 |
| 첫 곡 기반 연속 추천 | Genie 빠른 선곡, FLO 빠른 선곡, VIBE 자동 추천 | 첫 작품 선택 후 분위기/편성/시대가 비슷한 작품 이어듣기 |
| 작품 중심 metadata | Apple Music Classical, IDAGIO, Naxos | Work, Movement, RecordingLink, Composer, Performer 모델 |
| 클래식 전용 검색 | Apple Music Classical, IDAGIO, CLASSIKA | 작곡가/작품/악장/연주자/편성/시대 검색 |
| 감상 guide | Apple Listening Guide, Naxos program note, medici.tv notes | timestamp 기반 listening prompt와 짧은 해설 |
| 청취 기록 회고 | FLO RE;CORD, Spotify Wrapped 계열 | 내가 익숙해진 작품, 많이 들은 작곡가, 공연 전 들은 곡 |
| 공연 연결 | CLASSIKA, IDAGIO Concerts, medici.tv, Digital Concert Hall | 작품 상세의 공연 카드, 지역/날짜/예매 링크 |
| Radio/list log | KBS KONG | KBS Classic FM 선곡표 기반 작품 저장/검색 후보 |
| 커뮤니티/팬 신호 | SoundCloud, FLO, Melon DJ, Bugs Favorite | 리뷰보다 낮은 마찰의 반응, 저장, 큐레이터 playlist |
| 광고/제휴 | Spotify Ads, Melon/Kakao ecosystem | 작품/작곡가/악기/지역 segment 기반 수동 promotion slot |

## 우선순위

### P0: 반드시 관찰할 앱

- YouTube Music
- Spotify
- Melon
- Genie
- Apple Music Classical
- IDAGIO
- CLASSIKA
- KBS KONG

### P1: 기능별로 깊게 볼 앱

- FLO
- VIBE
- Bugs
- Naxos Music Library
- SoundCloud
- medici.tv
- Berliner Philharmoniker Digital Concert Hall

### P2: 후속 확장 때 볼 앱

- Classical Archives
- Qobuz
- Soundslice
- MuseScore

## MVP 구현계획으로 연결

### 1단계: Discovery MVP

목표: 사용자가 첫 방문에서 작품 하나를 저장하고 다시 들을 이유를 만든다.

- Today 화면: 오늘 들을 작품 3개.
- Discover 화면: mood, 악기, 시대, 작곡가, 공연 전 추천.
- Work detail: 작품 설명, 30초 구간, 외부 listening link, 감상 prompt.
- Library: 저장한 작품, 최근 들은 작품.
- Local listening history와 reaction 저장.
- seed catalog 30-50개.

참조:

- YouTube Music Samples.
- Spotify personalized playlist.
- Genie Sketch Play.
- Apple Music Classical work page.

### 2단계: Classical Fit

목표: 일반 음악앱이 잘 못하는 classical object model을 만든다.

- composer/work/movement/recording/performer metadata.
- 같은 작품의 추천 연주 버전 2-3개.
- 시대, 편성, 악기, 분위기 filter.
- listening prompt를 timestamp/section에 연결.
- Columns/악보/공연 슬롯 연결.

참조:

- Apple Music Classical.
- IDAGIO.
- Naxos Music Library.
- CLASSIKA.

### 3단계: Repeat Listening

목표: "클래식은 반복해서 들어야 좋아진다"를 제품 루틴으로 만든다.

- 익숙해지는 중 queue.
- 오늘 다시 들을 3분.
- 들린 지점 reaction.
- 작품별 familiarity level.
- 주간 listening recap.

참조:

- FLO RE;CORD.
- Spotify saved-but-forgotten prompt.
- Clef의 spaced repetition 감각.

### 4단계: Concert/Promotion Layer

목표: 광고 플랫폼 가능성을 검증한다.

- Work detail의 공연 카드.
- 지역/날짜/공연장 filter.
- 수동 promotion slot.
- 광고주/공연 등록 data model.
- 클릭/저장/예매 이동 tracking.
- 공연 전 3분 preview sponsorship.

참조:

- CLASSIKA.
- Spotify fan-base/context targeting.
- Melon/Kakao fan ecosystem.
- KBS KONG schedule/listening flow.

### 5단계: Community/Curator

목표: 사용자와 전문가가 큐레이션을 만들 수 있게 한다.

- user playlist 또는 listening path.
- curator profile.
- 반응/댓글은 낮은 마찰로 시작.
- 공연 후 짧은 감상 기록.
- 선생님/연주자 추천 playlist.

참조:

- Melon DJ.
- SoundCloud feed/follow.
- Bugs collaborative/fandom features.
- Tonara/Naxos assignment playlist.

## 다음 조사 체크리스트

실제 구현 전에는 각 앱을 직접 설치해 다음 화면을 캡처/기록한다.

- 첫 실행/onboarding.
- Home/Today/For You 구조.
- Search 구조.
- Track 또는 Work detail 구조.
- Player 구조.
- Library/history 구조.
- Playlist/curator 구조.
- Concert/event 연결 방식.
- Ad/promotion 노출 위치.
- 무료/유료 전환 지점.

## 출처

- Spotify Q2 2026 earnings:
  https://newsroom.spotify.com/2026-08-04/spotify-q2-2026-earnings/
- Spotify discovery features:
  https://newsroom.spotify.com/2026-01-28/music-discovery-features/
- Spotify ad targeting:
  https://ads.spotify.com/en-CA/help-center/targeting-options/
- YouTube Music Help:
  https://support.google.com/youtubemusic/answer/6313529
- 국내 음악앱 2025 MAU 보도:
  https://biz.chosun.com/it-science/ict/2026/01/20/H4LB5XAELNEBTKOVEN2QGUWFIM/
- Kakao Melon service page:
  https://www.kakaocorp.com/page/service/service/Melon?lang=ko
- Melon DJ:
  https://www.melon.com/dj/intro/view.htm
- Genie app guide:
  https://www.genie.co.kr/guide/genieApp
- Genie 빠른 선곡 보도자료:
  https://www.geniemusic.co.kr/happiness/pressdata_view.do?boardUid=1006&page=1
- FLO App Store:
  https://apps.apple.com/kr/app/flo-%ED%94%8C%EB%A1%9C/id1129048043
- VIBE service intro:
  https://help.naver.com/service/20370/contents/8932?lang=ko
- Bugs App Store:
  https://apps.apple.com/kr/app/%EB%B2%85%EC%8A%A4-bugs/id348555322
- Apple Music Classical:
  https://music.apple.com/us/info/apple-music-classical
- Apple Music Classical User Guide:
  https://support.apple.com/guide/apple-music-classical/introduction-to-apple-music-classical-dev02bc3b832/web
- IDAGIO support:
  https://support.idagio.com/en/articles/3478664-what-is-idagio
- IDAGIO App Store:
  https://apps.apple.com/us/app/idagio-stream-classical-music/id1014917700
- Naxos Music Library:
  https://www.naxos.com/individualMobileApps/Index/?title=NML
- Naxos mobile access:
  https://cdn.naxosmusiclibrary.com/sharedfiles/nml/en/MobileAccess/index.htm
- KBS KONG:
  https://radio.kbs.co.kr/kong.html
- KBS radio channel info:
  https://about.kbs.co.kr/index.html?sname=kbs&stype=broadcast
- CLASSIKA App Store:
  https://apps.apple.com/kr/app/classika-%ED%81%B4%EB%9E%98%EC%8B%9C%EC%B9%B4/id6741318084
- medici.tv:
  https://www.medici.tv/en/about-us
- Berliner Philharmoniker Digital Concert Hall:
  https://www.digitalconcerthall.com/en
- SoundCloud discovery:
  https://community.soundcloud.com/company/discovery
- Qobuz experience:
  https://help.qobuz.com/en/articles/10127-the-qobuz-experience

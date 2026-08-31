# 기존 플랫폼 연결 전략

작성일: 2026-08-30

## 결론

in C는 기존 음악/공연/악보 플랫폼을 대체하지 않는다. 대신 사용자가 클래식 작품을 중심으로
여러 플랫폼을 자연스럽게 오가게 만드는 **작품 중심 라우터**가 된다.

```text
작품을 발견함 -> 30초/3분 들어봄 -> 선호 플랫폼에서 전체 듣기 ->
관련 공연 확인 -> 예매처로 이동 -> 악보/연습/감상으로 돌아옴
```

이 포지션은 무료 앱 + 공연 정보 광고 BM과 잘 맞는다. 음원 라이선스, 결제, 대규모 catalog
운영을 직접 떠안지 않고도 사용자 intent를 만들 수 있고, 그 intent를 공연/레슨/악보/공간으로
연결할 수 있다.

## 연결 원칙

### 1. 소유보다 연결을 우선한다

초기에는 음원, 티켓, 악보 파일을 직접 소유하지 않는다. in C가 소유하는 것은 다음이다.

- 작품 중심 metadata.
- 한국어 listening prompt.
- 사용자의 저장, reaction, 반복 청취 상태.
- 작품/작곡가/악기/지역 관심 graph.
- 광고/제휴 노출과 전환 event.

음원 재생, 티켓 결제, 악보 원문, 공연장 정보는 각 플랫폼으로 연결한다.

### 2. Work ID가 내부 중심축이다

외부 플랫폼은 대부분 track, video, concert, page 단위로 움직인다. in C는 내부적으로 `Work`를
중심축으로 삼고, 외부 link를 붙인다.

```text
Work
-> YouTube video
-> Spotify track/album/playlist
-> Apple Music catalog item
-> KOPIS performance
-> ticket destination
-> IMSLP score page
-> internal listening moment
```

이 구조가 있어야 플랫폼이 바뀌어도 사용자 경험이 흔들리지 않는다.

### 3. 무료 사용을 해치지 않는다

외부 플랫폼 연결은 paywall로 보이면 안 된다. 사용자가 특정 스트리밍 앱을 구독하지 않아도
YouTube, public-domain 자료, preview, 외부 검색 link 중 하나로 접근할 수 있어야 한다.

### 4. 광고는 플랫폼 연결의 한 종류다

공연 광고는 별도 배너가 아니라 `관련 공연`, `공연 전 3분 preview`, `이 작품을 실제로 듣기` 같은
연결 행동으로 배치한다.

## 연결 단계

| 단계 | 방식 | 예시 | MVP 적합도 |
| --- | --- | --- | --- |
| L0 | 외부 link-out | YouTube, Spotify, 예매처, IMSLP로 열기 | 높음 |
| L1 | embed/deep link | YouTube iframe, Spotify embed, 앱 열기 | 높음 |
| L2 | data import | KOPIS API, MusicBrainz, Wikidata | 높음 |
| L3 | partner/referral | 공연 예매처, 기획사, 레슨, 악보 제휴 | 중간 |
| L4 | write-back | Apple Music library, calendar save, playlist 생성 | 낮음 |

MVP는 L0-L2까지만 안정적으로 구현한다. L3는 수동 제휴로 시작하고, L4는 사용자가 충분히 생긴 뒤
검토한다.

## 플랫폼별 연결 전략

### YouTube

용도:

- 무료 접근 가능한 첫 듣기.
- 공연 영상, 악장별 영상, 교육 영상 link-out.
- 30초/3분 listening moment의 기준 recording 후보.

연결 방식:

- 웹에서는 YouTube IFrame Player API를 사용해 embed와 play/pause event를 제어한다.
- 모바일 앱에서는 YouTube 앱 deep link와 web fallback을 제공한다.
- in C는 영상 파일을 저장하거나 재배포하지 않는다.

주의점:

- 영상 품질, 제목, 악장 구분이 일정하지 않다.
- 광고와 추천은 YouTube 영역에서 발생한다.
- 같은 작품의 여러 연주를 내부적으로 curated해야 한다.

MVP 판단: P0.

### Spotify

용도:

- 사용자가 이미 쓰는 스트리밍 앱으로 전체 듣기 연결.
- Spotify embed/oEmbed로 track, album, playlist preview 제공.
- 작품별 추천 녹음 후보 link.

연결 방식:

- 웹에서는 Spotify Embed를 붙인다.
- link preview는 oEmbed를 활용할 수 있다.
- 앱에서는 Spotify URI/deep link와 web fallback을 제공한다.

주의점:

- 전체 재생 경험은 사용자 계정/구독 상태에 의존한다.
- 클래식 metadata는 작품 중심 구조와 항상 정확히 맞지 않을 수 있다.
- 내부 `Work`와 Spotify `track/album` matching을 수동 검수해야 한다.

MVP 판단: P0.

### Apple Music / Apple Music Classical

용도:

- iOS 사용자에게 Apple Music catalog와 Classical 앱으로 자연스럽게 연결.
- 장기적으로 MusicKit을 통해 catalog search, playback, library action까지 확장.

연결 방식:

- MVP에서는 Apple Music link-out을 우선한다.
- iOS 앱이 안정화되면 MusicKit 권한 요청 후 playback/library 기능을 검토한다.
- Apple Music Classical은 작품/작곡가/연주자 metadata reference로도 유용하다.

주의점:

- MusicKit은 사용자 권한과 Apple Music 구독 상태 확인이 필요하다.
- Apple Music Classical 자체의 third-party API surface는 Apple Music/MusicKit 범위 안에서
  가능한 것부터 확인해야 한다.

MVP 판단: P1. iOS 집중 시 P0.5.

### 국내 스트리밍 앱: Melon, Genie, FLO, VIBE, Bugs

용도:

- 한국 사용자가 이미 쓰는 앱에서 전체 듣기.
- 작품 상세의 `내 앱에서 듣기` provider sheet.
- 국내 차트/큐레이션 문법을 참고한 UX.

연결 방식:

- 초기에는 검색 link 또는 수동 등록된 콘텐츠 URL로 link-out한다.
- 공식 API나 제휴가 확인되기 전에는 crawling/scraping을 전제로 하지 않는다.
- 사용자가 선호 스트리밍 앱을 설정하면 provider sheet에서 우선 노출한다.

주의점:

- 공개 API/딥링크 정책이 플랫폼마다 다를 수 있다.
- 외부 앱 설치 여부, 로그인 여부에 따라 경험이 달라진다.
- 음원 matching은 수동 검수가 필요하다.

MVP 판단: P1.

### KOPIS

용도:

- 국내 공연 baseline DB.
- 공연장, 기획/제작사, 공연 목록/상세 정보.
- 공연 통계와 지역/장르 흐름 확인.

연결 방식:

- KOPIS Open API를 통해 `서양음악(클래식)` 공연 목록과 상세를 가져온다.
- `Work`/`Composer` matching은 자동화보다 수동 검수 queue로 시작한다.
- KOPIS 공연 ID를 내부 `ConcertSource`에 저장한다.

주의점:

- KOPIS는 공연 DB와 통계에 강하지만, 작품 단위 프로그램 정보가 항상 충분하지 않을 수 있다.
- 실제 예매 전환은 별도 예매처 link가 필요하다.
- 데이터 업데이트 시점과 보정 가능성을 UX에 반영해야 한다.

MVP 판단: P0.

### 예매 플랫폼: Interpark Ticket, YES24 Ticket, Melon Ticket, Ticketlink, Naver Booking

용도:

- 공연 광고의 실제 전환 목적지.
- 공연 카드의 CTA.
- 광고주 report에서 click/conversion 후보.

연결 방식:

- MVP에서는 예매 URL을 수동 등록한다.
- utm/referrer를 붙일 수 있는 범위에서 click tracking을 한다.
- 제휴가 생기면 affiliate/referral parameter 또는 conversion postback을 협의한다.

주의점:

- 예매처별 공개 API가 없거나 제한적일 수 있으므로 수동 등록을 기본값으로 둔다.
- 티켓 재고, 가격, 좌석 정보는 직접 표시하지 않는 편이 안전하다.
- 예매 화면은 외부 플랫폼에서 완료된다.

MVP 판단: P1. 공연 광고 검증에는 수동 URL만으로 충분하다.

### CLASSIKA

용도:

- 클래식 공연 검색/발견 reference.
- 국내 클래식 공연 정보 제휴 후보.
- 장기적으로 공연 data/feed 또는 campaign partnership 후보.

연결 방식:

- 초기에는 공연 카드의 외부 출처/추가 정보 link로 연결한다.
- 제휴 전에는 CLASSIKA 내부 데이터를 무단 복제하지 않는다.
- 사용자 행동이 쌓이면 공동 campaign을 제안할 수 있다.

MVP 판단: P1.

### KBS KONG / KBS Classic FM

용도:

- 무료 클래식 청취 습관과 연결.
- `라디오에서 들은 작품 저장` flow.
- 방송 playlist 기반 discovery 후보.

연결 방식:

- MVP에서는 KONG link-out과 수동 `방금 들은 작품` 검색 flow를 제공한다.
- 방송 playlist 자동 import는 공식 제공 범위나 제휴 가능성을 확인한 뒤 진행한다.

주의점:

- 방송 음원 자체를 재배포하지 않는다.
- playlist/log 데이터를 무단 수집하지 않는다.

MVP 판단: P2. 단, acquisition partnership 가능성은 높다.

### IMSLP

용도:

- public-domain 악보 연결.
- 작품 상세의 `악보 보기` link.
- 나중에 쉬운 편곡/연습 모드로 이어지는 bridge.

연결 방식:

- IMSLP API로 composer/work 목록을 reference한다.
- 악보 파일은 직접 복제하지 않고 작품 페이지로 link-out하는 것을 기본으로 한다.
- 직접 preview가 필요하면 public-domain 여부와 라이선스를 별도 확인한다.

주의점:

- 국가별 저작권 상태가 다를 수 있다.
- 사용자가 있는 지역에서 열람 가능한지 확인이 필요하다.

MVP 판단: P1.

### MusicBrainz / Wikidata

용도:

- 작품, 작곡가, 연주자, recording의 공개 metadata backbone.
- 외부 플랫폼 link matching을 위한 stable ID.
- 작곡가 생몰, 시대, 국적, 작품 alias 같은 기본 정보.

연결 방식:

- 내부 `Work`에 MusicBrainz MBID와 Wikidata QID를 저장한다.
- 자동 import 후 한국어 표기와 listening prompt는 내부 curated layer로 덮는다.
- API rate limit과 attribution을 지킨다.

주의점:

- 클래식 작품 구조가 항상 UX에 맞게 정리되어 있지는 않다.
- 사용자가 읽는 설명문은 그대로 가져오기보다 직접 작성한다.

MVP 판단: P0.

### Linkfire 같은 smart link 플랫폼

용도:

- 하나의 음악 link를 여러 스트리밍 서비스로 분기.
- campaign analytics, attribution, retargeting.
- 장기적으로 광고주/연주자용 campaign link 생성.

연결 방식:

- MVP에서는 자체 lightweight smart link page를 만든다.
- Linkfire API는 제한된 partner access이므로, 대형 campaign이나 label/artist 제휴가 생기면 검토한다.
- 외부 smart link를 쓰더라도 in C 내부 click event는 별도로 기록한다.

주의점:

- 핵심 광고 데이터가 외부 플랫폼에 잠길 수 있다.
- 초기에는 자체 link routing이 더 빠르고 제품 학습에 좋다.

MVP 판단: P2.

## 제품 화면에 넣는 방식

### Work Detail

작품 상세는 플랫폼 연결의 중심이다.

```text
작품 header
30초/3분 listening moment
Listen on: YouTube / Spotify / Apple Music / Melon ...
관련 공연
악보 보기
다른 연주 비교
```

`Listen on`은 광고가 아니다. 사용자의 기존 구독/습관을 존중하는 기본 기능이다.

### Today

Today는 광고를 전면에 두지 않는다.

```text
오늘의 작품
30초 듣기
저장/reaction
이어 듣기
하단: 이 작품을 실제로 들을 수 있는 공연
```

공연 광고는 하단에 1-2개만 노출한다. 사용자가 작품을 저장하거나 30초 이상 들은 뒤에 노출하면
광고가 정보처럼 느껴진다.

### Concerts

Concerts 탭은 공연 광고와 일반 공연 정보를 함께 담는다.

- 내 관심 작품의 공연.
- 내 지역의 클래식 공연.
- 이번 주 처음 가기 좋은 공연.
- 공연 전 3분 preview.
- Sponsored 공연 카드.

일반 listing과 sponsored card는 시각적으로 구분하되, sponsored card도 작품/프로그램 정보가
충분해야 한다.

### Library

Library에는 `내가 쓰는 플랫폼` 설정을 둔다.

- YouTube 우선.
- Spotify 우선.
- Apple Music 우선.
- Melon/Genie/FLO/VIBE/Bugs 우선.

작품 상세의 CTA는 이 설정에 따라 정렬된다.

## 데이터 모델 추가

```text
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

ConcertSource
- id
- sourceName
- sourceEntityId
- sourceUrl
- importedAt
- normalizedStatus

TicketDestination
- id
- concertPromotionId
- platformName
- url
- trackingCode
- isPrimary

PlatformClickEvent
- id
- userId
- entityType
- entityId
- platformId
- linkId
- context
- occurredAt
```

## MVP 구현 순서

1. 내부 `Work` catalog에 `ExternalLink`를 붙인다.
2. YouTube/Spotify/Apple Music/Melon link-out을 작품 상세에 표시한다.
3. YouTube embed 또는 Spotify embed 중 하나를 Today preview에 붙인다.
4. KOPIS에서 공연 목록/상세를 가져오거나, 동일 shape의 수동 seed data를 만든다.
5. `ConcertPromotion`과 `TicketDestination`을 연결한다.
6. 공연 카드 click/save/dismiss event를 기록한다.
7. IMSLP/MusicBrainz/Wikidata ID를 내부 catalog에 추가한다.
8. 사용자가 선호 플랫폼을 선택하게 하고 CTA 정렬을 바꾼다.

## 하지 말아야 할 것

- 음원을 다운로드하거나 캐싱하지 않는다.
- 예매처의 좌석/가격/재고를 임의로 복제하지 않는다.
- API/제휴가 확인되지 않은 국내 스트리밍 metadata를 scraping하지 않는다.
- 광고를 Today의 첫 청취 행동보다 위에 두지 않는다.
- 외부 플랫폼 계정 연결을 첫 방문 onboarding에서 요구하지 않는다.

## 전략적 포지션

in C가 기존 플랫폼과 연결될 때의 한 문장 포지션은 다음이 좋다.

```text
클래식을 어디서 들을지는 사용자가 정하고, 무엇을 들을지와 다음에 어디로 갈지는 in C가 돕는다.
```

이 문장은 Spotify, YouTube, Apple Music, Melon 같은 대형 플랫폼과 경쟁하지 않으면서도 in C의
역할을 분명히 한다. 장기적으로 in C의 힘은 catalog 소유가 아니라 `작품 중심 관심 graph`와
`공연 전환 context`에서 나온다.

## 참고한 공식/준공식 자료

- YouTube IFrame Player API:
  https://developers.google.com/youtube/iframe_api_reference
- Spotify Embeds:
  https://developer.spotify.com/documentation/embeds
- Spotify oEmbed:
  https://developer.spotify.com/documentation/embeds/tutorials/using-the-oembed-api
- Apple Music / MusicKit:
  https://developer.apple.com/musickit/
- KOPIS Open API:
  https://www.kopis.or.kr/por/cs/openapi/openApiList.do?menuId=MNU_00074&tabId=tab3_2
- MusicBrainz API:
  https://musicbrainz.org/doc/MusicBrainz_API
- Wikidata data access:
  https://www.wikidata.org/wiki/Help:Data_access
- IMSLP API:
  https://imslp.org/wiki/IMSLP:API
- Linkfire API:
  https://developer.linkfire.com/docs/introduction

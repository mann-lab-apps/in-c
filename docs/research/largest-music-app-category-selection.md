# 사용자 규모 기준 음악앱 카테고리 선정

작성일: 2026-08-30

## 질문

상용화된 음악앱 서비스 중 사용자 규모가 가장 큰 종류를 고른다면 무엇인가?

## 결론

사용자 규모만 기준으로 하면 선정할 카테고리는 **음악 스트리밍/디스커버리 플랫폼**이다.

연습앱, 악보앱, 튜너, 메트로놈, 사보앱보다 훨씬 큰 사용자 풀을 갖고 있다. 대표 제품은
Spotify, YouTube Music/Premium, Tencent Music 계열이다. 이들은 단순히 음원을 재생하는
앱이 아니라, 다음 흐름을 함께 판다.

```text
음악 발견 -> 재생 -> 플레이리스트/라이브러리 저장 -> 반복 청취 ->
취향 신호 축적 -> 추천 -> 아티스트/콘서트/커뮤니티/영상/팟캐스트 확장
```

## 규모 근거

| 카테고리 | 대표 앱 | 공개 지표 | 해석 |
| --- | --- | --- | --- |
| 음악 스트리밍/디스커버리 | Spotify | 2026 Q2 기준 777M MAU, 300M Premium subscribers | 단일 음악 서비스 기준 최상위 규모 |
| 음악 스트리밍/비디오 결합 | YouTube Music/Premium | 2025년 3월 기준 125M subscribers including trials | YouTube 전체 사용자 기반 위에 음악 구독이 붙는 구조 |
| 중국 음악/오디오 플랫폼 | Tencent Music | 2025 Q4 기준 online music MAU 528M, paying users 127.4M | 지역 집중형이지만 규모는 글로벌 상위권 |
| 음악 학습/튜너 | Yousician/GuitarTuna | Yousician 계열 combined 20M MAU, GuitarTuna 100M+ downloads | 큰 서비스지만 streaming 대비 MAU 규모가 작다 |
| 악보/사보 | MuseScore Studio | 12M desktop downloads, 1.5M+ monthly active users | 음악 제작/악보 영역에서는 크지만 대중 소비 앱 규모와 차이가 크다 |

## 선정

### 1순위 카테고리

**음악 스트리밍/디스커버리 앱**

사용자 규모와 반복 사용 빈도 측면에서 가장 크다. 매일 듣기, 이동 중 듣기, 작업/공부 중
듣기, 플레이리스트 저장, 알고리즘 추천, 공유가 모두 일상 루틴에 들어간다.

### 단, 그대로 만들면 안 되는 이유

음원을 직접 호스팅하고 재생권을 제공하는 Spotify/Apple Music/YouTube Music식 앱은 초기
팀이 바로 들어가기 어렵다.

- 음원 라이선스 비용과 계약 난이도.
- 추천 알고리즘과 catalog 규모 경쟁.
- 앱스토어/결제/저작권 운영 부담.
- 기존 플랫폼에 이미 사용자의 음악 라이브러리와 취향 데이터가 쌓여 있음.

따라서 "가장 큰 카테고리"는 스트리밍이지만, 우리 제품은 full streaming clone이 아니라
**클래식 음악 디스커버리/청취 companion**으로 번역해야 한다.

## in C식 제품 변형

선정 앱 유형:

```text
클래식 음악 디스커버리 + 반복 청취 + 악보/공연/대화 연결 앱
```

음원은 직접 소유하거나 호스팅하지 않고, 초기에는 다음 방식으로 우회한다.

- YouTube, Spotify, Apple Music 등 외부 링크 연결.
- public-domain 음원 또는 직접 확보한 음원만 자체 재생.
- 작품/연주/악보/공연/Columns/커뮤니티를 한 페이지에 묶음.
- 사용자의 감상, 반복 청취, 저장, 공유, 공연 관심 데이터를 축적.

핵심 유저 플로우:

```text
오늘 들을 작품 발견 -> 30초/3분/전체 듣기 -> 들린 지점 표시 ->
관련 악보 보기 -> 공연/해설/질문 연결 -> 내 라이브러리에 저장 ->
다음 반복 청취 카드로 재방문
```

## 기존 Clef Practice 방향과의 관계

이전 조사에서 고른 `악보 기반 클래식 연습 OS`는 사용자 규모 최대 카테고리는 아니다.
대신 결제 의사와 제품 차별화가 더 선명한 vertical이다.

이번 기준을 적용하면 제품 전략은 다음처럼 바뀐다.

| 기준 | 선택 |
| --- | --- |
| 사용자 규모 최대 | 음악 스트리밍/디스커버리 |
| 초기 구현 가능성 | 외부 음원 링크 기반 classical discovery companion |
| 기존 코드 자산 활용 | 악보/작품/Columns/공연/Chromatics를 듣기 흐름 뒤에 연결 |
| 직접 만들지 말 것 | 음원 호스팅, 대형 상업곡 catalog, Spotify식 full player |
| 이후 확장 | 많이 들은 작품을 Clef Practice/Chromatics 연습 흐름으로 전환 |

즉, 최상단 funnel은 **듣기/발견 앱**으로 넓게 잡고, 깊은 retention과 결제는
**악보 기반 연습/학습**으로 내려가는 구조가 가장 자연스럽다.

## 권장 제품 문장

`in C`는 클래식을 잘 몰라도 오늘 들을 작품을 발견하고, 들린 지점을 남기고, 악보와 공연과
사람들의 질문으로 이어갈 수 있는 클래식 청취 앱이다.

`Clef Practice`는 그중 "이 작품을 직접 연주하고 싶다"는 사용자에게 이어지는 연습 모드다.

## 다음 결정

1. 앱 첫 화면을 Practice가 아니라 Discover/Listen으로 둘지 결정한다.
2. 음원 재생은 embed/link-out/자체 public-domain player 중 어떤 조합으로 시작할지 정한다.
3. 작품 페이지에 `듣기`, `악보 보기`, `연습하기`, `공연 찾기`, `질문 남기기`를 같은 객체
   아래 묶는다.
4. 추천 알고리즘을 처음부터 만들지 않고, editor-picked playlists와 listening history 기반
   Continue card부터 시작한다.
5. 이후 사용자가 저장한 작품을 Chromatics/Clef Practice의 악보/연습 큐로 변환한다.

## 출처

- Spotify Q2 2026 earnings:
  https://newsroom.spotify.com/2026-08-04/spotify-q2-2026-earnings/
- YouTube Music/Premium 125M milestone:
  https://blog.youtube/inside-youtube/20-years-125-million-subscribers-lyor-cohen/
- Tencent Music Q4/FY 2025 operational metrics:
  https://ir-tc.tencentmusic.com/2026-03-17-Tencent-Music-Entertainment-Group-Announces-Fourth-Quarter-and-Full-Year-2025-Unaudited-Financial-Results
- GuitarTuna/Yousician scale:
  https://guitartuna.com/about
- MuseScore Studio scale:
  https://www.mu.se/musescore-studio

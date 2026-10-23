# 클래식 빨리 맞추기 MVP

작성일: 2026-09-07

## 제품 정의

한국인 입문자와 라이트 애호가가 짧은 클래식 클립을 듣고 작곡가나 곡명을 빠르게 맞히는
모바일 우선 웹앱/PWA다. 첫 버전은 시험보다 "아는 멜로디를 발견하는 게임"에 가깝게
만든다.

## MVP 기능

- 첫 화면에서 바로 `데일리 10문제`, `작곡가 연습`, `곡명 연습` 중 하나를 시작한다.
- 한 세션은 10문제다.
- 하루의 정식 도전은 한국 시간 기준 1회로 제한한다.
- 각 문제는 5-12초 클립을 재생한다.
- 정답 선택 후 즉시 작곡가, 곡명, 한국어 별칭, 짧은 해설, 출처 상태를 보여준다.
- 결과 화면은 점수, 정답률, 평균 응답시간, 틀린 곡 다시 보기를 보여준다.
- 최근 결과와 오답 작품 ID를 `localStorage`에 저장한다.
- 알림 권한을 허용한 사용자는 다음 도전 가능 시각에 브라우저 알림을 받을 수 있다.
- 로그인, 서버, 결제, 글로벌 랭킹은 제외한다.

## 2026-09-07 개선 리뷰

첫 구현은 작동은 했지만 공개 MVP로 보기에는 다음 문제가 컸다.

- 첫 화면이 게임 화면보다 랜딩 페이지에 가까웠다.
- 모드 선택이 세그먼트 컨트롤처럼 느껴지지 않아 "바로 플레이" 신호가 약했다.
- 재생 UI가 단순 버튼과 막대 몇 개라 음악 앱의 손맛이 부족했다.
- Web Audio가 단음 나열에 가까워 곡을 듣는 재미보다 테스트음 느낌이 강했다.
- 최근 기록, 진행률, 정답 상태 변화가 없어 한 세션을 플레이한다는 감각이 약했다.
- 음원 권리 상태가 데이터 구조에는 있었지만 사용자 화면에서는 너무 개발자 메모처럼 보였다.

개선판은 이를 다음처럼 바꿨다.

- 첫 화면을 앱형 게임 보드로 재구성하고 `오늘의 10문제 시작`을 중심 CTA로 둔다.
- `작곡가` / `곡명`을 토글형 모드 선택으로 바꾼다.
- 상단에 진행, 점수, 응답시간을 고정 정보로 보여준다.
- 정답 선택 직후 보기 버튼에 정답/오답 상태를 먼저 칠하고 피드백으로 넘어간다.
- Web Audio 데모는 리듬값, 저음, 필터, 악기 프리셋을 추가해 단음 삐 소리를 줄인다.
- `verifiedAudioStatus`, `rightsNotes`, `searchAliasesKo`, `familiarReasonKo`, `modeTags`를 seed에 추가한다.
- 프로젝트 안에 mp3/wav/ogg/m4a 파일은 없었으므로 실제 음원은 넣지 않았다.

## 2026-09-07 오픈 음원 조사 반영

실제 음원은 Wikimedia Commons / Musopen / Internet Archive 계열에서 파일별 라이선스를 검수했다.
개발상 1차 `cleared-open` 후보 9곡은 `site/classic-quiz-data.js`에 `audioUrl`로 연결했고,
나머지는 `candidate` 또는 `needs-review`로 별도 JSON에 남겼다.

- 상세 조사 문서: `docs/product/classical-quick-quiz-audio-license-research.md`
- 앱 반영용 후보 JSON: `docs/product/classical-quick-quiz-audio-candidates.json`
- 실제 음원 재생 실패 시 기존 Web Audio 데모로 fallback한다.
- 피드백 화면에 `음원 출처` 링크를 추가해 CC BY 계열 attribution 흐름을 열어뒀다.

## 2026-09-07 데일리/라운드 난이도 반영

정식 도전은 한국 시간 기준 하루 1회로 제한한다. 서버가 없는 MVP이므로 제한과 회복 시각은
`localStorage`에 저장한다. 알림도 원격 푸시가 아니라 브라우저 Notification API 기반의 로컬 알림이며,
앱/PWA가 살아 있는 동안 다음 KST 자정 회복을 알려주는 수준이다. 백그라운드 원격 푸시는 계정/서버
단계에서 Web Push 구독과 서버 예약 발송으로 확장한다.

데일리 10문제는 다음처럼 쉬운 방식에서 어려운 방식으로 올라간다.

| 라운드 | 방식 | 대상 | 의도 |
| --- | --- | --- | --- |
| 1 | 4지선다 | 작곡가 | 가장 유명한 선율에서 작곡가 이름을 빠르게 떠올림 |
| 2 | 4지선다 | 곡명 | 한국어 별칭 중심으로 "아 이 곡" 경험을 줌 |
| 3 | 4지선다 | 시대 | 바로크/고전/낭만/근대의 큰 색깔을 익힘 |
| 4 | 4지선다 | 장르 | 교향곡/협주곡/오페라/무곡 같은 쓰임새를 구분 |
| 5 | 4지선다 | 작곡가 | 대중성 2단계 곡까지 섞음 |
| 6 | 4지선다 | 곡명 | 별칭만으로는 덜 쉬운 곡을 포함 |
| 7 | 자동완성 | 작곡가 | 보기를 줄이고 기억에서 검색하게 함 |
| 8 | 자동완성 | 곡명 | 한국어 별칭/정식명 일부로 찾게 함 |
| 9 | 주관식 | 작곡가 | 힌트 없이 작곡가를 직접 입력 |
| 10 | 주관식 | 곡명 | 가장 어려운 최종 문제 |

곡 데이터에는 `popularityTier`와 `genreKo`를 런타임 taxonomy로 붙여 라운드별 대중성 조절과 장르 문제를
만든다. 다음 단계에서는 이 값을 seed 데이터 필드로 고정하고, 초성 검색과 오타 허용을 추가한다.

## 2026-09-07 서비스 준비형 고도화

이번 구현에서는 첫 공개 MVP 이후 단계로 다음 구조를 추가했다.

- `데일리`와 `작곡가 연습` / `곡명 연습`을 분리했다. 데일리만 KST 기준 하루 1회 제한을 적용하고, 연습과 오답 복습은 제한 밖에 둔다.
- 데일리 10문제는 `site/classic-quiz-rounds.js`의 라운드 blueprint로 관리한다.
- 각 문제 상단에 라운드 브리핑을 보여줘 10문제가 쉬운 단계에서 어려운 단계로 올라가는 코스처럼 느껴지게 했다.
- 결과 화면은 전체 점수뿐 아니라 라운드별 정답/오답, 응답시간, 획득 점수를 보여준다.
- 결과 화면에 데일리 streak, 세션 약점, 다음 연습 추천을 표시한다.
- 오답은 작품/작곡가/장르/문제 방식 단위로 `localStorage`에 누적해 오답 노트의 기반으로 쌓는다.
- 실제 오픈 음원 후보는 `site/classic-quiz-audio.js`로 분리하고, `cleared-open` / `cleared-contract`만 앱 재생 소스로 인정한다.
- 오디오 로딩, 재생, 실패, Web Audio fallback 상태를 사용자에게 짧은 badge와 player copy로 보여준다.
- 출처/라이선스 전용 화면 `site/classic-quiz-credits.html`을 추가했다.
- `scripts/prepare-classic-quiz-audio.mjs`로 `cleared-open` 후보만 다운로드 계획, 네트워크 확인, checksum 산출 대상으로 삼을 수 있게 했다.
- 자동완성은 한국어 초성, 별칭, 부분 문자열 검색을 지원한다.
- 알림 인터페이스를 `requestReminderPermission`, `scheduleLocalReminder`, `registerPushSubscription`으로 분리했다. 현재는 로컬 Notification만 동작하고, `registerPushSubscription`은 서버/Web Push 단계의 placeholder다.

## 2026-09-07 비공개 테스트 후보 상태

비공개 테스트 전에 사용자 흐름과 운영 검증을 더 보강했다.

- 첫 화면에 `오답 노트` CTA를 추가했다. 최근 오답이 있을 때만 보이며, 데일리 제한 없이 복습할 수 있다.
- 결과 화면에 `작곡가 연습`, `곡명 연습`, `오답만 다시` CTA를 함께 둬 다음 행동을 바로 고르게 했다.
- 복습 세션은 `review` 모드로 따로 저장한다. 복습에서 다시 맞힌 곡은 최근 오답 목록에서 제거하고 `improvedWorkIds`에 남긴다.
- 사용자 화면의 권리 문구는 `오픈 출처 확인`처럼 짧게 정리하고, 자세한 권리 정보는 크레딧 페이지와 문서로 분리했다.
- `scripts/verify-classic-quiz.mjs`와 `npm run verify:classic-quiz`를 추가해 seed, round, audio, manifest, sitemap의 핵심 연결을 정적으로 검증한다.

현재 localStorage 주요 필드는 다음과 같다.

```ts
type ClassicQuizStorage = {
  schemaVersion: 3
  dailyChallenge: {
    dateKey?: string
    attemptsUsed?: number
    nextAttemptAt?: string
    reminderEnabled?: boolean
  }
  dailyStats: {
    streak: number
    bestDailyScore: number
    bestDailyAccuracy: number
    lastDailyDateKey: string
    lastDailyScore: number
    lastDailyAccuracy: number
  }
  trainingStats: {
    missedWorkCounts: Record<string, number>
    missedComposerCounts: Record<string, number>
    missedGenreCounts: Record<string, number>
    targetMissCounts: Record<string, number>
    methodMissCounts: Record<string, number>
  }
  missedWorkIds: string[]
  improvedWorkIds: string[]
}
```

## 화면 흐름

```text
첫 화면
  -> 모드 선택
  -> 문제 화면
  -> 정답 피드백
  -> 다음 문제 반복
  -> 결과 화면
  -> 틀린 곡 다시 보기 또는 새 세션
```

## 데이터 모델

```ts
type QuizWork = {
  id: string
  composerKo: string
  composerEn: string
  titleKo: string
  titleEn: string
  nicknameKo: string
  era: string
  genreKo: string
  popularityTier: 1 | 2 | 3 | 4
  difficulty: '입문' | '초급' | '중급' | '고급'
  audioUrl: string
  localAudioPath: string
  audioFormat: string
  audioSizeBytes: number
  audioDurationSeconds: number
  audioChecksum: string
  clipStart: number
  clipDuration: number
  sourceName: string
  sourceUrl: string
  license: string
  licenseUrl: string
  performer: string
  performerUrl: string
  rightsVerifiedAt: string
  notesKo: string
  searchAliasesKo: string[]
  familiarReasonKo: string
  modeTags: string[]
  verifiedAudioStatus:
    | 'demo'
    | 'candidate'
    | 'needs-review'
    | 'cleared-open'
    | 'cleared-contract'
    | 'blocked'
  rightsNotes: string
}
```

MVP 구현은 위 필드에 `motif`, `bass`, `tempo`, `synth`를 추가해 브라우저 Web Audio로 데모
선율을 생성한다. 실제 녹음 파일을 넣기 전까지는 오디오 저작권 리스크를 만들지 않는다.

```ts
type DailyRound = {
  roundNumber: number
  target: 'composer' | 'title' | 'era' | 'genre'
  method: 'choice' | 'autocomplete' | 'text'
  difficultyBand: 'intro' | 'easy' | 'normal' | 'hard'
  maxPopularityTier: 1 | 2 | 3 | 4
  scoreBase: number
  hintPolicy: 'strong' | 'category' | 'light' | 'search' | 'none'
}
```

점수는 `scoreBase + 빠른 응답 보너스`다. 현재 보너스는 12초보다 빠른 답변에 초당 10점씩 붙는다.
연속 정답은 2연속부터 추가 보너스를 주며, 주관식/자동완성 라운드는 blueprint의 `scoreBase`가 더 높다.

## 초기 문제 샘플 20개

| id | 작곡가 | 곡 | 별칭 | 난이도 |
| --- | --- | --- | --- | --- |
| beethoven-symphony-5-1 | 베토벤 | 교향곡 5번 1악장 | 운명 | 입문 |
| vivaldi-four-seasons-spring | 비발디 | 사계 중 봄 1악장 | 사계 봄 | 입문 |
| mozart-eine-kleine | 모차르트 | 아이네 클라이네 나흐트무지크 1악장 | 작은 밤의 음악 | 입문 |
| beethoven-fur-elise | 베토벤 | 엘리제를 위하여 | 엘리제를 위하여 | 입문 |
| mozart-turkish-march | 모차르트 | 피아노 소나타 11번 3악장 | 터키 행진곡 | 입문 |
| chopin-nocturne-op9-2 | 쇼팽 | 녹턴 Op. 9 No. 2 | 쇼팽 녹턴 | 입문 |
| tchaikovsky-swan-lake | 차이콥스키 | 백조의 호수 정경 | 백조의 호수 | 입문 |
| bach-air | 바흐 | 관현악 모음곡 3번 중 아리아 | G선상의 아리아 | 입문 |
| handel-messiah-hallelujah | 헨델 | 메시아 중 할렐루야 | 할렐루야 코러스 | 입문 |
| bizet-carmen-habanera | 비제 | 카르멘 중 하바네라 | 하바네라 | 입문 |
| dvorak-new-world | 드보르자크 | 교향곡 9번 4악장 | 신세계로부터 | 초급 |
| grieg-morning-mood | 그리그 | 페르 귄트 중 아침 기분 | 아침의 기분 | 입문 |
| debussy-clair-de-lune | 드뷔시 | 베르가마스크 모음곡 중 달빛 | 달빛 | 초급 |
| satie-gymnopedie-1 | 사티 | 짐노페디 1번 | 짐노페디 | 초급 |
| bach-minuet-g | 바흐 | 미뉴에트 G장조 | 바흐 미뉴에트 | 입문 |
| schubert-ave-maria | 슈베르트 | 아베 마리아 | 아베 마리아 | 입문 |
| mendelssohn-wedding-march | 멘델스존 | 한여름 밤의 꿈 중 결혼 행진곡 | 결혼 행진곡 | 입문 |
| mussorgsky-promenade | 무소륵스키 | 전람회의 그림 중 프롬나드 | 프롬나드 | 초급 |
| saint-saens-swan | 생상스 | 동물의 사육제 중 백조 | 백조 | 초급 |
| brahms-hungarian-dance-5 | 브람스 | 헝가리 무곡 5번 | 헝가리 무곡 | 초급 |

## 구현 계획

1. 정적 PWA 페이지를 유지한다.
2. 작품 seed는 `site/classic-quiz-data.js`, 라운드 규칙은 `site/classic-quiz-rounds.js`, 오디오 권리 메타데이터는 `site/classic-quiz-audio.js`로 분리한다.
3. `cleared-open` 실제 음원을 우선 재생하고, 실패하면 Web Audio 데모로 fallback한다.
4. 객관식, 자동완성, 주관식 입력을 같은 answer pipeline으로 처리한다.
5. 세션 결과와 오답은 `localStorage` v2에 저장한다.
6. 출처 표기는 피드백 짧은 링크와 별도 크레딧 페이지로 나눈다.
7. 비공개 테스트 전에는 `npm run verify:classic-quiz`로 콘텐츠/라운드/audio 연결을 먼저 확인한다.

## 확장 로드맵

1. MVP: 작곡가/곡명 4지선다, 20개 seed, 로컬 결과 저장.
2. 빠른 검색 입력 모드: 초성/부분 검색, 별칭 검색, 한글/영문 동시 검색.
3. 완전 주관식 모드: 작곡가 성만 인정, 띄어쓰기/외래어 표기 흔들림 허용.
4. 데일리 챌린지/공유: 하루 5문제, spoiler 없는 공유 이미지, streak.
5. 계정/랭킹: 지역/친구/시즌 랭킹, 부정 입력 방지.
6. 연주자 음원 등록 및 수익화: 연주자 프로필, 허가 음원, 후원/구매/공연 링크.
7. 학교/학원용 모드: 선생님 문제 세트, 오답 리포트, 수업용 공유 코드.

## 라이선스 리스크

- 악보가 공공영역이어도 특정 녹음은 별도 저작권/인접권 보호를 받을 수 있다.
- IMSLP는 국가별 공공영역 여부가 다를 수 있고, 파일별 태그를 그대로 상업 사용 허가로
  간주하면 안 된다.
- Musopen 등 공공영역 표기 서비스도 업로드 파일의 법적 상태를 독립적으로 재확인해야 한다.
- 한국 서비스라면 한국 저작권, 서버 소재지, 앱스토어 배포 국가, 음원 제공 국가를 함께
  검토해야 한다.
- CC BY/CC BY-SA 음원은 저작자 표시와 라이선스 링크를 앱 화면 또는 별도 출처 페이지에서
  충족해야 한다.
- CC NC, ND, performance-restricted 계열은 수익화 및 게임 클립 편집에 맞지 않을 수 있다.

## 비공개 테스트 리스크

- 제품: 오답 복습과 연습 모드가 충분히 재미있는지는 실제 사용자 5-10명 테스트가 필요하다.
- 법률: `cleared-open`은 개발상 후보이며, 정식 공개/수익화 전 법무 검토가 필요하다.
- 기술: 외부 Wikimedia URL은 속도, CORS, rate limit, 정책 변경 리스크가 있다.
- UX: 모바일 Safari의 오디오 seek, Notification 권한, 긴 곡명 줄바꿈은 실기기 확인이 필요하다.

## 음원 등록 전 체크리스트

- 작품 저작권: 작곡가 사망연도, 편곡자/편집자 권리, 최초 출판권 확인.
- 녹음 저작권: 녹음 연도, 발행 연도, 연주자/제작자/레이블 권리 확인.
- 라이선스: 상업 사용, 파생/편집, 스트리밍, 앱 내 저장 허용 여부 확인.
- 출처 표기: 작품, 연주자, 소스 URL, 라이선스 URL, 변경 여부 표기.
- 기술 확인: CORS, 모바일 자동재생 제한, clipStart seek 가능 여부, 오프라인 저장 가능 여부.
- 계약 음원: 연주자 동의서, 정산 기준, 철회 정책, 독점/비독점 여부.

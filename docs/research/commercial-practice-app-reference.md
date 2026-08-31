# 상용 음악 연습앱 레퍼런스 조사

작성일: 2026-08-30

## 조사 목적

예전의 무료 유틸앱 포트폴리오 실험을 넘어, 실제 사용자가 반복해서 들어오고 결제할 수
있는 음악앱 서비스 유형을 고른다. 이번 조사는 `Clef`처럼 악보와 실제 연주를 연결하는
상용 제품군을 중심으로 보고, 현재 in C/Chromatics/Clef 자산을 어떤 앱 흐름으로 키울지
결정하기 위한 1차 메모다.

## 결론

선정할 앱 유형은 **악보 기반 클래식 연습 OS**다.

정확히는 "악보 라이브러리 + 인터랙티브 악보 뷰어 + 구간 연습 + MIDI/마이크 피드백 +
기억 복습 + 연습 기록"을 하나의 흐름으로 묶는 앱이다. 일반 음악 스트리밍, 단순
메트로놈/튜너, 범용 PDF 악보 뷰어, 전문 사보 프로그램 중 하나를 그대로 따라가는 방향은
피한다.

현재 레포는 이미 다음 자산을 갖고 있으므로 이 선택과 맞는다.

- Electron/React 기반 Chromatics 악보 편집 표면.
- `score-core`, MusicXML import/export, VexFlow 렌더링, playback timeline.
- `apps/in_c_sheet`의 Android 악보 뷰어, 세트리스트, 주석, 공연 모드, 튜너/메트로놈,
  PDF link annotation 정리 계획.
- in C의 작품/공연/커뮤니티 철학.

따라서 새 제품은 "작은 유틸앱 묶음"이 아니라 사용자의 전체 음악 생활 중 하나의 강한
반복 루틴을 잡아야 한다.

```text
오늘 연습할 곡을 고른다 -> 연결 상태를 확인한다 -> 악보를 보며 연주한다 ->
틀린 구간을 다시 한다 -> 외운 마디를 복습한다 -> 오늘 할 일을 끝낸다 ->
다음에 이어 할 위치가 자동으로 잡힌다
```

## 왜 이 유형인가

### 강점

- 기존 악보 엔진과 Android 악보 뷰어 구현을 재사용할 수 있다.
- Clef, flowkey, Simply Piano, Piano Marvel, Skoove, Yousician 모두 "듣고 바로 피드백"을
  핵심 상용 가치로 판다.
- in C의 클래식 맥락과도 맞는다. 단순히 악보를 보관하는 앱이 아니라 작품을 익숙하게
  만들고, 감상/공연/학습으로 이어지는 앱이 될 수 있다.
- 한국어 친화, 클래식 입문자 친화, 공공저작물/교육용 악보 큐레이션은 기존 대형 앱이
  덜 세밀하게 다루는 지점이다.

### 피해야 할 선택

| 후보 | 왜 지금은 부적합한가 |
| --- | --- |
| 스트리밍 앱 | 음원 라이선스, 추천 알고리즘, 플레이리스트 경쟁이 핵심이라 현재 자산과 거리가 멀다. |
| 범용 튜너/메트로놈 | 반복 사용은 있지만 단일 기능 경쟁이 세고 유료화 여지가 작다. |
| 범용 PDF 악보 뷰어 | MobileSheets/forScore류와 정면 경쟁하면 기능 범위가 과도하게 커진다. |
| 전문 사보 앱 | MuseScore/Dorico/StaffPad와 경쟁하면 엔진 범위가 커지고 in C의 감상/연습 가설이 흐려진다. |
| AI transcription 우선 앱 | 저작권, 서버 비용, 품질 기대치가 높다. 후속 확장으로는 가능하지만 첫 상용 흐름으로는 무겁다. |

## 핵심 레퍼런스

### Clef

URL: https://playclef.com/getting-started/, https://playclef.com/pricing/,
https://playclef.com/about/

Clef는 USB-MIDI 디지털 피아노를 연결해 실제 연주를 채점하고, 악보의 마디를 기억 복습
단위로 쪼갠다. 첫 사용은 계정 생성, 키보드 연결 확인, 약 20초 soundcheck로 이어지고,
연습 중에는 맞은 음과 틀린 음을 악보 위에 즉시 표시한다. 핵심은 단순 플레이어가 아니라
"마디 단위 기억 유지 스케줄러"다. 유료 베타는 14일 무료 체험, 초기 founding rate
$9/month, 이후 standard rate $19/month로 설명한다.

가져올 점:

- 처음 5분 안에 계정, 장치 연결, soundcheck를 끝내는 onboarding.
- 연습 화면의 컨트롤을 최소화하고 악보와 피드백을 중심에 두는 방식.
- 마디별 암보 복습, streak, heatmap, 오늘 할 분량 종료 화면.
- 곡 request/vote로 큐레이션 catalog를 키우는 방식.

주의할 점:

- Clef는 2026-08-30 확인 기준 Web MIDI 중심이라 acoustic piano와 모바일 브라우저 제약이
  크다. 우리는 Android/iPad 악보 뷰어 경험을 갖고 있으므로 device strategy를 별도로
  가져갈 수 있다.

### flowkey

URL: https://www.flowkey.com/en

flowkey는 사용자가 좋아하는 곡을 배우는 흐름을 전면에 둔다. 대표 기능은 수천 곡
catalog, Wait Mode, expert pianist video와 sheet music 동시 표시, slow motion, loop,
right/left hand 분리 연습이다.

가져올 점:

- "좋아하는 곡을 연주한다"는 곡 중심 진입.
- Wait Mode와 loop로 사용자가 같은 구간에 오래 머무를 수 있게 하는 연습 UX.
- 영상, 악보, 손 분리 연습을 한 화면의 자연스러운 옵션으로 배치.

주의할 점:

- 대형 상업곡 catalog는 라이선스가 핵심이다. 초기에는 public domain/직접 입력/교육용
  큐레이션으로 좁힌다.

### Simply Piano

URL: https://www.hellosimply.com/simply-piano

Simply Piano는 완전 초보자가 "오늘 첫 곡을 치는 느낌"을 얻는 데 강하다. 사용자의
수준에 맞춘 lessons, real-time feedback, song library, warm-up, personalized exercises,
sheet music을 강조한다.

가져올 점:

- "못해도 시작할 수 있다"는 초보자 온보딩 톤.
- 실시간 피드백을 결과 화면과 다음 학습으로 연결하는 흐름.
- warm-up과 personalized exercise를 곡 연습 앞뒤에 붙이는 구조.

주의할 점:

- 가족/아동/완전 초보 시장으로 너무 넓히면 in C의 클래식 포지션이 흐려질 수 있다.

### Piano Marvel

URL: https://pianomarvel.com/en/feature/sasr

Piano Marvel의 SASR은 시창/초견 능력을 점수화하는 레퍼런스다. 수천 개의 sight-reading
excerpt를 90개 sublevel로 나누고, 사용자의 점수에 따라 다음 excerpt를 고른다. 결과는
SASR score chart로 추적된다.

가져올 점:

- "너는 지금 어느 수준인가"를 객관 점수와 레벨로 알려주는 assessment.
- 너무 쉽지도 어렵지도 않은 다음 과제를 자동 추천하는 adaptive flow.
- 30일 challenge처럼 짧고 반복 가능한 훈련 프로그램.

주의할 점:

- 레벨링된 excerpt bank가 없으면 흉내만 난다. 초기에는 단선율/초급 피아노/리듬 패턴
  같은 좁은 bank부터 만든다.

### Skoove

URL: https://www.skoove.com/en, https://www.skoove.com/en/pricing

Skoove는 bite-sized lesson, real-time feedback, moving score, backing track, 1000개
이상의 lesson/course, 무료 일부와 월/연 프리미엄 구독을 내세운다.

가져올 점:

- 짧은 lesson 단위와 곡 연습을 섞는 구조.
- moving score와 backing track으로 악보 읽기 부담을 낮추는 방식.
- 무료 맛보기 뒤 subscription으로 넘어가는 packaging.

주의할 점:

- lesson/course 제작 비용이 크다. 초기에는 모든 이론 강의를 만들기보다 "이 곡을 치기
  위해 필요한 한 가지" 식의 micro lesson으로 제한한다.

### Yousician

URL: https://yousician.com/, https://support.yousician.com/hc/en-us/articles/203751452-Game-tab

Yousician은 기타, 피아노, 우쿨렐레, 베이스, 보컬까지 넓은 악기를 다루며, 실시간 피드백,
레슨, exercises, songs, level-up, high score, audio/MIDI 설정을 결합한다. 지원 문서에는
input activity, buffer size, MIDI, Bluetooth MIDI keyboard, latency calibration 같은 세부
입력 설정이 드러난다.

가져올 점:

- 악기 입력 상태를 사용자가 이해할 수 있게 보여주는 diagnostic.
- latency calibration, buffer, MIDI sensitivity 같은 실제 연습앱 필수 설정.
- game-like 보상은 과하지 않게, 정확도와 지속성을 보여주는 지표로 활용.

주의할 점:

- 다악기 확장은 매력적이지만 초기에는 piano/keyboard 또는 단선율 악기 하나로 좁힌다.

### Soundslice

URL: https://www.soundslice.com/?lang=en,
https://www.soundslice.com/help/en/creating/overview/156/introduction/

Soundslice는 악보와 실제 audio/video recording을 sync한 "living sheet music"을 만든다.
사용자는 음표를 클릭해 녹음 위치로 이동하고, 구간을 드래그해 loop를 만들고, slowdown,
transpose, part solo 같은 연습 도구를 쓴다. MusicXML, Guitar Pro, PDF/photo scan,
YouTube/MP3/video sync, cloud save, share link도 핵심이다.

가져올 점:

- 악보와 실제 녹음을 sync하면 "악보가 소리를 설명하지 못하는 부분"을 보완할 수 있다.
- note-to-time navigation, drag-to-loop는 연습 UX의 강한 기준이다.
- 웹 공유와 임베드는 in C의 작품/Columns/공연 페이지와 잘 맞는다.

주의할 점:

- full sync editor와 scan/transcription까지 한 번에 들어가면 범위가 너무 커진다. 초기에는
  synthetic playback timeline과 수동 구간 loop부터 시작한다.

### Tonara

URL: https://www.tonara.com/homepage/,
https://www.tonara.com/helpcenter/knowledge-base/whats-a-compare-recording-assignment/

Tonara는 teacher-student practice management에 가깝다. 과제, 채팅, practice tracking,
leaderboard, teacher feedback을 제공하고, Compare Recording Assignment에서는 선생님이 올린
녹음과 학생 연주를 비교해 pitch, rhythm, tempo, fluency 피드백을 준다고 설명한다.

가져올 점:

- 레슨/선생님 흐름은 결제 의사가 생길 수 있는 B2B/B2B2C 확장축이다.
- "과제에 필요한 악보, 녹음, 영상, 설명이 한 곳에 붙어 있다"는 흐름.
- 학생의 연습 기록을 선생님이 다음 레슨에 바로 활용하는 구조.

주의할 점:

- 처음부터 teacher studio SaaS로 가면 권한, 결제, 채팅, 운영이 커진다. 개인 연습앱이
  충분히 작동한 뒤 class/teacher layer를 얹는다.

### MuseScore

URL: https://apps.apple.com/us/app/musescore-sheet-music-chords/id835731296,
https://www.mu.se/posts/musescore-audio-score-features

MuseScore 모바일 앱은 대형 악보 catalog, offline view, interactive player, tempo/loop,
practice mode, transpose, on-screen keyboard, metronome, export 등을 제공한다. Muse Group은
2026-08-17에 Audio-to-Score beta와 모바일 음악 인식 기능을 발표했다.

가져올 점:

- catalog, player, practice feature, export를 한 계정/구독으로 묶는 플랫폼화.
- 사용자가 "들은 곡을 내가 연주할 수 있을까"라고 느끼는 순간을 잡는 방향.

주의할 점:

- 대형 catalog와 AI audio-to-score는 규모의 경쟁이다. 우리는 public-domain, 직접 제작,
  한국어 클래식 맥락, 연습 루틴으로 좁힌다.

### ClefScribe

URL: https://www.clefscribe.com/

ClefScribe는 MP3/WAV/MIDI 또는 YouTube link를 입력해 editable sheet music으로 바꾸고,
transpose, tempo edit, notation tools, collaboration, version history, comments,
PDF/MIDI/MusicXML export를 제공한다고 설명한다.

가져올 점:

- upload/import -> project -> editor -> export/share의 creator workflow.
- MusicXML export와 협업은 Chromatics의 장기 확장과 맞는다.

주의할 점:

- AI transcription 품질과 저작권 위험을 초기 핵심 가치로 두지 않는다.

## 제품 포지션

### 한 문장

`Clef`는 클래식 악보를 오늘 연습할 구간으로 바꾸고, 실제 연주 피드백과 기억 복습으로
다음 연습까지 이어주는 한국어 친화 연습앱이다.

### 대상 사용자

1. 피아노/키보드를 가진 성인 초중급자.
2. 악보는 읽지만 꾸준히 외우거나 유지하지 못하는 취미 연주자.
3. 레슨을 받거나 독학하면서 "다음에 뭘 해야 하는지"를 자주 잊는 사용자.
4. 장기적으로는 학생에게 악보와 과제를 보내는 개인 레슨 선생님.

### 첫 악기 선택

1차는 **피아노/디지털 키보드**가 가장 낫다.

- MIDI로 pitch/timing 채점이 비교적 명확하다.
- 현재 악보 엔진이 pitch/duration/timeline 중심이라 맞물린다.
- Clef, flowkey, Simply Piano, Piano Marvel, Skoove가 이미 결제 시장을 증명했다.
- acoustic piano는 마이크 채점으로 가면 난이도가 커지므로 V1에서는 MIDI 우선, 마이크는
  튜너/녹음/간단 pitch confidence 정도로 둔다.

### 콘텐츠 선택

초기 catalog는 다음 순서로 좁힌다.

1. public-domain 클래식 피아노 소품.
2. 한국/세계 민요 단선율과 쉬운 편곡.
3. 사용자가 가져온 MusicXML/PDF.
4. 내부 Chromatics로 만든 교육용 exercise.
5. 곡 request/vote로 다음 engraving 후보 선정.

상업곡 license catalog는 후순위다.

## 상용급 사용자 흐름

### 1. 가입과 목표 설정

- email 또는 social login.
- 악기: 디지털 피아노/키보드, acoustic piano, 아직 없음.
- 목표: 악보 읽기, 한 곡 완성, 암보 유지, 레슨 과제, 공연/발표 준비.
- 경험 수준: 처음, 양손 초급, 악보 읽기 가능, 중급 이상.
- 하루 연습 가능 시간: 3분, 10분, 20분, 직접 설정.

### 2. 장치 연결과 soundcheck

- MIDI device detect.
- 사용자가 건반 하나를 눌러 device 확인.
- latency/input diagnostic.
- 짧은 melody를 따라 치며 green/red feedback preview.
- 연결 실패 시 터치 keyboard 또는 viewer-only mode로 진입.

### 3. 홈

- Continue card: 오늘 해야 할 곡, 예상 시간, due review 수.
- Current piece card: 마지막 위치, 문제 구간, 최고 clean tempo.
- Library entry: curated pieces, 내 악보, requested pieces.
- Practice heatmap/streak은 보조 지표로 둔다.
- 공연/레슨/커뮤니티는 홈 하단의 맥락 카드로만 작게 시작한다.

### 4. 곡 선택

- 난이도, 길이, 작곡가, mood, 필요한 기술로 필터.
- 곡 상세: 악보 preview, 예상 학습 시간, 필요한 technique, 관련 Columns/공연/영상.
- "바로 연습", "먼저 들어보기", "Chromatics에서 열기", "내 목록에 추가".

### 5. 연습 세션

- 악보 중심 화면.
- playback, metronome, start bar, loop, tempo, hands separately.
- 연주 입력은 MIDI 우선.
- 맞은 note/chord는 green, 틀린 note는 score 위치에 표시.
- rhythm/timing은 너무 엄격하게 시작하지 않고 "맞은 음 -> 박자 안정 -> 표현" 순서로
  피드백 단계화.
- practice take는 저장하고 MIDI export 가능하게 둔다.

### 6. 구간 해결

- 틀린 마디를 자동으로 problem spots에 모은다.
- 같은 마디를 2번 clean pass하면 다음 구간으로 넘긴다.
- bar tempo map에 "깨끗하게 친 최고 BPM"을 저장한다.
- loop는 마디 선택 또는 음표 drag selection으로 만든다.

### 7. 기억 복습

- 새 마디는 score visible guided pass 후 hide/reveal challenge로 전환.
- 이전 마디를 단서로 보여주고 다음 마디를 외워 친다.
- 실패하면 해당 마디를 짧게 재연습한다.
- 일정 마디마다 checkpoint run-through.
- 다음 복습일은 spaced repetition queue에 들어간다.

### 8. 세션 종료

- 오늘 한 일: 연습 시간, clean bars, review success, 최고 tempo 변화.
- 다음에 할 일: due review, new bars, unresolved spots.
- "오늘은 끝" 화면을 명확히 제공해 앱이 사용자를 계속 붙잡지 않게 한다.

### 9. 선생님/커뮤니티 확장

- V1 이후 선생님은 piece/section/task를 assignment로 보낼 수 있다.
- 학생은 take를 공유하고, 선생님은 짧은 feedback을 남긴다.
- in C 작품/Columns/공연 페이지와 연결해 단순 숙제 앱이 아니라 음악 맥락으로 확장한다.

## 기능 범위 제안

### Commercial V0

- 계정 없이 local first trial 가능.
- curated demo pieces 3-5개.
- MusicXML 기반 악보 표시와 synthetic playback.
- MIDI 입력 감지와 soundcheck.
- note-level 정오답 표시.
- start bar, reset, reveal, metronome.
- 세션 결과와 최근 연습 위치 저장.

### Commercial V1

- 계정, cloud profile, subscription gate.
- curated catalog 30-50개.
- practice queue, due review, streak, heatmap.
- bar-level clean pass, 최고 tempo map.
- memory challenge.
- user MusicXML import.
- Android tablet viewer와 desktop editor 사이 basic handoff.
- piece request/vote.

### Commercial V2

- PDF/import score alignment.
- audio/video sync.
- teacher assignment.
- take recording, MIDI export, share link.
- adaptive sight-reading mini test.
- micro lesson/course.
- iPad/Android parity.

### Later

- 상업곡 license catalog.
- AI audio-to-score.
- 실시간 협업 편집.
- 다악기 채점.
- teacher studio SaaS.

## 수익 모델 가설

초기에는 Clef의 paid beta 방식을 참고한다.

- 무료: viewer/editor 일부, demo catalog, 하루 제한 practice.
- Trial: 14일 full access.
- Personal: 월 구독. practice engine, review queue, full catalog, import, take 저장.
- Lifetime 또는 founding plan: 초기 cohort 피드백과 catalog request 우선권.
- Teacher later: 학생 수 기반 또는 studio plan.

구독 가격은 별도 결제 실험 전까지 확정하지 않는다. 2026-08-30 확인한 레퍼런스만 보면
Clef는 founding $9/month와 standard $19/month를 제시하고, tonebase 같은 고급 교육
서비스는 훨씬 높은 가격대를 쓴다. 우리 초기 가격은 catalog 규모와 feedback 정확도를
검증한 뒤 정한다.

## 제품 원칙

- 악보 화면은 연습 중 흔들리지 않는다. 기능은 overlay/bottom sheet로만 최소 개입한다.
- 사용자는 앱을 오래 쓰기보다 오늘 할 연습을 끝내고 나가야 한다.
- feedback은 벌점이 아니라 다음 행동을 알려주는 표시여야 한다.
- 초보자에게 이론을 먼저 요구하지 않는다. 곡, 소리, 구간, 반복에서 시작한다.
- public-domain과 사용자가 직접 올린 자료를 먼저 다뤄 저작권 리스크를 낮춘다.
- 기존 Chromatics는 "사보 앱"이 아니라 연습 catalog와 개인 exercise를 만드는 제작 표면으로
  재배치한다.

## 다음 조사/구현 질문

1. 첫 상용 V0를 Electron desktop에 만들지, Android tablet Clef에 붙일지 결정해야 한다.
2. MIDI 입력을 Electron에서 먼저 구현하면 Clef와 가장 가까운 경험을 빠르게 검증할 수 있다.
3. Android는 PDF viewer 강점이 있지만 Web/USB MIDI와 악보 채점까지 붙이려면 device QA가 커진다.
4. catalog 3-5개를 직접 MusicXML로 준비하고, bar-level feedback이 실제로 쓸 만한지 관찰해야 한다.
5. "한국어 클래식 연습앱"으로 갈지, "전세계 public-domain piano practice app"으로 갈지 초기
   acquisition 문장을 분리해 테스트해야 한다.

## 1차 결정

당장 다음 제품 작업은 **Clef Practice V0**로 부른다.

권장 구현 순서는 다음과 같다.

1. Electron/Chromatics 안에 `Practice` 모드를 추가한다.
2. MusicXML score를 열고 bar 단위 cursor/playback을 안정화한다.
3. Web MIDI 또는 Electron MIDI 입력을 붙여 note-on/off를 score timeline과 비교한다.
4. soundcheck와 practice result 화면을 만든다.
5. 3개 demo piece로 사용자 관찰 테스트를 한다.
6. Android Clef에는 같은 piece library와 practice plan을 읽는 viewer 흐름을 붙인다.

이 순서가 좋은 이유는 현재 레포의 score/timeline 자산을 가장 빨리 검증하면서도, 장기적으로
Android 악보 뷰어와 in C 웹 표면으로 확장할 수 있기 때문이다.

## 출처

- Clef Getting Started: https://playclef.com/getting-started/
- Clef Pricing / Beta Access: https://playclef.com/pricing/
- Clef About: https://playclef.com/about/
- flowkey: https://www.flowkey.com/en
- Simply Piano: https://www.hellosimply.com/simply-piano
- Piano Marvel SASR: https://pianomarvel.com/en/feature/sasr
- Skoove: https://www.skoove.com/en
- Skoove Pricing: https://www.skoove.com/en/pricing
- Yousician: https://yousician.com/
- Yousician Game tab: https://support.yousician.com/hc/en-us/articles/203751452-Game-tab
- Soundslice: https://www.soundslice.com/?lang=en
- Soundslice creating overview:
  https://www.soundslice.com/help/en/creating/overview/156/introduction/
- Tonara homepage: https://www.tonara.com/homepage/
- Tonara Compare Recording Assignment:
  https://www.tonara.com/helpcenter/knowledge-base/whats-a-compare-recording-assignment/
- MuseScore App Store listing:
  https://apps.apple.com/us/app/musescore-sheet-music-chords/id835731296
- Muse Group audio-score features:
  https://www.mu.se/posts/musescore-audio-score-features
- ClefScribe: https://www.clefscribe.com/

# in C - Chime 기준음/드론 앱 조사

작성일: 2026-08-19

## 목적

`in C - Chime`을 두 번째 무료 음악 유틸앱 후보로 잡기 전에, 상용 앱들이
기준음, 피치 파이프, 드론, 튜너 주변 기능을 어떻게 제공하는지 정리한다.

조사 범위는 App Store, Google Play, 제작사 공식 페이지에서 확인 가능한 공개
정보를 중심으로 한다. 실제 가격, IAP, 지역별 기능은 스토어 지역과 시점에 따라
달라질 수 있다.

## 결론

기준음/드론 계열 앱은 이미 존재한다. 다만 시장은 크게 두 방향으로 갈라져 있다.

- 아주 단순한 pitch pipe: 시작음을 빠르게 들려주는 합창/보컬 도구.
- 전문 연습 suite: 마이크 튜너, 메트로놈, 녹음, temperaments, 연습 기록까지
  묶는 고기능 앱.

`in C - Chime`은 첫 버전에서 두 방향을 모두 따라가기보다, 마이크 권한이 없는
가벼운 기준음/드론 앱으로 잡는 것이 적합하다. `in C - Click`과 같은 철학을
유지하려면 로그인, 광고, 결제, 서버 저장, 마이크 pitch detection은 MVP에서
제외한다.

## 앱 유형별 조사

| 유형 | 대표 앱 | 쓰는 소리 | 주요 기능 | Chime 시사점 |
| --- | --- | --- | --- | --- |
| Pitch pipe | Pitch, Please!, The Pitch Pipe, Pitch Pipe by Congregate, Pocket Pitch | 짧은 pitch pipe tone, piano, clarinet, strings, horns, sine 등 | 시작음 재생, C-C/F-F 범위, 음 길이, Apple Watch, 노트/송리스트, 일부는 실시간 pitch detection | 시작음을 빠르게 찾는 "one tap" 흐름은 유효하다. 다만 앱이 너무 단순하면 차별화가 약하다. |
| Cello / acoustic drone | DroneTones, DroneTone Lite, Drone Tuner | 실제 첼로 long tone, layered octave, 전문 연주자 녹음 악기음 | 12음 드론, 코드, pitch adjustment, volume, 조율/음색 시각화 | 전자음보다 피로가 덜한 acoustic-like drone 니즈가 뚜렷하다. 샘플 저작권 없이 구현하려면 합성 기반 warm drone이 안전하다. |
| Tuner + tone generator suite | TonalEnergy, Tunable, Stimmung | sine/square/saw, additive synthesis, 관현악기, organ, guitar, strings | 마이크 튜너, reference tone, temperament, A4 calibration, metronome, recording, interval/chord, practice tracking | 기능 기대치가 높지만 MVP로 따라가면 과하다. Chime은 "튜너 아님"을 명확히 해야 한다. |
| Guitar/instrument tuner with pitch pipe | Fender Tune, BOSS Tuner, Pano Tuner, Cleartune, n-Track Tuner, Tuner by Piascore | reference tone, pitch pipe, manual string tone, selectable waveform | 마이크 튜너, chromatic mode, manual tune, A4 calibration, transposition, temperament, ads/account/IAP | reference tone은 튜너 앱의 보조 기능으로 흔하다. Chime은 튜너 UI가 아니라 귀 훈련/합주 기준음 UX로 차별화해야 한다. |
| Indian classical drone | iTablaPro, Shruti Laya, SrutiBox 계열 | tanpura, shruti box, tabla/mridangam, manjira | Sa tonic, Pa/Ma/Ni support, tala, tempo, background playback, 일부 tuner | 탄푸라/쉬루티 앱은 장르 특화가 강하다. Chime은 서양음악/클래식 연습용 일반 기준음으로 좁히는 편이 안전하다. |

## 대표 앱 메모

### TonalEnergy Tuner & Metronome

- 포지션: 튜너, 메트로놈, tone generator, analysis, recording을 묶은 고기능
  연습 suite.
- 소리: symphonic winds, guitar, organ, orchestral strings, saw, square, sine,
  bowed/plucked strings 등.
- 기능: A=440 기준 조정, equal/just/custom temperament, chromatic wheel,
  pitch grid, 8옥타브 keyboard, auto exercise, recording, Bluetooth/MIDI,
  Apple Watch remote.
- 시사점: 전문 사용자는 drone/tone generator에 악기음과 temperament를 기대한다.
  하지만 Chime 첫 버전에서 이 범위는 과하다.

### Tunable

- 포지션: tuner, tone generator, metronome, ear training, recording, practice
  session을 묶은 연습 앱.
- 소리: sine, square, saw reference tones.
- 기능: piano 또는 hexagon interface, sustain, 최대 6음 hold, interval/chord
  연습, tuner와 tone generator 동시 표시.
- 시사점: Chime도 sustain drone과 짧은 pitch pipe를 분리하면 사용 목적이
  명확해진다.

### Stimmung

- 포지션: pitch/intonation 학습을 위한 전문 환경.
- 소리: additive synthesis drone.
- 기능: tuner, drone, interval compare, tuning system explore, A4 custom,
  sharp/flat/automatic spelling, instrument presets, historical temperament.
- 시사점: "needle tuner보다 듣는 연습"이라는 메시지는 Chime과 잘 맞는다.

### DroneTones / DroneTone Lite

- 포지션: real cello drone 기반 기준음 앱.
- 소리: warm cello, layered octaves, rich overtones.
- 기능: 12음 드론, volume, chords, pitch adjustment, 무료/IAP 또는 tip jar.
- 시사점: 드론은 깨끗한 sine보다 "오래 들어도 피로하지 않은 복합 배음"이
  중요하다.

### Drone Tuner

- 포지션: 전문 연주자 녹음 long tone과 시각화를 결합한 유료 drone/tuner.
- 소리: alto sax, bass clarinet, bassoon, cello, clarinet, English horn,
  flute, French horn, guitar, oboe, piano, tenor sax, trombone, trumpet, tuba,
  upright bass, ukulele, viola, violin 등.
- 기능: root note 기준 chord 안에서 자신의 위치를 보는 시각화, interference
  pattern 기반 tuning feedback, 자연스러운 pitch variation 옵션.
- 시사점: 고급 앱은 "실제 악기와 섞이는 감각"을 판다. Chime은 그중 낮은
  피로도의 소리만 작게 가져오면 된다.

### Pitch, Please!

- 포지션: forScore 제작사의 pitch pipe 앱.
- 소리: clarinet, piano는 짧은 sample, strings/horns는 loop, sine generator.
- 기능: 3옥타브 C-C/F-F, iOS/iPadOS/watchOS/macOS, lock screen/home screen,
  frequency fine tune.
- 시사점: `Chime` MVP에는 "짧게 울리는 시작음"과 "계속 유지되는 drone" 두
  모드가 모두 있으면 좋다.

### The Pitch Pipe / Pitch Pipe by Congregate / Pocket Pitch

- 포지션: 합창, 보컬, worship leader 대상 pitch pipe.
- 소리: chromatic pitch pipe, piano, sustained tone.
- 기능: C-C/F-F 또는 chromatic notes, song list/note memo, playable notes,
  note duration, font size, Apple Watch, tuner/metronome/vocal warmups.
- 시사점: 보컬/합창 사용자는 "곡 시작 전 빠르게 음을 찍는" 흐름을 원한다.

### Pano Tuner / Cleartune / BOSS Tuner / n-Track / Piascore

- 포지션: 마이크 chromatic tuner가 본체이고 reference tone/pitch pipe는 보조.
- 소리: clean reference tone, pitch pipe, selectable waveform.
- 기능: A4 calibration, cents display, transposition, temperament, note
  naming, pitch/frequency display, spectrum/sonogram 등.
- 시사점: Chime이 튜너로 보이면 기존 강자와 바로 비교된다. 첫 앱 설명은
  "tuner"보다 "reference tone / drone for listening practice"가 낫다.

### Fender Tune / Soundbrenner

- 포지션: 기타/밴드 연습 생태계 앱.
- 소리: string manual tune tone, metronome clicks, drum tracks, reference tone.
- 기능: account, custom tunings, metronome, rhythm/drum tracks, practice
  tracker, setlists, gear/product ecosystem.
- 시사점: 기능은 강하지만 계정/콘텐츠/상거래가 붙는다. Chime은 반대로 "계정
  없이 바로 켜는 도구"가 차별점이다.

## 소리 패턴

상용 앱에서 확인되는 기준음/드론 소리는 다음으로 나뉜다.

- Pure tone: sine. 정확하고 구현이 쉽지만 오래 들으면 피로할 수 있다.
- Basic synth: square, saw. 배음이 강하고 음정 확인이 쉽지만 거칠 수 있다.
- Acoustic sample: cello, strings, horns, woodwinds, piano, guitar. 자연스럽지만
  앱 용량, 라이선스, 루프 품질 관리가 필요하다.
- Additive/warm synth: 여러 배음을 합성한 드론. 샘플 없이도 피로가 덜한 소리를
  만들 수 있다.
- Chime/pitch pipe attack: 짧은 시작음. 곡 시작 전 pitch cue에는 좋지만 장시간
  드론에는 sustain 품질이 중요하다.
- Tanpura/shruti style: 배음과 반복 pluck이 강한 장르 특화 drone.

`in C - Chime`은 샘플 라이선스 부담을 피하기 위해 기본은 합성음으로 시작한다.
다만 앱 이름에 맞춰 attack은 부드러운 chime 느낌, sustain은 안정적인 drone으로
설계한다.

## MVP 제안

### 제품 포지션

`in C - Chime`은 조율과 음정 연습을 위한 무료 기준음/드론 앱이다.

첫 버전 설명은 다음처럼 잡는다.

> A simple reference tone and drone app for tuning by ear and intonation
> practice.

한국어 설명:

> 조율과 음정 연습을 바로 시작할 수 있는 무료 기준음/드론 앱입니다.

### 포함 기능

- 음 선택: C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B
- 옥타브 선택: 2-5
- 기준 주파수: A=440, 441, 442
- 짧은 Chime 모드: 선택한 음을 1-2초 재생
- Drone 모드: 선택한 음을 지속 재생
- 음색 3개:
  - Pure: sine 기반
  - Warm: 낮은 배음이 섞인 부드러운 합성 drone
  - Bright: chime attack이 더 뚜렷한 합성 tone
- 볼륨 조절
- 최근 설정 로컬 저장

### 제외 기능

- 마이크 튜너
- pitch detection
- 녹음
- 계정
- 결제/IAP
- 광고
- 서버 저장
- 저작권 있는 악기 샘플
- background audio 고도화
- temperament/custom tuning deep settings

## 후속 버전 후보

- A4 custom slider: 415-466 Hz 또는 420-460 Hz
- 장/단 5도 drone 또는 tonic+fifth drone
- choir pitch pipe 화면: C-C/F-F 빠른 선택
- Apple Watch companion
- lock screen playback control
- just intonation interval trainer
- 사용자별 즐겨찾기 pitch
- cello-like 또는 organ-like 합성음 추가

## 참고 출처

- TonalEnergy: https://www.tonalenergy.com/home
- TonalEnergy App Store: https://apps.apple.com/us/app/tonalenergy-tuner-metronome/id497716362
- Tunable features: https://tunableapp.com/features/
- Tunable tone generator guide: https://tunableapp.com/guide/documentation/tone-generator/
- Stimmung Google Play: https://play.google.com/store/apps/details?id=com.pialon.stimmung
- DroneTones App Store: https://apps.apple.com/us/app/dronetones/id6447811468
- DroneTone Lite App Store: https://apps.apple.com/us/app/dronetone-lite/id1665412716
- Drone Tuner App Store: https://apps.apple.com/us/app/drone-tuner/id1326016622
- Droneo App Store: https://apps.apple.com/us/app/droneo/id313811077
- Pitch, Please!: https://forscore.co/pitch-please/
- The Pitch Pipe: https://pitchpipe.app/
- Pitch Pipe by Congregate: https://www.congregateonline.com/apps/pitch-pipe-by-congregate-app/
- Pocket Pitch: https://pocketpitch.io/
- BOSS Tuner: https://www.boss.info/us/products/boss_tuner_app/
- Pano Tuner Google Play: https://play.google.com/store/apps/details?id=com.soundlim.panotuner
- Cleartune App Store: https://apps.apple.com/us/app/cleartune/id286799607
- n-Track Tuner App Store: https://apps.apple.com/us/app/n-track-tuner/id409786458
- Tuner by Piascore: https://piascore.com/service/tuner/
- Fender Tune App Store: https://apps.apple.com/us/app/fender-tune-guitar-tuner-app/id1107017950
- Fender Tune Google Play: https://play.google.com/store/apps/details?id=com.fender.tuner
- Soundbrenner app: https://www.soundbrenner.com/pages/the-metronome-app
- Soundbrenner online tuner: https://tuner.soundbrenner.com/
- iTablaPro: https://upasani.org/home/itablapro.html
- Shruti Laya App Store: https://apps.apple.com/us/app/shruti-laya/id1497345955

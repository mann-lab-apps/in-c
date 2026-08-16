# in C - Click Store Plan

작성일: 2026-08-16

## 전제

`in C - Click`은 in C의 첫 무료 음악 유틸앱이다. 이번 유틸앱 전략의 중심은
무료 웹도구가 아니라 App Store / Play Store에 공개되는 모바일 앱 포트폴리오다.
웹페이지는 소개, 피드백, 관심 등록, 개인정보 고지를 위한 보조 지면으로 둔다.

앱 포트폴리오의 유통 전략과 외부 리서치 근거는
[`docs/research/app-portfolio-distribution-research-notes.md`](../research/app-portfolio-distribution-research-notes.md)에
정리한다.

기존 `site/metronome.html`과 `site/metronome.js`는 기능 범위와 카피를 확인하기
위한 웹 프로토타입으로 유지한다. 스토어 출시 기준 구현은 `apps/in_c_click/`의
Flutter 앱이다.

## 앱 이름

- 표시 이름: in C - Click
- 프로젝트 이름: `in_c_click`
- bundle/application id 후보: `com.mannlab.inc.click`

## 한 줄 설명

연습을 바로 시작할 수 있는 무료 메트로놈.

## 짧은 설명

BPM, 박자, 첫 박 강조, 빠르기말 확인, 탭 기반 BPM 맞추기를 조정하고 연습을 바로
시작하는 무료 메트로놈입니다.

## 긴 설명 초안

in C - Click은 음악가가 연습실에서 바로 켤 수 있는 무료 메트로놈입니다. 복잡한
설정, 로그인, 광고 없이 BPM과 박자를 정하고 연습을 시작하는 데 집중합니다.

지원 기능:

- BPM 표시와 조정
- 빠르기말 표시와 대표 BPM 선택
- 접힌 보조 컨트롤에서 탭해서 BPM 맞추기
- 2/4, 3/4, 4/4, 6/8
- 첫 박 강조
- 시각 pulse와 현재 beat 표시
- 최근 설정 저장

in C는 음악가를 위한 서비스를 만들고 있습니다. 이 도구는 그 첫 번째 실험입니다.

## 주요 기능

- BPM 직접 조정: 30-240
- BPM stepper와 slider
- 빠르기말 표시: Largo, Adagio, Andante, Moderato, Allegro, Presto,
  Prestissimo
- 빠르기말 선택 시 대표 BPM으로 이동
- 시작/정지
- 접힌 보조 컨트롤에서 탭해서 BPM 맞추기
- 접힌 보조 컨트롤에서 2/4, 3/4, 4/4, 6/8 선택
- 첫 박 강조 켜기/끄기
- 시각 pulse
- 현재 beat 표시
- 로컬 설정 저장
- 상단 in C Click 기능 제안 페이지 연결

## MVP 제외 범위

- 튜너
- 마이크 입력
- 피치 감지
- 복잡한 polyrhythm
- 세트리스트
- 계정 기반 연습 기록
- 로그인
- 서버 저장
- 악보/PDF 업로드
- 광고
- 결제
- AI 기능
- 백그라운드 재생 고도화
- MIDI sync
- Ableton Link

## 개인정보 수집 여부

MVP 앱 자체는 개인정보를 수집하지 않는다.

- 계정 없음
- 이름/이메일/전화번호 입력 없음
- 서버 저장 없음
- 앱 내 연습 내용 전송 없음

앱 상단의 `기능 제안` 배너를 통해 웹 페이지로 이동한 뒤 사용자가 직접 제안 폼을
제출하는 경우, 해당 웹 폼의 개인정보 고지와 저장 정책을 따른다.

## 권한 사용 여부

MVP 앱은 권한을 요구하지 않는다.

- 마이크 권한 없음
- 파일 권한 없음
- 위치 권한 없음
- 연락처 권한 없음
- 알림 권한 없음

외부 링크 열기는 `url_launcher`를 사용한다. 스토어 심사 설명에는 피드백/도구 제안
페이지를 여는 목적이라고 기재한다.

## 패키지 선택 메모

- `audioplayers`: 메트로놈 클릭음을 코드에서 생성한 WAV bytes로 재생하기 위해 사용한다. pub.dev 기준 Android/iOS를 포함한 다중 플랫폼을 지원하고, `BytesSource` API가 있다.
- `shared_preferences`: BPM, 박자, 첫 박 강조 설정을 기기 로컬에 저장한다. iOS의 `NSUserDefaults`, Android의 `SharedPreferences`를 감싼 Flutter 공식 플러그인이다.
- `url_launcher`: in C Click 기능 제안 페이지를 외부 브라우저로 열기 위해 사용한다. Flutter 공식 플러그인이다.

패키지 라이선스는 pub.dev 기준 `audioplayers`는 MIT, `shared_preferences`와
`url_launcher`는 BSD-3-Clause 계열로 확인했다. 실제 스토어 제출 전 `flutter pub deps`
결과와 `pubspec.lock` 기준으로 한 번 더 확인한다.

## iOS 테스트 체크리스트

- 앱 실행 후 소리 재생이 첫 터치 이후 정상 동작하는가
- 무음모드에서 클릭음 정책이 기대와 맞는가
- 화면 잠금/앱 전환 시 MVP 범위대로 동작하는가
- 작은 iPhone 화면에서 BPM과 버튼 텍스트가 잘리지 않는가
- VoiceOver에서 주요 버튼 label이 이해 가능한가
- 설정 저장 후 재실행 시 BPM/박자/첫 박 강조가 유지되는가
- 외부 링크가 Safari 또는 기본 브라우저로 정상 열리는가

## Android 테스트 체크리스트

- 앱 실행 후 클릭음이 정상 재생되는가
- 제조사별 배터리 최적화 상태에서 foreground 사용이 끊기지 않는가
- 뒤로가기 동작이 자연스러운가
- 작은 Android 화면에서 버튼이 잘리지 않는가
- TalkBack에서 주요 버튼 label이 이해 가능한가
- 설정 저장 후 재실행 시 BPM/박자/첫 박 강조가 유지되는가
- 외부 링크가 기본 브라우저로 정상 열리는가

## 스크린샷 후보 화면

1. 기본 화면: `in C - Click`, 큰 BPM, 시작 버튼
2. 재생 중 화면: pulse가 켜진 상태와 현재 beat
3. 박자 선택 화면: 2/4, 3/4, 4/4, 6/8과 첫 박 강조 toggle
4. 탭해서 BPM 맞추기 화면: 빠르기 조정 영역
5. 빠르기말 선택 화면: 클래식 빠르기말과 대표 BPM
6. 상단 in C 배너: Click 기능 제안 동선

## 앱 아이콘 방향

- 검은 4분음표와 가온음 C를 암시하는 오선
- 스케치 테마를 과하게 쓰지 않고, 스토어 아이콘에서는 단순한 식별성 우선
- 배경은 흰색에 가까운 paper 계열, 아이콘은 검은 ink 중심
- 작은 크기에서 `in C` 텍스트보다 음표/클릭 앱임을 우선 인식하게 한다

## 다음 버전 후보

- 진동 pulse
- 연습 루틴 타이머
- mute beat 연습
- tempo ramp
- 리허설 타이머
- 앱 내 피드백 폼
- 백그라운드 재생 검토
- 네이티브 오디오 엔진 검토

## in C 포트폴리오 연결 방식

앱 내부에서는 in C를 작게만 드러낸다. 사용자가 메트로놈을 쓰는 흐름을 방해하지
않고, 상단 배너는 “Click에 필요한 기능이 있나요?”처럼 이 앱의 기능 피드백을 받는
동선으로 둔다.

스토어 설명과 스크린샷에서는 `무료`, `광고 없음`, `로그인 없음`, `바로 연습`을
강조한다. 공연 홍보 서비스나 Chromatics 사보 앱처럼 보이지 않게 한다.

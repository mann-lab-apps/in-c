# in C - Chime Store Plan

작성일: 2026-08-19

## 전제

`in C - Chime`은 `in C - Click` 다음으로 출시할 두 번째 무료 음악 유틸앱이다.
기존 조사 문서
[`in-c-chime-reference-tone-survey.md`](../research/in-c-chime-reference-tone-survey.md)를
기반으로 한다.

이 앱은 상용 튜너 앱과 경쟁하는 마이크 튜너가 아니라, 앱을 열고 바로 기준음을
들을 수 있는 가벼운 기준음/드론 앱이다. 첫 버전은 로그인, 광고, 결제, 서버 저장,
마이크 권한 없이 동작한다.

## 앱 이름

- 표시 이름: in C - Chime
- 프로젝트 이름: `in_c_chime`
- bundle/application id 후보: `com.mannlab.inc.chime`

## 한 줄 설명

A simple reference tone and drone app for tuning by ear and intonation practice.

## 한국어 설명

조율과 음정 연습을 바로 시작할 수 있는 무료 기준음/드론 앱입니다.

## 타깃 사용자

- 성악가
- 현악기/관악기 연주자
- 합창/앙상블 연습자
- 튜너 화면보다 귀로 음정을 맞추고 싶은 음악 학습자

## 문제 정의

연습자는 곡 시작 전 기준음을 빠르게 확인하거나, 드론을 틀어놓고 음정 감각을
연습하고 싶다. 기존 앱들은 튜너, 녹음, 분석, 결제, 계정, 광고 등 기능이 무겁거나
마이크 권한이 필요하다. `in C - Chime`은 앱을 열고 바로 기준음을 들을 수 있는
가벼운 도구를 제공한다.

## 주요 기능

- 음 선택: C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B
- 옥타브 선택: 2, 3, 4, 5
- 기준 주파수 선택: A=440, A=441, A=442
- Chime 모드: 선택한 음을 짧게 재생
- Drone 모드: 선택한 음을 지속 재생/정지
- 음색 선택:
  - Pure: sine 기반
  - Warm: 낮은 배음이 섞인 부드러운 합성 드론
  - Bright: chime attack이 더 선명한 합성 tone
- 볼륨 조절
- 최근 설정 로컬 저장
- 상단 in C Chime 기능 제안 페이지 연결

## MVP 제외 범위

- 마이크 권한
- pitch detection / chromatic tuner
- 녹음
- 사용자 계정
- 결제/IAP
- 광고
- 서버 저장
- 저작권 있는 악기 샘플
- background audio 고도화
- complex temperament/custom tuning 설정
- AI 기능

## 개인정보 수집 여부

MVP 앱 자체는 개인정보를 수집하지 않는다.

- 계정 없음
- 이름/이메일/전화번호 입력 없음
- 서버 저장 없음
- 앱 내 연습 내용 전송 없음
- 마이크 권한 없음

앱 상단의 `기능 제안` 배너를 통해 웹 페이지로 이동한 뒤 사용자가 직접 제안 폼을
제출하는 경우, 해당 웹 폼의 개인정보 고지와 저장 정책을 따른다. App Store와
Play Store의 Privacy Policy URL은 `https://in-c.mannlab.app/privacy.html`을
사용한다.

## 권한 사용 여부

MVP 앱은 민감 권한을 요구하지 않는다.

- 마이크 권한 없음
- 파일 권한 없음
- 위치 권한 없음
- 연락처 권한 없음
- 알림 권한 없음

외부 링크 열기는 `url_launcher`를 사용한다. 스토어 심사 설명에는 피드백/도구 제안
페이지를 여는 목적이라고 기재한다.

## 외부 서비스와 패키지

- `audioplayers`: 코드에서 생성한 WAV bytes를 재생한다.
- `shared_preferences`: 음, 옥타브, A 기준, 음색, 볼륨을 기기 로컬에 저장한다.
- `url_launcher`: in C Chime 기능 제안 페이지를 외부 브라우저로 연다.

핵심 기준음/드론 기능은 기기 로컬에서 동작한다. 인증, 결제, AI, 콘텐츠 서버,
사용자 생성 콘텐츠 플랫폼은 사용하지 않는다.

## 앱 심사용 설명 초안

```text
Hello App Review Team,

in C - Chime is a free reference tone and drone app for musicians, singers,
choirs, and ensemble players who want to tune by ear or practice intonation.

The app's core features run locally on the device:
- Select a pitch and octave
- Select A=440, A=441, or A=442 tuning
- Play a short Chime tone
- Start/stop a sustained Drone tone
- Choose Pure, Warm, or Bright synthesized tone color
- Adjust volume
- Save recent settings locally

No login credentials are required. No sample files are required.

The app does not include account registration, login, account deletion, paid
content, subscriptions, user-generated content, reporting/blocking flows,
microphone tuning, recording, AI features, or prompts for sensitive device
permissions.

The app does not collect personal data. It uses local preferences only. The
optional feature suggestion link opens an external webpage in the browser and is
covered by our privacy policy:
https://in-c.mannlab.app/privacy.html

The app functions consistently across all regions. It does not operate in a
regulated industry and does not provide protected third-party material.
```

## iOS 테스트 체크리스트

- 앱 실행 후 Chime 재생이 첫 터치 이후 정상 동작하는가
- Drone 시작/정지가 안정적인가
- 음, 옥타브, A 기준, 음색 변경 시 Drone이 현재 설정으로 갱신되는가
- 볼륨 변경이 즉시 반영되는가
- 설정 저장 후 재실행 시 최근 상태가 유지되는가
- 작은 iPhone 화면에서 버튼 텍스트가 잘리지 않는가
- VoiceOver에서 주요 버튼 label이 이해 가능한가
- 외부 링크가 Safari 또는 기본 브라우저로 정상 열리는가

## Android 테스트 체크리스트

- 앱 실행 후 Chime/Drone 소리가 정상 재생되는가
- 음, 옥타브, A 기준, 음색 변경 시 Drone이 현재 설정으로 갱신되는가
- 볼륨 변경이 즉시 반영되는가
- 뒤로가기 동작이 자연스러운가
- 작은 Android 화면에서 버튼 텍스트가 잘리지 않는가
- TalkBack에서 주요 버튼 label이 이해 가능한가
- 설정 저장 후 재실행 시 최근 상태가 유지되는가
- 외부 링크가 기본 브라우저로 정상 열리는가

## 다음 버전 후보

- A4 custom slider: 415-466 Hz 또는 420-460 Hz
- tonic+fifth drone
- choir pitch pipe 화면
- Apple Watch companion
- lock screen playback control
- just intonation interval trainer
- 즐겨찾기 pitch
- cello-like 또는 organ-like 합성음 추가

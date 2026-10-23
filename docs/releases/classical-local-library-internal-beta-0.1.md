# 띠로리 플레이 내부 베타 0.1

작성일: 2026-10-23

## 후보 범위

- 빈 사용자 카탈로그에서 로컬 파일 가져오기·스캔
- 작곡가, 작품, 녹음과 순서가 있는 악장 등록 및 재정리
- 작품·녹음 단위 큐와 포그라운드 로컬 재생
- 재생 위치, 감상 이력, 검색과 기기 내부 discovery
- IMSLP의 사용자 확인 기반 제한적 가져오기
- MusicBrainz 수동 후보 승인
- 경로와 음원을 제외한 논리 라이브러리 백업·복원
- 누락되거나 이동한 음원의 사용자 확인 재연결
- 전체 로컬 데이터 초기화와 앱 관리 음원 통제

## 버전 정책

- 공개 버전은 semantic version을 사용한다. 첫 내부 후보는 `0.1.0`이다.
- Android `versionCode`와 iOS `CFBundleVersion`에 매핑되는 build number는 배포 artifact마다
  증가시킨다. 현재 시작점은 `1`이다.
- 앱 정보 표시는 `APP_VERSION_LABEL` dart-define으로 artifact 버전과 맞춘다.

## 배포 준비

- Android release build는 저장소 밖 upload keystore 또는 CI secret을 요구한다. debug
  signing fallback은 없다.
- iOS release build는 `--no-codesign`으로 컴파일 검증할 수 있지만 TestFlight 배포에는
  Apple Developer Team, 배포 인증서와 provisioning profile이 필요하다.
- `PRIVACY_POLICY_URL`, `SUPPORT_URL`, `MUSICBRAINZ_CONTACT`는 빌드 시 주입한다. 값이 없는
  후보는 외부 공개 배포에 사용하지 않는다.
- `assets/branding/app_icon_provisional.png`과 현재 표시명은 내부 베타용이다.
- 공개 개인정보·지원 URL은 반드시 `https`여야 한다. 잘못된 URL은 앱에서 열지 않으며
  공개 배포 artifact에 placeholder URL을 주입하지 않는다.
- iOS release compile은 Xcode 26.5와 iOS 26 SDK에서 확인했다. 배포 artifact는
  `--obfuscate --split-debug-info=<보안 백업 경로>`로 빌드하고 symbol을 보관한다.
- 개발자 로컬 경로가 binary symbol URI에 남지 않도록 실제 archive는 중립적인 CI checkout
  경로에서 만든다. 로컬 unsigned build는 App Store validation의 대체 증거가 아니다.

## 자동 품질 게이트

```sh
dart format lib test integration_test tool
flutter test
flutter analyze
dart run tool/generate_audio_fixtures.dart --check
flutter build appbundle --release
flutter build ios --release --no-codesign
flutter build ios --simulator --no-codesign
cd ../../deployment
bundle exec fastlane release_candidate_preflight \
  manifest:apps/classical-local-library/ios-metadata.yaml \
  review_details:/external/review-contacts.json
```

추가로 placeholder, cleartext 허용, debug release signing, whitespace 오류를 검색한다.
iOS Simulator에서는 production startup과 synthetic WAV/AAC/ALAC 재생 통합 테스트를
실행한다. live IMSLP/MusicBrainz 상태는 기본 회귀 게이트와 분리한다.

2026-10-23 기준 순수 Flutter 테스트 303개, iPhone 17 Pro와 iPad Pro 13-inch iOS 26.5
Simulator startup 및 screenshot scene smoke, iPhone의 synthetic 오디오 재생 및 managed
import 통합 테스트가 통과했다. SQLite schema는 v14다.

## 사용자 피드백 범위

- iOS Files/iCloud/서드파티 document provider에서 가져오기
- Android 파일·폴더 선택기에서 가져오기
- 물리 iPhone/Android의 스피커, 유선·Bluetooth 출력과 실제 청감
- MP3, FLAC, ALAC, OGG, Opus 사용자 파일 호환성
- 전화·Siri·다른 앱 interruption과 출력 장치 분리
- 저장 공간 부족과 대용량 파일 가져오기
- 가져오기·재생 중 강제 종료와 재시작 복구
- 대형 실제 라이브러리의 스캔 시간, 저장 공간과 탐색 체감
- 실제 배포 서명으로 만든 TestFlight/Play 내부 트랙 설치

피드백에는 실제 경로, 파일명, 메타데이터 또는 기기 식별자를 요구하지 않는다. 앱의
구조화된 익명 진단 report와 재현 단계만 받는다.

출시 후보 피드백은 `ReleaseCandidateFeedbackReport` JSON으로 교환하고 표준 입력에서
`dart run tool/validate_release_candidate_feedback.dart`로 확인한다. validator는 유효한
report면 0, P0/P1이면 2, schema 또는 개인정보 최소화 계약 위반이면 1을 반환한다.

논리 백업 v1은 카탈로그와 사용자 교정, 파일 연결, 감상 상태를 복원하지만 실제 음원과
원래 파일·폴더 경로는 포함하지 않는다. 복원한 파일은 누락 상태이며 사용자가 실제 음원을
다시 연결해야 한다. 일시적인 현재 재생 큐와 IMSLP 다운로드 cache도 백업 대상이 아니다.

## 공개 출시 차단 항목

- 실제 upload/distribution signing 자격 증명과 스토어 계정
- 개인정보·지원 공개 URL과 운영 연락처
- 임시 아이콘·이름의 상표 및 시각 검토
- 물리 기기 사용자 피드백으로 확인할 P0/P1 결함 처리
- Apple/Google store listing, screenshot, 연령 등급과 개인정보 설문
- signed archive의 privacy report 및 App Store upload validation
- 규격상 불투명한 iOS App Store 1024 아이콘의 최종 디자인 승인

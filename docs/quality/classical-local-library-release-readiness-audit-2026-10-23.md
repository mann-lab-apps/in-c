# 띠로리 플레이 출시 준비 감사

후속 상태: 사용자 요청으로 배포와 최종 아이콘 확정은 보류했다. 아래는 이전 감사 기록이며,
이후 초기화·진단·자체 QA 고도화와 320개 테스트 결과는
[로컬 QA 증거](classical-local-library-local-qa-2026-10-23.md)를 기준으로 확인한다.
추가 QA 통과가 기존 스토어·서명·물리 기기 게이트를 해제하지 않는다.

작성일: 2026-10-23

대상: `0.1.0+1`, SQLite schema v14

## 결론

핵심 로컬 라이브러리와 전경 재생 범위는 MVP를 넘어 내부 베타 후보 수준이다. 자동으로
해결할 수 있는 첫 실행 복구, 개인정보 비노출, 반응형·접근성 회귀와 unsigned iOS build는
통과했다. 다만 아래 운영·디자인·배포 항목이 남아 있어 현재 상태를 App Store 제출 가능으로
표시하지 않는다.

## 판정표

| 분류 | 상태 | 근거 또는 다음 행동 |
| --- | --- | --- |
| 코드로 해결 | 완료 | 저장소 초기화·스캔 실패 재시도, busy 복구, 경로·native 예외 비노출, 공개 HTTPS 링크 검증 |
| 자동 검증 | 완료 | Flutter 303 tests, analyze, fixture check, iPhone/iPad startup·screenshot scene smoke, iPhone import와 synthetic audio 회귀 |
| 사람·물리 기기 | 대기 | VoiceOver, 최대 Dynamic Type, Files/iCloud 제공자, 스피커·유선·Bluetooth, 실제 MP3/FLAC/M4A 청감 |
| 디자인 결정 | 차단 | 현재 App Store 1024 아이콘은 1024px·불투명 규격을 통과했지만 최종 디자인 승인이 필요 |
| 운영 결정 | 차단 | 공개 privacy/support HTTPS URL, 운영 연락처, 콘텐츠 권리, 연령 등급, 수출 규정, 가격·지역·trader 상태 |
| 배포 계정 | 차단 | Apple Developer Team, 인증서/profile, App Store Connect app/build 선택과 signed archive validation |
| 출시 후 | 보류 | Chromaprint/AcoustID 확대, 백그라운드 오디오, 클라우드 동기화, 대규모 제품 확장 |

## 자동 검증 증적

- 환경: macOS 26.6.2, Xcode 26.5, Flutter 3.47.2 stable, Dart 3.13.2.
- `dart format lib test integration_test tool`, `flutter test` 303개, `flutter analyze`,
  fixture `--check`를 통과했다.
- 논리 백업의 경로·음원 제외, 검증·preview·idempotent import·transaction rollback과 누락
  파일 재연결의 보존·중복 거부·rollback을 fixture SQLite에서 통과했다.
- 100명·1,000작품·1,000녹음·5,000트랙 fixture의 검색·상세·discovery·큐 회귀와
  ID 기반 큐 snapshot의 SQLite 재개방·앱 시작 복원을 통과했다.
- `flutter build ios --simulator --no-codesign`과 `flutter build ios --release --no-codesign`을
  통과했다. obfuscation과 split debug info를 적용한 release도 빌드했다.
- iPhone 17 Pro iOS 26.5 Simulator에서 startup smoke, WAV/AAC/ALAC 큐 재생·seek·완료·복구,
  managed import·재기동·원본 보존을 확인했다.
- iPad Pro 13-inch (M5) iOS 26.5 Simulator에서 startup smoke를 확인했다.
- 네 screenshot scene을 장면마다 앱 root에서 다시 시작하는 계약으로 고정하고 iPhone/iPad
  Simulator에서 library·queue·work detail·recording detail selector와 동선을 통과했다.
- release bundle에는 앱과 Flutter, file picker, share, SQLite, URL launcher privacy manifest가
  있고 앱에는 tracking/수집 선언, background audio, 사용 목적 권한 문구와 임의 네트워크
  허용이 없다.
- 배포 metadata schema와 screenshot scene 계약은 검사에 통과했다. 실제 촬영 계획 생성은
  `source.state: pending`이라 차단되었으며, 커밋된 제품 checkpoint를 확정하기 전에는 이를
  우회하거나 촬영 성공으로 기록하지 않는다.
- release preflight는 현재 release `.app` 검사에서 PASS 17, BLOCKED 13, FAIL 0을
  반환했다. 차단은 공개 URL·아이콘 승인·제품 checkpoint·스토어 입력·서명·물리 기기
  피드백·검수된 screenshot이며 구현 실패와 구분된다.

## 남은 기술 위험

- `path_provider_foundation`은 Dart FFI 방식이라 별도의 native resource bundle manifest가
  없다. 앱 manifest가 직접 사용하는 FileTimestamp 이유를 선언하지만 signed archive의
  privacy report와 App Store upload validation으로 최종 확인해야 한다.
- 로컬 obfuscated binary에도 Flutter 생성 `dart_plugin_registrant.dart`의 compile URI 하나가
  남는다. 사용자 데이터는 아니지만 실제 archive는 중립적인 CI checkout 경로에서 만든다.
- unsigned build는 signing, entitlement, receipt와 App Store 서버 검증을 증명하지 않는다.
- 시뮬레이터 재생 성공은 실제 스피커 음질, Bluetooth route, interruption과 포맷별 기기
  호환성을 증명하지 않는다.

## 출시 순서

1. 기술 규격을 통과한 현재 App Store 아이콘의 최종 사용 여부를 승인한다.
2. 공개 privacy/support 페이지와 운영 연락처를 확정해 앱 define과 metadata에 같은 URL을 넣는다.
3. App Store Connect 수동 선언과 TestFlight 연락처를 운영자가 검토한다.
4. 중립 CI 경로에서 signed archive를 만들고 privacy report와 upload validation을 확인한다.
5. 물리 기기 체크리스트로 P0/P1 사용자 피드백을 받고 결함을 처리한다.
6. 동일 build로 screenshot capture와 metadata check를 통과한 뒤 제출 여부를 결정한다.

## 정책 확인

2026-10-23에 Apple 공식 문서를 확인했다.

- [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)
- [File timestamp required-reason API](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitypereasons)
- [Adding a privacy manifest](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Upcoming submission requirements](https://developer.apple.com/news/upcoming-requirements/?id=02212025a)

Flutter FFI package의 privacy manifest 전달 경계는
[Flutter issue 143232](https://github.com/flutter/flutter/issues/143232)도 참고했다. 이 이슈는
정책 근거가 아니라 남은 도구 체인 위험을 설명하는 보조 자료다.

# 띠로리 플레이 0.1.0(1) 내부 TestFlight 배포 기록

- 날짜: 2026-10-30 (KST)
- 앱: `띠로리 플레이` / `com.mannlab.ddirori.play` / App Store Connect `6828809673`
- 제품 소스: `5504a957fb5d023e2fb3c330c51fc4757ce23e3b`
- 배포 브랜치: `feature/ddirori-play-testflight-20261030`
- 빌드: iOS Release `0.1.0 (1)`, `ENABLE_DEMO_LIBRARY=false`
- 확인: Flutter 테스트 400개 통과, `flutter analyze --no-pub` 통과, `codesign --verify --strict --deep` 통과
- 서명: Apple Distribution, 팀 `ZRA4DHHKQ4`, 배포 프로파일의 App ID `ZRA4DHHKQ4.com.mannlab.ddirori.play`
- IPA SHA-256: `562f2b030a3a84e9d54bfb6ca5b2150130199b9f8fa1301bff0d470ef7bf8a7c`
- 내보내기: `testFlightInternalTestingOnly=true`. 공개 TestFlight 및 App Store 제출에 사용할 수 없는 내부 테스트 전용 바이너리다.
- Fastlane `upload_to_testflight`: App Store Connect 전송 성공. Apple 처리 결과는 아래 상태를 따른다.
- 내부 그룹 `내부 테스트` 생성, 자동 배포 꺼짐, 테스터 초대/알림 미실행.

## Apple 처리 상태

- 업로드 ID: `a75f2996-e8e6-4516-a990-1a6b05b3216e`
- Apple 업로드 완료 시각: `2026-10-30T04:33:30-07:00`
- 마지막 확인: 업로드 `COMPLETE` (오류·경고 0), 빌드 `VALID`, audience `INTERNAL_ONLY`.
- 빌드 ID: `a75f2996-e8e6-4516-a990-1a6b05b3216e`.
- 내부 TestFlight 상태: `MISSING_EXPORT_COMPLIANCE`. Apple이 내부 그룹 연결을 `Build is not in an internally testable state`로 거부했다.
- 그룹 ID: `61f6e80b-f830-4c8d-9086-cca142e61f91`. 그룹은 생성됐지만 빌드 연결과 테스터 초대는 완료되지 않았다.
- 코드에서 확인한 관련 사용: `http` 통신과 파일 중복 확인용 SHA-256 해시. 실제 암호화 신고는 운영자 확인 후 진행한다.

## 남은 검수

- 사용자 iPhone Xs에서 Files 제공자, 실제 음원 재생·청감, 중단·복구, VoiceOver를 직접 확인한다.
- App Store 공개 출시에는 별도의 개인정보/지원 URL, 스크린샷, 스토어 내용 검수 및 심사가 필요하다.
- 이 문서는 업로드·코드 서명·자동 테스트 증거다. 실기기 동작이나 App Store 승인 근거로 사용하지 않는다.

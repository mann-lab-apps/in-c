# 클래식 로컬 라이브러리 내부 베타 품질 증적

검증일: 2026-10-21

## 대상

- 앱 버전: `0.1.0+1`
- SQLite schema: v13
- iOS Simulator: iPhone 17, iOS 26.5
- bundle ID: `app.inc.classicalLocalLibrary`
- production 기본값: 빈 사용자 카탈로그, demo 기능 비활성

## 자동 회귀

- `dart format lib test integration_test tool`: 통과
- `flutter test`: 247개 통과
- `flutter analyze`: issue 없음
- SQLite upgrade fixture: v1, v2, v3, v4, v6, v8, v10에서 v13으로 데이터 보존
- 사용자 카탈로그: 새 작품·녹음, 기존 작품·녹음의 빠진 악장, 재정리, 해제,
  transaction rollback과 재시작 복원 검증
- 전체 초기화: 앱 관리 파일 삭제, 외부 원본 보존, 중간 실패 후 시작 복구 검증

## iOS Simulator

다음 테스트를 iPhone 17 iOS 26.5 Simulator에서 실행했다.

```sh
flutter test integration_test/ios_app_smoke_integration_test.dart \
  -d 179447AC-F99C-4746-B9C1-CDA653EA9B2D
flutter test integration_test/audio_playback_integration_test.dart \
  -d 179447AC-F99C-4746-B9C1-CDA653EA9B2D
flutter test integration_test/local_audio_import_integration_test.dart \
  -d 179447AC-F99C-4746-B9C1-CDA653EA9B2D
```

확인 항목:

- 빈 카탈로그 production startup, demo UI 비노출
- SQLite v13 생성과 `PRAGMA integrity_check = ok`
- 합성 WAV/AAC/ALAC queue의 load, play, pause, resume, seek, next, 완료
- 감상 이력·재생 위치 저장과 복원
- 선택 음원의 앱 sandbox 복사, checksum, indexing, 재생과 재기동 복원
- 빈 카탈로그에서 IMSLP 진입 시 충돌하지 않는 선행 조건 안내

최초 smoke 실행은 IMSLP 화면이 빈 `works` 목록에서 첫 항목을 가정하는 결함을 발견했다.
nullable 선택과 한국어 빈 상태를 추가하고 widget 회귀 테스트를 만든 뒤 smoke를 재실행해
통과했다.

## 릴리스 빌드

- Android 서명 정보가 없을 때 release AAB가 명확한 오류로 거부됨을 확인했다.
- 저장소 밖 `/tmp` 단기 upload keystore로 release AAB 생성과 signature 검증을 수행하고
  key를 삭제했다. 이 키는 실제 배포용이 아니다.
- 최종 AAB 크기: 57,178,998 bytes
- 최종 AAB SHA-256:
  `9577cdd731ac1c3ed6432aa45daadc98d70220b007bd38e4f0b80e0d31377c60`
- `flutter build ios --release --no-codesign`: 성공, Runner.app 21.2MB
- `flutter build ios --simulator --no-codesign`: 성공
- device/simulator app 모두 표시명 `클래식 로컬 라이브러리`, 버전 `0.1.0 (1)`과
  유효한 `PrivacyInfo.xcprivacy` 포함을 확인했다.
- 1024px iOS icon은 alpha channel이 없다.

최종 production simulator 화면:
[빈 사용자 카탈로그 홈](classical-local-library-internal-beta-home-2026-10-21.png)

## 데이터와 백업 경계

- Android `fullBackupContent`와 API 31+ `dataExtractionRules`에서 `managed_audio`,
  `imslp_imports`를 cloud backup과 device transfer에서 제외한다.
- iOS는 완료 파일과 기존 관리 폴더에 `isExcludedFromBackup`을 설정한다. simulator import
  통합 테스트에서 native method channel 오류 없이 완료했다.
- SQLite metadata는 OS backup 대상이 될 수 있으며 앱 설정과 개인정보 초안에 이를
  고지한다.

## 남은 외부 검증

- 물리 기기 스피커·헤드폰·Bluetooth와 사람의 청감
- 사용자 MP3/FLAC/ALAC/OGG/Opus 파일의 실제 기기 호환성
- 전화·Siri·다른 앱 interruption과 문서 provider UX
- 실제 Android upload key, Apple 배포 인증서와 store 계정
- 개인정보·지원 공개 URL, 운영 연락처와 store 개인정보 설문
- 내부 베타 임시 아이콘·이름의 상표 및 시각 검토

이 항목들은 자동 테스트로 완료했다고 표현하지 않으며 사용자 피드백 또는 외부 계정
준비가 필요한 출시 차단 조건으로 유지한다.

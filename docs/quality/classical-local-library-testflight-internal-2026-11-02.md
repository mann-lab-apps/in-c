# 띠로리 플레이 0.1.0(4) 내부 TestFlight

2026-11-02 사용자의 “다시 아카이브/디스트리뷰트” 요청에 따라 기존 내부 테스트 경로로 배포한다. 공개 App Store1.0·외부 테스터·심사·출시는 변경하지 않는다.

## 소스와 검증

- 격리 작업 트리: `/private/tmp/ddirori-play-library-context-20261031`, branch `feature/ddirori-play-library-context-20261031`, HEAD `cb29d398321d3b1ac84e4ce90d619e3da7af574b` 위 미커밋 변경이다. 새 제품 commit으로 표현하지 않고 소스 입력별 hash를 archive 검증 JSON에 기록한다. 원본 작업 트리는 수정하지 않았다.
- 직전 검색 QA의209개 소스 hash가 아카이브 준비 전 모두 일치했다. 제품 코드는 유지하고 `pubspec.yaml`과 metadata의 build number/앱 표시 label만4로 맞췄다. 원본 작업 공간의 Play 아이콘1024px과 생성 토큰도 동일하다.
- 이번 archive 전 앱 전체499개 테스트와 `flutter analyze --no-pub` 통과. 기존 [검색 QA](classical-local-library-search-2026-11-02.md)의 고유 iOS7개·39캡처·소스 동일14검사를 참조한다. 이 iOS 결과를 빌드4의 물리 설치 증거로 바꾸지 않는다.
- build3 이후 보관함 맥락 메뉴·재생목록 완료/보기·방문 복귀, 분류 설정·표지/복구·sliver 지연 목록과 전체 검색 worker 개선을 포함한다. 재생·background/system media·원본/ID 보존은 유지한다.

## Archive와 IPA

- 앱: `com.mannlab.ddirori.play`, App Store Connect `6828809673`, 버전 `0.1.0`, build `4`.
- Apple의 기존 builds와 buildUploads에1·2·3만 있음을 조회한 뒤4를 선택했다.
- `flutter build ipa --release --build-name=0.1.0 --build-number=4 --dart-define=ENABLE_DEMO_LIBRARY=false '--dart-define=APP_VERSION_LABEL=0.1.0 (4)' --export-options-plist=../../deployment/apps/classical-local-library/ExportOptions-TestFlightInternal.plist` 성공.
- Apple Distribution, team `ZRA4DHHKQ4`, 일치한 배포 프로파일 `띠로리 플레이`, profile expiry2027-08-28. archive 및 IPA 각각 codesign strict/deep·entitlements의 matching App ID·get-task-allow false 확인.
- arm64, 최소 iOS15.0, `UIBackgroundModes=[audio]`, `ITSAppUsesNonExemptEncryption=false`, 버전/빌드4 확인. export의 `testFlightInternalTestingOnly=true`, `manageAppVersionAndBuildNumber=false`다.
- IPA23289868bytes, SHA-256 `d1ce18bd0730339aab3e0afde805300887de73afcba37fb4bf8426bc0f367f5a`.
- archive/IPA와 build/test/analyze/upload 로그는 앱의 ignored `releases/ios-0.1.0+4-20261102/`에 보존한다. Xcode Organizer의2026-11-02 Archives에도 별도 사본을 등록했다.
- 업로드는 기존 외부 API key를 메모리에서 참조한 Fastlane Pilot으로 수행했다. 키 값·테스터 이메일을 저장소/보고에 기록하지 않는다. 공통 pinned-checkpoint 출시 도구의 게이트를 변경하지 않았으며 이 내부 바이너리는 미커밋 snapshot의 hash로 추적한다. metadata source는 pending/content reviewed false를 유지한다.

## Apple 처리

- Fastlane 업로드 성공: 2026-11-02 22:51:20 KST.
- Apple buildUpload ID `19789d8e-5e3a-4d60-8cb2-10931c5c6c13`를 조회했고 업로드 후 최초 상태는 PROCESSING, errors/warnings0이다.
- 최종 API 확인2026-11-02 22:54:04 KST: upload COMPLETE(errors/warnings0), build `VALID / INTERNAL_ONLY`, `usesNonExemptEncryption=false`다.
- build ID는 `19789d8e-5e3a-4d60-8cb2-10931c5c6c13`, 기존 내부 그룹 `61f6e80b-f830-4c8d-9086-cca142e61f91`에 연결한 뒤 `IN_BETA_TESTING`을 확인했다. 그룹은 internal이며 공개 링크가 없고 기존 테스터1명·빌드1/2/3/4가 남아 있다. 다른 테스터를 추가하거나 이전 빌드를 만료시키지 않았다.
- [자동 수집한 배포 증거](evidence/play-library-distribution-20261102.json)에 source 입력 hash·IPA hash·Apple 처리/그룹 상태를 남긴다. TestFlight 업데이트 가능 상태이며 실제 Xs 설치·청감 완료는 확인하지 않았다.

## 사용자 QA

[iPhone Xs 빌드4 점검표](classical-local-library-physical-device-checklist.md)를 따른다. 새 빌드 설치·사용자 라이브러리 유지·청감·VoiceOver·Files/iCloud·Bluetooth·전화·대형 실사용 성능은 사용자가 확인한다. 이전 tester INSTALLED 상태를 새 빌드4 설치 증거로 사용하지 않는다. 커밋·푸시는 이번 요청 범위에서 수행하지 않았다.

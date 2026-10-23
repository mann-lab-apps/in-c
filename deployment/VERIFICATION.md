# Clef 파일럿 검증 — 2026-10-20 KST

2026-10-21 후속 작업: 별도 테스트 앱의 App Store Connect metadata 저장·재조회가 통과했다.
[Deployment Test 검증 기록](apps/deployment-test/README.md)을 참고한다.
같은 날 확장한 출시 정보/미디어 파이프라인의 범위, 85개 테스트와 테스트 앱 원격 저장 검증은
[iOS 출시 정보 파이프라인](IOS-RELEASE.md)에 기록했다.
아래 표는 2026-10-20 Clef 빌드 검증 시점의 결과다.

같은 날 추가한 [앱 공통 스크린샷 파이프라인](SCREENSHOTS.md)은 앱별 설정으로 실제 UI를 실행한다.
Fastlane에서 최신 커밋 기준 Clef iPhone/iPad 6장 촬영·별도 재검증·시각 검수가 통과했다.
이 단계의 자동 테스트는 총 101개(Ruby 80 + Python 21)이며 스토어 이미지 교체/심사/출시는 수행하지 않았다.

후속 [통합 메타데이터](METADATA.md) 검증에서는 `ios-metadata.yaml`을 직접 입력으로 받아
같은 최신 소스의 iPhone/iPad 6장 촬영·시각 검수·출시 정보 snapshot 연결까지 통과했다.
촬영 결과는 `output/clef/screenshots-20261021T080109-08ab5179/result.json`, 검수 증거는
같은 폴더의 `visual-verification.json`이다. 현재 로컬 테스트는 117개(Ruby 94 + Python 23)다.
미디어 누락은 해소했으나 출시 문구 검토·새 release notes·선언/수동 확인 등은 미완료로 유지한다.
이 후속 작업에서 원격 스토어 쓰기·심사 제출·출시는 실행하지 않았다. 원격 CI도 실행하지 않았다.

문제: 여러 Flutter 앱의 수동 iOS/Android 배포 절차를 공통화하고, 다른 앱 식별자나
debug signing 산출물을 잘못 올리는 것을 막아야 한다.
범위: 새 `deployment/`와 새 모바일 전용 workflow 2개.
제외: 기존 앱 코드/설정 변경, 기존 미커밋 변경 수정, 원격 업로드, metadata 게시,
심사 제출, 정식 출시, push/merge 및 기존 CI 수정.

## 수용 조건과 근거

| 조건 | 근거 | 결과 |
| --- | --- | --- |
| 수동 절차/signing 조사 | 기존 IPA/AAB와 export plist, 앱 README/Gradle/Xcode 및 기존 배포 기록 확인 | PASS |
| 공통 구조와 앱 manifest | 엄격한 필드 검증, 소스 커밋/버전/식별자/기준 SHA256 고정 | PASS |
| Clef iOS archive/export | 실제 signed archive 및 app-store-connect IPA 생성, codesign 검증 | PASS |
| TestFlight lane | 승인 누락/오래된 승인/해시 불일치 차단, upload-only 옵션 테스트 | 로컬 PASS; 실제 업로드 제외 |
| Clef Android AAB | 실제 release AAB 생성, bundletool validate, jarsigner, upload certificate 검사 | PASS |
| Play internal lane | internal draft, 심사 금지와 자동 재시도 비활성화 옵션 테스트 | 로컬 PASS; 실제 업로드 제외 |
| Store metadata/release notes | locale별 초안, 실제 metadata staging, 승인에 metadata/notes hash 결합 | PASS; 게시 제외 |
| Mac runner | GitHub API에서 `in-c-local-mac` online, label `in-c-release` 확인 | PASS |
| 결과 manifest/ledger | 실제 실행 결과 JSON, release manifest 사본, 실패/성공 ledger 생성 | PASS |
| 사용자 승인 전 심사·출시 금지 | production/review lane 부재, 임의 track/status 인수 거부, 승인 scope 검사 테스트 | PASS |
| 다른 앱 설정만으로 합류 | 두 번째 fixture 앱의 source path/bundle ID를 설정만 바꿔 preflight/plan/metadata 통과 | PASS; 두 번째 앱 실빌드 제외 |
| 기존 앱/관련 없는 변경 보존 | 기존 tracked git status 항목이 작업 시작 시점과 동일, 새 파일만 추가 | PASS |
| 키 미커밋 | git에서 보이는 신규 파일 목록 확인; keystore/API key/인증서 미포함 | PASS |

## 실제 산출물

모두 `source_commit=80103707a186586a5140031196ea27d6f8328fa7`, `1.0.2+29`,
`lib/main.dart`, `IN_C_DISCOVERY_HOME=false`로 빌드했다.

| 항목 | 로컬 경로 (`deployment/` 기준) |
| --- | --- |
| signed xcarchive / dSYMs | `output/clef/20261020T092840-02377e5f/app.xcarchive` |
| native export IPA / 결과 | `output/clef/20261020T093147-eed3f983/app.ipa`, 같은 디렉터리 `result.json` |
| 최종 release AAB / 결과 | `output/clef/20261020T093536-b6153a0a/app.aab`, 같은 디렉터리 `result.json` |
| metadata staging | `output/clef/20261020T093538-1e14af41/metadata` |
| 최종 iOS 비교 결과 | `output/clef/20261020T093622-35f5b4de/result.json` |
| 최종 Android 비교 결과 | `output/clef/20261020T093622-171c3678/result.json` |
| 누적 ledger | `output/ledger.jsonl` |

IPA SHA256: `0982a1588e907d5dba3dddca89fc3a7cd01ed024529c29548b17a8019a0e17fb`

AAB SHA256: `ef2d40633f2b550ea85b354c13167edddb176e30000ea59aab87f7a769de504d`

수동 iOS 기준은 1.0.2+29, Android 기준은 1.0.1+27이다.
배포 속성 비교에서 차이가 없었다. iOS는 식별자/name/team/profile/entitlement/device family/minimum OS,
Android는 package/upload certificate/permission/minimum SDK를 비교했고 두 플랫폼의 debug 가능 여부도 확인했다.
기준과 후보 ZIP의 SHA256은 다르다. signed archive의 byte 동일성이나 전체 실행 기능 동일성을 주장하지 않는다.
초기 개발 과정의 실패한 export도 ledger에 보존했다. 최종 export는 gym의 method 변환을 사용하지 않는다.

## 실행한 검증

- `bundle exec ruby test/release_test.rb`: **28 tests, 92 assertions, PASS**.
- `python3 -m unittest discover -s test -p '*_test.py'`: **5 tests, PASS**.
- `bundle exec fastlane lanes`: 모든 공통 lane 로드 PASS.
- `plan manifest:apps/clef/release.json`: Fastlane 상대 경로 해석 PASS.
- 실제 `archive`, native `export`, `aab`, 두 플랫폼 `compare`, `metadata`: PASS.
- 수정한 AAB cache cleanup 후 재빌드: PASS; checkout tracked/untracked 변경 없음.
- 외부 Android signing stage → preflight → cleanup: PASS, key.properties가 checkout에 남지 않음.
- workflow YAML 파싱과 모든 run script의 `bash -n`: PASS.
- 신규 파일 whitespace 및 credential 확장자/PEM 확인: PASS.
- GitHub runner REST 조회: online PASS. user LaunchAgent로 동작 중.

실제 build tool: Ruby 4.0.6, Fastlane 2.241.1, Flutter 3.47.2 / Dart 3.13.2,
Xcode 26.5 (17F42). Android 검증 CLI는 Java 17.0.18, Flutter Gradle은 Android Studio의 Java 25.0.2를 사용했다.
서명 포함 재현 검증 때문에 별도 detached checkout을 사용했으며 현재 작업 branch와 앱 코드는 변경하지 않았다.

## 남은 외부 검증

- GitHub Actions: **NOT RUN**. 새 workflow는 아직 push/기본 브랜치 반영 전이다. runner 등록/online과 구분한다.
- TestFlight/Play binary 업로드: **NOT RUN**. 2026-10-21 테스트 앱의 TestFlight 기본 metadata 저장과 구분한다.
- 공개 Clef용 새 출시 notes/캡처·privacy 설정: 별도 준비가 필요하다. 테스트 앱에 복사한 기존 스토어 자산은 새 빌드 QA를 대신하지 않는다.
- Store build number 가용성, 처리 완료, 실제 내부 테스터 설치: **NOT RUN**.
- App Review/production 출시: 현재 구현의 지원 범위 밖이며 실행하지 않았다.
- 앱 자체 전체 Flutter 회귀/실기기 QA는 이번 배포 플랫폼 변경으로 재실행하지 않았다.
- GitHub issue/PR은 지정되지 않았고 생성·수정하지 않았다. 로컬 검증 단계이며 원격 CI 또는 스토어 제출 완료 상태가 아니다.

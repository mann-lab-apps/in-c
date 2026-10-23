# in C 로컬 모바일 배포

앱 작업 중 갱신할 원본은 `apps/<app>/ios-metadata.yaml`이다.
출시 문구·심사/테스트 동선·촬영할 화면을 함께 관리하며, 실행용 JSON/text는 자동 생성한다.
[메타데이터 작성·작업 채팅 인계](METADATA.md)와 [다른 앱용 템플릿](apps/_template/ios-metadata.yaml)을 참고한다.

iOS 출시 정보 전체의 준비/검증/업로드와 촬영 계획은
[iOS 출시 정보 파이프라인](IOS-RELEASE.md)을 따른다. `ios_release`는 기존 build/upload lane과
별도로 metadata·선언·심사 정보·TestFlight 정보·미디어를 다루며 심사/출시를 실행하지 않는다.

최신 소스의 실제 화면 촬영은 [앱 공통 스크린샷 파이프라인](SCREENSHOTS.md)을 따른다.
`store_screenshots` lane은 앱별 YAML에서 생성한 설정으로 빌드·UI 이동·촬영·출처/규격/시각 검수를 수행한다.

Clef & Staff 파일럿용 공통 Fastlane 플랫폼이다. 기존 앱 파일을 수정하지 않고,
앱별 `apps/<app>/release.json`으로 고정한 소스를 별도 checkout에서 빌드한다.
심사 제출, production track, 정식 출시 및 외부 TestFlight 배포 lane은 없다.

## 조사 결과와 범위

2026-10-20 조사에서 현재 작업 트리는 다른 in C 작업의 미커밋 변경을 포함하고 있었다.
현재 iOS `com.mannlab.inc.clef`, Android `com.mannlab.inc`를 Clef 수동 배포의
식별자로 사용하면 다른 앱을 만들 수 있으므로 현재 트리의 빌드를 차단한다.

| 항목 | Clef 수동 배포 기준 | 근거 |
| --- | --- | --- |
| 소스 | `80103707a186586a5140031196ea27d6f8328fa7` | 로컬 `dev`의 1.0.2+29 준비 커밋 |
| Flutter | `lib/main.dart`, `IN_C_DISCOVERY_HOME=false` | 기존 iOS review preparation / Android release 기록 |
| iOS | `com.mannlab.inc.clefandstaff`, Runner / Release | 기존 IPA / Xcode 프로젝트 |
| iOS signing | 팀 `ZRA4DHHKQ4`, `Clef And Staff`, manual Apple Distribution | 기존 ExportOptions / 내장 provisioning profile |
| iOS export | `app-store-connect`, `destination=export` | 기존 1.0.2+29 ExportOptions.plist |
| Android | `com.mannlab.clef`, release AAB | 기존 1.0.1+27 AAB의 manifest |
| Android signing | 기존 upload certificate SHA1, manifest에 지문 고정 | keytool로 기존 AAB에서 확인 |

조사한 로컬 파일: `apps/in_c_sheet/README.md`, `android/app/build.gradle.kts`,
`ios/Runner.xcodeproj/project.pbxproj`, `tool/rc_release_check.dart`,
`releases/ios-1.0.0+23/REVIEW-PREPARATION.md`,
`releases/clef-and-staff-1.0.0+24-release.txt`, 기존 IPA/AAB와 export plist.
`releases/` 파일은 기존 gitignore 대상이며 커밋에 포함하지 않는다.
원격 스토어의 현재 build number, 계정 상태, listing 상태는 조회하지 않았다.
현재 manifest의 29는 재현 검증용이며 새 업로드 번호의 사용 가능성을 뜻하지 않는다.

## 로컬 실행

Apple Silicon Mac, Ruby 4.0, Bundler 4, Flutter, Xcode 26.5를 사용했다.
검증 CLI는 Java 17을 사용하고 Flutter의 Gradle 빌드는 Android Studio의 Java를 선택한다.
실행별 실제 Flutter/Java 경로·버전은 결과의 tools에서 확인한다.
Fastlane과 전이 의존성은 `Gemfile.lock`에 고정했다.

```sh
cd deployment
bundle config set --local path vendor/bundle
bundle install
bundle exec ruby test/release_test.rb
python3 -m unittest discover -s test -p '*_test.py'
bundle exec fastlane lanes
bundle exec fastlane plan
```

계획 확인과 metadata staging은 signing이나 store API 키가 필요 없다.
`ruby release.rb plan`도 같은 공통 코드를 사용한다. Fastlane 인수는 `key:value`,
Ruby CLI 인수는 `key=value`이다. 모든 명령은 `deployment`에서 실행한다.

```sh
git worktree add --detach /tmp/in-c-clef-release 80103707a186586a5140031196ea27d6f8328fa7
bundle exec fastlane preflight source_root:/tmp/in-c-clef-release platform:ios
bundle exec fastlane metadata
bundle exec fastlane archive source_root:/tmp/in-c-clef-release platform:ios
bundle exec fastlane export source_root:/tmp/in-c-clef-release platform:ios \
  archive:/absolute/path/from/archive/result/app.xcarchive
```

`archive`는 Flutter config 생성 후 Fastlane `build_app`으로 signed xcarchive를 만든다.
실제 해석된 Xcode target의 bundle ID, team, profile도 확인한다.
`export`는 성공한 archive run의 결과를 요구하고 `xcodebuild -exportArchive`를 호출한다.
Fastlane 2.241.1의 gym은 plist의 `app-store-connect`를 지원하지 않아 native export로
수동 절차를 유지한다. plist의 destination은 반드시 `export`여야 하며 build number
자동 변경도 금지한다. keychain unlock이나 인증서/profile 생성·갱신은 수행하지 않는다.

Android는 기존 Gradle이 읽는 ignored `android/key.properties`와 upload keystore를 쓴다.
기존 Gradle의 debug signing fallback을 피하도록 파일/필수 필드를 사전 확인하며,
빌드 후 upload certificate도 반드시 검사한다. 비밀번호는 로그나 manifest에 기록하지 않는다.
이전 소스의 ignore 설정에 없는 Kotlin의 `.kotlin` cache는 이번 빌드가 새로 만들었을 때만 제거한다.

```sh
export BUNDLETOOL_JAR="$HOME/.local/share/in-c-release-tools/bundletool-all-1.18.3.jar"
python3 runner_signing.py stage apps/clef/release.json /tmp/in-c-clef-release
bundle exec fastlane aab source_root:/tmp/in-c-clef-release platform:android
python3 runner_signing.py cleanup apps/clef/release.json /tmp/in-c-clef-release
```

signing staging은 `$HOME/.config/in-c-release/<app>/key.properties`를 사용한다.
이 파일의 `storeFile`은 외부 keystore의 절대 경로여야 한다. 파일 권한은 600으로 유지한다.
설치한 bundletool 1.18.3의 공식 release SHA256은
`a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`이다.
인증서, API key, keystore를 `deployment/apps`에 넣지 않는다.

## 수동 산출물 비교와 결과

```sh
bundle exec fastlane compare platform:ios artifact:/absolute/path/to/app.ipa
bundle exec fastlane compare platform:android artifact:/absolute/path/to/app.aab
```

기준 IPA/AAB의 SHA256은 앱 manifest에 고정되어 있다. 다른 Mac에서는 같은 기준 파일을
`baseline:/absolute/path`로 지정할 수 있지만 고정한 해시와 같아야 한다.
후보는 manifest의 version/build number와 일치해야 한다.
기준은 과거 버전일 수 있고 비교 결과에 그 버전을 남긴다.

| 공통 | iOS 추가 | Android 추가 |
| --- | --- | --- |
| 앱 식별자, debug 불가 | display name, team/profile, entitlement 전체, 지원 기기, minimum OS | upload certificate, permission 목록, minimum SDK |

iOS는 codesign strict 검증과 distribution profile 확인, Android는 bundletool validate와
jarsigner/keytool 검증을 수행한다. 이 검증은 배포 속성의 동등성이다. timestamp나 signing으로
ZIP 바이트는 달라질 수 있다. UI/오디오/실기기 회귀 검증이나 스토어 승인 가능성을 증명하지 않는다.

manifest·인수 검증과 checkout lock을 통과한 각 실행은 `output/<app>/<run>/result.json`,
`release-manifest.json`을 만들고,
`output/ledger.jsonl`에 성공/실패·소스 커밋·manifest와 pipeline hash·검증 결과를 누적한다.
빌드 실행은 tool version도 남긴다. signed IPA/AAB, xcarchive 및 dSYMs는 run 디렉터리에
보존한다. 다른 app/platform도 같은 source checkout에서는 lock으로 동시 빌드를 차단한다.
별도 checkout은 병렬 실행할 수 있다. ledger append에는 별도 lock과 fsync를 적용한다.
`output/`은 gitignore 대상이므로 필요한 산출물과 ledger를 별도 백업해야 한다.
프로세스 강제 종료나 OS 종료는 Ruby ensure를 실행하지 못할 수 있다.

## Metadata와 release note

`metadata/ios/<locale>`와 `metadata/android/<locale>`에 store copy를, `notes/<version>+<build>.txt`에
release note를 둔다. Clef의 현재 문구는 검수 전 초안이며 `metadata` lane은 로컬 복사만 한다.
TestFlight/internal lane은 listing·스크린샷·release note를 원격 갱신하지 않는다.
검토한 문구를 저장하고 최종 metadata digest를 승인 기록에 묶는다.
실제 스토어 metadata 게시와 심사 제출은 향후 별도 승인 범위다.

사용자가 만든 신규 테스트 앱은 별도의 `store_metadata` lane으로 원격 저장/재조회할 수 있다.
기존 `metadata` lane의 로컬 복사 동작은 유지한다. 대상 식별자와 draft 상태를 제한하는
[Deployment Test 실행법](apps/deployment-test/README.md)을 따른다.

## 테스트 채널 업로드 승인

이번 구축 검증에서는 원격 업로드를 실행하지 않는다.
실제 업로드 시에는 build number 가용성을 먼저 확인하고 manifest와 소스 버전 및
앱 내 버전을 함께 준비한다. 초안 release note를 실제 변경 내역으로 검수한 뒤 다시 빌드한다.
pipeline에서 성공한 `export` 또는 `aab` 결과와 기준 산출물 비교가 필요하다.
기존 수동 IPA를 가져와 바로 업로드하는 것은 build provenance 검사에서 차단된다.

아래 파일은 사용자가 명시적으로 승인한 뒤 `approvals/` 안에 로컬로 작성한다.
플랫폼은 파일의 channel로 구분한다. automation은 승인 파일을 자동 생성하지 않는다.
해시는 해당 결과와 `metadata` 실행에서 얻고 `expires_at`은 24시간 이내로 정한다.

```json
{
  "approved": true,
  "approved_by": "사용자 이름",
  "app": "clef",
  "channel": "testflight",
  "version": "1.0.2+29",
  "artifact_sha256": "<candidate SHA256>",
  "manifest_sha256": "<manifest SHA256>",
  "metadata_sha256": "<metadata and notes SHA256>",
  "source_commit": "<40-character source commit>",
  "expires_at": "<UTC ISO8601>"
}
```

```sh
export ASC_API_KEY_JSON=/external/secure/path/app-store-connect.json
bundle exec fastlane testflight source_root:/tmp/in-c-clef-release platform:ios \
  artifact:/absolute/path/to/successful/export/app.ipa approval:/absolute/path/to/approval.json

export PLAY_SERVICE_ACCOUNT_JSON=/external/secure/path/play-service-account.json
bundle exec fastlane internal source_root:/tmp/in-c-clef-release platform:android \
  artifact:/absolute/path/to/successful/aab/app.aab approval:/absolute/path/to/approval.json
```

App Store Connect API JSON은 Fastlane의 `key_id`, `issuer_id`, `key` 형식이다.
`key`는 PEM 내용이며 이 JSON 자체를 외부 보안 디렉터리에 둔다.
API key JSON은 원본과 빌드 checkout 모두의 바깥에 있어야 한다.
TestFlight는 `skip_submission=true`, external distribution/알림 금지로 upload만 한다.
처리 완료나 테스터 설치 가능 상태를 성공으로 추정하지 않는다.
Play 승인 channel은 `internal-draft`이며 internal track의 draft만 저장한다.
`changes_not_sent_for_review=true`, `rescue_changes_not_sent_for_review=false`로 고정한다.
Google이 옵션을 거부하면 실패하며 심사 요청으로 바꿔 재시도하지 않는다.
실제 내부 테스트 게시, App Review 및 정식 출시는 현재 제공하지 않는다.
업로드가 일부 진행된 뒤 실패하면 ledger의 `attempted`를 확인하고 스토어 상태를 먼저 조사한다.

## Mac self-hosted runner

```sh
python3 runner.py status
python3 runner.py register
python3 runner.py start
python3 runner.py stop
```

이 Mac에는 `in-c-local-mac`, label `in-c-release` runner를 등록했다.
설치 경로는 `$HOME/.local/share/in-c-release-runner`, 실행 방식은 사용자 LaunchAgent다.
등록 token은 gh CLI로 받아 메모리에서만 쓰며 로그나 저장소에 남기지 않는다.
공식 GitHub runner archive를 release asset SHA256으로 검증한 뒤 설치한다.
`register`는 기존 설정을 덮어쓰지 않는다. `start`는 로그인한 사용자의 환경/PATH와
keychain 접근 권한을 사용한다. 화면 잠금·절전·keychain 잠금 시 빌드 가능 여부는 별도 운영 확인이 필요하다.

`.github/workflows/mobile-deployment.yml`은 workflow_dispatch 전용이며
plan/preflight/metadata/archive/aab만 실행한다. pipeline checkout과 manifest에 고정한 app source
checkout을 분리하고 Android signing properties는 실행 후 제거한다.
API 키를 runner workflow에 제공하지 않으며 store upload는 workflow 선택지에 없다.
GitHub artifact에는 결과 manifest와 ledger만 올리고 signed binary·키 파일은 올리지 않는다.
`mobile-deployment-checks.yml`은 hosted Mac에서 배포 가드 테스트만 실행한다.
workflow 파일을 원격 기본 브랜치에 반영하기 전에는 GitHub 수동 실행 검증을 할 수 없다.
현재 branch를 push/merge하거나 기존 CI 파일을 수정하지 않았다.

## 다른 앱 합류

1. `apps/clef`를 `apps/<slug>`로 복사한다.
2. source path/commit, version/build, entrypoint/defines, bundle/package ID,
   signing 공개 식별자, 기준 파일 경로·SHA256, metadata와 notes를 바꾼다.
3. 별도 깨끗한 checkout을 준비하고 preflight → build → compare를 실행한다.
4. signing과 API key는 외부 디렉터리/keychain에 준비한다.

공통 코드는 앱 이름이나 Clef의 식별자를 하드코딩하지 않는다. 현재 지원 범위는 Flutter 앱의
`ios/Runner.xcworkspace`, Runner target, `android/app/build.gradle.kts` 및 기존 Gradle
key.properties signing 계약이다. native-only 앱이나 다른 project layout은 adapter 확장이 필요하다.
`version_constant`는 앱 내 버전 상수가 있을 때만 지정한다.
`test_second_app_joins_with_only_configuration`이 다른 source path와 bundle ID를 가진
두 번째 앱의 preflight/plan/metadata를 같은 코드로 검증한다. 두 번째 앱의 실제 store 배포는 수행하지 않았다.

공식 API 옵션 참고:
[TestFlight upload](https://docs.fastlane.tools/actions/upload_to_testflight/),
[Play upload](https://docs.fastlane.tools/actions/upload_to_play_store/),
[build_app](https://docs.fastlane.tools/actions/build_app/),
[GitHub runner 등록](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners).

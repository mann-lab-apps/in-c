# iOS 출시 정보 파이프라인

출시 정보와 실제 앱 화면을 준비하고, 누락/규격/내용을 검증한 뒤 App Store Connect의 지정한
draft에 동기화한다. 심사 제출·외부 TestFlight 심사·정식 출시 API는 제공하지 않는다.
기존 앱 코드는 수정하지 않는다. pilot은 Clef이고, 원격 API 연결 검증용 앱은 Deployment Test다.

현재 소스에서 새로 촬영하는 자동화는 [앱 공통 스크린샷 파이프라인](SCREENSHOTS.md)에서 실행한다.
`store_screenshots`가 앱별 화면 동선을 실행하고 검수된 asset inventory를 만들며,
이 문서의 `ios_release`는 원격 대상 확인과 업로드/재조회를 담당한다.

## 정보별 처리 범위

| 정보 | 파이프라인 동작 | 내용의 근거 |
| --- | --- | --- |
| 이름·부제·설명·키워드·프로모션 문구 | locale별 text 파일 → 저장/재조회 | 실제 출시 빌드 기능 |
| Privacy/support/marketing URL | HTTPS 형식 검사 → 저장/재조회 | 사용자가 확인한 실제 URL; 형식 검사가 URL 내용/가용성을 보증하지 않음 |
| Copyright·업데이트 설명 | 권리자 파일/업데이트 여부 검증 → 저장/재조회 | 실제 권리자·해당 버전 변경 사항 |
| 기본/보조 카테고리·콘텐츠 권리 | reviewed 설정에서만 저장/재조회 | 사용자가 검토한 사실 |
| 연령 등급 설문 | 명시적으로 답한 JSON → 저장/재조회 | null/모르는 값을 NONE/false로 자동 변환하지 않음 |
| 심사 연락처·데모 계정·심사 노트 | 외부 JSON/notes → 저장/재조회 | 연락처/비밀번호는 git과 결과 로그에서 제외 |
| TestFlight 설명·피드백 이메일·beta review 정보 | app/beta metadata → 저장/재조회 | 내부/외부 심사 요청은 별도이며 자동 실행하지 않음 |
| TestFlight What to Test | 명시한 build_id의 locale별 notes → 저장/재조회 | build의 앱 소유권 확인; 최신 build 자동 선택 안 함 |
| 스크린샷·App Preview·App Review 첨부 | 파일 검사 → 예약 → chunk upload → checksum commit → 상태 조회 | source commit, 실제 화면, 시나리오, 시각 검수, SHA256 |
| App Privacy labels·수출 규정·라이선스·접근성 | 확인 내용/evidence 누락을 보고 | 임의의 법적/개인정보 답변을 만들지 않음 |
| 가격/판매 지역·계약/세금/계좌·trader 상태 | 콘솔 확인 결과를 release manifest에 기록 | 사업/법적 결정을 자동 변경하지 않음 |
| Build 선택·아이콘·실기기 QA·IAP/EULA/App Clip | 해당 여부와 증거를 기록 | binary/사업 기능 설정은 이 lane의 metadata 작업과 구분 |

이번 구현에서 자동화하는 API 범위와 사람이 확인하는 범위를 모두 readiness 보고서에 포함한다.
`information_complete=true`는 기록한 정보/검증 항목이 채워졌다는 뜻이다. Apple의 승인, 앱의 기능 QA
완료 또는 제출 가능 여부 전체를 보증하지 않는다. 선언의 최신 필수 항목/enum과 파일 처리는
Apple API의 최종 검증도 통과해야 한다.

## 앱별 계약

작성 원본은 `apps/<app>/ios-metadata.yaml` 하나다. [메타데이터 가이드](METADATA.md)의
`prepare_ios_metadata`가 아래 JSON/text와 촬영 설정을 같은 snapshot으로 생성한다.
`ios_release`에 YAML을 직접 지정해도 생성 후 실행한다. 생성 파일 대신 YAML을 수정한다.
기존 JSON-only 입력은 이전 검증 기록과의 호환용으로 유지한다.

- `apps/<app>/ios-release.json`: 앱 ID/Bundle ID/버전/source commit, 기기·locale,
  metadata 경로, 선언, 심사/베타 설정, 미디어 inventory, 수동 확인 항목.
- `metadata/ios/<locale>/*.txt`: 이름/설명/URL/notes. `metadata/ios/copyright.txt`: 실제 권리자.
- `shot-plan.json`: 촬영할 화면, 목적, 진입 경로, fixture, 보여줄 결과, 제외할 내용, 검증 여부.
- `media/`: 촬영한 자산. gitignore 대상이며 별도로 백업한다.
- 외부 private details JSON: 심사 연락처, 필요한 경우 데모 계정, 조건부 beta 심사 영상 URL.

`reviewed=false`, 미확인 URL·연락처·권리 답변, 존재하지 않는 캡처 파일은 업로드 blocker다.
Clef에 남은 공란은 의도적으로 표시했다. 기존 in C privacy/support URL을 Clef에 자동 전용하지 않는다.
App ID는 계정 API에서 bundle ID로 조회해 `6808164371`임을 확인했다. 이 조회는 원격 변경을 하지 않았다.
현재 pinned source는 1.0.2+29 재현용이다. 계정 조회에서 1.0.2는 이미 `READY_FOR_DISTRIBUTION`임을
확인했으므로 이 버전에 sync할 수 없다. 새 출시는 새 draft를 준비하고 실제 새 source/version/build와
일치시킨다. 현재 공개 버전의 한국어 텍스트 7개와 copyright는 읽기 전용 조회로 로컬 기준에 가져왔다.
업데이트 release note와 현재 미확인 선언/연락처/미디어는 별도로 준비한다.

텍스트 파일 이름:

```text
name.txt                 subtitle.txt
description.txt          keywords.txt
promotional_text.txt     support_url.txt
marketing_url.txt        privacy_url.txt
privacy_choices_url.txt  release_notes.txt
```

첫 출시에는 `release_notes.txt`를 보내지 않고, 업데이트에서는 반드시 준비한다.
새 앱 레코드/새 iOS 버전 draft는 콘솔에서 준비한다. 이 lane은 정확히 일치하는
`PREPARE_FOR_SUBMISSION` draft만 찾으며 버전을 자동 생성/증가시키지 않는다.
공개 버전이 있어도 지정한 편집 버전만 선택하고, review 중인 버전은 수정하지 않는다.

## 실행

```sh
cd deployment
bundle exec fastlane ios_release manifest:apps/clef/ios-release.json mode:plan
bundle exec fastlane ios_release manifest:apps/clef/ios-release.json mode:validate \
  private_details:/external/secure/clef-review.json
```

`plan`은 API 키 없이 전체 blocker를 기록한다. `validate`는 수동 항목을 포함한 전체 정보에
blocker가 있으면 실패한다. 업로드 전에는 `inspect`로 remote 상태를 먼저 확인한다.

```sh
bundle exec fastlane ios_release manifest:apps/clef/ios-release.json mode:inspect \
  sections:metadata,review,media \
  credentials:/external/secure/metadata-api.json \
  private_details:/external/secure/clef-review.json

bundle exec fastlane ios_release manifest:apps/clef/ios-release.json mode:sync \
  sections:metadata,declarations,review,testflight,media \
  credentials:/external/secure/metadata-api.json \
  private_details:/external/secure/clef-review.json
```

`sections`는 `metadata,declarations,review,testflight_app,testflight,media` 중 필요한 부분만 지정할 수 있다.
지정한 부분에 blocker가 없을 때만 저장하며 전체 미완료 상태는 결과에 계속 남긴다.
예를 들어 미디어가 준비되기 전에 올바른 draft 설명을 먼저 저장할 수 있다.
`sync`는 값이 같으면 PATCH를 생략하고, 저장 후 별도 GET으로 검증한다.

`testflight_app`은 빌드 없이 앱 수준 설명·피드백 이메일·beta 심사 연락처/노트만 저장한다.
`testflight`는 이 항목과 함께 지정한 빌드의 What to Test도 저장하므로 `build_id`가 필수다.
두 scope를 함께 지정하면 전체 `testflight`로 처리한다. 빌드 업로드나 심사 요청은 하지 않는다.

테스트 앱에 기존 스토어 스크린샷을 복사할 때만 `test_only: true`와 자산별 `provenance`를
사용할 수 있다. `provenance`는 `type: app_store_connect_asset`, 원본 `app_id`, `version`,
`asset_id`를 포함한다. 이 경우 `authentic: false`, `source_commit: null`로 원본 촬영 빌드가
미검증임을 명시한다. 실제 파일의 SHA256·규격·시각 검수는 그대로 필요하다.
이 예외는 screenshot에만 적용하며, 일반 출시 패키지는 실제 출시 빌드 캡처 검사를 통과해야 한다.
출처와 test-only 여부는 결과 manifest와 ledger에도 남긴다.

API credential 형식은 [metadata 테스트 가이드](apps/deployment-test/README.md)를 따른다.
아래 private details는 저장소 밖에 만들고 파일 권한을 600으로 유지한다.

```json
{
  "contactFirstName": "<real contact>",
  "contactLastName": "<real contact>",
  "contactPhone": "<real phone>",
  "contactEmail": "<real email>",
  "demoAccountName": "<only if login is required>",
  "demoAccountPassword": "<only if login is required>",
  "testflightVideoURL": "https://<reviewer-accessible demo link, only when needed>"
}
```

필요하지 않은 optional 필드는 생략한다. 데모 계정이 필요한데 없으면 업로드를 차단한다.
연락처/로그인 필드는 결과 JSON에서 redacted로 기록한다. 영상 URL은 reviewer에게 전달할 정보라
review notes에도 포함되므로 비밀번호나 서명 토큰을 URL에 넣지 않는다.

## 스크린샷: Clef에서 어떤 화면을 찍는가

`apps/clef/shot-plan.json`이 앱별 촬영 명세다. 기본 공개 스크린샷은 아래 세 장을 iPhone/iPad에 각각 준비한다.

| 순서 | 화면 | 보여줄 가치 | fixture와 검수 |
| --- | --- | --- | --- |
| 1 | 채워진 라이브러리 | 악보를 모으고 정리하는 앱이라는 첫인상 | 자가 제작 악보 3개+, 컬렉션/즐겨찾기, 읽을 수 있는 제목 |
| 2 | 악보 보기 + 저장된 주석 | 핵심 읽기/연습 작업 | 본인이 만든 악보, 실제 저장된 펜/연습 표시, 보이는 도구는 iOS 지원 확인 |
| 3 | 세트리스트 | 공연/연습 순서 구성 | 악보 3개를 배치한 연습 세트, 개인정보 없는 이름 |
| 선택 | iPad 가로 2페이지 | 태블릿의 넓은 보기 | 실제 2페이지 레이아웃 확인 후 추가 |
| 선택 | 튜너/메트로놈 | 검증된 연습 도구 | iOS 실기기 정확도/출력·권한 처리 확인이 있을 때만 포함 |

빈 라이브러리, 테스터 체크리스트, OS 오류, 개인 파일, 권리가 확인되지 않은 악보,
다른 앱/Android 화면을 공개 스크린샷으로 올리지 않는다. 앱 UI를 이미지 생성 모델로 만들지 않는다.
raw 캡처의 source/version/build를 남기고 시각 검수 후 manifest의 `reviewed`, `authentic`,
scene의 `verified`, 파일 SHA256을 채운다. 이 플래그는 캡처만 했다고 자동으로 true가 되지 않는다.

`capture_ios.py`는 **미리 해당 화면에 진입한 Simulator**를 캡처한다. 앱 내부 화면 탐색/fixture 채우기를
자동으로 증명하는 도구가 아니다. 설치 앱의 식별자/버전/build와 제공한 build 결과를 확인하지만,
현재 foreground 화면·정확한 기능 상태·fixture·소스가 실제 그 빌드인지에 대한 최종 시각/빌드 검수도 필요하다.
원본을 덮어쓰지 않으며 capture JSON을 함께 만든다.

```sh
python3 capture_ios.py \
  --manifest apps/clef/ios-release.json --udid '<simulator UUID>' --asset 0 \
  --build-result '/absolute/path/to/successful/archive-or-export/result.json'
```

이미지에는 alpha channel이 없어야 한다. PNG에 alpha가 생기는 경우 manifest 경로를 `.jpg`로 정하고
직접 JPEG로 캡처한다. 단순 파일 확장자 변경이나 가짜 resize로 기기 규격을 맞추지 않는다.
지원하는 검증 slot은 iPhone `APP_IPHONE_67`/`APP_IPHONE_65`, iPad `APP_IPAD_PRO_3GEN_129`다.
현재 예시는 iPhone 1320×2868, iPad 2064×2752 또는 2048×2732 및 가로 방향을 검증한다.
새 기기/slot은 Apple 최신 규격을 확인해 코드와 테스트에 추가한다. 규격은 2026-10-21에 확인했다.

## 영상의 목적과 업로드 대상

| 종류 | 필수 여부 | 내용 | 업로드 위치 |
| --- | --- | --- | --- |
| App Preview | 선택 | 고객용 15–30초 실제 UI 영상: 라이브러리 → 보기/주석 → 세트리스트 | App Store 해당 locale/preview slot |
| App Review 데모 | 심사 요청/재현하기 어려운 기능 등 조건부 | 가져오기부터 결과까지 연속 동선, 필요한 실제 하드웨어/오디오 | App Review Information의 attachment |
| TestFlight 심사 참고 영상 | 일반적인 공통 필수 영상으로 가정하지 않음 | beta build/기능에 맞는 재현 단계와 필요할 때 데모 | beta review notes에 접근 가능한 URL; App Review attachment와 별개 |

App Preview는 최대 3개/slot이고, 이 구현의 검증 subset은 H.264, 최대 30fps, 15–30초,
500MB 이하, Apple이 받는 preview 해상도다. **스크린샷 해상도와 preview 해상도는 다를 수 있다.**
예를 들어 iPhone preview는 이 slot에서 886×1920을 사용한다. 영상이 있으면 `ffprobe`가 필요하다
(`brew install ffmpeg`). 로컬 검사는 주요 container/codec/길이/해상도만 확인하며 Apple의 전체
오디오/인코딩 적합성 판단은 처리 완료 상태로 확인한다.

심사용 데모에는 App Preview의 30초 제한을 적용하지 않는다. Clef의 권장 동선:

1. 출시 빌드 실행과 버전 확인 → Files에서 자가 제작 PDF 가져오기.
2. 라이브러리 등록 → 악보 열기 → 주석 저장/재실행 보존.
3. 세트리스트 추가/순서 → 공유/백업 결과 확인.
4. 광고한 기능에 필요하면 마이크 권한 허용/거부와 정상 복귀.
5. 페달/외부 오디오가 핵심이면 실제 장치와 화면을 함께 촬영하고 조작·출력을 보여준다.

무음 Simulator 녹화만으로 실제 가청성·정확도·페달 동작을 증명하지 않는다. 해당 기능을 광고했거나
심사 요청이 있으면 `shot-plan.json`의 `review_video.required=true`로 바꾸고 실제 첨부 자산을 추가한다.
TestFlight 심사에도 영상이 필요하면 private details에 `testflightVideoURL`을 준비한다.
이 pipeline은 임의의 외부 영상 호스팅에 파일을 게시하지 않는다.

추가 미디어 inventory 예:

```json
{
  "kind": "review_attachment",
  "locale": "ko",
  "device": "ipad",
  "display_type": null,
  "path": "media/review/core-demo.mp4",
  "position": 1,
  "scene": "review_core",
  "sha256": "<actual SHA256>",
  "reviewed": true,
  "authentic": true,
  "source_commit": "<release source commit>"
}
```

App Preview는 `kind=preview`, iPhone은 `display_type=IPHONE_67` 등 preview slot을 사용한다.
기본 세팅에서 선택 영상이 없다는 이유만으로 차단하지 않는다. 필요한 영상으로 표시했는데 파일이
없거나 미검수 상태이면 차단한다. review attachment는 현재 영상 파일을 지원한다. PDF 심사 문서는
별도 asset 검사 adapter를 추가하거나 콘솔에서 첨부하고 evidence를 남긴다.

## 미디어와 원격 변경 검증

새 자산은 예약 → Apple이 제공한 URL에 범위별 PUT → MD5 checksum commit 순서로 전송한다.
공개 자산의 순서와 checksum을 재조회한다. App Store Connect JWT는 storage upload host에 전달하지 않는다.
전송 성공과 Apple의 처리는 구분한다. 처리 중이면 성공으로 표시하지 않는다. App Preview 처리는
오래 걸릴 수 있으므로 장시간 대기하지 않고 뒤에 `verify`를 실행한다.

```sh
bundle exec fastlane ios_release manifest:apps/clef/ios-release.json mode:verify \
  sections:media credentials:/external/secure/metadata-api.json \
  private_details:/external/secure/clef-review.json
```

기존 자산 checksum이 같으면 재업로드하지 않는다. 다른 원격 자산/순서가 있으면 임의 삭제·교체하지
않고 충돌로 중단한다. 현재는 신규 업로드와 같은 자산의 재실행을 지원한다. 변경된 기존 screenshot set의
교체는 기존 원본을 확보해 명시적으로 정리한 뒤 실행한다. 다른 locale/slot의 파일은 삭제하지 않는다.
기존 broad `deliver` metadata upload의 attachment 삭제 동작을 피하기 위해, 좁은 API 경로만 사용한다.

각 run은 결과/이전 값/완료한 operation/파일 해시/readiness를 `output/<app>/<run>/result.json`과
공통 ledger에 기록한다. 실패하면 이전 값이 남아 있어 부분 성공 여부를 확인할 수 있다.
공개 상태, version ID, release type이 바뀌면 중단하며, 자동 rollback으로 다른 사용자의 수정을 덮지 않는다.
Store Metadata와 iOS Release lane은 같은 앱 lock을 공유한다. 전체 remote 변경은 서버의 원자적
transaction이 아니므로 작업 도중 콘솔에서 동시에 수정하지 않는 것을 운영 원칙으로 한다.

## 검증 근거와 현재 남은 준비

배포 가드/기존 metadata 가드를 유지하면서 새 release 테스트는 다음을 검증한다:
대상 앱/편집 버전 선택, 잘못된 앱·심사 상태 차단, locale/필드 길이/초안/URL/첫 출시 notes 검사,
재조회 불일치 실패, review 정보 redaction, beta build 소유권/What to Test, 선언의 명시적 답변,
실제 PNG 구조/alpha/해시 검사, reserve/commit/처리 중 상태, 중복 업로드·원격 충돌·임의 출시 인수 차단.
자동 테스트의 합성 fixture는 fake API에서만 사용하며 store에 올리지 않는다.

검증 결과: Ruby 테스트 **80개 / 263 assertions**, Python artifact 테스트 **5개**가 통과했다.
`ios_release` 전용은 **34개 / 112 assertions**이며 기존 테스트를 포함해 총 **85개**다.

Deployment Test에서 새 lane의 실제 metadata/선언/심사/beta 정보 조회가 통과했다.
조회 결과: `output/deployment-test/20261021T070959-2016044d/result.json`.
원격 write operation은 0개다. Clef의 준비 보고서는 `output/clef/20261021T071109-d68858ac/result.json`이다.
기존 `store_metadata` lane의 실제 저장/재조회 검증 결과도 보존한다.

이후 같은 날 사용자 요청으로 Clef 1.0.2의 문구·URL·권리 답변·연령 설문·심사 정보를
Deployment Test에 저장했다. 기존 스토어 스크린샷의 JPEG rendition 6장(iPhone/iPad 각 3장)도
test-only 출처로 업로드했고, 순서·checksum·Apple `COMPLETE` 상태 재조회가 통과했다.
TestFlight 앱 수준 설명/피드백 이메일/beta review 정보도 빌드 없이 저장·검증했다.
근거는 [Deployment Test 검증 기록](apps/deployment-test/README.md)에 기록한다.
현재 공개 Clef에는 쓰기를 하지 않았고, 원본 텍스트·심사 정보·이미지 보존을 별도 재조회했다.
영상, 새 빌드 캡처, 빌드별 What to Test, privacy labels/사업 설정/실기기 QA는 별도 검증이 필요하다.
GitHub Actions는 아직 원격에서 실행하지 않았다.

## 공식 근거

- [버전 정보와 필수/선택 항목](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [스크린샷 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [App Preview 규격과 선택 여부](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/)
- [심사 데모가 필요한 경우](https://developer.apple.com/app-store/review/)
- [App Review 첨부 API](https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-attachments)
- [TestFlight 테스트 정보](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/)

# App Store Connect metadata 입력 검증

대상은 사용자가 생성한 `Deployment Test` (`6825212101`,
`com.mannlab.deployment-test`)의 iOS 1.0 / 한국어 metadata다.
이 디렉터리의 `store.json`은 소스 코드나 signed build 없이 사용하는 metadata 전용 manifest다.
계정 ID, API 키 ID/issuer, 키 파일과 토큰은 이 디렉터리에 저장하지 않는다.

`store_metadata` lane은 앱 이름/Bundle ID/앱 ID/언어/버전이 모두 맞고,
app info와 version이 각각 하나의 `PREPARE_FOR_SUBMISSION` 상태이며
선택된 build가 없을 때만 작업한다. 공개 버전이나 심사 중인 버전은 차단한다.

```sh
cd deployment
bundle exec ruby test/store_metadata_test.rb
bundle exec fastlane store_metadata \
  store_manifest:apps/deployment-test/store.json \
  credentials:/absolute/external/path/metadata-api.json mode:inspect
bundle exec fastlane store_metadata \
  store_manifest:apps/deployment-test/store.json \
  credentials:/absolute/external/path/metadata-api.json mode:apply
```

credentials JSON은 저장소 밖에 두고 다음 형식으로 작성한다. `.p8` 파일도 저장소 밖에 둔다.
기존 binary upload lane의 `ASC_API_KEY_JSON`과 달리 이 파일은 키 본문을 포함하지 않는다.

```json
{
  "key_id": "<Key ID>",
  "issuer_id": "<Issuer ID>",
  "key_filepath": "/absolute/external/path/AuthKey_<Key ID>.p8"
}
```

`inspect`가 기본 모드이며 조회만 한다. `apply`는 이름·부제·설명·키워드·프로모션 문구 중
manifest에 있는 값만 저장한다. 이름 변경은 지원하지 않는다. 이미 같은 값이면 PATCH를 생략한다.
저장 후 별도 GET으로 한글·줄바꿈을 포함한 전체 문자열을 비교하고, 상태·리소스·release 설정이
유지되는지도 확인한다.

API client는 GET과 `appInfoLocalizations` / `appStoreVersionLocalizations`의 metadata PATCH만
허용한다. 앱/버전 생성, binary/build 연결, 스크린샷 업로드, 심사/출시 및 가격/판매 지역 API는 없다.
권한 오류나 사전 조회 실패 시 쓰기를 시작하지 않는다.

`output/deployment-test/<run>/result.json`에 이전 값, 시도/완료한 쓰기, 재조회 결과를 기록하고
공통 `output/ledger.jsonl`에도 남긴다. write 전에 진행 상황을 저장하므로 부분 성공 후 실패해도
어느 단계까지 시도했는지 확인할 수 있다. 실패 시 자동 rollback이나 다른 권한으로 재시도하지 않는다.
다시 실행하기 전 remote 상태를 조회한다.

2026-10-21 초기 연결에서 앱 ID·이름·Bundle ID·언어 조회와 iOS 1.0의
`PREPARE_FOR_SUBMISSION` 상태 조회는 성공했다. `appInfos` 조회는 키 권한으로 HTTP 403이
반환되어, 권한 확인 전에는 원격 저장을 진행하지 않았다. 최종 실행 상태는 로컬 ledger를 확인한다.

## 2026-10-21 실제 저장 검증

별도로 발급한 App Manager 키로 다음 실행이 성공했다. 기존 보고서용 키는 변경/폐기하지 않았다.

| 단계 | 결과 | 근거 (`deployment/` 기준) |
| --- | --- | --- |
| 권한·앱 식별자·draft 상태 조회 | PASS | `output/deployment-test/20261021T064801-7468614b/result.json` |
| 부제·설명·키워드·프로모션 문구 저장 | PASS | `output/deployment-test/20261021T064816-f0f08b46/result.json` |
| 별도 GET으로 한글·줄바꿈 포함 전체 문자열 대조 | PASS, differences 없음 | 같은 결과의 `verification` 및 `after` |
| App info / iOS 1.0 상태 유지 | 모두 `PREPARE_FOR_SUBMISSION` | 같은 결과의 `before` / `after` |
| selected build / release 설정 유지 | build 없음, release type 변경 없음 | 같은 결과의 `before` / `after` |

변경 전 해당 필드는 비어 있었다. 앱 이름 `Deployment Test`는 기존 값과 같아 PATCH에서 제외했다.
입력한 부제는 `Fastlane 메타데이터 입력 검증`, keywords는 `deployment,fastlane,test`다.
앱 정보 화면에서 부제를, iOS 1.0 화면에서 설명/키워드/프로모션 텍스트를 확인할 수 있다.

실행 범위는 metadata PATCH 2개이며 빌드 업로드·심사 제출·출시·가격/판매 지역 변경은 수행하지 않았다.
키 파일은 사용자가 지정한 외부 경로에서 읽었으며 저장소에 복사하거나 본문을 로그에 남기지 않았다.
metadata 전용 테스트 18개, 기존 배포 가드 테스트 28개, artifact 테스트 5개가 통과했다.
이 결과는 로컬 Fastlane 실행이며 GitHub Actions 실행 결과를 뜻하지 않는다.

API 참고:
[App Info Localizations](https://developer.apple.com/documentation/appstoreconnectapi/app-info-localizations),
[App Store Version Localizations](https://developer.apple.com/documentation/appstoreconnectapi/app-store-version-localizations).

## Clef & Staff 내용으로 확장 검증 — 2026-10-21

사용자 요청으로 원본 Clef (`6808164371`)의 현재 등록된 1.0.2 내용을 이 테스트 앱의
iOS 1.0에 복사했다. `ios-release.json`이 전체 정보 계약이며 `store.json`의 공통 텍스트도 맞췄다.
테스트 앱 이름/Bundle ID/앱 ID/버전은 유지한다. 첫 출시이므로 Clef의 업데이트 설명은 보내지 않는다.

| 항목 | 검증 내용 |
| --- | --- |
| 한국어 listing | 설명·키워드·프로모션·support/marketing/privacy URL·copyright 저장 및 전체 문자열 재조회 |
| 부제 | 준비한 `PDF 악보와 세트리스트` 사용; 원본 Clef의 공개 부제는 비어 있음 |
| 카테고리/콘텐츠 권리 | 원본 `MUSIC` / `DOES_NOT_USE_THIRD_PARTY_CONTENT` 값 복사 |
| 연령 등급 | 원본의 명시적 non-null 설문 답변 26개 복사; 모르는 항목을 false로 추정하지 않음 |
| App Review 정보 | 기존 연락처와 노트 복사; 테스트 앱에 실행 가능한 Clef 빌드가 없다는 설명 추가 |
| TestFlight 앱 정보 | 설명·피드백 이메일·beta review 연락처/노트 저장; 빌드 및 beta 심사 요청 없음 |
| 스크린샷 | 기존 등록 이미지 iPhone 6.5인치 3장 / iPad 13인치 3장; 순서·MD5·`COMPLETE` 확인 |
| 원본 보존 | Clef의 앱 속성·설문·listing·심사/beta 심사 정보·스크린샷 재조회에서 변경 없음 |
| 제출 상태 | 테스트 버전 `PREPARE_FOR_SUBMISSION`, 선택된 build 없음, release type 유지 |

스크린샷은 Apple의 기존 image asset URL에서 원래 크기의 **JPEG rendition**을 내려받았다.
PNG rendition에는 alpha가 있어 업로드 검사에서 제외했다. 이미지 구성/문구를 새로 만들거나 바꾸지 않았다.
`shot-plan.json`에는 출처와 시각 검수 범위를 기록했고, manifest에는 각 원본 asset ID와 SHA256을 넣었다.
기존 이미지의 촬영 commit/실기기 튜너 동작은 입증되지 않았으므로 `test_only: true`,
`authentic: false`, `source_commit: null`로 표시한다. production용 캡처 검사를 완화하지 않는다.
원본 PNG/JPEG는 ignored `media/`에 있으며 별도 백업이 필요하다.

심사 연락처/원본 private 정보와 API 키는 저장소 밖에 보관한다. TestFlight 피드백 이메일은
Clef의 공개 support 페이지에 기재된 주소를 사용했다. 노트에는 비밀번호를 포함하지 않는다.

```sh
cd deployment
bundle exec fastlane ios_release \
  manifest:apps/deployment-test/ios-release.json mode:sync \
  sections:metadata,declarations,review,testflight_app,media \
  credentials:/external/secure/metadata-api.json \
  private_details:/external/secure/review-details.json
```

실행 근거 (`deployment/` 기준):

- `output/deployment-test/20261021T072115-db35d993/result.json`: 쓰기 전 대상/설문/심사 정보 조회.
- `output/deployment-test/20261021T072157-bf1f480b/result.json`: metadata/선언/심사/이미지 저장, 21 operations 완료, 재조회 차이 없음.
- `output/deployment-test/20261021T072407-8c49d867/result.json`: TestFlight 기본 정보 저장 2 operations, 전체 scope 재조회 차이 없음.
- `output/deployment-test/20261021T072531-9e667f53/result.json`: 같은 전체 scope 재실행 PASS, 추가 쓰기/중복 업로드 0건, 재조회 차이 없음.
- `output/deployment-test/clef-copy-source-integrity-2026-10-21.json`: 원본 데이터 보존 및 테스트 앱의 build 없음/미제출 상태 확인, 11개 항목 PASS.

로컬 자동 테스트 85개(Ruby 80 / 263 assertions + Python 5)와 Fastlane lane 로드가 통과했다.
GitHub Actions는 실행하지 않았다. 앱 코드·binary·심사 제출·출시는 이 작업에서 변경하지 않았다.
빌드별 What to Test, App Preview/심사 영상, App Privacy 설문·가격/판매 지역·계약·실기기 QA는
이 저장 테스트의 완료 항목이 아니며 전체 readiness는 계속 `information_complete: false`다.

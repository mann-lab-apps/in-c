# 앱 공통 iOS 스크린샷 파이프라인

기존 스토어 이미지를 재사용하는 단계와 구분해, 지정한 commit의 앱을 실행하고 현재 UI를 촬영한다.
공통 실행기는 앱 이름/모델을 알지 않는다. 앱별 설정이 소스·기기·화면 동선을 지정한다.
현재 engine은 Flutter iOS integration test다. 스토어 쓰기·심사·출시 기능은 없다.

작성 원본은 [ios-metadata.yaml](apps/clef/ios-metadata.yaml)의 `screenshots`다.
화면별 목적·진입 경로·샘플 데이터·필수/제외 내용을 자동화 동선과 함께 작성한다.
[작성 가이드](METADATA.md)에 따라 YAML을 갱신하면 실행용 JSON과 촬영 계획이 함께 생성된다.
기존 JSON 직접 입력은 이전 실행과의 호환용으로 유지한다.

## 구성과 앱 합류

- `capture_screenshots.py`: 설정 검사 → 격리 worktree → build/실행 → 기기별 촬영 → identity/규격/hash 검증 → 결과/ledger.
- `capture/screens_test.dart`: JSON의 UI 이동과 assertion을 실행하는 공통 harness.
- `capture/driver.dart`: **각 scene에서 이미 촬영된 native PNG bytes**를 저장하고 같은 크기의 JPEG로 인코딩한다.
- `capture/default_adapter.dart`: 기존 `main()` 실행. 별도 초기화가 없는 다른 Flutter 앱은 이를 사용한다.
- `apps/<app>/ios-metadata.yaml`: 작성 원본. source와 screenshots에서 실행용 `screenshots.json`을 생성한다.
- 선택적 `capture/<app>/adapter.dart`: 샘플 데이터/로그인 등 앱마다 다른 준비만 담당한다.

다른 앱은 [메타데이터 템플릿](apps/_template/ios-metadata.yaml)을 복사해 앱/소스/기기/화면 값을 바꾸며 공통 코드를 수정하지 않는다.
`integration_test`, `flutter_test` SDK 개발 의존성이 필요하며 기본 어댑터는 동기/비동기 `main()` 모두 실행한다.
별도 Xcode scheme을 사용하는 앱은 optional `flavor`를 지정한다.
데이터 초기화가 필요한 앱까지 같은 준비 코드를 쓸 수 있다고 가정하지 않으며 필요할 때 어댑터를 연결한다.
Clef 어댑터는 직접 생성한 연습 PDF 3개·세트리스트·주석을 실제 store에 저장·재조회하고 기존 앱을 실행한다.
제품 화면/renderer를 별도로 만들거나 수정하지 않는다. fixture 초기화는 전용 촬영 시뮬레이터에서만 사용한다.

## 실행

```sh
cd deployment
bundle exec fastlane store_screenshots manifest:apps/clef/ios-metadata.yaml mode:plan
bundle exec fastlane store_screenshots manifest:apps/clef/ios-metadata.yaml mode:capture
```

`plan`은 빌드/시뮬레이터/스토어에 접근하지 않고 필요한 이미지 목록을 출력한다.
`capture`는 설정한 commit에서 detached worktree와 전용 시뮬레이터를 생성한다.
촬영 뒤 생성한 기기를 종료한다. 디버깅을 위해 worktree·기기 데이터는 보존한다.
기존 앱 코드·버전·서명 설정·사용자 작업 폴더는 수정하지 않으며 인증서는 필요하지 않다.

캐시를 재사용할 때는 깨끗한 격리 checkout과 촬영 전용 기기를 명시할 수 있다.

```sh
python3 capture_screenshots.py capture --manifest apps/clef/ios-metadata.yaml \
  --source-root /external/isolated-checkout \
  --device iphone=SIMULATOR-UDID --device ipad=SIMULATOR-UDID
```

개인 데이터가 있는 시뮬레이터를 fixture 어댑터에 연결하지 않는다. 기존 기기를 일괄 초기화/종료하는 명령은 없다.
지정한 격리 checkout에는 `integration_test/_deployment_capture_*`, `test_driver/_deployment_capture_driver.dart`만 staging한다.
추적된 파일을 덮어쓰는 경우 중단한다.

## 화면 동선

scene은 `id`, `purpose`, `steps`, `assertions`를 가진다. 예:

```json
{"id":"details", "purpose":"현재 상세 화면", "steps":[
  {"action":"tap", "by":"text", "value":"Sample item"}
], "assertions":[{"by":"text", "value":"Details", "present":true}]}
```

action은 `tap`, `scroll_to`, `back`, `wait`다. 선택자는 `text`, `tooltip`, `key`, `widget_type`이며
tap은 text/tooltip/key만 허용한다. 임의 shell/code action은 지원하지 않는다.
각 scene에는 화면에 보이는 positive assertion이 최소 하나 필요하다. 이동/확인 실패 시
진단용 `*-failed-*.jpg`를 남기고 실패 처리하며, 진단 이미지는 업로드 inventory에 포함하지 않는다.
`scroll_to`는 가장 위의 활성 scrollable에서 지정한 요소까지 이동하며 `delta`는 -1000..1000 pixel 중 0 이외 값이다.
테스트 종료 뒤 설치 앱 identity를 확인할 수 있도록 `--keep-app-running`을 사용한다.

각 scene은 이전 장면의 navigation·scroll 상태를 상속하지 않고 adapter를 다시 실행해 앱 root에서
시작한다. `scroll_to`는 hit-test 가능한 세로 scrollable만 사용하며 lazy list에서 대상이 아직
생성되지 않은 경우 최대 20회 안에서 탐색한 뒤 `ensureVisible`을 적용한다. scene의 `route`와
`steps`는 독립적으로 완결된 동선이어야 한다.

## 검증과 결과

자동으로 다음을 확인한다.

1. checkout commit과 앱 소스가 설정과 일치하고, 촬영 과정에서 추적된 앱 파일이 변경되지 않았는지.
2. pubspec과 실제 설치 앱의 Bundle ID/버전/build가 일치하며 Simulator build인지.
3. 기기 type/runtime과 캡처의 실제 pixel width/height/alpha가 지정한 store slot과 맞는지.
4. 모든 기기/scene의 UI assertion·파일 생성이 성공했는지, 다른 scene이 동일한 이미지로 찍히지 않았는지.
5. 재검증 시 config/source commit/이미지 SHA256이 촬영 당시와 같은지.

iOS driver의 저장 callback은 테스트 종료 뒤 실행될 수 있다. 그때 새 화면을 촬영하면 모든 파일이
마지막 화면이 되는 문제가 생긴다. 이 pipeline은 `binding.takeScreenshot`이 **scene 시점에 native로
촬영한 bytes**를 저장한다. 원본 PNG와 JPEG 모두 보존하며 sips 인코딩 외에 crop/resize/합성은 하지 않는다.

YAML 실행은 생성된 `output/<app>/metadata-<run>/media/screenshots-<run>/`에 이미지를 남긴다.
기존 JSON 직접 실행은 해당 manifest 옆 `media/screenshots-<run>/`를 사용한다.
`output/<app>/screenshots-<run>/`에
결과/입력 snapshot/기기별 로그를 남긴다. 실패도 ledger에 남긴다. 결과에는 source commit,
adapter/harness 해시, 설치 앱과 기기 identity, scene, 실제 규격, 원본/배포 파일 hash와 build mode를 기록한다.
이 pipeline은 Simulator **debug integration build**를 촬영한다. App Store 서명 바이너리의 동일성이나
실기기 마이크/페달/오디오 성능 검증을 뜻하지 않는다.

```sh
bundle exec fastlane store_screenshots manifest:apps/clef/screenshots.json mode:verify \
  result:output/clef/screenshots-RUN/result.json
```

자동 검사만으로 빈 악보·잘린 필기·로딩 중 화면·오류·개인정보 노출을 모두 판단할 수 없다.
시각 검수 전에는 `ready_for_upload`와 asset의 `reviewed`가 false다. 파일을 직접 열어 확인하고 별도 review를 작성한다.

```json
{"schema_version":1, "capture_result_sha256":"<result.json SHA256>",
 "reviewer":"<검수자>", "assets":[
   {"path":"media/screenshots-RUN/iphone-library.jpg", "sha256":"<파일 SHA256>",
    "approved":true, "notes":"필수 화면/자료가 보이고 오류·개인정보 노출 없음"}
 ]}
```

모든 파일을 검수해야 하며 result/이미지 hash가 다르거나 미승인/누락된 파일이 있으면 실패한다.

```sh
bundle exec fastlane store_screenshots manifest:apps/clef/screenshots.json mode:verify \
  result:output/clef/screenshots-RUN/result.json review:/external/capture-review.json
```

`visual-verification.json`은 검수된 asset inventory를 포함한다. 별도 `ios_release` media 입력으로 연결할 수 있다.
원격 target/편집 버전과 기존 이미지 충돌 검사는 해당 lane에서 다시 수행한다. 촬영 pipeline은 스토어 이미지를 교체하지 않는다.
최신성은 날짜만으로 판단하지 않고 실제 업로드할 source commit과 capture commit의 일치로 판단한다.

## 검증 범위

자동 테스트는 다른 앱 설정/default adapter, 경로/commit/dirty source/앱 identity/규격 오류,
scene 누락, 실패/오래된 결과 재사용, 촬영 후 파일 변경과 다른 결과의 시각 검수 재사용 차단을 확인한다.
두 번째 실제 앱 빌드는 아직 실행하지 않았다. 다른 앱 이름/Bundle ID/진입점/default adapter/flavor와
화면 동선을 설정만 바꾸는 검증은 자동 테스트에서 통과했다.

## 실제 Fastlane 실행 — 2026-10-21

`store_screenshots mode:capture`가 iPhone 17 Pro Max와 iPad Pro 13-inch M5에서 전체 동선을 실행했다.
source는 촬영 시작 시점 Clef dev의 커밋된 최신 `81219851ed436e29b4e416afbbbc5da693b7ea36`,
1.0.2+29다. 다른 작업 폴더의 미커밋 변경은 포함하지 않았다. 실행 시간은 135초였다.

| 항목 | 결과 |
| --- | --- |
| 앱/버전/build/Simulator SDK 검사 | 두 기기 모두 PASS |
| UI 동선 | 라이브러리 → 실제 PDF/필기 모드 → 세트리스트, 두 기기 모두 PASS |
| 크기 | iPhone 1320×2868, iPad 2064×2752 |
| 자동 파일 검사/별도 verify | JPEG 6장, 원본 PNG 6장; PASS |
| 시각 검수 | 6장 모두 확인; 실제 PDF·주석·곡 순서/이름, 오류/개인정보 없음 |
| 소스 보존 | 격리 checkout의 tracked diff 없음 |
| 자동 테스트 | Ruby 80개 / 263 assertions + Python 21개, 총 101개 PASS |
| 스토어 작업 | 0건; Deployment Test의 기존 이미지는 이번 실행에서 교체하지 않음 |

근거 (`deployment/` 기준):

- `output/clef/screenshots-20261021T074717-805e6979/result.json`: 캡처 결과와 build/기기/원본/파일 hash.
- 같은 디렉터리의 `automatic-verification.json`: 촬영 후 재검증 PASS, 시각 검수 전 업로드 불가.
- 같은 디렉터리의 `review.json`, `visual-verification.json`: 파일별 실제 시각 검수와 검수된 inventory.
- `apps/clef/media/screenshots-20261021T074717-805e6979/`: 실제 촬영 원본과 JPEG.
- `output/ledger.jsonl`: 실패한 개발 실행과 최종 성공 실행을 모두 보존.

실제 캡처 예시:

| 화면 | iPhone | iPad |
| --- | --- | --- |
| 라이브러리 | [보기](apps/clef/media/screenshots-20261021T074717-805e6979/iphone-library.jpg) | [보기](apps/clef/media/screenshots-20261021T074717-805e6979/ipad-library.jpg) |
| PDF·필기 | [보기](apps/clef/media/screenshots-20261021T074717-805e6979/iphone-annotation.jpg) | [보기](apps/clef/media/screenshots-20261021T074717-805e6979/ipad-annotation.jpg) |
| 세트리스트 | [보기](apps/clef/media/screenshots-20261021T074717-805e6979/iphone-setlist.jpg) | [보기](apps/clef/media/screenshots-20261021T074717-805e6979/ipad-setlist.jpg) |

시각 검수는 촬영 내용 검증이다. iPhone의 가로 rail/필기 toolbar는 실제 scroll UI이며 일부만 보인다.
스토어 홍보 구도 선택, 원본 악보/문구 변경, 실기기 기능 QA 및 실제 release source/version의 일치는
해당 출시를 준비할 때 다시 확인한다. GitHub Actions는 실행하지 않았다.

# 작업 채팅과 배포 파이프라인이 공유하는 iOS 메타데이터

사람/작업 에이전트가 편집할 기준 파일은 `apps/<app>/ios-metadata.yaml`이다.
첫 파일은 [Clef & Staff](apps/clef/ios-metadata.yaml), 다른 앱 시작점은 [템플릿](apps/_template/ios-metadata.yaml)이다.
YAML의 문구와 촬영 의도에서 파이프라인용 JSON·locale별 txt·shot plan을 생성한다.
작업 채팅이 generated JSON/txt와 YAML을 이중으로 유지하지 않는다.

## 관리할 정보

| 구역 | 작업 채팅에서 관리할 내용 |
| --- | --- |
| `source` | 제품 소스 경로/커밋/버전/build, 실제 iOS Bundle ID, Dart defines/flavor, 고정 여부 |
| `store` | App Store Connect 앱 ID/Bundle ID/이름/버전, 첫 출시 여부, 테스트 대상 여부 |
| `content` | 언어별 이름·부제·설명·키워드·프로모션·지원/마케팅/개인정보 URL·업데이트 설명·copyright |
| `declarations` | 카테고리, 콘텐츠 권리, 명시적으로 확인한 연령 등급 답변과 검토 여부 |
| `review` | 로그인 필요 여부, 심사자가 따라갈 실제 절차, 기능/권한/샘플 준비와 제한 |
| `testflight` | 기본 설명, 테스트할 내용과 기대 결과, 공개 피드백 이메일, 선택할 build ID |
| `screenshots` | 기기/언어/규격, 화면별 목적·동선·샘플 데이터·필수 표시 내용·제외 내용·자동화 동작 |
| `videos` | App Preview 필요 여부/스토리보드, 별도 심사 데모 영상의 조건과 동선 |
| `manual` | privacy labels, 수출 규정, 라이선스, 접근성, 가격/지역, 계약, trader, 실기기 QA, build 선택 등 확인 근거 |
| `artifacts` | 선택적으로 연결할 실제 캡처 검증 결과. 기본 null; CLI에서 실행별로 전달하는 방법 권장 |
| `secrets` | 외부 API credential/review details 파일을 가리키는 **환경 변수 이름만** |
| `policy` | 심사 제출/출시 false 고정. 메타데이터 파일로 승인 권한을 부여할 수 없음 |

비어 있는 값은 미확인 상태다. 설문 답변/연락처/권리를 자동 추정하지 않는다.
`content.reviewed: false`는 listing 저장을 차단한다. 첫 출시에는 release notes를 보내지 않고,
업데이트에는 실제 변경 사항을 `content.locales.<locale>.release_notes`에 채운다.
Clef의 현재 1.0.2는 이미 공개된 참고 버전이므로 다음 출시는 새 버전/source/build를 확정해야 한다.
지금 파일이 생성된 사실이나 로컬 촬영 성공은 전체 출시 준비 완료를 뜻하지 않는다.

`release.json`은 기존 build/signing/수동 산출물 비교 설정으로 계속 사용한다.
이 YAML은 `ios_release`와 `store_screenshots`의 공통 입력이며, signing baseline을 자동 변경하지 않는다.
실제 출시 때는 binary manifest의 소스/버전도 같은 checkpoint로 맞춘다.

## 어떤 화면을 찍을지 작성하는 방법

Clef는 라이브러리·PDF/필기·세트리스트를 iPhone/iPad 각각 촬영하도록 작성했다.
각 scene에 다음 내용을 함께 둔다.

```yaml
- id: annotation
  purpose: 실제 악보 읽기와 저장된 필기를 보여준다
  route: 라이브러리 → Prelude → 악보 도구 → 필기 모드
  fixture: 직접 만든 PDF 3페이지와 저장된 형광펜/펜 표시
  must_show:
    - 빈 canvas가 아닌 실제 PDF의 오선과 음표
    - 저장된 필기와 실제 제공하는 필기 도구
  exclude:
    - 개인정보와 실제 파일 경로
    - 로딩/오류/권한 팝업, 다른 버전의 화면
  steps:
    - {action: tap, by: text, value: Prelude}
    # 실제로 확인한 UI 동선을 이어서 작성
  assertions:
    - {by: widget_type, value: PdfViewer, present: true}
```

`purpose/route/fixture/must_show/exclude`는 콘텐츠 검수 기준이고 `steps/assertions`는 실행 가능한 UI 동선이다.
다른 사람이 기능 설명만 읽고 어떤 장면을 찍어야 하는지 추측하지 않게 작성한다.
화면 문구/메뉴가 바뀌면 동선과 selector도 함께 바꾼다. 버튼/위젯이 있는지만으로 이미지의 적합성을
모두 판정할 수 없으므로 실제 파일을 열어 검수하는 단계는 유지한다.

소스와 전체 screenshot 계약의 fingerprint가 생성 파일에 포함된다. scene의 필수 표시/제외 조건,
기기/자료/동선/소스가 바뀌면 이전 검수 결과를 그대로 붙일 수 없다. listing 문구만 바뀌었을 때는
촬영 계약이 유지되므로 동일한 검수 결과를 연결할 수 있다.

`videos.review_video.required: true`이면 현재 media 검사에서 심사 첨부 누락을 차단한다.
이 YAML 작성 작업이 영상 촬영/업로드를 자동 구현한 것은 아니다. 재현하기 어려운 하드웨어는
실기기 연속 촬영과 실제 음향/장치 동작 증거를 별도로 준비한다. TestFlight의 일반 필수 영상으로 가정하지 않는다.

## 작업 채팅의 갱신 순서

저장소 루트 [AGENTS.md](../AGENTS.md)에 관련 앱 변경 시 YAML도 갱신하도록 지침을 추가했다.
작업을 맡길 때 다음 문구로 범위를 명확히 할 수 있다.

> 이번 앱 변경에 맞춰 `deployment/apps/clef/ios-metadata.yaml`도 갱신해 주세요.
> 설명·변경 사항·심사/테스트 동선과 캡처할 화면/필수 표시 내용/자동화 selector를 실제 동작에 맞추고,
> 영향받은 검수 상태를 되돌린 뒤 metadata check를 실행해 주세요. 원격 업로드나 심사/출시는 하지 마세요.

1. 제품 코드가 바뀌면 `source.state: pending`, `content.reviewed: false`로 되돌린다.
2. 문구/새 동선/검수 기준을 갱신하고 영향받은 manual 항목을 pending으로 되돌린다.
3. 제품 변경이 커밋된 checkpoint를 확정한 뒤 `source.commit`, version/build를 확인하고 `state: pinned`으로 바꾼다.
4. review flag는 실제 검토한 항목만 바꾼다. API 권한 확인/이미지 검수/실기기 QA를 서로 대신하지 않는다.

metadata 자신을 포함할 미래 커밋의 해시를 추측하지 않는다. 제품 소스 checkpoint와 metadata 입력 snapshot의
해시는 별도로 기록한다. 다른 branch/worktree의 작업 채팅에서도 자동 지침을 적용하려면 이 파일들과
AGENTS.md가 해당 checkout에 반영되어 있어야 한다. 현재 변경을 자동으로 다른 작업 폴더에 전파하지 않는다.

## 출시 후보 사전 점검

앱 source가 pending인 동안에도 로컬 구현 오류와 외부 차단을 분리해서 볼 수 있다. 이 lane은
스토어 쓰기, 서명, 촬영과 제출을 실행하지 않는다.

```sh
bundle exec fastlane release_candidate_preflight \
  manifest:apps/classical-local-library/ios-metadata.yaml \
  artifact:../apps/classical_local_library/build/ios/iphonesimulator/Runner.app \
  feedback:/external/iphone.json,/external/ipad.json \
  review_details:/external/review-contacts.json
```

`pass`, `warning`, `blocked`, `fail`을 구분한다. 구현 실패가 있으면 lane이 실패하며,
`require_ready:true`는 외부 결정이 하나라도 남아 있어도 실패한다. JSON 보고서가 필요하면
`output:/external/preflight.json`을 사용한다. 보고서에는 credential 값, feedback 원본과 로컬
경로를 포함하지 않는다. `review_details:`는 저장소 밖 JSON이어야 하며 `contactFirstName`,
`contactLastName`, `contactPhone`, `contactEmail`만 preflight에서 유효성을 확인하고 값은 출력하지 않는다.

## 로컬 검사와 실행

형식·오타·중복 YAML key·경로·정책·촬영 동선을 검사한다. pending 상태에서도 편집 검사는 가능하다.

```sh
cd deployment
bundle exec fastlane prepare_ios_metadata manifest:apps/clef/ios-metadata.yaml mode:check
```

실행 입력 생성은 pinned 상태에서만 가능하다. 결과에 전체 누락 항목/readiness와 YAML 해시를 기록한다.

```sh
bundle exec fastlane prepare_ios_metadata manifest:apps/clef/ios-metadata.yaml
bundle exec fastlane ios_release manifest:apps/clef/ios-metadata.yaml mode:plan
bundle exec fastlane store_screenshots manifest:apps/clef/ios-metadata.yaml mode:plan
bundle exec fastlane store_screenshots manifest:apps/clef/ios-metadata.yaml mode:capture
```

촬영은 [공통 screenshot pipeline](SCREENSHOTS.md)과 같은 격리 checkout/전용 simulator에서 실행한다.
원본/시각 검수 결과를 만든 후 같은 YAML로 재검증한다.

```sh
bundle exec fastlane store_screenshots manifest:apps/clef/ios-metadata.yaml mode:verify \
  result:output/clef/screenshots-RUN/result.json review:output/clef/screenshots-RUN/review.json
```

검수된 파일을 출시 입력에 연결하려면 실행별 `capture_verification`을 전달한다. path는 `deployment/` 기준이다.

```sh
bundle exec fastlane prepare_ios_metadata manifest:apps/clef/ios-metadata.yaml \
  capture_verification:output/clef/screenshots-RUN/visual-verification.json
bundle exec fastlane ios_release manifest:apps/clef/ios-metadata.yaml mode:plan \
  capture_verification:output/clef/screenshots-RUN/visual-verification.json
```

연결 시 캡처/검수 원본 hash와 현재 파일을 다시 검증하고, 현재 촬영 계약과 일치하는 이미지를
생성 bundle 안에 복사한다. hash/scene 검수 flag를 사람이 YAML에 전사하지 않는다. null/다른 앱/다른 소스/
미검수/변경된 파일은 통과한 자산으로 대체하지 않는다. 파일이 없는 다른 Mac에서는 재촬영 또는
검수된 원본과 결과 파일의 별도 복원이 필요하다.

모든 생성 파일은 ignored `output/<app>/metadata-<run>/`에 snapshot으로 남는다. 생성 파일 대신 원본 YAML을 수정한다.
기존 JSON-only 호출은 호환/과거 검증 재현용으로 유지한다. 새 작업의 기준은 YAML이다.

인증/API 키/연락처/데모 계정은 저장소 밖 JSON에 유지한다. `secrets`에 적힌 환경 변수나 명시적인
기존 `credentials:`/`private_details:` 옵션으로 경로만 전달한다. prepare/plan/capture에는 API 키가 필요 없다.
metadata 저장이 승인된 경우에만 remote mode를 선택한다. 배포 lane의 원격 대상/편집 버전 검사와
심사·출시 차단은 계속 적용된다.

## 2026-10-21 실제 검증

- YAML → release JSON/text/shot plan/capture JSON 생성 및 source 일치 확인.
- YAML을 직접 입력한 Fastlane capture가 iPhone/iPad 6장 촬영에 성공(119초).
- 모든 이미지를 열어 확인하고 YAML 기준 verify를 통과한 뒤 출시 입력으로 6장을 snapshot.
- media blocker 0개를 확인. listing/선언/연락처/수동 준비는 미확인 상태를 유지해 전체 information_complete는 false.
- 실제 캡처: `output/clef/screenshots-20261021T080109-08ab5179/result.json`.
- 연결된 metadata: `output/clef/metadata-20261021T080436-1b9ec9d4/result.json`.
- 이번 작업에서 원격 저장/이미지 교체/빌드 업로드/심사/출시는 실행하지 않음. GitHub Actions는 실행하지 않음.

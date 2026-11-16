# 띠로리 플레이 1.0.0 제출 검토 자료

2026-11-16 기준 **공개 출시 No-Go**다. 공개 개인정보 페이지 게시와 내부 TestFlight 업로드는 승인 범위에서 완료했다. 이어서 사용자가 정확한4개 초안 변경을 승인했고 App Store Connect에 저장·재조회 검증했다. 심사 제출·공개 출시는 아직 승인하지 않았다.

## 실제 후보

| 항목 | 확인값 |
| --- | --- |
| 앱 | 6828809673 / com.mannlab.ddirori.play |
| 제품 commit | 2814dbd30aa5764ec70544772d6fcd418260367f |
| 버전/build | 1.0.0(5) |
| IPA SHA256 | d44f262a017c7060a057b8c93593daef44b0dcfbe637bcb1a03eeaf5cb962c36 |
| Apple build ID | 21fe8804-716b-4e6f-bba0-62ff7ed6b99e |
| 내부 상태 | VALID / IN_BETA_TESTING, 기존 내부 그룹/테스터1명 연결 |
| 바이너리 범위 | APP_STORE_ELIGIBLE; 현재는 내부 그룹에만 배포 |
| 물리 설치/청감 | 미검수. 사용자 iPhone Xs 결과 대기 |

## 공개 입력 제안

정본은 같은 폴더의 `ios-metadata.yaml`이다. 내용과 hash를 동결한 검토본에 승인을 받은 뒤 해당 범위만 적용한다.

후속 코드/실제 빌드 입력 대조에서 빌드5의 MusicBrainz 조회가 비활성인 것을 발견했다. 현재 YAML은 해당 설명1줄과 검색어MusicBrainz를 뺀 **수정 검토안**이며 content.reviewed=false다. 앞서 승인·저장된 원격 문구는 자동으로 변경하지 않았다. `STORE-OPERATOR-CHECKLIST-1.0.0.md`의 근거와 교정 계획을 먼저 확인한다. 제품 소스·IPA·14장 이미지·가격/지역·선택 빌드에는 변경이 없다.

- 이름: 띠로리 플레이 / 부제: 내 음악을 가져오고 바로 재생
- 설명·검색어·프로모션·심사 동선: 현재 실제 보관함/재생목록/재생·작곡가·IMSLP 동작으로 간소화한 YAML 문구.
- 개인정보: https://ddirori.com/play/privacy/ (운영자 만랩·시행일2026-11-16)
- 지원: https://ddirori.com/support/ / 소개: https://ddirori.com/play/
- 원격의 기존 **1.0** 초안을 **1.0.0**으로 변경했다. 새 초안은 생성하지 않았고 PREPARE_FOR_SUBMISSION을 유지한다.
- 주 카테고리 MUSIC을 승인 후 저장·재조회했다. 보조 카테고리는 변경하지 않았다.
- 무료·한국만 배포를 별도 승인 후 저장했다. KOR 기준0원·한국만 활성·신규 국가 자동 추가/예약 주문 꺼짐을 재조회했다. 실제 공개 전 상태다.
- 원격 AFTER_APPROVAL을 승인 후 MANUAL로 바꿨다. 아직 심사에 제출하지 않았으며 추후 승인돼도 실제 공개 명령은 별도 승인 대상이다.
- iPhone/iPad 각7장의 실제 앱 UI를 촬영·검수했고, 사용자 승인 후14장을 준비 중1.0.0에 업로드했다. Apple COMPLETE·체크섬·순서를 재조회했다. widget QA95장을 재사용하지 않았으며 실제 파일 제공자·청감·OS 잠금 화면을 캡처가 증명하지 않는다.

## 운영자 입력 또는 확인이 필요한 항목

코드로 확인한 데이터 흐름, 설문별 판단 근거와 실제 클릭 경로는 [운영자 확인표](STORE-OPERATOR-CHECKLIST-1.0.0.md)에 모았다. 답변이나 계약 수락을 자동으로 확정하지 않는다.

1. **심사 연락처**: contactFirstName, contactLastName, contactPhone, contactEmail. 읽기 전용 API에서 공개 심사·beta 연락처 모두 비어 있음을 확인했다. 앱 관리 URL만으로 해당 값을 알 수 없다. 외부 JSON 또는 App Store Connect에서 직접 입력한다. 채팅·YAML·Git에 비공개 값을 넣지 않는다.
2. **개인정보 라벨**: 앱에 계정/광고/분석 SDK가 없고 자료는 로컬에 저장된다. 사용자가 선택한 외부 검색·페이지와 사이트 GA는 별도다. 이 사실에 근거해 운영자가 Apple 설문을 확인해야 하며 게시된 개인정보 방침을 설문 완료로 보지 않는다.
3. **콘텐츠 권리·연령 설문**: 원격 연령 선언은 미응답이다. IMSLP 링크/외부 페이지와 사용자 음원을 다루는 범위에 맞게 확인한다. 자동 권리 판정이나 모든 파일의 권리를 보증하지 않는다. 확인하지 않은 답변은 생성하지 않는다.
4. **후보 QA**: TestFlight1.0.0(5)의 iPhone Xs Files/청감/잠금/시스템 조작/큰 글자/VoiceOver/재실행. 현재 iPad 지원도 유지되므로 별도 물리 검수는 미확인이다. 없는 액세서리는 미확인으로 둔다.
5. **최종 승인**: 검토한 정확한 Store 문구·화면·카테고리/가격/지역/출시 방식·심사 정보의 쓰기, 이어서 심사 제출, 이후 공개 출시를 각각 승인한다. 내부 배포 승인으로 대체하지 않는다.

사용자 QA는 `docs/quality/classical-local-library-physical-device-checklist.md`의 최신1.0.0 절을 따른다. 번호별 통과/문제/미확인과 OS major만 받아도 되며 개인 곡명·경로·음원을 보내지 않는다. 실제 관찰을 받은 뒤에만 후보 receipt를 만든다.

## 승인과 원격 반영 증거

사용자는4개 변경(기존 버전/수동 출시, 한국어 이름·부제·정책URL, 설명·검색어·프로모션·지원/소개URL, MUSIC)을 명시 승인했다. 승인 payload SHA256은 `df22262e8897300fc79d14c2fe3e92be1843e8a8cf41ec19041d75d97ba4b093`다. [run43812918007](https://github.com/mann-lab-apps/in-c/actions/runs/43812918007)에서 앱·draft·locale 소유 관계와 상태를 확인하고4개 PATCH 각각을 GET으로 대조했다. 설문·비공개 연락처·가격/지역·화면 업로드·심사·출시는 이 실행에 포함하지 않았다.

심사 연락처의 저장소 밖 빈 입력 파일은 `/Users/jaemankim/.local/share/ddirori-play-release/review-details-20261116.json`에 준비했다(0600). 실제 값은 운영자가 입력해야 하며 빈 template를 유효한 연락처로 판정하지 않는다.

공식 근거 확인(2026-11-16): [Apple 내부 그룹 연결](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-builds-_id_-relationships-betagroups), [Fastlane 내부 업로드 옵션](https://docs.fastlane.tools/actions/upload_to_testflight/), [Apple 가격 일정 조회](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-apps-_id_-apppriceschedule). 초기 조회에서는 manualPrices/availability가404였으며, 아래 별도 승인 실행 후 한국 무료 설정을 확인했다.

추가로 사용자는 검수된14장의 업로드만 승인했다. 기존 deployment `IOSRelease`의 media section만 사용했고 [upload run43814776105](https://github.com/mann-lab-apps/in-c/actions/runs/43814776105), [읽기 전용 최종 verify43815321466](https://github.com/mann-lab-apps/in-c/actions/runs/43815321466)가 성공했다. 마지막 iPad 이미지의 일시적 UPLOAD_COMPLETE는 대기 후 COMPLETE로 바뀌었으며 재업로드·삭제·재정렬하지 않았다. 최종14장에 차이가 없고 Store 상태는 여전히 PREPARE_FOR_SUBMISSION/MANUAL이다. 이미지 준비 완료는 사람의 QA나 심사 제출 승인이 아니다.

첫 출시이므로 release_notes/whatsNew는 비워 패키징 차단을 해결했다. 최초 설명은 description/CHANGELOG에 남긴다. 현 후보의 기존 승인 비면제 암호화 불사용 신고는 실제 IPA/Apple 값과 일치해 검증 완료다. 설문·심사 연락처·운영 계약·물리 QA는 남아 있다. 가격/지역·공개 후보 연결・copyright는 다음 별도 승인 범위에서 저장·재조회했다.

## 잔여 네 설정 — 승인 후 저장·재조회 완료

읽기 전용 run43816884187에서 저작권 표기/공개 후보 연결은 비어 있고, 가격 schedule의 기준 지역은 초기 USA지만 manual/automatic 가격은404, availability도404인 상태를 확인했다. 한국의 실제 무료 price point는 `eyJzIjoiNjgyODgwOTY3MyIsInQiOiJLT1IiLCJwIjoiMTAwMDAifQ`이며 customerPrice/proceeds는0이다. 무료·한국만 배포라는 기존 결정을 다시 묻지 않고 아래 정확한 쓰기 범위에 대한 승인을 준비한다.

| 변경안 | 값과 제한 |
| --- | --- |
| copyright | 2026 MannLab |
| 공개 버전의 후보 | 검증된1.0.0(5), Apple build21fe8804-716b-4e6f-bba0-62ff7ed6b99e |
| 가격 | KOR 기준0원, 시작/종료일 없음. 기존 유효 가격 일정이 생겼다면 덮어쓰지 않고 중단 |
| 지역 | KOR만 available=true, 신규 국가 자동 추가=false, 예약 주문=false, 출시일 지정 없음 |

사용자가 ‘이4개 설정 반영 승인’으로 승인한 원본은 `deployment/output/classical-local-library/candidate-build5/remaining-draft-plan.json`, SHA256 `6bb375fce5ccc3a1f7d6754fdd595685462547985c127d7e9c8b21ef53ee7ce1`이다. 계획 파일의 executed=false는 준비 시점의 이력으로 보존하고 실제 실행은 별도 결과에 기록했다.

[최초 실행43818551473](https://github.com/mann-lab-apps/in-c/actions/runs/43818551473)은 copyright·후보·가격3개를 저장했으나, Apple이 나머지174개 지역의 명시 상태를 요구해 지역 요청을409로 거부했다. 이 실행을 성공으로 바꾸지 않는다. [읽기 전용43818862707](https://github.com/mann-lab-apps/in-c/actions/runs/43818862707)에서 저장된3개와175개 지역 목록을 확인했다.

승인 범위는 유지하면서 기술적 요청만 모든 지역 열거로 보완한 `remaining-draft-plan-v2.json`의 SHA256은 `57148a731c7610c9acb301508f002cf42b491e68fabaae02f8460a1a492fe0e3`이다. 원본 승인 해시와 별도로 기록하며 새 바이트 자체를 승인받았다고 주장하지 않는다. 기존3개 요청은 동일하고 KOR=true/나머지174=false·모든 예약 주문=false/출시일=null로 제한했다. [계속 실행43819563157](https://github.com/mann-lab-apps/in-c/actions/runs/43819563157)은 저장된3개를 건너뛰고 지역만 생성한 뒤4개 전체 readBackPassed=true를 확인했다. Store는 PREPARE_FOR_SUBMISSION/MANUAL이며 심사·공개·설문·연락처·새 바이너리 업로드는 실행하지 않았다. 증거와 원본 계획은 `docs/quality/evidence/play-public-release-20261116/remaining-launch-settings/`에 보관한다.

[최종 읽기 전용43819775297](https://github.com/mann-lab-apps/in-c/actions/runs/43819775297)은175개 지역 전부를 조회해 한국1개 활성/174개 비활성·예약 주문0·출시일 지정0을 별도로 검증했다. 진단 ref의 쓰기 helper를 제거하고 HTTP 쓰기를 거부하는 검사로 돌렸다. metadata check와 metadata Ruby13개/40 assertions, 실제 서명 IPA preflight를 통과했다. preflight PASS26/BLOCKED5/FAIL0이며, 운영 설문·연락처/안내 검토·수동 확인·물리 QA는 미완료다.

인앱 구매·구독·App Clips0개와 custom EULA 없음도 같은 읽기에서 확인했다. [Apple 기본 EULA 규칙](https://developer.apple.com/help/app-store-connect/manage-app-information/provide-a-custom-license-agreement)에 따라 해당 manual은 verified로 정리했다. [공식 OpenAPI](https://developer.apple.com/documentation/appstoreconnectapi)의 ZIP SHA256은 `f41ed4489c78bf1488cd2291f23394565364fe37b402130f48c3e3c3f5ea1acd`다. API 경로의 문서 제목은 pre-order를 포함하나 실제 요청은 preOrderEnabled=false/releaseDate=null로 고정하며 예약 주문을 신청하지 않는다.

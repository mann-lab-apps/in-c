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

- 이름: 띠로리 플레이 / 부제: 내 음악을 가져오고 바로 재생
- 설명·검색어·프로모션·심사 동선: 현재 실제 보관함/재생목록/재생·작곡가·IMSLP 동작으로 간소화한 YAML 문구.
- 개인정보: https://ddirori.com/play/privacy/ (운영자 만랩·시행일2026-11-16)
- 지원: https://ddirori.com/support/ / 소개: https://ddirori.com/play/
- 원격의 기존 **1.0** 초안을 **1.0.0**으로 변경했다. 새 초안은 생성하지 않았고 PREPARE_FOR_SUBMISSION을 유지한다.
- 주 카테고리 MUSIC을 승인 후 저장·재조회했다. 보조 카테고리는 변경하지 않았다.
- 무료·한국 우선은 기존 사용자 승인이다. 가격/지역 실제 설정은 별도 확인·반영해야 한다.
- 원격 AFTER_APPROVAL을 승인 후 MANUAL로 바꿨다. 아직 심사에 제출하지 않았으며 추후 승인돼도 실제 공개 명령은 별도 승인 대상이다.
- iPhone/iPad 각7장의 실제 앱 UI를 촬영·검수했고, 사용자 승인 후14장을 준비 중1.0.0에 업로드했다. Apple COMPLETE·체크섬·순서를 재조회했다. widget QA95장을 재사용하지 않았으며 실제 파일 제공자·청감·OS 잠금 화면을 캡처가 증명하지 않는다.

## 운영자 입력 또는 확인이 필요한 항목

1. **심사 연락처**: contactFirstName, contactLastName, contactPhone, contactEmail. 읽기 전용 API에서 공개 심사·beta 연락처 모두 비어 있음을 확인했다. 앱 관리 URL만으로 해당 값을 알 수 없다. 외부 JSON 또는 App Store Connect에서 직접 입력한다. 채팅·YAML·Git에 비공개 값을 넣지 않는다.
2. **개인정보 라벨**: 앱에 계정/광고/분석 SDK가 없고 자료는 로컬에 저장된다. 사용자가 선택한 외부 검색·페이지와 사이트 GA는 별도다. 이 사실에 근거해 운영자가 Apple 설문을 확인해야 하며 게시된 개인정보 방침을 설문 완료로 보지 않는다.
3. **콘텐츠 권리·연령 설문**: 원격 연령 선언은 미응답이다. IMSLP 링크/외부 페이지와 사용자 음원을 다루는 범위에 맞게 확인한다. 자동 권리 판정이나 모든 파일의 권리를 보증하지 않는다. 확인하지 않은 답변은 생성하지 않는다.
4. **후보 QA**: TestFlight1.0.0(5)의 iPhone Xs Files/청감/잠금/시스템 조작/큰 글자/VoiceOver/재실행. 현재 iPad 지원도 유지되므로 별도 물리 검수는 미확인이다. 없는 액세서리는 미확인으로 둔다.
5. **최종 승인**: 검토한 정확한 Store 문구·화면·카테고리/가격/지역/출시 방식·심사 정보의 쓰기, 이어서 심사 제출, 이후 공개 출시를 각각 승인한다. 내부 배포 승인으로 대체하지 않는다.

사용자 QA는 `docs/quality/classical-local-library-physical-device-checklist.md`의 최신1.0.0 절을 따른다. 번호별 통과/문제/미확인과 OS major만 받아도 되며 개인 곡명·경로·음원을 보내지 않는다. 실제 관찰을 받은 뒤에만 후보 receipt를 만든다.

## 승인과 원격 반영 증거

사용자는4개 변경(기존 버전/수동 출시, 한국어 이름·부제·정책URL, 설명·검색어·프로모션·지원/소개URL, MUSIC)을 명시 승인했다. 승인 payload SHA256은 `df22262e8897300fc79d14c2fe3e92be1843e8a8cf41ec19041d75d97ba4b093`다. [run43812918007](https://github.com/mann-lab-apps/in-c/actions/runs/43812918007)에서 앱·draft·locale 소유 관계와 상태를 확인하고4개 PATCH 각각을 GET으로 대조했다. 설문·비공개 연락처·가격/지역·화면 업로드·심사·출시는 이 실행에 포함하지 않았다.

심사 연락처의 저장소 밖 빈 입력 파일은 `/Users/jaemankim/.local/share/ddirori-play-release/review-details-20261116.json`에 준비했다(0600). 실제 값은 운영자가 입력해야 하며 빈 template를 유효한 연락처로 판정하지 않는다.

공식 근거 확인(2026-11-16): [Apple 내부 그룹 연결](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-builds-_id_-relationships-betagroups), [Fastlane 내부 업로드 옵션](https://docs.fastlane.tools/actions/upload_to_testflight/), [Apple 가격 일정 조회](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-apps-_id_-apppriceschedule). 가격 일정 리소스는 조회되지만 manualPrices가404였고 availability도 확인되지 않았다. 실제 무료/한국 설정 완료로 표현하지 않는다.

추가로 사용자는 검수된14장의 업로드만 승인했다. 기존 deployment `IOSRelease`의 media section만 사용했고 [upload run43814776105](https://github.com/mann-lab-apps/in-c/actions/runs/43814776105), [읽기 전용 최종 verify43815321466](https://github.com/mann-lab-apps/in-c/actions/runs/43815321466)가 성공했다. 마지막 iPad 이미지의 일시적 UPLOAD_COMPLETE는 대기 후 COMPLETE로 바뀌었으며 재업로드·삭제·재정렬하지 않았다. 최종14장에 차이가 없고 Store 상태는 여전히 PREPARE_FOR_SUBMISSION/MANUAL이다. 이미지 준비 완료는 사람의 QA나 심사 제출 승인이 아니다.

첫 출시이므로 release_notes/whatsNew는 비워 패키징 차단을 해결했다. 최초 설명은 description/CHANGELOG에 남긴다. 현 후보의 기존 승인 비면제 암호화 불사용 신고는 실제 IPA/Apple 값과 일치해 검증 완료다. 나머지 설문·심사 연락처·가격/지역 실제 설정·운영 계약·공개 후보 연결과 물리 QA는 남아 있다. copyright는 로컬 초안2026 MannLab이며4개 승인 payload에 포함하지 않아 원격 저장 완료로 주장하지 않는다.

# Play 1.0.0(5) 운영자 확인표

확인일2026-11-16. 제품2814dbd30aa5764ec70544772d6fcd418260367f와 실제 서명 후보1.0.0(5)를 기준으로 한다. 아직 공개 출시 No-Go다. 이 문서는 설문 대필·수락·심사 제출 승인이 아니며 원격 설문을 변경하지 않는다.

## 먼저 바로잡을 출시 문구

`main.dart`는 MUSICBRAINZ_CONTACT가 없으면 MusicBrainz client를 만들지 않는다. 실제 archive의 release-manifest와 해당 hash로 연결된 result는 이 설정을 포함하지 않으며 제품에는 다른 기본 client 주입이 없다. 따라서 빌드5에서 MusicBrainz 조회를 시도하면 설정 필요 안내가 나오고 조회하지 않는다. 조회 구현·fixture 테스트가 있다는 사실과 제품 후보에서 활성이라는 사실을 구분한다.

현재 한국어 설명의 ‘MusicBrainz 후보를 확인하고 선택한 정보만 반영’1줄과 검색어MusicBrainz를 제거하는 수정안을 YAML에 준비했다. 기존 저장된 문구는 승인 없이 바꾸지 않았다. 같은 빌드5를 유지하며 이 두 필드만 교정할 수 있다. 향후 조회 활성화는 공식 서비스 사용 조건·공개 연락처 빌드 설정·새 후보 검증을 따로 진행한다. 개인정보 페이지의 외부 서비스 일반 안내는 기능 활성 보증이 아니며 이번에 게시물을 변경하지 않는다.

정확한 변경은 `deployment/output/classical-local-library/candidate-build5/copy-correction-plan.json`이며 SHA256은 `82aab8ead247d274a42d9f0f0aa9db365fb39ef7259b462d81e5a74852732fd2`다. description/keywords 두 필드만 PATCH하며 원격의 기존 값·소유 관계·PREPARE_FOR_SUBMISSION/MANUAL·선택build5를 먼저 검사한다. 공식 OpenAPI request schema와 필드/길이를 대조했다. 새 원격 쓰기는 이 교정안에 대한 승인 후에만 실행한다.

## 개인정보: 코드와 빌드가 증명하는 범위

| 흐름 | 현재 확인한 사실 | 운영자가 확인할 부분 |
| --- | --- | --- |
| 원본 음원·태그·감상 기록·메타데이터 | 기기에서 처리·저장. 로컬 곡 재생 자체에는 업로드가 없음 | 기기 내 데이터와 외부 전송을 분리해 답변 |
| 논리 백업·비식별 QA 보고서 | 사용자가 내보내기/공유를 선택. 보고서 자동 전송 없음. 백업은 음원/원래 경로를 제외하나 카탈로그·감상 정보는 포함 | 사용자가 선택한 공유 대상 및 수신 후 보관 정책; 이메일로 받은 응답의 실제 처리 |
| IMSLP 검색 | imslp.org/api.php에 검색 텍스트를 GET. IP·통신 정보가 서버에 전달될 수 있음. 원본 음원/전체 로컬 경로를 요청에 넣지 않음 | 검색어/요청 로그의 서비스 보관과 Apple의 수집·목적·연결 분류 |
| IMSLP 파일 요청 | 사용자가 확인한 공식 주소/권리 정보로 HTTP 다운로드. 파일을 서버에 업로드하지 않음 | 해당 외부 서비스 처리/보관 범위; 다운로드를 수집 없음의 근거로 단정하지 않음 |
| IMSLP 공식 페이지 | iOS url_launcher_ios6.4.2의 기본 HTTP(S)는 SFSafariViewController. 앱의 ‘외부 페이지’ 문구만으로 Safari 앱 전환이라고 볼 수 없음 | 실제 페이지 이동 범위와 웹 트래픽을 개인정보/연령 설문에서 검토 |
| MusicBrainz | 빌드5는 연락처 설정이 없어 조회 비활성. 구현을 활성화하는 후속 후보에서는 검색어/ID/공용 User-Agent가 전송됨 | 후보를 바꿀 때 재검토. MetaBrainz는 API 요청 IP·UA·파라미터 로그를 보관한다고 안내 |
| AcoustID | 현재 fingerprint service unavailable, 자동 지문 전송 없음 | 후속 활성화 시 새 검토 |
| 지원/개인정보 링크 | externalApplication으로 웹 열기. 운영 웹에는 기존 GA 설정이 있고 앱에는 분석 SDK 없음 | 앱과 웹의 처리 구분. ‘SDK 없음’만으로 개인정보 설문 전체를 수집 없음으로 확정하지 않음 |

[Apple 개인정보 기준](https://developer.apple.com/app-store/app-privacy-details/)은 기기 내 처리와 기기 밖 보관을 구분하며, 웹 트래픽과 선택적 전송에도 별도 조건을 둔다. 공개 개인정보 페이지가 있다는 사실로 라벨 완료를 대신하지 않는다. [MetaBrainz 정책](https://metabrainz.org/privacy)은 API 로그의 IP·User-Agent·요청 파라미터를 설명한다. 외부 API 운영자의 실제 보관 사실을 근거 없이 실시간 폐기로 바꾸지 않는다.

App Store Connect → 해당 앱 → 개인정보에서 실제 답변과 게시 상태를 확인한다. 개인정보/연락처/콘텐츠 권리는 별개 항목이다. 라벨의 데이터 유형·목적·사용자 연결·추적 여부에 대한 운영자 답변은 아직 없다.

읽기 전용 [43821097782](https://github.com/mann-lab-apps/in-c/actions/runs/43821097782)에서 공개·beta 연락처 네 값이 모두 비어 있고, 콘텐츠 권리와 연령 설문의 실질 답변이 null인 것을 재확인했다. 이전 조회 시점의 null을 현재 상태로 재사용하지 않았다. 기본 override NONE은 설문 답변 완료가 아니다.

## 콘텐츠 권리·연령

| 항목 | 근거와 아직 필요한 판단 |
| --- | --- |
| 콘텐츠 권리 | 로컬 파일 권리 확인과 IMSLP 공식 페이지/검색을 제공한다. 앱이 모든 음원의 권리를 보증하지 않는다. Apple의 제3자 콘텐츠 접근/표시 범위에 맞는 신고는 운영자가 확정 |
| 사용자 생성 콘텐츠 | 계정·게시·공개 배포 커뮤니티가 없다. 개인 로컬 파일/백업을 다룬다는 사실만으로 광범위 사용자 게시 기능을 선언하지 않음 |
| 자유 웹 접근 | IMSLP는 SFSafariViewController를 사용한다. 허용된 최초 URL과 실제 후속 탐색 범위가 다를 수 있어 자동false 금지. 해당 후보의 실제 UI를 검토한 뒤 결정 |
| 광고·채팅·도박·의료 등 | 해당 제품 기능은 현재 소스에서 제공하지 않는다. 외부 페이지로 접근 가능한 내용/기능도 운영자 설문 범위에 따라 별도 판단 |
| 최종 등급 | Apple 설문이 산정한다. 4+ 등급이나 모든 항목false를 미리 만들지 않음 |

앱 정보 → 콘텐츠 권리/연령 등급에서 확인한다. [Apple 콘텐츠 권리 설명](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/), [연령 정의](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions)를 기준으로 한다. API의 기존 null 답변을 완료로 바꾸지 않는다.

## 한국 무료 앱의 계약·DSA

무료·IAP/구독0개는 실제 조회로 확인했다. [Apple 계약 안내](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements)에 따르면 무료 배포는 Developer Program License Agreement, 유료/IAP는 Paid Apps Agreement의 대상이다. 이번 무료 앱을 위해 유료 정산용 은행/세금 정보를 새로 요구하지 않는다. Business → Agreements에서 최신 무료 배포 계약의 유효/추가 수락 필요 상태는 계정 보유자가 확인해야 한다. 수락은 대신 실행하지 않는다.

[Apple DSA 안내](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)는 EU에서 배포하지 않아도 상태 신고가 필요하다고 명시한다. 한국만 활성이라는 API 결과는 EU 배포 제외의 증거이며 계정의 신고 완료 증거는 아니다. Business → Agreements → Compliance와 앱 정보 → App Store Regulations and Permits에서 실제 신고 상태를 확인한다. 다른 앱을 포함한 계정의 사업자 지위를 이 앱의 무료/한국 설정만으로 추정하지 않는다. 이 때문에 YAML trader_status는 pending을 유지한다.

## 연락처와 사용자 QA

공개·TestFlight 연락처의 이름/성/전화/이메일 네 값은 아직 없다. 공개 지원 이메일을 나머지 개인정보로 추정하지 않는다. 저장소 밖 `/Users/jaemankim/.local/share/ddirori-play-release/review-details-20261116.json`에 입력하거나 운영자 콘솔에서 직접 저장한다. 값 대신 입력 완료 여부만 공유해도 읽기 검증할 수 있다.

물리 확인은 [사용자 점검표](../../../docs/quality/classical-local-library-physical-device-checklist.md)의1.0.0(5) 동선을 따른다. iPhone Xs 설치·Files 취소/가져오기·청감/seek/이동·잠금30초·시스템 조작·중단/경로 분리·VoiceOver/큰 글자·재실행을 통과/문제/미확인으로 답한다. 실제 iOS 버전과 후보 버전/build를 함께 확인한다. iPad 지원을 유지하므로 해당 물리 검수도 미확인이다. 개인 음원·파일명·경로·기기 고유 식별자는 받지 않는다.

운영 답변과 실제 관찰을 받은 뒤에만 해당 manual/receipt를 갱신한다. 남은 입력이 채워져도 심사 제출과 실제 수동 출시는 별도 승인 단계다.

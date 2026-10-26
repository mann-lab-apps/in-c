# 띠로리 플레이 출시 준비 현황 — 2026-10-26

## 체크포인트와 범위

- 제품 소스 체크포인트: `48c90b07eaf793075b1680826e13bb460cd37972` (아이콘 승인·지원 사이트 문서 갱신, 앱 실행 코드는 기존 `4c0b9a886e48e5fecf445b5322dbc7dc2364fd4d`와 동일).
- 분리 브랜치: `feature/ddirori-play-library-release-prep-20261026`. 기존 작업 브랜치의 미푸시 Score 커밋과 미커밋 타 앱 변경은 포함하지 않았다.
- 앱: `0.1.0+1`, SQLite schema v15. `source.state: pinned`는 이 제품 소스만 가리킨다. 스토어 문구는 `content.reviewed: false`이며 제출 승인으로 해석하지 않는다.
- iOS/Android 런처에 적용된 Play 아이콘 후보 08은 2026-10-26 사용자가 최종 승인했다. 실제 기기 마스크와 스토어 자산 검수는 남아 있다.

## 이번 소스에서 확인한 증거

| 검사 | 결과 | 범위 |
| --- | --- | --- |
| `flutter test` | 400개 통과 | 앱 단위·위젯 회귀, 가짜 재생 컨트롤러 포함 |
| `flutter test` in `packages/ddirori_ui` | 40개 통과 | 공통 UI 회귀 |
| `flutter analyze --no-pub` | 문제 없음 | Play 앱 정적 분석 |
| `dart run tool/generate_audio_fixtures.dart --check` | 통과 | 합성 오디오 fixture 무결성 |
| `flutter build ios --release --no-codesign` | 통과, Runner.app 21.4 MB | 서명 없는 기기용 Release 바이너리 |
| `local_file_library_flow_integration_test.dart` | 1개 통과 | iOS 26.5 시뮬레이터, 합성 WAV 가져오기→곡 표시→실제 엔진 재생→작품 정리 |
| `prepare_ios_metadata ... mode:check` | 통과 | YAML 형식·장면 계약, 제품 소스 고정 |
| `release_candidate_preflight` with unsigned Runner.app | PASS 19, BLOCKED 11, FAIL 0 | 승인된 아이콘 근거 반영 후 재실행. 내부 베타 가능, TestFlight·App Store 준비되지 않음 |

시뮬레이터 테스트의 파일 선택은 fixture picker이며 실제 Files/iCloud 제공자 UI가 아니다. 재생 상태가 `playing`인 것은 물리 출력·청감 증거가 아니다. 현재 브랜치에서 서명, archive 검증, 스토어 이미지 촬영·검수, 원격 업로드·제출은 실행하지 않았다.
이 브랜치는 Play 화면이 사용하는 공통 블루 색상 토큰과 안내 배너 색 변경도 포함한다.
공통 UI 패키지 테스트는 통과했으나 다른 앱의 전체 회귀는 실행하지 않았으므로 병합 전 디자인 시스템 작업과 충돌 여부를 확인해야 한다.

## 차단 항목과 다음 행동

| 소유 | 필요한 결정·증거 |
| --- | --- |
| 운영·디자인 | 한국어 스토어 설명과 개인정보 처리방침 내용의 운영 검토, ddirori.mannlab.app DNS·HTTPS 활성화 후 공개 지원·개인정보 URL 확인, 아이콘의 실제 기기·스토어 자산 검수 |
| 운영·App Store Connect | 앱 ID, 콘텐츠 권리·연령 등급·개인정보·수출·가격·지역·계약·세금·trader 등 수동 선언, TestFlight 피드백 이메일과 build 선택, 외부 파일의 운영 연락처 |
| 서명 | Apple Developer 권한, 배포 인증서·profile, signed archive와 upload validation 확인 |
| 캡처 | 최종 디자인과 공개 문구가 확정된 동일 소스에서 iPhone/iPad 장면 촬영 후 이미지 원본을 열어 시각 검수하고 pipeline 검증 결과를 연결 |
| 물리 QA | 사용자가 iPhone XS에서 실제 iOS 버전과 앱 설치, VoiceOver, Files/iCloud, MP3/FLAC/M4A 청감, 스피커·유선·Bluetooth·interruption, 재생목록 재정렬·재기동 보존과 P0/P1 피드백을 확인. iPhone XS는 iOS 26 비지원이므로 기존 iOS 26.5 시뮬레이터 검증과 다르다. iPad 물리 검수는 별도 미완료 |

읽기 전용 확인에서 로컬 키체인에는 Apple Distribution identity가 있지만,
설치된 provisioning profile 11개 중 현재 Play bundle ID와 일치하는 항목은 없었다.
따라서 signed archive나 업로드 가능 상태로 판정하지 않는다.
기존 `in-c.mannlab.app`의 Play 전용 URL은 없었다. 2026-10-26 별도 Sites 프로젝트에
띠로리 플레이 랜딩·개인정보·지원 페이지를 게시하고 공개 기본 주소의 각 페이지가
HTTP 200을 반환함을 확인했다.

- 공개 임시 주소: `https://ddirori-play-mannlab.daga4242.chatgpt.site/`
- 개인정보: 위 주소의 `/privacy.html`
- 지원: 위 주소의 `/support.html` · 공개 지원 이메일 `daga4242@gmail.com`
- 요청 도메인: `ddirori.mannlab.app` (DNS·인증서 검증 대기). Route 53의 `mannlab.app` zone에서 CNAME `ddirori` → `custom-domains.chatgpt.site.`와 TXT `_openai-site-verification.ddirori` → `openai-site-verification=PQxeINTJmkHtvzOtKO7Qxhyo3YXhguWtILbxUw_4vDg`, TXT `_cf-custom-hostname.ddirori` → `fa58098f-6936-416f-b703-c2a87ddac6d3`를 등록해야 한다.

현재 공개된 기본 주소와 요청 도메인을 구분한다. `ios-metadata.yaml`의
`marketing_url`·`support_url`·`privacy_url`은 요청 도메인이 실제 HTTPS로 열리고
내용을 확인하기 전까지 비워 둔다. 운영자는 개인정보 문구와 App Store 개인정보
설문이 실제 처리 방식에 맞는지 검토해야 한다.

현재의 11개 BLOCKED는 위 항목의 중복 집계가 아니라 preflight의 개별 게이트다. 확인되지 않은 항목을 통과로 전환하지 않는다. 실기기 검수 절차는 [물리 기기 체크리스트](classical-local-library-physical-device-checklist.md)에 있다.

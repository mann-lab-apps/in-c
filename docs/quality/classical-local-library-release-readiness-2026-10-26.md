# 띠로리 플레이 출시 준비 현황 — 2026-10-26

## 체크포인트와 범위

- 제품 소스 체크포인트: `4c0b9a886e48e5fecf445b5322dbc7dc2364fd4d`.
- 분리 브랜치: `feature/ddirori-play-library-release-prep-20261026`. 기존 작업 브랜치의 미푸시 Score 커밋과 미커밋 타 앱 변경은 포함하지 않았다.
- 앱: `0.1.0+1`, SQLite schema v15. `source.state: pinned`는 이 제품 소스만 가리킨다. 스토어 문구는 `content.reviewed: false`이며 제출 승인으로 해석하지 않는다.
- 개발용 Play 아이콘 후보는 iOS/Android 런처에 적용됐지만 최종 디자인 승인은 없다.

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
| `release_candidate_preflight` with unsigned Runner.app | PASS 18, BLOCKED 12, FAIL 0 | 내부 베타 가능, TestFlight·App Store 준비되지 않음 |

시뮬레이터 테스트의 파일 선택은 fixture picker이며 실제 Files/iCloud 제공자 UI가 아니다. 재생 상태가 `playing`인 것은 물리 출력·청감 증거가 아니다. 현재 브랜치에서 서명, archive 검증, 스토어 이미지 촬영·검수, 원격 업로드·제출은 실행하지 않았다.

## 차단 항목과 다음 행동

| 소유 | 필요한 결정·증거 |
| --- | --- |
| 운영·디자인 | 현재 후보 아이콘의 최종 승인, 한국어 스토어 설명 검수, 공개 HTTPS 개인정보·지원 URL과 실제 페이지 내용 확인 |
| 운영·App Store Connect | 앱 ID, 콘텐츠 권리·연령 등급·개인정보·수출·가격·지역·계약·세금·trader 등 수동 선언, TestFlight 피드백 이메일과 build 선택, 외부 파일의 운영 연락처 |
| 서명 | Apple Developer 권한, 배포 인증서·profile, signed archive와 upload validation 확인 |
| 캡처 | 최종 디자인과 공개 문구가 확정된 동일 소스에서 iPhone/iPad 장면 촬영 후 이미지 원본을 열어 시각 검수하고 pipeline 검증 결과를 연결 |
| 물리 QA | iPhone/iPad의 VoiceOver, Files/iCloud, 실제 MP3/FLAC/M4A 청감, 스피커·유선·Bluetooth·interruption, 재생목록 재정렬·재기동 보존과 P0/P1 피드백 |

현재의 12개 BLOCKED는 위 항목의 중복 집계가 아니라 preflight의 개별 게이트다. 확인되지 않은 항목을 통과로 전환하지 않는다. 실기기 검수 절차는 [물리 기기 체크리스트](classical-local-library-physical-device-checklist.md)에 있다.

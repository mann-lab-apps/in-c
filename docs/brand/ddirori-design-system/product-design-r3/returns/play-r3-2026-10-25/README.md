# Play R3 반환 · 2026-10-25

상태: 제품 구현·자동 검증 완료, 사람/물리 기기 검수와 출시 촬영 대기. 커밋·푸시 없음. 작업 중 HEAD가 `02a4b3d3`에서 `bcdcc40f`로 이동했으며 Score/디자인 및 기존 R2 미커밋 변경은 보존했다. Play R3 제품 수정도 현재 미커밋이다. 사용한 [R3 revision.json](../../revision.json)의 SHA-256은 `a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36`이다.

| 현재 소스/설정 | SHA-256 |
| --- | --- |
| `lib/main.dart` | `cd6ff38867987bd5ab7031c523013c09636780a09a874bb8acb2eb96af87d23b` |
| `lib/catalog_registration_screen.dart` | `e168ce205496fd1598995f6fb4eb4139f76fea14886200628dff8cfdf632d0ce` |
| `lib/library_management.dart` | `212827392e3d5a305e9a8e504c04c8ad56a8617cd337e3021a1e9c05bc20e098` |
| `lib/local_import_feedback.dart` | `96a6cef0f70bf41ee700371aae506b4c1dc179ee238ddfd33c48681ef69e7938` |
| `lib/presentation/local_file_library_components.dart` | `8b739603f24dbfffa46203168e155645d016739c00da13dc808c353bac980354` |
| `integration_test/local_file_library_flow_integration_test.dart` | `60e631cbb1fc6dd7ca59b085f80d690199092c09ee5e2fd6a16e77f320f2fb17` |
| `deployment/apps/classical-local-library/ios-metadata.yaml` | `6d7f2010d795fbd5679b915bc5622be708380f320f22ef528e7c740836919d26` |

## 적용과 경로

| 범위 | 이전 | R3 적용 | 보존 |
| --- | --- | --- | --- |
| P01 가져오기 | 보관함/관리에서 파일 가져오기 후 합계만 표시 | 파일별 가져옴·중복·분석 대기·실패·취소, 실패 선택만 재시도, 분석 재시도와 수동 정리 진입 | 완료 파일·원본, 등록 전 곡 직접 재생 |
| P01 등록 | 정리 폼에서 초안을 닫은 다음 저장 | 기존 전체 폼에서 저장 완료 후 닫기, 실패 초안 보존, 후속 실패는 같은 초안 재시도 또는 저장 사실 확인 후 재조회 | 기존 작품/녹음 선택, Work/Recording/Movement ID와 링크 |
| P01 첫 재생 | 등록과 재생 상태가 분리 | 신규 보관함의 등록된 녹음이 실제 엔진 `playing`을 보고한 뒤에만 성취 안내 | 큐/위치/seek, 기존 사용자와 선택적 직접 파일 재생 |
| J02 연결 | 관리 사본을 OS 공유로 내보내기 | 완료·존재하는 관리 사본의 지원 형식 공유 성공 후 Files 보관→Score 악보 선택→연결 파일 추가 안내 | 별도 사본 수명, Score 저장 미확인, 직접 전송 없음 |

제품은 기존 `ddirori_ui`의 Banner/Item/Button과 Play adapter를 조합했다. 공통 패키지 API, SQLite schema, 오디오 엔진, 런처/대표색, 다른 앱 소스는 변경하지 않았다. 메모리 저장소 경로의 후속 링크 작업과 SQLite 등록 트랜잭션을 구분하고, 등록 결과를 다시 사용할 때 다른 입력을 성공으로 처리하지 않게 했다. 등록 전 취소는 파일을 남기고, 등록 뒤 후속 오류 시 닫기는 저장 사실을 확인시킨 뒤 보관함을 재조회한다.

## 실제 화면 캡처

아래 PNG는 실제 Play Flutter 위젯을 테스트 렌더러에서 촬영했다. `FakeLocalPlayer`와 주입한 가져오기 결과를 사용한 화면 증거이며 native picker·가청 출력·App Store 제출 캡처가 아니다. DPR 1, Pretendard 및 Material Icons 명시 로드. 촬영한 파일을 열어 한글·아이콘·잘림을 확인했다.

| 상태 | 조건·fixture | 파일 |
| --- | --- | --- |
| 첫 빈 보관함 | 390×900, light, 글자100% | [empty](screens/empty-390-light.png) |
| 가져오기 성공 결과 | `01.flac`, 390×900, light, 글자100% | [imported](screens/imported-390-light.png) |
| 등록 전체 폼 | 같은 파일, 필수 입력 전, 390×900 | [registration](screens/registration-390-light.png) |
| 등록 성공·재생 전 | 같은 파일, 엔진 아직 playing 아님 | [registered](screens/registered-390-light.png) |
| 첫 재생 성취 | 같은 녹음의 fake 엔진 playing | [first-playing](screens/first-playing-390-light.png) |
| 큰 글자/어두운 화면 | 320×900, dark, 글자200% | [imported 320](screens/imported-320-dark-200.png) |
| 넓은 화면 | 1024×900, light, 글자200% | [imported 1024](screens/imported-1024-light-200.png) |

캡처 재현: `DDIRORI_R3_CAPTURE_OUTPUT=<screens 절대경로> DDIRORI_BRAND_FONT=/tmp/ddirori-brand-tools/Pretendard.ttf DDIRORI_MATERIAL_FONT=/opt/homebrew/share/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf flutter test test/local_file_player_home_test.dart`. 글꼴 경로는 로컬 테스트 자산이며 앱 의존성이나 출시 자산을 새로 고정하지 않는다. Score 안내와 부분 실패 화면은 widget assertion으로 검증했지만 PNG는 촬영하지 않았다.

## 검사와 증거 경계

| 실행 | 결과 |
| --- | --- |
| `dart format lib test integration_test` | 통과 |
| `flutter test` | **383개 통과** |
| `flutter analyze` | 오류 없음 |
| `dart run tool/generate_audio_fixtures.dart --check` | 통과 |
| iPhone 17 Pro / iOS 26.5 Simulator `local_file_library_flow_integration_test.dart` | 합성 WAV 관리 복사·곡 직접 재생·작품/녹음 등록·실제 `just_audio` 재생과 첫 재생 상태 통과 |
| 같은 simulator `local_audio_import_integration_test.dart` | 복사·checksum·인덱싱·재생·복원 통과 |
| `bundle exec fastlane prepare_ios_metadata manifest:apps/classical-local-library/ios-metadata.yaml mode:check` | `source pending`으로 통과 |
| `git diff --check` | 통과 |

단위/widget 검증은 파일별 결과·부분 성공·실패 선택만 재시도·분석 대기 수동 정리·picker 취소·등록 취소·저장 실패 초안 유지·등록 뒤 링크 실패의 중복 방지와 확인 닫기·엔진 playing 전후·Score 안내의 공유 성공/취소를 포함한다. 실제 Score 수신/저장, Files/iCloud chooser, 코덱별 실기기 출력, Bluetooth/유선·중단, VoiceOver 낭독·focus, 물리 기기 청감은 **미검증**이다. 시뮬레이터 디코더/상태 검사를 물리 청감 증거로 승격하지 않는다.

`revision.py`는 **불일치(exit 1)**. R3 원본 manifest의 `designSources` 자체는 수정하지 않았다. 현재 제품 적용으로 Play README/등록/관리/main 해시가 달라졌고, 기준 HEAD 이후 Score 파일, R3 README와 동시 작업 중인 Studio 소스도 달라졌다. 역사적 manifest를 재생성하지 않았다. 출시 YAML은 `source.state: pending`, `content.reviewed: false`이며 커밋 pin, 실제 스토어 촬영, 외부 게시/서명/업로드는 하지 않았다.

## 미결과 제안

- 실기기에서 5분 동선: Files/iCloud 음원 1개 가져오기→작품 정리→첫 재생 청취, 공유 사본을 파일 앱에 저장→Score에서 악보 선택→연결 파일 추가·재생 확인. 사용자 파일명/경로를 피드백에 보내지 않는다.
- 지원 형식과 OS 공유 결과는 source 경계까지만 확인했다. Score의 연결 파일 저장 실패/중복, 앱 간 오디오 세션과 사본 삭제 독립성은 Score/실기기 검수가 필요하다.
- 공통 API 추가 필요는 확인되지 않았다. 두 실제 소비처에서 같은 수동 안내 한계가 드러나기 전까지 ServiceLink를 확장하거나 직접 앱 연결을 도입하지 않는다.

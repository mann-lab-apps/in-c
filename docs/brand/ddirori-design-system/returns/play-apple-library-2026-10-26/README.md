# Play 보관함 UX 반환 · 2026-10-26

후속 수정: 보관함 제목 위의 앱 아이콘·`띠로리 플레이` 문구를 제거했다. 이후 공통 블루 기본값을 반영해 [현재 iOS 26.5 시뮬레이터 화면](screens/play-ios26-5-simulator-blue.png)에서 가져오기 버튼의 `#1971C2`를 캡처 픽셀로 확인했다. Play 위젯 테스트는 light/dark 행동·선택·안내색을 확인하며 전체 390개가 통과했다. 런처 아이콘은 유지한다. 아래의 기존 화면 캡처와 소스 해시는 이 수정 전 반환 시점의 기록이다.

Apple Music iPhone 보관함의 정보 구조와 조작을 참고해 현재 Play 앱에 적용했다. 화면은 Apple의 시각 자산을 사용하지 않고 현행 띠로리 공통 테마와 Play 전용 컴포넌트를 사용한다. 기준은 현재 [서비스 테마 계약](../../service-theme-contract.md)과 [Play 명세](../../specifications/services/play.md)이며 R1~R3 시안은 이력으로만 확인했다.

## UX 대응표

| Apple Music iPhone에서 확인한 흐름 | 판단 | Play 적용/차이 |
| --- | --- | --- |
| 보관함 첫 화면의 분류와 최근 추가 항목 | 채택 | 큰 보관함 제목, 구분선이 있는 곡·앨범·아티스트·폴더 목록, 최근 추가 앨범·곡 카드. 파일 가져오기는 상단 행동과 빈 상태에 배치. |
| 앨범·아티스트를 열어 곡 선택 | 채택 | 앨범은 디스크·트랙 순서를 기본으로 하고 아티스트/폴더는 이름으로 묶음. 곡은 등록 없이 직접 재생. |
| 보관함과 분류 안 검색 | 로컬 앱에 맞게 변형 | 상단 검색은 로컬 파일과 기존 클래식 작품/녹음, 분류 안 검색은 해당 목록의 곡·그룹만 대상으로 함. 파일명 fallback. |
| 정렬 | 로컬 앱에 맞게 변형 | 제목·아티스트·앨범·추가한 날짜·트랙 순서. 앱 가져오기 시각을 우선 사용하고 스캔 파일은 마지막 발견/수정 시각으로 대체. 동률은 제목과 파일 ID로 고정. |
| 분류 표시·순서 편집 | 보류 | 곡·앨범·아티스트·폴더 네 분류를 모두 유지. 별도 사용자 선호 저장이 필요한 편집 UI는 이번에 만들지 않음. |
| 미니플레이어에서 재생/다음, 전체 재생과 대기열 | 채택 | 기존 실제 엔진 스냅샷과 큐를 사용. 큐가 있을 때만 축약 조작 표시. 검색·정렬만으로 큐/위치 불변. |
| 대기열 편집·플레이리스트, Apple Music 구독/라디오 | 보류 | 현행 저장 모델/서비스 범위에 없음. 빈 메뉴를 노출하지 않음. 기존 읽기 전용 큐는 유지. |
| 로컬 파일 누락·태그 부족·가져오기 부분 실패 | 로컬 앱에 맞게 변형 | 누락 곡은 파일 상태 확인→파일 정리, 태그 부족은 파일명/미상 안내, 부분 가져오기는 기존 R3 결과·재시도 계약 유지. |
| 클래식 작품·녹음·악장 관리 | 로컬 앱에 맞게 변형 | 작품 등록은 선택. 보관함 아래 클래식 영역과 상단 도구의 정리·감상·IMSLP 경로 보존. |

Apple 동작 근거: [iPhone 보관함 분류·정렬](https://support.apple.com/en-in/guide/iphone/iph0138fb328/27/ios/27), [보관함 검색](https://support.apple.com/en-ca/guide/iphone/iph4b506b24d/27/ios/27), [미니플레이어·전체 재생](https://support.apple.com/en-gb/guide/iphone/iph676daac9b/ios), [재생 대기열](https://support.apple.com/guide/iphone/queue-up-your-music-ipha4521ef7d/27/ios/27). 2026-10-26에 공식 자료를 확인했다. 분류 편집의 로컬 선호 저장 방식, Apple의 세부 애니메이션과 시각 간격은 이 자료만으로 확인한 동작으로 취급하지 않는다.

현재 소스는 미커밋이며 검증 시점 HEAD는 `3cfcb608`이다. 이전 R3 반환의 해시를 새 구현의 해시로 재사용하지 않았다. 현재 주요 파일의 SHA-256:

| 소스 | SHA-256 |
| --- | --- |
| `lib/main.dart` | `2791c048df0ef796f4bc241f97c9be61f246c7a155883edfca729653946cb78a` |
| `lib/local_file_library.dart` | `3d43c95339ba369711d78b88ce911109326a4278003626352e466bd531ff5c70` |
| `lib/presentation/local_file_library_components.dart` | `9d0cd72c25ba803df519f6cabed84bd164546fed56b6b13a7a59cf637bd9b6fd` |
| `lib/presentation/library_home_components.dart` | `2a1f746b444f09e4e0180c57a7495bb325a3b372d7181ff1197f86ca1a673a75` |
| `deployment/apps/classical-local-library/ios-metadata.yaml` | `54fac4e6a4405247f7bc3ba79d081abfd2529f711e7a6089ba50ce8fdd0cdd18` |
| `assets/branding/app_icon_provisional.png` | `b06115fc4bd3396895b28b0cb33e69e406d96c5bb0e7fc4f72065c9d8ca6d4c5` |

## 실제 구현과 반환 화면

- `local_file_library.dart`: 결정적인 정렬과 가져오기 시각 fallback. 최근 항목은 앨범과 아티스트로 묶고, 앨범 미상 파일은 개별 곡으로 표시한다.
- `main.dart`: 큰 제목·분류 목록·최근 카드와 분류 안 검색·정렬 상태를 구성한다. 재생 상태·큐와 분리한다. 최초 반환에는 제목 위 아이콘·이름도 있었으며 후속 수정에서 제거했다.
- `local_file_library_components.dart`: 공통 토큰과 버튼·검색·메뉴를 사용한 Play 전용 촘촘한 행·최근 카드. 누락 곡은 파일 상태 확인.
- `library_home_components.dart`: 전체 보관함 검색에서 누락 곡 복구 경로 유지.
- `assets/branding/app_icon_provisional.png`와 iOS AppIcon 19개 슬롯, Android legacy/adaptive launcher에 브랜드 시스템의 [Play 후보 08](../../../ddirori-brand-system/icon-family-v8/README.md)을 적용했다. 개발 빌드 미리보기이며 출시용 최종 승인이나 대표색 확정이 아니다. 앨범 아트가 없는 카드에는 중립적인 자리 표시를 쓴다.
- 기존 SQLite schema, 공통 패키지 API, 재생 엔진과 Work/Recording/Movement ID는 변경하지 않았다. 기존 R2/R3 변경과 다른 앱의 미커밋 변경은 보존했다.

| 상태 | 실제 Flutter 위젯 캡처 |
| --- | --- |
| 보관함 · 390px light | [화면](screens/apple-library-home-390-light.png) |
| 곡 목록 · 390px light | [화면](screens/apple-library-songs-390-light.png) |
| 검색 결과 없음 · 390px light | [화면](screens/apple-library-no-results-390-light.png) |
| 곡 목록 · 320px dark · 글자 200% | [화면](screens/apple-library-songs-320-dark-200.png) |
| 곡 목록 · 1024px light · 글자 200% | [화면](screens/apple-library-songs-1024-light-200.png) |
| 보관함 · 320px dark · 글자 200% | [화면](screens/play-large-dark.png) |
| 빈 보관함 · 320px dark · 글자 200% | [화면](screens/play-empty-small-dark.png) |
| 실제 iOS 26.5 시뮬레이터 · 빈 보관함 | [화면](screens/play-ios26-5-simulator-empty.png) |
| 실제 iOS 26.5 시뮬레이터 · 홈 런처 | [Play 아이콘](screens/play-ios26-5-simulator-launcher.png) |

캡처는 Pretendard와 Material Icons를 로드한 Flutter widget test 결과이며 fake 플레이어·주입한 파일 metadata를 사용한다. 실제 기기 화면, 가청 출력 또는 App Store 제출 사진이 아니다. 캡처를 직접 열어 중복 제목 제거, 목록·검색·정렬, 좁은 화면 줄바꿈과 잘림 여부를 검토했다. 이미지에 실제 사용자 경로와 개인 음원은 없다.

마지막 두 장은 위 widget 캡처와 별개로 iOS 26.5 시뮬레이터에 새 빌드를 설치해 직접 촬영했다. 빈 보관함에서는 실제 앱의 가져오기 행동이 활성화되어 있다. 런처에서 후보 08 아이콘과 앱 표시명 `띠로리 플레이`를 육안 확인했다. 촬영 파이프라인의 스토어 제출 사진이나 최종 아이콘 승인 증거는 아니다.

## 검증과 미검수

단위/위젯 테스트는 가져오기→목록→재생, 정렬 동률, 태그 부족/파일 누락, 검색 결과 없음, 큐 보존, 320/390/1024px·글자 200%·light/dark를 다룬다. iOS 시뮬레이터 통합 테스트는 합성 WAV와 실제 `just_audio` 상태를 별도로 다룬다. 실제 Files/iCloud 제공자, 물리 출력·청감, VoiceOver 발화, 분류 편집은 검증/구현 범위 밖이다. 현재 제품은 미커밋이며 iOS metadata는 `pending`/`reviewed: false`다.

| 검사 | 결과 |
| --- | --- |
| `dart format lib test integration_test` | 통과 |
| `flutter test` | 390개 통과 |
| `flutter analyze` | 이슈 없음 |
| `dart run tool/generate_audio_fixtures.dart --check` | 종료 0 |
| iOS 26.5 `DDIRORI-QA-Play-20261023` 시뮬레이터 `local_file_library_flow_integration_test.dart` | 합성 WAV 가져오기·곡 직접 재생의 실제 `just_audio` playing·클래식 등록/재생 통과. 곡 제목은 스캔 후 `Allegro`로 정규화되므로 테스트 기대값을 고쳐 재실행 |
| 같은 시뮬레이터 `screenshot_scene_contract_integration_test.dart` | 보관함/곡 scene과 기존 작품·녹음·큐 탐색 2개 테스트 통과. 수정 후 별도 재실행한 가져오기 테스트와 합계 3개 통과 |
| `flutter build ios --simulator --no-codesign` → `simctl install/launch` | 성공. 실제 빈 보관함과 SpringBoard의 새 Play 런처 아이콘 촬영·열람 |
| 5천 파일 fixture | 보관함 항목 생성·검색·추가일 정렬을 기존 5초 상한 회귀 검사에 포함해 통과 |
| iOS metadata check · `git diff --check` | 통과 |
| AppIcon 정적 검사 | iOS 19개 슬롯의 치수·RGB, 앱 내부 1024px RGB와 Android adaptive 투명 foreground 확인 |

시뮬레이터의 파일 선택은 테스트 fixture가 주입한 결과다. Files/iCloud 제공자 UI를 통과한 증거가 아니다. 오디오 엔진 상태도 물리 스피커 청감의 증거가 아니다. 실제 스토어 scene 캡처·검수, VoiceOver 발화·정렬 메뉴 낭독과 포커스 복귀는 별도 검수로 남겼다.

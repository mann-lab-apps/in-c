# Play 작곡가 중심 기반 작업

기준: 지속 worktree `ddirori-play-library-context-20261031`, HEAD `f57602c18ce55031833faabf37a073da437453b9`. 이전 다중 선택/큐 저장 미커밋 변경과 evidence를 보존한다. 기존 복구 snapshot은 `ddirori-play-snapshots/20261111-batch-actions`다. 버전0.1.0+4, schema18, feedback2에서 시작한다. 커밋·푸시·배포하지 않는다.

| 작업 | 수용 조건 | 보존/실패 기준 | 검증 계획 | 상태 |
| --- | --- | --- | --- | --- |
| 메타데이터 역할 | 앨범/작품·곡/악장·앨범 아티스트/연주자/작곡가 분리 | 기존 교정·출처·음반/파일 ID·백업 보존 | composer_foundation·display metadata·SQLite 재연결/논리 백업 | 자동 검증 통과 |
| 목록 시작 | 전체 필터/정렬 snapshot과 선택 인덱스 | 이전 곡 접근·허위 감상 기록 없음·클래식 기존 범위 | queue_selection·composer UI·native indexed queue | 자동/native 검증 통과 |
| 큐 선택 | occurrence 인덱스로 실제 이동 | paused/ready 유지·직렬화·stale seek/큐 교체 방어 | fake 경합·12조건 widget·iOS/Android native 소스 보존 | 자동/native 검증 통과 |
| Android | native 백그라운드·알림·미디어 명령 | 같은 엔진·진단 격리·iOS 보존·자동 재개 금지 | MIT/공식 문서·debug build·전용 API35 OS 앱 전환/미디어 키 | 에뮬레이터 통과·실기기 미검수 |
| 작곡가 탐색 | 곡/앨범/작곡가/재생목록, 복귀 링크와 명확한 범위 | 미상 재생 가능·가짜 catalog 없음·설정 호환·draft 유지 | query/widget·12화면 조건·새 캡처 | 자동 검증/캡처 확인 통과 |

필수 검증: format/test/analyze/fixture, 기존 QA runner 새 output·소스 전후 hash·실제 캡처 검수, iOS native 회귀, 가능한 Android native, metadata Ruby/Fastlane, diff check. 물리 Xs/Android 청감·VoiceOver·실제 파일 제공자·gapless 실측은 수행 범위를 분리한다. 시대/IMSLP 추가 기능·연주자 탐색 고도화는 범위 밖이다.

## 구현 정책과 호환성

- 메타데이터: 새 title/albumTitle/albumArtist 교정 필드는 기존 JSON 저장소와 enum 이름을 사용한다. schema18을 변경하지 않았다. 이전 workTitle/movementTitle 값과 출처는 그대로 남고 작품명으로 앨범을 덮어쓰지 않는다. 태그에 곡 제목이 있으면 곡 제목으로 표시하고 악장 교정은 별도로 유지/검색한다. 기존 제목 교정용 검색 fixture는 새 title 역할을 사용하도록 명시적으로 바꿨으며 기존 정적 검색 oracle의 ID/순위/표시 assertion은 유지했다.
- 앨범 그룹: 앨범명+앨범 아티스트다. 후자가 없어도 개별 연주자로 나누지 않는다. 동일한 메타데이터만으로 발매판을 임의 구별하지 않는다. 정체가 모호한 동명 음반은 확인 후 앨범 아티스트 등 실제 정보로 교정한다. 작곡가 범위에서는 해당 곡만 표시하고 전체 음반 진입은 별도다.
- 작곡가: 기존 작품에 작곡가로 연결된 ClassicalPerson의 정확한 이름/확인된 별칭만 ID로 묶는다. 동명이인 충돌은 ID를 확정하지 않는다. 새 인물 사전·시대 판정·음원 지문 추론은 만들지 않았다. artists 표시 설정은 위치/숨김/목록 정렬을 보존해 composers로 해석하고 보조 아티스트 경로를 유지한다.
- 재생: 일반 목록은 전체 가용 큐+initialIndex이며 클래식 planner의 남은 악장 범위는 그대로다. queue selection은 실제 인덱스를 seek하고 같은 source tag/큐를 보존한다. playing은 이어가고 ready는 ready, paused/completed는 paused다. 새 큐/최신 선택은 이전 pending 선택·seek의 revision을 무효화한다. 앞 곡의 감상 이력을 만들지 않으며 lifecycle은 재생을 멈추지 않는 활성 이력 checkpoint를 저장한다.
- 탐색: 현재 재생→작곡가/앨범 링크와 뒤로 복귀는 같은 controller를 사용한다. 새 Play adapter만 추가했고 공통 ddirori_ui API·색·런처를 바꾸지 않았다. position 갱신의 현재 파일 lookup도 ID 인덱스를 재사용한다.

## Android 선택 근거와 검증 경계

2026-11-11 공식 [audio_service0.18.19](https://pub.dev/packages/audio_service), [원본 MIT license](https://github.com/ryanheise/audio_service/blob/minor/audio_service/LICENSE), [Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types#media), [단일 플레이어 제약](https://pub.dev/packages/just_audio_background)을 확인했다. 현재 Flutter3.47.2/Dart3.13.2와 패키지 요구 Flutter3.27+/Dart3.6+가 호환되고 pub resolution/debug build를 통과했다. 본재생/진단의 두 플레이어를 보존하기 위해 audio_service를 Android SystemMediaSession adapter에만 사용한다. just_audio_background·추가 플레이어·외부 앨범아트 요청은 도입하지 않았다.

WAKE_LOCK/FOREGROUND_SERVICE/FOREGROUND_SERVICE_MEDIA_PLAYBACK과 mediaPlayback 서비스·receiver, AudioServiceActivity를 추가했다. 기기 전체 음원 읽기·새 cloud·배터리 최적화 해제 요청은 없다. 실제 엔진 관측만 MediaItem/PlaybackState로 보낸다. MediaItem의 동등성은 ID만 비교하므로 제목/앨범/아티스트/길이를 명시 비교해 늦은 duration을 반영한다. 원본 시스템 미디어 ID는 path가 아닌 기존 opaque hash다. pause 시 foreground를 해제하고 stop/빈 큐/dispose는 미디어 정보를 지운다. 진단은 기존 controller의 pause/독점/자동 재개 금지 경계를 유지한다. iOS는 기존 native adapter만 초기화한다.

새 전용 `DDIRORI_QA_Play_API35_20261111` AVD는 설치된 공식 API35 google_apis arm64 이미지로 만들었다. 다른 앱의 AVD는 사용/변경하지 않았다. 초기 잘못된 PlayStore 이미지 이름과 기본10GB userdata 공간 부족은 실제 설치 이미지 선택/이 전용 AVD의2GB 파티션 설정으로 해결했다. 새 외부 바이너리를 다운로드하지 않았다. 실제 HOME/화면 sleep/wake/앱 복귀, foreground service와 활성 session, OS pause/next/play/stop, source 인덱스와 DB 재연결을 검사했다. seek/previous는 adapter·공통 controller 검사와 물리 QA를 구분한다. 에뮬레이터 청감과 제조사 절전 정책은 입증하지 않는다.

## 최종 실행

2026-11-11 17:26–17:35 KST, 최종 실행 `build/composer_foundation_verified_20261111/run-I6puO3`의 19개 검사 모두 통과했다. `dart run tool/run_local_qa.dart --library-ux --captures --simulator 38B3F034-2212-4566-B09B-AC5DFEEB1187 --android-device emulator-5580 --output build/composer_foundation_verified_20261111`을 실행했다. 실행 전후 소스 fingerprint는 모두 `adb65bc31cec715d46060e18c4118ab3bbc34f5dbcff1fac752381873d9de5c5`다. 개발 실행의 로그/이미지를 최종 증거로 재사용하지 않았다.

| 검사 | 실제 결과 |
| --- | --- |
| Flutter/Dart | 3.47.2 / 3.13.2 |
| format | 187개 파일, 변경0 |
| 전체 host 테스트 | 780개 통과 |
| 캡처 회귀 | 115개 통과; 전체 host 테스트와 겹치는 재실행이므로 합산하지 않음 |
| analyze | 문제 없음 |
| 오디오 fixture/decoder/capability | 통과; encoder/실제 출력 장치가 필요한 항목은 capability 기록의 한계 유지 |
| 대형 보관함/검색/stress | 통과; 5,000곡 viewport 행6개, 관측330ms·RSS431,669,248bytes는 host 수치 |
| iOS native | library1 / system-scenes5 / music-actions5 / formats3 / background2, 합계16개 플랫폼 실행 통과 |
| Android native | indexed queue1 / background1, 합계2개 플랫폼 실행 통과 |
| metadata Ruby | 13회·40assertions, 실패0 |
| metadata Fastlane check | 성공, 업로드/서명/버전 변경 없음 |
| 이미지 | 74개 생성·hash 확인, 물리 기기/스토어 촬영 승인 아님 |

iOS는 기존 전용 iPhone17Pro/iOS26.5 simulator와 Xcode26.5(17F42)에서 실행했다. 이 프로젝트는 FlutterGeneratedPluginSwiftPackage 기반 local SwiftPM을 사용하며 CocoaPods Podfile.lock은 없다. Android는 전용 API35 google_apis arm64 AVD에서 실제 native just_audio·media service를 실행했다. 최종 OS 검사에서 foreground service와 active media session, HOME/sleep/wake 복귀, pause/next/play/stop이 확인됐다. 일시정지 관측 위치9,011ms·큐3개·최종 stopped=true이며 실가청 출력 판정은 false다.

원본 실행 결과를 [최종 증거](evidence/play-composer-foundation-20261111/report.json)에 보관했다. `source-files.json`은 현재 제품/테스트/공통 소스·manifest 해시, `files.sha256.json`은 로그/이미지/보고서 해시다. branch/base commit·환경·미커밋 상태는 `handoff.json`에 기록했다. 기존 다중 선택 증거와 snapshot은 변경하지 않았다. 현재 미커밋 변경과 새/이전 증거의 복구 자료는 저장소 밖 `ddirori-play-snapshots/20261111-composer-foundation/play-worktree-final.tar.gz`와 `snapshot.json`에 보관한다. 별도 임시 Git index에서 기준 HEAD에 tracked patch를 적용 가능한지 확인하며 실제 index는 변경하지 않는다.

최종 이미지 중 `composer-overview`와 `composer-queue`의 390px/100%/light, 320px/200%/light, 1024px/200%/dark 6개와 Android 미디어 알림을 직접 열어 확인했다. 작곡가 범위와 앨범 전체의 구분, 현재 큐 항목·메타데이터 링크·큰 글자 줄바꿈, Android 실제 곡명/미디어 조작/진행 표시를 확인했다. 큰 글자 큐 캡처는 목록까지 스크롤한 상태이며 화면 위쪽 조작은 해당 캡처에 모두 담기지 않는다. 전체 동선의 접근성/스크롤은 widget 검사로 별도 검증했다. FlutterWidgetFakeController, iOSSimulator, AndroidEmulator 증거 환경을 분리했으며 미확인 실기기/청감으로 승격하지 않았다.

## 남은 검수와 다음 범위

- iPhone Xs 및 Android 실기기의 청감, 제조사 절전, 실제 Files/provider, VoiceOver/TalkBack 발화·탐색, Bluetooth/유선·전화 interruption, gapless 실측은 미검수다. 사용자 동선은 물리 기기 체크리스트에 남겼다.
- Android OS의 seek/previous 화면 직접 조작은 이번 외부 키 runner 범위가 아니다. adapter 명령 전달·공통 controller 정책과 native 인덱스 seek 검증을 실제 OS UI 터치 증거로 표현하지 않는다.
- 작곡가 ID는 기존 작품의 작곡가 관계와 확인된 별칭에만 근거한다. 작품 등록과 독립된 작곡가 사전/역할·시대 필터·IMSLP 맥락 연결 고도화는 다음 목표 후보이며 이번에 추가하지 않았다. 메타데이터만으로 구분할 수 없는 동명 발매판은 사용자의 실제 정보 교정이 필요하다.
- schema18·feedback2·버전0.1.0+4와 기준 HEAD를 유지했다. 제품 코드는 미커밋이며 배포 YAML은 pending/reviewed false다. 커밋·푸시·배포를 실행하지 않았다.

이번 다섯 작업의 로컬 구현/검증을 일단락한다. 사용자가 요청한 다음 목표 프롬프트는 대화창에만 작성하고 새 목표를 자동 실행하지 않는다.

초기 `build/composer_foundation_final_20261111/run-CaS0qi`는 앱778개·분석/fixture/성능·widget113개·native library/system-scenes가 통과했다. 이후 작곡가 상세의 그룹 정렬에 날짜 선택이 적용되지 않는 UI 동작을 발견해 native-music-actions 실행 중 그 runner를 중단했다. 작품/앨범 그룹이 실제 추가 시각으로 정렬되게 고치고 곡/그룹 정렬 메뉴와 기본 순서를 구분했으며, 날짜 정렬 및 누락 prefix 뒤 시작 인덱스 UI 회귀를 추가했다. 이 개발 실행을 최종 PASS 증거로 재사용하지 않고 수정 소스를 새 output에서 전체 검증한다.

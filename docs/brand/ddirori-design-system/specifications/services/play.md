# S-PLAY 로컬 음원·디스커버리

2026-10-25 실제 적용: library_management → MetadataEditDialog는 공통 Input/Button/Banner와 native AlertDialog를 합성한다. 저장 중 readOnly·중복/닫기 차단, 실패 draft 보존과 재시도, 성공 이후 route 반환·목록 갱신을 앱이 소유한다. [도입·검증](../../shared-baseline.md).


현행 Flutter 앱: [README](../../../../../apps/classical_local_library/README.md), [presentation](../../../../../apps/classical_local_library/lib/presentation/). iOS/Android scaffold. 아래 이름은 명시한 경우 **실제 구현**이다. 향후 외형 개선은 목표이며 repository/SQLite/오디오 엔진을 UI 패키지로 옮기지 않는다.

## 현재 API와 소유권

[play_library_components.dart](../../../../../apps/classical_local_library/lib/presentation/play_library_components.dart):
- PlayWorkRow: required work:Work, composer:ClassicalPerson, partCount:int, recordingCount:int; onTap:VoidCallback?, actions:List<Widget>=[]
- PlayRecordingRow: required recording:Recording, workTitle:String; onTap?, actions=[]
- PlayMovementRow: required sequenceNumber:int, title:String, hasLocalFile:bool; originalTitle?, duration:Duration?, fileName?, current=false, onTap?
- PlaySearchResultRow/PlayQueueRow/PlayAudioFileRow는 파일의 현재 constructor를 유지하고 렌더링 필드를 아래 계약에 대응시킨다.

[PlayNowPlayingControls](../../../../../apps/classical_local_library/lib/presentation/play_playback_components.dart): required state:LocalPlaybackState, canUseQueue:bool, commandRunning:bool, onPlayPause/onNext/onStop:VoidCallback, onSeek:ValueChanged<Duration>. busy=state.isBusy||commandRunning, seek는 duration>0/currentItem 존재/!busy인 경우만.

이는 **앱 내부에서 도메인 타입을 받아 공통 표시로 바꾸는 adapter**다. API를 범용 데이터 객체로 바꿀 의무는 없다. 공통 DdiroriItem에는 title/subtitle/leading/actions/callback만 넘긴다. 목록 정렬·집계·현재 항목·파일 가용성을 위젯이 계산하거나 직접 IO하지 않는다.

## 구성별 계약

| ID / 현행 이름 | anatomy·토큰 / 목표 외형 | 입력·사건·상태 | 검증 |
| --- | --- | --- | --- |
| S-PLAY-01 Work/RecordingRow | 제목16/600, 작곡가/작품번호/연도14, 숫자 count, 독립 actions. DdiroriItem row16/gap12 | onTap은 상세 진입. 작품과 녹음의 ID·계층을 유지. 연도 null은 연도 미상. 원어명은 줄바꿈 | 긴 제목·320/390·200%·작품/녹음 구분 |
| S-PLAY-02 Movement/QueueRow | 순서 번호 → 악장 제목 → 길이·가용성·현재 재생. 현재는 면+문구/기호 | movement 선택은 해당 시작점 요청; queue는 큐 index/id. 파일 누락은 재생 차단·이유. 큐 삭제가 외부 파일 삭제로 번역되지 않음 | 현재 큐 항목·중복 악장·파일 미상 |
| S-PLAY-03 AudioFile/SearchResultRow | 파일명/결과 유형 → 매핑·상태 → 독립 선택·검토 actions | source path 대신 표시명. file status 필터와 selected files 별개. metadata 교정은 별도 폼 | 전체 경로 기본 비노출·누락·선택과 열기 분리 |
| S-PLAY-04 NowPlayingControls | 현재 곡·상태 → transport → PlaybackProgress, error/recovery. group8/section24 | 실제 state 기반 canToggle/seek. commandRunning 중 중복 차단, buffering/seeking 문구, error 유지. onStop은 단순 pause와 구분 | duration 미상/0·buffer·drag 종료 seek1회·오류 |
| S-PLAY-05 ScanLocation/DiscoveryResultRow | 위치 표시명·개수/진행·동작 또는 추천 이유·작품/녹음 | scan busy는 대상 행동 차단. discovery 근거는 데이터가 제공한 이유만 표시. 빈 결과는 새 query/필터 | 권한 거부·재시도·오래된 scan 결과·없는 이유를 생성하지 않음 |
| S-PLAY-06 ListeningHistory/StatisticRow | 세션/시간/횟수·완료 상태 → 이어 듣기/삭제 | 집계는 repository. resume unavailable 이유, 최근 기록 삭제는 확인 bool 후 host 작업 | 기간/단위·busy 차단·기록 삭제≠음원 삭제 |
| S-PLAY-07 MetadataEditDialog | 제목/작곡가/작품/녹음 매핑 fields → error → reset/save | 현재 MetadataEditResult/입력 모델 유지. draft는 폼, 승인 저장은 host transaction | 취소는 원래 매핑 불변. 저장 실패 draft 유지·필드 오류 연결 |

가족 행을 통합한 “모든 음악 항목” 컴포넌트는 만들지 않는다. 렌더링이 비슷해도 queue·파일 검토·작품 상세의 동작이 다르다. `library_home_components.dart`는 main.dart의 part이므로 private 데이터 접근을 공통 패키지에 노출해 독립화하지 않는다.

## 조합·전이

```text
Header + MetricGroup
Search(query) → SearchResultRow(type)
필터/정렬 → WorkRow → RecordingRow → MovementRow
NowPlayingControls(state) + QueueRow[]
ScanLocationRow → 실제 import progress → AudioFileRow/MetadataEditDialog
HistoryRow + StatisticRow
```

가져오기: picker/permission → scan/import → 검토 → commit. 취소·부분 실패 파일을 완료 건수에 섞지 않는다. 저장 대상은 앱 관리 복사본/카탈로그이며 외부 원본 파일 삭제·수정으로 뜻을 바꾸지 않는다. 초기 빈 카탈로그에 데모가 자동 생성되지 않도록 기존 ENABLE_DEMO_LIBRARY 경계를 보존한다.

재생: 선택 → preparing → playing/paused/buffering/seeking/error. UI의 onPlayPause 호출 시 playing을 낙관적으로 true로 고정하지 않는다. 드래그 중 표시 위치는 임시값, 확정 요청 후 실제 position은 엔진에서 수신한다. 여러 seek 응답의 최신성 보장은 engine/controller에서 테스트한다.

## 반응형·접근성·오류

모바일에서 행 actions는 Wrap, 긴 원어명과 파일명도 200%에서 overflow 없이 읽혀야 한다. 상세 조작과 삭제를 행 전체 onTap에 중첩하지 않는다. status 문구에 곡명/재생 상태를 제공하되 playback tick마다 live announce하지 않는다. duration unknown은 0:00 완료처럼 표현하지 않는다. 실패는 상태 badge+복구를 제공하고 진단은 별도 펼침이다.

후속 외형 목표는 flat 목록/설정 폭 정리이며 현재 모든 행이 flat으로 적용된 것은 아니다. 실제 기기 재생·오디오 세션·백그라운드·파일 권한은 UI 테스트 밖이다.

## 도입 순서·검증

기존 presentation row의 구조를 유지하며 한 목록 → 현재 재생 → 설정 순. 통합 회귀는 [library tests](../../../../../apps/classical_local_library/test/play_library_components_test.dart), [playback tests](../../../../../apps/classical_local_library/test/play_playback_components_test.dart), [activity tests](../../../../../apps/classical_local_library/test/play_activity_components_test.dart). 새 행만 스크린샷 찍고 기존 엔진 결과를 생략하지 않는다.

Given 파일 누락, When 재생, Then 실제 명령이 차단되고 찾기/재가져오기 안내. Given 삭제 취소, Then 큐/기록/원본 불변. Given UI theme 변경, Then Duration·queue 순서·파일 식별자 불변. rollback은 presentation 연결만 되돌리고 DB schema migration을 요구하지 않는다.

실제 UI 변경 시 [플레이 manifest](../../../../../deployment/apps/classical-local-library/ios-metadata.yaml)의 scenes/동선/manual과 pending/reviewed를 갱신한다.

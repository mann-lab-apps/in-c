# Play 셔플·반복 재생

기준: 기존 library-context 작업 트리와 미커밋 변경, 내부 TestFlight0.1.0(4)을 보존한다. 새 기능은 미배포이며 커밋·버전 증가·업로드하지 않는다.

| 상황 | 정책 |
| --- | --- |
| 반복 끔 / 전체 / 한 곡 | 자연 종료는 완료 / 큐 처음 / 현재 곡 처음. native loop 기능 한 곳에서 처리 |
| 수동 다음 | 한 곡 반복과 무관하게 다음 곡. 끝에서는 전체 반복만 처음으로, 그 외 완료 |
| 이전 | 3초 이상 현재 곡 처음. 미만 이전 항목. 첫 항목은 전체 반복만 마지막, 그 외 현재 처음 |
| completed | index==length 유지. play는 처음, next는 기존처럼 no-op. 모드만 변경해 자동 재생하지 않음 |
| pause / stop | 이동·모드 변경으로 자동 재생하지 않음. stop은 현재 순서 처음/0초, 모드 유지 |
| 새 큐 | 기존 모드를 적용하되 원본 큐/ID는 보존하고 새 큐의 첫 항목을 선택 |
| 셔플 켜기 | 현재까지 prefix와 현재 곡을 유지하고 남은 순서를 섞음. seed 주입 가능 |
| 셔플 끄기 | 원래 순서 복구, 같은 occurrence·position·playing/paused 유지 |
| 셔플+전체 반복 | 저장된 동일 permutation으로 반복. 매 바퀴 다시 섞지 않음. 둘 이상 occurrence에서 마지막→첫 항목은 서로 다름(같은 음원 중복 항목 자체는 별개) |
| 재시작 | 순서·모드·현재 occurrence 복원, 자동 재생하지 않음. 이전 데이터 기본값은 셔플/반복 끔 |

구현 전 확인: just_audio0.10.6의 setLoopMode/ShuffleOrder/sequence index 계약을 공식 문서와 설치 원문에서 확인했다. 큐 원본·실제 재생 순서·원래 index를 구분하며 파일ID만으로 중복 occurrence를 식별하지 않는다. 자연 종료는 Dart에서 별도로 next를 호출하지 않는다.

| 수용 항목 | 증거 | 상태 |
| --- | --- | --- |
| 순열·모드·수동/자연 경계·중복 항목 | playback_modes_test 12개,20k 순열 포함 | 통과 |
| 실제 adapter·실패 rollback·경합 | boundary double 11개 + 실제 native 반복 fixture | 통과, 증거 종류 구분 |
| 저장·이전 버전·손상·누락·재시작 | SQLite/recovery 4개, 실제 DB reopen·v16 additive·중복 occurrence | 통과 |
| UI·접근성·크기/테마·대기열 | widget 15개, 신규 모드12장 포함 전체51캡처 | 자동 통과, 실제 발화 미검수 |
| 시스템/진단/OS 전환·회귀 | 전체541앱, 고유 iOS integration8개, 실제 OS app switch | 통과, 물리 환경 제외 |
| 문서·YAML·format/test/analyze | 최종 QA14검사·metadata13개/40assertions·check·diff check | 통과 |

실제 Xs 청감·VoiceOver·Files/Bluetooth/전화는 사용자 검수이며 fake/native simulator로 통과시키지 않는다.

## 구현과 보존

`PlaybackOrder`는 원본 occurrence index와 실제 재생 index의 양방향 순열이다. 중복 track/file ID가 있어도 선택을 구분한다. `LocalPlaybackState`의 큐는 실제 순서이고 native source 배열은 원본 순서다. just_audio의 frozen `QueueShuffleOrder`와 native `LoopMode`에만 자연 전환을 맡긴다. 모드 변경은 audio source 재로드·seek 없이 적용하고 실패하면 native 값과 표시를 rollback한다. rollback 자체가 실패하면 실제 플레이어를 일시정지하고 경로 없는 복구 오류를 표시한다.

앱/시스템 명령은 같은 `SerializedLocalPlaybackController`를 사용한다. 큐 revision·원본 occurrence·자연 전환 generation이 일치하는 명령만 적용하며 오래된 seek·대기 중 next·큐 교체/종료 후 응답을 버린다. 본재생/진단 소유권, iOS 화면 잠금 시 재생 유지, interruption/장치 분리 후 자동 재개 금지를 보존한다. 시스템에 셔플 전용 버튼을 새로 제공하지는 않으며 기존 시스템 이동 명령이 선택 모드를 따른다.

SQLite v17은 `playback_queue_state.playback_options_json` 한 열만 additive로 추가한다. JSON version1은 permutation·index·shuffle·repeat를 저장하며 파일 ID 배열은 기존 열을 쓴다. v16 fixture migration을 두 번 적용해 기존 행 보존을 검사한다. 손상·미지원 옵션은 기존 ID를 유지한 모드 끔 fallback, 누락 파일은 남은 원본 index를 다시 매핑한다. 순서 복원과 별도 position store를 결합하고 자동 재생하지 않는다. 완료 상태는 마지막 선택을 ready로 복원하는 기존 정책이며 completed 자체를 재생 중으로 복원하지 않는다. 논리 백업에는 현재 큐를 추가하지 않는다.

재생목록 수동 순서·보관함 정렬·Work/Recording/Movement ID·파일 링크·원본 태그·교정 정책은 바꾸지 않는다. 사용자 선택 큐 셔플은 클래식 악장 순서도 변경할 수 있으며 작품 랜덤 계획과 독립적이다. 여러 녹음의 복원에서 첫 녹음만 재구성하던 기존 결함은 참조된 녹음 전체를 한 번에 재구성하도록 보완했다.

완료 후 모드 변경을 거쳐 play할 때 실제 iOS 엔진이 completed에 남아 position이 정지하던 경로를 native fixture로 재현했다. 명시적 재시작만 native stop→첫 occurrence seek→play를 수행한다. 모드 변경 자체는 소스를 다시 로드하지 않는다. lazy source의 duration 미확정 동안 seek가0으로 제한되는 것은 기존 정책이므로 통합 테스트도 실제 duration 준비 뒤 seek한다.

## 실행 환경과 자료

전용 iPhone17Pro iOS26.5 Simulator, Xcode26.5(17F42), Flutter3.47.2/Dart3.13.2, just_audio0.10.6. 새 의존성·권한·브랜드 변경은 없다. 합성 WAV source를 사용하며 개인 음원·경로를 수집하지 않는다.

공식 API/설치 원문 확인일은 2026-11-03이다: [setLoopMode](https://pub.dev/documentation/just_audio/latest/just_audio/AudioPlayer/setLoopMode.html), [ShuffleOrder](https://pub.dev/documentation/just_audio/latest/just_audio/ShuffleOrder-class.html), [LoopMode](https://pub.dev/documentation/just_audio/latest/just_audio/LoopMode.html). 버전별 실제 동작은 lockfile0.10.6과 native fixture가 근거이며 API 설명만으로 gapless 청감을 보증하지 않는다.

`playback_modes_test.dart`, `playback_modes_adapter_test.dart`, `playback_modes_persistence_test.dart`, `playback_modes_ui_test.dart`가 순열·상태·경합·rollback·SQLite·표시를 검사한다. adapter double은 decoder 증거가 아니다. `playback_modes_integration_test.dart`는 실제 native 반복/완료/재시작/복원을 검사하며 `ios_system_media_integration_test.dart`는 명령을 채널로 주입한다. 물리 OS 버튼을 누른 증거로 표현하지 않는다.

모드 UI 캡처는 실제 Flutter 앱+fake controller이며 390px/1x/light,320px/2x/light,1024px/2x/dark에서 off/all/one/shuffle 상태를 기록한다. 2x는 reduced motion·하단 safe area24px를 함께 사용하고 모드 위치로 스크롤했다. 위쪽 곡 정보/기본 재생 도구가 화면 밖일 수 있으며 별도 스크롤로 접근한다. 캡처를 스토어 촬영 승인으로 사용하지 않는다.

최종 QA 명령: 앱에서 `dart run tool/run_local_qa.dart --library-ux --captures --simulator <전용 UUID> --output build/playback_modes_qa`. 새 run 디렉터리만 허용하며 before/after source fingerprint·모든 log/image hash를 확인한다. 증거와 결과는 아래 최종 실행 절에 기록한다.

## 최종 실행 — 2026-11-03

원본 실행은 `apps/classical_local_library/build/playback_modes_qa/run-A89lZa/`이며 [report.json](evidence/play-playback-modes-20261103/report.json), [소스·이미지 hash와 인계 정보](evidence/play-playback-modes-20261103/handoff.json)에 복사했다. QA14검사 모두 명령 exit0이고 before/after fingerprint는 `def615ec2b6359e00aebafa77aa38dfa1063de99b5c5f9ff058f2d372898f956`로 같다. 모든 log/PNG hash를 복사 전에 대조했다. 기존 runner의 scope 레이블은 `librarySearchAndScaleRecovery`지만 이번 실행 명령에는 새 모드 unit/widget/native 검사가 포함되어 있다. 레이블이나 원본 결과를 수동으로 통과 판정으로 고치지 않았다.

- `dart format lib test integration_test tool`:160파일·변경0. `flutter test`:541통과, `flutter analyze`:문제0. 합성 음원 재생성 check·host decoder 신호·대형20k 목록/검색 benchmark도 통과했다. host 수치를 Xs 성능으로 주장하지 않는다.
- iOS integration은 가져오기/실제 재생·UI 모드 조작1개, 시스템 명령1개, 독립 scene/R2 탐색2개,20k worker검색1개, 실제 모드1개, background2개로 고유8개다. [native 모드/시스템 로그](evidence/play-playback-modes-20261103/native-system-scenes.log)에서 native 한 곡 반복·전체 wrap·off 완료·completed 재시작과 frozen 순서/paused 위치 복원을 확인한다.
- [실제 OS 앱 전환 결과](evidence/play-playback-modes-20261103/background/result.json):inactive/hidden/paused→resumed, index0→3으로 진행, 최종 sentinel12·위치 저장·Now Playing rate1.0을 확인했다. 물리 잠금·청감은 `false`다. 이벤트 주입 interruption/분리 검사는 물리 전화/장치 조작과 구분한다.
- 실제 Flutter PNG48장과 native simulator PNG3장을 생성했다. 대표 [반복 끔390px](evidence/play-playback-modes-20261103/images/playback-modes-off-390-1-light.png), [셔플+한 곡320px/200%](evidence/play-playback-modes-20261103/images/playback-modes-shuffle-320-2-light.png), [dark1024px/200%](evidence/play-playback-modes-20261103/images/playback-modes-shuffle-1024-2-dark.png), [실제 native 재생+모드](evidence/play-playback-modes-20261103/images/native-creation-result.png)를 열어 확인했다. 큰 글자에서는 모드 위치로 스크롤하므로 위쪽 도구 일부가 화면 밖이며 스크롤 접근 회귀는 별도 통과했다.
- `bundle exec ruby -Ilib test/ios_metadata_test.rb`:13테스트·40assertions·오류0. `prepare_ios_metadata ... mode:check`:exit0. [메타데이터 검사 로그](evidence/play-playback-modes-20261103/metadata-check.log) 참고. 제품 pending/reviewed false·기존 build4 ID/번호를 유지하고 모드 설명·심사/TestFlight 안내·movement_queue scene/steps/assertions·영향 manual을 갱신했다. `git diff --check`도 통과했다.

## 인계와 미검수

작업 경로 `/tmp/ddirori-play-library-context-20261031`, 브랜치 `feature/ddirori-play-library-context-20261031`, 실제 HEAD `cb29d398321d3b1ac84e4ce90d619e3da7af574b`. 기존 tracked/untracked를 포함한 미커밋 상태를 유지하며 원본 작업 트리로 복사하지 않았다. 작업 시작 시 보존한11소스의 before/after hash와 현재 소스214개의 hash를 handoff에 기록했다. 커밋·푸시·archive·업로드·빌드 번호 증가는 수행하지 않았다. 기존 내부 TestFlight0.1.0(4)와 공개 출시 상태는 그대로이며 새 모드를 포함하지 않는다.

[Xs 후속 점검표](classical-local-library-physical-device-checklist.md)의 미배포 모드 절을 새 후보 제공 후 사용한다. 실제 반복 전환의 청감/갭·Bluetooth/유선·전화·VoiceOver 발화·Files 제공자·실사용 메모리/열은 미검수다. native transport와 decoder PCM은 실제 스피커 출력 증거가 아니다. 시스템 셔플/반복 버튼 추가·매 바퀴 재셔플·논리 백업의 현재 큐 포함은 구현하지 않았으며 이번 계약 밖이다.

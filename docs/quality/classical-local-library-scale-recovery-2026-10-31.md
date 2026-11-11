# Play 대형 보관함·표지 복구·재현 QA

기준은 `cb29d398` 위 기존 library-context/completion 미커밋 작업이다.
같은 격리 브랜치에서 이어가며 이전 증거·다른 앱·원본 작업 트리를 보존한다.

| 항목 | 재현/수용 조건 | 상태 |
| --- | --- | --- |
| M1 지연 목록 | 5000/20000곡·그룹·목록에서 visible 행만 생성, 전체 결과 큐·수동 순서·복귀 유지 | 검증 완료: 곡/20000그룹/1000목록/5000편집/전체 큐·기존 navigation 회귀 |
| M2 갱신 비용 | position tick이 전체 보관함 query/rebuild를 반복하지 않음, 데이터/검색 변경은 반영 | 검증 완료: 동일100곡 fixture 위치10회 행 rebuild90→0, 검색 debounce·이탈·dispose |
| M3 표지 복구 | part/orphan/손상/공유 hash/저장 실패/동시 종료, 소유 사본만 정리 | 검증 완료: crash 파일·손상·symlink·실패한 정리·직렬 clear/dispose |
| M4 재현 QA | 저장소 runner에서 새 캡처·명령·hash·실패/timeout·환경 기록 | 검증 완료: 새 단일 QA 실행 전체 passed, 소스 before/after 일치, 실제 이미지20개 |
| 물리 QA | Xs 청감·VoiceOver·Files/iCloud·Bluetooth·실제 전화 | 외부 의존 |

보존: 원본/ID·교정/승인 정책·전체 표시 순서 재생·큐/위치·iOS background/system media.
커밋·푸시·배포·버전 변경·새 권한·백업 형식 변경은 범위 밖이다.

## 적용과 보존

곡·그룹·검색 결과·작품·녹음·재생목록을 `_LibraryScrollView`의 단일 CustomScrollView로 통합했다. 고정 정보/검색/도구는 SliverToBoxAdapter, 많은 행은 안정적인 ID와 findChildIndexCallback을 갖는 SliverList, 수동 편집은 SliverReorderableList다. 중첩 shrinkWrap 전체 측정을 제거했다. 최근 추가 카드·빈 상태·분류 편집·완료 안내는 유지한다.

실제로 만들어진 viewport 행과 재생 데이터는 별개다. 5000곡에서 처음7개 행을 만들고 전체5000곡을 재생 큐에 포함하는 assertion이 있다. 20000개 앨범/아티스트 그룹과1000개 재생목록, 5000곡 편집에서도 생성 행 상한80을 확인한다. 스크롤 후 새 행이 보이고 검색/정렬/뒤로 복귀·전체 큐·드래그/버튼 재정렬은 기존 회귀로 확인한다. 예전 eager 화면의 동일 환경 시간 비교가 없으므로 UI 속도 개선 배수는 주장하지 않는다.

미니/전체 재생 UI는 기존 playback notifier를 계속 구독한다. 단순 position/buffered position tick은 상위 보관함 setState를 호출하지 않는다. 큐·항목·상태·오류·준비 단계·seek·duration 변경은 구조 갱신을 유지하고, 재생 계획 본문은 기존 진행 표시를 유지한다. 같은100곡·10회 이벤트 재현은 수정 전 행 rebuild90, 수정 후0이다. 이는 host Flutter 테스트의 구조 측정이며 프레임/실기기 성능 수치가 아니다.

표시·검색·정렬·그룹 계산은 최대32개를 재사용한다. 입력은 파일·후보·교정·library·병합·링크·가져오기 시각의 immutable snapshot 참조이며 하나라도 교체되면 전체 폐기한다. 질의 key는 화면/분류/그룹/검색/정렬을 포함한다. 데이터가 없는 화면에서 전체 검색·최근 정렬을 미리 수행하지 않고 검색 파일 union은 ID 집합을 사용한다. 위치 tick이나 UI 캐시가 재생 명령을 만들지 않는다.

## 표지 복구·안전 경계

초기화는 DB 참조와 파일명만 읽어 소유 디렉터리의 미참조 hash PNG와 중단된 `.part`를 정리한다. 시작 시 음원 파싱·이미지 디코딩은 없다. 참조가 살아 있는 사용자/공유 표지와 알 수 없는 이름·directory·symlink는 보존한다. 표지 root 자체나 대상/part가 symlink이면 쓰기를 거부한다. 정리는 새 표지 저장과 같은 초기화/직렬화 경계를 사용한다.

요청된 사본만 8MB 한도·PNG signature·SHA-256을 확인하고 validation 결과128개를 재사용한다. 없거나 손상된 사용자 표지는 fallback/선택·제거 메뉴를 사용하고 내장 아트는 원본에서 재추출한다. 같은 정상화 bytes를 다시 선택하면 손상 사본도 atomic part→rename으로 교체한다. 새 참조 저장 실패 시 이전 참조를 유지하고, 이전 사본 삭제 실패는 성공한 새 저장을 실패로 바꾸지 않는다. dispose 전 이미 시작된 DB 쓰기는 drain해 file/ref 일관성을 유지하고, 시작 전/추출 중 작업은 취소한다.

직접적인 이전 파일 삭제 실패는 app repository의 File deleter 주입으로 재현한다. 원본·알 수 없는 파일·외부 링크 대상이 보존되는 실제 임시 파일 assertion도 있다. logical backup에는 설정/hash 참조만 있고 이미지 byte는 없다는 정책을 바꾸지 않았다. schema는16, 패키지·권한 추가도 없다.

## QA 재실행

앱 디렉터리에서 실행한다.

```sh
dart run tool/run_local_qa.dart --library-ux --captures --output build/library_scale_qa
# 사용 가능한 부팅된 전용 시뮬레이터를 선택한 경우
dart run tool/run_local_qa.dart --library-ux --captures --simulator <UUID> --output build/library_scale_qa
```

기존 `run_local_qa.dart`에 선택 scope를 추가했다. 각 호출은 새로운 run-* 폴더를 만들며 실제 exit code·timeout·실행 전후 소스 fingerprint·log/image hash를 기록한다. widget 캡처18개와 native flow2개를 기대하며 누락·재사용·truncated PNG는 통과할 수 없다. native 촬영은 allowlist marker에서 simctl로 수행하고, 기존 background runner로 실제 OS 전환을 실행한다. 화면은 Flutter에서 만들고 도구는 이미지를 조작하지 않는다.

한글/Material 글꼴은 로컬 파일을 확인하며 환경 변수 `DDIRORI_CAPTURE_FONT`, `DDIRORI_MATERIAL_FONT`로 지정할 수 있다. 시뮬레이터는 DDIRORI-QA- 이름과 booted 상태를 확인한다. 물리 기기는 허용하지 않으며 ID/개인 경로를 로그에서 제거한다. 소스 fingerprint는 알려진 iOS 생성 registrant와 Python bytecode 같은 생성물만 제외한다. 실패한 독립 검사는 다음 검사를 막지 않지만 report는 incomplete/sourceChanged가 된다.

## 발견한 추가 결함과 범위

- 이전 유일한 홈 테스트 실패는 ListView를 직접 찾던 선택자였다. Scrollable로 실제 동선을 실행하고 빈 보관함/데모 미주입 assertion은 유지했다.
- 중단된 PNG/part가 남는 문제, 손상 hash가 정상 사본으로 반환되는 문제, 임시 symlink를 통한 외부 fixture 쓰기를 실패 테스트로 재현한 뒤 수정했다.
- position tick 때 보관함 행이 반복 재빌드되는 비용을 측정·제거했다.
- 오래된 이미지나 헤더만 남은 PNG가 QA 성공을 대신하지 못하도록 검사했다.
- 새로운 스트리밍·클라우드·자동 식별·플레이리스트 기능을 추가하지 않는다. Apple Music의 감상 UX를 참고하되 별도 서비스와 완전히 동일한 제품이라고 주장하지 않는다.

## 최종 실행과 증거

새 QA 실행의12개 check가 모두 passed이고 sourceSha256Before/After가 일치했다.
`evidence/play-library-scale-recovery-20261031/report.json`은 runner가 생성한 원본 결과,
`handoff.json`은 실제 소스152개·이미지20개·추가 명령 결과와 patch hash를 수집한 결과다.
이전 context/completion 증거는 덮어쓰지 않았다. 현재 브랜치와 제품은 미커밋이다.

- `dart format lib test integration_test tool`: 최종 형식 검사 통과.
- `flutter test --no-pub --reporter expanded`: **474 PASS**. 이전 완료 체크포인트460에서14개 증가. scale5·표지 복구6·QA 검증3이며 기존 빈 보관함·metadata·R1/R2·파일 import/backup·navigation·playback 회귀를 포함한다.
- `flutter analyze`: **No issues**. fixture check exit0. macOS afconvert의 WAV/AAC/ALAC/FLAC decoder/signal 검사 통과(물리 출력 검증 아님).
- 전용 iPhone17 Pro iOS26.5 Simulator, Xcode26.5(17F42): 고유 integration **6 PASS**. 실제 native 파일 flow1, 시스템 미디어·metadata-only1, scene/R2 browsing2, OS 전환/interruption2다.
- background runner는 실제 Settings 전환6초와 inactive→hidden→paused→resumed, index0→3→완료12, 위치 저장·Now Playing rate1.0을 확인했다. 잠금 버튼·실제 전화·청감은 검증하지 않았다.
- 320/390/1024 × 글자1x/2x × light/dark12조합 및 기존 reduced motion/focus/semantics 검사를 통과했다. 대표3조건 widget18 PNG와 native2 PNG를 새로 생성하고 실제 이미지를 열어 확인했다.
- `bundle exec ruby -Ilib test/ios_metadata_test.rb`: **13 runs/40 assertions**, 실패0. `prepare_ios_metadata ... mode:check`: valid/source pending. UI scene은 실제 CustomScrollView와 긴 목록 탐색 동선에 맞추고 manual은 pending을 유지했다.
- `git diff --check`: PASS. 새 공통 API/패키지·schema·런처/대표색 변경은 없다. 이전 공통 디자인 생성물 변경은 보존했고 이번에는 다시 생성하지 않았다.

이번 Dart host/JIT 측정(각각 새 process, 실기기 수치 아님):

| fixture | 표시값 생성 | 곡 제목 정렬 | 파일 검색 | 전체 도메인 검색 | process 최대RSS |
| --- | ---: | ---: | ---: | ---: | ---: |
| 5000곡 | 67.2ms | 6.0ms | 21.7ms | 394.2ms | 380.6MB |
| 20000곡 | 127.0ms | 20.2ms | 27.3ms | 1413.1ms | 374.0MB |

전체 도메인 검색의 첫 실행 비용은 남은 성능 한계다. 질의/표시 snapshot 재사용과
position tick 분리는 구현했으나 모든 새 검색을 비동기 index로 전환하지는 않았다.
검색 엔진 교체·임의 시간 통과 기준을 추가하지 않고, 실제 사용자 라이브러리에서
문제가 재현되면 profile을 바탕으로 후속 범위를 정한다. 이번 결과로 release 기기
프레임·메모리나 이전 버전 대비 속도 배수를 주장하지 않는다.

- [새 QA 결과](evidence/play-library-scale-recovery-20261031/report.json)
- [소스·이미지·명령 hash와 인계](evidence/play-library-scale-recovery-20261031/handoff.json)
- [큰 글자 생성 완료](evidence/play-library-scale-recovery-20261031/images/playlist-created-320-2-light.png)
- [넓은 다크 재생목록](evidence/play-library-scale-recovery-20261031/images/playlist-list-1024-2-dark.png)
- [native 표지·검색·미니플레이어](evidence/play-library-scale-recovery-20261031/images/native-playlist-detail.png)

필수 자동 처리 항목은 검증 완료로 분류했다. 남은 물리 환경 검수와 스트리밍/클라우드/
자동 식별 같은 별도 기능은 아래와 이전 보존 계약에 따라 구분한다.

## 사용자 Xs 점검 (5~10분)

1. Files/iCloud에서 음원을 가져와 곡 목록과 실제 청감 확인.
2. 재생 중 긴 목록 끝까지 스크롤·검색·정렬·뒤로 swipe 완료/취소, 곡/위치 유지 확인.
3. 재생목록 곡 순서를 드래그/버튼으로 바꾸고 재시작·전체 결과 재생 확인.
4. 표지를 선택·취소·교체·제거한 뒤 원본 보존 확인.
5. VoiceOver로 화면 밖 곡까지 탐색하고 현재 곡·정렬·순서 조작·미니플레이어를 확인.
6. 화면 잠금30초·스피커/유선/Bluetooth·실제 전화 interruption 확인.

실기기 청감·VoiceOver 발화·Files 제공자·Bluetooth·전화·실사용 대형 라이브러리 성능은 외부 의존이다. fixture picker·상태 event 주입·simulator·host decoder 결과를 물리 기기 증거로 승격하지 않는다. 기존 TestFlight0.1.0(3)은 이 미커밋 작업을 포함하지 않는다.

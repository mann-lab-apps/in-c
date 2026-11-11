# Play 검색 성능·응답성

기준은 기존 `feature/ddirori-play-library-context-20261031`의 미커밋 작업이다.
기존 474 테스트·schema16·scale-recovery 증거를 보존하고 이어간다.

| 항목 | 수용 조건 | 상태 |
| --- | --- | --- |
| M1 기준 | 이전 ID/type/rank/순서/상한 fixture, 5k/20k cold/warm 분포·단계 측정 | fixture20질의 일치, 변경 전/후3회 분포 수집 |
| M2 계산 | 정규화 snapshot 재사용·안전한 fuzzy 제외·UI 긴 작업 분리 | worker·지연 초성·fuzzy 길이 제외/DP 검증 |
| M3 요청 | 최신 query/revision만 반영, draft/복귀/오류/취소/dispose | coordinator7개와 backend4개·UI13개 검사 |
| M4 검증 | 회귀·응답성·실제 캡처·native·재현 QA·metadata | 소스 동일 최종 QA14검사·499앱/7native·39캡처·metadata 통과 |
| 물리 QA | Xs 성능·청감·VoiceOver·Files/Bluetooth/전화 | 외부 의존 |

재생·큐·위치·원본·교정/승인·canonical ID를 보존한다.
커밋·푸시·배포·브랜드 변경은 하지 않는다. 과거 성능을 이번 측정으로 재사용하지 않는다.

## 계약과 구현

`test/fixtures/library_search_contract.json`은 제품 수정 전에 기존 코드로 기록한20질의의 ID/type/title/subtitle/rank/순서다. 한글·초성·원어·별칭·악센트·오타·작품 번호·파일명·동일 제목·교정·미승인 후보·긴 검색어·빈 결과를 포함하며 동기 API와 준비 문서 모두 일치해야 한다. rank→type enum 순서→title comparator, type+canonical ID 중복 제거, 비fuzzy 결과가 있으면 fuzzy 제외, 상위12개를 그대로 유지한다. comparator 동률에 새 ID 정렬을 추가하지 않고 동일 입력의 기존 결과 순서를 fixture로 고정했다. Dart sort의 stable ordering을 새로 약속하지 않는다. 파일 목록은 별도로 전체 파일 검색과 상위 fileCandidate ID의 합집합을 원래 파일 순서로 반환한다.20k 질의에서12개 domain 결과와20000개 file ID를 동시에 검증한다.

`LibrarySearchService.prepare`가 snapshot의 표시 정보·정규화 문자열을 한 번 구성하고 `PreparedLibrarySearch`가 재사용한다. 초성은 정규화한 문자열에서 필요할 때 생성해 다시 정규화하지 않는다. fuzzy의 길이 차이 하한·row 최소값으로 불가능한 후보만 제외하고 DP 두 row를 재사용한다. 사용자 교정→태그→승인 정보와 작곡가/아티스트 구분, 미승인 경로 추론 제외는 기존 표시 정책을 사용한다. DB/schema16·패키지·원본·태그·권한·디자인 자산 변경은 없다.

`LibrarySearchSnapshot`의 revision은 library/files/candidates/overrides/merge/link immutable 참조 교체 때 증가한다. 가져오기·교정·승인·병합/undo·재연결·복원은 같은 경계로 무효화된다. 작은 입력(문서128·문자 예산16384 이하, 후보/교정 각256 이하, 이름별 별칭128 이하)은 inline, 나머지는 첫 실제 요청 때 worker를 시작한다. 문서 준비를 startup으로 옮기지 않으며 worker에 audio/image/widget/repository는 전달하지 않는다. worker는 DB·파일 IO 없이 전달된 메모리 값만 계산한다. revision이 같으면 다음 요청에는 snapshot을 다시 보내지 않는다.

backend마다 준비 snapshot 하나, coordinator 결과LRU8개·실행 하나·최신 대기 하나로 제한한다. 입력180ms debounce, query/generation/revision 일치 시에만 결과·오류를 publish한다. clear·화면 이탈·revision 교체는 이전 완료를 무시한다. 진행 중 계산을 매번 강제 종료하지 않아 연속 입력으로 worker가 반복 생성되지 않는다. 시작/요청15초 제한 또는 worker 오류는 일반 한국어 오류로 바뀌며 재시도 시 재연결한다. close/dispose는 timer·대기·캐시·port·worker를 정리한다. 오류 경로·개인 파일명은 화면이나 QA 로그에 넣지 않는다.

보관함 방문의 입력은 즉시 보존한다. 다른 보관함 화면으로 나갈 때 미시작 요청을 취소하고 뒤로 복귀하면 유효 캐시 또는 재요청을 사용한다. 새로운 검색 방문은 이전 방문 입력을 강제 주입하지 않는다. 현재 재생 상세를 여는 동안 같은 검색은 완료할 수 있고 복귀해 draft를 유지한다. 검색은 엔진 명령이 아니며 pause/next/seek와 별개다. 빈 입력·입력 대기·준비·검색·결과 없음·실패를 나누고 실패한 검색만 다시 검색한다.

## 측정 방법

macOS26.6.2(25G83), Flutter3.47.2 stable, Dart3.13.2 host/JIT, Xcode26.5(17F42). fixture는5000/20000파일, 각각12100/48400 검색 문서이며 동일6질의를3회씩 측정한다. `before-*.json`은 이번 작업에서 제품 수정 전에 수집한 raw 결과다. 과거2026-10-31 수치를 오늘 baseline으로 대체하지 않는다.

`tool/benchmark_library_search.dart [--stress]`의 `samplesMicros`는 매 요청마다 다시 준비하는 동기 API로 변경 전과 비교한다. `preparedSamplesMicros`는 준비 후3회이며 첫 초성 질의에는 지연 초성 비용이 포함된다. 준비 비용을 뺀 수치를 cold와 같은 작업인 것처럼 비교하지 않는다. trace의 normalization/composition은 준비 한 번, match/finish는 마지막 한국어 질의, fuzzyComparisons는 준비 객체로 실행한 전체 질의 누적이다. worker 측정은 시작·snapshot 전송·전체 파일 결과·왕복을 포함하고 같은revision과 새revision 첫 요청을 구분한다. RSS는 compiler·fixture·worker를 포함한 프로세스 high-water 값이며 검색 index 단독 메모리나 Xs 사용량이 아니다.

화면 반영은 widget 상태 assertion·실제 Flutter 캡처·준비 중 미니플레이어 조작과 native 검색 왕복으로 검증한다. event-loop heartbeat는 단일 긴 동기 차단이 제거됐는지에 대한 보조 증거이며16ms 프레임 보장·60fps·실기기 성능의 증거가 아니다. wall-clock에 짧은 PASS 임계치를 두지 않는다.

## 변경 전후 측정

단위ms, 각 칸은 최소/중앙/최대(n=3)다. cold는 같은 snapshot에서 매번 준비하는 기존 동기 API 형태, 준비 재사용은 준비 비용을 제외한 조회다. 동일 host/SDK/fixture/질의지만 프로세스 JIT·GC·다른 로컬 부하에 따른 변동은 있다. 통계적 성능 보장이나 기기별 SLA가 아니다.

| 5k 질의 | 변경 전 cold | 변경 후 cold | 준비 재사용 |
| --- | --- | --- | --- |
| 작곡가 99 작품 999 | 192.8/201.2/262.1 | 103.8/105.3/117.7 | 2.3/2.3/4.4 |
| ㅈㄱㄱ 99 | 191.7/197.5/199.1 | 120.4/120.6/125.1 | 3.7/3.8/21.0 |
| Composer 99 | 230.4/235.7/238.7 | 106.0/107.4/108.8 | 5.1/5.2/6.6 |
| CAT 999 | 191.6/192.3/192.5 | 101.4/106.5/111.5 | 2.6/2.6/2.7 |
| file-4999 | 293.6/297.6/298.4 | 111.8/112.2/112.7 | 9.9/9.9/10.9 |
| zzzzzz-not-found | 363.0/363.9/364.6 | 103.5/106.2/107.2 | 4.3/4.5/6.1 |

| 20k 질의 | 변경 전 cold | 변경 후 cold | 준비 재사용 |
| --- | --- | --- | --- |
| 작곡가 99 작품 999 | 808.5/820.6/956.4 | 428.6/429.6/443.7 | 10.6/10.6/21.5 |
| ㅈㄱㄱ 99 | 814.0/817.1/822.8 | 500.1/501.4/504.0 | 15.2/15.8/100.1 |
| Composer 99 | 973.8/978.7/980.3 | 434.1/440.3/442.3 | 21.8/22.0/22.9 |
| CAT 999 | 804.2/805.3/808.4 | 422.6/425.0/429.1 | 11.1/13.0/16.0 |
| file-4999 | 1250.9/1276.0/1708.5 | 453.7/457.4/463.7 | 45.2/45.4/45.4 |
| zzzzzz-not-found | 2371.0/2412.5/2456.0 | 428.6/430.4/437.7 | 18.7/19.0/22.6 |

첫 초성의 지연 비용은5k21.0ms/20k100.1ms sample에 남아 있다. 나머지 두 번만 warm으로 다시 라벨링해 숨기지 않았다. 진단 중 첫 초성에서 이중 정규화를 발견해 수정했고 마지막 fixture 일치를 다시 확인했다.

| 단계(ms) | 5k | 20k |
| --- | ---: | ---: |
| profile 준비(계측 overhead 포함) | 161.907 | 514.186 |
| 정규화 / 나머지 구성 | 96.809 / 65.098 | 361.183 / 153.003 |
| 준비 재사용 마지막 한국어 match / 정렬·중복·상한 | 2.436 / 0.027 | 10.692 / 0.032 |
| worker 첫 왕복(시작·전달·전체 파일 검색 포함) | 126.225 | 489.228 |
| 그 중 준비 / query·파일 결과 | 104.491 / 10.688 | 423.967 / 39.947 |
| 같은revision `file` 왕복 / 준비 | 17.671 / 0 | 38.727 / 0 |
| 새revision 첫 왕복 / 준비 | 120.577 / 110.945 | 486.555 / 432.368 |
| 5ms heartbeat 최대 간격 / 횟수 | 11.372 / 52 | 25.739 / 193 |

새revision 측정은 같은 내용의 새 파일 list와 revision2를 전달해 재준비 경계의 비용을 측정한다. metadata 승인·교정에 의한 결과 변경은 별도 backend test로 확인한다. query별 전체 scan·sort와 snapshot 복사는 남아 있어 첫 요청이 즉시 끝난다고 약속하지 않는다.

최대RSS raw bytes는 before5k381976576/20k388005888, after5k363610112/20k480215040이다. after 도구는 host 준비 문서와 worker·새revision 단계까지 포함하므로 이 차이를 index 하나의 추가 메모리 또는 앱의 실기기 증감으로 해석하지 않는다. 결과 캐시8개와 backend별 한 snapshot의 정책상 상한을 적용했지만 Xs 실제 사용량·메모리 pressure는 미검수다. 전체 raw 분포와 단계는 최종 evidence의 before JSON과 library-search/stress-search 로그로 재검산할 수 있다.

## 재현과 증거 정책

앱에서 `dart run tool/run_local_qa.dart --library-ux --captures --simulator <DDIRORI-QA UUID> --output build/library_search_qa`를 실행한다. 최종 실행은 소스 fingerprint before/after가 같아야 한다. 기본18개와 검색6상태×3조건18개 widget 이미지, 실제 simulator3개를 새 폴더에서 생성한다. 검색 widget capture는 지연/실패를 주입한 fake backend/controller, native 검색 capture는 합성 WAV와 실제 just_audio다. 시뮬레이터의20k worker 검사는 실제 Dart isolate이나 물리 디스크/오디오 성능 검사는 아니다.

진단 실행 중 최적화/문구 수정이 있었던 report는 sourceChanged로 남기고 최종 증거로 승격하지 않는다. images는 marker/PNG/hash/명령 exit code로 검사하고 직접 열어 시각적으로 확인한다. metadata의 빈 검색 scene은 로컬 준비/실패 capture 또는 스토어 촬영 승인을 대체하지 않는다.

## 최종 실행 결과

최종 실행은 `build/library_search_qa/run-97FoLf`, UTC2026-11-02 13:32:24~13:38:01이다. 앞선 `run-2vYj3E`, `run-UDmgc7`은 도중 수정으로 sourceChanged이며 최종 증거로 사용하지 않았다. 모든14검사가 passed이고 소스 before/after는 `bfb684581262adcf2e0fff882fa5f5aef507a025b10f453a345a1b0894c68d43`으로 같다.

| 검증 | 실제 결과와 근거 |
| --- | --- |
| format / 앱 전체 / analyze | format 통과,499개 앱 테스트 통과(이전474+새25),analyze issue 없음 |
| 의미·race·worker | 이전20질의 ID/type/rank/순서 일치. coordinator7개·backend4개·UI13개. 승인/교정 후 재준비,20k 전체 file IDs, 실제 event-loop 진행, 실패 재연결·startup dispose 검사 |
| 데이터 변경 | import/catalog/override/merge/relink/backup 기존 회귀 통과. 각 입력 참조가 같은 revision 경계를 통과하는 코드를 점검. 모든 조합의 실제 사용자 제공자 race를 개별 재현했다고 주장하지 않음 |
| fixture / decoder | 생성 fixture check, 합성 음원 decoder signal 검사 통과. 소리의 물리 가청 출력 증거 아님 |
| 규모·성능 | 기존5k/20k benchmark와 새 검색5k/20k benchmark exit0. 이 문서의 raw분포는 최종 library-search/stress-search 로그 |
| 실제 화면 | widget36개(기존18+검색18),simulator3개. PNG·로그 SHA 검산39개 일치. 대표 검색6상태와320px/2x 오류·1024px/2x dark 결과, native3개를 직접 열어 확인 |
| iOS | iPhone17Pro iOS26.5 전용 simulator, Xcode26.5. native파일 가져오기/실재생/검색/곡 선택/복귀1개,media1개·scene2개·worker1개,OS background2개로 고유7개 통과 |
| OS 앱 전환 | 실제inactive→hidden→paused→hidden→inactive→resumed.6초 전환 요청 중 index0→3,마지막12완료·위치 저장·복귀 Now Playing 일치. interruption 이벤트 주입은 실제 전화/물리 버튼 증거가 아님 |
| 배포 도구 | metadata13 tests/40 assertions 통과,prepare_ios_metadata mode:check 성공. source pending/content reviewed false. 서명·업로드·출시 없음 |
| diff | 최종 `git diff --check` 통과. 현재 변경과 이전 미커밋 변경·untracked 자료 보존 |

캡처 입력 label의 전환 중간 프레임을 발견해 의도적으로 대기 중인 backend는 유지하고250ms 화면 전환만 마친 뒤 촬영하도록 수정했다. 이전 이미지를 편집하거나 성공으로 바꾸지 않았다. semantics test는 진행 안내 label을 확인하며 실제 VoiceOver 발화 검수는 아니다.320px/2x에서는 긴 입력 label이 ellipsis 되지만 입력값·오류·다시 검색 행동은 접근 가능하다.

실행 명령은 QA runner가 기록한 로그 외에도 다음을 사용했다.

```sh
dart format lib test integration_test tool
dart run tool/run_local_qa.dart --library-ux --captures \
  --simulator <booted-DDIRORI-QA-UUID> --output build/library_search_qa
# deployment (기존 설치 bundle 경로를 BUNDLE_PATH로 참조)
bundle exec ruby -Ilib test/ios_metadata_test.rb
bundle exec fastlane prepare_ios_metadata \
  manifest:apps/classical-local-library/ios-metadata.yaml mode:check
git diff --check
```

[최종 report·로그·이미지](evidence/play-library-search-20261102/report.json), [실제 소스·기준 커밋·이미지 hash 인계](evidence/play-library-search-20261102/handoff.json)에 기록한다. worktree는 `/private/tmp/ddirori-play-library-context-20261031`, branch는 `feature/ddirori-play-library-context-20261031`, HEAD는 `cb29d398`이며 이번 작업도 미커밋이다. 기존 변경을 포함한 소스 hash와 tracked diff를 반환하며 원본 작업 트리로 복사·커밋·푸시·배포하지 않았다. 새 패키지·공통 API·브랜드 변경은 없다.

## 사용자 Xs 점검(5~10분)

1. 기존 개인 보관함에서 음원 하나를 재생한다. 제목/작곡가/초성/오타를 빠르게 입력·지우고 최신 입력 결과만 보이는지 확인한다. 검색 중 pause/next가 응답하고 큐·위치가 검색만으로 바뀌지 않아야 한다.
2. 검색 준비가 길어질 때 타이핑·스크롤·뒤로 이동하고 복귀한다. 기존 화면의 입력과 방문 정책을 확인하고 앱이 멈추거나 예전 결과가 다시 나타나는지 기록한다. 노래를 가져오거나 표시 정보를 교정한 뒤 새 값으로 검색한다.
3. VoiceOver로 입력·준비/결과 없음·다시 검색을 탐색한다. 실제 발화·focus 복귀를 확인한다. 파일 이름/경로/개인 메타데이터를 보고하지 않아도 된다.
4. Files/iCloud 선택·Bluetooth/유선·전화·화면 잠금의 실제 출력은 별도 물리 검수다. 이번 host/simulator 통과로 대체하지 않는다.

남은 한계는 큰 snapshot 첫 준비·복사와 첫 초성 지연, query별 전체 scan/정렬, 동작 중 이전 계산을 물리적으로 중단하지 않는 정책, real-library 메모리·열·성능이다. 새 검색 엔진/외부 API·배포는 추가하지 않았다.

# Studio alpha.42 이후 편집·조판 비교

기준은 게시된 `v0.1.0-alpha.42`의 `82ba969c26464b95b4ae5a3c51cca785ddf32c44`다. 결과는 별도 작업 트리 `feature/studio-post-alpha42-parity-20261122`의 미커밋 변경이다.

## 재생 중 믹서 변경과 샘플 피아노 유지음

재생 중 볼륨을 바꾸면 수동 페달로만 유지된 D4가 끊겼다. 같은 피치에서 악보 페달이 유지하던 파트만 다시 예약되는 현상을 960×750 dark와 1400×750 light에서 재현했다. live 설정이 준비될 때까지 기존 오디오 시계와 재생을 이어가고, 최신 요청이 현재 박에서 예약을 교체한다. 기존 두 음의 물리적 샘플 위치·레이어를 유지하고 새 믹서를 적용한다. 이미 시작한 해제는 전환에서 정리하고, 끝난 샘플이나 이전 미래 타건은 이어받지 않는다.

- 두 폭에서 볼륨 변경 전후의 두 D4가 원래 0.125초 차이로 이어졌다. 음소거·솔로가 제외한 파트만 정리하고 계속 들리는 파트의 오프셋을 보존했다. 다시 들리는 파트의 활성 악보 페달은 기존 구간 재생을 따른다.
- 지연시킨 볼륨 요청이 최신 음소거 뒤 실패해도 소리와 UI를 덮지 않았다. 정지 뒤 늦은 성공, 악보 교체 뒤 늦은 실패도 새 예약을 만들지 않았다. 악보 끝을 지난 응답과 첫 예약 전에 들어온 변경은 집중 검사로 검증했다.
- 앱의 전역 빠르기는 기보 편집이다. 두 폭에서 편집 시 재생 정지와 새 BPM 저장을 확인했다. 재생 전용 빠르기 경로는 훅과 실제 샘플러의 오프라인 렌더로 검증했다. 120→180 BPM에서 D4의 약 0.658초 샘플 위치를 유지했고 다음 G4는 새 빠르기의 약 1.124초에 시작하도록 예약됐다.
- 1.5초 연습 루프의 마지막 박에서 볼륨을 바꿔도 다음 회차의 경계와 새 타건이 유지됐다. 루프 끝 1ms 전의 전환 페이드가 정지 예약을 약 2ms 연장하던 실패를 재현하고 정지를 원래 경계 이내로 제한했다.
- 직전 같은 위치 재개, 일반 음과 독립 헤어핀을 두 폭에서 다시 검증했다. Native v2·v3, MusicXML, MIDI 바이트와 PDF 래스터가 직전 결과와 일치했다. 고정 XSD 6건, 파트별 댐퍼 위치·값과 MIDI CC64 순서, D4 시작·음 길이, 독립 헤어핀 20,160 tick을 확인했다. 앱 도움말의 믹서 안내를 갱신하고 두 폭에서 검색했다.
- 집중 검사 37파일·413건과 타입 검사 포함 생산 빌드가 통과했다. 누적 `npm run test:all`은 1,766.96초에 종료 코드 0으로 끝났다. Vitest 797파일·7,759건과 Node 도구 5건이 통과했고 외부 opt-in 1건을 건너뛰었다. 고정 입력 6,602개가 종료 시점과 독립 확인에서 모두 일치했다.
- 첫 전체 검사 뒤 초기 Electron 실행 실패가 남긴 대기 프로세스를 발견했다. 당시 빌드에 실행 진입점이 없고 렌더러 자식 프로세스도 없었다. 자체 프로세스를 종료한 뒤 전체 검사를 다시 실행했다. 재검사는 1,764.68초에 종료 코드 0으로 끝났고 Vitest 797파일·7,759건과 Node 도구 5건이 다시 통과했다. 외부 opt-in 1건을 건너뛰었고 독립 검사에서도 고정 입력 6,602개가 일치했다. 종료 근거는 `live-piano-settings-20261125/idle-launch-cleanup.json`에 있다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 수정 전 실제 결함과 최종 두 폭 | `live-piano-settings-baseline-c-20261125/results.json`, `live-piano-settings-app-checked-20261125/results.json`, `live-piano-settings-boundaries-checked-20261125/results.json` |
| 도움말과 직전 재생 회귀 | `live-piano-settings-help-checked-20261125/results.json`, `live-piano-settings-prior-resume-b-20261125/results.json`, `live-piano-settings-prior-release-20261125/results.json` |
| WAV·파일·실패·해시 | `live-piano-settings-20261125/offline-checked/wave-reviewed.json`, `live-piano-settings-20261125/outputs-reviewed.json`, `live-piano-settings-20261125/loop-release-red.log`, `live-piano-settings-20261125/source-and-artifacts.json` |
| 첫 전체 회귀 | `live-piano-settings-full-20261125/`의 `test-all.log`, `receipt.json`, `independent-verify.json`, `post-completion-docs.json` |
| 자체 프로세스 정리 뒤 전체 재검사 | `live-piano-settings-full-clean-20261125/`의 `test-all.log`, `receipt.json`, `independent-verify.json`, `prior-input-comparison.json`, `post-exit-processes.json`, `post-completion-docs.json` |

실제 앱은 오디오를 음소거하고 예약을 관측했다. 음원 비교는 격리 오프라인 WAV로 진행했다. 물리 장치 청취는 미검증이다. 다음 작업에서 임의 위치 탐색의 수동 유지음 복원이나 재생 전용 빠르기 UI가 필요하면 제품 범위를 확인한다.

## 같은 위치에서 수동 페달 음 재개

승인된 범위는 같은 악보의 일시정지 위치에서 계속 재생하는 것이다. 일시정지 순간의 실제 수동 유지음과 샘플 오프셋을 보관한다. 재개 시 같은 파트·음 이벤트를 한 번만 만들고 해당 샘플 위치에서 이어간다. 실제로 시작하지 않았거나 자연 종료한 소스는 보관 대상에서 제외한다. 현재 회차에서 보관한 음은 재개한 구간에 적용한다.

- 960×750 dark와 1400×750 light의 두 파트 D4에서 악보 페달 음과 수동 유지음을 각각 재개했다. 수동 유지음의 샘플 위치는 약 0.618초와 0.624초였고 원래 두 타건의 0.125초 차이를 유지했다. 연속 재개와 같은 위치의 피아노 미리 듣기 뒤에도 실제 샘플 위치가 이어졌다.
- 일시정지 중 수동 페달 해제와 다시 켜기, 최신 음소거·솔로, 정지와 새 선택 위치의 재생, 악보 교체를 확인했다. 재개 응답을 지연시켜 악보·루프 교체 뒤의 늦은 결과와 대기 중 페달 및 믹서 변경을 대조했다. 다른 악보나 루프로 이동하면 이전 예약을 정리한다.
- 두 번째 루프 회차에서 포착한 수동 유지음은 재개한 부분 회차의 끝까지 적용됐다. 다음 회차는 원래 경계에서 새 타건으로 시작한다. 샘플 레이어 일부의 자연 종료, 빠르기와 믹서 볼륨을 바꾼 뒤 원래 샘플 위치·레이어의 보존과 현재 게인은 집중 검사로 확인했다.
- 실제 제품 트랜스포트로 오프라인 WAV 5개를 만들었다. 약 0.658초를 보관해 재개한 파형은 같은 오프셋을 쓴 직접 샘플 대조와 PCM 전체가 일치했다. 두 번 재개할 때 보관 오프셋은 0.658초에서 0.828초로 진행했다. 페달을 해제한 대조는 재개 구간이 무음이었고 자연 종료한 샘플은 기록되지 않았다.
- Native v2·v3, MusicXML, MIDI가 이전 실제 결과와 바이트 일치했고 PDF는 래스터가 일치했다. MusicXML 6건이 고정 XSD를 통과했다. 기보 길이, 파트별 페달과 MIDI CC64, 독립 헤어핀의 20,160 tick을 대조했다. 새 동작을 앱 도움말에 반영하고 두 폭에서 검색을 확인했다.
- 집중 검사 37파일·408건과 타입 포함 생산 빌드가 통과했다. 누적 `npm run test:all`은 1,768.69초에 종료 코드 0으로 끝났다. Vitest 797파일·7,754건과 Node 도구 5건이 통과했고 외부 opt-in 1건을 건너뛰었다. 고정 입력 6,602개는 실행 종료 시점과 독립 확인에서 모두 일치했다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 실제 앱 재개·루프 및 지연 응답 | `piano-manual-hold-resume-app-a-20261125/results.json`, `piano-manual-hold-resume-late-20261125/results.json` |
| 이전 재생 경로와 도움말 | `piano-manual-hold-resume-prior-20261125/results.json`, `piano-manual-hold-resume-help-20261125/results.json` |
| 오프라인 음원·출력·소스 해시 | `piano-manual-hold-resume-20261125/offline/renders.json`, `piano-manual-hold-resume-20261125/offline/wave-reviewed.json`, `piano-manual-hold-resume-20261125/outputs-reviewed.json`, `piano-manual-hold-resume-20261125/source-and-artifacts.json` |
| 전체 회귀 | `piano-manual-hold-resume-full-20261125/test-all.log`, `piano-manual-hold-resume-full-20261125/receipt.json`, `piano-manual-hold-resume-full-20261125/independent-verify.json`, `piano-manual-hold-resume-full-20261125/post-completion-docs.json` |

임의 위치 탐색에서 이전 음을 재구성하는 범위는 별도 정책이다. 실제 앱에서는 음소거한 예약을 관측했고 음향은 오프라인 WAV로 대조했다. 물리 장치 청취와 외부 앱 재저장은 미검증이다.

## 일시정지 중 페달·믹서·연습 루프 검증

- 현재 생산 빌드의 960×750 dark와 1400×750 light에서 수동 페달 상태 유지, 일시정지 중 해제와 다시 켜기, 음소거·솔로 갱신, 정지, 새 선택 위치 재생, 악보 교체, 같은 루프 중간 재개를 확인했다. 악보 댐퍼가 유지하는 D4는 원래 샘플 위치에서 재개했다. 수동 페달만 유지하던 D4는 수동 체크가 켜진 채로도 재개되지 않았다.
- 일시정지 중 0.75초 루프를 G4 하나의 0.125초 루프로 바꾸고 수동 체크를 유지했다. 두 폭에서 새 G4는 오프셋 0으로 반복됐고 이전 구간의 D4는 돌아오지 않았다.
- 후속 검증에서 실제 Electron의 오디오 재개 응답만 지연시킨 뒤 완료 순서를 제어했다. 두 폭에서 정지 후의 늦은 성공, 새 악보 재생 뒤의 늦은 성공과 실패, 루프 교체 뒤의 늦은 성공을 확인했다. 이전 요청의 소리·오류는 새 재생에 전달되지 않았다. 동일 요청을 계속 기다리는 동안 페달 해제와 음소거를 변경한 대조에서는 최신 상태가 적용됐다.
- 오프라인 WAV에서 자연 종료가 예정된 샘플의 마지막 0.75초를 재생했다. 수동 페달이 더 오래 유지된 상태에서도 0.81초 이후는 무음이었다. 수동 페달로만 이어지던 D4를 0.658초 샘플 위치에서 이어 듣는 별도 대조도 준비했다. 이 대조는 제품 샘플러를 직접 호출해 복원 후보의 소리를 확인한 결과다.
- 실제 Native v2·MusicXML·MIDI가 직전 산출물과 바이트 일치했고 PDF 래스터가 일치했다. MusicXML 6건이 고정 XSD를 통과했다. 이전 전체 검사의 문서 제외 입력 1,579개와 생산 빌드 132개가 그대로였다. 이 검증에서는 제품 소스를 유지하고 직전 전체 회귀 7,750건·Node 5건의 기록을 재사용했다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 두 화면 폭의 상태 전환·출력 | `piano-manual-pedal-resume-baseline-b-20261125/results.json`, `piano-manual-pedal-loop-change-20261125/results.json` |
| 지연된 재개와 최신 요청 상태 | `piano-late-paused-resume-final-20261125/results.json`, `piano-manual-pedal-resume-20261125/late-resume-verified.json` |
| 재개 후보와 기준 실패 | `piano-manual-pedal-resume-20261125/proposal.md`, `piano-manual-pedal-resume-20261125/app-restore-red.log` |
| WAV와 파일·소스 검증 | `piano-manual-pedal-resume-20261125/offline-baseline/renders.json`, `piano-manual-pedal-resume-20261125/offline-reference/renders.json`, `piano-manual-pedal-resume-20261125/baseline-b-reviewed.json`, `piano-manual-pedal-resume-20261125/baseline-source-verify.json` |

재개 정책은 답변 대기다. 같은 악보의 일시정지 위치에서 실제로 울리던 수동 페달 음만 복원하는 안과 현행 동작을 도움말에 적는 안을 비교했다. 아직 울리지 않은 예약·이미 종료한 샘플·새 위치·다른 악보와의 격리를 복원안의 수용 기준으로 둔다. 물리 장치 청취는 미검증이다.

## 악보 댐퍼와 수동 서스테인의 릴리스

같은 D4를 연주하는 두 파트 중 하나에만 악보 댐퍼를 넣었다. 120 BPM 대조에서 악보 페달은 1.00초에 떼고 다시 밟으며 1.75초에 최종 해제한다. 기존 앱에서는 수동 페달을 약 1.19초에 떼면 두 파트가 함께 풀렸다. 수정 뒤 페달 표식이 있는 파트는 1.75초, 다른 파트는 수동 페달을 뗀 시각에 풀린다. 수동 페달을 중간에 다시 밟는 경우에는 기존 release 시각 대신 현재 예약된 release를 취소한다.

- 960×750 dark와 1400×750 light에서 악보 페달만, 수동을 먼저 뗌, 악보 페달을 다시 밟은 구간에서 수동을 뗌, 수동을 나중에 뗌을 대조했다. 2박부터 60 BPM인 대조에서는 같은 3.5박 해제가 2.50초에 예약됐다.
- 실제 앱에서 건반을 뗀 음을 0.75초 샘플 오프셋에서 재생하고 일시정지 뒤 남은 위치에서 다시 재생했다. 악보 페달이 해제된 뒤에는 해당 음을 다시 시작하지 않았다. 종결 지시가 없는 악보의 반복 복귀에서 이전 음을 풀고 새 회차를 타건했다. 두 페달을 켠 연습 루프에서는 0.125초 경계에서 이전 소스를 자르고 악보 교체 때 남은 예약을 취소했다.
- 오프라인 WAV 15개에서 파트 격리, 다시 밟은 수동 페달, 탐색·반복·루프를 확인했다. 악보 페달이 남은 파트는 1.75초 지점에 직접 릴리스를 예약한 대조와 WAV 바이트가 일치했다. 루프 정지 직전 이미 시작한 소리의 짧은 페이드는 오디오 출력 그래프의 처리 지연을 포함해 0.55423초에 끝났다. 0.56초 이후는 무음이었다. 누적 검사 뒤 같은 생산 빌드에서 수동 페달을 첫 0.75초 루프의 중간에 떼는 경로를 두 폭에서 추가 확인했다. 첫 회차는 끝 경계까지 이어지고 다음 회차는 악보 페달만 적용해 시작 0.25초에 릴리스를 시작했다. 별도 WAV도 첫 회차 끝 직전의 신호와 다음 회차 릴리스 후의 무음을 확인했다.
- MusicXML 8개는 고정 XSD를 통과했다. 실제 Native v2와 이전 독립 헤어핀 Native v3, MusicXML·MIDI는 전후 바이트가 일치했다. PDF는 래스터가 일치했다. MusicXML의 위치·파트·값과 MIDI 트랙의 CC64 순서, 원래 D4 음 길이를 독립 디코딩으로 대조했다. 앱 도움말에 두 페달의 해제 조건을 반영했다.
- 재생 집중 검사 37파일·404건과 타입을 포함한 생산 빌드가 통과했다. 전체 `npm run test:all`은 1,778.75초 만에 종료 코드 0으로 끝났다. Vitest 797파일·7,750건과 Node 도구 5건이 통과했고 외부 opt-in 1건을 건너뛰었다. 종료와 독립 확인 모두에서 고정 입력 6,602개가 일치했다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 기존 두 폭과 실패 검사 | `piano-pedal-overlap-before-20261125/results.json`, `piano-pedal-overlap-20261125/red.log` |
| 최종 두 폭과 도움말 | `piano-pedal-overlap-app-final-20261125/results.json`, `piano-pedal-overlap-help-20261125/results.json`, `piano-pedal-overlap-prior-release-20261125/results.json` |
| WAV와 파일 비교, 해시 | `piano-pedal-overlap-20261125/waves/renders.json`, `piano-pedal-overlap-20261125/waves/wave-reviewed.json`, `piano-pedal-overlap-20261125/outputs-reviewed.json`, `piano-pedal-overlap-20261125/source-and-artifacts.json` |
| 회차 사이의 수동 페달 해제 | `piano-pedal-overlap-loop-retake-20261125/results.json`, `piano-pedal-overlap-20261125/loop-wave/wave-reviewed.json` |
| 전체 회귀 | `piano-pedal-overlap-full-20261125/test-all.log`, `piano-pedal-overlap-full-20261125/receipt.json`, `piano-pedal-overlap-full-20261125/independent-verify.json` |

재개 대조에서 수동 체크는 유지됐으나 수동 페달로만 이어지던 파트의 음은 복원되지 않았다. 악보 페달이 기록된 파트의 음만 원래 샘플 위치에서 다시 시작했다. 일시정지에서 실제로 남은 수동 페달 음만 복원하는 안과 현행 재개를 설명서에 명시하는 안을 다음 결정으로 기록한다. 임의 탐색까지 적용할지와 악보 교체에서 이전 예약 격리도 별도 수용 기준이다. 물리 장치 청취와 실제 OS 파일 대화상자는 미검증이다.

## 샘플 피아노의 릴리스 시작 시각

일반 샘플 음의 유지 세기를 기존 샘플 재생 끝까지 명시한다. 정상 재생과 미리 듣기는 지정한 key-off에서 기존 0.22초 릴리스를 시작한다. 미래 key-off 전에 수동 페달을 밟으면 유지 세기를 복원하며, 이미 놓인 음은 페달을 뗀 뒤 풀린다. 정지 시 앞으로 예정된 소스는 타건 전에 취소하며, 이미 울리는 소리에는 기존 짧은 페이드를 적용한다.

- 이전 Chromium에서 미래 릴리스를 예약하면 일반 D4의 릴리스 직전 RMS가 같은 음원과 타건을 사용한 정시 예약의 약 0.427배로 내려갔다. 이벤트 끝점 헤어핀과 미리 듣기도 재현됐다. 수정 후 같은 구간은 세 경우에서 모두 1.000이었다. 페달을 떼었을 때 key-off가 아직 미래인 경우와 예약된 key-off를 취소하고 나중에 페달을 떼는 경우도 정시 대조와 일치했다.
- 교체 전후 각각 38개의 오프라인 WAV를 렌더링했다. 독립 끝점의 크레셴도·디미누엔도, 두 중간 탐색, 크레셴도 루프 PCM은 일치했다. 정지 뒤 4ms 후 예정된 소스의 누출을 재현했고, 수정 뒤 해당 구간은 무음이다.
- 960×750 dark와 1400×750 light의 격리 앱에서 일반·이벤트 끝점·독립 끝점, 미리 듣기, 두 페달 순서, 같은 음높이의 겹침, 탐색·일시정지와 재개·정지·루프·악보 교체를 확인했다. Native v2·v3, 20,160 tick MusicXML과 MIDI는 이전 파일과 바이트가 일치했다. MusicXML 14개가 고정 XSD를 통과했고 PDF 두 개의 래스터가 이전 출력과 일치했다. 페달 설명은 앱 도움말에도 반영했다.
- 샘플 재생 집중 검사 37파일·403건과 타입 검사를 포함한 생산 빌드가 통과했다. 전체 `npm run test:all`은 1,788.57초 만에 종료 코드 0으로 끝났다. Vitest 797파일·7,749건 및 Node 도구 5건이 통과했고 외부 opt-in 1건을 건너뛰었다. 고정 입력 6,602개의 해시가 종료 시와 독립 확인에서 모두 일치했다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 실패·집중 검사·생산 빌드 | `piano-release-20261124/red.log`, `piano-release-20261124/focused.log`, `piano-release-20261124/final-build.log` |
| 수정 전후 WAV와 RMS | `piano-release-20261124/before/renders.json`, `piano-release-20261124/after/renders.json`, `piano-release-20261124/after/wave-reviewed.json` |
| 실제 앱과 도움말 | `piano-release-app-final-20261124/results.json`, `piano-release-help-final-20261124/results.json` |
| 출력·소스·빌드 해시 | `piano-release-20261124/outputs-reviewed.json`, `piano-release-20261124/source-and-artifacts.json` |
| 누적 검사 | `piano-release-full-20261124/test-all.log`, `piano-release-full-20261124/receipt.json`, `piano-release-full-20261124/independent-verify.json` |

예약은 음소거한 앱에서 확인했고, 파형은 같은 Chromium의 오프라인 오디오로 비교했다. 물리 장치 청취와 실제 OS 파일 대화상자는 미검증이다.

## 샘플 피아노에서 울리는 음의 헤어핀

MusicXML에서 가져온 독립 종료 박의 헤어핀은 샘플 피아노에서 같은 음의 세기를 이어서 바꾼다. 원래 타건의 샘플 레이어와 길이, 탐색한 위치의 샘플 오프셋, 기존 릴리스 시각을 사용한다. 이벤트에 연결된 헤어핀의 샘플 동작과 MIDI 타건 세기 계약은 유지한다. 보표와 성부는 기존 재생 곡선과 같은 범위를 따른다.

- 스케줄의 현재 위치와 템포를 사용한다. 독립 1.5박 끝점의 D4는 120 BPM에서 0.50초에 시작해 0.75초에 목표 세기에 도달하고 1.00초에서 원래 길이가 끝난다. 기존 Chromium에서 미래 릴리스 페이드가 앞당겨지는 것을 최소 오디오 그래프로 재현했다. 이 세기 곡선의 마지막 값을 명시적으로 잡아 두어 정지·루프·페달 릴리스가 지정 시각에 시작되도록 한다.
- 생산 빌드 960×750 dark와 1400×750 light에서 실제 음표 포인터와 Enter로 누른 재생 컨트롤의 예약을 관측했다. 변화 전·중·후의 선택 위치 재생, 변화 중 일시정지·재개, 종료 박 이전에 잘리는 0.125초 루프, 최근 악보 교체 시 대기 소스 취소, 크레셴도·디미누엔도와 이벤트 끝점 대조를 확인했다. 사전 실행의 뷰포트 가시성 실패는 제품 오디오 실패와 분리해 보존했다.
- 같은 타건 레이어의 오프라인 WAV 16개를 비교했다. 변화가 없는 기준 대비 0.75초 이후의 RMS 비율은 크레셴도 1.07785, 디미누엔도 약 0.88697로 음의 원래 끝 직전까지 유지됐다. 재개와 루프 세 바퀴에서 변화 방향과 반복 경계를 확인했다. 실제 장치 청취는 후속이다.
- Native v3 및 일반 v2의 실제 재열기와 재저장, 구조 MusicXML·MIDI 각 두 개의 바이트 일치, XSD 10건과 PDF 두 개의 래스터 일치를 확인했다. 아래 보표의 종료 20,160 tick·성부 3과 MIDI의 D4 시작 1박·지속 1박·타건 100을 보존했다. 앱에서 도움말 검색과 해당 절의 새 문구를 두 폭에서 확인했다.
- 재생 관련 Vitest 37파일·401건과 타입 포함 생산 빌드가 통과했다. 전체 `npm run test:all`은 1,936.96초 만에 종료 코드 0으로 끝났다. Vitest 797파일·7,747건과 Node 도구 5건이 통과했고 외부 opt-in 1건을 건너뛰었다. 고정 입력 6,602개는 종료 시와 독립 확인에서 모두 일치했다. 이후에는 인계·실행 큐·evidence-log의 이 결과만 갱신했다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 초기 실패·Chromium 오디오 재현 및 집중 회귀 | `hairpin-piano-sustain-20261124/red.log`, `hairpin-piano-sustain-20261124/audio-param-hold-probe.json`, `hairpin-piano-sustain-20261124/playback-focused-verified.log` |
| 생산 앱·도움말의 두 화면 폭 | `hairpin-piano-sustain-app-final-c-20261124/results.json`, `hairpin-piano-sustain-help-20261124/results.json` |
| 오프라인 음원과 출력 대조 | `hairpin-piano-sustain-20261124/offline-final/renders.json`, `hairpin-piano-sustain-20261124/offline-final/rms-verified.json`, `hairpin-piano-sustain-20261124/outputs-reviewed.json` |
| 소스·빌드·실제 산출물 해시 | `hairpin-piano-sustain-20261124/source-and-outputs.json` |
| 전체 회귀 | `hairpin-piano-sustain-full-20261124/test-all.log`, `hairpin-piano-sustain-full-20261124/receipt.json`, `hairpin-piano-sustain-full-20261124/independent-verify.json` |

실제 출력은 임시 프로필과 파일 선택 어댑터로 만들었다. 오디오 예약은 음소거한 실제 앱에서 관측했고 음향 변화는 오프라인 WAV로 검증했다. 파일 대화상자, 물리 오디오 청취 및 외부 앱 재저장은 미검증이다.

후속 재현은 기존 샘플 피아노의 미래 릴리스다. `audio-param-hold-probe.json`에서 뒤에 예약한 릴리스가 선행 세기까지 낮추는 조건을 확인했다. 일반 긴 음과 이벤트 끝점 헤어핀에서 같은 샘플의 릴리스 전·후 WAV를 비교하고, 점검 결과가 기존 음색·페달·프리뷰에 미치는 범위를 결정한다.

## 가져온 헤어핀의 독립 종료 박

- 승인한 모델은 같은 보표의 마디 ID·성부 ID·정확한 tick을 끝점으로 저장한다. 두 `divisions` 및 커서 기준 양수·음수 오프셋으로 표현한 여섯 입력의 1.5박은 20,160 tick으로 왕복했다. 원본 성부 7은 Studio의 기존 성부 배정에서 성부 3으로 표시되며 종료 주소는 같은 아래 보표와 성부를 가리킨다. 소수 tick은 오류를 알리고 열린 악보와 미저장 편집을 유지했다. 기존 음 시작·길이 끝 및 같은 tick의 역할 표식이 유지된다.
- 시간 끝점이 있는 Native는 v3으로 저장된다. 선을 삭제한 뒤에는 v2, 실행 취소 뒤에는 v3으로 저장되고 다시 열렸다. 실제 앱에서 재저장한 일반 v2와 끝점을 삭제한 v2 각 두 건은 alpha.42 태그 디코더가 읽었다. 새 앱이 내보낸 v3 두 건은 명시적인 버전 오류가 났고 원본 해시가 유지됐다. 새 앱 도움말에서 지원 앱으로 다시 열기와 편집 범위를 확인했다.
- 960×750 dark와 1400×750 light에서 실제 선의 닫힘, 속성의 마디·성부·1.5박, 수동 배치, 시스템 및 페이지 나누기를 확인했다. PDF 12개를 래스터화해 같은 분기의 두 폭이 일치했다. 1.5박 대조의 PDF에서 아래 보표 D4와 E4의 음머리는 약 415px과 651px에, 헤어핀 끝은 526px에 있었다. 페이지 나누기는 두 번째 쪽에 끝 조각을 표시했다.
- 선 선택·삭제·원복과 끝점 앞 마디 삽입은 실제 명령으로 검증했다. 종료 마디 삭제와 보표 및 총보의 1/4 축소에서 해당 마디·종료 박을 안내하고 기존 선택과 미저장 편집·실행 취소 이력을 유지했다. 안전한 총보 3/4 변경은 한 번의 실행 취소로 두 보표를 되돌렸다. 빈 첫 마디 길이 명령에서도 시간 끝점을 마디 밖으로 밀어내는 경우를 보호한다.
- 원래 1박에 시작해 1박 지속하는 D4에서 내부 세기 변화가 1.5박에 종료됐다. 실제 MIDI에서 D4의 시작·지속·음높이는 같고 타건 세기는 대조 75에서 100으로 바뀌었다. 이후 음과 위 보표의 MIDI는 같았다. 수동 배치 또는 줄·페이지 변경 전후의 MIDI도 동일했다.
- 오프라인 WAV는 두 엔진을 분리했다. 기존 오실레이터 경로의 세기 변화는 120 BPM에서 0.75초에 목표값에 도달했다. 대조 WAV 대비 RMS 비율은 전후 구간에서 약 1.36, 1.44, 1.50, 1.50이었다. 샘플 피아노는 0.5초 타건 세기가 달라지고 1.0초에서 두 대조 모두 건반을 뗀다. 샘플 재생의 지속음 중간 세기 변화는 별도 구현 범위다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 가져오기 실패 재현 및 관련 검사 | `hairpin-time-endpoint-20261124/red.log`, `hairpin-time-endpoint-20261124/related-b.log` |
| 생산 빌드, 다중 보표의 실제 앱과 도움말 | `hairpin-time-endpoint-20261124/release-qa-build.log`, `hairpin-time-endpoint-release-app-20261124/results.json`, `hairpin-time-endpoint-release-help-20261124/results.json` |
| 고정 XSD 28개·PDF 12개·MIDI와 구형 리더 | `hairpin-time-endpoint-20261124/outputs-reviewed.json`, `hairpin-time-endpoint-20261124/actual-tagged-decoder.json` |
| 내부 세기 곡선과 오프라인 WAV | `hairpin-time-endpoint-20261124/playback-probe.json`, `hairpin-time-endpoint-20261124/offline/renders.json`, `hairpin-time-endpoint-20261124/offline/rms.json` |
| 동일 소스의 전체 회귀 및 입력 | `hairpin-time-endpoint-full-20261124/test-all.log`, `hairpin-time-endpoint-full-20261124/receipt.json`, `hairpin-time-endpoint-full-20261124/inputs.json` |

관련 모듈 396파일·4,361건과 생산 빌드가 통과했고 외부 opt-in 1건을 건너뛰었다. 전체 `npm run test:all`은 종료 코드 0으로 끝났다. Vitest 796파일·7,740건과 Node 도구 5건이 통과했고 외부 opt-in 1건을 건너뛰었다. 1,854.11초 동안 고정한 입력 6,601개의 해시가 종료 시와 독립 확인에서 일치했다. 검증 기록을 마친 뒤 이 인계와 실행 큐·수용 기준·evidence-log에 결과를 반영했다. 앱 검증은 격리 파일 선택 어댑터를 사용했다. 물리 오디오 청취와 외부 앱 재저장은 기존 범위로 남는다.

## MusicXML 커서 오프셋의 1.5박 대조

4분음표 기준 1박 시점의 +0.5박과 2박 시점의 −0.5박을 `divisions=1` 및 `8`로 각각 표현했다. 두 폭의 실제 앱에서 네 입력은 모두 원본 42마디·보표 2·성부 7·20,160 tick 진단을 냈다. 20,160.1344 tick과 같은 소수 위치의 두 입력은 방향 오프셋 변환 오류를 냈다. 열려 있던 악보와 선택·미저장 상태·실행 취소 기록을 보존했다. 여섯 입력은 고정 XSD를 통과했고 파일 해시가 유지됐다. 이 결과는 시간 끝점 모델 도입 전 기준으로 사용한다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 대조군과 정확한 유리수 tick | `hairpin-offset-order-input-20261124/inputs.json`, 같은 폴더의 `xsd.log` |
| 실제 앱 12건과 원본·재저장·실행 취소 파일 | `hairpin-offset-order-app-20261124/results.json`, `hairpin-offset-order-app-20261124.log` |
| 명령·소스·산출물 해시 | `hairpin-offset-order-evidence-20261124.json` |

## 시간 끝점 저장 후보와 다중 보표 박자 보호

- 1.5박 대조의 두 divisions가 20,160 tick임을 확인했다. 기존 음 시작 26,880 tick과 길이 끝 53,760 tick도 대조했다. 인계의 소스·스크립트·빌드·산출물 452개가 일치했다.
- alpha.42 태그 디코더는 일반 v2를 열었다. 20,160 tick의 시간 주소 후보에서 v2는 필드 오류를, v3는 지원하지 않는 버전 오류를 보고했다. 도입 전 생산 앱의 두 화면 폭에서도 공개 열기 명령과 기술 정보로 이 차이를 확인했다. 두 실패에서 기존 악보·이력·재저장 내용과 후보 파일 해시가 유지됐다.
- Piano의 위 보표는 온마디 쉼표이며 아래 보표만 명시적으로 쉼표의 길이 끝에 헤어핀이 연결된다. 위 보표의 3마디에서 총보 9/16을 적용하면 ‘Piano 보표 2’ 문제를 안내한다. 두 폭에서 위·아래 보표 모두 4/4, 선택과 미저장 상태·실행 취소 이력 및 Native 재저장 해시를 유지했다. 3/4 적용은 두 보표를 한 번에 바꿨고 거부 뒤 다시 실행이 가능했다.
- 아래 보표의 쉼표 시작을 참조하는 대조군에서는 같은 9/16이 두 보표에 함께 적용됐다. 아래 보표의 두 쉼표 시작은 13,440 및 26,880 tick이었고 첫 쉼표의 기존 참조를 유지했다. 실행 취소 한 번으로 두 보표가 원복됐고, 다시 실행과 Native 재열기도 확인했다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 태그 디코더와 시간 주소 후보 3개 | `hairpin-time-anchor-policy-20261124/tagged-reader.json` |
| 기존 앱의 후보 오류·이력·원본 보존 | `hairpin-time-anchor-policy-app-20261124/results.json` |
| 두 보표의 9/16 거부와 적용·실행 취소 | `hairpin-grand-staff-meter-20261124/results.json` |
| 고정 XSD·집중 검사·실행 명령과 해시 | `hairpin-time-anchor-policy-20261124/focused.log`, `hairpin-time-anchor-policy-20261124/xsd.log`, `hairpin-time-anchor-policy-20261124/evidence.json` |

집중 검사 37건과 원본 MusicXML 두 건의 고정 XSD가 통과했다. 다중 보표는 기존 생산 빌드로 현행 동작을 확인했다. 시간 끝점 모델 구현의 재개 조건은 최초 편집 범위, Native 저장 형식, 마디 변경으로 주소가 무효가 되는 경우의 처리 승인이다. [수용 기준](hairpin-time-anchor-acceptance.md#최초-제공-범위-제안)

## 박자·음가와 마디 구조 변경의 헤어핀 끝점

- 960×750 dark와 1400×750 light의 격리 생산 앱에서 3마디 C5를 2박에서 1박 길이로 줄였다. 음 시작 종료는 13,440 tick·1성부에 남았다. 길이 끝 종료는 40,320에서 26,880 tick으로 이동했고 같은 음을 참조했다. 3/4가 C5 전체를 담는 경우 적용됐고, 2/4는 음표를 자르게 되어 거부됐다. 거부 뒤 선택한 3마디, 미저장 편집, 한 번의 수정 기록이 유지됐다. 실행 취소·다시 실행의 Native 데이터와 MusicXML 재열기를 확인했다.
- 기존 빌드는 9/16으로 줄인 쉼표를 4분쉼표와 16분쉼표로 분할했다. 마디 시작 기준 끝은 30,240 tick이지만 길이 끝 헤어핀은 원래 ID가 남은 첫 쉼표의 26,880 tick에서 닫혔다. MusicXML 사본에도 그 위치가 저장됐다. 두 범위의 집중 회귀가 수정 전에 실패했다.
- 이제 길이 끝으로 연결된 쉼표를 여러 개로 나눠야 하는 박자 변경은 기존 표기 보호 경로에서 거부한다. 보표와 총보의 사용자 지정 적용에서 선택·악보·미저장 상태·실행 취소 기록을 보존하고 거부 뒤 다시 실행으로 3/4를 복원했다. 쉼표 하나로 줄일 수 있는 경우와 쉼표 시작에 연결된 경우는 적용됐다. 앱 도움말의 `마디 박자표와 변박자`에서 이 조건을 두 화면 폭으로 확인했다.
- 끝점 앞에 마디를 삽입하고 끝점과 무관한 인접 마디를 제거하면 살아 있는 이벤트 ID와 기존 줄·페이지 나누기가 유지됐다. 마디를 삽입하면 새 쉼표가 선택된다. 종료 마디를 제거하면 거기에 연결된 길이 끝 헤어핀과 그 마디의 페이지 나누기가 함께 빠지고 다음 마디의 음 시작 헤어핀은 유지됐다. 각 구조 변경의 실행 취소·다시 실행과 Native 재열기, 살아 있는 끝 조각의 키보드 선택과 초점을 확인했다.
- 고정 MusicXML 4.0 XSD 40건, 독립 디코딩 MIDI 26건, PDF 16건에 기존 빌드의 대조와 시간 끝점 입력 6건이 포함된다. 최종판의 두 폭에서 같은 분기의 PDF 래스터와 MIDI가 일치했다. 3/4와 음가 변경 뒤 C5는 9박에 시작해 1박 지속했고 타건 세기는 46이었다. 끝점 마디 제거 후 다음 마디의 G4는 9박에서 기본 타건 세기 75로 시작했다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 수정 전 9/16 적용·사본과 최종판 거부·대조 | `hairpin-meter-split-before-a-20261124/results.json`, `hairpin-meter-split-after-20261124/results.json` |
| 음가·박자·구조 변경과 초점 | `hairpin-structural-edit-final-20261124/results.json`, `hairpin-structure-focus-final-20261124/results.json` |
| 고정 XSD·MIDI·PDF·1.5박 대조와 캡처 해시 | `hairpin-structural-edit-evidence-20261124/results.json`, `hairpin-structural-edit-sources-20261124.json` |
| 실제 도움말과 생산 빌드 | `hairpin-meter-split-help-final-20261124/results.json`, `hairpin-meter-split-final-build-20261124.log` |
| 단위 회귀 | `hairpin-meter-split-red-20261124.log`, `hairpin-meter-split-focused-20261124.log`, `hairpin-structural-edit-regression-20261124.log` |

생산 빌드는 `npm run build -- --outDir "$PWD/out/parity-qa/hairpin-meter-split-final-build-20261124"`로 생성했다. 앱 스크립트는 `env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron out/parity-qa/verify-hairpin-meter-split-20261124.cjs --expect-blocked --out=hairpin-meter-split-repeat-20261124 --build=out/parity-qa/hairpin-meter-split-final-build-20261124`로 실행할 수 있다. 같은 방식으로 구조 변경·초점·도움말 스크립트를 실행했다. XSD와 출력 대조는 위 경로의 `review-hairpin-structural-edit-20261124.py`를 사용했다.

관련 회귀는 261파일·3,327건이 통과했고 1파일·1건을 건너뛰었다. 집중 회귀 12건, 타입 검사 포함 생산 빌드, 문서 검사 4종과 diff 검사가 통과했다. 입력·검증 스크립트·빌드·산출물 452개의 해시를 독립 확인했다. 이번 변경의 회귀는 박자 명령과 관련 모듈을 대상으로 실행했다. 전체 7,730건은 앞선 소스의 기록이다.

이번 실제 앱 검증은 파일 대화상자 어댑터와 격리한 임시 프로필을 사용했다. 외부 앱 재저장·실제 OS 대화상자·물리 청음은 남았다. 시간 끝점의 최소 편집 범위는 승인 대기이며 1.5박 두 divisions·기존 음 시작과 길이 끝 대조를 실행 가능한 입력으로 정리했다. 저장 형식과 구형 Native 리더, 마디 삭제·박자 축소로 주소가 무효가 되는 경우의 정책이 재개 조건이다. [시간 끝점 수용 기준](hairpin-time-anchor-acceptance.md#실행할-대조군)

## 연결되지 않는 헤어핀 종료 진단과 악보단 시작

- 이전 빌드의 960×750 dark와 1400×750 light에서 연결되지 않는 1.5박 끝점을 가져왔다. 오류는 일반 MusicXML 실패로 분류됐고 기술 정보는 내부 `20160 tick`·`voice-3`만 표시했다. 원본 XML의 보표·성부·마디를 찾기 어려운 상태였다.
- 최종 빌드는 헤어핀 끝에 연결할 음표나 쉼표가 없음을 요약한다. 기술 정보에서 파트 1 `P-lower`, 보표 2, 원본 성부 7, 파일의 1번째 마디와 번호 42, `20160 tick`과 4분음표 기준 1.5박을 확인했다. 두 화면 폭에서 `divisions=1`의 `offset=1.5`와 `divisions=8`의 `offset=12`가 같은 위치를 보고했다.
- 네 실패 경로 모두에서 열린 악보와 미저장 편집·선택·기록을 유지했다. 실패 뒤 정확한 실행 취소·다시 실행, Native 재저장, 끝을 연결한 사본의 재시도를 확인했다. 정상 음 시작과 길이 끝을 대조했고 다른 MusicXML 오류의 분류 검사도 통과했다.
- 악보단 시작에서 닫히는 음 시작과 첫 16분음표의 길이 끝을 수동 줄·페이지 나누기 두 조건과 두 폭에서 검증했다. 여덟 조건의 끝 조각과 음자리표 획 사이에 자동 배치 기준 약 18.66 SVG 단위가 있었다. 가로 −0.5 sp 수동 배치 및 Native 재열기, 줄 합치기와 실행 취소·다시 실행에서 종료 마디의 조각 초점이 유지됐다. 줄 합치기 전후 MusicXML의 3마디 종료는 0 또는 3360 tick·1성부였고 MIDI가 일치했다. 기존 조판 동작은 이 조건에서 통과했다.
- 앱 사용설명서에 위치 진단으로 가져오기를 복구하는 방법과 외부 전달 시 편집용 Native·MusicXML 사본·비교 MIDI의 역할을 추가했다. 실제 설치형 렌더러에서 두 화면 폭의 검색과 본문을 확인했다. 외부 재저장의 기존 MuseScore 결과를 사용했다. 새 외부 변환 및 내보내기 정책은 후속 범위다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 이전 일반 오류와 최종 위치 진단 | `hairpin-end-location-before-20261124/results.json`, `hairpin-end-location-final-20261124/results.json` |
| 줄·페이지 경계와 두 종료 역할 | `hairpin-early-ending-final-20261124/results.json`, `hairpin-early-ending-cross-20261124/results.json` |
| 고정 XSD, 독립 MIDI 비교와 PDF 래스터 | `hairpin-ending-evidence-20261124/results.json`, `hairpin-ending-cross-evidence-20261124/results.json` |
| 두 폭의 앱 사용설명서 검색 | `hairpin-exchange-guide-final-20261124/results.json` |
| 회귀·빌드·입력 해시 | `hairpin-end-location-regression-20261124.log`, `hairpin-end-location-final-build-20261124.log`, `hairpin-end-location-final-sources-20261124.json` |

관련 회귀 178파일·2,293건이 통과했고 1파일·1건을 건너뛰었다. 이 중 위치 진단의 집중 검사 2건은 수정 전에 실패했다. 타입 검사·생산 빌드, 고정 XSD 30건·독립 비교 MIDI 24개·PDF 16개, 문서 검사 4종과 diff 검사를 통과했다. 직전 전체 7,730건은 이번 진단 수정 전 기록이다. 자체 검증 프로세스는 종료됐고 변경은 미커밋 상태다. 실제 OS 대화상자·스크린리더·청음은 미검증이다.

가져온 시간 끝점의 최소 편집 범위와 무효한 마디 주소의 처리안, 이전 Native 리더의 호환 결정을 보강했다. 정확한 시간 끝점의 저장 및 편집은 해당 결정을 기준으로 다음 작업에 등록한다. [시간 끝점 수용 기준](hairpin-time-anchor-acceptance.md)

## 일부 악보단의 헤어핀 겹침과 표준 종료 위치

두 화면 폭은 960×750 dark와 1400×750 light다. 위아래 보표가 있는 세 마디에서 두 자동 헤어핀이 가운데 악보단에서만 가로로 겹친다. 같은 보표에서 가로로 분리된 짧은 선과 아래 보표의 독립적인 선도 넣었다. 격리 Electron의 공개 메뉴·단축키로 조작하고 파일 대화상자는 임시 파일 어댑터를 사용했다.

- 가운데에서 두 선의 획 사이 약 8 SVG 단위를 확인했다. 이어지는 마지막 조각도 같은 세로 이동량인 약 29.8을 유지했다. 가로로 분리된 짧은 선의 보표 상대 위치, 아래 보표 선의 소속과 종료 참조를 확인했다. 한 선을 보표 위에 수동 배치한 상태를 Native에서 복원했다. 앞쪽 줄을 합치고 실행 취소·다시 실행한 경로에서는 끝 마디의 조각이 화면에 보이고 초점이 유지됐다.
- 3마디의 마지막 A4에서 마디 끝까지 연결된 선이 원래 빌드의 화면에서 사라졌다. 시작 음과 기존 종료 좌표 사이에 약 15.8 SVG 단위가 있었지만 고정 시작 여백 뒤에는 약 5.8만 남았다. 같은 악보단의 짧은 정확 종료에서 시작 여백을 줄여 9 단위 선을 그린다. 마디 끝과의 간격, 선택, PDF 및 Native 재열기를 확인했다.
- 단독 자동 헤어핀의 실제 획이 높은 아래 보표 음표와 약 9.9 SVG 단위 겹쳤다. 충돌 회피로 이동한 일부 선에만 일어나던 보표 간격 계산을 모든 자동 헤어핀의 실제 획에 적용했다. 두 폭에서 단독·겹침 양쪽의 가까운 아래 음표까지 약 8 단위를 확인했다.
- 줄을 합치기 전 PDF는 2쪽, 합친 PDF는 1쪽이었다. 같은 상태의 두 화면 폭은 PDF 래스터가 일치했다. 합치기 전후와 Studio XML 재열기 뒤에 MIDI가 일치했고, XML의 네 종료 위치·보표·성부를 비교했다.

### 외부 MusicXML과 독립적인 종료 박

같은 3박 종료를 E4 뒤에 쓰는 XML과 E4 앞에서 `offset=1`을 두는 XML 두 종으로 대조했다. `offset`의 `sound="yes"` 유무를 포함한 세 원본은 Studio에서 모두 F4의 시작으로 해석됐고 F4 타건 세기는 103이었다. MusicXML 4.0의 위치·성부와 `wedge` 번호·ID 속성에는 별도의 이전 음 길이 끝 역할이 정의돼 있지 않다. 시험한 표준 위치 표현은 Studio 역할 ID의 재생 결과인 F4 타건 세기 75를 복원하지 못했다. [MusicXML wedge](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wedge/) · [MusicXML offset](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/offset/)

MuseScore 4.7.5의 압축 MXL 변환에서는 두 오프셋 대조와 독립 1.5박 대조가 모두 종료 0이었다. 오프셋 대조의 종료는 3박에 유지됐고 1.5박 대조의 종료는 3박으로 이동했다. 정상 MXL 세 건을 Studio에서 다시 열었을 때 모두 F4 시작과 같은 MIDI를 얻었다. 원래 1.5박 XML은 두 폭에서 가져오기를 거부했고 이전 악보·편집 상태와 재저장 내용이 유지됐다. 외부 편집기와 교환할 때 종료 연결과 재생을 비교할 원본은 Native 프로젝트와 MIDI로 전달한다. 전용 역할 ID의 정상 재저장과 기본 외부용 사본 정책은 후속 검증 범위다. [독립 종료 박의 모델 선택과 수용 기준](hairpin-time-anchor-acceptance.md)

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 짧은 선의 누락과 단독 선의 아래 보표 겹침 | `hairpin-partial-overlap-diag-20261124.log`, `hairpin-compact-exact-red-20261124.log`, `hairpin-partial-overlap-final-b-20261124.log` |
| 두 폭의 최종 앱·수동 배치·초점·재열기 | `hairpin-partial-overlap-verified-20261124/results.json` |
| 정상 MuseScore MXL 및 Studio 대조 | `leading-rest-direct-midi-qjvyddwp/results.json`, `hairpin-standard-offset-actual-20261124/results.json` |
| XSD·MIDI·PDF 및 래스터 해시 | `hairpin-partial-overlap-artifacts-20261124/results.json` |
| 회귀·격리 생산 빌드·시각 기준·입력 해시 | `hairpin-partial-overlap-regression-20261124.log`, `hairpin-partial-overlap-complete-build-20261124.log`, `hairpin-partial-overlap-snapshots-20261124/statuses.log`, `hairpin-partial-overlap-final-sources-20261124.json` |

관련 조판·재생·MusicXML·PDF 회귀 313파일·3,520건이 통과했고 1파일·1건을 건너뛰었다. 타입 검사 포함 생산 빌드, Studio R3 프로필과 고정 캔버스, 고정 XSD 15건·MIDI 18개·PDF 4개, 문서 검사 4종과 diff 검사를 확인했다. 이전 전체 7,730건·Node 5건은 이번 수정 전 기록이다. 자체 검사 프로세스는 종료했고 변경은 미커밋 상태다. Native 시간 끝점 구현은 모델과 편집 범위를 정한 뒤 진행한다. 실제 OS 대화상자·스크린리더·청음은 미검증이다.

## 헤어핀의 혼합 종료 역할과 악보단 경계

두 화면 폭은 960×750 dark와 1400×750 light다. 두 파트의 생성 악보를 격리 Electron에서 열고 공개 메뉴·선택·키보드로 편집했다. 파일 대화상자는 임시 파일을 지정하는 어댑터를 사용했다.

- 한 파트의 크레셴도는 C5의 길이 끝, 디미누엔도는 D5의 시작에 연결한다. 두 선 모두 40320 tick·1성부에 닫힌다. 파일에서 종료 표식이 먼저 나오는 경우에도 번호·성부·참조 이벤트와 두 역할이 해석됐다. 시작점과 끝점의 독립 변경·실행 취소·다시 실행, Native 재열기, 총보·파트보 MusicXML의 고유 ID와 재열기 MIDI를 검증했다.
- 원래 화면과 PDF에서 두 선이 교차했다. 960px에서 획을 포함한 두 경계의 간격은 −21.8 SVG 단위였다. 수동 배치가 차지하는 위치를 먼저 계산한 후 겹치는 자동 헤어핀에 세로 간격을 확보하도록 수정했다. 두 폭에서 간격은 약 8.01 SVG 단위였다. 두 선 모두 자동인 경우와 수동 선이 뒤에 저장된 경우도 검증했다. 같은 악보의 총보·파트보 XML과 MIDI는 수정 전후 해시가 일치했다.
- 세 번째 마디의 길이 끝에 연결된 음을 같은 길이의 쉼표로 바꿨다. 두 폭의 수동 줄·페이지 나누기 네 조건에서 앞쪽 나누기를 해제·복원하는 동안 끝 조각의 초점이 같은 마디에 남았다. 조각 인덱스는 2 → 1 → 2 → 1로 바뀌었다. 가로 −0.5 sp 수동 배치, 3마디 40320 tick·1성부의 쉼표, Native·MusicXML과 MIDI를 확인했다. 수동 페이지 나누기의 기준·병합 PDF는 각 2쪽이고 마지막 페이지의 끝 선을 확인했다.
- MuseScore 4.7.5에서 같은 단일 성부 입력의 ID 없는 대조군과 일반 `wedge` ID 대조군은 종료 0으로 동일한 MusicXML을 생성했다. 일반 ID는 출력에서 빠졌다. Studio의 `onset`·`release` 역할 ID가 있는 대조군은 `SIGABRT`였다. 비정상 종료의 산출물은 호환성 판정에서 제외했다. 이 결과는 해당 도구·입력·실행 환경의 범위다.
- 외부 정상 사본 두 건과 로컬에서 역할 ID만 제거한 대조군을 Studio에서 재열었다. 세 결과 모두 F4의 시작에 연결되는 기존 해석과 같은 MIDI를 냈다. 역할이 있는 두 원본은 각각 F4 시작과 E4 길이 끝에 연결된다. 이 단일 성부 대조에서 F4 타건 세기는 역할 있는 원본 75, ID 제거 대조와 외부 정상 사본 103이었다.

고정 MusicXML XSD 28건, 독립 디코딩 MIDI 30개, PDF 11개와 PDF의 수정 전후·페이지 경계 래스터를 확인했다. 자동 배치와 수동 배치의 관계를 앱 도움말의 헤어핀 항목에 반영했다.

| 증거 | `out/parity-qa/` 경로 |
| --- | --- |
| 겹침 재현과 수정 후 실제 화면 | `hairpin-mixed-lanes-before-20261124.log`, `hairpin-mixed-lanes-after-20261124/results.json` |
| 두 자동 선·수동 배치 우선·끝점 교체 | `hairpin-mixed-lanes-priority-20261124/results.json` |
| 쉼표 끝점의 줄·페이지 초점과 산출물 | `hairpin-rest-break-focus-after-20261124/results.json` |
| 외부 재저장과 Studio 재열기 | `leading-rest-direct-midi-w5njk_5j/results.json`, `leading-rest-direct-midi-umba2kic/results.json`, `hairpin-external-controls-20261124/results.json` |
| XSD, MIDI, PDF 해시와 래스터 | `hairpin-role-boundaries-artifacts-20261124/results.json` |
| 관련 검사, 제품 빌드, 프로필·고정 캔버스 | `hairpin-role-boundaries-regression-20261124.log`, `hairpin-role-boundaries-final-build-20261124.log`, `hairpin-mixed-lanes-snapshots-b-20261124/statuses.log` |
| 최종 빌드 해시와 앱 검증 | `hairpin-role-boundaries-final-build-sources-20261124.json`, `hairpin-role-boundaries-help-20261124/results.json`, `hairpin-mixed-lanes-final-20261124/results.json` |

조판·재생·MusicXML·PDF 범위의 회귀 검사는 313파일·3,519건이 통과했고 1파일·1건을 건너뛰었다. 타입 검사 포함 최종 생산 빌드, 2배율 Studio R3 프로필과 고정 캔버스, 문서 검사 4종 및 diff 검사가 통과했다. 빌드의 두 폭 실제 앱에서 혼합 악보와 도움말 검색도 통과했다. 첫 스냅샷 실행의 배율 인수 오류는 격리 실행기의 Electron 설정으로 옮겨 해결했고 원래 로그를 남겼다. 직전 전체 Vitest 7,730건·Node 5건은 이 조판 변경 전 결과다. 이번 조판 변경은 관련 범위의 회귀로 검증했다. 검증 프로세스는 종료됐고 결과는 미커밋 상태다.

남은 범위는 역할 ID가 있는 사본의 정상 외부 재저장과 임의 박의 독립적인 끝 위치다. 임의 1.5박 지원은 음 시작이나 길이 끝에 맞추지 않고 원래 tick과 성부를 보존하며, 선택·실행 취소·재생·Native·MusicXML 왕복과 기존 파일 호환을 검증할 모델 결정이 필요하다. 물리 OS 대화상자·스크린리더·청음은 미검증이다.

## 헤어핀 종료 역할의 저장·반복 붙여넣기·쉼표 전환

검증 기준은 `v0.1.0-alpha.42`의 `82ba969c26464b95b4ae5a3c51cca785ddf32c44` 위 기존 미커밋 작업과 이번 속성 안내 수정이다. 격리 생산 빌드의 실제 960×750 dark와 1400×750 light에서 검증했다. 앱의 공개 메뉴·악보 선택·단축키를 사용했다. 파일 대화상자는 임시 파일을 지정하는 어댑터로 대체했고 붙여넣기는 앱 내부 클립보드를 사용했다.

- 3박에서 다음 음이 시작해 종료 역할 식별자가 필요한 길이 끝을 총보·Piano 파트보·반복 펼치기에서 확인했다. 펼친 사본을 다시 열면 두 회차 모두 40320 tick·1성부의 같은 상대 음에 붙었다. 파트 ID와 표식 ID가 유일했고 파트보·펼친 사본의 12음 MIDI가 일치했다.
- 두 폭의 MusicXML과 압축 MXL에서 끝 음을 반음 올리고 열린 파일에 저장했다. 재열기에서 C♯5의 시작·지속·타건 세기, 기존 종료와 다른 파트가 유지됐다. 이후 네 외부 변경 대조는 덮어쓰기를 거부하고 디스크 내용·미저장 편집·선택·기록을 보존했다.
- 같은 범위를 한 번 복사해 다른 두 마디에 붙여넣었다. 새 이벤트 네 개와 새 헤어핀 두 개가 각각 독립적이었다. 원본·상대 종료·가로 −0.5 sp·높이 2 sp를 보존했다. 기존 끝점이 있는 대상은 메뉴에서 비활성화됐고 붙여넣기 단축키에도 악보가 바뀌지 않았다. 두 번의 undo/redo와 Native·MusicXML 재열기·MIDI·PDF를 확인했다.
- C5를 같은 길이의 쉼표로 바꿔도 동일 ID·길이 끝 역할·3박·1성부가 유지됐다. undo/redo와 Native·MusicXML 재열기, 양쪽 파일 형식의 같은 파일 저장도 확인했다. MIDI에서는 C5 타건만 빠졌다. 다음 D5의 타건 세기는 75로 유지됐다.
- 실제 속성의 끝점 선택에는 쉼표가 표시됐지만 안내는 음이라고 불렀다. 쉼표 시작·길이 끝·마디 끝의 접근 가능한 설명 검사 3건을 실패로 고정하고 실제 표기 종류를 사용하도록 수정했다. 같은 음의 안내는 유지되고 앱 도움말에도 변환 뒤 연결 위치가 유지됨을 반영했다.

고정 XSD 28건, 독립 디코딩 MIDI 20개와 동일 해시의 추가 MIDI 2개, PDF 6개를 확인했다. PDF의 종류별 두 폭 래스터가 일치했고 변환 전후의 음·쉼표와 독립 복사본의 선을 직접 검토했다. 안내 수정 전후 동일 케이스의 XML 26개·MIDI 20개·PDF 래스터 6개가 일치했다. 생산 빌드와 검증 로그는 `out/parity-qa/`에 있다.

| 증거 | 경로 |
| --- | --- |
| 총보·파트보·반복 펼치기·원래 파일 저장 | `hairpin-marker-file-routes-final-20261124/results.json` |
| 반복 붙여넣기와 끝 음 변환의 캡처·파일 | `hairpin-paste-and-rest-final-20261124/results.json` |
| 끝 음 변환 후 같은 파일 저장 | `hairpin-rest-in-place-20261124/results.json` |
| 고정 XSD·MIDI·PDF와 수정 전후의 대조 | `hairpin-marker-routes-final-artifacts-20261124/results.json`, `hairpin-final-artifact-comparison-20261124.json` |
| 변경한 앱 도움말의 실제 검색·화면 | `hairpin-rest-anchor-help-20261124/results.json` |
| 재현 및 집중 검사 | `hairpin-rest-anchor-description-before-20261124.log`, `hairpin-rest-anchor-description-focused-20261124.log` |

직전 전체 Vitest 7,730건과 Node 5건은 이번 속성 문구·회귀 3건·도움말 변경 전 결과다. 당시 고정 입력 6,600개로 종료 0을 확인했고, 새 작업 시작 시 제품·테스트 입력이 같음을 확인했다. 이번에는 속성·편집·앱 3파일 254건과 MusicXML·MXL·Native·붙여넣기·MIDI 6파일 64건, 타입 검사·생산 빌드·문서 검사 4종을 통과했다. 빌드 및 변경 입력 해시는 `out/parity-qa/hairpin-rest-anchor-description-build-sources-20261124.json`에 있다. 자체 검증 프로세스는 종료됐고 변경은 미커밋이다. 앞선 두 앱 검증 시도는 메뉴 초점과 출력 설정이 열린 상태에서의 포인터 위치 검사에서 종료됐다. 원래 로그와 실패 화면을 보존하고 실제 메뉴 초점과 정상 편집 순서로 검증을 마쳤다.

남은 범위는 임의 박의 끝점 모델 결정과 외부 편집기에서 파일을 다시 쓸 때의 역할 식별자 보존이다. 기존 MuseScore 재저장 비정상 종료를 같은 조건으로 반복하지 않았다. 실제 OS 파일 대화상자·시스템 클립보드·스크린리더·청음은 이번 확인 범위에서 제외했다.

## 편집·복사한 헤어핀의 MusicXML 왕복

- 다른 성부의 음 시작에 닫히는 헤어핀에서 시작점만 끝 음과 같은 성부로 옮겼다. 이전 앱은 파일을 썼지만 재열기에서 역할이 사라져 C5 타건 세기가 75에서 84로 바뀌었다. 두 폭에서 실패를 재현한 뒤, Studio가 일반 종료 위치만으로 역할을 다시 읽을 수 없는 경우 해당 MusicXML `wedge`의 선택적 ID에 종료 역할을 기록하도록 수정했다. 이어서 다시 연 MIDI는 75였고, Native 바이트와 PDF 래스터가 수정 전과 같았다.
- 명확한 길이 끝을 가진 C5의 점2분음표를 앱에서 2분음표로 줄이고, 3박에 D5를 입력했다. 이전 앱은 종료가 다음 음 시작으로 붙어 MusicXML 출력을 저장 전에 거부했다. 수정 후 40320 tick·1성부·앞 음의 길이 끝이 유지됐다. 사본 재열기 MIDI는 C5의 2박 길이와 D5 타건 75를 보존했다. 식별자를 제거한 외부 형식 대조군은 현재 정책대로 3박 D5 시작을 선택했다.
- 같은 마디·성부의 단순 범위에 종료 역할이 있는 헤어핀의 두 끝이 모두 들어 있을 때만 함께 복사한다. 실제 앱에서 E4·F4와 수동 가로 −0.5 sp·높이 2 sp를 복사해 새 이벤트와 새 헤어핀 ID로 붙였다. 두 폭의 부분 선택에는 원본 헤어핀 하나만 남았다. 한 번의 undo/redo·Native 재열기·MusicXML 재열기·MIDI와 PDF를 대조했다.
- 식별자는 전역으로 유일하며 기존 파트 ID를 피한다. 일반 MusicXML의 음 시작 우선 규칙과 필드 없는 Native의 재생·출력은 보존한다. Studio의 내보내기 검증은 명시적 종료 역할도 재열기에서 확인한다. 일반 쉼표 길이 끝의 가져오기 경고와 연결되지 않는 1.5박의 가져오기 거부 및 기존 악보 보존을 두 폭에서 확인했다.
- 실패 테스트 3건을 고정했다. 집중 60건, 관련 266파일·3,384건, 타입 검사와 격리 빌드가 통과했다. 관련 테스트에서 외부 opt-in 1건을 건너뛰었다. 고정 MusicXML XSD 20건, 실제 MIDI 여섯 경로와 PDF 네 건을 확인했다. MuseScore 4.7.5의 두 사본 재변환은 SIGABRT였고 종료 때 남은 파일은 근거에서 제외했다. 다른 앱의 식별자 보존은 미확인이다.

실제 앱과 출력은 `out/parity-qa/hairpin-{same-voice-reanchor,copy-role,colliding-end}-after-20261124/`에 있다. 변경 전의 실제 재현은 `hairpin-{same-voice-reanchor,colliding-end}-before-20261124/`, MIDI 독립 디코딩·XSD·PDF 해시는 `hairpin-edited-copy-artifacts-20261124/results.json`이다. MuseScore 종료 기록은 `out/parity-qa/leading-rest-direct-midi-xr4wv0xz/results.json`이다.

두 폭에서 실제 앱 도움말의 종료 역할과 구간 복사 안내에 검색으로 이동했다. `out/parity-qa/hairpin-edited-copy-help-20261124/results.json`에 화면이 있다.

최종 `npm run test:all`은 1842.12초에 종료 코드 0을 기록했다. Vitest 796파일·7,730건과 Node 5건이 통과했고 외부 opt-in 1건을 건너뛰었다. 실행 종료 시점과 독립 확인의 입력 6,600개가 일치했다. `out/parity-qa/hairpin-edited-copy-full-20261124/`에 로그·receipt·독립 확인 결과가 있다.

## 헤어핀의 음 시작과 길이 끝 왕복

승인한 정책대로 MusicXML의 종료 위치를 악보·MusicXML 사본·재생에 반영했다. 끝 음은 같은 ID에 연결하고 선택적 Native `endAnchor`에 음 시작 또는 길이 끝을 저장한다. 음의 정확한 길이 끝과 다른 성부의 음 시작을 구분하며, 같은 위치에 끝 성부의 다음 음이 있으면 음 시작을 우선한다. 같은 성부의 통상적인 음 시작과 기존 동시 시작·마디선 유추 사례에는 기존 방식이 적용된다. 쉼표 등 현재 표현할 수 없는 종료에는 가져오기 경고가 남는다.

- 변경 전 회귀의 1박과 4박 두 사례가 각각 실패했다. 두 화면 폭의 실제 앱에서 같은 끝 음의 ID와 성부를 유지한 채 13440 tick·53760 tick으로 재출력했다. 화면과 PDF의 두 끝점, Native 재열기, XML 사본 재열기 뒤 MIDI 일치를 확인했다. 실제 MIDI의 G4 네 타건 세기는 1박 종료에서 75·75·75·75, 4박 종료에서 75·84·93·103이었다.
- 두 파트 원본의 Piano 파트 사본과 반복 펼치기 사본을 실제 앱에서 내보냈다. 두 회차가 1박 또는 4박·1성부에서 각각 닫혔다. C5 타이는 1박·9박에 시작해 각 7박을 유지했고, 4박·12박에 독립적으로 시작하는 D5의 세기는 모두 75였다. 반복 펼친 사본을 재열어 만든 12음 MIDI가 파트 사본과 일치했다.
- 실제 속성의 가로 −0.5 sp와 벌어짐 2 sp를 저장·재열었다. 끝 음을 유지하면 역할이 보존되고, 다른 음을 고르면 새 시작 위치로 연결된다. 두 폭에서 새 성부·끝 음, undo/redo·재열기와 인쇄를 확인했다. 페이지를 넘는 별도 사례에서 두 악보단의 선과 두 쪽 PDF 및 두 번째 마디 끝 53760 tick·1성부를 확인했다.
- 역할 없는 v2 대조의 재저장 Native·구조 유지 XML·MIDI와 PDF 래스터는 이전과 같았다. 새 필드를 저장한 v2 파일을 열려면 업데이트된 Studio가 필요하다. 이전 태그의 거부, 현 앱의 정상 재열기와 도움말에서 범위를 확인했다.
- 끝 음이 먼저 발음된 뒤 헤어핀이 시작되는 대조에서 재생을 건너뛰는 실패를 추가로 고정했다. 각 회차에서 1박에 울린 C5는 3박을 유지했고 세기 곡선은 2박에 시작해 4박에 끝났다. 두 폭의 실제 원본·펼친 사본에서 8박과 각 회차 G4 타건 75·75·75·93을 확인했다. 실제 화면과 PDF의 선은 2박에서 해당 마디선 안쪽까지 이어졌다.
- 최종 관련 209파일·2,703건, 외부 opt-in 1건 건너뜀, 타입 검사와 격리 생산 빌드가 통과했다. 고정 XSD 36건 및 PDF 16개를 확인하고 대표 래스터를 직접 검토했다. MuseScore 4.7.5는 명시적 offset을 쓴 4박 사본을 정상 종료로 한 쪽 PDF에 그렸다. 최종 4박 사본은 외부 PDF에 사용한 파일과 해시가 같다. 이 비교의 외부 MIDI와 청음은 범위 밖이다.

최종 실제 관측과 출력은 `out/parity-qa/hairpin-end-anchor-{app,edit,repeat-part,legacy,pages,late-start,help,inspection}-verified-b-20261124/`에 있다. 외부 PDF 기록은 `out/parity-qa/leading-rest-direct-midi-iplossls/results.json`이다. 앱 검증의 파일 선택은 격리 어댑터를 사용했다. 늦은 시작의 첫 앱 검증은 사본에 적용할 수 없는 최소 길이를 가정해 중단했으며 재검증은 실제 마디선 좌표를 대조했다.

누적 전체 검사의 첫 실행은 늦은 시작 결함을 고치기 전에 142.36초에서 중단했다. 종료 -15, 입력 변경 0이며 원래 로그는 `out/parity-qa/hairpin-end-anchor-full-20261124/`에 있다.

최종 `npm run test:all`은 1915.77초에 종료 코드 0을 기록했다. Vitest 796파일·7,727건과 Node 5건이 통과했고 외부 opt-in 1건은 건너뛰었다. 종료 기록과 독립 확인의 고정 입력 6,599개에 변경이 없었다. `out/parity-qa/hairpin-end-anchor-final-full-20261124/`에 로그·receipt·독립 비교가 있다.

전체 검사 뒤 같은 생산 빌드로 앞꾸밈음 설정 변경·undo·redo를 두 화면 폭에서 재검증했다. 진행 중인 루프가 멈추고 전환마다 종전 샘플 예약 2·4·2개를 취소했다. 기존 MIDI 비교와 새 재생 예약을 확인했다. 결과는 `out/parity-qa/hairpin-end-anchor-grace-history-20261124/results.json`이다. 예약은 음소거 Electron으로 계측했다.

후속 범위는 음 시작이나 길이 끝으로 표현되지 않는 임의 박, 호환성을 유지해야 하는 같은 성부 범위의 추가 재생 정책이다. 확인한 쉼표 종료 대조는 현행 경고와 원본 비교 안내를 사용한다.

## 마디 끝 헤어핀의 반복 펼치기

같은 보표의 다른 성부에서 동시에 시작하고, 타이 없는 끝 음의 길이 끝이 마디선에 닿는 헤어핀은 기존 구조 유지 사본에서 정확히 출력됐다. 이 마디를 두 번 반복하는 원본을 두 폭의 이전 앱에서 열면 반복 펼치기가 쓰기 전에 실패했다. 집중 검사에서 같은 실패를 고정했다.

- 기존 마디 끝 판정을 반복 펼치기에 재사용한다. 안전하게 복제할 수 있는 같은 마디의 끝 위치에서만 두 성부를 허용한다. 그 밖의 다른 성부 범위와 도약을 가로지르는 범위는 기존과 같이 거부한다.
- 960×750 dark와 1400×750 light에서 사본의 두 마디가 각각 53760 tick·1성부에서 닫혔다. 실제 사본을 다시 열어 두 헤어핀의 잉크와 8박을 확인했다. 독립 디코딩한 총 10음의 음높이·시작·지속과 MIDI 바이트가 원본과 일치했다. 집중 검사는 각 회차의 재생 세기 곡선도 대조했다.
- 원본과 Native 재열기 내용, 구조 유지 XML과 MIDI 바이트, 원본 PDF의 래스터가 수정 전후 일치했다. 고정 XSD 6건을 확인했다. 앱의 파일 대화상자 응답은 격리 어댑터를 사용했다. out/parity-qa/hairpin-barline-repeat-copy-app-{before-b,after}-20261124/의 결과와 비교 JSON에 캡처와 해시가 있다.
- 집중 30건, 관련 205파일·2,645건, 타입 포함 생산 빌드가 통과했다. 관련 검사에서 외부 opt-in 1건을 건너뛰었다. MuseScore 4.7.5의 원본·펼친 사본 MIDI 변환은 둘 다 SIGABRT였다. 남은 파일은 비교에서 제외했다. out/parity-qa/leading-rest-direct-midi-5njkw9pd/results.json에 종료 기록이 있다.
- 최종 생산 빌드에서 두 폭의 앱 도움말 검색으로 복제된 마디의 종료 규칙을 확인했다. out/parity-qa/hairpin-barline-repeat-copy-help-20261124/results.json에 캡처가 있다.

일반 헤어핀의 음 시작·길이 끝 구분에 필요한 Native 정보와 재생 적용 범위는 결정 대기다.

## 헤어핀 종료 위치 재현과 속성 패널·앞꾸밈음 전환

### 음 시작과 길이 끝 종료가 합쳐지는 실제 앱 재현

960×750 dark와 1400×750 light에서 1박 온셋과 4박 길이 끝의 두 원본을 가져왔다. 네 경로에서 헤어핀을 키보드로 선택하고 Native를 저장·재열었다. 각 폭에서 두 Native, MIDI, 구조 유지 MusicXML 및 한 쪽 PDF 래스터가 모두 일치했다. XML의 끝은 모두 13440 tick·1성부였다. 고정 XSD 입력·출력 8건을 확인했다. out/parity-qa/hairpin-end-role-app-baseline-20261124/results.json에 화면 좌표, 캡처와 산출물이 있다.

파서는 음의 시작을 먼저 찾고 해당 시각에 시작하는 표기가 없으면 음 길이 끝을 찾는다. 두 경로 모두 종료 이벤트 ID만 반환한다. Native와 저장 검증 시그니처는 그 ID만 보존하고 렌더러와 작성기는 일반 종료를 음 시작으로 사용한다. 재생은 종료 이벤트의 끝까지 적용해 두 원본을 같은 타임라인으로 재생한다. 타이 합치기 뒤에는 합쳐진 발음 길이가 원래 종료 음보다 길 수 있다.

별도 타이·두 번 반복 대조에서 1박·9박의 본음은 각 7박으로 합쳐졌다. 기존 곡선은 4박 종료 입력에서도 다음 마디 4박·12박의 2성부 타건을 기본 .16 대신 .20으로 설정했다. 새 종료 역할을 재생에 적용하는 안의 대조군이다. 타이 길이를 유지하면서 종료 이후의 별도 타건을 같은 곡선에서 제외하는지 검증할 수 있다. 원본·사본 XSD 3건과 비교는 out/parity-qa/hairpin-end-role-tie-repeat-20261124/에 있다.

MuseScore의 음 시작 종료 원본 PDF는 정상 종료했다. 길이 끝 종료 원본은 SIGABRT였고 남긴 PDF는 외부 비교에서 제외했다. out/parity-qa/leading-rest-direct-midi-2fafen5y/results.json에 기록했다.

**제품 결정 대기.** 음의 시작 또는 길이 끝을 선택적 Native 정보로 보존하는 후보를 실제 앱 재현과 함께 질문했다. 필드가 없는 기존 프로젝트는 현재 조판·재생·출력의 계약을 유지한다. 이전 앱의 Native 검증은 알려진 필드만 허용하므로 새 정보를 저장한 파일을 열려면 업데이트된 빌드가 필요하다. 기존 파일에서 이미 사라진 종료 위치는 알 수 없다.

- 표기·왕복에만 적용하면 두 입력의 1박·4박과 1성부를 화면·PDF·Native·XML에서 각각 보존하면서 기존 세기 계산을 유지할 수 있다.
- 재생에도 적용하면 새 입력의 종료 박에서 세기 범위를 닫는다. 타이에 합쳐진 소리의 길이와 원래 종료 음의 길이를 구분하고, 종료 박 이후 타건에 곡선이 남지 않는 조건을 검증한다.
- 동일 박에서 시작과 길이 끝 후보가 겹치면 현재 시작 후보를 우선하는 규칙을 사용한다. 저장 검증은 실제 종료 박과 성부를 비교해야 한다. 수동 배치는 시간 위치를 바꾸지 않으며 끝점을 교체하는 명령은 새 끝점의 역할을 명확히 정한다. 임의 박의 독립 위치는 별도 범위다.

### 후보 종료 정보의 이전 Native 호환성

게시 태그 `82ba969c26464b95b4ae5a3c51cca785ddf32c44`의 Native 디코더와 의존 버전 Zod 4.6.7로 별도 시험 파일을 검사했다. 기존 v2 대조는 열렸다. 같은 데이터에 예시 키 `endAnchor`를 붙인 v2 시작·길이 끝 파일은 알 수 없는 키 때문에 거부됐다. 같은 새 필드의 v3 시험 파일은 지원하지 않는 파일 버전으로 거부됐다. 필드와 버전은 시험 파일에만 사용했다.

- 현재 격리 앱의 960×750 dark와 1400×750 light에서도 v2 대조가 열렸고, 세 후보 파일은 각각 거부됐다. 프로젝트 열기 안내와 기술 정보에 이유가 표시됐다. 실패 전후의 원래 악보·선택·저장 상태·이력 수와 실제 Native 재저장 내용이 일치했다. 대상 시험 파일의 해시가 유지됐고 기본 파일을 다시 열 수 있었다.
- out/parity-qa/hairpin-end-role-native-compat-20261124/tagged-results.json과 hairpin-end-role-native-compat-app-b-20261124/results.json에 파일·캡처·해시가 있다. 실제 응답은 격리 파일 선택 어댑터를 사용했다. 첫 앱 검사에서 대기 함수가 관측값을 반환하지 않은 로그도 보존했다.
- 선택적 필드만 추가해도 해당 필드가 들어간 파일을 이전 디코더에서 열 수 없다. 실제 저장 형식과 재생에 적용할 범위는 앞의 결정 항목으로 남긴다. 이번 검증은 제품 코드를 바꾸지 않았다.

### 보존되지 않은 헤어핀 종료의 가져오기 안내

음의 길이 끝에 닫힌 원본을 화면과 사본에서 음 시작으로 가져오면서 경고가 없던 사례를 실패 테스트로 고정했다. 기존 종료 이벤트 탐색 결과에서 원본 tick과 실제로 보존하는 tick을 대조한다. 차이가 있으면 해당 종료 표식에 MusicXML 가져오기 경고를 붙인다. 기술 정보에 원본 경로·보표·성부와 원본·적용 tick을 표시한다. 기존에 마디 끝으로 복원되는 종료와 같은 위치가 유지되는 음 시작 종료는 경고하지 않는다.

- 960×750 dark와 1400×750 light에서 원본 53760→13440 tick의 한국어 경고와 기술 정보를 확인했다. 정상 1박 종료와 지원되는 마디 끝은 조용히 가져왔고, 두 폭의 구조 유지 사본을 다시 열면 종료 위치의 추가 변화가 없었다.
- 여섯 경로의 Native·MusicXML·MIDI 바이트와 실제 PDF 래스터가 기존 산출물과 일치했다. 원본과 사본 XSD 12건 검증을 마쳤다. out/parity-qa/hairpin-release-warning-app-20261124/results.json에 캡처와 파일이 있다. 선택적 Native 종료 정보와 새 입력의 재생 범위 결정은 위에 기록했다.
- 두 번째 파트의 두 번째 보표를 사용하는 별도 XSD 대조군에서도 경고가 정확한 종료 표식을 가리켰다. 최종 생산 빌드의 실제 앱 도움말에서 두 폭의 경고 검색과 안내 이동을 확인했다. out/parity-qa/hairpin-release-warning-ownership-20261124.json과 hairpin-release-warning-help-20261124/results.json에 결과가 있다.
- 실패 재현 1건을 고정한 뒤 집중 검사 46건, 관련 207파일·2,865건, 타입 검사와 생산 빌드가 통과했다. 관련 검사에서 외부 opt-in 1건을 건너뛰었다. 이전 누적 전체 검사 이후의 변경은 이번 집중·관련 검사와 실제 앱 결과로 확인했다.

### 마디 끝으로 복원된 기존 헤어핀의 속성 패널

이미 가져오기·표시·내보내기가 지원되는 마디 끝 헤어핀을 선택해도 두 콤보에 순서 오류가 표시됐다. 두 폭의 실제 앱과 실패 테스트에서 재현했다. 기존 마디 끝 종료 판정을 재사용해 현재 끝점을 유효하게 표시하고 음의 길이 끝에 연결된다는 설명을 붙였다. 기존 편집 후보의 순서 제약은 유지한다.

- 두 폭에서 헤어핀을 키보드로 선택하고 가로 −0.5 sp와 벌어짐 2 sp를 설정했다. 실제 선 끝은 −5 SVG 단위 이동하고 높이는 20이었다. 기존 ID와 1성부를 보존했고, 2회 수정·실행 취소·다시 실행·선택 복귀·Native 재열기를 확인했다.
- 동일 수동 배치의 수정 전후 Native·MusicXML·MIDI와 한 쪽 PDF 래스터는 일치했다. 최종 XSD 두 건이 통과했다. out/parity-qa/hairpin-boundary-properties-{baseline-c,after}-20261124/와 red·green 로그에 근거가 있다.

최종 빌드의 오프라인 사용설명서에서 두 화면 폭 모두 음의 길이 끝 안내를 검색하고 해당 항목으로 이동했다. out/parity-qa/hairpin-boundary-help-20261124/results.json에 캡처가 있다.

### 앞꾸밈음 발음 설정과 실행 취소·다시 실행 중 오디오 전환

실제 두 화면 폭에서 루프를 재생한 채 앞꾸밈음 발음을 켰다. 다음 루프를 재생하며 실행 취소로 끄고, 다시 재생한 상태에서 다시 실행했다. 기존 정책대로 매 변경에서 재생을 정지하고 연습 루프를 해제했다. 세 전환에서 먼저 예약한 샘플 레이어 2·4·2개가 각 폭에서 취소됐고 530ms 동안 새 예약이 없었다. 마지막 본음 선택은 유지됐다.

- 다시 시작하면 꺼짐의 MIDI 72와 켜짐의 MIDI 82→72가 각 타임라인에서 예약됐다. 켜짐은 처음 1/16박을 꾸밈음에 쓰고 본음 끝 및 다음 음은 유지했다. MIDI 네 파일에서 시작·길이를 독립 디코딩했다. 꺼짐은 1마디 미발음 경고를 표시했고 켜짐은 해당 경고가 없었다.
- Native 재열기는 이름과 기보 페이로드를 보존했다. 실제 Web Audio start·stop을 음소거 Electron에서 계측했다. 첫 실행의 스크롤된 재생 버튼은 포인터 영역을 벗어났다. 최종 실행에서는 실제 버튼 초점과 Enter로 검증했다. out/parity-qa/grace-setting-active-history-b-20261124/results.json에 로그·파일·화면이 있다. 실제 장치 청음은 별도다.

### 검사 결과

관련 범위는 Vitest 44파일·624건 통과, 타입 검사 포함 격리 생산 빌드 통과다. 잘못된 순서 안내의 수정 전 실패와 수정 후 75건의 로그를 보존했다. 문서 verifier 4종과 git diff --check가 통과했다. 직전 전체 7,718건은 속성 패널 변경 전이다. 이번 제품 변경은 속성 패널에 한정돼 관련 회귀와 실제 앱을 확인했다.

## 장음의 마디 끝 헤어핀 왕복과 앞꾸밈음 실제 재생

### 같은 박에서 시작한 다른 성부의 끝 헤어핀

2성부 0박의 시작에서 1성부 장음의 4박 끝으로 닫히는 원본을 960×750 dark와 1400×750 light에서 가져왔다. 화면·PDF에서 폭 24 SVG 단위로 그려졌고 Native 재열기는 성공했지만 MusicXML 사본은 쓰기 전에 거부됐다. 두 폭에서 헤어핀 키보드 선택과 끝점 ID를 확인했다.

같은 마디의 다른 성부에서 동시에 시작한 두 이벤트 중 종료 음이 타이 없이 정확히 마디 끝에 닿는 경우, 기존 길이로 종료 위치를 계산한다. 화면과 출력은 마디선 안쪽까지 그리며 MusicXML 종료에 53760 tick과 1성부를 기록한다. 새로운 Native 필드는 없다. 일반 시간순 끝점과 타이·반복의 기존 재생 규칙은 유지한다. 마디 안 종료와 타이로 이어지는 동시 시작의 위치 표현은 추가 계약이 필요하다.

- 수정 후 폭은 960px에서 약 449 SVG 단위, 1400px에서 약 668이다. 실제 PDF와 Native·MusicXML을 재열었다. 끝 성부를 생략한 대조와 다음 마디 온셋 대조의 PDF 래스터는 전후 일치했다. 여섯 경로의 Native·MIDI 바이트가 같고 입력·출력 XML 12건이 고정 XSD를 통과했다.
- MuseScore 4.7.5에 원본과 실제 사본의 마디 끝 종료를 비교했다. 두 정상 종료의 A4 한 쪽 PDF 래스터는 같은 해시 f52385d4ba0425b092540238e7d21cbc923449eb47b39cb5b1abfd79ae57532d였다.
- out/parity-qa/hairpin-long-end-app-{before,after}-20261124/와 hairpin-long-end-app-final-20261124/, hairpin-long-end-xsd-20261124.log, leading-rest-direct-midi-pv1spqnj/results.json에 근거가 있다. 새 교환 회귀의 수정 전 실패, 수정 후 관련 24건, 분야 회귀 249파일·2,958건과 외부 opt-in 1건 건너뜀을 기록했다.

다른 시작 박의 별도 대조에서 1박에 끝나는 원본과 그 음의 끝인 4박에 닫히는 원본을 같은 Native 바이트로 저장했다. 두 사본은 모두 1박에 끝났고 XSD 3건은 통과했다. 이벤트 ID만으로 이 둘을 구분할 수 없다. 후속 모델 후보는 기존 이벤트 ID를 유지하면서 명시적인 끝점 역할인 시작·길이 끝을 저장하는 방식이다. 일반화된 임의 박의 끝점은 별도 설계가 필요하다. 수용 기준은 두 원본의 끝 성부와 1·4박을 각기 왕복하고, 타이 합치기·반복·기존 Native·PDF를 검증하는 것이다. out/parity-qa/hairpin-end-role-20261124/comparison.json에 근거가 있다.

### 앞꾸밈음 연습 루프의 실제 조작

격리한 음소거 Electron에서 사선·일반·짧은 본음·꺼짐을 두 폭으로 검증했다. 현재 앱의 샘플 해시와 재생률을 읽어 MIDI 82의 꾸밈음과 MIDI 72 본음을 식별했다. 사용자 선택과 재생 커서는 같은 본음 ID를 가리켰다.

- 한 바퀴는 일반 본음 500ms, 짧은 본음 250ms였다. 꾸밈음에서 본음까지 각각 31.25·250·125ms이며 꺼짐에서는 본음만 들리는 예약이다.
- 실제 오디오 시계 중간에 일시정지 컨트롤을 활성화했다. 다시 재생했을 때 사선 샘플의 8.67–11.33ms, 일반 67.33ms, 짧은 본음 34.67ms 오프셋에서 이어졌다. 첫 바퀴의 남은 길이와 다음 시작, 처음으로 이동 시 오프셋 0·전체 바퀴, 명시적 정지 후 추가 예약이 없음을 확인했다.
- 반복·볼타 안내를 표시했고 루프 해제는 변경 이력을 만들지 않았다. 다른 문서를 열었을 때 두 폭에서 각각 미래에 예약된 샘플 레이어 네 개를 종료했으며 새 재생 예약이 없었다. 임의 시각 탐색 대신 앱의 처음으로 이동과 중간 일시정지·재개를 사용했다.
- out/parity-qa/grace-real-loop-20261124/results.json에 실제 Web Audio start·stop, 선택·커서, 캡처가 있다. 샘플 예약을 관측했고 물리 장치 청음은 별도다. 같은 네 Native 입력을 제품 MIDI 직렬화로 대조한 결과는 out/parity-qa/grace-real-loop-midi-20261124.log에 기록했다.

### 총보와 파트보의 앞꾸밈음 MIDI

플루트에만 두 번째 마디 공통 빠르기를 둔 두 파트 악보에서 설정을 켰다. 두 폭의 총보와 선택한 클라리넷 파트보를 각각 내보냈다. 9음의 음높이·시작·끝 tick·타건 세기와 120→80 BPM이 일치했다. 클라리넷 앞꾸밈음은 MIDI 80의 0–30 tick, 본음은 MIDI 70의 30–480 tick이며 후속 음은 원래 위치를 유지했다.

- 켠 단일 앞꾸밈음은 누락 경고에서 제외됐다. 원래 2마디에 있는 복수 꾸밈음만 한 번 안내했다. MusicXML 4건은 고정 XSD를 통과했고, 실제 내보내기와 앱 설명서에서 발음 설정의 Native 저장을 안내했다.
- 두 내보내기 모두 선택·dirty·수정 횟수를 보존했다. 한 번의 실행 취소·다시 실행과 Native 저장·재열기를 확인했다. 음표의 기존 키보드 선택 경로를 사용했다. 첫 확인기는 좁은 총보에서 머리 좌표가 보표 영역에 맞았고, 두 번째 확인기는 실행 취소 뒤 다른 파트의 예전 음표를 다시 찾았다. 최종 확인기는 각 내보내기에서 실제 선택을 확인하고 편집 메뉴로 다시 실행했다. 기존 로그와 부분 출력물을 보존했다.
- out/parity-qa/grace-part-midi-20261124-c/results.json 및 grace-part-midi-comparison-20261124.json에 화면·파일·독립 디코딩과 해시가 있다.

### 누적 회귀 종료

npm run test:all은 1,974.78초 만에 종료 코드 0을 반환했다. Vitest 796파일·7,718건과 Node-native 5건 통과, 외부 opt-in 1파일·1건 건너뜀이다. 고정 입력 6,599개는 실행 종료와 독립 확인에서 일치했다. out/parity-qa/hairpin-grace-runtime-full-20261124/의 test-all.log, receipt.json, independent-post-exit.json에 기록했다. 종료 이후 이 검증 결과만 문서에 추가했다.

## 마디 안 이조의 음높이 보호

사용자 승인에 따라 현재 보표·마디 모델로 원래 발음 음높이를 유지할 수 없는 MusicXML 가져오기를 중단한다. XML 시간순의 이조와 가져온 보표의 이조를 실제 유음 위치에서 대조한다. 같은 divisions 재선언, 같은 실음의 이조 재선언, 기존 쉼표 뒤 적용 및 마디 끝에서 다음 마디로 이어지는 설정을 확인했다. 원래 위치와 반음값, 파트·보표·마디를 오류에 표시한다.

- 수정 전 실패 3건과 수정 후 이조 집중 50건을 보존했다. 960×750 dark와 1400×750 light에서 두 원본을 각각 거부했다. 현재 악보·선택·dirty 및 기존 한 번의 실행 취소가 유지됐다.
- 반음값이 바뀌는 지점에 경계를 둔 사본은 가져오기와 Native 저장·재열기에 성공했다. 실제 두 MIDI 해시가 일치했고 독립 디코딩에서 0–5박 음높이 60·62·64·63·65·67, 모두 1박을 확인했다. 두 실제 PDF를 만들었고 XSD 입력·출력 8건을 검증했다.
- out/parity-qa/strict-positioned-transpose-app-20261124/의 results.json, 화면 및 재열기 산출물에 근거가 있다. 파일 선택과 교체 확인은 격리 앱의 어댑터가 응답했다.

## 프로젝트별 앞꾸밈음 발음

형식 → 악보 설정 → 앞꾸밈음 발음에서 켠다. 기존 프로젝트와 새 MusicXML에는 기본 꺼짐을 적용한다. Native는 선택을 저장하며 한 번의 실행 취소와 다시 실행을 지원한다. 설정을 켜서 저장한 파일을 열 때는 새 재생 필드를 읽는 이번 빌드가 필요하다. 일반 단음 앞의 단일 꾸밈음에 적용한다. 사선은 최대 1/16박, 사선이 없으면 최대 1/2박을 본음 시작에서 배정하고 본음 길이의 절반으로 제한한다. 본음 끝·이후 음·선택 ID는 유지한다. 뒤꾸밈음, 복수, 화음, 타이, 잇단음표, 페르마타, 장식음·트레몰로 조합은 기존 지원 범위를 따른다.

- 960×750 dark의 사선과 1400×750 light의 사선 없는 악보를 실제 Electron으로 검사했다. 기본 꺼짐, 켬, 실행 취소·다시 실행, Native 저장·재열기, 재생·일시정지·정지를 확인했다.
- 실제 MIDI의 0·8박에 MIDI 82를 추가했다. MIDI 72 본음은 1/16박 또는 1/2박 늦게 시작하며 원래 끝 박을 유지한다. 꺼짐 MIDI는 기존 소스와 일치했다. 지원 발음만 있는 실제 켜짐 결과에는 꾸밈음 누락 경고가 없다. 지원 밖 발음은 집중 테스트에서 경고를 보존했다.
- 같은 폭의 전후 MusicXML·PNG 바이트와 1페이지 A4 PDF 래스터가 일치했다. XSD 6건을 확인했다. MusicXML 저장은 프로젝트 전용 설정을 안내하며 Native 저장이 필요한 변경 상태를 보존한다.
- 재열기 프로젝트의 실제 타임라인과 피아노 명령으로 숨김 Electron에서 48kHz WAV 9건을 만들었다. 첫 박 및 반복 복귀의 B♭5 대역은 꺼짐 대비 98.83–126.62배였다. 사선·일반·짧은 본음의 본음 명령 지연은 31.25·250·125ms다. 후보가 아닌 현재 제품 타임라인에서 샘플 준비 음높이를 수집했다. 물리 장치 출력과 청음은 별도다.
- out/parity-qa/opt-in-grace-app-20261124-c/results.json, opt-in-grace-midi-20261124.log, opt-in-grace-wave-20261124/에 결과·스크린샷·MIDI·WAV가 있다. 첫 앱 실행에서 메뉴 검색 문구가 틀렸고 두 번째 실행은 재생 추적 중 정지 버튼이 시야 밖이었다. 메뉴 실제 이름과 키보드 일시정지 후 정지 경로를 사용해 검증했다. 원래 로그와 결과를 보존한다. 연습 루프 경계·발음 구간과 탐색 시 샘플 오프셋은 집중 테스트에서 확인했다.
- 이조와 꾸밈음 포함 관련 검사 248파일·2,926건 통과, 외부 opt-in 1건 건너뜀이다. 타입 검사를 포함한 격리 생산 빌드가 통과했다. 이전 전체 회귀는 795파일·7,708건, Node 5건, 외부 opt-in 1건 건너뜀이며 6,597개 해시가 일치했다.

## 이조 보호·앞꾸밈음 누적 전체 회귀

npm run test:all은 1,842.94초 만에 종료 코드 0을 반환했다. Vitest 796파일·7,716건과 Node-native 5건이 통과했고 외부 opt-in 1파일·1건은 건너뛰었다. 고정 입력 6,598개는 종료 시와 독립 확인에서 모두 일치했다. out/parity-qa/strict-transpose-opt-in-grace-full-20261124/의 test-all.log, receipt.json, independent-post-exit.json에 근거가 있다. 이후 검증 결과와 이전 빌드의 호환 안내를 문서에 추가했다.

최종 격리 생산 빌드에서 두 화면 폭의 오프라인 설명서 검색과 결과 이동으로 앞꾸밈음 발음 및 마디 안 이조 안내를 확인했다. 첫 확인기는 마크다운의 실제 하위 제목을 h2로 조회해 실패했다. h3와 장의 검색 결과를 대조하는 최종 확인기는 네 경로를 통과했다. out/parity-qa/strict-transpose-opt-in-grace-help-20261124-b/results.json에 캡처가 있다. 문서 검사 4종과 diff check를 실행했다.

## 후속 조사 — 장음 끝에 있는 헤어핀의 시간 위치

고정 XSD를 통과한 한 마디에서 2성부의 0박 시작과 1성부 장음 끝의 4박 종료가 Native에서는 서로 다른 ID의 0박 두 끝점으로 저장된다. 재생은 4박 종료까지 계산하지만 MusicXML 재출력은 양끝의 같은 시작 박으로 인해 거부된다. 끝 성부를 생략한 대조는 2성부 3박에 연결되고 출력된다. 다음 마디의 4박 온셋으로 옮기면 출력되지만 현재 재생 모델은 뒤 장음 전체를 범위에 포함한다. 두 대조는 원본의 위치·성부를 모두 보존하지 않는다. 정확한 종료 위치를 보존하려면 이벤트 시작·끝 또는 독립 시간의 소유권을 정해야 한다. out/parity-qa/hairpin-long-note-endpoint-20261124/comparison.json과 XSD 입력·출력 5건에 근거를 둔다. 제품 수정은 별도 범위다. 파트보 묶음 쉼표의 수동 페이지 나누기는 기존 실제 검증과 겹친다.

## 타이로 이어진 음에 연결한 헤어핀의 재생

타이 연결로 발음 이벤트를 합치면서, 두 번째 음에 연결된 헤어핀의 시작 또는 끝까지 찾지 못했다. 반복할 때마다 타이로 이어진 표기의 원래 재생 박·길이·성부를 끝점으로도 사용한다. 이미 시작한 음의 타건과 타이 길이, 반복 경계는 보존한다.

- 960×750 dark·1400×750 light의 실제 Electron에서 6가지씩 총 12가지 가져오기·Native 저장과 재열기·MusicXML 재열기·MIDI·PDF를 확인했다. 타이 끝점 두 사례에서 MIDI 음 시작 세기가 복구됐으며 음높이·시작·지속과 발음 횟수는 같았다. 타이 시작점 사례는 C5의 한 번의 2박 발음과 이후 E5·F5의 MIDI 세기 87·100을 보존한다. 출력 XML 12건을 고정 XSD로 검사하고 실제 PDF를 확인했다.
- 양끝을 다른 성부에 지정하면 두 성부가 변하고 같은 성부로 읽히면 해당 성부만 변한다. 샘플 피아노의 48kHz 격리 오프라인 WAV 12건에서는 짧은 G4의 대역이 크레셴도에서 +4.66dB, 디미누엔도에서 −10.62dB였다. 반대쪽 짧은 D5는 두 성부 대조에서 증가하고 한 성부 대조에서는 동일했다. 긴 C5의 단독 WAV는 모두 같은 해시였다. MIDI의 note-on 세기와 이미 눌린 샘플의 소리를 별도로 확인했다.
- MuseScore 4.7.5의 정상 WAV에서 두 성부 크레셴도의 짧은 G4 대역은 +4.17dB, 디미누엔도는 −0.57dB였다. Studio 사본의 양끝 성부가 다른 크레셴도와 같은 성부 크레셴도는 MuseScore WAV의 해시가 같았다. 외부 MIDI는 한 성부 크레셴도만 정상 종료했으며 그 파일의 시작 세기는 전부 80이었다. 다른 MIDI 실행의 SIGABRT는 제외했다. 기기 출력·청음·지속음의 연속 이득 변화는 별도 검증 범위다.
- 실패 재현 2건, 집중 83건, 관련 216파일·2,722건 및 타입 검사 포함 생산 빌드를 확인했다. 관련 검사에서 외부 opt-in 1건을 건너뛰었다. `out/parity-qa/hairpin-playback-20261124/`에 `before.json`, `after.json`, `app-comparison.json`, `wav-comparison.json`, `midi-velocities.log`와 외부 실행 경로·해시가 있다. 처음 만든 같은 시작 박의 장음 끝점 파일은 가져오지만 MusicXML 내보내기가 거부하는 별도 대조다. 파일은 `endpoint-to-long-note-audit/`에 보존했다.

## 실음 보기의 문서 전환과 늦은 응답

두 화면 폭에서 실제 파일로 검증했다. 고정 이조 악보 A에서 실음 보기와 음표를 선택하고 Native 열기를 취소하면 보기·선택·수정 이력이 유지됐다. 실음 A 재생 중 Native B 선택기 응답을 보류한 뒤 가변 이조 MusicXML을 열었다. 새 문서는 기보음·0박 정지 상태에서 시작했다. 이후 B의 실제 Native IPC 반환을 관측한 뒤에도 새 문서의 초점과 상태가 일치했다.

같은 악보 ID를 가진 고정 이조 B를 명시적으로 열고 실음 보기를 다시 켰다. 기보음과 실음 화면에서 저장한 Native 악보 본문과 MIDI·MusicXML 및 실제 1쪽 PDF 래스터가 같았다. XML 4건이 고정 XSD를 통과했다. 제품 수정 없이 `out/parity-qa/concert-document-receipt-20261124/{results,comparison}.json`에 회귀를 보강했다. 파일 선택기의 응답을 자체 테스트에서 제어했으며 물리 OS 대화상자는 별도다.

## 악보단을 합쳤다가 다시 나눌 때의 초점

2마디 조각에 초점을 둔 채 3마디 앞 나누기를 다시 실행해 두 마디를 합쳤다. 다시 실행 취소하면 이전 빌드는 합쳐진 조각의 끝 마디인 3마디로 초점을 옮겼다. 같은 조각으로 초점을 복구할 때는 처음 초점을 둔 마디를 이어받는다. 사용자가 새로 조각에 초점을 두면 해당 조각의 기본 마디를 사용한다.

- 960×750 dark·1400×750 light의 시스템·페이지 나누기 네 조건 모두에서 수정 전 3마디로 이동했고 수정 후 2마디로 돌아왔다. 마지막 조각을 추적하는 앞 슬라이스의 네 조건도 최종 빌드에서 다시 통과했다.
- Native와 곡선 측정, MusicXML·MIDI 바이트 및 실제 1쪽 PDF 래스터가 수정 전후 일치했다. 출력 XML 4건은 고정 XSD를 통과했다. 960px 대조 PDF를 직접 검토했다.
- 단위 재현 실패 뒤 관련 6파일·144건, typecheck·생산 빌드, DPR 2의 Studio profile classic-15와 fixed-canvas가 통과했다. 근거는 `out/parity-qa/slur-merge-focus-unit-{red,green}-20261123.log`, `slur-merge-focus-app-after-20261123/comparison.json`, `slur-reflow-focus-final-control-20261123/results.json`, `slur-merge-focus-snapshots-20261123/statuses.log`에 있다.

## 헤어핀 서식 안내와 조각 초점까지 전체 회귀

기존 두 워커의 `npm run test:all`이 1,833.28초 만에 종료 0을 반환했다. Vitest 794파일·7,705건과 Node 검사 5건이 통과했고, 외부 opt-in 1건은 건너뛰었다. 입력 6,596개의 해시는 종료 직후 독립 확인에서도 일치했다. 로그·receipt·독립 확인은 `out/parity-qa/hairpin-continuation-slur-reflow-full-20261123/`에 있다.

이 실행은 바로 위의 마지막 합치기·나누기 초점 수정 전이다. 그 뒤 제품 소스는 SVG 초점 복구 두 파일과 단위 검사 한 파일만 달라졌다. 최종 소스는 위의 집중·생산 앱 검사와 문서 검사로 확인했다. 두 워커로 실패했던 이전 기록과 원인은 별도 보존한다.

## 줄 나누기 실행 취소와 슬러 초점

3마디 마지막 조각을 선택하고 2마디 앞 시스템 나누기를 해제했다. 세 악보단이 두 개가 된 상태에서 마지막 조각에 초점을 두고 실행 취소하면, 이전 빌드는 마지막 조각과 숫자가 같은 가운데 악보단으로 초점을 옮겼다. 줄·페이지 두 조건과 960×750 dark·1400×750 light에서 같은 결과였다. 슬러·헤어핀의 표시 조각은 현재 조각에 속한 마디로 초점을 복구한다. 시작·끝 조각은 연결된 마디를 사용한다.

- 수정 앱 네 조건에서 한 번의 실행 취소와 다시 실행으로 세 악보단과 두 악보단을 오갔다. 마지막 마디의 같은 슬러 조각이 시스템 인덱스 2와 1에 있을 때 각각 초점을 받았다. 선택한 슬러 ID와 연결 음표, 이력 0/1, 다시 그린 곡선 채움의 양쪽 간격을 확인했다.
- 네 실제 사본의 Native 재열기·MusicXML/MIDI 바이트와 모든 PDF 쪽의 래스터가 이전 빌드와 일치한다. 일반 나누기 PDF 1쪽과 페이지 나누기 PDF 2쪽의 실제 출력을 확인했고, MusicXML 사본 4건은 고정 XSD를 통과했다. 수동 높이·명시적 0 오프셋 대조는 두 폭에서 곡선 좌표, Native와 두 PDF 쪽을 유지했다.
- 관련 초점 단위 19건, 타입·생산 빌드, DPR 2의 Studio profile classic-15·fixed-canvas가 통과했다. `out/parity-qa/slur-reflow-app-20261123/results.json`, `slur-reflow-focus-app-20261123/comparison.json`, `slur-reflow-manual-control-20261123/results.json`과 `slur-reflow-snapshots-20261123/statuses.log`에 근거가 있다.

## 줄바꿈 헤어핀의 조각 서식 안내

세 악보단에 걸친 한 헤어핀을 일반 입력, 서식 없는 `continue`, 벌어짐·좌표·점선을 지정한 `continue`로 비교했다. 세 원본이 고정 XSD를 통과한다. 수정 전에는 셋 모두 같은 자동 배치와 재생으로 가져왔고, 지정 서식의 손실 안내가 없었다. 명시적 조각 서식은 현재 자동 배치로 표시하며 한국어로 안내한다. 기술 정보에 원래 속성 값과 파트·마디·방향 주소를 남긴다.

- 두 폭의 생산 앱에서 이전과 수정 빌드를 각각 실행했다. 일반·서식 없는 표식에서는 경고가 없고 서식 있는 표식에서만 2마디 경고와 기술 정보가 표시된다. 시작·끝 ID와 세 SVG 조각, Native와 MusicXML 재열기, MIDI 바이트와 1쪽 PDF 래스터가 일치했다. 실제 사본 6건은 고정 XSD를 통과했고 PDF를 검토했다.
- MuseScore 4.7.5의 일반 대조는 정상 종료해 세 조각의 PDF를 확인했다. 서식 있는 원본의 변환은 SIGABRT로 종료해 그 산출물을 제외했다. 외부 서식 보존과 재생 음량은 미검증이다.
- 집중 37건과 타입 검사 포함 생산 빌드가 통과했다. 자료는 `out/parity-qa/hairpin-continuation-20261123/`의 `unit-red.log`, `unit-green.log`, `comparison.json`, `musescore-pdf.log`와 `hairpin-continuation-app-{before,after}-20261123/results.json`에 있다.

## 이전 전체 실행 실패 파일의 재수집

최종 전체 회귀에서 실패가 나온 renderer 네 파일을 제품·테스트 소스가 동일한 상태에서 두 워커로 전부 수집했다. 실패 이름만 선택했던 77건과 달리 파일 전체 556건을 실행했고 429.24초 만에 종료 0이었다. 전체 실행만 실패한 조건은 재현되지 않았다. 실행 명령과 로그는 `out/parity-qa/renderer-collection-recheck-20261123-213426/`에 보존했다. 아래 전체 실행의 실패 기록을 함께 유지한다.

## 최종 소스의 전체 실행과 분리 재검증

최종 `npm run test:all`의 일반 두 워커 실행은 3,945.54초에 종료 코드 1을 반환했다. Vitest 789파일·7,624건 통과, renderer 4파일·77건 실패, 외부 opt-in 1건 건너뜀이다. 종료 시점과 독립 확인에서 고정 입력 6,594개의 해시가 모두 유지됐다. 이전 전체 통과 이후 제품 소스 변경은 MusicXML 헤어핀 가져오기와 내보내기에 한정됐다.

- 원래 실패에는 15·30초 제한 시간, 파트보의 호출 횟수와 제목 찾기 오류가 포함됐다. 로그에는 jsdom의 `scrollIntoView` 오류도 남아 있다. 동일 제품과 테스트에서 실패한 이름 77개만 선택해 워커 하나와 기존 제한 시간으로 실행한 결과, 4파일·77건이 모두 통과했다. 일반 두 워커 실행은 실패로 기록한다. 실행 순서·부하의 영향은 독립적으로 확정하지 않았다.
- Node 도구 검사 5건은 별도 실행에서 통과했다. 최종 생산 빌드의 DPR 2에서 Studio profile classic-15와 fixed-canvas가 통과했고 baseline은 유지했다.
- 원래 실행과 입력 확인은 `out/parity-qa/hairpin-slur-cross-staff-number-full/{test-all.log,receipt.json,independent-post-exit.json}`에 보존했다. 분리 실행은 `hairpin-two-staves-all-renderer-failures-retry.log`, 최종 조판 결과는 `hairpin-two-staves-snapshots/statuses.log`를 참조한다.

## 같은 파트의 두 보표에 놓인 헤어핀

두 마디에 걸치는 크레셴도와 디미누엔도를 각 보표에 하나씩 배치했다. 기존 사본은 둘 다 1번으로 기록했다. Studio에서는 두 기호를 다시 열었으나 MuseScore 4.7.5가 정상 재출력한 사본에서 아래 보표 기호가 빠졌다. 같은 파트에서 실제 파일에 시작 표식을 쓴 때부터 끝 표식을 쓸 때까지 번호를 예약한다. 끝을 기록한 뒤 번호를 재사용하고 실제 동시 17개는 안내한다. 연결 음표와 보표의 소유권은 유지한다. [MusicXML 번호 규칙](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/number-level/)

- 수정 전 단위 실패와 두 화면 폭의 실제 사본을 보존했다. 수정 후 960×750 dark·1400×750 light에서 Native와 MusicXML 재열기, 선택과 두 헤어핀의 표시를 확인했다. XML은 아래 보표의 시작·끝 번호만 달라졌고 Native 악보·MIDI 바이트·1쪽 PDF 래스터가 일치했다. 원본과 사본 4건이 고정 XSD를 통과했다. 실제 PDF를 검토했다.
- 수정 사본을 정상 변환한 MuseScore는 위 보표의 첫 마디 0박 시작과 아래 보표의 1박 시작, 둘째 마디의 두 끝점 3박을 보존했다. 비교는 정상 종료한 Studio 사본 두 개를 사용했다. 원본 XML 변환의 SIGABRT 산출물은 제외했다. 외부 음량 청취는 미검증이다.
- 관련 Vitest 197파일·2,383건과 타입 검사 포함 생산 빌드가 통과했다. 외부 opt-in 1건을 건너뛰었다. `out/parity-qa/hairpin-two-staves-{unit-red,related,build,external,external-final}.log`, `hairpin-two-staves-{audit,app}/results.json`, `hairpin-two-staves-app/external-comparison.json`에 근거가 있다.

## 같은 헤어핀 번호의 다른 정수 표기

MusicXML의 같은 번호를 `1`, `01`, `+01`로 적으면 정수값은 같지만 이전 앱은 짝을 찾지 못했다. 고정 XSD가 허용하는 1–16의 정수 표기만 같은 번호로 묶는다. 서로 다른 번호의 짝 없음과 순서 진단을 유지한다. [MusicXML 번호 규칙](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/number-level/)

- 집중 사례 세 건의 이전 실패와 960×750 dark·1400×750 light의 가져오기 거부를 재현했다. 수정 앱 두 폭에서 선택, Native 저장·재열기, XML 재출력·재열기와 MIDI·PDF를 확인했다. 원본과 출력 4건이 고정 XSD를 통과했다. 일반 번호 대조와 Native 악보·MusicXML/MIDI 바이트·PDF 래스터가 일치했다.
- 관련 Vitest 187파일·2,305건과 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건을 건너뛰었다. 아래 전체 7,696건은 정수 표기 수정 전이다. 출력 XML이 기존 정상 MuseScore 대조군과 동일해 외부 실행은 재사용했다.
- 최종 빌드의 DPR 2에서 Studio profile classic-15와 fixed-canvas가 모두 통과했다. DPR 1의 이전 실패와 같은 환경의 수정 전 대조 기록은 보존했다. baseline 변경은 없다.
- 근거는 `out/parity-qa/hairpin-number-lexical-{unit-red,related,build,app,outputs}.log`, `hairpin-number-lexical-{red-app,app}/results.json`, `hairpin-slur-final-snapshots/statuses.log`에 있다.

## 헤어핀과 줄·페이지 경계 슬러까지 전체 회귀

`npm run test:all`은 2,069.67초에 종료 코드 0을 반환했다. Vitest 793파일·7,696건, Node 5건이 통과했고 외부 앱 opt-in 1건을 건너뛰었다. 실행 전 고정한 입력 6,593개는 종료 직후 독립 확인에서도 일치했다. `out/parity-qa/hairpin-slur-combined-full/`의 실행 로그·receipt·독립 확인을 보존했다.

## 같은 줄 경계를 넘는 두 슬러

안쪽 슬러의 시작을 앞 악보단으로 옮겼다. 두 슬러의 다음 악보단 조각이 같은 x에서 이어질 때 실제로 교차했다. 그 위치의 안쪽 슬러 잉크를 사용해 바깥 자동 슬러의 자유 끝에 간격을 둔다. 음표에 붙는 끝과 수동 배치는 기존 계산을 사용한다.

- 960×750 dark와 1400×750 light의 줄·페이지 나누기 네 경로에서 다음 악보단의 겹치는 표본이 각각 4열에서 0열로 줄었다. 최소 채움 간격은 각각 −20.49→6.01 및 −20.33→6.55 SVG 단위였다. 앞 악보단에서 관측한 모든 좌표와 다음 조각의 키보드 선택은 유지됐다.
- 실제 Native 저장·재열기와 MusicXML·MIDI 바이트 동일성을 확인했다. 원본과 출력 8건은 고정 XSD를 통과했다. 줄 나누기 PDF는 1쪽, 페이지 나누기 PDF는 2쪽이며 전후 쪽수가 같다. 두 화면 폭에서 같은 PDF 결과를 얻었다. Studio의 이전·수정 2쪽째와 정상 종료한 MuseScore 4.7.5의 줄 나누기 PDF를 직접 검토했다.
- 위·아래 방향 및 시작·끝 경계의 회귀 사례 두 건이 수정 전 실패했다. 수정 후 집중 7파일·56건과 타입 검사 포함 생산 빌드가 통과했다. 이전의 한 슬러만 경계를 넘는 대조와 수동 0 오프셋·높이 대조를 최종 빌드에서 재실행했다. 각 곡선 측정, Native 재열기, 모든 PDF 쪽의 래스터가 일치했다.
- 근거는 `out/parity-qa/slur-shared-break-{unit-red,focused,build,app,outputs-catalog,preserved-controls}.log`, `slur-shared-break-app/comparison.json`, `slur-layout-break-final-control/results.json`, `slur-layout-break-manual-final-preserved/results.json`과 `leading-rest-direct-midi-foszlxug/results.json`에 있다.

세 악보단 대조에서는 가운데 악보단에 높은 A5를 추가했다. 현행 빌드의 두 폭·줄/페이지 나누기 네 경로에서 세 조각 모두 분리됐으며 가운데 조각의 관측 최소 간격은 8.51·8.46 SVG 단위였다. Native 재열기와 다음 조각의 키보드 선택, 두 폭의 MusicXML·MIDI·PDF 이미지 일치, 고정 XSD 8건과 실제 한 쪽 PDF를 확인했다. 제품 변경 없이 `out/parity-qa/slur-two-breaks-app/comparison.json`에 회귀 증거를 남겼다.

## 악보단·페이지 경계를 잇는 슬러 간격

첫 마디에는 1성부만 있고 둘째 마디부터 성부가 추가되는 악보를 사용했다. 두 악보단을 잇는 1성부의 긴 슬러와 둘째 악보단 안의 짧은 슬러가 실제로 겹쳤다. 양끝의 악보단과 해당 악보단 안의 위치를 함께 비교해 중첩 관계를 정한다. 각 악보단에서 계산한 안쪽 곡선의 잉크를 사용해 바깥쪽 자동 곡선을 배치한다.

- 줄 또는 페이지를 강제로 나눈 네 가지 화면 조합에서 SVG 채움 경계를 직접 측정했다. 960×750 dark의 관측 최소 간격은 −3.69에서 5.64 SVG 단위, 1400×750 light는 −5.62에서 3.73 단위로 바뀌었다. 표본 97열에서 겹치는 열이 각각 22개와 9개에서 0개가 됐다. 다음 악보단 조각의 키보드 선택과 활성 요소를 확인했다.
- 줄 나누기는 A4 1쪽, 페이지 나누기는 2쪽이다. 이전과 쪽수가 같고 같은 설정의 두 화면 폭에서 PDF 래스터가 일치했다. 전후 2쪽째와 MuseScore 4.7.5가 정상 출력한 줄 나누기 대조 PDF를 직접 검토했다. Studio의 전후 Native 악보와 MusicXML·MIDI 파일은 동일했고, 실제 출력 XML 4건은 고정 XSD를 통과했다.
- 페이지를 가로지르는 바깥 슬러의 수동 위쪽 방향·높이 2·가로와 세로 오프셋 0을 실제 Native로 왕복했다. 두 화면 폭의 곡선 좌표와 전체 PDF 래스터가 수정 전후 일치했다.
- 회귀 단위 검사의 수정 전 실패를 보존했다. 집중 7파일·53건, 관련 288파일·3,106건 및 타입 검사 포함 생산 빌드가 통과했다. 외부 opt-in 1건을 건너뛰었다. DPR 1에서 profile classic-15와 fixed-canvas는 두 폭의 셈여림 높이(23→22.3)와 y 위치(264.9→265.4) 차이로 실패했다. 같은 조건의 수정 전 빌드에서도 실제 profile JSON과 fixed-canvas diff JSON이 각각 바이트 단위로 일치했다. baseline은 유지했다.
- 근거는 `out/parity-qa/slur-layout-break-{unit-red,focused,related,build}.log`, `slur-layout-break-probe-b/results.json`, `slur-layout-break-app/comparison.json`, `slur-layout-break-manual-after/comparison.json`, `slur-layout-break-{snapshots,snapshot-control}/`에 있다. 두 슬러 모두 같은 악보단 경계를 넘는 조건은 별도 검증 항목으로 등록했다.

## MusicXML에 끝점이 먼저 기록된 헤어핀

2성부 G4에서 시작해 같은 보표 1성부 F5에서 끝나는 유효한 XML에서, `backup` 때문에 시작점보다 끝점이 파일에 먼저 나온다. 이전 앱은 이를 짝이 없는 끝점으로 거부했다. 파일 순서에서 번호에 해당하는 두 표식을 모으고, `offset`이 반영된 악보 시간과 기존 성부·쉼표 앵커로 연결한다. 성부 생략 시 시작 성부를 이어 쓰고, 짝 없음·중복·실제 역방향은 안내한다. [MusicXML 헤어핀](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wedge/) · [번호 규칙](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/number-level/)

- 숫자·이름 성부, 끝의 성부 생략, 쉼표 끝점, 번호 재사용과 잘못된 표식의 단위 실패를 재현했다. 역순과 정상 순서 대조의 Studio 재생 셈여림·MIDI를 비교했다. 헤어핀 양끝의 성부가 다르면 두 성부에 적용되고 끝의 성부를 생략하면 시작한 성부에만 적용되는 기존 계약을 보존했다. 최종 관련 243파일·2,903건과 타입 포함 생산 빌드가 통과했다. 외부 선택 실행 1건은 건너뛰었다.
- 960×750 dark·1400×750 light의 이전 앱에서 가져오기 거부를 확인했다. 수정 앱은 두 폭에서 동일한 시작·끝, 음표 선택, Native와 MusicXML 재열기, 실제 8음 MIDI와 1쪽 A4 PDF를 확인했다. 원본과 MusicXML 사본 두 개가 고정 XSD를 통과했고 두 PDF 래스터가 일치했다. 페이지를 직접 검토했다.
- MuseScore 4.7.5는 Studio가 시작점부터 기록한 사본의 헤어핀 시작 0박·끝 3박을 정상 재출력했다. MuseScore 사본에서는 성부 표식이 생략됐다. 정상 MIDI의 8음 음높이·시작 박은 일치했고 음 길이는 각각 1/480박 짧았다. 역순 원본의 XML 변환과 헤어핀 없는 MIDI 대조는 SIGABRT로 종료해 비교에서 제외했다. 외부 음량 차이와 물리 OS 파일 대화상자는 미검증이다.
- `out/parity-qa/hairpin-file-order-{red,focused,related,build,app}.log`, `hairpin-file-order-{red-app,app}/results.json`, `hairpin-file-order-app/external-check.json`과 외부 기록 `leading-rest-direct-midi-{cjeqy2h3,c0p1lgeu,7xmyq1k5}/results.json`에 근거가 있다.

## 슬러 교환과 한 악보단 조판까지 누적 회귀 재검사

이전 PID 85770은 종료 기록 없이 중단됐다. 이전 로그를 보존하고 새 폴더에서 `npm run test:all`을 실행했다. PID 7308이 1,994.62초 만에 종료 0을 반환했다. Vitest 792파일·7,687건과 Node 검사 5건이 통과했고 외부 앱 opt-in 1건을 건너뛰었다. 입력 6,591개의 해시는 종료 및 독립 확인에서 모두 일치했다. 이 결과는 위 헤어핀 수정 전이다. `out/parity-qa/slur-exchange-and-layout-full-retry/`의 `test-all.log`, `receipt.json`, `independent-post-exit.json`에 기록했다.

## 다성부 자동 슬러의 방향과 곡선 간격

한 보표에서 1·2성부의 짧은 슬러가 안쪽으로 휘어 교차했다. 이음 구간에 같은 보표의 추가 성부가 있으면 1성부 안에서 잇는 슬러는 위쪽, 다른 성부의 음을 잇는 슬러는 아래쪽을 기본으로 쓴다. 끝 음표의 실제 길이까지 고려하며 다른 보표의 성부는 영향을 주지 않는다. 기존 가사·셈여림의 하단 간격과 수동 방향·높이·명시적 0 오프셋을 유지한다. [MuseScore 4.7.5 슬러 배치](https://raw.githubusercontent.com/musescore/MuseScore/v4.7.5/src/engraving/rendering/score/slurtielayout.cpp)

- 방향 수정 뒤에도 두 성부를 가로지르는 긴 슬러가 아래쪽 2성부의 짧은 슬러와 닿았다. 960px에서 겹치는 가로 범위의 곡선 중심선 간격을 101점으로 샘플링한 최소값은 −1.19 SVG 단위였다. 양끝이 같은 보표·악보단에 있고 끝점 성부 중 하나의 짧은 자동 곡선을 완전히 감싸는 경우, 기존 잉크 간격 계산으로 바깥 곡선을 띄웠다. 저작한 곡선과 선택·DOM 순서는 유지한다.
- 최종 960×750 dark와 1400×750 light에서 짧은 자동 슬러가 위·아래로 나뉘고 아래쪽 두 곡선의 최소 관측 간격이 11.17·10.77 SVG 단위가 됐다. 앱의 음표 선택과 Native 재열기, 수동 방향·0 오프셋 대조를 확인했다. A4 PDF 두 개의 래스터가 일치했고 실제 페이지를 검토했다. 조판 변경 전후의 Native 악보는 동일했고 MusicXML·MIDI 파일은 바이트가 같았다.
- 관련 102파일·806건, 타입 검사 포함 생산 빌드, Studio profile classic-15 및 fixed-canvas가 통과했다. 기준 이미지는 유지했다. 외부 방향 비교는 MuseScore가 정상 저장한 XML의 곡선 좌표를 사용했다. 외부 PDF·다중 악보단을 잇는 복합 중첩은 별도 검증 범위다.
- `out/parity-qa/slur-voice-sides-red-app.log`, `slur-voice-nesting-red-app.log`, `slur-voice-nesting-{related,build,app}.log`, `slur-voice-nesting-app/comparison.json`과 `slur-voice-nesting-snapshots/`에 좌표·캡처·실행 결과가 있다.

## 서로 다른 성부를 잇는 슬러의 MusicXML 순서

같은 보표에서 2성부의 첫 음 G4를 1성부의 마지막 음 F5로 잇는 슬러는 XML에 끝점이 먼저 기록됐다. 번호 1을 쓰는 다른 슬러 두 개도 XML에서는 차례로 닫히지만 악보 시간에서는 겹친다. 기존 앱은 이 악보를 거부했다. XML 순서로 두 표식을 짝짓고 실제 음악 시간으로 시작·끝을 확인한다. 내보낼 때 파일에서 동시에 열린 슬러는 번호를 나눠 쓰고, 최대 16개가 모두 차면 안내한다. 저장 검증은 원본 슬러의 양끝과 개수를 비교하며 Native에 있는 번호는 유지한다. [MusicXML 번호 규칙](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/number-level/)

- 가져오기 실패, 출력 번호 충돌, 16개 동시 사용 한도를 단위 검사에서 재현했다. 번호만 바뀌어도 실제 앱이 사본 쓰기를 막는 별도 실패도 재현했다. 저장 검증과 경계 검사를 수정한 뒤 관련 Vitest 309파일·3,525건이 통과했고 외부 opt-in 1건은 건너뛰었다. 최종 타입 포함 생산 빌드도 통과했다.
- 960×750 dark·1400×750 light에서 원본 가져오기, 2성부 시작 음머리 선택, Native 저장·재열기, 실제 MusicXML·MIDI·A4 PDF를 확인했다. 같은 번호를 가진 세 슬러가 겹치는 Native 악보는 실제 MusicXML을 저장하고 재열어 연결 음표가 모두 같은지 확인했다. 원본 Native는 동일 해시였다. 원본과 앱 XML 사본 4건이 고정 XSD를 통과했다. 두 폭의 MIDI 8음과 각 1쪽 PDF 래스터가 일치했다.
- MuseScore 4.7.5의 정상 MusicXML 변환 세 건에서 각각 슬러 세 개의 연결 음표가 동일했다. 외부 PDF 실행은 SIGABRT로 종료해 검증 산출물에서 제외했다. 실제 OS 파일 대화상자, 교차 보표 슬러와 꾸밈음에 직접 붙는 슬러는 이번 범위에 포함되지 않았다.
- `out/parity-qa/slur-file-order-{red,save-red-b,save-focused,related,final-build-b}.log`, `slur-file-order-{red-app,app-final}/results.json`과 `slur-file-order-external-check.json`에 근거가 있다. 파일 출력 수정 직후 PDF에서 1·2성부의 짧은 자동 슬러가 교차하는 별도 조판 차이를 관찰했다.

## MusicXML의 글자 성부 식별자

MusicXML은 성부를 문자열로 구분한다. 위 보표 `Melody`, 아래 보표 `Bass`·`Inner`가 있는 유효한 파일을 이전 Studio는 거부했고 MuseScore 4.7.5는 정상 MIDI를 만들었다. 이제 같은 파트·보표의 전체 마디에서 숫자 성부의 칸을 먼저 확보하고, 나머지 식별자에 빈 내부 번호를 부여한다. 음표와 성부를 명시한 슬러·헤어핀에 같은 대응을 사용한다. 다시 내보내는 MusicXML에는 Studio 성부 번호를 기록한다. [MusicXML 4.0 성부 정의](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/voice/)

- 두 글자 성부 및 숫자·글자 혼합에서 이전 단위 실패를 확인했다. `1`·`01`이 함께 있거나 `0`을 식별자로 쓴 대조, 기존 숫자 충돌과 일반 숫자 성부도 통과했다. 관련 Vitest 307파일·3,306건 통과, 외부 opt-in 1건 건너뜀. 타입 포함 생산 빌드가 통과했다. 직전 전체 7,675건은 이 수정 전이다.
- 960×750 dark·1400×750 light의 이전 앱에서 가져오기 거부를 재현했다. 수정 앱의 두 폭에서 같은 성부의 음머리 선택, 슬러·헤어핀 끝점, Native 저장·재열기, MusicXML·MIDI·A4 1쪽 PDF를 확인했다. 두 폭의 PDF 래스터가 같았고 실제 페이지를 검토했다.
- 원본과 Studio의 숫자 성부 사본을 MuseScore 4.7.5에서 각각 정상 변환했다. 두 외부 MIDI의 음높이·시작 박 7건은 Studio와 같고, 음 길이는 각각 1/480박 짧았다. 교차 보표 기보와 4개를 넘는 성부의 편집은 이번 검증 범위에 포함되지 않았다.
- `out/parity-qa/musicxml-named-voices-{red,focused,related,build}.log`, `musicxml-named-voices-{red-app,app}/results.json` 및 `musicxml-named-voices-output-check.json`에 근거를 남겼다. 최종 도움말 빌드의 960×750 화면에서 내보낼 때 성부 번호를 쓴다는 문구와 캡처를 확인했다. `musicxml-named-voices-help/results.json`에 기록했다.

## 압축 MXL에서 글자 성부와 단순 반복

같은 보표·성부 구조를 두 번 반복하도록 작성해 MXL로 가져왔다. 같은 수정 빌드의 960×750 dark·1400×750 light에서 두 성부의 선택과 범위 기호, Native 저장·재열기 및 실제 A4 1쪽 PDF를 확인했다. 구조 유지 사본은 도돌이표를 유지했고 펼친 사본은 네 마디에 슬러와 헤어핀을 두 번씩 기록했다. 두 폭의 MIDI에서 0–8박에 이어 8–16박에 같은 음이 반복되어 음높이·시작·길이 14건이 일치했다. 평문·압축 원본 본문과 실제 출력 XML을 합친 8건이 고정 XSD를 통과했다.

MuseScore 4.7.5는 Studio에서 펼친 사본을 정상 변환했다. 14음의 음높이·시작 박이 일치했고, 음 길이는 각각 1/480박 짧았다. 원본 MXL 변환은 SIGABRT로 종료해 산출물을 비교에서 제외했다. 제품 변경 없이 압축 가져오기와 반복 펼치기 회귀를 보강했다. 실제 OS 파일 대화상자와 외부 GUI·청음은 미검증이다. `out/parity-qa/musicxml-named-voice-repeat-app/results.json`, 독립 출력 검사와 외부 `leading-rest-direct-midi-tazys9o1/results.json`에 근거를 남겼다.

## 읽기 전용 실음 보기에서의 PNG

고정 B♭ 이조 클라리넷을 960×750 dark와 1400×750 light에서 열어 공개 보기 메뉴를 전환했다. 화면에 두 플랫이 추가되고 선택한 음머리의 y 좌표는 189에서 194로 바뀌었다. 선택 ID와 편집 이력 0회는 유지됐다.

- 기보음과 실음 화면에서 각각 생성한 PNG 네 개는 2480×3508, 300dpi이며 SHA256이 같다. 실제 이미지는 기보 조표·임시표와 Cmaj7/E를 유지했다. 전환·출력 뒤 저장한 Native 악보는 전환 전과 같다. 재열기 후 기보음으로 시작했다.
- 첫 실행은 검증 도구가 초기 해상도를 150dpi로 가정해 멈췄다. 앱의 기존 300dpi와 실제 pHYs를 대조한 후 두 폭에서 통과했다. 화면·출력 로직을 바꾸지 않았다. PNG가 기보음으로 저장된다는 설명을 추가한 뒤 별도로 빌드하고 960×750 앱의 도움말에서 실제 문구를 확인했다. `out/parity-qa/concert-pitch-png-help/results.json`에 문구와 캡처가 있다.
- `out/parity-qa/concert-pitch-png-app.log`와 `concert-pitch-png-app-b/results.json`에 초기 실패와 최종 캡처·파일 해시가 있다. 실제 OS 파일 대화상자와 다중 페이지 실음 보기 PNG는 미검증이다.

## 성부 번호 충돌 수정까지 누적 전체 검사

`npm run test:all`이 2,224.88초 만에 종료 0이었다. Vitest 790파일·7,675건과 Node-native 5건 통과, 외부 MuseScore opt-in 1파일·1건 건너뜀이다. 고정 입력 6,587개는 종료 시점과 독립 확인에서 모두 일치했다. 꾸밈음 변환·음가 덮어쓰기 후속 수정과 아래 보표 성부 충돌 수정이 포함된다. 위 실음 PNG 회귀는 종료 후 같은 제품 빌드로 따로 확인했다. 근거는 `out/parity-qa/lower-staff-voice-collision-full-stamp/`의 `test-all.log`, `receipt.json`, `independent-post-exit.json`에 있다.

## 두 보표 파트의 줄·페이지 나누기와 묶음 쉼표

아래 보표 ID `b6`에 악보단 나누기, `b12`에 페이지 나누기를 지정한 14마디 프로젝트를 사용했다. 960×750 dark 터치 에뮬레이션과 1400×750 light에서 일반 PDF·묶음 PDF를 실제로 저장했다. 두 보표 모두 5·6마디 사이를 묶지 않았고 6마디가 첫 페이지의 다음 악보단, 12마디가 두 번째 페이지의 첫 악보단에 놓였다. 아래 보표의 음표와 `dolce`도 표시됐다.

- 실제 일반·묶음 PDF 4건은 각각 A4 두 페이지이며 같은 형식의 각 래스터가 두 창에서 일치했다. 묶음 PDF의 두 페이지를 검토했다. 출력 전후 Native 악보·MIDI·MusicXML 내용이 유지되고 재열기 뒤의 악보가 일치했다. 실제 XML 4건이 고정 XSD를 통과했고 두 레이아웃 경계도 남았다.
- 첫 실행은 검증 도구가 악보단 번호를 수집하지 않아 실패했다. 실제 SVG의 악보단 소유권을 수집한 다음 재실행에서 두 보표의 악보단 위치를 검증했다. 제품 변경 없이 실제 출력 회귀를 보강했다.
- `out/parity-qa/grand-rests-combined-breaks-app.log`에 첫 실행 오류, `grand-rests-combined-breaks-app-b/results.json`에 재실행, PDF·래스터 및 해시가 있다. 물리 터치와 외부 프로그램의 파트 추출은 미검증이다.

## MusicXML 아래 보표의 성부 번호 충돌

아래 보표의 MusicXML 성부 5와 9 또는 1과 5가 내부에서 모두 성부 1이 되면 동시에 울리는 음이 시간순으로 이어져 가져오기가 리듬 초과로 실패했다. 파트와 보표별로 전체 마디의 성부를 확인하고 기존 번호가 쓰는 칸을 먼저 확보한 뒤 충돌한 성부를 다른 칸에 배정한다. 일부 마디에 해당 성부만 남아도 같은 번호를 사용하고 음표·슬러·헤어핀의 연결을 유지한다. 충돌 없는 5·6번 대조와 위 보표 성부 1의 배치는 그대로다. [MusicXML 4.0 성부 정의](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/voice/)

- XSD가 허용하는 입력에서 단위 실패 두 건과 이전 생산 앱 960×750 dark·1400×750 light의 가져오기 거부를 재현했다. 수정 뒤 관련 Vitest 307파일·3,302건이 통과했고 외부 opt-in 1건을 건너뛰었다. 타입 검사를 포함한 생산 빌드가 통과했다. 조판 기준 이미지는 유지했다. 이후의 누적 전체 실행은 위에 기록했다.
- 같은 두 폭의 생산 앱에서 실제 MusicXML 가져오기, 성부 2 음머리 선택, Native 저장·재열기, 구조 유지 MusicXML·MIDI·PDF를 확인했다. 입력과 실제 XML 사본 2건은 고정 XSD를 통과했다. 1쪽 A4 두 출력의 검토 이미지가 일치했으며 전체 PDF와 실제 화면에서 두 성부와 범위 기호를 확인했다.
- MuseScore 4.7.5 CLI는 원본과 Studio MusicXML 사본을 각각 정상 변환했다. 두 외부 MIDI와 Studio MIDI의 음높이와 시작 박 7건이 일치했다. MuseScore가 만든 각 음의 길이는 Studio보다 1/480박 짧았다. 외부 GUI·청음·물리 파일 선택과 네 성부를 넘는 악보의 편집은 미검증이다.
- `out/parity-qa/lower-staff-voice-collision-{red,focused,regression,build}.log`, `lower-staff-voice-collision-{red,green}-app/results.json`과 두 외부 기록 `leading-rest-direct-midi-zz4fqh9s/`·`leading-rest-direct-midi-kj7imjos/`에 로그·캡처·파일 해시가 있다.

## 꾸밈음 변환과 음가 덮어쓰기의 기존 음높이

F♯ 일반 음표를 다음 본음의 꾸밈음으로 변환하거나 음가를 늘려 덮으면, 뒤에 이미 붙은 꾸밈음의 F♯가 F로 바뀔 수 있었다. 이동 전후의 박을 각각 기준으로 임시표를 계산하고, 바뀌는 기존 음높이만 명시한다. 변환은 기존 꾸밈음을 보존하고 새 꾸밈음을 앞에 붙인다. 음가 덮어쓰기의 확인·취소와 범위 밖 박 위치는 유지한다.

- 두 명령의 단위 실패를 재현했다. 조표가 원래 샤프를 제공하는 기존 시험 악보에는 원인이 드러나도록 C장조를 명시했다. 변환에서 이동 후 뒤에 생기는 임시표가 앞꾸밈음에 소급되지 않는 대조도 추가했다. 기본 워커 실행 중 기존 App 테스트 2건이 15초 시간 제한에 걸렸다. 전체 검사와 같은 `--maxWorkers=2`에서 관련 251파일·3,146건이 통과했고 외부 opt-in 1건을 건너뛰었다. 최신 타입 검사와 생산 빌드가 통과했다. 같은 최종 빌드의 Studio profile `classic-15`와 fixed-canvas도 실제 DPR 2에서 통과했다. 기존 기준은 유지했다. `out/parity-qa/rhythm-keep-grace-snapshots/`에 로그·캡처·환경 자료가 있다.
- 960×750 dark·1400×750 light의 실제 앱에서 Alt+Shift+G와 음가 6을 썼다. 변환은 원래 본음을 0박, 뒤 화음을 1박으로 옮겨 3박에 쉼표를 채웠다. 덮어쓰기는 취소 시 악보와 편집 이력이 그대로이고, 확인 후 뒤 화음이 원래 2박에 남는다. 두 동작의 실행 취소·다시 실행과 Native 저장·재열기를 확인했다.
- 전후 실제 XML 8건은 고정 XSD를 통과했다. 변환 사본의 꾸밈음 반음 값은 1·0·0에서 1·1·1, 덮어쓰기 사본은 0에서 1로 바뀌었다. 본음 MIDI는 같은 동작의 수정 전후 바이트가 같다. PDF 전후 8개는 각각 한 페이지고 같은 동작에서 두 폭의 래스터가 일치했다. 두 수정의 최종 PDF를 직접 검토했다.
- 배치한 음을 직접 적은 MuseScore 4.7.5 Native 덮어쓰기 대조의 정상 XML에서 F♯ 꾸밈음과 G·F♯·A 본음이 일치했다. Studio 사본 두 개와 MuseScore Native 변환 대조는 SIGABRT였다. 비정상 종료 산출물을 비교에서 제외했다. 외부 GUI의 편집·실제 파일 대화상자·청음은 수행하지 않았다.
- `out/parity-qa/conversion-overwrite-following-grace-{red,red-b,focused,regression,regression-b,build,typecheck}.log`, `rhythm-keep-grace-{before,current}/results.json`, `rhythm-keep-grace-output-check.json` 및 외부 `leading-rest-direct-midi-bpgq_nk2/`에 근거가 있다.

## 꾸밈음 간격과 삭제·성부 이동까지 누적 검사

`npm run test:all`이 1,981.62초 만에 종료 0이었다. Vitest 789파일·7,670건 및 Node-native 5건이 통과했고 외부 MuseScore opt-in 1파일·1건을 건너뛰었다. 고정 입력 6,585개는 실행 종료와 별도 독립 확인에서 일치했다. 위 꾸밈음 변환·음가 덮어쓰기의 후속 수정은 이 실행 뒤에 적용했다. `out/parity-qa/edit-following-accidentals-full-stamp/`에 전체 로그·receipt·독립 확인이 있다.

## 빈 성부로 이동한 뒤의 꾸밈음 음높이

같은 마디의 빈 성부로 임시표가 붙은 단음을 옮기면, 원래 성부에 남은 일반 음표는 음높이를 유지했지만 다음 음표에 부착된 꾸밈음은 반음 바뀌었다. 기존 생존 음표 보존 코드도 삭제·쉼표 변환과 같은 임시표 보존 함수를 사용한다. 이동한 단음의 ID·박 위치 및 원래 성부의 후속 음표와 꾸밈음 범위를 유지한다.

- 앱 회귀 한 건에서 꾸밈음 MIDI 환산값 65 대신 66이어야 하는 실패를 확인했다. 대상 성부·끝점·헤어핀·도구 및 이후 편집 검증 8파일·92건과 타입 포함 생산 빌드가 통과했다.
- 실제 960×750 dark·1400×750 light에서 샤프·제자리표 두 악보의 첫 음에 초점을 주고 Enter로 선택했다. 도구의 **선택 음표 성부 이동**에서 빈 둘째 성부로 이동했다. 이동한 음표의 선택과 성부 주소, 1회 실행 취소 및 다시 실행, 실제 Native 저장·재열기를 확인했다. 최초 앱 도구에서 단위 전용 선택 필드를 조회해 멈춘 로그와, 이후 반복 포인터 실행에서 한 차례 넓은 선택이 잡힌 로그를 보존했다. 실제 SVG 선택 속성과 키보드 실행으로 최종 네 경로를 확인했다.
- 수정 전에는 뒤 꾸밈음과 본음 사이 불필요한 상반 임시표 두 개가 보였다. 수정 후 꾸밈음은 본음·이전 음과 같은 F♯ 또는 F를 유지했다. 전후 MusicXML 8건을 고정 XSD로 검사했고 원래 이동·기보 시간과 본음 MIDI 바이트는 일치했다. PDF 전후 8개는 모두 한 페이지이며 각 조건에서 폭 간 래스터가 같다. 샤프 PDF 전후를 직접 검토했다. Studio의 일반 MIDI에는 부착 꾸밈음의 별도 발음이 아직 포함되지 않는다.
- 수정된 샤프 사본을 MuseScore 4.7.5에서 재출력해 F♯4 꾸밈음의 pitch와 원래 성부를 확인했다. 제자리표 대조는 SIGABRT였다. 실제 GUI 성부 이동과 청음, 실제 OS 파일 대화상자는 수행하지 않았다.
- `out/parity-qa/voice-move-following-grace-{red,focused,build,before,before-b,before-key,current,current-key,output-check}.log`, `voice-move-following-grace-{before-key,current-key}/results.json`, `voice-move-following-grace-output-check.json`과 외부 `leading-rest-direct-midi-5_sl8s_v/`에 근거가 있다.

## 음표 삭제와 쉼표 변환 뒤의 기존 음높이

샤프가 있는 F나 조표의 F♯를 취소하는 제자리표가 있는 F를 지우면, 선택하지 않은 뒤 화음 구성음과 앞꾸밈음의 F가 반음 바뀌었다. 단일 음표와 범위의 삭제·쉼표 변환 모두 재현됐다. 붙여넣기와 음높이 편집에서 쓰는 기존 임시표 보존을 공용 악보 코드로 옮겼다. 앞 임시표가 사라질 때 소리가 달라지는 후속 음표, 화음 구성음, 꾸밈음에만 기존 음높이를 명시한다. 마디 길이와 잇단음표·구간 기호의 보호 조건은 유지한다.

- 단위 실패 4건에서 샤프·제자리표를 확인하고 수정 후 집중 6파일·124건과 편집·재생·가져오기 관련 251파일·3,146건을 통과했다. 외부 opt-in 1건을 건너뛰었다. 타입 검사와 격리 생산 빌드가 통과했다.
- 960×750 dark·1400×750 light에서 첫 음을 실제 포인터로 선택했다. 범위는 Shift+오른쪽으로 확장했다. Backspace와 0으로 편집 후 실행 취소·다시 실행, Native 저장과 재열기, MIDI·MusicXML·PDF를 네 동작 모두 확인했다. 초기 포인터 재현 두 건은 화면 하단 상태줄과 스크롤로 준비가 실패했다. 스크롤과 키보드 범위를 적용한 검증 경로를 사용했고 최초 로그를 보존했다.
- 남은 화음은 편집 전후 원래의 F♯ 또는 F와 A4를 2박에서 시작해 2박 동안 유지한다. 단일 편집에서 남겨둔 G4도 같은 박에 울린다. Native의 뒤 화음·꾸밈음 ID와 박을 유지하고 실제 MusicXML 전후 16건을 고정 XSD로 확인했다. PDF 전후 16개는 한 페이지씩이며 각 동작의 두 폭에서 래스터가 일치했다. 범위 쉼표 변환의 전후 PDF와 960px 삭제 화면을 직접 검토했다.
- 꾸밈음 발음 차이를 빼고 비교하기 위해 사본에서 꾸밈음만 뺀 두 MusicXML을 MuseScore 4.7.5로 변환했다. 정상 MIDI의 F♯·A와 F·A가 모두 2박에 시작했고 지속은 959/480박이었다. MuseScore의 실제 삭제·쉼표 변환 조작, 실제 OS 파일 대화상자와 청음은 수행하지 않았다.
- `out/parity-qa/delete-following-accidentals-{red,focused,regression,build,before,before-b,before-all,current,output-check}.log`, `delete-following-accidentals-{before-all,current}/results.json`, `delete-following-accidentals-output-check.json`과 외부 `leading-rest-direct-midi-_kjgpmms/`에 근거가 있다.

## 앞꾸밈음 화음과 다른 성부의 구성음 충돌

F♯–C 앞꾸밈음 화음에 F♭ 또는 C♭가 다른 성부에서 동시에 붙으면, 두 폭에서 해당 음머리가 가로 7.865·세로 6.665 CSS px 겹쳤다. 그룹의 마지막 표기가 화음이면 각 구성음의 오선 위치와 기보 음높이를 비교한다. F와 C의 두 경우 모두 원래 화음을 한 그룹으로 벌리며 비충돌 E♭ 대조는 위치를 유지한다.

- 일반 기보와 공유 리듬의 단위 두 건을 실패 후 통과시켰다. 관련 287파일·3,235건과 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건은 건너뛰었다. 단위 데이터에서 `chord`가 참 리터럴로 좁혀지지 않았던 첫 빌드 오류를 고쳤다. 실제 검사에서 C♭도 화음의 두 번째 구성음과 충돌한다는 점을 확인해 E♭ 대조를 추가했다. 전체 7,659건은 간격 세 수정 전 결과다.
- 실제 960×750 dark·1400×750 light의 여섯 경로에서 충돌 가로 겹침은 0이고 두 사례의 선행 음머리와 다음 기호 또는 음머리 사이 최소 간격은 18.864 CSS px다. 1400px의 F·C 최종 PDF에서 화음 구성음 및 임시표를 직접 검토했다. 한 페이지 PDF 12개는 각 사례의 두 폭이 같았고 E♭는 전후 래스터도 동일했다. 일반 XML 12건은 고정 XSD를 통과했다. 원본과 재열기 Native, XML 및 MIDI 바이트가 전후 같다.
- 정상 종료한 MuseScore 4.7.5의 F♭ 대조도 화음의 두 구성음과 F♭를 분리해 표시했다. C♭ 변환은 SIGABRT였다. 비정상 종료 산출물은 비교에 포함하지 않았다. 외부 GUI·물리 OS 대화상자·청음은 미실행이다.
- `out/parity-qa/leading-grace-chord-conflict-{red,regression,build,build-b,audit-all,current,current-all,output-check}.log`, `leading-grace-chord-conflict-{audit-all,current-all}/results.json`, `leading-grace-chord-conflict-output-check.json`과 정상 외부 `leading-rest-direct-midi-oqz1j3zd/`에 근거가 있다.

## 두 성부의 앞꾸밈음 연속 그룹 분리

D–F♯와 B–F♭ 앞꾸밈음 그룹을 같은 박에 두면 마지막 F 음머리가 두 폭에서 가로 7.865·세로 6.665 CSS px 겹쳤다. 그룹들이 본음 쪽을 기준으로 정렬하므로 마지막 단음의 오선 위치와 적힌 음높이를 비교한다. 충돌할 때는 연결한 기둥과 빔, 앞 음, 마지막 임시표를 통째로 옮긴다. 기존 단일 꾸밈음과 같은 여백 경로를 사용한다. 마지막 위치가 서로 다르거나 끝이 화음인 경우에는 이 규칙을 적용하지 않는다.

- 일반 기보와 공유 리듬에서 신규 실패 두 건을 재현했다. 관련 287파일·3,233건, 타입 포함 생산 빌드가 통과했고 외부 opt-in 1건을 건너뛰었다. 전체 7,659건은 간격 변경 전이며 이번 조판 변경에 대해서는 관련 테스트와 실제 앱을 확인했다.
- 960×750 dark와 1400×750 light에서 마지막 음머리의 가로 겹침은 0이고 첫 그룹 마지막 음머리와 뒤 그룹 임시표 사이 간격은 22.864 CSS px다. 기존 한 음 그룹 네 경로의 상대 좌표가 최신 빌드에서 일치했다. 960px 대조 한 경로에서 캡처 전 스크롤 위치가 715px 달라 화면 절대 좌표는 비교에서 제외했다. PDF 전후 8개는 한 페이지이며 폭 간 래스터 비교가 일치했다. 1400px PDF에서 두 빔과 두 마지막 임시표를 직접 검토했다. 다른 오선 높이의 대조 PDF는 전후 래스터도 동일하다. Native 악보·MIDI·MusicXML 바이트를 보존했고 실제 XML 8건은 고정 XSD를 통과했다.
- MuseScore 4.7.5 Native 두 대조 PDF가 정상 종료했다. F♭가 끝나는 그룹이 먼저 배치돼 있었으며 두 그룹의 빔과 임시표를 확인했다. Studio는 기존 성부 번호를 먼저 읽는 순서다. 외부 GUI·물리 OS 대화상자·청음은 미실행이다.
- `out/parity-qa/two-grace-sequences-{red,regression,build,audit,current,output-check}.log`, `two-grace-sequences-{audit,current}/results.json`, `two-grace-sequences-output-check.json`, `two-leading-grace-groups-final/results.json` 및 외부 `leading-rest-direct-midi-ildvdw6e/`에 근거가 있다.

## 같은 오선 위치의 두 앞꾸밈음 분리

같은 박의 두 성부가 각각 F♯와 F♭ 단일 앞꾸밈음을 가질 때, 960/1400px에서 둘의 실제 음머리가 가로 7.865·세로 6.665 CSS px 겹쳤다. PDF에서 두 번째 음머리와 플랫을 읽기 어려웠다. 기존 공유 박의 VexFlow 여백에 다음 성부의 실제 그룹 너비를 더해 다른 음높이의 꾸밈음만 분리한다. 성부 번호의 순서를 사용하고, 각 꾸밈음은 원래 본음에 속한다. 다른 오선 높이의 단일 꾸밈음과 앞꾸밈음 화음·연속 그룹의 배치에는 이 규칙을 적용하지 않는다.

- 한 보표와 공유 리듬의 기보 검사에서 두 건의 실패를 재현했다. 수정 후 집중 33건, 관련 287파일·3,231건과 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건을 건너뛰었다. 첫 빌드의 Modifier 타입 좁힘 오류와 최초 앱 도구에서 C♭ 뒤 C의 제자리표를 빠뜨린 검증 오류를 각각 고쳤고 로그를 보존했다. 누적 전체 7,659건은 이번 간격 변경 전이다.
- 960×750 dark와 1400×750 light에서 같은 오선 위치의 가로 겹침은 0이다. 첫 음머리 오른쪽과 다음 음머리·임시표 왼쪽 간격은 18.864 CSS px다. 다른 높이 대조의 가로 위치와 PDF 래스터는 그대로다. Native의 원본·저장·재열기, XML과 MIDI 바이트가 전후 일치했다. 고정 XSD는 전후 실제 MusicXML 8건을 통과했다. Studio MIDI는 두 본음 A4·C5가 같은 2박에 시작해 두 박 지속한다. 전후 PDF 8개는 한 페이지이며 각 조건의 래스터가 두 폭에서 일치했다. 겹침 수정 전후의 실제 PDF를 직접 검토했다.
- MuseScore 4.7.5 Native 대조 두 건은 정상 종료했다. 다른 음높이의 실제 PDF에서 두 음머리를 분리했다. MuseScore는 이 대조에서 F♭를 먼저 그리고, Studio는 임시표 계산과 같은 성부 번호 순서로 F♯를 먼저 그린다. 외부 앱의 실제 조작·청음과 OS 파일 대화상자는 수행하지 않았다.
- `out/parity-qa/two-leading-grace-groups-{red,focused,regression,build,build-b,audit,audit-b,current,output-check}.log`, `two-leading-grace-groups-{audit-b,current}/results.json`, `two-leading-grace-groups-output-check.json`, 정상 MuseScore `leading-rest-direct-midi-yzo1do0f/`에 근거가 있다.

## 앞·뒤꾸밈음 임시표까지 누적 전체 검사

`npm run test:all`은 종료 코드 0이었다. Vitest 789파일·7,659건 및 Node-native 5건이 통과했다. 외부 MuseScore opt-in 1파일·1건을 건너뛰었다. 2,038.51초 동안 고정한 입력 6,585개는 종료 전후와 이후 독립 검사에서 일치했다. 쉼표 위치 안내와 앞·뒤꾸밈음 임시표를 포함한다. `out/parity-qa/grace-written-order-full-stamp/`의 원래 로그·receipt·독립 확인에 근거가 있다.

## 앞꾸밈음과 같은 박의 다른 성부 임시표

둘째 성부의 F♯ 앞꾸밈음이 다른 성부의 정규 음표보다 먼저 보이지만, F♯가 같은 박의 첫째 성부에도 있으면 앞꾸밈음의 샤프가 빠졌다. 첫째 성부가 F일 때에는 필요한 제자리표가 빠졌다. 같은 박에서 실제로 그려지는 순서인 뒤꾸밈음·앞꾸밈음·정규 음표를 기준으로 임시표를 판단한다. 같은 종류의 정규 음표끼리 쓰는 성부 순서와 기존 재생 음높이 계산을 유지했다.

- renderer 두 건의 실패를 재현하고 G♯ 대조를 보존했다. 관련 score-core·MusicXML·notation·MIDI 287파일·3,229건과 타입 포함 생산 빌드가 통과했고 외부 opt-in 1건을 건너뛰었다. 같은 최종 빌드에서 앞꾸밈음 6경로와 직전 뒤꾸밈음 4경로를 실제 960×750 dark·1400×750 light에서 통과했다.
- 두 폭에서 정규 F♯는 먼저 그린 앞꾸밈음에 샤프를 쓰고, 정규 F에는 제자리표를 쓴다. G♯ 대조는 두 샤프가 유지됐다. 앞꾸밈음 사례의 실제 Native 저장·재열기, MusicXML 사본과 MIDI, 한 페이지 PDF를 확인했다. 전후 12개 XML이 고정 XSD를 통과했으며 바뀐 요소는 `accidental`뿐이다. MIDI 6경로는 전후 바이트가 같다. 정규 F♯/G♯/F와 A가 각각 2박에 시작하고 두 박씩 이어진다. 전후 PDF 12개는 모두 한 페이지이며 사례별로 두 폭의 래스터가 같다. 다른 음이름의 대조는 전후 래스터도 동일하다. 1400px의 같은 음이름 두 PDF를 직접 검토했다.
- MuseScore 4.7.5 Native 대조의 F♯/F♯와 G♯/F♯ PDF가 정상 종료했다. 460dpi에서 같은 음이름 대조의 샤프는 뒤의 정규 음 앞에 있었고, 다른 음이름 대조는 각각의 샤프가 있었다. Studio는 먼저 읽는 F♯ 앞꾸밈음에 샤프를 둔다. 정규 F가 이어지는 MuseScore 대조는 SIGABRT여서 PDF를 비교하지 않았다. 외부 GUI·실제 OS 대화상자·청음은 수행하지 않았다.
- `out/parity-qa/leading-grace-same-onset-{red,focused,build,before-all,current,output-check}.log`, `leading-grace-same-onset-{before-all,current}/results.json`, `leading-grace-same-onset-output-check.json`, 외부 대조 `leading-rest-direct-midi-5b8uosjg/`에 근거가 있다. 파일 비교의 XML 들여쓰기 처리 오류 로그도 보존했다.

## 조판 스냅샷의 셈여림 경계 차이

Studio profile과 fixed-canvas 모두 960/1400px에서 `dynamicMarks`의 높이 23.0→22.3, y 264.9→265.4만 기준과 다르다. 뒤꾸밈음 수정 직전 빌드와 이전 통과 기록이 있던 `octave-context-current-help-build`도 현재 환경에서 같은 값을 낸다. 같은 이전 빌드의 역사적 PNG와 현재 PNG는 각각 2배율과 1배율이다. `force-device-scale-factor=2`를 시도했으나 이 환경의 실제 DPR은 1이었다. Chromium DevTools Protocol에서 DPR 2를 확인한 별도 실행에서도 두 폭의 좌표 차이는 유지됐다. 이미지 배율만으로는 원인이 설명되지 않는다. [Chromium 배율 옵션](https://chromium.googlesource.com/chromium/chromium.git/%2B/refs/heads/main/ui/base/ui_base_switches.cc) · [DevTools Protocol 디스플레이 에뮬레이션](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setDeviceMetricsOverride)

현재 두 폭은 `mf` 두 글자에 `Georgia-BoldItalic`을 사용한다. SVG 기준선은 283.36이다. 960px의 같은 빌드 캡처에서 어두운 실제 잉크 경계의 위·아래는 이전 y 863–882, 현재 y 864–883 CSS px였다. 이전 캡처의 글꼴 계측값은 없어 글꼴 파일/렌더링 환경 중 어느 쪽인지 확정할 수 없다. 기준을 갱신하지 않았다. 기보 수정에 따른 차이와 분리된 스냅샷 환경 항목으로 큐에 유지한다.

이후 최신 성부 이동 빌드에서는 에뮬레이션 없이 두 폭의 실제 `devicePixelRatio`가 2로 관측됐다. 동일한 기준을 사용해 Studio profile `classic-15`와 fixed-canvas가 모두 통과했다. 1배율 시점의 실패 증거를 유지하며, 물리 환경의 어떤 차이가 글꼴 계측을 바꿨는지는 미확정이다. `out/parity-qa/voice-move-following-grace-snapshots/`에 최신 로그·환경·캡처가 있다.

`out/parity-qa/trailing-grace-same-onset-snapshots/before-after-comparison.json`, `leading-grace-same-onset-snapshots/`, `known-passing-build-snapshot-recheck/comparison.json`, `grace-written-order-snapshots-{dpr2,cdp2,font}/`에 근거가 있다.


## 뒤꾸밈음과 같은 박의 다른 성부 임시표

세 성부가 있는 한 보표에서 둘째 성부의 반음표 F♯ 끝에 붙은 F 제자리표 뒤로 첫째 성부 F♯와 셋째 성부 F가 같은 박에 나온다. 수정 전에는 뒤꾸밈음의 제자리표가 첫째 성부의 새 샤프보다 나중 것으로 취급돼 셋째 성부 F의 제자리표가 빠졌다. 같은 tick이면 화면에서 앞에 그려진 뒤꾸밈음을 정규 음표보다 먼저 읽는다. 정규 음표끼리는 기존 성부 순서를 사용한다.

- renderer 단위 한 건의 실패를 재현했다. 첫째 성부가 G♯인 대조는 불필요한 제자리표를 그리지 않는다. 수정 후 score-core·MusicXML·notation·MIDI 287파일·3,226건과 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건은 건너뛰었다. 앞선 빌드에서 단위 도우미의 VexFlow 타입을 좁게 선언했던 오류를 수정하고 원래 로그를 보존했다. 최신 전체 7,652건은 이 수정 전이다.
- 960×750 dark·1400×750 light에서 뒤꾸밈음 잉크가 해당 박의 두 음머리보다 왼쪽에 있음을 측정했다. F와 F♯가 같은 박인 경우 두 폭 모두 정규 F에 U+E261을 그렸다. G♯ 대조는 새 임시표 없이 유지됐다. Native 저장·재열기의 악보 내용과 MIDI 바이트가 전후 일치했다. MIDI는 F♯ 0박/2박 지속, F 및 F♯ 또는 G♯가 함께 2박/각 1박, A가 4박/4박 지속이다. PDF 8건은 모두 한 페이지고 각 사례의 래스터는 두 폭에서 일치했다. F 사례의 전후 PDF와 960px 화면을 직접 검토했다.
- 이 입력은 뒤꾸밈음 뒤에 같은 성부의 쉼표가 있으므로 MusicXML 사본은 기존 위치 보존 안내와 함께 저장 대화상자 전에 차단된다. 최초 검증은 이 차단을 성공 출력으로 기다려 멈췄고, 이후 실제 파일 없음과 대화상자 미호출을 확인했다. MuseScore 4.7.5는 정상 종료한 G♯ Native 대조에서 뒤꾸밈음을 해당 박의 음머리 앞에 그렸다. F/F♯ 대조는 SIGABRT였고 PDF를 비교에 사용하지 않았다.
- `out/parity-qa/trailing-grace-same-onset-{red,focused,build,build-b,before,before-b,current,output-check}.log`, `trailing-grace-same-onset-{before-b,current}/results.json`, `trailing-grace-same-onset-output-check.json`과 정상 외부 대조 `leading-rest-direct-midi-ntxqe0p1/`에 근거가 있다. 앱은 임시 프로필·파일 선택 어댑터를 사용했다. 실제 OS 대화상자·청음은 수행하지 않았다.

## 마디 안 이조와 같은 divisions의 반복 선언

2/4의 둘째 마디에서 첫 음 뒤에 클라리넷 이조 −2를 적용한다. 둘째 마디 시작에 이미 유효한 `divisions=1`을 반복했는지만 다른 두 원본이 고정 XSD를 통과했다. 같은 선언을 반복해도 정확한 음악적 위치와 의미는 같다. 표준 위치대로라면 두 파일 모두 0–5박의 MIDI 60·62·64·63·65·67이다. [MusicXML attributes](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/) · [MusicXML transpose](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/)

| 입력 | Studio 실제 MIDI | 파트의 마디별 이조 |
| --- | --- | --- |
| 마디 안 이조 블록 하나 | 60·62·62·63·65·67 | 0·−2·−2 |
| 같은 divisions를 마디 시작에서 반복 | 60·62·64·65·67·69 | 0·0·0 |

960×750 dark·1400×750 light 앱에서 가져오기 경고, 실제 Native 저장과 MIDI 내보내기를 확인했다. 두 입력은 같은 유형의 이조 위치 손실 경고를 보여준다. 이조 블록이 하나면 앞 음에까지 새 이조가 적용되고, divisions 블록이 함께 있으면 이후 마디에도 이조가 적용되지 않는다. 정상 종료한 MuseScore 4.7.5의 첫째 원본도 음높이 60·62·64·65·67·69를 내보냈다. 둘째 원본의 SIGABRT 산출물은 비교에 사용하지 않았다.

정확한 지원은 마디 안의 이조 위치를 프로젝트·화면·재생·MusicXML에 보존하는 계약이 필요하다. 현재 모델로 가져오려면 문제 마디의 시작 이조를 유지하고 다음 마디부터 새 이조를 쓰며, 문제 마디 후반에서 발생하는 손실을 안내할 수 있다. 또 다른 정책은 해당 위치에서 가져오기를 중단하고 원본을 보존하는 것이다. 이 단계에서는 출력 정책을 바꾸지 않았다.

재현 경로는 `out/parity-qa/single-positioned-transpose-audit/`, `single-positioned-transpose-ui-red/results.json`, `single-positioned-transpose-external.log`와 정상 MIDI `leading-rest-direct-midi-u_12qbj3/single-positioned/output.mid`다.

### 가져오기 결정에 필요한 MIDI 대조

| 처리안 | 같은 선언을 반복한 두 입력의 수용 기준 |
| --- | --- |
| 마디 시작 유지, 새 이조는 다음 마디부터 | 두 입력 모두 60·62·64·65·65·67. 원본 의미의 4번째 음인 63과 달라지는 한 박의 위치와 원래 이조를 안내한다. |
| 실제 음이 바뀌는 마디 내부 이조에서 중단 | 원본을 보존하고 대상 마디·보표·이조를 설명한다. 마디 끝과 첫 유효음 전 이조는 기존 지원 계약을 대조한다. |
| 마디 내부 위치를 정확히 지원 | 60·62·64·63·65·67 및 기보음 보존을 목표로 한다. Native·표시·실음 보기·MusicXML과 재생의 위치 모델을 정한다. |

첫 안의 마디별 모델을 시험 사본에 적용해 실제 MIDI를 만들고 6음의 음높이와 0–5박의 시작·1박 지속을 독립 해석했다. `out/parity-qa/transpose-policy-comparison-20261124.json`과 `transpose-policy-following-20261124.mid`를 참조한다. 제품 정책은 승인 대기다.


## MusicXML 쉼표의 세로 위치 손실 안내

MusicXML의 `display-step`과 `display-octave`는 발음 없이 오선에서 쉼표의 높이를 지정한다. 명시한 높이 A5와 C6의 일반 쉼표·온마디 쉼표를 기존 Studio는 기본 위치에 그리면서 알리지 않았다. 가져오기 경고에 한국어 설명과 원래 높이·파트·마디·보표·성부를 표시한다. 쉼표는 현재 모델의 자동 위치를 사용하며 길이와 음높이 처리는 그대로다. [MusicXML 쉼표](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/rest/) · [표시 위치](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/display-step/)

- 일반 쉼표와 온마디 쉼표의 단위 실패 2건을 재현했고 집중 12건과 타입 포함 생산 빌드가 통과했다. 관련 MusicXML·App 회귀 169파일·2,448건이 통과했고 외부 opt-in 1건은 건너뛰었다. 960×750 dark·1400×750 light의 실제 메뉴에서 새 경고·두 기술 정보·파일 도움말을 확인했다. 위치 지정 없는 대조에는 경고가 없다. 두 폭의 Native 저장 및 재열기, 실제 SVG 쉼표 기호와 좌표를 확인했다. 같은 빌드의 두 폭에서 Enter와 Space로 경고 및 기술 정보를 열었다. 선택·초점·편집 기록과 정지 상태를 확인했다. `out/parity-qa/rest-display-position-keyboard/results.json`에 근거가 있다.
- 전후 및 기본 위치 대조의 Structure MusicXML과 MIDI 바이트가 같았다. MIDI 58·62는 각각 0·2박에서 한 박씩 시작했다. 한 페이지 PDF 8건의 래스터가 일치했다. 원본·대조·최종 출력 8 XML은 고정 XSD를 통과했다.
- MuseScore 4.7.5의 정상 무이조 PDF 대조 두 건에서 지정한 일반 쉼표와 온마디 쉼표가 기본보다 위로 이동했다. 115dpi에서 각 잉크의 첫 행이 205→181, 211→177이었다. 이조 입력의 두 PDF 변환과 위치 지정 파일의 외부 XML 재출력은 SIGABRT였다. 해당 산출물은 비교에 쓰지 않았다. 외부 GUI, 물리 OS 대화상자와 청음은 미실행이다.
- `out/parity-qa/rest-display-position-{unit-red,unit-green,regression,production-build}.log`, `rest-display-position-ui-{red,green}/results.json`, `rest-display-position-output-check.json`과 `leading-rest-direct-midi-94akqhvg/`의 정상 PDF·해시에 근거가 있다. 전체 7,652건은 이 진단 변경 전 결과다.

## 옥타브선 수정까지 누적 검사와 실제 음머리 클릭

최종 `npm run test:all`에서 Vitest 789파일·7,652건과 Node-native 5건이 통과했다. 외부 MuseScore opt-in 1파일·1건은 건너뛰었다. 실제 전체 종료 코드는 0, 경과는 2,033.61초였다. 독립 검사에서 고정 입력 6,585개의 해시가 모두 일치했다. `out/parity-qa/octave-marker-final-full-stamp/`의 `test-all.log`, `inputs.json`, `receipt.json`을 확인했다.

종료 뒤 같은 빌드에서 앞선 포인터 관찰을 재시험했다. 960×750 dark와 1400×750 light의 기보음·실음 보기 네 조건에서 성부 1 음머리의 실제 잉크 중앙에 Electron 포인터를 클릭했다. 네 조건 모두 `elementFromPoint`는 성부 2의 투명 사각형을 반환했지만, 앱은 보이는 성부 1 음표에 선택과 키보드 초점을 적용했다. 동일 악보의 MusicXML 왕복과 MIDI 보존도 확인했다. `out/parity-qa/octave-overlapping-pointer-final/results.json`에 좌표와 대상 ID가 있다. 제품 변경 없이 기존 포인터 동작을 확인한 결과다.

## 한 파트의 옥타브선 번호 충돌

한 파트의 위·아래 보표에서 두 마디에 걸쳐 선을 동시에 사용하면, 기존 Studio는 두 선에 기본 번호 1을 썼다. 고정 XSD는 통과했지만 MusicXML에서 두 쌍의 열린 구간은 파일 순서상 겹친다. 정상 종료한 MuseScore 4.7.5에서 위쪽 두 음이 74·76 대신 86·88로 울렸다. 이제 마디·보표·성부·이벤트가 실제 기록되는 위치를 기준으로 한 파트 안의 겹치는 구간에 다른 번호를 쓴다. 파일에서 이전 선이 닫힌 뒤 시작하는 선은 번호를 다시 쓸 수 있다. [MusicXML number-level](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/number-level/)

- 집중 실패 재현 한 건 이후 최신 4파일·92건, 관련 167파일·2,226건과 타입 포함 생산 빌드가 통과했다. 관련 외부 opt-in 한 건은 건너뛰었다.
- 960×750 dark·1400×750 light에서 여러 마디에 걸친 두 선은 1번과 2번으로 저장하고 마디 안에서 파일 순서가 나뉘는 두 선은 모두 1번으로 저장했다. Native 저장과 실제 XML 재열기·재출력에서 보표·성부·시작과 끝, MIDI 및 한 페이지 PDF를 확인했다. 고정 XSD와 출력 래스터는 두 폭에서 일치했다.
- 정상 종료한 MuseScore 4.7.5의 수정 사본 두 개에서 모든 일반 음 8개의 음높이와 시작 박이 각 Studio MIDI와 일치했다. MuseScore의 지속 479/480박과 Studio의 1박은 별도로 기록했다. XML 번호와 음높이 차이는 `out/parity-qa/part-octave-numbers-app-final/outputs-reviewed.json` 및 구·신 정상 외부 결과 `leading-rest-direct-midi-{oz0zco_c,1focua5_}/`에 있다.
- 물리 청음·OS 대화상자·외부 GUI는 미실행이다. 이 번호 계산은 옥타브선에 적용한다.

## 성부가 다른 옥타브선의 MusicXML 재열기

Native에서 성부 2의 1박 위치를 시작으로 하고 성부 1의 2박 위치에서 시작한 음의 끝을 종료로 지정했다. 성부 2는 종료 위치에 음표 끝이 없다. XSD를 통과한 이전 사본도 Studio가 시작 성부에서만 종료를 찾다가 40,320 tick의 앵커 오류로 거부했다. 수정 전 빌드의 두 화면 폭에서 같은 오류와 기존 Native 악보 보존을 확인했다.

- 새 XML은 각 성부의 실제 커서에 방향을 기록한다. 파일에서 성부 1의 종료 방향이 먼저 나오고 `backup` 뒤 성부 2의 시작 방향이 나와도 두 표식을 파일 순서로 짝짓고 실제 위치인 13,440·40,320 tick을 확인한다. 종료 방향에 지정된 성부에서 끝 음표를 찾고 그 성부에 정확한 종료가 없으면 같은 tick의 시작 성부를 확인한다. 기존 offset 방식도 읽는다.
- 단위 실패 두 건 이후 집중 4파일·90건, 최종 관련 167파일·2,224건과 타입 포함 생산 빌드가 통과했다. 관련 실행의 외부 opt-in 한 건은 건너뛰었다.
- 960×750 dark·1400×750 light 격리 앱에서 Native 저장과 실음 보기의 선택 주소, 새 파일 및 이전 offset 파일의 실제 가져오기와 재출력을 확인했다. 양 끝의 성부와 시간 위치가 유지됐다. MIDI 8개는 원본 8음의 음높이·시작·지속을 바이트까지 보존했다. 고정 XSD 10개를 확인했고 한 페이지 PDF 8개의 래스터가 모두 일치했다. 캡처에서 두 성부와 8va를 직접 확인했다. 최종 설명서를 포함해 다시 빌드했고 두 폭의 실제 앱에서 **도움말 → 파일과 출력** 문구와 닫기 동작을 확인했다. `out/parity-qa/octave-cross-voice-app-documented/`에 캡처가 있다.
- MuseScore 4.7.5의 최종 교차 성부 XML 및 꾸밈음만 뺀 대조는 모두 SIGABRT였다. 정상 비교가 확보된 아래 같은 성부의 8va·8vb와 검증 범위를 구분한다. 실제 OS 대화상자·외부 GUI·청음은 미실행이다.
- `out/parity-qa/octave-cursor-cross-voice/`, `octave-cross-voice-unit-{red,green}.log`, `octave-cross-voice-regression.log`, `octave-cross-voice-app-red-c/`, `octave-cross-voice-app-final/`과 해당 `outputs-reviewed.json`에 근거가 있다. 초기 앱 검사의 기술 정보 조회 실패와 외부 변환 로그를 보존했다.

## 같은 번호를 다시 쓰는 옥타브선

종료가 먼저 나오는 교차 성부를 처리하기 위해 처음 적용한 시간순 정렬은, 파일에서 순서대로 닫히는 두 선에 같은 번호를 쓴 파일을 중복으로 오인했다. 이 XSD 유효 사례의 단위 실패와 960/1400px 실제 가져오기 실패를 확인했다. 파일 순서에서 같은 번호의 시작·종료를 먼저 짝짓고, 각 쌍에서 실제 종료가 시작 뒤에 있는지 검증하도록 고쳤다. 시작 전에 파일에 등장한 종료도 짝을 잡으며, 명시한 종료 성부와 이전 상대 위치를 읽는다. [MusicXML number-level](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/number-level/)

- 최종 동일 빌드의 두 폭에서 8va와 8vb가 겹치는 소스의 두 성부·선택·Native·MusicXML 왕복과 MIDI 일치, PDF 래스터와 고정 XSD 6건을 확인했다. 다른 성부 사이의 기존·새 XML 재열기와 파일 도움말도 같은 빌드에서 다시 확인했다.
- 첫 전체 실행은 이 회귀를 발견한 뒤 자체 프로세스만 종료했다. `out/parity-qa/octave-cursor-full-stamp/receipt.json`에 입력 6,585개 무변경과 SIGTERM 종료 -15가 있다. 이후의 검증은 `octave-pair-order-unit-{red,green}.log`, `octave-pair-order-app-red/`, `octave-pair-order-numbered-build/`, `octave-cross-voice-numbered-build/`에 있다. 중간 앱 검증에서 겹친 이벤트의 포인터 좌표가 다른 선택 영역에 닿은 기록을 보존했다. 최종 검증은 같은 파일의 다른 성부 음머리에서 실제 포인터를 사용했다.

## MusicXML 옥타브선의 실제 경계

클라리넷의 8va를 둘째 박부터 셋째 박 끝까지 적용한 Studio 사본에서 MuseScore 4.7.5가 첫 음을 MIDI 59에서 71로 올렸다. MusicXML은 현재 시간 위치를 기준으로 옥타브선의 위치를 지정한다. MuseScore 4.7.5 첫 읽기 단계는 옥타브 방향의 `offset`을 건너뛰고 그때의 XML 커서를 사용한다. 따라서 Studio의 기존 마디 앞 방향 두 개가 다른 시간 위치를 나타내지 못했다. 같은 파일에서 선만 없앤 대조는 첫 음 59였고, 실제 박에 방향을 넣은 무꾸밈음 대조는 일반 음 다섯 개를 모두 보존했다. [MusicXML 옥타브선](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-shift/) · [MusicXML 상대 위치](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/offset/) · [MuseScore 4.7.5의 방향 처리](https://github.com/musescore/MuseScore/blob/v4.7.5/src/importexport/musicxml/internal/import/importmusicxmlpass1.cpp#L2968-L3000)

- 같은 성부의 옥타브선은 시작 음표의 앞꾸밈음부터 적용하고 끝 화음의 모든 음과 뒤꾸밈음을 기록한 뒤 종료 방향을 쓴다. XML 커서가 실제 경계에 있으므로 `offset`을 쓰지 않는다. 첫 수정에서는 다른 성부의 상대 위치를 보존했다. 교차 성부의 재열기와 직렬화는 위 후속 수정에서 처리한다.
- 8va·8vb의 위치 검사 두 건이 수정 전에 실패했다. 수정 뒤 네 관련 파일 88건, 교차 성부 대조를 추가한 최종 관련 167파일·2,223건과 타입 포함 생산 빌드를 확인했다. 관련 검사의 외부 opt-in 한 건은 별도로 건너뛰었다. 직전 7,646건 전체 결과는 이 직렬화 수정 전이다.
- 960×750 dark·1400×750 light의 실제 기보음·실음 보기에서 위·아래 옥타브선과 화음·꾸밈음의 잉크, 선택 주소, Native 저장·재열기, 기보음 MusicXML과 MIDI·PDF를 확인했다. 이조한 모든 음머리는 한 음이름 아래로 이동했으며 옥타브선 표기와 갈고리 방향을 유지했다. 꾸밈음이 있는 악보와 없는 대조의 실제 앱 8경로에서 16 XML이 고정 XSD를 통과했다. 출력 PDF 16개는 한 페이지씩이며 보기 전환 전후의 래스터가 일치했다. 기존 빌드와 비교해 바뀐 XML은 옥타브선 방향뿐이고 화면 기호와 MIDI·PDF는 유지됐다.
- 최종 사본 두 개의 MuseScore 4.7.5 MIDI 변환은 정상 종료했다. 두 첫 음은 모두 59였다. 나머지 일반 음도 Studio와 같은 높이와 시작 박이다. MuseScore에서 별도 앞꾸밈음은 0.5박에 시작하며 첫 일반 음은 239/480박, 나머지 일반 음은 479/480박이다. 기존 Studio의 일반 음 지속은 1박이며 별도 꾸밈음 발음은 제품 정책 대기다. 앞선 8vb 및 위치 대조 중 SIGABRT의 파일은 비교에서 제외했다.
- `out/parity-qa/octave-cursor-unit-{red,green}.log`, `octave-cursor-musicxml-regression.log`, `octave-cursor-production-build.log`, `octave-cursor-output-check.json`, `concert-pitch-octave-lines-{b,final,plain}/`와 정상 외부 출력 `leading-rest-direct-midi-gl0x7fc0/`에 근거가 있다. 최초 앱 검사에서 SVG 경계 객체 변환 오류가 있었고 검증 도구만 수정해 원래 실패 로그를 보존했다. 실제 OS 대화상자·외부 GUI·청음은 미실행이다.

## 고정 이조 단일 파트의 실음 보기

승인받은 첫 범위를 **보기 → 실음 보기**에 연결했다. 이조가 일정한 하나의 파트에서 화면의 조표·임시표·음표·꾸밈음과 표준 코드 심벌을 실음으로 그린다. 선택 주소와 재생은 원본 악보를 따른다. 읽기 전용 보기는 파일에 저장하지 않으며, 프로젝트와 PDF·MusicXML은 기보음으로 저장한다. 기존 이조 명령은 문서 편집 동작을 유지한다. [사용설명서](../../product/studio-manual/02-workspace.md#concert-pitch) · [MuseScore 이조와 실음](https://handbook.musescore.org/notation/pitch/transposition.md#transposed-and-concert-pitch)

- 이전 격리 빌드의 보기 메뉴에는 항목이 없었다. 최종 960×750 dark·1400×750 light 앱에서 메뉴의 실제 Enter로 전환하고 포인터로 같은 음표를 선택했다. F♯4의 기보와 E♮4의 실음, 플랫 두 개의 조표, Cmaj7/E → Bbmaj7/D를 검증했다. 진행 중인 음표 입력은 커서 주소를 유지하며 전환을 안내한다. 실음 보기에서 N·위 방향키·Delete·J는 악보를 수정하지 않는다. 같은 보기의 드래그 선택과 전환 중 오래된 드래그가 중단되는 대조를 확인했다.
- Space로 시작한 음소거 재생 중 공개 메뉴로 돌아오자 재생 선이 같은 음표를 가리키고 새 머리 위치에 맞았다. 읽기 전용 안내가 성공 뒤 사라지고 제목이 검은 정적 글자로 표시되는 화면을 검토했다. 상단 기보음 복귀, 문서 재열기, 가변 이조 안내와 앱 도움말을 두 폭에서 확인했다.
- 두 모드의 Native 악보 본문, 구조 유지 XML·MIDI 바이트와 PDF 래스터가 일치했다. A4 PDF 네 건과 고정 XSD 여덟 건을 확인했다. Studio MIDI의 58·64·68·69는 0·1·2·3박에 각각 한 박이었다. 동일 원본의 정상 MuseScore 4.7.5 MIDI에도 같은 멜로디 음높이·시작 박이 있다. 각 멜로디 지속은 479/480박이고 MuseScore는 코드 발음 다섯 음도 별도로 넣었다. 전체 MIDI나 외부 GUI의 일치로 집계하지 않는다.
- 피치 계산과 앱·메뉴 집중 검사 3파일·8건, 관련 104파일·843건과 타입 포함 생산 빌드를 확인했다. 초기 포커스 검사에서는 재생 mock의 `playFromEvent`와 `play`를 구분했고 앱 도움말 검사에서는 실제 h3 제목을 사용했다. 원래 로그를 보존했다.
- 음이름 간격을 확정할 수 없는 일부 이조나 표현 범위 밖의 조표·임시표·코드 심벌은 이유를 안내한다. 다중 파트, 가변 이조 전환, 실음 편집과 실음 PDF는 후속 범위다. OS 파일 대화상자는 응답 어댑터를 사용했고 청음과 물리 IME는 미실행이다.
- 근거는 `out/parity-qa/concert-pitch-app-{red,initial,final}/results.json`, `concert-pitch-app-{external,final,final-xsd}.log`, `concert-pitch-reviewed-{build,regression}.log`와 이전 실패 기록에 있다.

## 실음 보기까지 누적 검사와 두 보표 대조

`npm run test:all`의 Vitest 789파일·7,646건과 Node-native 5건이 통과했다. 외부 MuseScore opt-in 1파일·1건은 건너뛰었다. 전체 종료 코드 0과 2,046.53초를 기록했고 고정 입력 6,585개의 해시가 종료 뒤 독립 검사에서도 일치했다. 근거는 `out/parity-qa/concert-pitch-full-stamp/`의 `test-all.log`, `inputs.json`, `receipt.json`이다. 두 보표 대조는 제품 변경 없이 같은 격리 빌드를 사용했다.

- 960×750 dark와 1400×750 light에서 단일 파트의 위·아래 보표에 같은 이조를 지정했다. 두 조표에 플랫 두 개가 표시되고 위쪽 F♯4는 E♮4, 아래쪽 G♯3은 F♯3으로 바뀌었다. 포인터로 각 음을 선택했고 보기 전환 후 아래 보표의 선택 주소와 수정 0회가 유지됐다.
- 각 보기의 Native 악보 본문이 일치했다. 저장한 프로젝트를 다시 열면 기보음으로 돌아왔다. 두 보기의 MusicXML과 MIDI는 바이트가 같고 한 페이지 PDF 네 건은 래스터가 일치했다. MIDI 8음은 각 보표의 이조를 적용받아 같은 네 박에서 한 박씩 울린다. 고정 XSD 8건을 확인했고 화면과 PDF를 직접 검토했다.
- 아래 보표만 이조를 0으로 지정한 대조는 전환 범위를 안내했다. 위·아래 보표의 기보와 선택, Native 악보가 유지됐다. MuseScore 4.7.5 원본과 Studio 사본 MIDI 변환은 각각 SIGABRT였다. 비정상 종료한 두 파일은 재생 비교에서 제외했다.
- `out/parity-qa/concert-pitch-two-staves-b/`의 `results.json`, `output-check.json`과 캡처에 근거가 있다. 첫 Electron 실행은 런타임 배경 설정으로 창 생성 전에 종료됐다. 해당 프로세스의 Node 호환 실행 설정을 해제해 정상 Electron으로 다시 확인했다. `concert-pitch-two-staves-{a,b,external}.log`를 보존했다.

## MusicXML 전통 조표 범위 안내

MusicXML에서 `+8`과 `-8`은 유효한 정수다. Studio의 현재 조판·프로젝트 범위 밖이어서 이전 앱도 파일을 열지 못했지만 기술 정보에 저장 검사 오류만 나왔다. 이제 실제 마디에 적용될 조표가 플랫 7개부터 샤프 7개까지의 범위를 벗어나면 원래 값과 적용 마디·보표를 안내한다. 다음 마디가 없어 사용되지 않는 끝 조표의 위치 손실 안내는 유지한다. [MusicXML fifths](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/fifths/)

- 단위 실패 2건과 첫 구현의 마디 경계 회귀 2건을 보존했다. 최종 집중 5파일·61건과 MusicXML·프로젝트 관련 184파일·2,278건, 외부 opt-in 1건 건너뜀, 타입 포함 생산 빌드를 확인했다. 전체 7,630건은 조표 진단 두 변경 전이다.
- 960×750 dark·1400×750 light의 적용 범위 오류 4경로에서 원래 수치, 적용 위치와 기존 악보·선택·미저장 상태를 확인했다. 실제 undo/redo, 프로젝트 사본 저장, 지원 경계의 ±7 재시도와 `도움말 → 파일과 출력`을 확인했다. 적용할 마디가 없는 끝 조표의 위치 경고도 두 폭에서 확인했다. 총 6개의 PDF와 원본·출력 XML의 고정 XSD 16건을 검증했다. 같은 폭의 성공 재시도 XML·MIDI·PDF 이미지는 오류 원본의 조표 위치에 관계없이 일치했다.
- MuseScore 4.7.5의 정상 −8 및 −7 PDF는 같은 이미지였다. +8 PDF 변환은 SIGABRT라 제외했다. 앱의 자동 교체 확인과 파일 대화상자는 격리된 응답 어댑터를 사용했다.
- 근거는 `out/parity-qa/key-range-{unit-red,positioned-red,final-focused,final-regression,final-xsd,external-pdf}.log`, `key-range-red-confirm-ui/results.json`, `key-range-*-verified-ui/results.json`, `key-range-output-proof.json`에 있다.

## MusicXML 조표 취소 제자리표 안내

플랫 두 개에서 한 개로 바꾸며 명시한 `cancel`, 그리고 조표 없는 상태로 바꾸며 제자리표를 마디선 앞에 놓으라는 지정을 조용히 버렸다. 가져오기 경고의 한국어 안내와 기술 정보에 해당 파트·마디·보표, 원래 값과 상대 위치를 표시한다. 중립 조표로 바뀌는 기본 취소 표기는 현행 조판으로 처리한다. [MusicXML cancel](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/cancel/) · [위치 명세](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/cancel-location/)

- 세 가지 위치의 실패를 재현했다. 집중 4파일·42건과 MusicXML 165파일·2,208건, 외부 opt-in 1건 건너뜀, 타입 포함 생산 빌드를 확인했다. 전체 7,630건은 안내 추가 전이다.
- 960×750 dark·1400×750 light의 손실 두 종류와 대조 두 종류를 확인했다. 손실 대조는 각각 한 번 경고했고, 일반 조표 변경과 기본 위치의 취소는 경고가 없었다. Native 재열기·구조 유지 사본·MIDI·1페이지 PDF를 확인했다. 수정 전 및 대조와 XML·MIDI·PDF 래스터가 같고 고정 XSD 16건을 통과했다. 앱 도움말의 파일과 출력 항목도 두 폭에서 열었다.
- MuseScore 4.7.5의 정상 PDF 두 건을 활용했다. 마디선 앞 취소 원본의 정상 외부 PDF도 제자리표를 마디선 뒤에 그렸다. 비중립 취소 원본 PDF와 직접 MIDI 네 건은 SIGABRT였다. 실제 외부 위치 보존이나 MIDI 일치는 확인하지 못했다. Studio의 PDF와 외부 정상 PDF를 검토했다.
- 증거는 `out/parity-qa/key-cancel-*-final-ui/results.json`, `key-cancel-{red,focused,musicxml,build,final-xsd,external-pdf,external-midi}.log`, `key-cancel-compared.json`과 `key-cancel-help-ui/results.json`에 있다. 원본 조표 취소를 그리거나 다시 쓰는 편집 지원은 남아 있다.

## MusicXML 이명동음 단음 타이

F♯4→G♭4처럼 한 성부의 인접 단음이 같은 음높이를 다른 이름으로 쓰면 MusicXML이 타이를 허용한다. 기존 Studio는 두 음의 표기 이름이 달라 파일을 거부했다. 같은 반음과 악기 이조를 유지하는 연결을 가져오고 Native 저장·재열기와 MusicXML 사본에 보존한다. 타이 끝에서 달라진 음이름에 필요한 임시표도 악보와 XML에 쓴다. 직접 만드는 타이에는 기존 편집 규칙을 적용한다. [MusicXML tied](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tied/)

- 단위에서 가져오기 실패 2건과 가져오기 수정 뒤 플랫 출력 누락 2건을 확인했다. 실제 960/1400px의 가져오기 거부와 960px에서 플랫이 빠진 중간 빌드 캡처도 보존했다. 최종 집중 3파일·68건, 관련 330파일·3,580건, 외부 opt-in 1건 건너뜀과 타입 포함 생산 빌드를 확인했다.
- −2반음 클라리넷을 960×750 dark·1400×750 light에서 같은 줄과 줄바꿈으로 가져왔다. Native 재열기, F♯·G♭의 실제 glyph와 타이 경로 1개·2개, 구조 유지 XML, MIDI와 A4 PDF를 확인했다. 원본·출력 XML 8건이 고정 XSD를 통과했다. 같은 조판의 두 폭 PDF 이미지가 일치했고 두 조판의 PDF를 직접 검토했다.
- 원본과 Studio의 구조 유지 사본을 MuseScore 4.7.5에서 정상 변환했다. 두 앱 모두 MIDI 64·67을 같은 줄에서는 0·2박, 줄바꿈에서는 0·3박에 시작했다. Studio의 지속은 각각 2·2박과 3·1박이며 MuseScore의 각 음 길이는 480 PPQ 기준 1 tick 짧았다. 실제로 다른 음과 악기 이조가 바뀌는 이명동음 연결은 보호 대조에서 거부했다.
- 로그는 `out/parity-qa/enharmonic-tie-{red,ui-red,accidental-red,final-focused,final-regression,final-build,final-ui,final-xsd,external,structure-external-named}.log`에 있다. 화면·좌표·파일 해시는 `enharmonic-tie-final-ui/results.json`에 있다. 실제 OS 대화상자, 외부 GUI와 청음은 미실행이다.

### 두 번 반복되는 이명동음 타이

같은 빌드의 두 폭에서 실제 T로 타이를 제거하고 실행 취소·다시 실행·재저장했다. 각 편집은 한 건이고 선택 ID와 실행 취소 뒤 저장한 악보 본문이 원본과 같았다. 최초 검증 도구는 실행 취소 직후를 저장 완료로 잘못 예상했다. 앱은 실행 취소에서도 저장 리비전을 올린다. 이를 대조해 재저장 전의 미저장 상태와 실제 저장 후의 완료 상태를 각각 검사했다.

Studio의 두 MIDI는 64·67·64·67을 0·3·4·7박에 시작해 3·1·3·1박 지속했다. 구조 유지 사본은 도돌이표와 두 표기, 펼친 사본은 도돌이표 없이 두 회차의 F♯·G♭와 타이·플랫을 보존했다. 두 폭의 XML과 MIDI, 확인한 한 페이지 PDF 이미지가 일치했다. 원본과 출력 XML 6건이 고정 XSD를 통과했다. MuseScore 4.7.5에서 두 사본의 정상 MIDI는 같은 음높이·시작 박이었으며 음마다 480 PPQ 기준 1 tick 짧았다. 원본 XML 변환은 SIGABRT여서 비교에서 제외했다. `out/parity-qa/enharmonic-tie-repeat-verified-ui/results.json`과 `enharmonic-tie-repeat-{ui,verified-ui,xsd,external}.log`에 근거가 있다.

### 기존 타이의 J 이명동음 변경

F♯→F♯ 기존 타이의 끝 음표를 방향키로 선택한 뒤 J를 눌렀다. 수정 전 960/1400px 모두 편집 완료 뒤 자동저장이 실패했고 기술 정보에 `Invalid project ties`와 시작·끝 ID가 표시됐다. 960px에서 다시 실행 뒤 다른 이름 저장도 완료되지 않았다. 수정 빌드는 원래 ID와 이웃 음표, 한 번의 실행 취소·다시 실행과 Native 저장·재열기를 보존했다. 전후 MIDI 바이트가 폭별로 일치했다. 출력 사본에 G♭의 임시표와 두 타이 끝점이 있고 원본과 출력 XML 6건이 고정 XSD를 통과했다. 두 폭의 A4 PDF 이미지가 일치했다. 별도 제품 코드를 추가하지 않았으며, 앞선 타이 수정으로 기존 J 명령이 만든 프로젝트를 저장할 수 있게 됐다. `out/parity-qa/enharmonic-tie-edit-before-verified-ui/results.json`, `enharmonic-tie-edit-ui/results.json` 및 `enharmonic-tie-edit-xsd.log`에 기록했다.

설명서를 포함한 생산 빌드의 실제 도움말 메뉴에서 두 폭 모두 ‘표기와 표현’의 가져오기·J 안내를 열었다. Escape로 닫았을 때 악보의 선택·편집 기록·재생 위치는 유지됐다. `out/parity-qa/enharmonic-tie-help-ui/results.json`에 두 화면과 본문을 남겼다.

## 이명동음 단음 타이까지 누적 전체 검사

`npm run test:all`은 1,995.11초에 종료 코드 0을 반환했다. Vitest 788파일·7,630건과 Node-native 5건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. 종료 뒤 별도 검사에서 고정 입력 6,583개가 모두 일치했다. `out/parity-qa/enharmonic-tie-full-stamp/`에 실제 로그와 종료 기록이 있다. 이후 제품의 실행 코드는 그대로 두고 반복·J 편집의 실제 검증과 설명서를 추가했다.

## MusicXML 화음 구성음의 서로 다른 길이

XSD를 통과한 C4·E4 화음에서 기준음 C4는 2박이고 E4는 1박이었다. 두 폭에서 Studio는 경고 없이 E4도 2박으로 가져왔다. 현재 화음 모델의 공통 길이와 다른 구성음에 파트·마디·음표 번호, 원래 `duration`·`divisions`와 적용 tick을 표시한다. 정확히 환산되지 않는 양의 원본 길이도 기술 정보에 보존한다. [MusicXML chord](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/)

- 단위 실패 2건, MusicXML 165파일·2,201건과 App 2파일·8건, 외부 opt-in 1건 건너뜀, 타입 포함 생산 빌드를 확인했다. 합쳐서 실행한 첫 검사에서 기존 App 무음정 시험이 제한 시간을 넘겼고 분리한 두 검사 그룹은 통과했다. 누적 7,626건은 이 안내 추가 전의 결과다.
- 960×750 dark·1400×750 light의 일반 화음과 짧은 구성음 대조에서 경고 유무와 13,440→26,880 tick을 확인했다. 전후 Native 저장·재열기, 구조 유지 MusicXML, MIDI와 한 페이지 PDF 각 8건에서 기존 공통 길이가 일치했다. 최종 입력·출력 XML 8건을 고정 XSD로 검증했다. 실제 경고 화면과 PDF를 확인했다.
- MuseScore 4.7.5에서 짧은 E4 원본의 정상 MIDI도 C4·E4가 각각 959/480박 동안 발음됐다. 길이가 같은 대조는 SIGABRT여서 외부 비교에서 제외했다. 두 앱의 공통 길이 처리와 원본의 1박 지정을 각각 기록했다.
- C4·G4는 1성부, E4는 2성부의 4분음표와 점2분쉼표로 작성한 대조도 확인했다. Studio의 두 폭에서 C4·E4가 동시에 시작해 각각 2박·1박 동안 지속되고 G4는 2박에 시작했다. 정상 종료한 MuseScore MIDI도 같은 시작 위치에서 각각 959/480박·479/480박을 유지했다. Native 재열기, 구조 유지 사본, 고정 XSD 4건과 대표 PDF를 확인했다. 성부를 명시한 원본과 현재 코드의 검증이며, 자동 성부 분리는 설계 대기다. 근거는 `out/parity-qa/member-duration-voices-ui/results.json` 및 `member-duration-voices-external.log`에 있다.
- 증거는 `out/parity-qa/member-duration-{audit,warning}-*/results.json`, `member-duration-warning-{red,focused,musicxml,app,build,xsd}.log`, `member-duration-compared.json` 및 `member-duration-external.log`에 있다. 구성음별 길이의 편집·재생·왕복은 모델 결정이 필요하다. 실제 OS 대화상자·외부 GUI·청음은 미실행이다.

## 소수 시간 단위와 생략 음가까지 누적 검사

`npm run test:all`은 1,959.94초에 종료 코드 0을 반환했다. Vitest 788파일·7,626건과 Node-native 5건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. 종료 뒤 별도 검사에서도 고정 입력 6,583개가 일치했다. 원래 로그·종료·해시 결과는 `out/parity-qa/exact-decimal-and-omitted-type-full-stamp/`에 있다.

## MusicXML 소수 시간 단위의 정확한 환산

고정 XSD가 허용하는 소수 `divisions`·`duration`을 가져올 수 없었다. 상대 위치는 실수로 계산해 정확한 tick을 거부하거나 tick 사이를 반올림하기도 했다. 음표·쉼표의 길이, `backup`·`forward`가 움직이는 시간과 빠르기·코드 심벌 등의 위치에 당시의 소수 단위를 사용한다. 원래 자릿수로 비율을 계산하고 정수 tick으로 정확히 환산될 때 적용한다. 시간 이동을 쉼표로 만드는 정책은 별도 범위다. [MusicXML divisions](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/divisions/) · [duration](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/duration/) · [offset](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/offset/)

- `0.01 / 0.15`의 코드 위치는 896 tick이다. 정확한 정수 환산, 보표 전진·되돌림, 다음 마디 단위 상속 및 한 tick에 못 미치는 원본 자릿수의 거부를 확인했다. 빠르기의 표시 및 재생 위치는 원본 소수 두 값의 크기와 관계없이 실제 tick으로 대조한다. 서로 다른 위치는 기존 안내에 원래 값을 표시한다.
- 관련 167파일·2,207건, 외부 opt-in 1건 건너뜀, 타입 포함 생산 빌드가 통과했다. 두 worker 검사에서 기존 App 무음정 오류 경로의 첫 검사가 두 번 15초를 넘었고 App 무음정 단독 3건과 한 worker 관련 검사는 통과했다. 원래 실패 로그를 보존했다.
- 960×750 dark·1400×750 light의 정수·소수·빠르기 독립 위치 여섯 경로에서 Native 재열기, 구조 유지 MusicXML·MIDI와 A4 PDF를 확인했다. 현재 모델이 사용하는 음과 빠르기 표기 위치의 산출물은 세 입력에서 일치했다. 독립 위치의 한 박 차이는 경고에 표시했다. 원본과 출력 XML 12건을 고정 XSD로 검사하고 실제 화면을 확인했다.
- MuseScore 4.7.5의 원본 정수·소수 MIDI 요청과 코드 심벌을 뺀 대조는 SIGABRT였다. 정상 종료한 Studio 재출력 사본의 외부 MIDI에는 Studio와 같은 멜로디 음높이 63·65·67, 시작 0·2·3박과 코드 위치 1/15박의 별도 네 음이 들어 있었다. 같은 사본에서 전체 MIDI가 일치한다는 근거는 없다.
- 근거는 `out/parity-qa/exact-decimal-time-unit-{red,focused,final-focused,serial-final,final-build,final-xsd,external,normalized-external}.log`, `exact-decimal-independent-tempo-{red,green}.log`, `exact-decimal-time-unit-final-*/results.json` 및 `exact-decimal-time-unit-compared.json`에 있다. 실제 OS 대화상자·외부 GUI·청음은 미실행이다.

## MusicXML에서 생략된 음표·쉼표의 기보 음가

선택 사항인 `type`을 생략한 일반 음표·쉼표가 필수 값 오류로 열리지 않았다. 당시 `divisions`로 이미 환산한 길이와 명시된 점·잇단음표 비율이 지원 음가 하나에 정확히 맞으면 그 음가를 사용한다. 대비용으로 점을 뺀 1.5박과 길이에 맞지 않는 명시형을 거부한다. 온마디 쉼표는 이전처럼 마디의 실제 길이를 따른다. [MusicXML note](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/) · [MusicXML type](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/type/)

- 단위 실패 2건과 수정 전 실제 앱의 두 실패를 확인했다. 이전 구현이 일반 생략형을 거부할 것을 요구한 세 대조에서, 생략형과 명시형의 동등성 및 정확히 환산되지 않는 입력의 거부를 확인하도록 검사했다. 기존 무음정 음표 거부도 검증했다. 최종 관련 167파일·2,199건과 타입 포함 생산 빌드가 통과했고 외부 opt-in 1건은 건너뛰었다.
- 960×750 dark·1400×750 light에서 −2반음 클라리넷의 점음표·쉼표와 3:2 잇단음표를 각각 생략형·명시형으로 열었다. 여덟 경로의 Native 저장·재열기, 구조 유지 XML·MIDI·A4 PDF를 확인했다. 각 쌍의 결과가 일치했고 원본·출력 16 XML은 고정 XSD를 통과했다. 제자리표·쉼표와 잇단음표의 PDF를 직접 확인했다.
- MuseScore 4.7.5 정상 MIDI의 클라리넷 두 시료는 음높이 63·65·67과 0·2·3박으로 Studio와 일치했다. 생략형 잇단음표도 음높이 60·62·64와 0·1/3·2/3박이 일치했다. MuseScore 잇단음표 명시형 변환은 SIGABRT였으며 산출물은 제외했다. 정상 외부 출력의 음 지속 값은 Studio와 차이가 있다.
- 근거는 `out/parity-qa/omitted-note-type-{test-red,ui-red,focused,focused-final,build,final-xsd,external,triplet-external}.log`, `omitted-note-type-ui-*/results.json`, `omitted-note-type-compared.json`에 있다. 실제 OS 대화상자·외부 GUI·청음은 미실행이다.

## 못갖춘마디의 MusicXML 시간 이동과 실제 길이

MusicXML의 `implicit="yes"` 첫 마디에서 <code>&lt;forward&gt;</code>로 한 박을 비우자, 2박 못갖춘마디가 경고 없이 1박으로 열렸다. 두 폭의 실제 MIDI에서 첫 음과 다음 마디의 시작이 1·2박에서 0·1박으로 앞당겨졌다. 원본의 가장 먼 시간 위치와 가져온 길이를 비교해 실제로 축소된 못갖춘마디에 원래 파트·마디와 두 길이를 표시한다. [MusicXML forward](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/forward/)

- 첫 음 앞과 뒤의 무음에서 단위 실패 2건을 재현했다. 관련 167파일·2,197건, 외부 opt-in 1건 건너뜀, 타입 포함 생산 빌드를 확인했다. 960×750 dark·1400×750 light에서 경고·기술 정보의 26,880→13,440 tick과 명시적 쉼표 대조의 경고 없음을 검증했다. 1400px 경고 화면을 직접 검토했다.
- 두 입력의 Native 재열기·구조 유지 XML·MIDI·PDF를 비교했다. 각 입력에서 진단 전후 악보와 XML·MIDI·PDF 이미지가 일치했고, 두 입력의 박 위치 차이는 남는다. 전후 PDF 8개는 각각 한 페이지이고 최종 입력과 사본 XML 8건이 고정 XSD를 통과했다. MuseScore 4.7.5의 정상 명시적 쉼표 MIDI는 1·2박에 시작했다. 시간 이동 원본의 직접 MIDI 변환은 SIGABRT였다.
- `out/parity-qa/pickup-forward-{audit,warning}-ui-*/results.json`, `pickup-forward-warning-{red,focused,xsd}.log`, `pickup-forward-warning-compared.json`, `pickup-forward-audit-external.log`에 근거가 있다. 실제 OS 대화상자·외부 GUI·청음은 미실행이다.

무음 구간 자체를 보존하려면 표시되는 쉼표로 바꾸는 방법과 비표시 무음을 보존하는 방법의 기보·편집 계약을 결정해야 한다. 가져오기 차단을 검토할 때는 기존에 열리던 못갖춘마디와 여러 성부의 시간 이동 대조를 포함한다. 이번 변경은 기존 가져오기 결과를 유지하면서 손실을 안내한다.

## 기존 이조에 명시한 옥타브 값 0

−2반음 이조가 계속되는 입력의 두 번째 마디에 `octave-change=0`을 명시하면, 기존 묶음이 두 폭에서 1마디와 2마디로 분리됐다. 옥타브 값을 생략한 경우도 0으로 비교하도록 묶음 문맥 검사를 수정했다. 온음계 값이 생략된 경우의 철자 정책과 실제 옥타브 변화의 경계는 기존 동작을 유지한다. [MusicXML transpose](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/)

- 단위 실패 1건·기존 대조 11건, 관련 9파일·116건, 타입 포함 생산 빌드와 960/1400px의 여섯 경로를 확인했다. 생략과 0의 수정 후 PDF는 같은 픽셀로 세 마디를 묶었다. 실제 아래 한 옥타브는 1마디와 2마디로 분리됐다. 대표 두 PDF를 직접 검토했다.
- 전후 일반·묶음 PDF 16개가 각각 한 페이지였다. 수정 전후 일반 PDF·Native 재열기·MusicXML·MIDI를 비교했다. 생략과 0의 MIDI는 12박의 70, 한 옥타브 아래 대조는 같은 위치의 58이며 길이는 4박이다. 원본과 실제 XML 21건이 고정 XSD를 통과했다. 이번 변화는 묶음 PDF에 한정된다.
- 증거는 `out/parity-qa/explicit-octave-zero-rests-{red,focused,build,final-xsd}.log`, `explicit-octave-zero-rests-ui-*/results.json`, `explicit-octave-zero-rests-checked.json`에 있다. 실제 OS 대화상자 및 외부 MuseScore PDF는 미실행이다.

## MusicXML forward와 성부 길이 안내

XSD를 통과한 기존 2/4 이조 시료의 첫 쉼표를 `<forward>`로 바꾸면, Studio는 명시된 4분음표 하나만 읽고 성부 공백 오류를 냈다. 실제 960×750 dark와 1400×750 light에서 기존 안내와 기술 정보에 시간 이동 자체가 표시되지 않았다. 명시적 쉼표 대조는 같은 파일 형식에서 열렸다. 이 성부 길이 오류에 원래 파트·마디·보표와 `forward`의 duration·voice·staff 값을 표시한다. 시간 이동을 쉼표로 자동 변환하는 정책은 도입하지 않았다. [MusicXML forward](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/forward/)

- 실패 재현 1건과 같은 길이의 일반 공백 대조를 추가했다. 관련 167파일·2,195건, 외부 opt-in 1건 건너뜀과 타입 포함 생산 빌드를 확인했다. 직전 누적 7,612건은 이번 진단 추가 전이다.
- 두 폭에서 공개 메뉴로 가져오기를 진행했다. 원래 파일 해시, 기존 6박 악보, 변경 0회와 저장한 Native 내용, 한국어 안내·기술 정보·배포 도움말을 확인했다. 960px 오류 화면을 직접 검토했다. 실제 파일 대화상자는 임시 경로 어댑터를 사용했다.
- MuseScore 4.7.5에서 직접 실음과 `forward`를 함께 적은 대조는 정상 종료해 Studio의 명시적 쉼표 대조와 음높이·시작 박이 일치했다. 중간 이조의 `forward` 원본과 명시적 쉼표 원본은 SIGABRT로 끝났다. 이 두 산출물은 비교에서 제외했다.
- `out/parity-qa/forward-gap-transposition-{studio,red,focused,build,external,xsd}.log` 및 `forward-gap-transposition-ui-{red,green}/results.json`에 근거를 남겼다. 러너 초기 생성 실패로 생긴 자체 프로세스를 종료하고 별도 실행으로 검증했다.

## 쉼표 뒤 첫 음과 파트보 이조 0까지 누적 검사

`npm run test:all`은 1,815.02초에 종료 코드 0을 반환했다. Vitest 788파일·7,612건과 Node-native 5건 통과, 외부 opt-in 1파일·1건 건너뜀이다. 실행 종료와 종료 뒤 독립 검사에서 고정 입력 6,583개가 모두 일치했다. 원래 로그와 결과는 `out/parity-qa/leading-rest-and-neutral-transposition-full-stamp/`에 있다.

## 이조 값 0과 파트보 묶음 쉼표

첫 세 마디가 온마디 쉼표인 MusicXML에 2마디 이조를 모두 0으로 명시하자, 같은 기보와 음높이인데도 파트보 PDF에서 1마디와 2마디가 나뉘었다. 단위 1건과 실제 두 폭에서 실패를 확인했다. 묶음 PDF의 문맥 비교에서 이조 생략과 모든 간격 값이 0인 설정을 같은 값으로 해석한다. 반음·온음계·옥타브 간격이 실제로 바뀌면 경계를 유지한다.

- 관련 9파일·114건, 타입 포함 생산 빌드와 960×750 dark/coarse·1400×750 light/fine 격리 앱의 이조 생략·0·−2반음 여섯 경로를 확인했다. 공개 파트보 출력 버튼에 초점을 둔 뒤 Enter로 PDF를 저장했다.
- 전후 일반·묶음 PDF 16건이 모두 A4 한 페이지다. 수정한 0 시료의 묶음 PDF 래스터가 생략 시료와 일치했고 −2반음 시료는 1마디와 2마디를 분리했다. 대표 두 PDF를 직접 검토했다.
- 이조 0 시료의 일반 PDF·MIDI·MusicXML은 전후 일치했다. 같은 파일의 출력 전후 Native 및 재열기 `score`가 일치했다. 두 0 대조 MIDI는 12박의 C5, −2반음은 같은 시작의 B♭4였으며 모두 4박 지속했다. 원본과 출력 21건은 고정 MusicXML 4.0 XSD를 통과했다.
- 검증은 `out/parity-qa/nonchanging-transpose-rests-{unit-red,regressions,build,final-xsd}.log`, `nonchanging-transpose-rests-ui-*/results.json`, `nonchanging-transpose-rests-checked.json`에 있다. 출력에는 파일 대화상자 어댑터를 사용했다. 이 시료의 MuseScore PDF·물리 터치·실제 OS 대화상자는 미실행이다.

같은 빌드에서 2마디의 이조 0과 3마디의 수동 페이지 나누기가 공존하는 조건을 추가 확인했다. 두 폭의 일반 PDF와 묶음 PDF는 각각 2쪽이었다. 묶음 PDF의 1쪽에는 마디 1–2, 2쪽에는 마디 3–4의 쉼표 묶음과 5마디의 C5가 있다. 양쪽 PDF를 직접 검토했다. Native 재열기와 XML `new-page="yes"`가 3마디 경계를 유지한다. MIDI는 16박에 C5가 시작해 4박 지속한다. XML 7건이 XSD를 통과했다. 새 제품 변경 없이 `out/parity-qa/transpose-rests-manual-break/`에 실제 회귀 증거를 남겼다.

## 쉼표 뒤 첫 음의 MusicXML 이조

마디 안에서 쉼표가 끝난 뒤 처음 나오는 음에 이조를 지정하면, 마디 시작 설정 블록에 있던 이조가 남아 음높이가 달라졌다. 실패 재현 두 건과 기존 보표별 경계 대조를 보존했다. 수정 전 격리 Electron의 두 폭에서도 3마디 이조가 `[0, 0, 0]`이었다. [MusicXML attributes](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/) · [MusicXML transpose](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/)

악보 순서에서 적용 대상 각 보표의 첫 유음 전이나 같은 박에 변경이 한 번만 있고 파트에 앞선 코드 심벌이 없으면, 기존 마디별 모델에 이조를 적용한다. 여러 성부의 `backup`과 보표 번호를 고려한다. `forward` 공백이 있는 마디, 앞선 음이 있는 경우, 같은 보표에 겹친 변경은 기존 경고를 유지한다. 적용한 경우 한국어 안내와 원래 파트·마디·블록·tick·값이 표시된다.

- MusicXML과 관련 App 검사 167파일·2,192건이 통과했고 외부 opt-in 1건을 건너뛰었다. 타입 검사 포함 생산 빌드와 960×750 dark, 1400×750 light를 확인했다. 두 폭에서 원래 경고·기술 정보·도움말을 열었다. 경고 화면과 A4 PDF 이미지를 직접 검토했다.
- 원본 마디 내부 배치와 시작 배치 대조의 Native 8개에서 `score`가 일치했다. MIDI 4개에서 시작 0·1·3·4·5박, 음높이 60·62·58·58·60, 각각 한 박이 일치했다. 네 PDF의 래스터 해시와 구조 유지 MusicXML 파일이 각각 일치했다. 원본·대조·출력 15건을 고정 MusicXML 4.0 XSD로 검사했다.
- MuseScore 4.7.5의 격리 배치 변환 세 건과 직접 MIDI 출력의 시작 배치 대조는 SIGABRT였다. 직접 출력이 정상 종료한 원본과 Studio 구조 사본은 60·62·60·60·62로 재생했다. 직접 실음을 적은 대조는 Studio와 음높이·시작 박이 일치했다. 정상 외부 MIDI의 지속은 479/480박이다.
- 증거는 `out/parity-qa/leading-rest-transposition-{unit-red,ui-red,focused,build,xsd,midi,artifact-sha256,external,external-direct,external-midi}.log`, `leading-rest-transposition-{positioned,opening}-green/results.json`, `leading-rest-direct-midi-zbkr1u_p/results.json`에 있다. 출력 저장 경로는 대화상자 어댑터 경유이며 외부 GUI·물리 청음·실제 OS 파일 대화상자는 미실행이다.

## 총보의 한 마디에 박자표 적용

기존 우클릭의 **박자표 변경…**은 한 보표의 한 마디에 적용된다. 4파트 대조군으로 해당 적용 범위와 한 번의 undo/redo를 재현했다. 총보에서 같은 작업대를 연 뒤 **이 마디의 총보 박자표…**로 모든 보표에 명시적으로 적용할 수 있다.

같은 순서에 있는 마디의 시작 tick과 실제 길이가 일치해야 한다. 보표별 맞춤과 보호 검사를 미리 수행하고, 공통 실제 길이를 만들 수 있을 때 기존 `score-parts.replace` 한 번으로 적용한다. 마디·이벤트 주소, 유효한 원본 번호, 빠르기 표시, 이웃 마디의 박자표와 기존 못갖춘마디 절차를 보존한다. 연속 구간의 박자표 전파와 자동 재분할은 후속 설계다. [MuseScore 박자표 적용](https://handbook.musescore.org/notation/rhythm-meter-and-measures/time-signatures) · [마디 속성](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-properties)

- 새 명령이 없던 App 경로와 커맨드 회귀를 먼저 재현했다. 기존 단일 보표 대조는 통과했다. 원래 로그는 `out/parity-qa/meter-red.log`에 있다. 최초 red의 별도 fixture 생성 오류를 수정했다.
- 기존 번호·부착 기호·빠르기 및 새 원자성, XML 왕복과 재생 검사를 실행했다. 실제 마지막 마디의 세 음표가 모두 7박에 시작하는 축소 단위 사례를 확인했다.
- 960×750 dark/coarse, 1400×750 light/fine 격리 Electron에서 세 보표 fixture를 실제 앱으로 열었다. CDP 마우스 우클릭과 Tab/Enter를 사용했다. 플루트의 온음표 때문에 3/4를 거부하고 5/4 적용 후 초점 복귀와 한 번의 undo/redo, 프로젝트 저장·재열기를 확인했다.
- 두 창에서 MusicXML·MIDI·A4 한 페이지 PDF를 출력했다. XML은 각 파트에 4/4 → 5/4 → 4/4로 기록됐다. MIDI에서 마지막 마디는 모든 보표가 9박에 시작한다. 검증 결과·캡처·파일 해시는 `out/parity-qa/meter-b/results.json`에 있다. 960px 오류와 1400px 적용 화면을 직접 검토했다.
- 실제 OS 파일 선택기는 임시 경로를 반환하는 어댑터를 사용했다. MuseScore GUI 및 외부 재생 비교는 후속 검증에 포함한다.

[실행 큐](execution-queue.md)

## 마디 내용 지우기와 구조 제거

총보와 파트보에서 마디 우클릭 또는 편집 메뉴의 **이 보표의 마디 내용 지우기**를 사용한다. 선택한 보표의 각 성부를 온마디 쉼표로 바꾸며 기존 마디 주소·번호·실제 길이와 마디에 연결된 빠르기·글자 등의 표기를 유지한다. 지운 음표·쉼표에 붙은 가사와 표현은 함께 지운다. 연결된 타이, 슬러·헤어핀·옥타브 선 끝점, 잇단음표가 있는 대상은 원본을 유지하고 이유를 표시한다. 비어 있는 마디에는 추가 undo를 만들지 않는다.

우클릭 메뉴는 구조 제거가 모든 보표를 대상으로 함을 안내한다. 기존 Delete 키와 **마디 제거**는 구조 제거에 사용된다. Delete 기본값 변경은 별도 결정으로 남겼다. [MuseScore 음표와 쉼표 편집](https://handbook.musescore.org/basics/editing-notes-and-rests) · [마디 추가와 제거](https://handbook.musescore.org/basics/adding-and-removing-measures)

- 실패 재현 8건과 기존 통과 25건의 원래 로그는 `out/parity-qa/clear-red.log`에 있다. 단위/App/메뉴 6파일 49검사와 생산 빌드를 통과했다.
- 960×750과 1400×750의 실제 Electron에서 우클릭, End/Up/Enter, 조작 뒤 악보 초점, 선택 보표만 내용 변경, 구조 제거와 각각의 undo, Native 저장·재열기를 검증했다.
- 각 폭의 MusicXML·MIDI·A4 한 페이지 PDF를 확인했다. MIDI에서 플루트 2마디의 발음을 지웠고 3마디의 시작 8박은 두 파트에서 유지했다. 로그·화면·해시는 `out/parity-qa/clear-a/results.json`에 있다.

## 연속 두 마디 복사와 붙여넣기

같은 보표·성부의 이웃한 두 마디를 모두 선택한 뒤 **선택 범위 복사**를 실행한다. 길이가 각각 같은 이웃 두 마디 전체를 고른 뒤 **선택 범위에 붙여넣기**를 실행한다. 목적지 마디의 박자표와 주소는 보존한다. 붙여넣은 이벤트는 새 ID를 받으며, 출발 마디의 임시표를 해석해 목적지 조표에 맞추고 음표에 붙은 가사를 복제한다. 타이·잇단음표·구간 표기 끝점이 대상이면 거부한다. 잘라내기는 같은 마디에 한한다. [MuseScore 복사와 붙여넣기](https://handbook.musescore.org/basics/copy-and-paste)

- 최초 미지원 사례 2건은 `out/parity-qa/copy-red.log`에 있다. 구현 후 클립보드 3파일 19검사, 타입 검사와 생산 빌드가 통과했다.
- 960×750과 1400×750 Electron에서 실제 포인터와 Shift로 두 마디 범위를 고르고 편집 메뉴를 실행했다. 3/4와 4/4 경계, 가사와 F♯/F, 출발 마디 보존, 한 번의 undo/redo, Native 파일 재열기를 확인했다.
- 양쪽 창에서 각각 A4 한 쪽 PDF와 MusicXML·MIDI를 출력했다. MIDI는 0·3·7·10박에서 F♯4·F4·F♯4·F4다. XML은 구문 검사를 통과했다. 화면·산출물과 해시는 `out/parity-qa/copy-a/results.json`에 있다.

## 단일 보표 파트보에서 여러 마디 쉼표 출력

파트보를 고르고 **파일 → 내보내기 설정 → 쉼표를 묶어 파트보 PDF 출력**을 사용한다. 기존 PDF 명령도 계속 제공한다. 온마디 쉼표 두 개 이상을 VexFlow의 묶음 기호로 그린다. 조표·박자표·음자리표 변경과 줄·페이지 나누기에서 분리한다. 반복·볼타·연습표·글자·빠르기·범위 기호·장식 쉼표가 있는 마디는 보존한다. 원본 프로젝트·재생·MusicXML과 PNG는 원래 마디 배열을 사용한다. 원본 MusicXML 묶음 지시의 손실 안내도 유지한다. [MuseScore 여러 마디 쉼표](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-and-multimeasure-rests)

- `part-rest-red.log`와 `part-rest-alias-red.log`에 초기 미지원과 별칭 경계 실패가 있다. 6파일 54검사, 타입과 생산 빌드를 통과했다. 최초 실제 실행은 Native가 허용하지 않는 줄 경계 별칭을 넣은 fixture 때문에 실패했다. 정상 Native 주소로 바꾸고 단위 검사의 별칭 대조는 유지했다.
- 960×750 dark/coarse 및 1400×750 light/fine에서 실제 파트보 PDF를 생성했다. 14개 중 5쌍이 묶였고 연습표와 마지막 음표를 유지했다. 일반/묶음 PDF 각 두 개 모두 A4 한 페이지다. 같은 종류의 PDF는 두 창에서 같은 이미지로 나왔다. Native 재열기와 전후 MIDI·MusicXML 바이트를 대조했다. 마지막 음의 시작은 53박이다.
- 실제 이미지·출력 해시는 `out/parity-qa/rest-b/results.json`에 있다. 일반·묶음 PDF를 직접 검토했다. 두 출력 모두 뒤 악보단의 연습표가 이전 악보단과 시각적으로 가까운 사례를 발견해 후속 검증으로 남겼다.

## MuseScore 4.7.5와 MusicXML 비교

생성한 대조군 7건, Studio 구조 유지/반복 펼치기 사본 각 7건을 비교했다. 세 종류 총 21 XML이 로컬 MusicXML 4.0 XSD를 통과했다. Studio에서 두 사본을 다시 읽은 MIDI는 각 원본을 Studio에서 읽은 MIDI와 바이트 일치했다. [MuseScore CLI 사용법](https://handbook.musescore.org/appendix/command-line-usage)

설치 빌드는 `offscreen` Qt 플러그인과 핸드북의 `-c` 옵션을 지원하지 않았다. Cocoa에 임시 HOME과 쓰기 제한을 적용한 자체 CLI를 실행했다. 21건 중 9건이 정상 종료했고 12건이 SIGABRT였다. 일부 비정상 종료에서도 파일이 만들어졌으므로 모두 비교에서 제외했다. OS 쓰기 제한 상태에서 발생한 종료로, 모든 실패가 특정 MusicXML 요소 때문이라고 해석할 근거가 없다.

| 조건 | 정상 종료 파일의 비교 |
| --- | --- |
| 단순 반복 | 원본과 구조 유지 사본에서 음높이·시작 박 일치 |
| 단순 볼타 | 구조 유지 사본에서 C4–D4–C4–E4, 시작 0–3박 일치 |
| 중첩 반복 | Studio 및 펼친 사본 7음, MuseScore 원본 및 구조 유지 사본 9음. 외부 결과에 맞춰 내부 반복을 조정하지 않았다. |
| 중첩 볼타 | 정상 외부 결과 없음. Studio 내부 두 XML 방식은 8음 재생 일치 |
| 고정 −2 이조 | 정상 종료한 펼치기 사본의 MIDI 음높이 58·60·62와 시작 0·1·2박 일치 |
| 중간 이조와 복원 | Studio 60·60·64, MuseScore 원본과 구조 유지 사본 60·62·64. 시작은 모두 0·1·2박 |
| 짧은 꾸밈음 | Studio MIDI는 C4·D4만 0·1박에 출력한다. 정상 외부 출력 없음. |

동일한 온전한 1박 보표음의 MIDI 지속은 Studio 1박, 위 정상 MuseScore 대조군 479/480박이었다. 게이트 길이 차이를 음높이·시작 일치와 구분했다. 외부 로그, 상태·해시는 `out/parity-qa/musescore-cocoa-owned.log`, `musescore-comparison.log`, `musescore-decoded.log`와 이들이 가리키는 각 `results.json`에 있다. 외부 GUI·청음·실제 OS 파일 대화상자·스크린리더 검증은 미실행이다.

## 실음 MusicXML의 파트보 설정 안내

유효한 실음 악보의 `for-part`가 파트보 전용 음자리표·이조를 잃는 사례를 재현하고, 기존 가져오기 경고에 한국어 요약과 원래 경로·값을 추가했다. 960/1400px에서 상세 펼치기, Native 저장, MIDI C4 한 박과 MusicXML 재출력을 검증했다. 일반 이조 경로와 기보음은 유지한다. 4파일 10검사, 타입·빌드 및 입력·재출력 XSD가 통과했다. `out/parity-qa/concert-a/results.json`에 캡처·해시가 있다. 실음 보기의 조표·임시표와 입력 좌표 역변환은 별도 제품 범위다. [MusicXML 파트 설정](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/for-part/) · [MuseScore 실음 보기](https://handbook.musescore.org/notation/pitch/transposition)

꾸밈음의 첫 발음을 구현하려면 음이 시작하는 박과 본음 길이, 타이·반복·빠르기 관계를 먼저 정해야 한다. 이번 검사에서는 원래 발음·표기 의미를 유지했다. [MuseScore 꾸밈음](https://handbook.musescore.org/notation/expressive-markings/grace-notes)

## 승인된 명시적 중첩 반복

사용자 승인에 따라 볼타 없이 시작·끝이 닫힌 중첩 반복은 바깥 회차마다 안쪽 반복을 처음부터 수행한다. 내장 재생·MIDI·MusicXML 반복 펼치기가 같은 반복 계획을 사용한다. 원본 Native, 일반 MusicXML과 인쇄는 도돌이표와 4마디를 유지한다. 볼타·묵시적 또는 닫히지 않은 구조에는 기존 규칙을 적용한다. 과대 확장을 방지하기 위해 이 경로는 총 펼친 마디 수를 원래 마디 수의 100배까지 허용한다. 해당 범위를 넘으면 기존 재생 규칙을 적용한다. [MusicXML 반복 요소](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/repeat/)

- 최초 재현에서 4마디는 7회 발생했다. 변경 후 두 회차마다 A–B–C–B–C–D, 전체 12회다. 3/4가 섞인 내부 반복 횟수 3, 안전 한도, 닫히지 않은 구조와 일반 볼타를 대조했다.
- 재생·MIDI·반복 펼치기 등의 39파일 469검사와 타입 포함 생산 빌드를 통과했다. 960/1400px의 실제 Electron에서 음소거 상태로 12박 재생 및 정지를 확인했다. Native 저장·재열기·실제 MIDI와 A4 한 페이지 PDF도 통과했다.
- 독립 MIDI 디코더는 0–11박에 MIDI 음높이 60, 62, 64, 62, 64, 65가 두 번 나오는 것을 확인했다. 각 음은 1박이다. 두 가지 폭의 일반 MusicXML은 마디 4개·반복 표시 4개, 펼치기에는 마디 12개가 있으며 네 파일이 로컬 XSD를 통과했다.
- 로그와 캡처·해시는 out/parity-qa/nested-repeat-red.log, nested-repeat-focused.log, nested-a/results.json에 있다. 12마디 펼친 사본의 추가 MuseScore 4.7.5 CLI 시도는 SIGABRT여서 외부 호환성 검증에 포함하지 않았다.
- 승인 전 소스의 전체 검사는 326.07초에 종료 코드 130으로 중단했다. 원래 전체 로그와 입력 해시는 out/parity-qa/test-all.log 및 full-inputs.json에 보존했다.

파트보 출력의 최신 합본에서는 960/1400px에서 새 묶음 쉼표 PDF 버튼의 가시 좌표와 키보드 Enter 실행도 확인했다. 둘째 악보단의 연습표 소유권은 9마디이며, 1050px 높이 PDF 래스터에서 프레임 하단은 y202, 둘째 오선의 시작은 y273이다. 별도 조판 항목으로 추적한다. out/parity-qa/rest-c/results.json을 참고한다.

## 추가 외부 대조

MuseScore 4.7.5에서 생성된 임시 악보만 사용했다. 정상 종료한 MusicXML 재저장 두 건의 실제 요소와 동일 입력 MIDI 결과를 구분했다. 원본과 재저장 XML 네 건은 pinned XSD에 맞는다.

- 고정 이조: 첫 마디의 −2와 C4·D4·E4 기보음을 재저장본에 유지했다.
- 마디별 이조: 원본 2마디 −2와 3마디 0이 재저장본에서 모두 빠졌다. C4·D4·E4는 남았고 실제 CLI MIDI에서도 두 번째 음은 D4였다. Studio 원본과 사본은 시작 음, 이조된 두 번째 음, 복원된 세 번째 음을 각각 60·60·64로 보존한다. Studio의 이조 의미나 XML을 바꾸지 않았다. 결과와 해시는 out/parity-qa/musescore-transposition-roundtrip.log와 musescore-transposition-geometry.json에 있다.
- 연습표: 같은 9마디 표시를 가진 생성 악보의 MuseScore PDF를 별도 CLI로 저장했다. 높이 1050px 이미지에서 프레임과 해당 오선 간격은 MuseScore 4px, Studio 일반·묶음 PDF 71px였다. 시스템 나누기와 보표 배율이 다르므로 간격의 방향과 소유권 비교 증거로 사용한다. Studio에서 연습표 소유권은 9마디다. 보표 간격 대비 차이가 크며 조판 목표 간격과 같은 주변 표기의 겹침 검증이 남았다. out/parity-qa/musescore-rehearsal-geometry.json에 수치·해시를 보존했다.

## 뒤 악보단의 연습표 배치

프레임과 글자를 함께 해당 오선 쪽으로 이동한다. 기존 실제 잉크 측정을 재사용하고, 같은 악보단의 겹치는 고음·글자·범위 기호가 있으면 여백을 유지하거나 기존 위치를 사용한다. 첫 악보단은 기존 조판을 유지한다. 연습표의 마디 주소·키보드 대상, glyph·출력 범위와 다른 표기의 geometry를 유지한다.

- 처음 발견한 Studio 출력에서 연습표와 자기 오선의 간격은 71px이었다. 높이 1050px의 최종 PDF에서는 일반 출력 5px, 묶음 출력 18px였다. 묶음 출력은 위로 돌출한 음자리표를 피한다. 960/1400px 실제 PDF·Native 재열기와 MusicXML/MIDI 동등성을 확인했다.
- 뒤 악보단의 실제 높이 차이와 앞 악보단 소유 잉크가 이동을 잘못 막는 단위 실패를 보존했다. focused 4파일 51검사와 production 빌드, 실제 파트보 PDF, Studio profile 및 fixed-canvas가 통과했다.
- 첫 시안은 첫 악보단까지 적용해 profile의 연습표 y값을 바꿨다. 실제 사례가 있는 뒤 악보단으로 적용 범위를 좁힌 뒤 두 시각 검사가 통과했고 기준 이미지는 유지했다. 로그는 out/parity-qa/final-profile.log와 rehearsal-final-profile.log·rehearsal-final-fixed.log에 있다. 최종 화면·파일은 out/parity-qa/rest-rehearsal-final/results.json에 있다.
- 중첩 반복 반영 후 전체 실행에서 새 마디 명령이 빠진 기존 메뉴 순서와 End 초점 기대값 두 건을 재현했다. 정상화한 집중 검사 3건을 통과했다. 비활성 제거 항목 건너뛰기, IME 중 Enter·Escape 차단, 구조 제거와 실행 취소 검사는 유지했다. 별도 소스 고정 전체 실행은 571.71초에 종료 코드 130으로 중단했고 그 전에 나타난 두 실패를 기록했다. 관련 로그는 out/parity-qa/final-test-all.log, measure-menu-integration-red.log, measure-menu-integration-green.log에 있다.

최종 빌드에서 두 창 모두 중첩 반복 6박의 되돌아온 첫 마디 커서와 앱 도움말의 개정 문구를 확인했다. 최초 자동 검증은 재생 중인 선택 음표가 선택 색을 유지하는 계약을 놓쳤다. 실제 커서의 x와 기보 이벤트 x를 대조한 재실행이 통과했다. 결과는 out/parity-qa/nested-return-b/results.json에 있다.

## 내보내기 형식의 후속 범위

생성한 단순 반복 악보의 MuseScore 4.7.5 WAV 변환이 정상 종료했다. 실제 파일은 44.1kHz·스테레오·32비트 부동소수점·5.5초였고 유효한 비영 샘플을 확인했다. 청음은 미실행이다. 같은 악보의 SVG 변환은 SIGABRT로 검증할 산출물이 없었다. Studio의 PNG 내부판은 HTML을 품은 SVG를 Chromium에서 래스터화한다. 독립 SVG는 글꼴·문자 표현 및 브라우저 외 소비처를 별도로 검증해야 한다. WAV는 반복·빠르기·타이·믹서·여운의 오프라인 계약과 실제 청음 검증이 남는다. out/parity-qa/musescore-format-capability.log와 musescore-wav-measurements.json에 결과가 있다. [MuseScore 파일 내보내기](https://handbook.musescore.org/file-management/file-export)

## 합본 회귀

최종 제품·테스트 소스로 npm run test:all을 실행했다. Vitest 781파일·7,372검사와 Node-native 5검사가 통과했다. 외부 MuseScore opt-in 1파일·1검사는 건너뛰었다. 전체 1,807.31초에 종료 코드 0이었으며 실행 전후 입력 6,566개의 해시 차이는 없었다. 로그와 실제 receipt는 out/parity-qa/verified-test-all.log와 verified-test-all-receipt.json이다. 실행을 마친 뒤 결과를 문서에 기록했다. 자체 검증 프로세스는 종료됐다.

현재는 지정 worktree의 미커밋 변경이다. 다음 조판·제품 범위와 외부 실행 조건은 실행 큐에 남겼다.

## 연속 마디와 시작점 붙여넣기

같은 보표·성부에서 경계가 완전한 연속 마디 전체를 복사한다. 붙여넣기는 대상의 첫 음표나 쉼표 또는 마디 수가 정확히 같은 전체 범위를 선택해 실행한다. 시작점은 첫 마디 0 tick이어야 하며 모든 객체를 표시하는 필터에서 사용한다. 마디별 실제 길이, 기존 타이·잇단음표·범위 표기 보호와 한 번의 실행 취소를 유지한다. 여러 마디 중간의 온마디 쉼표에는 해당 마디의 실제 길이를 적용한다. [MuseScore 붙여넣기](https://handbook.musescore.org/basics/copy-and-paste)

- 현행의 두 마디 제한과 단일 시작점 거부를 재현했다. 실패 2건과 기존 통과 2건은 `out/parity-qa/passage-red.log`에 있다. 구현 뒤 클립보드 3파일 21검사와 App 복사·붙여넣기 41검사, 타입·빌드를 통과했다.
- 960×750에서는 대상 첫 쉼표, 1400×750에서는 전체 목적지 범위를 선택했다. 3/4–7/8–4/4, 가운데 온마디 쉼표, 가사·임시표, 한 번의 undo/redo, Native 저장·재열기를 확인했다.
- MIDI의 음높이 66·65·66·65, 시작 0·6.5·10.5·17박, 지속 3·4·3·4박을 독립 디코딩했다. 960/1400에서 MusicXML 두 건은 고정 XSD를 통과했고 A4 한 페이지 PDF도 생성했다. 화면·파일 해시는 `out/parity-qa/passage-a/results.json`에 있다.

## 다중 보표 파트보의 묶음 쉼표

같은 시간 경계를 공유하는 파트의 모든 보표가 온마디 쉼표인 연속 구간을 PDF에서 함께 묶는다. 어느 보표에든 음표·글자·반복 등의 표기가 있으면 해당 마디를 유지한다. 음자리표·박자표·조표 변화와 수동 악보단·페이지 경계에서 묶음을 나눈다. 모두 같은 마디를 남기는 출력용 조판을 사용한다. 원본 프로젝트·재생과 일반 출력은 원래 마디를 사용한다. [MuseScore 여러 마디 쉼표](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-and-multimeasure-rests)

- 두 보표가 함께 묶이지 않던 실패 1건, 단일 보표 등 기존 통과 2건을 보존했다. 수정 후 조판 focused 4파일 35검사, 타입 포함 생산 빌드, Studio profile 및 fixed-canvas를 통과했다. 기준 이미지를 유지했다.
- 960×750 dark 및 1400×750 light에서 14마디 두 보표의 다섯 묶음에 같은 마디 수를 그렸다. 아래 보표의 음표·dolce·음자리표·수동 페이지 나누기와 마지막 음표를 보존했다. 일반/묶음 PDF 각 두 건 모두 A4 2페이지였다. 동일 종류 PDF의 두 폭 래스터가 페이지별 해시 일치했으며 묶음 1·2쪽과 일반 1쪽을 직접 검토했다.
- Native 악보와 파일 재열기를 비교했다. 전후 MusicXML/MIDI 바이트가 일치하며 두 폭의 MusicXML 네 건이 고정 XSD를 통과했다. 결과 해시·캡처는 `out/parity-qa/grand-rests-a/results.json`, 시각 회귀는 `continuation-profile.log`와 `continuation-fixed.log`에서 확인할 수 있다.
- 파일 경로 선택은 격리 어댑터를 사용했다. 실제 OS 파일 선택기, 겹보표의 외부 GUI 교환과 화면 내 쉼표 묶음 선택·재생 커서는 후속 범위다.

## 중첩 반복에 타이와 빠르기를 함께 적용

볼타가 없는 4마디에서 안쪽 두 마디를 타이로 연결하고 첫 빠르기 120, 안쪽 마지막 마디 60을 사용했다. 바깥과 안쪽의 반복 복귀에서 도착 위치의 빠르기를 복원했다. 12박 중 여덟 번 발음하며 D4는 1·3·7·9박에 시작해 각각 2박 지속된다. 실제 MIDI 템포는 0·3·6·9박에서 120, 2·4·8·10박에서 60이다. 새 제품 동작은 추가하지 않았으며 기존 반복·타이·빠르기 계산의 결합을 검증했다.

- 960/1400px 실제 Electron에서 음소거 재생·정지, Native 저장·재열기, MIDI, MusicXML 두 방식과 PDF를 검증했다. 구조 유지 XML은 4마디·반복 4개, 펼친 XML은 12마디다. 두 모드의 왕복 MIDI가 실제 앱 MIDI와 일치했다. 입력을 포함한 XML 6건이 고정 XSD를 통과했다.
- 한 페이지 PDF 두 건의 래스터가 일치했다. 타이·빠르기·도돌이표가 포함된 대표 PDF를 직접 검토했다. 로그·해시는 `out/parity-qa/nested-time-tie-a/results.json`, `nested-time-tie-midi.log`, `nested-time-tie-roundtrip.log`에 있다. 외부 앱 재생과 청음은 미실행이다.
- MuseScore 핸드북은 볼타마다 어느 회차에서 재생할지 지정한다. Studio의 승인 범위는 닫힌 볼타 없는 중첩 반복이다. 현재 탐색기는 볼타가 있는 악보 전체에 기존 경로를 적용한다. 볼타가 중첩 안에 있는 조건과 별도 구간에만 있는 조건은 분리해 다음 정책을 정한다. 꾸밈음은 현재 원본에 음높이와 사선만 저장하고, MusicXML에는 앞음·뒤음의 시간 차용 및 시간 추가가 각각 있다. 첫 발음 범위에서 어느 음의 시간을 얼마나 사용할지 별도 결정이 필요하다. [MuseScore 볼타](https://handbook.musescore.org/notation/repeats/voltas) · [MusicXML 꾸밈음](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/grace/)

## 연속 마디·다중 보표 적용 후 전체 검사

- `npm run test:all`은 2,486.41초에 종료 코드 1이었다. Vitest 780파일 통과, 1파일 실패, 외부 opt-in 1파일 건너뜀, 개별 검사 7,374건 통과·1건 실패·1건 건너뜀이다. 확정 입력 6,568개는 실행 전후 동일했다.
- 실패는 `App.test.tsx`의 `import.picker-boundary layout-cancel preserves the current editing contract` 15초 시간 초과다. 같은 소스와 제한으로 파일 선택기 경계 6건을 별도 실행해 모두 통과했다. 원래 실패는 유지하며 이번 전체 실행을 통과로 집계하지 않는다.
- 별도로 실행한 `npm run test:tools`는 Node-native 5검사가 통과했다. 문서 verifier 4종과 diff check도 통과했다. 원래 전체 로그·receipt는 `out/parity-qa/continuation-suite.log`, `continuation-suite-receipt.json`, 분리 실행은 `continuation-picker-recheck.log`와 `continuation-test-tools.log`에 있다.

## 별도 볼타 구간과 명시적 중첩 반복

악보의 앞 또는 뒤에 독립 1·2번 볼타가 있어도, 볼타와 겹치지 않는 닫힌 중첩 반복은 바깥 회차마다 안쪽을 다시 재생한다. 서로 다른 구간에 있는 볼타는 기존 반복 회차를 따른다. 중첩 구간을 가로지르는 볼타가 있는 대조군은 기존 동작을 유지했다.

- 볼타가 앞·뒤에 있는 단위 사례 두 건과 반복 펼치기 사례 한 건에서 재현했다. 뒤 볼타가 있는 한 박짜리 일곱 마디 악보는 기존 11박에서 16박으로 바뀌었다. 실패 로그는 `out/parity-qa/independent-volta-red.log`에 있다. 수정 후 47파일·508검사와 타입 포함 생산 빌드를 통과했다.
- 실제 960/1400px에서 Native 저장·재열기, 16박 재생·정지, MIDI, 구조 유지와 펼치기 MusicXML, 한 페이지 A4 PDF를 검증했다. 앱 출력 XML 4건과 입력 대조군 2건이 고정 XSD를 통과했다. 두 PDF의 래스터가 일치했으며 대표 페이지를 검토했다. 캡처·산출물 해시는 `out/parity-qa/independent-volta-a/results.json`에 있다.
- 같은 예제의 펼친 16마디 사본을 격리 MuseScore 4.7.5 CLI에서 MIDI로 변환했다. 정상 종료한 파일에서 16음의 음높이와 0~15박 시작이 일치했다. 음 지속은 Studio 1박, MuseScore 479/480박이었다. 도돌이표가 남은 입력의 CLI는 SIGABRT로 종료해 생성된 MIDI를 비교에서 제외했다. `independent-volta-musescore.log`, `independent-volta-musescore-decoded.log`와 해당 실행의 `results.json`에 근거가 있다.
- 누적 score-core·MusicXML·재생·MIDI 217파일 2,642검사와 App 반복·볼타 26검사를 통과했다. 외부 opt-in 1건은 건너뛰었다. 사용설명서를 포함한 새 빌드에서 양쪽 창의 6박대 첫 마디 커서 복귀와 갱신된 도움말도 확인했다. 실행 로그는 `independent-volta-domain.log`, `independent-volta-app.log`, 커서와 도움말은 `out/parity-qa/independent-volta-manual-a/results.json`에 있다.
- 볼타가 중첩 내부에 있는 경우의 회차 소유권, 외부 GUI와 청음은 미검증이다. [MuseScore 볼타](https://handbook.musescore.org/notation/repeats/voltas) · [MusicXML 볼타](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ending/)

## MusicXML 볼타 회차 목록 조사

고정 MusicXML 4.0 XSD를 통과한 세 마디 예제 네 개를 현재 앱의 파서와 재생 계획에 입력했다. 1·2번 대조군은 마디 순서 1–2–1–3으로 재생하고 다시 내보냈다. `number="1,2"`와 빈 번호는 정수 오류로 열리지 않았다. `number="3"`은 경고 없이 빠졌고, 3회차 전용 마디가 앞선 두 회차에도 발음됐다. `out/parity-qa/volta-number-audit.log`와 `volta-number-audit-xsd.log`에 원래 결과를 보존했다. [MusicXML 볼타 속성](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ending/) · [MuseScore 회차 목록](https://handbook.musescore.org/notation/repeats/voltas)

현재 Native와 편집은 1·2번을 저장한다. 복수·3번 이상을 실제로 지원하려면 단순 반복의 회차 목록, 표기·재생, Native 구버전 입력, 기본·펼치기 XML과 MIDI를 함께 확인해야 한다. 빈 번호에는 회차를 지어내지 않는다. 중첩 내부에 걸친 볼타의 회차 소유권은 별도 문제다. 가져오기 진단만 보완하는 범위에서는 원래 회차를 재생하는 것처럼 표시하지 않는다.

## 마디를 비운 뒤 여러 성부의 쉼표 출력

마디 내용 지우기는 기존 성부를 유지하면서 각 성부를 온마디 쉼표로 바꾼다. 종전 PDF는 성부가 하나인 마디만 묶었기 때문에, 음표를 지운 뒤에도 여러 성부가 남은 마디는 양쪽 보표의 묶음을 끊었다. 모든 성부에 장식 없는 온마디 쉼표만 있으면 묶음 후보에 넣는다. 다른 성부의 음표·장식 쉼표와 기존 조표·박자표·페이지 경계는 보호한다.

- 단위 실패 1건과 이전 빌드의 실제 출력에서 위·아래 보표의 첫 3마디 묶음 누락을 확인했다. 수정 후 조판·내용 지우기 4파일·47검사와 타입 포함 생산 빌드를 통과했다.
- 960/1400px 격리 앱에서 2마디의 우클릭 메뉴와 키보드로 내용을 지웠다. 두 성부 ID, 한 번의 실행 취소·다시 실행, Native 재열기, 4마디의 두 번째 성부 음표와 아래 보표 표기를 확인했다.
- 일반/묶음 PDF는 각각 A4 2쪽이다. 묶음 PDF에서 두 보표의 첫 3마디가 묶였으며 같은 종류의 PDF는 창 너비에 관계없이 페이지별 래스터 해시가 일치했다. 묶음 1·2쪽을 직접 검토했다. PDF 내보내기 전후의 MusicXML·MIDI 바이트는 같고 XML 4건이 고정 XSD를 통과했다.
- 로그와 산출물은 `out/parity-qa/multivoice-rests-red.log`, `multivoice-rests-electron-red.log`, `multivoice-rests-focused.log`, `multivoice-rests-a/results.json`에 있다. 실제 OS 파일 선택기·스크린리더와 MuseScore에서 이 예제의 PDF 출력은 미실행이다. [MuseScore 여러 마디 쉼표](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-and-multimeasure-rests)

마디를 비운 여러 성부의 파트보 출력까지 포함한 `npm run test:all`은 Vitest 781파일·7,380검사와 Node-native 5검사를 통과했다. 외부 opt-in 1건을 건너뛰었고 종료 코드는 0이었다. 2,292.10초 동안 고정 입력 6,568개의 전후 해시가 일치했다. `out/parity-qa/multivoice-rests-suite.log`와 `multivoice-rests-suite-receipt.json`에 근거가 있다. 아래 볼타 회차 목록의 구현은 이 전체 실행 이후다.

## MusicXML의 단순 반복에 지정된 볼타 회차

사용자가 승인한 단순 반복부터 복수 회차와 3번 이상 볼타를 가져온다. `number="1,2"`인 구간은 첫 두 회차에서, `number="3"` 구간은 세 번째 회차에서 연주한다. 번호가 비어 있는 괄호는 표시와 MusicXML에 남기며 회차 제한 없이 재생된다는 가져오기 경고를 표시한다. 기존 Native의 단일 1·2번 형식을 유지하고, 추가 정보가 필요한 볼타는 Native의 회차 목록 필드와 기본 MusicXML에 보존한다. 기존 1·2번 버튼으로 가져온 회차 목록을 덮어쓰지 않도록 처리했다.

- 최초 6검사 중 5건 실패와 기존 1·2번 대조군 통과를 보존했다. 연속 마디 볼타의 안쪽 마디와 `2,2`의 명시적인 두 번째 회차도 단위 검사에 포함했다. 최신 focused 6파일·92검사, App의 Native 재열기와 기존 보표별 출력 보호 4검사, 타입과 생산 빌드를 통과했다. 출력 검사 수정 전 관련 도메인 237파일·2,712검사도 통과했고 외부 opt-in 1개는 건너뛰었다.
- 첫 실제 앱 검증은 Native 재열기 뒤 볼타 필드 순서 차이를 파트 손실로 판단해 출력을 막았다. 값과 끝점을 비교하는 검사에 필드 순서를 정규화하고 기존 Native 단일 볼타 키 순서도 유지했다. `out/parity-qa/volta-pass-list-a/failure.png`와 `volta-pass-list-electron.log`에서 원래 실패를 확인할 수 있다.
- 960/1400px 실제 앱의 MusicXML 가져오기에서 `1, 2.`와 `3.`을 표시했다. 마디 우클릭의 기존 볼타 명령이 목록을 유지했고, Native 저장·재열기, MIDI, MusicXML 두 방식, 한 페이지 A4 PDF를 확인했다. 내보낸 XML 4건은 고정 XSD를 통과했다. 두 PDF의 래스터 해시가 같고 대표 페이지를 직접 확인했다. 결과와 캡처는 `out/parity-qa/volta-pass-list-b/results.json`에 있다.
- MIDI 독립 디코더의 음은 0~5박에 C4–D4–C4–D4–C4–E4이며 각각 1박이다. MuseScore 4.7.5는 펼친 사본의 음높이와 시작 박이 일치하고 지속은 479/480박이었다. 구조 유지 사본의 CLI는 SIGABRT로 종료해 생성 파일을 비교에서 제외했다.
- 최신 Studio profile과 fixed-canvas는 기준 비교에서 실패했다. profile의 셈여림 높이 23→22.3, y 264.9→265.4 차이는 이전 빌드에서도 동일했다. 두 검사의 차이 데이터와 960/1400 캡처가 이전·현재 빌드 사이에서 바이트 일치했다. 기준값은 유지했다. `out/parity-qa/volta-pass-list-profile-{control,recheck}/`, `volta-pass-list-fixed-{diff,control-diff}.json`에 근거가 있다.
- 기존 화면 메뉴는 1·2번을 직접 작성하는 기능이다. 새 회차 목록 직접 입력, 중첩 내부의 볼타 회차 소유권, 여러 반복 끝을 가진 복합 대안, 외부 GUI와 청음은 후속 범위다. [MuseScore 볼타 회차 목록](https://handbook.musescore.org/notation/repeats/voltas) · [MusicXML 끝마디 번호](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ending/)

볼타 회차 목록까지 포함한 `npm run test:all`은 2,766.02초에 종료 코드 0으로 끝났다. Vitest 782파일·7,387검사와 Node-native 5검사가 통과했고 외부 opt-in 1파일·1검사를 건너뛰었다. 고정 입력 6,569개는 실행 전후 일치했다. 원래 로그와 종료 기록은 `out/parity-qa/volta-pass-list-suite.log`, `volta-pass-list-suite-receipt.json`이다. 승인된 삭제 키 변경은 이 실행 이후에 적용했다.

## 마디 내용 지우기와 구조 제거의 키 분리

사용자 승인에 따라 선택한 마디에서 Delete/Backspace는 선택 보표의 내용 지우기를 실행한다. ⌘/Ctrl+Delete 또는 ⌘/Ctrl+Backspace는 모든 보표에서 같은 위치의 마디를 제거한다. 기존 삭제 설정은 선택한 내용의 삭제 키를 재지정한다. 구조 제거 키는 마디를 선택한 문맥에서 따로 사용할 수 있다. 선택한 표기, 음표, 텍스트 입력, IME와 읽기 중인 선택 영역의 기존 처리는 유지한다. [MuseScore 내용 지우기](https://handbook.musescore.org/notation/rhythm-meter-and-measures/measure-and-multimeasure-rests) · [MuseScore 마디 제거](https://handbook.musescore.org/basics/adding-and-removing-measures)

- 기존 동작에서 Delete/Backspace와 재지정 삭제가 구조를 제거하는 실패 3건을 재현했고, 메뉴 대조군 2건은 통과했다. 수정 후 focused 7파일·64검사 및 연습표·표기 필터의 App 12검사, 타입 포함 빌드를 통과했다. 테스트는 입력 필드·IME, 재지정, 명령별 실행 취소와 Native 보존을 포함한다.
- 960/1400px에서 실제 Electron의 포인터로 마디를 선택하고 Delete 및 Backspace로 선택 보표의 내용을 지웠다. 같은 키에 Ctrl 및 ⌘을 더하면 세 보표의 마디 수가 3개에서 2개로 바뀌었다. 두 명령은 별도로 실행 취소됐고 Native 재열기를 통과했다.
- 내용 지우기 사본에서 두 MusicXML이 고정 XSD에 맞고, 지운 2마디는 발음하지 않으며 마지막 마디는 원래 8박에 시작한다. 두 PDF는 A4 한 페이지이며 래스터 해시가 일치했다. 대표 페이지를 검토했다. 실패 로그는 `out/parity-qa/measure-delete-keys-red.log`, 출력과 캡처는 `measure-delete-keys-a/results.json`에 있다.
- 실제 OS 파일 선택기·물리 IME·스크린리더와 외부 앱에서의 물리 키 비교는 미실행이다.

## MusicXML 볼타 외형의 손실 안내

MusicXML의 `<ending>`은 재생 회차와 별도로 문구, 표시 여부와 열린 끝을 지정할 수 있다. 이 세 설정이 Studio의 표준 볼타로 바뀌어도 가져오기에서 안내가 없었다. 기존 경고 상세에 파트·마디와 한국어 안내를 표시하고, 기술 정보에 원래 값과 요소 경로를 넣었다. 숫자와 구두점만 다른 일반적인 표시는 경고 대상에서 제외한다. [MusicXML ending](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ending/) · [MuseScore 볼타](https://handbook.musescore.org/notation/repeats/voltas)

- 수정 전 경고가 비어 단위 1건 실패, 대조군을 포함한 7건 통과. 수정 후 도메인 4파일·106건, 공개 가져오기와 Native 재열기 App 2건, 타입 검사와 격리 생산 빌드 통과.
- 960×750 dark/coarse와 1400×750 light/fine의 격리 Electron에서 공개 가져오기를 사용했다. 경고 2개, 기술 정보 disclosure, 화면 회차, Native 재열기와 6박 재생, MIDI·두 MusicXML·PDF의 실제 파일을 확인했다. 파일 선택 응답에는 격리 adapter를 사용했다.
- 입력과 새 MusicXML 사본 4건은 고정 XSD를 통과했다. MIDI와 MusicXML 두 모드는 앞선 표준 외형 대조군과 바이트가 같다. 두 A4 PDF는 1페이지이며 두 폭 및 대조군의 96dpi 래스터가 일치한다. 960px 기술 정보 화면과 1400px PDF를 직접 검토했다.
- 로그와 캡처는 `out/parity-qa/volta-appearance-{red,core,app-b,typecheck,build,electron,xsd}.log`와 `volta-appearance-green/results.json`에 있다. 외형 재현 기능을 도입하지 않았다. 이번 변경의 전체 suite·실제 OS 대화상자·스크린리더·외부 GUI는 미실행이다.
- 최신 소스의 MusicXML·score-core와 App 교환·삭제 회귀는 395.63초 동안 177파일·2,412검사 통과, 외부 opt-in 1파일·1검사 건너뜀, 종료 코드 0이었다. `out/parity-qa/volta-appearance-regression.log`에 결과가 있다.

## 단일 2번 볼타와 꾸밈음 외부 재생 조사

- 세 회차 XML의 단일 `number="2"`에서 1–1–2–1–2–3을 확인했다. 명시 목록 `2,2` 대조군은 1–1–2–1–3이다. 새 XML의 명시 회차와 기존 Native 파일의 재생을 함께 지키는 범위를 [별도 제안](volta-exact-second-proposal.md)에 남겼다.
- 새 가설로 120 BPM·4/4 한 마디에 사선 꾸밈음을 첫 박 또는 둘째 박, 사선 없는 꾸밈음을 둘째 박에 붙였다. 꾸밈음 없는 대조군을 포함한 네 입력이 고정 XSD를 통과했다. Studio는 모두 C4–D4–E4–F4를 0~3박에 1박씩 출력했고 세 꾸밈음 입력에 누락 경고를 표시했다.
- 격리 MuseScore 4.7.5 CLI는 대조군과 사선 2건에서 SIGABRT였다. 정상 종료한 사선 없는 입력은 D4를 1.5박에 239/480박 동안 내보냈고 꾸밈음 B4는 MIDI에 없었다. 종료 실패의 출력은 제외했다. 이 비교는 MIDI 관측이며 앱에서 실제로 들리는 발음과 사선 꾸밈음에 대한 근거는 남아 있다. [MuseScore 꾸밈음](https://handbook.musescore.org/notation/expressive-markings/grace-notes) · [MusicXML grace](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/grace/)
- 실행·입력 해시·MIDI 디코딩은 `out/parity-qa/musescore-grace-onsets-b.log`, `musescore-grace-onsets-1k8qz_3v/results.json`, `grace-and-single-volta-studio.log`에 있다.

### 실음 보기 사전 확인

현재 실음은 재생과 MIDI에서 각 마디의 이조량을 반영한다. 악보는 기보 음높이를 계속 사용한다. MuseScore는 상태줄에서 보기를 전환하며 조표와 코드 심벌도 함께 조정한다. Studio의 첫 실음 보기 범위를 정할 때 조표·임시표·코드 심벌의 전환, 편집 입력 방향, PDF에 사용하는 화면 상태를 함께 검토해야 한다. [MuseScore 편집 화면](https://handbook.musescore.org/en_gb/navigation/the-user-interface) · [MuseScore 조표](https://handbook.musescore.org/notation/pitch/key-signatures) · [MuseScore 코드 심벌](https://handbook.musescore.org/text/chord-symbols)

마디 경계에서 타이와 이조가 겹치는 생성 MusicXML 세 가지가 고정 XSD를 통과했다. 같은 C4 대조군은 2박 동안 지속했다. 기보가 같은 C4 두 개에 둘째 마디의 −2 이조를 적용하면 타이 표기는 남고 재생·MIDI는 C4와 B♭3를 1박씩 구분한다. 둘째 기보를 D4로 바꿔 실제 음높이를 같게 한 입력은 기존 타이 관계 검사에서 거부됐다. XSD 통과가 타이의 음악적 의미까지 보장하지 않으므로, 이 표기는 별도의 결정 없이 수용하거나 자동 수정하지 않는다. `out/parity-qa/staff-transposition-tie.log`에 입력과 실제 MIDI 비교를 남겼다. [MusicXML transpose](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/) · [MusicXML 기보 타이](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tied/) · [MusicXML 발음 타이](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tie/)

## 나뉜 MusicXML 마디 시작 설정과 이조

이전 가져오기는 마디에 `attributes`가 여러 개 있으면 분해된 설정을 하나도 읽지 않았다. 새 회귀의 세 입력이 음가 오류로 열리지 않았다. 마디의 음악적 시작점에 있는 블록을 순서대로 적용한다. 보표 수를 먼저 확인해 같은 위치의 공통 이조를 해당 보표 전체에 적용한다. 각 음표의 길이는 문서에서 해당 음표를 만났을 때의 `divisions`로 계산한다. 박 중간 이조 위치의 손실은 파트·마디와 기술 정보로 안내한다. 기존 모델은 마디·보표마다 하나의 이조를 저장한다. 마디 중간의 단일 설정 블록에 대한 기존 근사 동작을 유지했다. [MusicXML attributes](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/) · [MusicXML divisions](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/divisions/)

- 최초 실패 3건과 같은 위치에 선언한 보표 범위의 별도 실패 1건을 보존했다. 최신 MusicXML·score-core 174파일·2,193검사 및 타입 검사와 격리 생산 빌드 통과. 외부 opt-in 1파일·1검사는 건너뛰었다.
- 960×750의 단일 보표와 1400×750의 두 보표에서 실제 앱 가져오기·Native 저장/재열기·MusicXML/MIDI/PDF 출력을 확인했다. 같은 설정을 한 블록에 넣은 대조군과 Native와 MIDI가 일치한다. 재출력한 MusicXML은 고정 XSD를 통과했고 다시 읽어 같은 MIDI를 만들었다. 두 A4 한 페이지 PDF와 박 중간 이조 경고의 한국어·기술 정보 경로를 확인했다.
- MuseScore 4.7.5 CLI에서 나뉜 입력과 묶은 입력의 처음 다섯 음과 시작 박이 같았다. 8박 마지막 음은 Studio MIDI 60, MuseScore 양쪽 MIDI 58이다. 두 보표 대조군 두 건과 악기 변경을 명시한 대조군 두 건은 SIGABRT로 종료해 MIDI 비교에서 제외했다. 이 차이는 MuseScore GUI와 청음으로 미확인이다. [MusicXML instrument-change](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/instrument-change/)
- `out/parity-qa/split-transposition-c/results.json`, `split-transposition-{red,staff-red,regression,outputs,studio-midi,ms,ms-midi,ms-instrument}.log`에 생성 파일·해시와 검증 결과가 있다. 실제 OS 파일 선택기와 스크린리더는 미실행이다.

## MusicXML 반복 이동과 마디 끝 표기

동일한 마디 시작과 실제 길이를 가진 보표에서 마디 경계의 명시적인 D.C./D.S.와 세뇨·코다·Fine·To Coda를 읽는다. Native와 구조 유지 XML은 연결을 보존한다. 재생·MIDI·반복 펼치기는 같은 마디 순서를 사용한다. 총보의 다른 보표에 붙은 표지도 선택한 파트의 사본에 반영한다. 저장 검사는 사본을 다시 읽어 이동 지시가 빠지면 쓰기를 차단한다. [MuseScore 이동 지시](https://handbook.musescore.org/notation/repeats/jumps-and-markers) · [MusicXML sound](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/sound/)

기보는 마디 시작의 세뇨·코다와 마디 끝의 이동 문구를 분리해 배치한다. 첫 PDF에서는 To Coda의 기호가 빠지고 글자가 마디 시작에 놓였다. 실제 MuseScore 입력의 짝지은 기호·글자를 원본 실패의 회귀로 고정했다. 화면과 PDF에서 치수와 실제 잉크를 확인했고 원본 서식·위치가 자동 배치로 바뀌면 안내한다. 텍스트만 있는 방향 요소는 기존 표기로 유지한다. [MusicXML direction-type](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction-type/) · [MusicXML 세뇨](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/segno/) · [MusicXML 코다](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/coda/)

- 기존 전체 회귀 실행 중에는 격리 복사본에서 작업했다. 직전 전체 검사는 Vitest 782파일·7,396건, Node-native 5건 통과 및 외부 opt-in 1건 건너뜀이다. 2,069.19초 뒤 종료코드 0, 입력 6,571개 변경 없음의 receipt를 확인한 뒤 패치를 적용했다.
- 최종 제품 소스에서 focused Vitest 13파일·153건과 타입 포함 생산 빌드가 통과했다. 실패 자료는 `navigation-candidate/navigation-{save-and-part,loop,print-rests,graphic,symbol-anchor}-red.log`와 `navigation-end-direction-red.log`에 있다.
- 960×750과 1400×750의 프로덕션 Electron에서 실제 메뉴로 MusicXML을 가져와 44박·36박의 재생 시계, Native 저장·재열기와 원본 0회 수정, MIDI·구조 유지 XML·반복 펼치기 XML·PDF를 확인했다. 원본과 두 종류의 사본 6건은 고정 XSD 통과. 두 출력은 A4 한 페이지이며 실제 세뇨·코다와 마지막 마디의 D.C./D.S. 문구를 검토했다. 파일 선택 응답은 격리 어댑터를 썼고 앱은 음소거했다.
- 같은 빌드의 2보표 파트보는 28개 보표 마디 중 16개를 남겨 빈 구간을 묶었다. 세뇨·Fine·D.S.가 붙은 4·7·11마디는 묶음에서 제외했다. 일반 PDF와 묶은 PDF 4건은 각각 A4 한 페이지이며 프로젝트 재열기에서 보표별 표지 소유가 일치했다.
- MuseScore 4.7.5에서 직접 실행한 네이티브 MIDI 네 경로는 Studio와 음높이·시작 박이 일치했다. 정지점·점프 뒤 반복 여부에 따라 각각 44·36·44·52음이며 지속 차이 최댓값은 1/480박이다. 실제 Studio 사본 MIDI도 격리 비교 파일과 해시가 같다. MuseScore의 MusicXML 재열기는 원래 내보내기도 D.C.가 빠지거나 SIGABRT로 끝났으므로 사본의 외부 호환성 확인으로 집계하지 않았다.
- 점프가 있는 악보에서 연습 루프에 한계를 안내하며 일반 재생은 유지한다. 적용되지 않은 복합 경로·누락 대상은 기존 반복을 사용하고 가져오기 경고에 위치를 표시한다. 이동 표지의 직접 편집, 여러 점프, 볼타 결합, 점프를 가로지르는 타이, 실제 청음과 OS 대화상자는 미검증이다.
- 로그와 산출물은 `out/parity-qa/navigation-production-b/results.json`, `navigation-rests-production/results.json`, `navigation-applied-focused-b.log`, `navigation-candidate/external-midi-comparison.json`, `split-transposition-full-stamp/receipt.json`에 있다. 적용 소스는 미커밋이다.
- 고정 캔버스와 Studio R3 작업 공간 스냅샷, 설명서·백로그·로드맵·작업 큐 verifier 4종, `git diff --check`를 통과했다. 시각 기준 파일은 갱신하지 않았다. 반복 이동을 포함한 전체 회귀는 별도 고정 입력에서 실행한다.

## 반복 이동 표지 직접 입력과 소유 보표 삭제

`추가 → 반복·볼타 팔레트 → 반복·볼타 설정 열기 → 반복 이동`에서 세뇨·코다·Fine·To Coda·D.C.·D.S.를 추가, 수정, 삭제한다. 연결 이름과 악보에 보이는 문구를 따로 편집한다. 새 표지는 총보의 첫 보표에 같은 위치의 마디가 있을 때 기록한다. 가져온 표지는 저장된 보표와 해당 표지의 회차를 유지한다. 적용과 삭제는 각각 한 번의 명령이며 Escape는 입력 초안만 버린다. 한글 조합 중 확정과 저장을 차단하고, 다른 마디를 선택하면 이전 초안이 새 대상에 넘어가지 않는다.

정렬된 총보에서 표지를 소유한 보표나 파트를 제거해도 해당 위치의 이동 표지와 점프 후 반복 설정이 남은 보표에 전달된다. 동등한 표지가 있으면 재사용하며 보존 한도를 넘는 경우 제거를 거부한다. 되돌리기는 이전 보표와 원래 위치를 함께 복구한다. 연결 대상이 빠진 초안은 Native에 남기고 진단을 표시한다. 그 동안 재생에는 기존 반복 계획을 사용한다.

- 최초 테스트는 직접 입력 화면 세 건과 보표 제거 뒤 마커 누락 한 건을 재현했다. 최종 작업 트리에서 관련 Vitest 9파일·72검사와 타입을 포함한 생산 빌드가 통과했다. 실패 로그는 `out/parity-qa/navigation-authoring/authoring-red.log`, `authoring-owner-red.log`에 보존했다.
- 격리 프로덕션 앱의 960×750 dark와 1400×750 light에서 악보를 선택하고 실제 메뉴와 속성 입력으로 각각 44박 D.C. al Coda와 36박 D.S. al Fine을 만들었다. 삭제·되돌리기·Native 저장/재열기와 실제 MIDI·MusicXML 두 방식·PDF를 확인했다. 두 MIDI는 앞서 가져온 동등한 경로와 바이트가 같다. 내보낸 XML 4건은 고정 XSD를 통과했다. 각각 A4 한 페이지이며 화면과 PDF 래스터는 `out/parity-qa/navigation-authoring-production-e/`에 있다. 파일 선택 응답 어댑터와 음소거한 자체 앱을 사용했다.
- 생성한 단순 1·2번 볼타의 D.S. al Fine에서 MuseScore 4.7.5의 점프 후 반복 끄기는 1→2→3→2→4→5→6→2→4 순서로 정상 종료했다. 36음의 실제 MIDI를 디코딩했다. 점프 후 반복 켜기는 SIGABRT여서 출력은 검증에서 제외했다. 이 볼타 결합은 후속 구현 범위다. `out/parity-qa/musescore-jump-voltas-decoded.json`에 원본과 산출물 해시를 남겼다. [MuseScore 반복 이동과 표지](https://handbook.musescore.org/notation/repeats/jumps-and-markers)
- 이동 표지 직접 편집은 선택한 마디에서 시작한다. 기보 기호를 직접 움직이기, 회차 목록 직접 편집, 여러 점프, 점프를 넘는 타이, 실제 소리 청취와 OS 파일 선택기는 이번 경로에서 검증하지 않았다.
- 이동 가져오기 직후 시작했던 전체 회귀는 중단됐고 `out/parity-qa/navigation-full-stamp/`에 완료 receipt가 없다. 위 결과는 직접 입력 최종 소스의 해당 검증 범위다. 기준 커밋은 `82ba969c26464b95b4ae5a3c51cca785ddf32c44`이며 적용 변경은 미커밋 상태다.

후속 전체 회귀는 이동 가져오기·직접 입력·소유 보표 삭제 소스에서 1,786.17초에 종료 코드 0으로 끝났다. Vitest 786파일·7,426건과 Node 검사 5건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. 고정 입력 6,578개의 해시가 일치했다. 로그와 receipt는 `out/parity-qa/navigation-authoring-full-stamp/`에 있다. 다음 볼타 패치는 이 확인 뒤 적용했다.

## 반복 이동과 단순 1·2번 볼타

명시적으로 시작과 끝을 적은 도돌이표 하나에 이어진 1·2번 볼타가 있고, 그 뒤에 D.C. 또는 D.S.가 있는 경로를 지원한다. 기본 반복 정책의 복귀는 마지막 회차를 사용한다. Fine에 도달하면 멈추고, To Coda는 출발 지시보다 뒤쪽의 Coda로 이어진다. 재생·MIDI·반복 펼치기는 기존 공통 계획을 사용한다. 첫 볼타에 연결한 타이는 그 마디가 이어지는 회차에만 지속한다. 원본 볼타와 표지는 프로젝트와 구조 유지 사본에 남는다. [MuseScore 반복 이동과 표지](https://handbook.musescore.org/notation/repeats/jumps-and-markers)

- 표준 입력과 Native에서 지원하던 도돌이표만 수행하고 이동 지시가 빠지는 실패 3건 및 Coda 확장의 실패 1건을 먼저 확인했다. 최종 작업 트리의 관련 20파일·237검사와 타입 포함 생산 빌드가 통과했다. 격리 실패 로그와 3개 적용 소스 해시는 `out/parity-qa/navigation-voltas/`에 있다.
- 960×750 dark의 Fine과 1400×750 light의 Coda에서 실제 메뉴 가져오기·재생 시계·Native 저장 및 재열기·MIDI·두 XML·PDF를 확인했다. 두 36박 경로의 실제 MIDI는 독립 검증용 출력과 바이트가 같다. 화면 좌표의 글자 잉크와 볼타 획이 겹치지 않았으며 각 A4 1쪽을 직접 검토했다. 입력·출력 XML 6건은 고정 XSD를 통과했다. 파일 대화상자 응답 어댑터와 음소거한 자체 앱을 사용했고 시각 기준 파일은 갱신하지 않았다. `out/parity-qa/navigation-voltas-production-a/`의 결과·화면·PDF와 검증 로그를 참조한다.
- MuseScore 4.7.5에서 임시 Native 악보 두 건의 MIDI가 정상 종료했다. Fine의 마디 순서는 1→2→3→2→4→5→6→2→4, Coda는 1→2→3→2→4→5→2→4→6이다. Studio와 각 36음의 음높이·시작 박이 일치했고 지속 시간 최대 차이는 1/480박이다. `jump-voltas-standard-musescore-comparison.json`에 MIDI 해시와 이벤트를 남겼다.
- Studio가 만든 **구조 유지 사본**의 MuseScore 변환은 두 건 모두 정상 종료했으나 28음만 출력했다. 펼친 Coda 사본은 36음과 시작 박이 일치했다. 펼친 Fine 사본, 외부 PDF 변환, 외부 점프 후 반복 활성 대조는 SIGABRT에 종료했다. 원래 로그와 `musescore-copies.json`에 실행 실패와 정상 종료의 재생 차이를 기록했다. 구조 유지 교환의 차이는 미해결이다.
- 볼타에 속한 도돌이표의 `after-jump`는 MusicXML 명세의 지원 범위 밖이므로 기존 진단 경로를 유지한다. 복수 점프·중첩 볼타·점프 이전 Coda, 물리 OS 대화상자와 청음은 이 검증에 포함하지 않았다. 직전 전체 7,426건과 Node 5건은 표지 직접 입력까지의 소스이며 볼타 패치 이후 범위는 위의 관련 검사와 실제 출력이다. [MusicXML 도돌이표](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/repeat/)

## MusicXML 사본의 반복 이동 안내

MuseScore 4.7.5의 표준 XML 가져오기에서 텍스트 유형 추론을 끄면 명시적 재생 이동 속성도 처리 경로에서 빠진다. 해당 옵션의 소스 기본값은 꺼짐이며, 이번의 정상 종료 28음과 일치한다. 옵션을 켠 별도 변환과 외부 Native 내부 구조 확인은 비정상 종료해 그 설정의 복구 효과는 확인하지 못했다. `musescore-text-inference*.json`에 원래 결과를 보존했다. [MuseScore 4.7.5 가져오기 코드](https://github.com/musescore/MuseScore/blob/v4.7.5/src/importexport/musicxml/internal/import/importmusicxmlpass2.cpp#L4340) · [기본 설정 코드](https://github.com/musescore/MuseScore/blob/v4.7.5/src/importexport/musicxml/internal/musicxmlconfiguration.cpp#L71)

내보내기 도구의 기본 MusicXML 안내에는 구조와 반복 이동 표지를 유지한다는 점을, 반복 펼치기에는 실제 재생 순서를 마디로 펼친다는 점을 표시한다. 내장 사용설명서의 재생과 믹서 및 파일 장에도 알려진 외부 대조와 원본 보관 방법을 설명한다.

- 기존 생산 빌드에서는 기본 MusicXML 도구의 범위 안내에 이동 표지 정보가 없어 실제 앱 검증이 실패했다. 변경 뒤 960×750 및 1400×750의 실제 버튼과 내장 사용설명서에 새 문구가 표시됐다. Fine과 Coda를 각 너비에서 열어 네 조합의 소유권·내보내기·잉크와 XML XSD를 확인했다.
- 두 폭의 재출력 MIDI와 XML 두 가지는 직전의 바이트와 같으며 PDF 래스터도 각각 같다. 기존 파일 선택·Native 재열기와 재생을 확인했다. 타입 포함 생산 빌드와 속성·파트 사본·설명서 3파일·144검사가 통과했다. `out/parity-qa/navigation-export-hints-{red,green}.log`, `navigation-export-hints-{green,cross}/results.json`에 원래 실패와 결과를 남겼다.

## 같은 번호의 볼타를 구간별로 편집

이전 번호 명령은 같은 보표에 있던 동일 번호의 끝과 시작을 모두 지웠다. 이제 선택한 위치가 속한 괄호에서만 번호를 바꾸거나 같은 번호를 다시 눌러 제거한다. 새 괄호는 다음 독립 반복의 시작을 넘지 않으며 다른 괄호와 겹치면 안내한다. 저장된 회차 목록은 내부 마디에서도 읽을 수 있고 기존 번호 버튼으로 바뀌지 않는다. 마디 우클릭과 반복 설정 모두 같은 명령을 사용한다. [MuseScore 볼타](https://handbook.musescore.org/notation/repeats/voltas)

- 미수정 앱의 실패 4건을 먼저 확인했다. 최종 대조군 6건에서 다른 괄호의 겹침 보호와 보조 파트에서 편집할 때 총보 소유·다른 파트의 음표 보존을 확인했다. 관련 반복·볼타 13파일·103건 및 타입을 포함한 생산 빌드가 통과했다. 실패와 통과의 원래 로그는 `out/parity-qa/volta-edit-scope-{red,focused}.log`에 있다.
- 960×750 dark와 1400×750 light에서 실제 마디 우클릭으로 8마디의 1번 볼타를 추가했다. 기존 2–4마디의 괄호는 남았다. 한 번의 실행 취소와 다시 실행, 프로젝트 저장·재열기, 13→12박의 실제 재생 표시와 12음 MIDI를 확인했다. 실제 두 MusicXML 사본과 입력 XML 6건은 고정 XSD를 통과했다. 두 A4 한 페이지 PDF의 래스터가 일치했고 대표 페이지를 직접 검토했다.
- 실제 출력의 구조 유지와 반복 펼치기 사본을 MuseScore 4.7.5에서 각각 정상 변환했다. 양쪽 12음의 음높이와 시작 박이 Studio와 일치했다. 최대 지속 차이는 1/480박이다. 결과와 실제 앱 산출물은 `out/parity-qa/volta-edit-scope-production-b/`에 있다. 회차 목록의 직접 입력과 이동 지시가 섞인 외부 교환 한계는 별도 항목이다.

## 볼타 재생 회차 직접 편집

반복·볼타 설정에서 기존 괄호 안의 마디를 선택한 뒤 **볼타 회차 편집**을 연다. 시작과 끝이 명확한 단순 반복에서 괄호 범위와 도돌이표 끝의 마디·횟수를 보여준다. 쉼표로 적은 회차를 적용하면 괄호 양끝의 표기와 실제 재생이 함께 바뀐다. 끝 도돌이표 뒤의 괄호는 마지막 회차를 포함한다. 중첩·경계가 모호한 구간과 3회 이상 반복의 단일 두 번째 회차는 기존 계약에 따라 남겨 둔다. [MuseScore 볼타 회차 목록](https://handbook.musescore.org/notation/repeats/voltas#changing-playback-of-voltas)

- 최초 UI 재현 3건이 실패했고, 기존 범위와 함께 App 10건 및 관련 14파일·113건이 통과했다. 범위 밖·중복 값을 검증하고, 미확정 저장·Escape·IME·다른 마디로 이동할 때의 초안을 구분했다. 로그는 `out/parity-qa/volta-pass-editor-{red,green,focused}.log`에 있다.
- 실제 960×750 dark에서는 `2, 1`을 Enter로 적용해 `1, 2`를 저장했다. 실제 1400×750 light에서는 적용 버튼으로 `3`을 입력했다. 960px에서 범위 밖 값을 안내하고 Escape로 되돌리는 경로도 확인했다. 한 번의 undo/redo, Native 재열기, 18음·15음의 MIDI, 두 MusicXML 내보내기와 A4 한 페이지 PDF를 검증했다. 검증은 격리 프로필과 가짜 파일 선택 응답을 사용했다.
- MuseScore 4.7.5의 구조 유지 사본과 내부 재생은 일부 회차에서 차이가 있다. 왼쪽 마디선 순서를 바로잡은 결과도 아래에 기록했다. 이전 생산 빌드의 펼친 두 사본은 SIGABRT여서 외부 재생 검증에 포함하지 않았다. 실패 자료와 산출물은 `out/parity-qa/volta-pass-editor-production-{a,b}/`에 있다.

## MusicXML 시작 마디선의 출력 순서

이전 출력은 `location="left"`인 시작 도돌이표와 볼타 시작을 음표 뒤에 보냈다. 선택적 `print` 뒤, `attributes`와 음악 데이터 전에 왼쪽 마디선을 놓고 오른쪽 마디선은 음악 데이터 뒤에 둔다. 마디선 자식·위치 속성과 파일의 기보 의미는 그대로 보존한다. [MusicXML 마디선 명세](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/barline/)

- 순서 실패를 먼저 재현했고 MusicXML 164파일·2,083검사가 통과했다. 외부 opt-in 1검사는 건너뛰었다. 타입 포함 생산 빌드와 960/1400px 내보내기, 실제 입력과 출력 XSD 6건을 확인했다.
- 두 너비에서 MusicXML 구조 유지 사본의 변경은 왼쪽 마디선 순서뿐이다. MIDI·펼친 XML 바이트와 PDF 래스터가 각각 직전 출력과 일치한다.
- 순서를 수정한 구조 유지 사본 두 건에서 MuseScore 변환은 정상 종료했다. Studio 18음과 15음에 대해 각각 17음과 6음이었다. 이 차이는 마디선 순서 수정과 별개의 재생 증거다. `out/parity-qa/volta-pass-editor-production-b/musescore-order-comparison.json`의 실제 음을 참조한다.

## 시작을 생략한 첫 반복과 두 도돌이표가 한 마디에 있는 경우

첫 도돌이표 끝이 악보 처음으로 돌아가는 경우도 기존 볼타의 회차 편집을 연다. 입력을 적용해도 시작 기호를 추가하지 않는다. 앞 마디에서 기존 번호 프리셋을 적용할 때 시작과 끝이 함께 있는 마디는 이전처럼 끝점으로 사용한다. 시작만 있는 다음 독립 반복에서는 새 괄호가 그 경계를 넘지 않는다.

- 전체 회귀 첫 실행은 6,579개 입력을 고정했고 Vitest 7,445건 통과, 한 건 실패 및 외부 한 건 건너뜀으로 끝났다. 당시 마디 우클릭 검사가 동시 시작·끝 마디의 볼타 끝점이 빠진 상태를 발견했다. 원래 실패와 독립 재현을 보존하고 기존 기대값으로 고쳤다. 최종 관련 3파일·20건, 타입 포함 빌드, 960/1400px 실제 회차·undo/redo·Native 재열기와 XML XSD 6건이 통과했다. 원래 로그와 receipt는 `out/parity-qa/volta-pass-editor-full-stamp/`, 재현은 `volta-double-barline-red.log`, 수정 후 검사는 `volta-scope-final-focused.log`에 있다.
- 시작을 생략한 실제 두 앱 화면에서 각각 18음·15음이 재생됐다. MIDI와 펼친 XML은 시작을 적은 동등한 대조군과 바이트가 같다. PDF는 각각 A4 한 페이지이고 구조 유지 사본은 생략한 시작 상태를 보존한다. MuseScore 네이티브 시작 생략 예제도 18음의 순서가 일치했다. `out/parity-qa/implicit-volta-pass-production/`과 `musescore-implicit-volta-0duxvyde/results.json`에 기록했다.

## MuseScore 볼타 구조의 직접 변환과 저장 후 재읽기

생성한 MuseScore 네이티브 1·2회차/3회차 대조군은 모두 정상 종료했으며 Studio와 18음·15음의 음높이와 시작 박이 일치했다. 6음이던 구조 유지 MusicXML을 .mscz로 변환한 정상 종료 조건에는 9마디와 도돌이표·볼타 끝점이 들어 있었다. 그 파일의 내부 .mscx를 직접 읽어 MIDI로 내보내면 15음이 일치했다. .mscz 자체를 다시 여는 검사는 시간 제한 안에 끝나지 않았다. 직접 변환의 차이가 생기는 내부 단계는 확정하지 않았다.

시간 단위만 1로 바꾼 두 조건과 동일한 attributes를 줄인 18음 조건은 정상 종료해도 각각 기존과 같은 차이를 냈다. 15음의 attributes 대조군은 비정상 종료했다. 검증 자료는 `out/parity-qa/implicit-volta-pass-candidate/pre-apply-handoff.md`의 산출물 목록에 있다.

## 전체 회귀 재실행

직접 회차 편집, 시작 도돌이표를 생략한 첫 반복, 같은 마디의 시작·끝 도돌이표 복원을 포함한 `npm run test:all`이 정상 종료했다. Vitest 787파일·7,447건과 Node-native 5건이 통과했고 외부 opt-in 1건은 건너뛰었다. 1,796.30초 동안 입력 6,579개의 해시가 유지됐고 종료 뒤 독립 검사에서도 일치했다. `out/parity-qa/volta-pass-final-full-stamp/`에 로그와 receipt를 보존했다. 아래 복수 회차 점프 수정 전 결과다.

## 복수 회차 볼타와 D.S. 복귀

명시적인 시작·끝 도돌이표 하나에서 앞 볼타가 마지막 전까지의 회차를 모두 지정하고, 이어지는 볼타가 마지막 회차만 지정하면 D.C.·D.S. 복귀 후 마지막 볼타를 연주한다. Fine 정지 또는 뒤쪽 Coda까지 연결한다. 연주의 마디 순서를 기존 계획에서 가져오며 괄호·원본 프로젝트·기존 명령과 모델을 그대로 사용한다. 일치하지 않는 볼타 구간의 기존 안내도 검증했다.

- 3회 반복의 Fine·Coda 계획과 MusicXML 펼치기에서 기존 실패 3건을 재현했다. 수정 후 관련 18파일·208건과 타입 검사 포함 생산 빌드가 통과했다. `out/parity-qa/jump-volta-pass-list-candidate/three-pass-coda-red.log`와 `out/parity-qa/three-pass-fine-focused.log`에 결과가 있다.
- 960×750 dark와 1400×750 light 격리 앱에서 가져오기, 44박 재생·정지, Native 저장과 재열기, 구조 유지·반복 펼치기 XML, MIDI와 PDF를 확인했다. 두 창에서 세뇨·Fine·D.S. 글자와 볼타의 획 경계가 겹치지 않았다. XSD 검사 6건을 통과했고 각 1쪽 A4 PDF의 렌더 이미지 해시가 일치했다. PDF와 1400px 화면을 직접 검토했다. `out/parity-qa/three-pass-fine-production/`에 산출물과 캡처가 있다. 실제 파일 쓰기와 Electron 메뉴를 사용했고 파일 선택 응답은 검증 adapter를 사용했다.
- 같은 구성의 MuseScore 4.7.5 네이티브 악보와 실제 Studio 반복 펼치기 사본을 각각 정상 변환했다. 44음의 음높이·시작 박이 모두 일치했고 최대 지속 차이는 1/480박이다. Studio 구조 유지 사본 변환은 SIGABRT였다. 복수 회차 Coda의 MuseScore 네이티브 변환은 시간 제한에 걸렸고 시작을 생략한 Fine 대조군은 SIGABRT였다. MuseScore 비교는 정상 종료한 경로에 한정한다. `out/parity-qa/musescore-three-pass-studio-outputs-m_qlabhd/results.json`과 `musescore-jump-with-pass-list-2c4bqoj0/results.json`에 해시와 종료 상태가 있다.
- MusicXML 4.0의 요소 설명은 볼타에 속하지 않는 뒤 도돌이표에 `times`를 사용하도록 제한한다. 고정 XSD는 이 조건을 검사하지 않는다. `times="3"`만 제거하면 Studio와 정상 종료한 MuseScore 모두 28음을 재생하고 최종 볼타가 빠졌다. 기존 구조 사본에서 횟수를 제거하거나 회차 목록만으로 횟수를 추론하는 정책은 이번에 적용하지 않았다. 이 예제의 외부 재생 순서에는 검증한 반복 펼치기 사본을 사용한다. [MusicXML 반복 횟수](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/repeat/) · [MusicXML 볼타 회차](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ending/)
- 변경은 미커밋이다. 전체 회귀는 직전 회차 편집까지이며 이번 계획 변경은 focused·타입·생산 출력으로 검증했다. 겹친 볼타와 중첩 점프, 실제 GUI·청음은 미검증이다. 기준 이미지는 갱신하지 않았다.

## 반복 횟수 밖의 볼타 가져오기 경고

닫힌 단순 도돌이표를 두 번 재생하지만 세 번째 괄호가 있는 파일을 열면, 괄호를 표시하고 재생되지 않는 회차를 안내한다. 기술 정보에 원본 파트·마디·볼타 주소와 건너뛸 회차·반복 횟수를 표시한다. 앞 회차가 유효한 혼합 목록은 해당하는 재생을 계속한다. 끝 도돌이표가 여러 개인 대조군은 회차를 추정하지 않았다.

실패 3건과 대조 1건을 보존했다. 관련 166파일·2,305건과 타입 포함 빌드가 통과했고 외부 opt-in 1건은 건너뛰었다. 960×750 dark/coarse 에뮬레이션과 1400×750 light/fine 격리 앱에서 경고·기술 정보와 4박을 확인했다. 횟수 3이 명시된 대조군은 경고 없이 6박이었다. 수정 전후의 Native 재열기 내용, MIDI, 구조 유지·펼친 XML과 A4 PDF 렌더가 일치했다. 실제 소스·XML 8건은 고정 XSD를 통과했다. 화면과 PDF를 직접 검토했다. `out/parity-qa/volta-unreachable-production/`에 캡처와 비교 해시가 있다.

## MusicXML 단일 2번 볼타와 기존 프로젝트 호환

사용자가 승인한 정책을 경계가 분명한 닫힌 단순 반복에 적용했다. 새 MusicXML의 단일 `2`는 세 번 이상 반복해도 두 번째 회차에서만 연주한다. Native의 명시 회차 목록에 이 표기를 담는다. 기존 프로젝트의 숫자 2와 기존 1·2번 버튼은 종전처럼 두 번째 이후 회차에 연주한다. 그 기존 표기를 구조 유지 XML로 저장하거나 내보낼 때는 예를 들어 `2,3`으로 적으며, 경고 상세에 변환과 실제 회차를 표시한다. 반복 펼치기는 기존 재생 계획을 사용한다. [MusicXML 끝마디 회차](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ending/)

- 3회·4회, 두 마디 괄호의 시작·끝, 뒤의 독립 2회 반복과 실제 사본의 최초 실패 6건을 보존했다. 기존 저장 검사에서 다른 보표에 충돌하는 마디선의 원본 비교를 유지한다. 지원되는 XML 변환만 비교에 반영한다. 관련 197파일·2,309건과 앱의 저장/사본·경고 4건, 타입을 포함한 생산 빌드가 통과했다. 외부 opt-in 1건은 건너뛰었다.
- 960×750 dark와 1400×750 light 격리 앱에서 새 MusicXML과 기존 형식 프로젝트를 열고 각각 5박과 6박을 확인했다. Native 저장·재열기, 구조 유지와 펼친 XML, 기존 프로젝트의 XML 저장·사본과 변환 안내, MIDI·PDF를 확인했다. MIDI의 음높이·시작·지속은 각각 다섯 음과 여섯 음을 확인했다. 각 1쪽 A4 PDF 네 개의 렌더 해시가 일치했다. 실제 소스·XML 12건은 고정 XSD를 통과했다. `out/parity-qa/exact-second-volta-production/`에 캡처·로그·파일 해시가 있다. 실제 파일 작업과 Electron 메뉴를 사용했고 파일 선택 응답은 adapter를 사용했다.
- MuseScore 4.7.5 CLI에서 두 구조 유지 XML은 정상 종료했지만 두 경우 모두 1음만 출력했다. 기존 프로젝트를 펼친 XML은 6음의 음높이와 시작이 같고 최대 지속 차이가 1/480박이었다. 새 XML을 펼친 대조군은 제한 시간에 종료하지 않았다. `out/parity-qa/musescore-exact-second-volta-af7uk528/results.json`에 각 결과가 있다.
- 기존 프로젝트를 열 때의 Native 숫자 인코딩과 프로젝트 형식 번호는 유지했다. 이전 빌드의 Native 검사는 단일 회차 배열 `[2]`를 거부하므로 새 정확 회차를 담아 저장한 프로젝트는 이 변경이 적용된 앱에서 열어야 한다. 세 번 이상 반복에서 정확한 2만 지정하는 직접 입력과 복잡하거나 열린 괄호의 소유권은 별개다. 실제 OS 대화상자·청음·외부 GUI와 시각 baseline 갱신은 이번 범위에 포함되지 않았다.

## 단일 2번 볼타의 누적 전체 검사

위 단일 2번 볼타 적용까지 고정한 `npm run test:all`은 Vitest 787파일·7,461건과 Node-native 5건을 통과했다. 외부 opt-in 1건은 건너뛰었다. 2,062.08초 뒤 종료 코드는 0이었고 고정 입력 6,579개의 해시가 독립 검사에서도 일치했다. 아래 한 마디 괄호와 편집 안내를 반영하기 전 결과다. `out/parity-qa/exact-second-final-full-stamp/`에 로그·receipt를 보존했다.

같은 구성을 MuseScore의 네이티브 형식으로 만들어 정상 종료한 단일 2번 대조군에서도 1음만 나왔다. 기존 2번을 복수 회차로 작성한 외부 네이티브 대조군은 SIGABRT였다. 첫 회차에 해당하지 않는 볼타를 건너뛸 때 그 안의 반복 종료도 지나칠 수 있다는 해석은 소스에서 추론한 내용이다. 실제 비교에서는 XML 가져오기와 독립된 차이까지 확인했다. [MuseScore 4.7.5 재생 순서](https://github.com/musescore/MuseScore/blob/v4.7.5/src/engraving/dom/repeatlist.cpp#L850-L875)

## 끝 표시 없이 한 마디에 붙인 2번 볼타

기존 마디 우클릭의 2번 볼타는 뒤쪽에 새 반복 끝이 없으면 선택한 한 마디에 시작만 저장한다. 이 조건에서도 해당 도돌이표의 회차를 사용한다. 새 XML은 두 번째 회차에만 연주하고, 기존 프로젝트의 시작만 있는 표기는 기존 재생을 유지하도록 구조 유지 XML의 시작 회차 목록만 바꾼다. 편집 패널의 같은 2번 표기에서 현재의 실제 재생 범위를 읽을 수 있다.

- 격리 실패 3건에서 누락을 확인했다. 관련 4파일·57건과 타입 검사를 통과한 뒤 적용했다. 반영 후 5파일·60건, 타입 포함 생산 빌드가 통과했다. 별도 검증에서 반복 횟수 2–8과 괄호 위치·범위 112조합의 기존 프로젝트·XML MIDI 동등성, 원본 내용과 경고 범위를 확인했다.
- 960×750 dark와 1400×750 light에서 실제 우클릭과 한 번의 실행 취소·다시 실행, 두 조건의 반복 설정 안내, 프로젝트 저장·재열기, MusicXML 저장과 구조 유지·펼친 사본, MIDI·PDF를 확인했다. MIDI 음높이·시작·지속은 새 XML 4음과 기존 설정 5음이었다. 14개 입력·출력 XML이 고정 XSD를 통과했고 A4 한 쪽 PDF 네 개의 렌더 해시가 일치했다. 화면과 PDF를 직접 검토했다. `out/parity-qa/start-only-second-volta-production/`에 로그·캡처·파일 해시가 있다.
- 같은 시작 도돌이표에 서로 다른 볼타의 끝 도돌이표가 두 개 붙은 별도 XSD 예제는 Studio에서 1–2–1–3–3의 음과 다섯 번째 마디의 쉼표를 내며 3회차 괄호를 건너뛴다. 이 조건의 MuseScore Native와 XML CLI는 모두 시간 제한에 걸렸다. 여러 끝의 회차 결정과 가져오기 안내는 후속 범위다. [MuseScore 볼타 사례](https://handbook.musescore.org/notation/repeats/voltas)
- 위 누적 전체 검사 이후의 마지막 변경은 이 한 마디 괄호와 안내다. 문서 verifier, 타입·관련 회귀·생산 앱 및 출력으로 확인했다. 변경은 미커밋이다.

## 한 시작을 공유하는 여러 끝 도돌이표의 재생

하나의 명시적 시작 뒤에 각자의 끝 도돌이표를 가진 연속된 볼타가 있고, 끝 도돌이표 없는 마지막 볼타까지 모든 회차를 정확히 하나씩 나누면 각 회차에 공통 시작으로 돌아간다. 재생·MIDI·MusicXML 반복 펼치기에 같은 순서를 적용한다. 가져온 단일 2는 이 범위에서도 정확히 두 번째 회차다. [MuseScore 볼타와 회차 목록](https://handbook.musescore.org/notation/repeats/voltas)

- 이전의 두 CLI 시간 초과 뒤, 새 임시 설정과 일괄 변환으로 같은 입력을 정상 변환했다. MuseScore 4.7.5의 Native와 MusicXML 모두 마디 1–2–1–3–1–4의 6음이었다. 각 끝의 반복 횟수가 4·3이고 회차가 1·3·4 / 2·5 / 6으로 나뉜 대조군도 두 변환 모두 12음이었으며 Studio의 재생 계획과 음 순서가 일치했다. 이전의 Studio 5음과 누락된 마지막 볼타를 실패 검사로 남겼다. 로그와 해시는 `out/parity-qa/multi-ending-batch-home-jco67t1_/results.json`과 `multi-ending-case-study-7tn9d022/results.json`에 있다.
- Native의 기존 숫자 2번을 읽을 때는 종전 순서를 유지한다. 이 예제의 구조 유지 사본은 같은 악보를 다시 열 때 재생이 달라지므로 기존 저장 검사가 거부한다. 해당 마디와 반복 펼치기 사본을 안내한다. Native 재열기와 반복 펼치기 사본은 기존 5음을 보존했다.
- 실패 2건과 기존 프로젝트 1건 대조, 저장 안내 실패 1건을 보존했다. 관련 178파일·2,248건, 저장 및 가져오기 안내 4건과 타입을 포함한 생산 빌드가 통과했다. 외부 opt-in 1건은 건너뛰었다. 960×750 dark와 1400×750 light에서 MusicXML 가져오기, Native 저장·재열기, 구조 유지·펼치기·MIDI·PDF 및 구조 유지 사본 거부를 확인했다. XSD 8건을 통과했고 A4 PDF 네 개의 렌더가 일치했다. 두 출력 형식과 한국어 안내를 직접 검토했다. `out/parity-qa/alternate-ending-production/`에 캡처와 로그가 있다.
- 실제 Studio의 구조 유지·펼치기 사본을 각각 새 임시 프로필로 MuseScore에서 정상 변환했다. 6음의 음높이와 시작 박이 같고 최대 지속 차이는 1/480박이었다. 선행 일괄 변환은 MIDI를 쓴 뒤 SIGABRT로 종료했다. `out/parity-qa/multi-ending-serve-one-job-67wmy9zu/results.json`에 정상 변환이 있고 `multi-ending-production-cross-app-5yr8sy19/results.json`에 비정상 종료를 보존했다.
- 중첩 도돌이표나 회차가 모호한 대체 구간, 여러 끝과 D.C.·D.S.가 결합된 경우는 후속 범위다. 직전 전체 회귀 7,461건은 이 변경 전이다. 현재 변경은 미커밋이다.

## 회차가 겹치거나 빠진 여러 끝 도돌이표의 가져오기 안내

같은 시작에서 이어지는 둘 이상의 닫힌 볼타에 각각 끝 도돌이표가 있지만 회차가 겹치거나 마지막 회차를 확정할 수 없으면 가져오기 때 안내한다. 마지막 끝 도돌이표의 원본 마디·마디선 주소를 기술 정보에서 볼 수 있다. 가져온 볼타와 마디선, 기존 재생과 저장을 유지한다. 명시적으로 따로 시작한 도돌이표는 각각 적용한다. 여러 마디인 대체 볼타의 양끝과 안쪽 마디도 같은 회차로 연주하는 대조를 추가했다.

- 경고 누락 2건과 독립 시작 대조를 실패 전 검사로 보존했다. 이후 관련 178파일·2,251건, 앱의 저장·가져오기 4건, 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건은 건너뛰었다.
- 960×750 dark와 1400×750 light에서 회차가 겹친 실제 입력을 바뀌기 전후로 열어 안내와 원본 주소를 확인했다. Native 재열기, 구조 유지·펼치기 XML, MIDI 및 A4 PDF 렌더 해시가 일치했다. 지원되는 대조의 XML·MIDI 5종도 각 너비에서 바이트가 일치했다. 현재 실제 XML 14건이 고정 XSD를 통과했다. 캡처와 검증은 `out/parity-qa/alternate-overlap-after/`와 `alternate-ending-after-warning-control/`에 있다.

## 여러 끝 도돌이표와 D.S. al Fine

명시적 시작을 공유하고 각 볼타의 회차를 확정할 수 있는 한 반복에서, 점프 뒤 마지막 회차만 연주하는 경우도 지원한다. 재생 계획에서 이미 계산한 마지막 회차를 사용한다. 돌아왔을 때 건너뛰는 괄호의 Fine과 반복·볼타가 여러 독립 구간에 걸친 경우는 기존의 지원 불가 조건을 유지한다.

- 여러 끝 도돌이표에 D.S. al Fine을 붙인 생성 MuseScore Native와 점프 없는 대조가 임시 설정의 일괄 변환에서 정상 종료했다. D.S. 예제는 6음, 한 박의 쉼, 이어 돌아온 첫음과 마지막 볼타의 음을 연주했다. 두 Studio 출력은 8음의 음높이·시작 박이 같았고 최대 지속 차이는 1/480박이었다. Native 대조 기록은 `out/parity-qa/multi-ending-jump-fine-6jtrd6o9/results.json`에 있다.
- 실패 1건과 건너뛰는 Fine 대조 1건을 보존했다. 관련 누적 181파일·2,285건과 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건은 건너뛰었다. 960×750 dark와 1400×750 light에서 입력·음소거 재생 시작과 정지·9박·Native 저장 및 재열기·두 XML·MIDI·PDF를 확인했다. XSD 6건을 통과했고 A4 PDF의 래스터가 일치했다. `out/parity-qa/alternate-ending-fine-production/`에 화면, 출력 및 음 비교가 있다.
- MuseScore에서 실제 Studio의 펼친 사본은 8음을 동일 순서로 정상 변환했다. 구조 유지 사본의 변환도 정상 종료했으나 복귀를 생략해 6음을 연주했다. `out/parity-qa/multi-ending-fine-cross-app-afdtseff/results.json`에 결과를 보존했다. 여러 끝과 Coda의 실제 외부 내보내기와 더 복잡한 재생 이동은 후속 범위다.

## 여러 끝 도돌이표와 D.S. al Coda

회차가 분명한 세 볼타에서 마지막 괄호의 To Coda를 지나도록 만든 대조군을 검증했다. Studio는 첫 순서에서 6음을 연주하고 한 박을 쉰 뒤, 세뇨로 돌아가 마지막 볼타를 거쳐 코다에서 끝낸다. 재생 계획과 기존 프로젝트 형식은 그대로다. [MuseScore 점프와 표지](https://handbook.musescore.org/notation/repeats/jumps-and-markers.md)

- 관련 3파일·54건 및 타입 포함 생산 빌드가 통과했다. 최초 검사에서는 코다 도착 항목의 내부 반복 회차를 1로 가정해 실패했다. 마지막 회차인 3을 유지하는 기존 계획을 확인하고 마디 순서와 두 점프의 박을 고정했다. 제품 코드 수정은 없다. 최초 및 최종 로그는 `out/parity-qa/alternative-ending-coda-focused{,-first}.log`에 있다.
- 960×750 dark 및 1400×750 light의 격리 Electron에서 경고 없는 가져오기, 세 볼타·네 이동 표지, 음소거 시작과 정지, 10박, Native 저장·재열기, 구조 유지·펼친 XML·MIDI·PDF를 확인했다. 두 앱 폭의 MIDI에서 음높이·시작 박·지속이 같았다. 고정 XSD 6건을 통과했고 A4 한 쪽 PDF의 래스터가 일치했다. PDF와 화면을 검토했다. 메뉴는 위치와 가시성을 확인하고 DOM으로 활성화했으며 파일 선택은 응답 adapter를 사용했다. `out/parity-qa/alternate-ending-coda-production/`에 결과와 해시가 있다.
- MuseScore 4.7.5의 생성 네이티브 악보와 Studio의 실제 반복 펼치기 사본은 정상 종료한 변환에서 9음의 음높이와 시작 박이 일치했다. 최대 지속 차이는 1/480박이었다. 구조 유지 사본은 정상 종료했으나 복귀를 건너뛰어 7음이었다. 첫 동시 변환에서 펼친 사본은 SIGABRT였으며, 별도의 일괄 변환 한 건이 정상 종료했다. `out/parity-qa/multi-ending-coda-native-c9ovgezf/results.json`, `multi-ending-coda-cross-app-1kfdswa0/results.json`, `multi-ending-coda-expanded-serial-8k7sm6li/results.json`에 기록이 있다.
- 외부 GUI, 실제 OS 대화상자, 청음은 미검증이다. 이번 검증의 전체 suite 재실행과 시각 baseline 변경은 없었다.

## 앞쪽 독립 도돌이표와 D.S. 복귀

명시적 시작과 끝이 있는 일반 반복 하나 뒤에 공통 시작을 공유하는 여러 볼타가 있고, 점프 뒤 반복 여부를 기본값으로 둔 범위를 지원한다. 첫 연주에서는 두 구간을 표기대로 재생한다. 세뇨로 돌아오면 앞쪽의 일반 반복을 한 번 지나고 다음 반복의 마지막 볼타를 연주한다. 세뇨가 뒤쪽 구간에 있으면 거기서 바로 시작한다. 기존 재생 계획에서 해당 회차를 선택하며 프로젝트 형식과 MusicXML 마디선을 유지한다. [MuseScore 점프와 표지](https://handbook.musescore.org/notation/repeats/jumps-and-markers.md)

- 고정 XSD를 통과한 생성 악보에서 기존 11박과 누락 경고를 재현했다. 분리된 두 세뇨 위치의 최초 실패 2건과 명시적 `after-jump="yes"` 대조를 보존했다. 같은 입력의 기존 생산 앱은 재생 막대에서 11박, 변경 후에는 15박을 표시했다. 관련 3파일·57건과 타입 포함 생산 빌드가 통과했다. `out/parity-qa/alternative-ending-prior-repeat-valid-red.log`, `alternative-ending-prior-repeat-production-red.log`, `alternative-ending-prior-repeat-focused.log`에 결과가 있다.
- 960×750 dark와 1400×750 light에서 경고 없는 가져오기, 세 볼타와 Fine·세뇨·D.S.의 실제 화면, 음소거 재생·정지, Native 저장·재열기, 두 XML·MIDI·PDF를 확인했다. 고정 XSD 6건을 통과했고 각 A4 한 쪽 PDF의 래스터 해시가 일치했다. 실제 화면과 PDF를 검토했다. 메뉴 가시성·좌표를 검사한 뒤 DOM 활성화를 사용했고 파일 선택 응답은 adapter로 공급했다. 결과와 해시는 `out/parity-qa/alternate-ending-prior-repeat-production/`에 있다.
- Studio 두 화면의 MIDI는 0–9박에 10음, 10박에 쉼, 11–14박에 4음이다. 정상 종료한 MuseScore 4.7.5 네이티브 변환과 실제 펼친 사본의 14음은 음높이와 시작 박이 같았으며 최대 지속 차이는 1/480박이었다. MuseScore의 구조 유지 사본은 SIGABRT였으므로 외부 재생 비교에서 제외했다. `out/parity-qa/separated-repeat-alternative-fine-native-92bjt736/results.json`과 `separated-repeat-alternative-fine-xml-5n_qg74k/results.json`에 기록이 있다.
- 뒤쪽에 또 다른 반복이 있거나, 앞쪽 반복이 중첩되거나, 점프 뒤 반복을 명시한 구성은 기존 지원 범위를 유지한다. 외부 GUI·청음·물리 파일 대화상자는 미검증이다. 시각 기준을 갱신하지 않았다.

## 여러 끝 도돌이표의 누적 전체 검사

여러 끝의 회차, 모호한 구조 안내, Fine·Coda와 앞쪽 일반 반복을 포함해 `npm run test:all`이 종료 코드 0으로 끝났다. Vitest 787파일·7,477건과 Node-native 5건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. 2,026.84초 동안 고정한 입력 6,579개의 해시가 유지됐으며 독립 검사에서도 일치했다. `out/parity-qa/alternative-ending-cumulative-full-stamp/`에 로그, 고정 입력과 receipt를 보존했다.

별도 관련 검사에서는 2,925건이 통과했으나 이동 표지 편집 1건이 15초 제한에 걸렸다. 동일 조건의 단독 대상 재실행은 1건이 통과했고 전체 검사도 통과했다. 원래 로그와 동일 제한 시간 및 기대값을 보존했다. `out/parity-qa/alternative-ending-prior-repeat-regression.log`와 `alternative-ending-navigation-authoring-isolated.log`에 결과가 있다.

## 앞쪽 일반 도돌이표의 명시적 점프 뒤 반복 생략

앞쪽의 일반 끝 도돌이표 하나에 `after-jump="no"`가 있어도 D.S. 복귀를 읽는다. 그 구간은 기본값과 같이 한 번 지나고, 뒤쪽 여러 끝의 마지막 볼타를 연주한다. Native와 구조 유지 MusicXML에는 명시값을 저장한다. 명시값이 있는 볼타 끝 및 `after-jump="yes"` 결합은 기존의 경고와 지원 범위를 유지한다. [MusicXML repeat](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/repeat/)

- 단일 차이로 기존 가져오기 실패를 재현했다. 관련 3파일·58건과 누적 관련 220파일·2,706건, 타입 포함 생산 빌드가 통과했다. 외부 opt-in 한 건을 건너뛰었다. `out/parity-qa/alternative-ending-explicit-prior-no-{red,focused,regression,build}.log`에 있다. 전체 7,477건은 이 한정 수정 전 결과다.
- 960×750 dark와 1400×750 light에서 경고 없는 15박, 실제 화면, 음소거 재생·정지, Native 저장·재열기, 두 XML·MIDI·PDF를 확인했다. 고정 XSD 6건이 통과했고 파일 선택 응답은 adapter를 사용했다. 기본값 대조와 비교해 Native 및 구조 유지 XML의 차이는 명시값뿐이다. 펼친 XML과 14음 MIDI는 바이트가 같으며 PDF의 래스터도 일치했다. 화면을 직접 검토했다. `out/parity-qa/alternate-ending-explicit-prior-no-production/comparison.json`에 해시가 있다.
- 펼친 사본이 바이트까지 일치해 위 MuseScore 4.7.5의 14음 비교를 재사용했다. 새 구조 유지 사본의 외부 CLI·GUI·청음은 미실행이다. 기준 이미지는 갱신하지 않았다.

## 앞쪽 일반 도돌이표의 점프 뒤 재실행

볼타와 떨어진 앞쪽 일반 끝 도돌이표의 `after-jump="yes"`를 읽는다. D.S. 복귀가 앞쪽 반복을 지나면 해당 반복을 다시 수행하고 뒤쪽 볼타에서는 마지막 회차를 연주한다. 세뇨가 뒤쪽에 있으면 앞의 반복은 재생하지 않는다. 플래그는 Native와 구조 유지 MusicXML에 저장된다. 볼타 안에 플래그가 붙은 대조군의 경고를 확인했다. [MusicXML repeat](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/repeat/)

- 가져오기 실패 2건과 수정 전 Electron의 11박을 보존했다. 수정 후 관련 220파일·2,708건과 타입 포함 생산 빌드가 통과했다. 960×750 dark와 1400×750 light에서 17박·16음, 음소거 시작·정지, Native 저장·재열기, 구조 유지·펼친 XML·MIDI·PDF를 확인했다. 고정 XSD 6건이 통과했고 PDF 래스터는 `no` 대조와 동일했다. 실제 화면과 PDF를 검토했다. 메뉴는 가시성과 위치를 확인한 뒤 DOM으로 활성화했고 파일 선택 응답은 adapter를 사용했다. `out/parity-qa/alternate-ending-explicit-prior-yes-production/`에 화면·출력·해시가 있다.
- MuseScore 4.7.5에서는 전체 반복을 다시 수행한 네이티브 대조군이 20음을 연주했다. 원본 XML과 Studio 구조 유지 사본은 점프가 빠져 10음이었다. Studio의 펼친 사본은 Qt 임시 경로를 소유 프로세스에 분리한 정상 종료 변환에서 16음의 음높이와 시작 박이 일치했다. 최대 지속 차이는 1/480박이다. 초기 SIGABRT 및 네이티브를 거치는 경로의 실패와 함께 기록했다. `out/parity-qa/after-jump-yes-reference-f8azdzad/results.json`, `after-jump-yes-studio-export-1m7fn4y4/results.json`, `repeat-with-private-qt-tmp-1flerura/results.json`에 각 결과가 있다. [MuseScore 점프 속성](https://handbook.musescore.org/notation/repeats/jumps-and-markers.md#jump-properties)

## 독립된 여러 일반 도돌이표의 점프 뒤 재생

뒤쪽 여러 볼타에 앞서 끝이 확정된 각 일반 반복은 자체 플래그를 따른다. `yes` 구간은 다시 반복하며 `no`와 생략 구간은 한 번 지난다. 두 경계를 공유하는 시작·끝 및 중첩의 기존 경고도 유지한다.

- 설정을 바꾼 두 대조군과 반복 구간 안의 세뇨에서 기존 누락 3건을 재현했다. 중첩 대조에서는 가져오기 경고를 확인했다. 수정 후 focused 64건과 관련 220파일·2,712건, 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건을 건너뛰었다. `out/parity-qa/alternative-ending-multiple-prior-repeats-{red,focused,regression,build}.log`에 결과가 있다.
- 격리 앱 960/1400px에서 29박·28음, 1400px의 반복 구간 안 세뇨 대조는 26박·25음을 확인했다. Native 저장·재열기, 두 XML·MIDI·PDF, 고정 XSD 9건을 확인했다. 같은 입력의 두 PDF 래스터가 일치했다. PDF와 표지를 검토했다. 각 재생 순서·파일 해시는 `out/parity-qa/alternate-ending-multiple-prior-repeats-production/`에 있다.
- 펼친 사본에서 MuseScore 네이티브를 거쳐 정상 완료한 안쪽 세뇨 대조의 25음은 음높이와 시작 박이 일치했다. 최대 지속 차이는 1/480박이다. 다른 28음 사례는 외부 가져오기 단계까지만 정상 종료했고 MIDI 변환은 SIGABRT였다. `out/parity-qa/after-jump-expanded-via-native-t0_iak93/results.json`과 `multi-repeat-inside-native-private-f1ermy63/results.json`에 종료 상태와 해시가 있다.

## 네이티브 악보로 검증한 꾸밈음 발음

120 BPM, 4/4, 생성한 단일 바이올린 보표에서 MuseScore 4.7.5 네이티브 입력 4건의 WAV·MIDI·MusicXML 출력이 모두 정상 종료했다. 사선 있는 첫째·둘째 박과 사선 없는 둘째 박에서 WAV의 꾸밈음 음높이 B♭5와 이어지는 본음을 주파수로 확인했다. 둘째 박 사선의 본음은 대조보다 약 31ms 늦고 사선 없는 경우는 약 250ms 늦다. WAV 주파수 창과 악기 잔향 때문에 발음 길이를 표본 단위로 확정하지 않는다. MIDI에서는 사선 첫 박 꾸밈음의 길이가 0이고, 사선 둘째 박은 본음보다 반 박 앞에 기록된다. 사선 없는 둘째 박의 본음은 1.5박에 시작한다. WAV와 MIDI 결과를 각각 기록했다.

`out/parity-qa/native-grace-musescore-zt7vhpnm/results.json`과 `wave-spectrum.json`에 파일 해시·주파수 측정이 있다. Studio에서 기존 프로젝트에 발음을 적용하는 기준은 [첫 발음 범위 제안](grace-playback-proposal.md)에 기록했다. [MuseScore 4.7.5 발음 소스](https://raw.githubusercontent.com/musescore/MuseScore/v4.7.5/src/engraving/playback/renderers/gracechordcontext.cpp) · [MuseScore MIDI 차이 보고](https://github.com/musescore/MuseScore/issues/22669)

## MusicXML 제자리표와 실음 대조

B♭ 클라리넷의 기보용 C장조와 실음용 B♭장조를 각각 생성했다. 전자는 C4·F♯4·B♭4·B♮4이며, 후자는 B♭3·E♮4·A♭4·A♮4다. 정상 종료한 MuseScore 4.7.5 PDF에서 두 입력의 조표와 임시표를 확인했다. 두 MIDI 모두 0–3박에 58·64·68·69를 발음한다. 보기 전환의 후속 설계는 [실음 보기 최소 범위](concert-display-proposal.md)에 기록했다.

- Studio는 명시적 제자리표가 있고 pitch alter가 빠지면 기보용에서 마지막 음을 68로, 실음용에서 둘째·마지막 음을 63·68로 낮췄다. 일반 음표와 화음·꾸밈음의 공통 가져오기에서 명시적 제자리표를 0으로 저장한다. 원본 pitch alter가 있으면 그 값을 사용하며, 별도의 임시표 외형 손실 안내와 레거시 Native 읽기는 그대로다. 제자리표가 없는 alter 생략의 의미는 이번 회귀에 포함하지 않았다. [MusicXML pitch](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/pitch/) · [MusicXML accidental](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/accidental/)
- 기존 실패 2건, 이전 앱의 Natural 값 누락을 보존했다. focused 79건과 관련 220파일·2,714건, 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건을 건너뛰었다. 960/1400px의 기보·실음 입력 4건에서 Native 저장·재열기, 실제 제자리표 위치, XML·MIDI·PDF와 고정 XSD 8건을 확인했다. 한 쪽 PDF의 같은 입력 래스터는 각 너비에서 같았고 기보와 실음용은 각각의 조표를 사용했다.
- Studio의 네 MIDI와 두 MuseScore 파일은 모두 음높이 58·64·68·69와 시작 박 0–3이 일치하고 최대 지속 차이는 1/480박이다. Studio 산출물은 `out/parity-qa/explicit-natural-import-production/`에 있다. MuseScore 기보 악보는 `concert-display-private-tmp-2jh7uf3i/results.json`의 정상 종료 기록을 사용했다. 첫 기보 변환의 SIGABRT와 정상 종료한 실음 변환은 `concert-display-musescore-bp6fkuz0/results.json`에 있다.
- 새 실음 보기나 실제 연주 청음, 외부 GUI, OS 파일 선택기의 수동 검수는 수행하지 않았다. 시각 기준 이미지는 그대로다. 격리 앱의 파일 선택은 응답 adapter를 사용했다.

## 반복 설정과 제자리표의 누적 전체 검사

명시적 반복 `no`·`yes`, 여러 독립 반복 및 MusicXML 제자리표를 포함한 `npm run test:all`이 종료 코드 0으로 끝났다. Vitest 787파일·7,486건과 Node-native 5건이 통과했다. 외부 opt-in 1파일·1건을 건너뛰었다. 1,819.93초 동안 고정한 입력 6,580개의 해시가 유지됐고 종료 후 독립 검사에서 같은 값을 확인했다. 로그와 receipt는 `out/parity-qa/explicit-natural-and-repeat-full-stamp/`에 있다.

꾸밈음의 MuseScore 네이티브 대조군에서 생성한 MusicXML 4건도 고정 XSD를 통과했다. 현재 Studio 구현은 기존 꾸밈음의 내부·MIDI 발음과 실음 보기 전환 정책을 변경하지 않는다. 마디 경계를 포함한 기존 구간 복사와 파트보 PDF 묶음 쉼표의 단위 검사는 이 전체 회귀에 포함돼 있다.

## MusicXML에서 alter를 생략한 음

G장조의 F와 앞서 A♭을 기보한 마디의 A에서 `<alter>`와 `<accidental>`을 모두 생략한 입력을 만들었다. 명시적 0, 제자리표, 조표와 앞 음의 영향을 받지 않는 C를 같은 악보에서 대조했다. 수정 전 Studio의 해당 두 음은 MIDI 66·68, MuseScore 4.7.5는 65·69였다. 가져오기에서는 MusicXML의 제자리 음높이를 보존하기 위해 Studio의 조표·이전 임시표가 음높이를 바꾸는 경우에만 명시적 0으로 저장한다. 화음과 앞꾸밈음에도 같은 원칙을 적용한다. 기존 Native 악보와 직접 입력의 자동 임시표 상속은 계속 적용한다. [MusicXML pitch](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/pitch/) · [MusicXML alter](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/alter/)

focused 실패 3건과 수정 전 Electron에서 재현했다. 수정 후 focused 4파일·125건, 관련 220파일·2,717건, 외부 opt-in 1건 건너뜀 및 타입 포함 생산 빌드가 확인됐다. 첫 화면의 실제 제자리표 두 개, Native 재열기, MusicXML·MIDI·PDF를 960×750 dark와 1400×750 light에서 검사했다. 기존 Native의 암시적 F♯ 꾸밈음은 원본을 보존하고 XML에서 F♯로 출력했다. 고정 XSD로 두 폭의 XML 입력·출력과 MuseScore 재출력을 확인했다. Studio의 PDF 한 페이지 래스터는 두 폭에서 일치했다. 두 앱의 정상 MIDI에서 12음의 음높이와 시작 박이 일치했으며 지속 차이는 최대 1/480박이었다. Studio XML을 MuseScore에서 변환한 첫 묶음 실행은 SIGABRT였고, MIDI만 요청한 별도 임시 실행은 정상 종료했다. 편집용 제자리표의 모양은 별도 문제다.

`out/parity-qa/omitted-alter-production/`의 `results.json`, `midi-comparison.json`, 캡처 및 PDF와 `omitted-alter-focused-red.log`, `omitted-alter-production-red.log`, `omitted-alter-regression.log`에 증거를 남겼다. 파일 대화상자는 응답 어댑터를 사용했다.

## 실음 보기와 꾸밈음의 수용 기준

클라리넷 한 파트의 시험용 표시 변환에서 음표 ID와 E♮·A♭·A♮ 표기를 실음 대조군과 맞췄다. 기존 모델·Native 점수 본문·XML·MIDI는 같았다. 단일 꾸밈음이 붙은 두 마디 반복의 현재 타임라인은 0·1·2·3박에서 본음 72·67·72·67만 시작한다. 사선/비사선 발음의 후보 시작·끝을 수치로 기록했다. 두 항목의 수용 기준과 제품 결정은 [실음 보기](concert-display-proposal.md)와 [꾸밈음 발음](grace-playback-proposal.md)에 있다.

## 겹치는 마디 붙여넣기의 꾸밈음

같은 보표·성부에서 1–2마디를 복사해 2–3마디에 붙여넣었다. G–C–G장조의 Native 시료에서 첫째와 둘째 마디의 암시적 F 꾸밈음은 각각 F♯와 F였다. 수정 전 제품은 두 음의 임시표를 대상 조표에서 다시 읽어 결과를 뒤집었다. 본음과 화음에 사용하던 복사 시점의 임시표 계산을 꾸밈음에도 적용했다.

focused와 수정 전 960px Electron에서 같은 차이를 재현했다. 수정 후 960×750 dark의 시작 이벤트 및 1400×750 light의 대상 범위 붙여넣기에서 포인터 선택과 편집 메뉴를 사용했다. 원본의 첫 마디와 대상 마디 ID, 새 이벤트 ID, 한 번의 undo/redo와 Native 재열기를 확인했다. 고정 MusicXML XSD 두 파일에서 꾸밈음은 F♯·F♯·F로 출력됐다. MIDI는 기존 발음 정책에 따라 본음 60·60·62를 0·4·8박에서 각각 4박 재생했다. A4 1페이지 PDF 두 개의 래스터가 일치했다. 960px의 메뉴 복귀 직후에는 제목 영역이 보였고, 악보로 이동 버튼으로 선택과 키보드 포커스를 되찾은 뒤 두 폭의 화면과 PDF에서 임시표를 직접 확인했다.

`out/parity-qa/overlap-grace-focused-red.log`, `overlap-grace-production-red-a.log`, `overlap-grace-build.log`, `overlap-grace-production/`, `overlap-grace-score-return-a/`에 로그·캡처·출력 해시가 있다. OS 파일 대화상자는 어댑터를 사용했고 꾸밈음 발음 지원이나 다중 보표 복사로 범위를 확장하지 않았다.

## 음높이 및 겹침 붙여넣기의 누적 검사

관련 4파일·262건, 타입 포함 생산 빌드, 전체 `npm run test:all`이 통과했다. Vitest는 787파일·7,490건 통과와 외부 opt-in 1파일·1건 건너뜀, Node-native는 5건 통과다. 전체 명령은 1,867.76초에 종료 코드 0으로 마쳤다. `out/parity-qa/pitch-context-full-stamp/`의 원래 종료 기록과 독립 확인 모두 고정 입력 6,580개에서 변경이 없었다. 화면과 PDF의 기준 이미지를 갱신하지 않았다.

실음 보기의 입력 허용 범위·PDF 모드와 꾸밈음의 기존 프로젝트 발음 기본값은 결정 대기다. 수동 페이지 나누기와 묶음 쉼표는 앞서 다중 보표의 실제 두 폭·두 페이지 PDF에서 검증해 이 누적 검사에서 새로운 구현으로 집계하지 않았다.

## 조표 편집에서 꾸밈음의 음높이 보존

기존 Native 악보에서 G장조의 F♯ 꾸밈음은 조표를 상속한다. 첫 마디부터 C장조로 바꾸면 본음과 화음은 음높이를 유지했지만 꾸밈음은 F로 바뀌었다. 조표 변경의 기존 음높이 계산을 꾸밈음에 적용했다. 이전 조표나 같은 성부의 앞 음에서 상속한 값을 유지하려면 임시표를 붙인다. 명시적 임시표·사선과 같은 문맥의 자동 임시표는 유지한다. 꾸밈음의 임시표가 뒤 음의 임시표 상속을 바꾸지 않는 기존 계약도 유지한다.

focused 실패 1건과 이전 격리 앱의 실제 실패를 보존했다. 기존 대조 사례에는 F♮이 새 조표를 따라 바뀌지 않는지와 앞 음의 E♭ 상속을 함께 검사하도록 추가했다. XML에서 사선 없음은 생략될 수 있어 다시 읽은 표시 의미를 비교했다. 편집·음높이 관련 60파일·719건과 타입 검사 포함 생산 빌드 통과. 이 작은 수정은 앞서 전체 통과한 7,490건 이후다.

960×750 dark와 1400×750 light에서 음표를 포인터로 선택하고 형식 메뉴의 악보 설정에서 C장조로 바꿨다. 선택 복귀, 한 번의 수정 및 undo/redo, Native 저장·재열기, 실제 MusicXML·MIDI·PDF를 확인했다. 첫 마디 F♯와 두 번째 마디 F가 화면과 PDF에 보였다. 두 A4 한 페이지 PDF의 래스터 해시는 일치했다. MIDI는 현재 정책대로 본음 60·62만 0·4박에 출력한다. 실제 XML 두 건과 정상 종료한 MuseScore 4.7.5 재출력은 고정 XSD를 통과했다. MuseScore PDF와 재출력도 같은 F♯·F를 표기했다. MuseScore MIDI의 첫 꾸밈음은 길이 0이므로 그 결과를 발음 일치의 근거로 사용하지 않았다.

`out/parity-qa/key-grace-focused-red.log`, `key-grace-production-inspector-red.log`, `key-grace-focused-green-a.log`, `key-grace-production-inspector/results.json`와 `concert-display-private-tmp-5svrtm9t/results.json`에 증거가 있다. 첫 팔레트 시도는 960px에서 타일이 화면 밖에 있어 실제 명령을 실행하지 못했다. 성공 경로는 공개 악보 설정이며 파일 대화상자는 응답 어댑터를 사용했다. 외부 GUI 조표 편집과 청음은 이번 검증 범위 밖이다.

## 겹치는 붙여넣기 뒤 선택 밖의 임시표

한 마디의 F♯–G–F♮–F를 입력하고 처음 두 음을 가운데 두 음에 붙여넣었다. 제자리표가 있었던 세 번째 음을 덮으면 마지막 음과 붙은 꾸밈음에 앞선 F♯가 상속됐다. 마지막 음은 선택 밖이고 ID와 위치는 그대로였다. 기존 음높이 편집에서 쓰는 이웃 음 계산을 재사용했다. 바뀌는 자동 임시표만 명시해 다음 음과 꾸밈음의 음높이를 보존한다.

단위 실패에서 마지막 음 MIDI 66을 재현했고 수정 후 65로 유지됐다. 이전 Electron에서도 결과 Native의 제자리표 누락을 확인했다. 관련 편집·score-core·MusicXML 72파일·855건과 타입 포함 생산 빌드 통과. 실제 960×750 dark와 1400×750 light에서 포인터로 시작 음을 선택하고 방향키로 범위를 지정했다. 편집 메뉴로 복사·붙여넣기, F6으로 악보 초점 복귀, 한 번의 undo/redo, Native 재열기를 확인했다. 첫 음과 선택 밖 마지막 음의 ID 및 다음 마디를 보존했다.

두 폭의 MIDI는 0·1·2·3박의 66·66·67·65다. 실제 MusicXML 두 건과 MuseScore 4.7.5 재출력은 고정 XSD를 통과했고 XML의 본음과 꾸밈음 음높이가 일치했다. 두 Studio A4 한 페이지 PDF 래스터는 일치했다. MuseScore PDF는 같은 F♮의 꾸밈음과 바로 뒤 본음 중 꾸밈음에만 제자리표를 그렸다. Studio는 양쪽에 표시한다. 이 조판 차이는 별도 항목이다. MuseScore MIDI의 꾸밈음 발음과 그 전 음 길이는 현재 Studio와 다르다.

`out/parity-qa/overlap-neighbor-accidental-red.log`, `overlap-neighbor-production-selected-red.log`, `overlap-neighbor-regression.log`, `overlap-neighbor-production/results.json`과 `concert-display-private-tmp-1qhd59mi/results.json`에 증거가 있다. 화면의 범위 선택은 키보드를 사용했다. 초기 960px 포인터 시도의 hit 조건은 통과하지 않았고, 실제 OS 파일 대화상자는 응답 어댑터를 사용했다. 전체 7,490건은 이번 두 편집 수정 전 결과다.

## 꾸밈음 뒤에 필요한 임시표

수정 전 Studio PDF는 F♯ 꾸밈음 뒤의 F 본음에 제자리표를 빠뜨리고 F♯ 본음에는 샤프를 한 번 더 표시했다. 같은 마디에서 C 본음에 붙은 F♯ 꾸밈음 이후 처음 F가 나오는 경우에도 제자리표를 빠뜨렸다. MuseScore 4.7.5에서 정상 종료한 같은 XML의 PDF 두 건과 비교해 세 차이를 재현했다.

화면·PDF·MusicXML이 같은 보표와 성부 안에서 독자가 직전에 본 해당 음의 임시표를 반영한다. 꾸밈음과 본음이 같은 음높이면 중복 표시를 생략하고 다음 같은 위치의 음높이가 다를 때 필요한 임시표를 그린다. 본음의 기보·재생 음높이 값과 Native의 임시표 상속 계산에는 손대지 않았다. MusicXML에는 꾸밈음과 본음의 실제 음높이 및 필요한 기호를 출력한다. 화음에서는 출력하는 구성음으로 기호를 판단하고 명시적 0은 기호 생략 시에도 보존한다. 중간 회귀에서 발견한 화음 구성음의 명시적 0 누락을 이 검사로 잡았다.

표기 실패 3건과 기존 통과 2건을 보존했다. 최종 관련 334파일·3,676건과 타입 포함 생산 빌드가 통과했고 외부 opt-in 1건을 건너뛰었다. 960×750 dark와 1400×750 light에서 현행과 수정 후 두 시료를 확인했다. 조판과 내보낸 XML에서 필요한 제자리표는 한 번 나타나고 반복 샤프는 빠졌다. 수정 후 XML 4건은 고정 XSD 통과, XML 음높이·길이와 Native 악보 본문, MIDI 바이트는 수정 전과 일치했다. 같은 입력의 두 폭 PDF 래스터는 일치했다. 수정 전 정상 완료한 MuseScore 대조 PDF와 수정 후 두 Studio PDF를 검토했다.

`out/parity-qa/grace-accidental-focused-red.log`, `grace-accidental-regression-a.log`, `grace-{host,later}-signs-production/results.json`에 증거가 있다. 정상 외부 대조는 `grace-host-pdf-only-{hv0d4obt,mgz6vrv3}/results.json`에 있다. 최종 사본을 단독 PDF로 다시 요청했을 때 발생한 SIGABRT와 임시 폴더 이름 충돌이 있는 묶음 실행은 재출력 성공 근거에서 제외했다. 실제 OS 파일 선택기는 응답 어댑터를 사용했다. 꾸밈음 발음과 실음 보기의 제품 정책은 결정 대기다.

## 꾸밈음 편집·조판 변경의 누적 검사

조표 변경·겹침 붙여넣기의 음높이 보존과 꾸밈음 임시표 조판을 포함한 `npm run test:all`은 종료 코드 0으로 끝났다. Vitest 787파일·7,495건과 Node-native 5건 통과, 외부 opt-in 1파일·1건 건너뜀이다. 1,832.10초간 고정한 입력 6,581개의 해시는 원래 실행과 독립 검사에서 일치했다. 원래 로그와 receipt는 `out/parity-qa/grace-accidental-full-stamp/`에 있다. 실음 보기의 편집·PDF와 꾸밈음 발음 기본 정책은 결정 대기다.

## 한 보표의 여러 성부에서 이어지는 임시표

같은 보표에서 첫 성부 F♯ 뒤에 둘째 성부 F가 나오면 Studio는 제자리표를 빠뜨렸다. 둘째 성부의 음도 F♯이면 샤프를 중복 표시했다. 정상 종료한 MuseScore Studio 4.7.5의 두 MusicXML 재출력이 이 차이를 확인했다. 앞 음과 같은 옥타브에서 다른 성부가 이어지는 경우, 같은 박의 서로 다른 음높이와 같은 음높이, 다른 옥타브와 아래 보표의 대조를 넣었다.

화면·PDF·MusicXML에서 같은 보표와 옥타브의 마지막 실제 표기를 기준으로 필요한 임시표를 그린다. 시간상 앞선 음을 먼저 비교하고, 동시에 시작하는 성부는 MusicXML과 같은 성부 번호 순서로 본다. 꾸밈음도 표시 문맥에 포함된다. 재생·편집의 음높이는 기존대로 각 성부의 조표와 임시표에서 계산한다. [MuseScore 편집 설명](https://handbook.musescore.org/basics/editing-notes-and-rests) · [MusicXML accidental](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/accidental/)

focused 실패 3건과 수정 전 960/1400px 실제 앱의 표기 누락을 보존했다. 수정 후 focused 5파일·50건, 관련 334파일·3,679건, 외부 opt-in 1건 건너뜀 및 타입 포함 생산 빌드가 통과했다. 새 빌드의 두 화면 폭에서 실제 MusicXML 열기, Native 저장·재열기, MusicXML·MIDI·PDF 내보내기를 확인했다. 4마디와 7마디에서 각각 6개와 13개 기호의 음표 ID·SMuFL 글리프가 XML과 동일했다. 실제 XML 4건은 고정 XSD를 통과했고, MuseScore 재출력과 음높이·임시표가 일치했다. 네 마디 대조에서 수정 전후 Native 악보 본문과 MIDI 바이트는 같았다. 1쪽과 2쪽 A4 PDF를 두 폭에서 출력하고 전체 페이지 래스터를 비교했다. 같은 입력의 두 폭 래스터가 일치했다.

관측과 산출물은 `out/parity-qa/cross-voice-accidentals-before/`, `cross-voice-accidentals-after/`, `cross-voice-unisons-after/`, 정상 종료한 외부 변환 기록은 `grace-host-pdf-only-{muroemq1,prcvdcti}/results.json`에 있다. PDF·MIDI·XML을 한 번에 요청한 MuseScore 실행과 별도의 PDF 실행은 SIGABRT여서 비교에서 제외했다. 파일 선택 응답은 어댑터를 사용했다.

## 꾸밈음의 첫 박과 4/4 반복 복귀 음향 대조

MuseScore 네이티브 대조 다섯 건이 정상 종료했다. WAV에서 B♭5 꾸밈음을 첫 박과 8박 복귀에서 확인했고, 사선 없는 MIDI의 본음은 4분음표에서 반 박·8분음표에서 4분의 1박 늦었다. 다음 G4는 1·9박을 유지했다. 현재 Studio에서 같은 XML의 C5는 0·8박에 시작하고 사본 MIDI도 무꾸밈음 대조와 일치했다. 사선 꾸밈음의 MIDI는 WAV와 다른 첫 길이 0·복귀 시작 7.5박을 보였다. 주파수 검사를 수행했고 청음은 수행하지 않았다. [수치 및 수용 범위](grace-playback-proposal.md#44-반복-복귀와-짧은-본음의-꾸밈음-대조)

## 동시에 시작하는 다른 음높이의 음머리

성부 사이 임시표 수정 뒤 같은 박에 F와 F♯가 있는 두 마디를 다시 확인했다. Studio 960/1400px에서 두 음머리의 중심 x 좌표가 같고 실제 폭 11.805px가 겹쳤다. 정상 종료한 MuseScore 4.7.5의 MusicXML에서 같은 위치의 두 음머리 `default-x`는 14.5 tenths 차이였다. 같은 음높이의 동시 F♯ 대조에서는 두 앱 모두 음머리 위치가 같다. 임시표 기호와 음높이 교환은 검증했고 다른 음높이의 음머리 배치는 별도 수정 대상으로 등록했다. `out/parity-qa/cross-voice-unison-ink-a/ink-comparison.json`에 좌표가 있다.

같은 박의 음머리 분리 후보는 VexFlow의 충돌 조판을 같은 보표의 해당 onset에만 적용한다. 사용 중인 VexFlow 5.0.0에서 충돌한 두 성부의 ModifierContext만 앞서 계산하는 비제품 스크립트를 실행했다. 시험의 상대 이동과 오른쪽 예약 폭은 2였고, 같은 음높이 대조의 이동은 0이었다. 전역 유니즌 옵션도 즉시 원래 값으로 돌아왔다. Node에는 실제 글꼴 측정이 없으므로 실앱의 필요 간격으로 해석하지 않는다. `out/parity-qa/unison-context-scratch-b.log`에 결과가 있다. 제품 반영, 여러 음머리나 성부와의 간격, 실제 포인터 선택·PDF는 다음 조판 항목의 수용 검사다.


## 성부 임시표 수정 후 누적 전체 검사

11월 23일 `npm run test:all`이 종료 코드 0으로 끝났다. Vitest 787파일·7,498건과 Node-native 5건 통과, 외부 opt-in 1파일·1건 건너뜀이다. 1,829.03초간 고정한 입력 6,581개는 종료 기록과 독립 확인 모두 일치했다. `out/parity-qa/cross-voice-accidentals-full-stamp/`에 로그와 receipt가 있다.

## 같은 박의 서로 다른 F와 F♯ 음머리 분리

한 보표에 두 성부의 줄기 있는 음표가 같은 오선 위치에서 다른 임시표를 가질 때, 그 박의 VexFlow 조판에서 음머리와 오른쪽 여유를 함께 배치한다. 기존 VexFlow 5.0.0의 폭 계산을 사용하고 해당 박 계산이 끝나면 공유 유니즌 설정을 즉시 복원한다. 실제로 음높이가 같은 F♯ 두 음과 다른 보표의 박 위치에는 이 변경이 적용되지 않는다. 세 성부 이상이 같은 박에 울리는 경우는 이 회귀에 포함하지 않았다.

일반 보표와 공유 보표 경로의 실패 2건을 보존했다. 수정 후 단음·화음 대조를 포함한 focused 25건, 관련 334파일·3,681건 및 외부 opt-in 1건 건너뜀, 타입 검사와 생산 빌드가 통과했다. 관련 전체는 화음 추가 대조 전 결과이며 해당 대조는 focused 검사를 통과했다. 누적 `test:all` 7,498건은 이 조판 수정 전 결과다.

한 보표·두 보표 시료를 각각 960×750 dark와 1400×750 light에서 실제로 열었다. 수정 전 약 11.805 CSS px가 겹치던 두 음머리 사이에 화면에서 약 1.995 CSS px가 생겼다. 같은 음높이 대조의 중심 x는 같았다. 각 시료·각 화면 폭에서 두 마디의 두 음머리를 포인터로 눌러 올바른 성부의 음표 ID를 선택했다. 둘째 페이지 쪽으로 이동할 때는 실제 휠 이벤트를 사용했다. 첫 검사 도구의 포인터는 스크롤 뒤에도 음이 화면 밖에 있어 그 단계에서 중단됐다.

공개 메뉴로 Native 저장·재열기와 MusicXML·MIDI·PDF를 확인했다. 네 실제 XML 출력은 고정 XSD를 통과했다. 같은 시료의 Native 악보 본문과 XML·MIDI 바이트는 수정 전과 일치했다. 한 보표 A4 1쪽, 두 보표 A4 2쪽의 두 폭별 페이지 래스터가 일치했고 실제 PDF의 음머리를 확인했다. 파일 선택 UI는 응답 어댑터를 사용했다. 자료는 `out/parity-qa/conflicting-unisons-production-a/`, `conflicting-unisons-single-production/`, `conflicting-unisons-red-a.log` 및 `conflicting-unisons-focused-a.log`에 있다.

## 서로 다른 이조 악기가 함께 있는 실음 대조

같은 MusicXML을 두 앱에서 재생해 클라리넷·알토 색소폰·플루트의 음높이 12개와 시작 박을 맞췄다. 같은 MuseScore Native 악보의 두 보기에서 정상 종료한 PDF를 대조했다. 조표와 길이 차이, 비정상 종료를 제외한 범위와 Studio 시험용 변환의 원본 보호는 [실음 보기 검증](concert-display-proposal.md#서로-다른-이조-악기가-함께-있는-실음-대조)에 기록했다.

## 세 성부의 같은 위치 음머리와 선택

같은 보표에서 F♯·F·F♭가 동시에 시작하는 유효한 MusicXML을 열었다. 변경 전에 960×750과 1400×750에서 F♯와 F♭ 음머리가 약 11.805 CSS px씩 완전히 겹쳤고, 단위 회귀의 x 좌표도 같았다. MuseScore 4.7.5의 정상 PDF에도 세 임시표와 두 음머리가 보였다. 외부 XML 변환은 SIGABRT여서 그 출력은 비교에서 제외했다.

Studio에서는 독립 선택이 가능하도록 세 음머리를 분리한다. 세 성부 이상에서 줄기가 있는 단일 음표가 같은 위치의 다른 음높이를 가지면, 기존 VexFlow 배치를 기준으로 해당 음을 필요한 만큼 옮기고 다음 공유 박 앞의 공간을 예약한다. 같은 F♯를 내는 대조 마디의 기존 배치와 두 성부 경로를 보존했다. 화음·줄기 없는 음을 포함하는 다중 성부는 이 범위 밖이다.

두 화면 폭에서 새 음머리 사이의 최소 간격은 약 1.995 CSS px였으며 CDP 포인터로 세 음표를 각각 눌러 원래 ID를 선택했다. Native 저장·재열기, 출력을 시작하기 전후의 수정 이력, XML·MIDI를 확인했다. Native 악보 본문과 XML·MIDI 바이트 및 임시표의 종류는 변경 전과 일치했다. 두 실제 XML은 고정 XSD를 통과했고 두 A4 1쪽 PDF의 래스터가 일치했다. 실제 PDF의 세 음머리를 확인했다. 파일 선택에는 응답 어댑터를 사용했다.

실패 1건, focused 26건·조판 748건과 타입을 포함한 생산 빌드를 확인했다. 이전 두 성부의 실제 선택도 현재 빌드의 두 폭에서 통과했다. 증거는 `out/parity-qa/three-voice-chromatic-unisons-{a,fixed-a}/`, `three-voice-chromatic-unisons-red.log`, `three-voice-two-voice-control/`에 있다.

## 음머리 조판 변경의 누적 전체 검사

11월 23일 두 성부와 세 성부의 음머리 수정 및 관련 회귀를 포함한 `npm run test:all`이 종료 코드 0으로 끝났다. Vitest 787파일·7,502건과 Node-native 5건 통과, 외부 opt-in 1파일·1건 건너뜀이다. 실행은 1,830.59초였고 고정 입력 6,581개의 해시는 종료와 독립 검사에서 모두 일치했다. 관련 슬라이스 검사 334파일·3,683건도 통과했다. `out/parity-qa/chromatic-unisons-full-stamp/`의 로그와 receipt가 검증 근거다.

## 같은 박의 쉼표 사이에서 겹치는 음머리

F♯와 F♭에 다른 성부의 4분쉼표가 함께 시작할 때 두 폭에서 음머리가 약 11.805 CSS px 완전히 겹쳤다. VexFlow가 배치한 쉼표의 영역을 유지하고, 필요한 경우 이동하는 음머리가 그 영역을 지나도록 다음 박의 간격을 계산한다. 동일 F♯ 대조의 배치와 쉼표 위치는 유지한다.

960×750와 1400×750에서 두 음과 쉼표를 각각 선택했다. 수정 뒤 음머리 사이에는 약 14.795 CSS px가 있었고 쉼표와 가로로 겹치지 않았다. Native 저장·재열기 본문과 MusicXML·MIDI 바이트는 전후 일치했다. 실제 XML은 고정 XSD를 통과했고 두 A4 PDF의 래스터가 같았다. 실제 PDF를 검토했다. 외부 PDF 변환은 SIGABRT여서 비교에서 제외했다.

단위 실패 1건을 보존했다. 수정 후 focused 27건, 조판 100파일·749건, 타입 포함 생산 빌드, 문서 확인이 통과했다. 누적 전체 7,502건은 이 쉼표 수정 전 결과다. 증거는 `out/parity-qa/cross-voice-rest-with-chromatic-unison-{a,fixed-a}/`와 `cross-voice-rest-with-chromatic-unison-red.log`에 있다.

## 화음·온음표와 같은 위치의 다중 성부 음머리

화음, 온음표, 둘을 함께 넣은 세 가지 MusicXML에서 같은 박의 F♯·F·F♭ 중 F♯와 F♭가 두 화면 폭 모두 약 11.805 CSS px 완전히 겹쳤다. 세 단위 검사의 실패도 확인했다. 기존 다중 성부 배치에서 화음의 모든 음머리와 좌우 돌출 폭을 검사하고, 온음표도 필요한 만큼 옮기도록 했다. 같은 음높이 대조와 기존 쉼표 배치를 유지했다.

세 파일의 960×750·1400×750 빌드에서 바뀐 세 음의 최소 간격은 1.920 CSS px였다. CDP 포인터로 각 성부를 선택했다. Native 저장·재열기 악보 본문, MusicXML·MIDI 바이트, 임시표 종류는 수정 전과 일치했다. 실제 MusicXML 6건이 고정 XSD에 맞았고 화면 폭별 A4 PDF 래스터가 짝마다 같았다. 혼합 악보의 Studio PDF는 세 음머리를 분리해 표시했다. 정상 종료한 MuseScore 4.7.5 PDF에서는 같은 자리에 음머리가 겹쳐 보였다. 화음만 또는 온음표만 넣은 MuseScore 변환은 SIGABRT여서 비교에서 제외했다.

조판 100파일·752건, MusicXML·모델·편집·조판의 관련 회귀 334파일·3,687건과 타입 포함 생산 빌드가 통과했다. 관련 회귀의 외부 opt-in 1건은 건너뛰었다. 전체 7,502건은 이 수정과 앞선 쉼표 수정 전의 결과다. 좌표·선택·출력 해시는 `out/parity-qa/mixed-chromatic-unisons-*-after/comparison.json`, 외부 변환 결과는 `out/parity-qa/concert-native-view-priapohc/results.json`에 있다.

## 옥타브 이조, 조표 변경과 이조 해제

B♭ 베이스 클라리넷의 3마디에서 14반음 내림을 상속한 뒤 마디 경계에서 이조를 0으로 해제했다. Studio 시험 투영은 실음 조표를 −2·−1·+1로 계산했고 12개 이벤트의 원본 선택 ID와 기보음의 역변환을 확인했다. 실제 앱으로 기보 파일과 별도 실음 대조군을 열었을 때 두 화면 폭에서 12개의 MIDI 시작 박과 음높이가 일치했다. MuseScore 4.7.5는 기보 파일 3마디의 이조를 유지했으며, 같은 음높이를 직접 입력한 실음 대조군은 Studio MIDI와 일치했다. [실음 보기 검증](concert-display-proposal.md#옥타브-이조와-마디-경계-해제)

## 6/8에서 꾸밈음 음가에 따른 발음 대조

MuseScore의 6/8 점4분 본음 앞 8분과 4분 꾸밈음은 WAV와 MIDI에서 본음 시작이 서로 달랐다. Studio의 현재 타임라인과 MIDI는 두 경우 모두 꾸밈음 없는 대조와 일치했다. 지원 범위와 기존 4분 꾸밈음 가져오기 경고를 [꾸밈음 발음 검증](grace-playback-proposal.md#68-점4분-본음과-원래-꾸밈음-음가)에 기록했다.

## MusicXML 꾸밈음 화음과 차례로 붙인 꾸밈음

같은 보표·성부에서 D5·F♯5 꾸밈음이 함께 시작하고 E5가 뒤따르는 유효한 MusicXML을 열었다. 수정 전 Studio는 960×750·1400×750에서 세 음을 차례로 그렸고 사본의 `<chord/>`를 잃었다. MuseScore 4.7.5의 정상 재출력은 화음을 보존했다. [MusicXML note 명세](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/)

프로젝트는 앞 꾸밈음과 같은 시점에 속한 구성음에 선택적 `chord` 값을 기록한다. 기존 문서에는 이 값이 없어도 된다. 화음의 음들은 같은 자리에 그리며 다음 꾸밈음은 별도 자리에 둔다. 같은 보표·성부에 앞 꾸밈음이 없는 구성음에는 가져오기 오류를 표시한다. 두 폭에서 Native 저장·재열기와 PDF를 검증했다. 기존 악보와 새 프로젝트의 차이는 구성음의 값 한 개였고 Studio MIDI 바이트는 같았다. 이 값을 모르는 이전 빌드에서 새 프로젝트를 열어야 할 때는 MusicXML 사본을 사용할 수 있으나 이전 빌드는 화음 관계를 잃는다.

Studio의 두 실제 MusicXML 사본과 MuseScore가 원본·Studio 사본을 다시 출력한 XML에 같은 화음 관계와 음높이가 있었다. 원본과 실제 사본 4건은 고정 XSD를 통과했다. A4 PDF 두 출력의 래스터 해시가 같았다. 꾸밈음 개별 발음의 기본값은 결정 대기다. 이 수정은 가져오기·조판·교환의 동시 시작 관계를 보존한다.

Focused 94건과 관련 회귀 363파일·3,830건 및 타입 포함 생산 빌드가 통과했다. 관련 회귀는 외부 opt-in 1건을 건너뛰었다. 증거는 `out/parity-qa/grace-chord-exchange-{before-geometry,after}/`, `grace-chord-exchange-red.log`, `concert-native-view-{for2zbna,4gxyfhr3}/`에 있다.

## 꾸밈음 화음까지 누적 전체 검사

`npm run test:all`은 1,830.69초 만에 종료 코드 0으로 끝났다. Vitest는 787파일·7,509건, Node-native는 5건이 통과했다. 외부 opt-in 1파일·1건을 건너뛰었다. 고정 입력 6,581개를 정규 종료와 이후 독립 검사에서 모두 확인했다. 로그·receipt는 `out/parity-qa/grace-chord-exchange-full-stamp/`에 있다.

## 위치 표지가 없는 뒤꾸밈음 교환

MuseScore 4.7.5 Native 4/4 시료 두 개에서 첫째 C5 또는 마지막 D4 뒤에 붙인 B♭5가 0.5·3.5박에 각각 발음됐다. 정상 XML 두 건은 고정 XSD를 통과했다. 둘 다 위치나 시간 속성이 없는 `<grace/>`로 내보내어, 마디 중간에서는 다음 음 앞의 일반 꾸밈음과 형식이 같았다. Studio는 중간 시료를 다음 G4의 꾸밈음으로 열었고 마디 끝 시료는 연결할 본음이 없다는 오류를 표시했다. MuseScore에서 두 XML을 다시 열어 만든 정상 MIDI는 두 경우 모두 B♭5를 잃었으며 중간 시료의 G4는 1.5박에 시작했다. 결과와 남은 범위는 [꾸밈음 발음 검증](grace-playback-proposal.md#위치-표지가-없는-뒤꾸밈음)에 기록했다.

## 마디 끝 뒤꾸밈음의 가져오기와 저장

마지막 본음 뒤의 꾸밈음이 있는 MusicXML을 열지 못하는 문제를 수정했다. 같은 마디·보표·성부에 다음 본음이 없고 성부 마지막 이벤트가 음표이면 뒤꾸밈음을 그 음표에 붙인다. 앞에 붙은 음이 없으면 기존처럼 거부한다. 마디 중간의 표지 없는 꾸밈음은 다음 본음에 붙인다. Native에는 각 구성음의 위치를 선택적 `after` 값으로 저장한다. 이 값을 새로 기록한 파일의 위치 보존에는 이 빌드가 필요하다.

MuseScore 4.7.5가 내보낸 뒤꾸밈음 악보와 온음표 화음 앞뒤에 꾸밈음이 있는 대조군을 960×750·1400×750에서 열었다. 마지막 본음 오른쪽에 뒤꾸밈음이 표시되고 화음은 함께 시작한다. 앞꾸밈음은 본음 왼쪽에 남았다. 온음표 오른쪽 제자리표가 본음과 약 1.96 CSS px 겹치던 첫 시안을 고쳐 간격을 4.92 px로 확보했다. 두 폭에서 Native 재열기와 실제 PDF, 일반 MusicXML 저장·사본을 확인했다. 실제 MusicXML 출력 8건은 고정 XSD에 맞았다. 두 폭의 PDF 래스터 해시는 악보당 일치했다. Studio MIDI의 본음과 지속 시간은 유지했다.

뒤꾸밈음 뒤에 새 본음이 생긴 Native 대조군에서도 각 기호가 겹치지 않았다. 현재 위치를 복원할 수 없는 MusicXML 저장·사본 작업은 두 폭에서 파일 선택창을 열기 전에 막았고, 해당 마디와 프로젝트 저장 방법을 안내했다. 마디 끝의 정상 내보내기는 다른 앱이 위치를 바꾸거나 생략할 수 있다고 알린다. Studio의 실제 XML 사본을 대상으로 MuseScore의 MIDI와 PDF 재변환을 시도했으나 두 형식 모두 SIGABRT여서 결과 비교에서 제외했다. 앞서 확인한 MuseScore Native와 자체 XML의 차이 자료는 유지했다.

실패 재현 3건, focused 43건, 관련 회귀 364파일·3,834건과 타입 포함 생산 빌드를 확인했다. 관련 회귀의 외부 opt-in 1건은 건너뛰었다. 증거는 `out/parity-qa/trailing-grace-{terminal,mixed-trailing,ambiguous}-verified/`, `trailing-grace-*-build.log`, `concert-native-view-{nvetvt24,f2p8p5y0}/`에 있다.


## 뒤꾸밈음까지 누적 전체 검사

`npm run test:all`은 1,834.31초 만에 종료 코드 0으로 끝났다. Vitest 788파일·7,513건과 Node-native 5건이 통과했다. 외부 opt-in 1파일·1건은 건너뛰었다. 고정 입력 6,582개는 실행 종료와 이후 독립 비교에서 모두 일치했다. 전체 로그, 종료 기록과 독립 확인은 `out/parity-qa/trailing-grace-full-stamp/`에 있다.

실제 앱의 MusicXML 사본을 사용한 추가 클립보드 검사에서 조표가 다른 1–2→2–3마디 붙여넣기는 앞꾸밈음과 뒤꾸밈음 화음, 원음과 구성음의 음높이를 보존했다. 한 번의 undo/redo와 Native 본문, XML 재가져오기 후 타임라인과 MIDI가 일치했다. 두 마디를 반복 펼치기로 내보내면 1·3마디에 같은 뒤꾸밈음이 남고 해당 마디를 안내한다. 펼친 XML은 고정 XSD를 통과했고 기존 MIDI와 일치했다. 두 추가 검사는 편집·변환 함수를 직접 호출했다. `out/parity-qa/trailing-grace-range-copy.json`, `trailing-grace-repeat-expanded.json`, `trailing-grace-independent-checks-hashes.json`에 결과가 있다.


## 두 성부에서 마디 끝 뒤꾸밈음의 가로 위치

G장조의 첫 성부에 온음표 F♯4와 뒤꾸밈음 F♮4를 넣고, 둘째 성부에 A4·F♯4 2분음표를 넣었다. Studio 960×750 dark와 1400×750 light에서는 뒤꾸밈음 음머리가 둘째 성부의 셋째 박 음머리보다 왼쪽에 있었다. 뒤꾸밈음의 오른쪽과 셋째 박 음머리의 왼쪽 사이 거리는 각각 43.34·104.73 CSS px다. 셋째 박의 디지털 음높이는 F♯4인데 그 앞에 F♮이 보이고 셋째 박에 샤프가 없어 PDF를 다르게 읽을 수 있다.

같은 음가·음높이·성부를 넣은 MuseScore 4.7.5 Native 대조군의 PDF 변환은 종료 코드 0이었다. 그 PDF는 셋째 박의 F♯4 뒤, 마디선 직전에 뒤꾸밈음과 제자리표를 그렸다. Studio·MuseScore의 실제 A4 래스터를 검토했다. 두 Studio 폭의 PDF 래스터 해시와 MIDI 바이트가 각각 일치했고, Native 재열기에서 본문이 일치했다. MusicXML 저장·사본 4건은 고정 XSD를 통과했다. 파일 선택은 검증 어댑터를 사용했다.

다음 조판 수정의 수용 기준은 마지막 본음의 소유권을 보존하며 뒤꾸밈음의 왼쪽 잉크를 같은 보표의 마지막 정규 음 이후, 오른쪽 잉크를 마디선 이전에 두는 것이다. 두 폭 검사에서 현재는 2건 모두 이 순서가 실패한다. 양쪽 음머리와 임시표의 간격, 줄 끝과 좁은 마디, 다른 보표의 줄 정렬, 단일 성부 대조 및 Native·XML·MIDI 보존을 확인한다. VexFlow 그룹의 현재 본음 위치와 공유 리듬 간격을 먼저 비교한다. 아직 조판 수정은 적용 전이다.

실패 로그는 `out/parity-qa/trailing-grace-polyphony-red.log`, Studio 출력을 담은 폴더는 `trailing-grace-polyphony-b/`, 외부 A4 대조는 `concert-native-view-zisjtm88/`다. 검사 도구가 Electron을 Node 모드로 실행한 첫 시도와 두 폭에서 확인한 조판 실패는 각각 별도 로그에 남겼다.


## 두 성부의 마디 끝 뒤꾸밈음 조판 수정

뒤꾸밈음의 간격을 본음의 시작 칸에서 같은 보표의 마지막 정규 음이 있는 칸으로 옮긴다. 마디 끝에 여유 공간이 있으면 마디선 쪽으로 정렬한다. SVG 그룹과 꾸밈음은 원래 본음에 속한다. 여러 뒤꾸밈음 그룹이 한 칸에 모이면 각 그룹 너비를 확보한다. 길게 유지되는 본음의 뒤꾸밈음은 다른 성부에서 그 뒤에 쓴 임시표를 기준으로 자기 임시표를 판단한다.

실제 960×750 dark와 1400×750 light에서 한 보표, 공유 리듬의 두 보표, 셋째 박 제자리표 뒤 샤프가 필요한 악보를 열었다. 마지막 정규 음머리와 뒤꾸밈음 임시표 사이에는 4.88 CSS px 이상이 있었고, 뒤꾸밈음 음머리는 마디선보다 25.86–37.86 CSS px 왼쪽에 있었다. 공유 리듬의 셋째 박 음머리는 두 보표에서 2px 이내로 정렬됐다. A4 PDF 세 종류의 실제 래스터를 검토했고 악보별로 두 폭의 래스터가 일치했다. 실제 MusicXML 저장·사본 12건은 고정 XSD를 통과했다. 최초 실패 악보의 Native 원본·재열기, 구조 MusicXML, MIDI는 조판 수정 전과 바이트가 같다.

마디 끝 단음 뒤꾸밈음과 온음표 앞뒤 꾸밈음 화음도 두 폭에서 확인했다. 두 대조군의 Native 재열기·MusicXML·MIDI·PDF 래스터가 이전과 같고 XML 8건은 고정 XSD를 통과했다. 파일 대화상자 응답은 검증 어댑터를 사용했다. 외부 실제 OS 대화상자와 기존 꾸밈음의 발음 정책은 이 조판 검사의 범위 밖이다.

가로 순서 2건과 임시표 1건의 실패를 재현했다. MuseScore PDF와 비교한 첫 수정에서 한 보표의 마디선 간격이 컸고, 이 대조의 단위 검사도 실패한 뒤 통과했다. 겹치는 두 뒤꾸밈음 그룹의 너비 대조를 포함해 최종 focused 5파일·55건과 타입 포함 생산 빌드를 통과했다. 로그·좌표·출력은 `out/parity-qa/trailing-grace-closing-{local,shared,natural,control-terminal,control-mixed-trailing}/`와 `trailing-grace-*-unit-*.log`에 있다. 위 누적 전체 7,513건은 이 조판 수정 전 결과다.

밀집 줄 끝 대조에서는 옆 성부의 16분음표 16개, 끝 도돌이표와 다음 마디의 수동 악보단 나누기를 함께 열었다. 두 창 모두 뒤꾸밈음 임시표 앞 5.00 CSS px, 음머리 뒤 마디선까지 30.78–30.84 CSS px를 확인했다. 두 악보단이 나온 A4 한 페이지 PDF의 래스터가 일치했다. 실제 MusicXML 저장·사본 4건과 반복 펼치기 함수의 출력은 고정 XSD를 통과했고, 실제 MIDI는 반복 펼치기 대조의 12박·35음과 바이트가 같았다. `out/parity-qa/trailing-grace-closing-dense/`의 화면·PDF·MIDI와 `probe-trailing-grace-dense-repeat.ts`의 대조를 참조한다.

## 뒤꾸밈음 마디선 배치까지 누적 전체 검사

`npm run test:all`은 1,833.08초 만에 종료 코드 0으로 끝났다. Vitest 788파일·7,518건과 Node-native 5건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. 고정 입력 6,583개는 실행 종료와 이후 독립 대조에서 모두 일치했다. `out/parity-qa/trailing-grace-closing-full-stamp/`에 로그와 종료 기록·독립 비교가 있다. 줄 끝 검증은 이 검사 직후 같은 생산 빌드로 실행했다.

## MusicXML 온음계 이동 생략과 실음 조표 시험

클라리넷·색소폰의 `diatonic`을 생략하고 플루트를 대조로 둔 MusicXML을 두 앱으로 열었다. 정상 종료한 MIDI의 12음에서 음높이와 마디 시작 이후의 박이 일치했다. Studio가 재출력한 XML은 생략을 보존하고 고정 XSD를 통과했다. MuseScore의 XML 재출력은 SIGABRT로 종료해 비교에서 제외했다. 조표·이명동음 표시의 시험과 제품 결정에 필요한 경계는 [실음 보기 검증](concert-display-proposal.md#온음계-이동을-생략한-xml과-실음-조표-범위)에 기록했다.


## 옥타브 음자리표의 모양과 오선 위치

MusicXML의 높은음·낮은음자리표에 아래 8, 위 8, 일반으로 돌아오는 세 마디를 넣었다. Studio는 원래 옥타브 값과 MIDI 음높이를 보존했으나 화면과 PDF에 숫자를 그리지 않았다. 앞 두 마디의 음머리는 일반 음자리표 대조보다 위나 아래로 35 SVG 단위 어긋났다. 같은 보표의 정상 음자리표 위치와 비교한 단위 검사 다섯 건도 실패했다. MuseScore 4.7.5의 정상 단일 보표 출력 MIDI에서 높은음자리표 55·79·67, 낮은음자리표 41·65·53이 Studio와 같은 0·4·8박에 시작했다. 길이는 Studio 4박, MuseScore 1919/480박이다. 낮은음자리표의 정상 MuseScore PDF에서 숫자와 같은 오선에 놓인 음머리를 확인했다. 비정상 종료한 다른 PDF 변환은 제외했다. [MusicXML 옥타브 음자리표](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef-octave-change/) · [MuseScore 4.7.5 음자리표 정의](https://github.com/musescore/MuseScore/blob/v4.7.5/src/engraving/dom/clef.cpp#L43-L81)

화면·PDF·폭 측정은 기존 음자리표 계열을 유지하면서 해당 SMuFL 기호를 사용한다. 높은음·낮은음자리표의 위·아래 8·15와 C 테너 음자리표의 아래 8을 그린다. 본음·화음·꾸밈음의 오선 위치와 높이 계산에는 같은 보정을 적용한다. 저장된 음높이·MIDI·쉼표 위치는 유지한다. 그 밖의 조합은 가져온 값을 보관하는 기존 범위에 있다.

960×750 dark와 1400×750 light에서 두 보표 8 표기, 세 보표 15와 C 테너 아래 8의 실제 SVG와 A4 PDF를 확인했다. 일반 음자리표 복귀에서도 음머리 높이가 의도한 오선에 일치했다. 각 대조의 두 폭 PDF 래스터는 일치했다. 앞 대조의 수정 전후 Native·MusicXML·MIDI 파일은 바이트가 같았고 두 대조의 실제 MusicXML 저장·사본 8건은 고정 XSD를 통과했다. 파일 대화상자에는 응답 어댑터를 사용했다. 4파일·80건과 타입, 생산 빌드를 통과했다.

Studio의 실패·수정과 결과는 `out/parity-qa/octave-clef-exchange-{red-b,fixed,extended-b}/`, `octave-clef-unit-red.log`, `octave-clef-focused-final.log`에 있다. 정상 MuseScore MIDI와 PDF의 근거는 `concert-native-view-32r8p09j/`와 `octave-clef-musescore-direct-u_g5_vqt/`다. 누적 전체 7,518건은 이 음자리표 수정 전이다.


## MusicXML 음자리표의 지정 오선

기보와 MIDI를 유지하면서 음자리표와 기준음을 MusicXML이 지정한 줄에 그린다. 지원하는 줄은 G 1·2, F 3–5, C 1–5다. G1·F3·F5·C1·C2·C5는 일반 높은음·낮은음 또는 C3/C4로 그려지던 차이를 재현했다. VexFlow의 해당 음자리표 계열을 사용하고 온쉼표와 다른 쉼표는 기존 오선 위치를 사용한다. MusicXML의 줄은 보표 아래에서 센다. [MusicXML line](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/line/) · [MuseScore 4.7.5 음자리표 정의](https://github.com/musescore/MuseScore/blob/v4.7.5/src/engraving/dom/clef.cpp#L43-L81)

세 보표를 두 폭에서 열어 G1/G2, F3/F4/F5, C1/C2/C5의 실제 음자리표와 음머리 기준선이 지정한 위치와 일치하는 것을 확인했다. Native·MusicXML·MIDI는 수정 전과 바이트가 같고 실제 A4 한 페이지 PDF의 두 폭 래스터가 일치했다. 같은 빌드에서 이전 8·15 옥타브 대조도 두 폭을 다시 확인했다. 각 대조의 동일 폭 PDF는 이전 수정의 래스터와 일치했다. 세 시료의 실제 저장·사본 XML 12건은 고정 XSD를 통과했다. 정규 음자리표 편집·저장 모델과 물리 OS 대화상자는 기존 범위다.

MuseScore 4.7.5에서 같은 C4 세 음을 C1·C2·C5에 둔 Native 시료의 PDF가 정상 출력됐다. 각 음머리가 아래 첫째·둘째·다섯째 줄에 그려졌다. 직접 MusicXML을 읽은 외부 PDF 세 건은 SIGABRT로 종료돼 비교에서 제외했다. Studio의 이전·수정 증거는 `out/parity-qa/clef-line-exchange-{red,combined-final}/`, 정상 MuseScore PDF는 `clef-line-native-musescore-b80wxy8i/`에 있다. 실패 단위 검사 6건, 합본 focused 4파일·86건과 타입 포함 생산 빌드를 확인했다.


## MusicXML에서 줄을 생략한 음자리표

고정 XSD가 허용한 `line` 생략을 기존 Studio는 가져오기에서 거부했다. 960×750·1400×750의 시작 화면 기술 정보에서 생략된 줄 오류를 확인했고, G·F·C 단위 사례 세 개로 재현했다. 이제 생략된 줄은 G2·F4·C3으로 읽는다. 이미 지정된 줄과 옥타브 값은 보존한다. 숫자가 아닌 명시적 줄 값의 오류와 타악기 기본값은 기존 동작을 따른다. [MusicXML line](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/line/) · [MuseScore 4.7.5 가져오기 기본값](https://github.com/musescore/MuseScore/blob/v4.7.5/src/importexport/musicxml/internal/import/importmusicxmlpass2.cpp#L5832-L5842)

두 폭 실제 앱에서 기본 줄의 15 표기와 일반 음자리표, C3/C5/C3을 확인했다. Native 재열기, 프로젝트·MusicXML 저장/사본에서 기본 줄은 명시적으로 기록됐다. MuseScore의 정상 단독 높은음자리표 MIDI와 Studio 직렬화는 55·79·67과 0·4·8박이 일치했다. Studio의 음 길이는 4박, MuseScore는 1919/480박이다. 생략 낮은음자리표의 외부 MIDI는 SIGABRT로 끝났다.

세 음자리표 수정이 들어간 같은 생산 빌드의 시료 네 종류를 모두 두 폭에서 열었다. 실제 XML 저장·사본 16건이 고정 XSD를 통과했고 악보마다 두 폭의 PDF 래스터가 일치했다. 생략 시료의 PDF를 직접 검토했다. 앞 세 시료의 저장·MIDI·PDF 래스터는 생략 수정 전과 일치했다. 최종 focused 4파일·89건, 타입 포함 생산 빌드와 문서 검사 4종이 통과했다. 대화상자는 검증 어댑터를 사용했다.

자료는 `out/parity-qa/clef-line-defaults-{rejection-b,final-build}/`, `clef-line-defaults-unit-red.log`, `clef-line-defaults-focused.log`, `missing-clef-line-musescore-w6_heglt/`에 있다. 최종 빌드의 대조 세 종류는 `clef-line-exchange-final-build/`와 `octave-clef-exchange{,-extended}-final-build/`에 있다.


## 음자리표 세 수정의 첫 전체 회귀

고정 입력 6,583개에서 Vitest 787파일·7,538건 통과, 1파일·3건 실패, 외부 opt-in 1건 건너뜀이다. 1,833.85초에 종료 코드 1을 반환해 Node-native는 실행되지 않았다. 종료 및 별도 해시 검증에서 입력은 일치했다. 실패한 세 사례는 폐기된 G·F·C 줄 생략 거부를 요구했다. 세 사례가 각각 기본 줄과 정상 쉼표를 확인하고 동일 조건의 무음정 음표는 여전히 거부하는 방식으로 기대를 갱신했다. 오류와 이전 결과는 `out/parity-qa/clef-compatibility-full-stamp/`에 보존했다.

## 마디 안 음자리표 변경의 다음 마디 적용

음자리표가 2마디 중간이나 끝에 있는 네 유효한 MusicXML을 비교했다. 동일한 `divisions`를 시작에 추가하면 기존 Studio가 G–F–F 적용에서 G–G–G 누락으로 바뀌었다. 이전 앱의 960×750·1400×750 화면에서 F 아래 8이 2마디 전체에 적용돼 첫 음머리가 95 SVG 단위 어긋났다. 정상 종료한 MuseScore 4.7.5의 중간 변경 두 PDF는 래스터가 같았다. MuseScore는 중간 기호를 두 음 사이에 그리고 3마디로 이어갔다. 별도 정상 마디 끝 대조는 3마디 첫 음에 새 기준을 사용했다. SIGABRT로 종료한 외부 대조 하나는 제외했다.

한 마디에 하나의 음자리표를 저장하는 Studio에서는 G·F·C 사이의 변경을 다음 마디에 이어받는다. 시작의 기존 기호와 해당 보표의 마지막 변경을 보존하며, 다음 마디 시작에 지정한 음자리표가 우선한다. `backup`으로 XML 순서가 달라져도 악보 위치를 사용한다. 마디 중간에 기호가 들어갔던 정확한 위치는 경고로 안내한다. 수정된 PDF에서도 새 기호가 다음 마디에 나오므로 직전 마디 끝 낮은 음에 덧줄이 남는 입력이 있다. 타악기와 TAB의 저장·MIDI 처리 경계는 기존 범위다.

실패 네 건과 초점 6파일·98건, 타입 포함 생산 빌드를 확인했다. 원본 네 변형을 960px dark와 1400px light의 격리 앱에서 열고, 한국어 위치 경고와 오선 좌표, Native 저장·재열기, MusicXML 저장·사본 및 MIDI와 PDF를 검증했다. 원본을 포함한 MusicXML 24건이 고정 XSD를 통과했다. 8건의 MIDI가 수정 전 바이트와 같으며 PDF 8건은 동일한 A4 한 페이지 이미지였다. 대표 PDF를 직접 확인했다. 파일 대화상자는 응답 어댑터를 사용했다. 근거는 `out/parity-qa/positioned-clef-focused-{red,green}.log`, `positioned-clef-ui-*/`, `positioned-clef-outputs-checked.json`과 `positioned-clef-musescore-z_ismoqu/`에 있다.

갱신한 설명서를 포함해 다시 빌드했다. 두 폭 실제 앱에서 도움말 → 사용설명서 → 악보 구성의 안내 문구를 읽고 Escape로 닫았으며 설명서 App 검사 4건도 통과했다. `out/parity-qa/positioned-clef-current-help/`에 결과와 캡처가 있다.

## 옥타브 음자리표와 악기 이조의 독립 교환

B♭ 클라리넷의 기보 이조 −2에서 G의 위·아래 8을 사용한 파일과 일반 음자리표 대조를 비교했다. 두 입력이 고정 XSD를 통과했다. Studio의 모델·출력 및 MuseScore의 정상 CLI MIDI에서 음높이 53·77·65, 시작 0·4·8박이 일치했다. 각 앱 안에서 대조 두 MIDI는 바이트가 같았다. 음 길이는 Studio 4박, MuseScore 1919/480박이다. `out/parity-qa/clef-instrument-transposition-musescore-nfhxk1db/`의 실제 파일과 `probe-clef-instrument-transposition.ts`에 근거가 있다. 실음 보기의 편집과 PDF, 꾸밈음 발음의 기본값은 제품 결정 대기다.


## 음자리표 수정까지 누적 전체 검사

`npm run test:all`은 1,821.26초 만에 종료 코드 0을 반환했다. Vitest 788파일·7,545건과 Node-native 5건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. 실행 종료와 종료 뒤 독립 검사에서 고정 입력 6,583개가 모두 일치했다. `out/parity-qa/positioned-clef-full-stamp/`에 실제 결과·종료 기록·독립 해시 대조가 있다.


## 파트보 묶음 쉼표와 옥타브 변화량 0

첫 세 마디의 온마디 쉼표 뒤에 C5가 오는 세 MusicXML을 사용했다. 2마디에서 G2의 옥타브 변화량을 `0`으로 명시하면 생략한 시료와 기보·MIDI가 같은데도 쉼표 1마디와 2마디로 나뉘었다. 실제 위 8 변경과 동일하게 분리되던 것을 960×750·1400×750의 공개 파트보 메뉴, PDF 기호 좌표와 출력으로 재현했다. 기존 파트보 묶음 판단에서 생략과 0을 동일하게 비교한다. 명시적 위 8은 계속 묶음을 나눈다.

수정 전후 24개의 일반·묶음 PDF가 각각 한 페이지였다. 수정된 0 시료는 생략 시료와 래스터가 같고, 실제 위 8 및 생략 시료의 출력은 전후에 일치했다. 0 시료의 전후 이미지와 위 8 대조를 직접 확인했다. Native 저장·재열기, 일반 PDF, 기본 MusicXML과 MIDI는 각 입력에서 전후 동일했다. 실제 XML 출력 24건이 고정 XSD를 통과했다. Focused 4파일·45건과 타입 포함 생산 빌드를 확인했다. 앞의 누적 7,545건은 이 파트보 변경 전이다. 저장 대화상자는 대조 어댑터를 사용했다.

MuseScore 4.7.5의 MusicXML 변환과 별도 MSCX 대조 PDF는 SIGABRT로 끝나 참고 출력에서 제외했다. 실제 비교는 `out/parity-qa/nonchanging-clef-rests-checked.json`, 단위 실패와 결과는 `nonchanging-clef-rests-unit-red.log`, `nonchanging-clef-rests-focused.log`, PDF는 `nonchanging-clef-rests-ui-*/`에 있다. 사용자 데이터나 기준 이미지를 갱신하지 않았다.


## 가져온 음자리표의 종류와 줄 표시

MusicXML로 가져온 G1·F3·C1이 올바른 줄에 그려지지만 팔레트에는 모두 ‘기타 음자리표’로 표시됐다. 960×750 dark와 1400×750 light에서 같은 입력의 대상 마디를 Electron 포인터 이벤트로 선택해 재현했다. 네 기본 프리셋 외의 높은음·낮은음·가온음자리표는 현재 음자리표의 종류와 아래에서 센 줄을 보여준다. 팔레트·마디 속성·현재 보표의 공통 설명을 사용한다.

관련 App 단위 실패 3건 뒤 3파일·31건과 타입 포함 생산 빌드가 통과했다. 실제 두 폭에서 마디 선택 6개 경로로 팔레트와 마디 설정의 같은 이름·줄을 비교했다. 기본 프리셋 4개는 선택되지 않은 상태였고 열람한 뒤 저장한 Native와 원본은 비교 전후에 일치했다. 960px에서 자동 스크롤로 버튼을 화면에 올리려던 첫 검증은 실패했다. 이후 팔레트 내부에 실제 휠 이벤트를 보내고 좌표와 hit를 확인한 뒤 열었다. 실패 로그와 수정 후 캡처는 `out/parity-qa/imported-clef-labels-ui-*/`에 있다. 현재 보표 필드는 App 검사에서 확인했다.

Studio profile·fixed-canvas 검사는 음자리표 줄 생략 빌드와 최신 두 후속 수정의 빌드에서 모두 통과했다. 두 profile 캡처·측정값과 1400px fixed-canvas 캡처는 전후 바이트가 같았다. 960px fixed-canvas는 오른쪽 상단 UI 아이콘에서 21픽셀이 달랐고 악보 영역은 일치했다. 기존 기준을 갱신하지 않았다. `out/parity-qa/clef-cumulative-snapshots-match.json`과 두 빌드의 검사 폴더에 비교를 남겼다.


## MusicXML 끝 박의 이조를 다음 마디에 적용

B♭ 악기의 이조를 2마디 끝에서 0으로 해제하는 MusicXML을 두 폭 실제 앱에서 열었다. 수정 전 MIDI 음높이는 단독 블록에서 58·60·60·62·60·62였고, 같은 `divisions`를 시작에 중복하면 58·60·58·60·58·60이었다. MusicXML의 속성 변경은 악보의 시간 위치를 따른다. 이조 값은 기보음에 더해 실음을 계산하며 번호가 없으면 파트의 모든 보표에 적용한다. 마디 경계는 Studio 모델로 표현할 수 있다. [MusicXML attributes](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/) · [MusicXML transpose](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/)

이제 정확히 끝 박에 해당하는 변경은 다음 마디에 이어진다. 앞 마디는 시작 이조를 유지하며, 다음 마디의 명시적 시작 이조가 우선한다. 여러 보표에 공통으로 적용할 때는 실제로 모두의 마디 경계인 경우를 사용한다. 못갖춘마디는 실제 길이를 사용한다. 시작과 끝 사이의 변경은 기존 위치 손실 진단 범위를 따르고, 다음 마디가 없으면 해당 변경을 현재 재생에 소급하지 않고 경고를 남긴다.

단위 회귀 세 건을 먼저 재현했고, 못갖춘마디와 마지막 마디를 포함한 이조 검사 18건과 타입 포함 생산 빌드가 통과했다. 960×750 dark와 1400×750 light에서 중복 유무와 다음 시작에 직접 적은 대조의 여섯 가져오기 경로에서 Native 저장·재열기, MusicXML 저장·사본, MIDI와 PDF를 검증했다. 세 경우의 기보 C4·D4, MIDI 58·60·58·60·60·62, 0–5박 시작과 각 1박 길이가 일치했다. 입출력 MusicXML 18건이 고정 XSD를 통과했고 실제 PDF 래스터 여섯 장은 같았다. 대표 PDF를 직접 검토했다. OS 파일 대화상자는 응답 어댑터를 사용했다.

정상 종료한 MuseScore 4.7.5 MIDI에서 직접 실음으로 적은 대조는 Studio와 모든 음높이·시작 박이 같고 길이는 479/480박이었다. 중복 블록 원본, 다음 마디 시작 대조와 새 Studio XML을 읽은 MuseScore는 끝 두 음에도 이전 이조를 사용했다. 단독 블록 외부 변환은 SIGABRT였고 파일은 증거에서 제외했다. 근거는 `out/parity-qa/tail-transposition-checked.json`, `tail-transposition-external-a1jcpvv2/`, `tail-transposition-export-external-anlmttqz/`와 `tail-transposition-ui-*/`에 있다. 실음 보기와 꾸밈음 기본값은 별도 결정 범위다.


## 마디 끝 이조까지 누적 전체 검사

`npm run test:all`은 1,831.75초 만에 종료 코드 0을 반환했다. Vitest 788파일·7,555건과 Node-native 5건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. 종료 뒤 독립 대조에서 고정 입력 6,583개가 일치했다. `out/parity-qa/tail-transposition-full-stamp/`에 실행 로그·receipt·종료 뒤 해시 비교가 있다. 이 실행 뒤에 코드 심벌 이름과 간격을 수정했다.

## MusicXML 코드 이름과 마디선 간격

MusicXML에서 `sus2`, `9`, `6`, `m6`, `aug`, `m7b5`, `5`, `dim7`의 종류를 가져올 때 근음과 베이스가 빠지는 것을 재현했다. W3C의 종류와 표시 접미사를 기존 코드 이름 조합에 추가했다. 사용자 지정 전체 이름과 코드 입력 문법은 기존 동작을 유지한다. 명시적 접미사와 생략의 두 입력에서 MuseScore 4.7.5 정상 PDF도 같은 여덟 이름을 표시했다. Studio가 다시 내보낸 구조 유지 XML의 정상 MuseScore PDF에서도 확인했다. 직접 변환에서 SIGABRT로 끝난 출력은 제외했다. [MusicXML kind](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/kind/) · [MusicXML kind-value](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/kind-value/)

복원된 `Dbsus2/Ab`와 `Db9/Ab`는 인접 마디에서 화면상 약 19.3 SVG 단위 겹쳤다. 글자의 실제 잉크를 같은 악보단·보표의 마디선 양쪽으로 옮겨 화면과 PDF에 약 8.4 단위 간격을 확보했다. 같은 마디의 기존 리듬 배치와 겹치지 않는 기호의 위치는 보존한다. 새 충돌 없이 양쪽 마디에 들어가는 경우에만 이동하며, 선택 영역도 글자와 함께 움직인다. 아주 긴 이름이나 여러 마디에 걸친 밀집 배치는 별도 범위다.

가져오기 실패 8건을 먼저 확인했다. 종류·클립보드 관련 5파일·114건과 간격·공유 리듬·스키마 집중 5파일·71건이 통과했다. 타입 포함 생산 빌드와 Studio profile·fixed-canvas가 통과했고 baseline은 갱신하지 않았다. 960×750 dark와 1400×750 light의 네 경로에서 Native 저장·재열기, 두 입력 변형, MusicXML 구조 사본과 MIDI·PDF를 검사했다. 원본과 구조 사본 8건이 고정 XSD를 통과했다. 간격 수정 전후 Native 악보·MusicXML·MIDI가 일치했고, 가져오기 이름 수정 전후의 MIDI도 같았다. 네 PDF는 A4 한 페이지이며 래스터가 일치했다. 대표 PDF의 여덟 이름과 마디 경계를 직접 검토했다. 두 폭에서 이동한 첫 코드 심벌의 실제 hit에 Electron 포인터를 보내 올바른 ID가 선택되는 것도 확인했다. 이 결과는 `harmony-bar-clearance-pointer/`에 있다.

설명서를 포함한 생산 빌드의 두 폭에서 도움말 → 사용설명서 → 파일과 출력의 코드 예를 읽고 Escape로 닫았다. `out/parity-qa/harmony-bar-clearance-current-help/`에 캡처와 경로 결과가 있다.

근거는 `out/parity-qa/harmony-standard-kinds-{focused,build}.log`, `harmony-standard-kinds-checked.json`, `harmony-bar-clearance-gap-red/`, `harmony-bar-clearance-green-*/`과 `harmony-bar-clearance-checked.json`에 있다. MuseScore의 정상 원본 PDF와 정상 구조 사본 PDF는 `harmony-standard-kinds-9sckl3m0/`와 `concert-native-view-qhba92qf/structure/`에 있다. OS 파일 대화상자는 응답 어댑터를 사용했다.


## 코드 심벌까지 누적 전체 검사

`npm run test:all`은 1,825.82초 만에 종료 코드 0을 반환했다. Vitest 788파일·7,565건과 Node-native 5건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. 종료 후 독립 해시 검사에서 고정 입력 6,583개가 모두 일치했다. `out/parity-qa/harmony-bar-clearance-full-stamp/`에 결과 본문과 두 종료 확인이 있다. 옥타브선의 다음 수정은 이 실행 뒤에 적용했다.

## 옥타브선 경계의 임시표 보존

기보된 C♯ 뒤의 화음·꾸밈음에 8va를 적용하고, 선에서 올린 F♯ 뒤에 원래 옥타브의 F를 이어 놓았다. 수정 전 내부 타임라인과 실제 MIDI에서 화음의 C♯과 끝 F♯이 각각 반음 낮았고, MusicXML의 꾸밈음도 C♮로 출력됐다. 선 안의 C♯이 옮겨진 옥타브의 뒤 제자리음을 반음 올리던 별도 대조도 재현했다.

옥타브를 바꾸기 전의 임시표를 원래 성부의 문맥에서 결정한다. 이동 후 문맥이 달라지는 음에만 필요한 임시표를 고정하고 옥타브선 앞뒤, 화음 구성음과 꾸밈음에 같은 기준을 적용한다. 원본 프로젝트의 음표와 선, 발음 설정 및 PDF 기보는 유지한다. MusicXML은 재생 음높이를 쓰고 옥타브선으로 기보 위치를 표시한다. [MusicXML 옥타브선](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-shift/) · [MuseScore 옥타브선](https://handbook.musescore.org/notation/pitch/octave-lines)

단위 실패 두 건 후 집중 6파일·138건과 타입 포함 생산 빌드가 통과했다. 960×750 dark와 1400×750 light의 실제 앱에서 Native 저장·재열기의 악보 본문을 비교했다. MIDI의 음높이는 61·79·73·78·66, 시작은 0·1·1·2·3박, 지속은 모두 1박이었다. 구조 유지 MusicXML을 다시 열어 저장한 MIDI는 직접 내보낸 파일과 바이트가 같다. 전후 XML 네 건이 고정 XSD를 통과했다. 화면의 음표별 잉크 좌표와 PDF 네 페이지는 전후 동일했으며 대표 PDF를 직접 확인했다. 파일 대화상자는 응답 어댑터를 사용했다.

같은 실음을 옥타브선 없이 직접 쓴 대조의 MuseScore 4.7.5 정상 MIDI에서 다섯 본음의 음높이·시작 박이 일치했다. MuseScore는 별도로 꾸밈음 73을 0.5박에서 연주했다. 옥타브선이 있는 두 XML 변환은 SIGABRT여서 외부 왕복 근거에서 제외했다. 원래 오류와 수정 결과는 `out/parity-qa/octave-context-vitest-red.log`, `octave-context-ui-{red,green}/`, `octave-context-checked.json` 및 `octave-context-external-usuu66pf/`에 있다.

같은 악보를 한 마디 두 번 반복으로 만들어 실제 두 폭에서 구조 유지·반복 펼치기 XML과 Native·MIDI·PDF를 검사했다. 출력 XML 네 건이 고정 XSD를 통과했다. 펼친 XML에는 반복 표식이 없고 옥타브선은 두 번 재현됐다. 다시 가져온 MIDI가 원본의 실제 10음 MIDI와 바이트가 같다. 두 폭의 PDF 래스터가 같고 대표 한 쪽을 직접 검토했다. 결과는 `out/parity-qa/octave-context-repeat-ui/checked.json`에 있다. 또한 score-core·MusicXML·재생·MIDI 221파일·2,748건이 통과했고 외부 opt-in 1파일·1건을 건너뛰었다. `out/parity-qa/octave-context-related.log`에 범위가 있다.


최신 도움말을 포함해 빌드한 뒤 두 폭에서 표기와 표현 → 옥타브선의 임시표 안내와 Escape 닫기를 실제 앱에서 확인했다. Studio profile과 fixed-canvas도 통과했다. `out/parity-qa/octave-context-current-help/`와 `octave-context-current-snapshots/`에 결과가 있고 기존 baseline은 유지했다.


## MusicXML 끝 박의 조표를 다음 마디에 적용

2/4 악보의 둘째 마디 끝에 F장조를 선언하고, 셋째 마디 시작에 같은 조표를 적은 입력과 비교했다. 수정 전 단일 속성 블록은 플랫을 둘째 마디로 앞당겼고, 빈 시작 위치에서 divisions를 따로 반복한 입력은 변경을 놓쳤다. 마디 끝의 실제 박을 확인하고 다음 마디에 조표를 넘긴다. 실제 못갖춘마디 길이, 번호가 지정된 보표만의 적용, backup 뒤의 다음 마디 시작 조표 우선순위를 검사했다. 마지막 마디 뒤와 실제 마디 내부의 위치를 보존하지 못하면 조표 진단에 원래 보표·박·값을 남긴다. [MusicXML 속성](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/) · [MusicXML 조표](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/key/)

실패 5건 후 집중 4파일·71건과 관련 223파일·2,755건이 통과했다. 외부 opt-in 1건은 건너뛰었다. 타입 포함 생산 빌드 뒤 960×750 dark와 1400×750 light에서 세 입력의 여섯 경로를 검증했다. 플랫 글리프는 셋째 마디에 있고 앞 두 마디 음머리의 상대 높이는 같았다. Native 저장·재열기, 실제 XML 저장·구조 사본, MIDI와 PDF를 확인했다. 실제 입력과 출력 XML 18건이 고정 XSD를 통과했다. MIDI 65·71·65·71·65·70 및 시작 0–5박과 지속 1박, 구조 XML과 단일 페이지 PDF의 래스터는 세 입력·두 폭에서 일치했다. 대표 PDF를 직접 검토했다. 별도 마디 내부 입력은 두 폭의 상태줄·기술 정보에서 한국어 경고와 원본 경로·조표 값을 확인했다. 파일 대화상자는 응답 어댑터를 사용했다.

MuseScore 4.7.5의 정상 재출력에서 시작에 직접 적은 대조군도 셋째 마디의 플랫을 보존했다. 정상 MIDI의 원본 단일 끝 설정·다음 시작 대조·Studio 구조 사본에서 6음의 음높이와 시작이 일치했다. Studio 음가는 1박이고 외부 출력은 479/480 또는 91/96박이었다. 분리 입력의 MIDI 및 일부 XML 변환은 SIGABRT여서 산출물을 제외했다. 재현·결과는 `out/parity-qa/closing-key-unit-red.log`, `closing-key-checked.json`, `closing-key-*-{red,green}/`, `closing-key-position-warning/`와 `closing-key-external-*/`, `closing-key-export-*/`에 있다.

최신 도움말을 포함한 빌드의 두 폭에서 파일과 출력의 조표 변경 안내와 Escape 닫기를 확인했다. Studio profile·fixed-canvas가 통과했고 기존 baseline은 유지했다. `out/parity-qa/closing-key-current-help/`와 `closing-key-current-snapshots/`에 결과를 남겼다.


## MusicXML 끝 박의 박자표·조표·이조 묶음

2/4의 둘째 마디 끝에 3/4·F장조·−2반음 이조를 함께 넣었다. 수정 전 단일 블록은 둘째 마디가 짧다고 거부했다. 시작 divisions를 별도로 쓴 동일 입력은 셋째 마디가 넘친다고 거부했다. 원래 시작 박자표로 낡은 마디의 경계를 구하고, 끝 박의 박자표·조표·이조를 다음 마디에 넘긴다. 지시가 여러 보표를 대상으로 하면 모두에서 경계가 맞는지 확인한다. 마지막 마디 뒤나 실제 마디 내부의 박자표 위치를 보존할 수 없으면 한국어 경고와 기술 정보를 제공한다. [MusicXML 속성](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/)

실패 2건 후 집중 73건, 관련 221파일·2,755건과 타입 포함 생산 빌드가 통과했다. 외부 opt-in 1건은 건너뛰었다. 수정 전 실제 앱도 두 파일을 거부했다. 수정 후 960×750 dark와 1400×750 light에서 끝 박의 단일/분리 설정과 다음 마디 시작에 직접 적은 대조의 6경로를 열었다. 세 번째 마디의 3/4와 플랫 글리프, 7박 재생, Native 저장·재열기를 확인했다. 입력·실제 저장/사본 XML 18건이 고정 XSD를 통과했고 구조 XML·MIDI·PDF 래스터가 모두 일치했다. 대표 PDF를 검토했다. 마디 내부 입력의 두 폭에서 공개 기술 정보의 경고 경로와 박자 분자를 확인했다. OS 파일 대화상자는 응답 어댑터를 사용했다.

Studio MIDI는 65·71·65·71·63·68·58을 0–6박에서 각 1박 연주했다. MuseScore 4.7.5의 정상 종료한 두 끝 박 원본과 Studio 구조 사본은 앞 네 음과 시작을 재현했으나 끝 세 음을 기보값 65·70·60으로 냈다. 실제 실음을 직접 적은 대조의 정상 MIDI는 Studio와 7음의 음높이·시작이 일치했다. 외부 지속은 479/480박이었다. 다음 시작 원본의 외부 변환은 SIGABRT로 끝나 산출물을 제외했다. `out/parity-qa/closing-meter-checked.json`, `closing-meter-*-{red,green}/`, `closing-meter-position-warning/`와 `closing-meter-external-*/`, `closing-meter-export-external-*/`, `closing-meter-direct-reference-*/`에 근거가 있다.

최신 도움말을 포함한 실제 앱의 두 폭에서 파일과 출력의 박자표 변경 안내와 Escape 닫기를 확인했다. Studio profile·fixed-canvas가 통과했고 기준 이미지는 그대로다. `out/parity-qa/closing-meter-current-help/`와 `closing-meter-current-snapshots/`에 증거가 있다.


MuseScore 4.7.5 소스에서는 첫 가져오기 단계가 이조 간격을 박 위치별로 읽고, 두 번째 단계가 악기와 악기 변경에 그 위치의 값을 적용한다. 다른 음표 악기 참조를 사용해도 같은 프로그램의 두 악기로 바꾼 정상 대조는 늦은 이조를 반영하지 않았다. 같은 참조 대조와 실제 플루트·클라리넷 종류를 바꾼 두 대조는 종료 때 mutex 오류로 SIGABRT였으며 음높이 검증에서 제외했다. `out/parity-qa/closing-meter-instrument-ids-brcmvj5b/`와 `closing-meter-real-instrument-80613avo/`에 원본과 결과가 있다. 악기 참조만으로 외부 호환성을 보장할 수 없다는 범위를 실행 큐에 남겼다. [MuseScore 4.7.5 이조 정보 읽기](https://github.com/musescore/MuseScore/blob/v4.7.5/src/importexport/musicxml/internal/import/importmusicxmlpass1.cpp#L2918-L2941) · [MuseScore 4.7.5 악기에 이조 적용](https://github.com/musescore/MuseScore/blob/v4.7.5/src/importexport/musicxml/internal/import/importmusicxmlpass2.cpp#L622-L695)

## 조표·박자표 경계까지 누적 전체 검사

`npm run test:all`은 1,823.63초 만에 종료 코드 0을 반환했다. Vitest 788파일·7,574건과 Node-native 5건이 통과했다. 외부 앱 opt-in 1파일·1건을 건너뛰었다. 종료 직후 별도 해시 검사에서 고정 입력 6,583개가 모두 일치했다. 결과 본문·receipt·독립 확인은 `out/parity-qa/closing-meter-full-stamp/`에 있다. 이 절과 후속 수용 기준을 검사 종료 뒤 문서에 반영했다.


## MusicXML 조표와 박자표의 표시 손실 안내

조표의 숨김과 기호별 옥타브, 박자표의 숨김과 C·알라 브레베 같은 기호 지정은 현재 표시 모델에 남지 않는다. 수정 전 입력에 한국어 안내가 없었다. 조표·박자표별로 손실을 알려 주고, 기술 정보에 원래 파트·마디·속성 경로와 숨김·옥타브·기호 값을 남긴다. 명시적인 보임과 숫자 박자표는 기본 표현과 같아서 별도 안내가 없다. [MusicXML 조표 기호의 옥타브](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/key-octave/) · [MusicXML 박자표 표시](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/)

집중 실패 3건 뒤 128건과 타입 포함 생산 빌드가 통과했다. MusicXML·관련 가져오기 경로 167파일·2,160건을 확인했고 외부 opt-in 1건을 건너뛰었다. 960×750 dark·1400×750 light에서 원본 네 경고, 기술 정보의 첫 조표 경로·옥타브와 정상 숫자 대조의 경고 없음, Native 저장·재열기를 확인했다. 입력과 출력 XML 12건이 고정 XSD를 통과했다. 음높이 66·70, 시작 0·4박과 지속 4박, XML·MIDI 및 한 페이지 PDF 래스터는 수정 전후와 숫자 대조에서 일치했다. 저장 대화상자는 응답 어댑터를 사용했다.

MuseScore 4.7.5의 정상 재출력은 C·알라 브레베 기호와 둘째 마디의 조표·박자표 숨김을 보존했다. 첫 조표의 `key-octave`는 빠졌다. 정상 MIDI의 음높이·시작은 Studio와 같고 지속은 1919/480박이었다. 외부 PDF의 직접·묶음 출력은 SIGABRT여서 근거에서 제외했다. 결과는 `out/parity-qa/signature-appearance-checked.json`, `signature-appearance-*-{red,green}/`, `signature-appearance-external-*/`에서 확인할 수 있다.

## 묶음 박자표 가져오기 안내

고정 XSD를 통과한 `3+2/8`과 `2/4 + 3/8`을 실제 앱의 두 폭에서 열었다. 기존에는 일반 가져오기 실패만 알려 줬다. 같은 길이의 숫자 대조 `5/8`과 `7/8`은 각각 2.5박과 3.5박으로 열린다. 묶음 박자표를 여는 경우 지원 범위를 한국어로 안내하고 기술 정보에 원래 분자와 분모를 남긴다. 기존 작업 문서와 가져오기 승인 범위를 유지한다. 일반 숫자 값 오류에는 기존 진단을 사용한다. [MusicXML 합성 박자표](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/)

MuseScore 4.7.5는 `3+2/8`을 XML 왕복에서 보존했다. 정상 MIDI는 5/8 대조와 같은 다섯 음, 시작 0·0.5·1·1.5·2박이었다. 이 대조의 빔도 양쪽에서 3+2로 나뉘었다. 혼합 분모 입력은 정상 XML 재출력에서 마디의 일곱 음을 유지했지만 박자표가 3/8로 바뀌었고, 숫자 7/8 대조와 빔 구성이 달랐다. 해당 외부 MIDI는 SIGABRT라 비교에서 제외했다. `out/parity-qa/meter-grouping-*-ui/`, `meter-grouping-external-ze1t1jur/`에 실제 비교가 있다.


묶음 입력의 단위 실패 2건 후 집중 102건과 합본 MusicXML·관련 App 168파일·2,166건이 통과했다. 외부 opt-in 1건을 건너뛰었다. 타입 포함 생산 빌드와 Studio profile·fixed-canvas를 확인했다. 실제 960×750 dark 및 1400×750 light에서 두 원본을 여는 네 경로의 한국어 진단과 공개 기술 정보의 원래 분자·분모를 확인했다. 가져오기 실패 전후 비교에서 현재 악보·선택·수정 횟수·재생 위치와 Native 악보 본문이 같았다. 두 폭에서 도움말 두 문단과 Escape 닫기를 확인했다. `out/parity-qa/meter-grouping-*-verified/`, `meter-grouping-current-related.log`와 `meter-grouping-current-snapshots/`에 결과가 있다. 누적 7,574건은 이 두 진단 변경 전 실행이다.

## MusicXML 정수 반음의 소수 표기

같은 반음 값을 `+1.0`, `-.0`, `-1.`, `-2.00`으로 적은 MusicXML이 열리지 않는 문제를 수정했다. 본음·화음·꾸밈음의 음높이, 코드 심벌의 근음·베이스와 악기 이조에 적용한다. 소수부에 0이 아닌 자릿수가 있으면 숫자로 바꾸기 전에 확인해 반올림을 막는다. 지원하지 않는 미분음은 가져오기 오류와 원래 XML 값을 표시한다. [MusicXML 반음 값](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/semitones/)

실패 11건을 재현했고 수정 후 집중 4파일·84건이 통과했다. 타입 검사를 포함한 생산 빌드에서 960×750 dark와 1400×750 light를 각각 열었다. 정수 표기와 소수 표기의 네 경로에서 Native 재열기와 저장·구조 유지 MusicXML·MIDI·한 페이지 PDF의 일치를 확인했다. 입력과 출력 XML 12건 및 미분음 입력 1건이 고정 XSD를 통과했다. MIDI의 음높이는 64·63·64·68이고 시작은 0·1·2·3박이며 모두 1박 지속이다. 대표 PDF의 조표·제자리표·플랫과 Dbm/A#을 직접 확인했다. 0.999999999999999999는 두 화면 폭에서 원래 값을 오류에 표시하고 현재 악보·선택·수정 횟수·재생 위치를 유지했다. 두 폭에서 오류 후 정상 파일 재시도와 앱 도움말의 설명 및 Escape 닫기를 확인했다.

MuseScore 4.7.5의 정상 종료한 두 대조에서 멜로디는 정수 표기 64·63·64·68, 소수 표기 66·65·66·71이었다. 두 MIDI에 있는 코드 심벌 반주를 멜로디와 구분했다. 기본 정수 대조는 이조 및 코드 심벌의 임시표를 다시 XML에 썼고 소수 입력의 외부 XML에서는 해당 설정이 빠졌다. 시작 위치는 같은 0–3박이고 각 멜로디 음은 479/480박이다. 실제 Studio 사본의 외부 검증은 PDF/MIDI/XML 일괄 변환과 임시 프로필의 MIDI 단독 변환이 SIGABRT로 끝났다. 이 두 산출물은 비교에서 제외했다.

재현·검증·해시는 `out/parity-qa/integral-semitones-*`와 `concert-display-private-tmp-comyk97f/results.json`에 있다. 외부 앱 직접 조작·청음 또는 Studio 사본의 정상 외부 변환은 미검증이다.

## MusicXML의 더하기 기호가 붙은 정수

정수 값 앞에 `+`가 붙은 MusicXML을 읽도록 수정했다. 조표, 옥타브, 온음계·옥타브 이조, divisions와 음가에서 단위 실패 6건을 재현했다. 정수로 읽는 기존 필드의 범위와 안전한 정수 검사는 유지하며, 문자·중복 마디 번호 정규화와 묶음 박자표 검사는 기존 경로를 사용한다.

수정 후 집중 3파일·89건과 타입 검사를 포함한 격리 생산 빌드가 통과했다. 960×750 dark와 1400×750 light에서 플러스 기호 입력과 일반 정수 입력의 네 경로를 확인했다. Native 재열기, MusicXML 저장·사본, MIDI 바이트 및 한 페이지 PDF의 래스터가 일치했다. 고정 XSD는 각 경로의 입력·출력 12건을 확인했다. MIDI 멜로디는 76·75·76·80, 시작 0·1·2·3박, 지속은 각 1박이다. 대표 PDF에서 같은 조표·임시표와 코드 이름을 직접 검토했다.

MuseScore 4.7.5의 정상 종료한 일반 정수 대조에서도 멜로디 네 음과 시작 박이 일치했다. 길이는 각 479/480박이다. 플러스 기호 입력은 SIGABRT였다. 해당 산출물은 비교에서 제외했으며 MuseScore의 플러스 기호 입력은 검증 대기다. `out/parity-qa/signed-integers-*`와 `concert-display-private-tmp-zh74d4b3/results.json`에 기록했다.

현재 격리 빌드의 Studio profile과 fixed-canvas가 통과했다. 기준 이미지는 갱신하지 않았다. 별도의 출력이 많은 관련 검사 실행은 전체 검사에 앞서 자체 종료했고 결과 건수에는 포함하지 않았다. 원본 로그는 `integral-semitones-related.log`에 있다.

## 숫자 표기 호환까지 누적 전체 검사

`npm run test:all`은 종료 0이었다. Vitest 788파일·7,598건과 Node-native 5건이 통과했다. 외부 opt-in 1파일·1건을 건너뛰었다. 전체 실행 1,814.88초 동안과 종료 후 독립 검사에서 고정 입력 6,583개의 해시가 일치했다. 결과는 `out/parity-qa/signed-integers-full-stamp/`의 실제 로그·receipt·독립 검사에 남겼다. 이 검사는 아래 특수 임시표 경고 변경 전에 실행했다.

## MusicXML 특수 임시표 기호 손실 안내

`natural-sharp`과 `other`로 지정한 SMuFL 기호가 기본 샤프로 바뀌는데도 안내가 없었다. 960px 실제 앱과 단위 실패 2건으로 재현했다. 기존 임시표 외형 경고에 해당 파트·마디·음표와 원래 기호 및 SMuFL 이름을 표시한다. MusicXML에 적힌 재생 음높이는 유지하고, 현재와 같은 표준 기호를 명시한 입력은 이 사유로 경고하지 않는다. [MusicXML 임시표](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/accidental/)

집중 4파일·77건, 관련 167파일·2,186건과 타입 포함 생산 빌드를 확인했다. 관련 검사에서 외부 opt-in 한 건을 건너뛰었다. 960×750 dark 및 1400×750 light에서 일반 샤프·특수 기호·기본/대체 SMuFL의 총 여덟 경로를 확인했다. 두 특수 기호의 원래 값이 기술 정보에 표시됐고 두 기본값은 경고가 없었다. 여덟 경로의 음악 데이터, Native 재열기, MusicXML 저장·사본·MIDI·한 페이지 PDF가 일치했다. 원본 및 출력 XML 24건은 고정 XSD에 적합했다. 대표 PDF·경고 화면을 직접 검토하고 양쪽 폭의 앱 도움말과 Escape 닫기를 확인했다.

MuseScore 4.7.5의 정상 종료한 일반 샤프와 `natural-sharp` 입력 모두 재출력 XML의 첫 기호가 일반 샤프였고 PDF 상단 래스터가 일치했다. MIDI 멜로디 음높이 64·63·64·68과 시작 박 0–3도 일치했다. 대체 SMuFL의 외부 변환은 SIGABRT였고 산출물을 비교에서 제외했다. 원래 기호의 복원·편집과 실제 청음, OS 파일 대화상자는 미검증이다. 기록은 `out/parity-qa/accidental-glyph-*`와 `concert-display-private-tmp-no4f9zwj/results.json`에 있다.



## 앞꾸밈음 발음의 Studio 오프라인 렌더링

Studio 피아노 샘플러와 4/4 반복의 후보 타임라인으로 WAV 아홉 개를 만들었다. 첫 박과 반복 복귀에서 사선·일반 4분 본음·짧은 8분 본음의 B♭5 발음과 지연된 C5를 실제 렌더링으로 확인했다. 정상 종료한 MuseScore 4.7.5 Native WAV의 첫 박 및 복귀에서도 해당 대역을 확인했다. 기존 샘플 준비에 B♭5가 빠져 발음이 거부됐고, 같은 후보 타임라인에서 피아노 음높이를 모으면 준비와 발음이 모두 통과했다. 재생 연결의 수용 기준에 이 조건을 추가했다. [재생 설계와 파형 근거](grace-playback-proposal.md#studio-피아노-샘플러의-오프라인-발음-대조)

기존 재생·선택·캐시·MusicXML 회귀 5파일·23건과 타입 검사가 통과했다. 실제 제품 소스나 기본 재생 정책을 바꾸지 않았다. 라이브 오디오 장치·청음·연습 루프 UI와 기존 프로젝트 기본값은 남아 있다.


## MusicXML 임시표와 음높이 값이 서로 다른 경우

첫 F에 음높이 +1과 제자리표를 같이 쓴 입력, 음높이 반음 변화는 생략하고 샤프를 쓴 입력에서 조용히 원래 기호가 빠지는 공백을 확인했다. MusicXML은 표시 임시표와 음높이를 따로 기술한다. Studio는 가져와 재생하던 음높이를 유지하면서 기존 경고에서 불일치를 한국어로 설명한다. 기술 정보에는 파트·마디·음표, 원래 기호, 원래 반음 값 또는 생략이 표시된다. 기호와 음높이가 맞는 일반·정수 소수 표기의 대조는 이 사유로 경고하지 않는다. [MusicXML 임시표](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/accidental/) · [MusicXML 음높이](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/pitch/)

960px 및 단위 두 건에서 경고 누락을 재현했다. 수정 후 집중 4파일·80건, 관련 167파일·2,189건 및 타입을 포함한 생산 빌드가 통과했다. 외부 opt-in 1건을 건너뛰었다. 960×750 dark와 1400×750 light에서 두 불일치·두 대조의 여덟 경로를 검증했다. 기술 정보·도움말·Escape, Native 재열기, 구조 XML 저장·사본과 MIDI 및 PDF를 확인했다. 고정 XSD는 입력·출력 24건을 통과했다. MIDI 첫 음은 명시한 F♯에서 64, 반음 생략의 F에서 63이다. 이후 세 음은 공통 63·64·68이다. 각 사례의 PDF 래스터와 MIDI가 해당 음높이를 직접 적은 대조와 두 폭에서 일치했다. OS 파일 선택은 어댑터를 사용했다.

정상 종료한 MuseScore 4.7.5의 두 일치 대조는 각각 Studio와 같은 음높이 및 시작 박을 사용했다. 불일치 원본 두 건과 Studio 내보내기 두 건은 외부 일괄 변환이 SIGABRT였다. 비정상 종료 산출물은 비교에서 제외했다. 이전 전체 7,598건 이후의 진단 변경은 관련 검사로 검증했다. 로그·캡처·해시는 out/parity-qa/accidental-pitch-*와 외부 대조 폴더 concert-display-private-tmp-o43umdxq, concert-display-private-tmp-q4iiv8qw에 있다.


## 실음 전환의 선택·드래그·재생 위치 검증

두 폭의 격리 검증 빌드에서 같은 베이스 클라리넷 문서를 기보와 실음으로 그렸다. 선택·초점·입력 커서의 주소와 재생 중 같은 음의 새 좌표를 확인했다. 기존 드래그를 전환에서 끊으려면 보기 모드를 기존 interactionOwner의 구분에 포함해야 한다. 일반 드래그 대조는 세 음 선택, 보기 전환 대조는 한 음 보존으로 확인했다. [실음 보기 설계와 실행 근거](concert-display-proposal.md#실음-보기에서-선택과-재생-위치를-유지하는-검증)

관련 회귀 5파일·44건과 타입 검사가 통과했다. 기보 출력을 사용한 Native·MusicXML·MIDI·한 쪽 PDF를 두 폭에서 비교했고 입력 및 출력 MusicXML 6건이 고정 XSD를 통과했다. 이번에는 제품 코드를 변경하지 않았다. 공개 전환과 실음 편집·PDF 범위는 결정 대기다.


## 창 크기 변경의 음표·쉼표 Tab 초점

960px에서 첫 음을 선택하고 Tab으로 두 번째 음에 초점을 둔 뒤 1400px로 넓혔다. 수정 전 SVG 폭이 585에서 804로 바뀌면서 두 번째 음의 초점이 첫 선택 음으로 이동했다. 960→860 시험에서는 SVG 폭 최솟값 때문에 다시 그리지 않아 실패 재현으로 집계하지 않았다. 실제 앱과 renderer 단위 회귀에서 초점이 되돌아가는 것을 확인했다.

같은 표시 악보와 논리적 선택의 다시 그리기에서는 기존 주소의 Tab 대상에 초점을 복원한다. 음표 선택이나 표기 대상이 명시적으로 바뀌면 기존 선택 경로를 따른다. 입력 초점, 읽기 전용 튜플릿 미리보기와 위치가 사라진 주소에는 기존 보호 조건을 적용한다.

타입 포함 생산 빌드에서 음표와 쉼표 각각 960→1400, 1400→960 실제 창 크기 변경을 확인했다. Tab 초점과 테두리는 두 번째 대상에 남고 첫 음의 선택도 유지됐다. Enter를 누른 뒤에만 두 번째 대상이 선택됐고 수정 횟수는 0이었다. 두 창에서 앱 도움말을 열어 설명을 읽고 Escape로 닫았다. 음표 대조의 두 폭에서 Native 본문·MusicXML·MIDI와 PDF 래스터가 이전 기보 대조와 같았다. 출력 XML 두 건과 쉼표 입력은 고정 XSD를 통과했다.

집중 27건과 관련 9파일·70건, Studio profile과 fixed-canvas가 통과했다. 기준 이미지는 그대로다. 이 변경의 전체 회귀는 아직 실행하지 않았다. out/parity-qa/note-tab-resize-cross-red.log, note-tab-resize-unit-red.log, note-tab-resize-{pitched,rest}-current/ 및 note-tab-resize-snapshots/에 근거가 있다. 외부 앱, OS 대화상자와 스크린리더 검증은 이번 경로에 포함하지 않았다.

초점 수정이 포함된 소스로 실음 검증 빌드도 다시 실행했다. 두 폭의 선택·캐럿·드래그·재생 위치와 Native·MusicXML·MIDI 비교가 통과했다. out/parity-qa/concert-runtime-focus-current/에 기록했다.

# Chromatics Expanded V1 Continuation

목표: Chromatics 확장 Commercial V1의 모든 Required 기능을 실제 전문 사보 workflow로 구현·검증·문서화하고, 필수 검증을 충족한 public release candidate까지 진행한다. 이 문서를 다음 실행 요청으로 제출하면 계획만 제안하지 말고 실제 작업을 시작한다. 개별 slice와 전체 목표의 완료를 구분한다.

## 1. 실행 상태와 작업 위치

- 목표 관리 도구로 현재 목표를 조회한다. 일치하는 활성 목표는 이어가고, 목표가 없을 때만 등록한다. 다른 미완료 목표를 덮어쓰지 않는다.
- paused/blocked 재개 기능이 없으면 한 번 알린다. 허용된 일반 작업은 계속하되 목표모드 활성화나 응답 종료 후 자동 지속을 주장하지 않는다.
- 작업 위치: `/private/tmp/chromatics-expanded-v1-20260914`.
- 브랜치: `feature/chromatics-expanded-v1-recovery-20260914`. 원래 기준 커밋은 `ff6c9c2`다. 체크포인트 커밋과 원격 tip은 실제 Git 상태로 확인한다.
- `git worktree list`, 현재 branch/status/log와 원격 상태를 확인한다. worktree가 이동되었으면 변경을 찾아 이어가며 reset/checkout/stash로 사용자 작업을 치우지 않는다.
- 원본 in-c 및 Clef·퀴즈·사이트 변경은 건드리지 않는다. 이전 커밋·푸시 승인은 이번 후속 실행의 새 커밋·푸시·머지·배포 승인이 아니다.
- 이 문서 실행은 명시적 재개 요청이다. 이후 사용자가 중지하면 새 task를 시작하지 않고 진행 중 최소 변경만 검증·정리한다. 자동 continuation을 사용자 재개로 해석하지 않는다.

## 2. 먼저 확인할 근거

- 현재 코드·테스트·미커밋 diff를 authoritative source로 삼는다. 과거 테스트 개수나 CI 통과를 현재 변경의 증거로 사용하지 않는다.
- `docs/product/chromatics-commercial-v1-work-queue.md`
- `docs/product/chromatics-expanded-v1.md`
- `docs/product/chromatics-commercial-v1-reference-gap-matrix.md`
- `docs/product/chromatics-musescore-parity-roadmap.md`
- `docs/product/chromatics-desktop-v1.md`
- `docs/product/chromatics-native-project-format.md`
- `docs/quality/known-limitations.md`
- `docs/quality/evidence-log.md`
- `docs/quality/release-readiness-checklist.md`
- `docs/quality/package-app-smoke-matrix.md`
- `docs/releases/manual-score-completion-qa.md`
- 대상 커밋의 CI가 있으면 확인하되, 이 문서 작성 시점의 개발 체크포인트를 RC 승인으로 해석하지 않는다.

## 3. 구현된 체크포인트 확인

- Native v4, v1/v2/v3 파일·autosave migration, 복구 원본 보호와 undo 가능한 독립 파트 slur/hairpin geometry가 반영되어 있는지 확인한다.
- 음악적 part/staff/measure 경계에 연결된 segment geometry, 개별 구간 편집/reset/inherit, 비활성 구간 표시·수정 차단·명시적 제거를 확인한다.
- 줄바꿈 복원 시 재적용, 마디 삭제 후 저장·undo, 마디 삽입·파트 재정렬의 경계 보존 테스트가 존재한다. 같은 구현을 반복하지 않는다.
- 실제 Electron 960/1400px inspector, native 디스크 재열기, 2페이지 PDF와 continuation/fermata/caesura 충돌 검증 harness가 있다. 광범위한 engraving 완료로 확대하지 않는다.
- 범위 clipboard는 note-attached marking을 deep clone하고, 대상 음표 교체로 무효화된 span 끝점을 같은 undo transaction에서 정리한다.
- fully-contained source slur/hairpin 복제 및 새 event ID 연결, 단일 마디 segment의 대상 part/staff/measure 재연결이 첫 구현되어 있다.
- 원래 source slur만 기대하던 cleanup 테스트는 새 copied slur까지 기대해야 한다. 실제 수정·통과 여부를 확인하고 테스트를 삭제하거나 기준을 낮추지 않는다.

## 4. 첫 작업: CV1-X-RANGE-SPAN-COPY 마무리

- `editor-state.ts`, `App.tsx`와 해당 테스트에서 현재 동작을 재현한다. 첫 구현은 전체 clipboard 완료가 아니다.
- `excludedSpanCount`, `excludedSegmentCount`를 copy/paste 결과에 연결한다. 부분 포함 span 또는 범위 밖 saved segment를 제외했으면 사용자가 결과를 알 수 있어야 한다.
- 완전히 포함된 slur/hairpin만 새 음표에 연결한다. 부분 포함 span을 임의의 가까운 음표로 재연결하지 않는다. 원본 span은 보존한다.
- 현재 한 마디 clipboard의 범위 밖 segment는 원본에서 삭제하지 않는다. 대상에서 보존 가능한 geometry와 제외한 geometry의 정책을 테스트·문서로 고정한다.
- 독립 파트보에서 복사하면 사용자가 보고 있는 effective part geometry를 사용한다. 원본 총보 geometry를 무조건 복사하지 않는다.
- part override의 object/null/absent 우선순위, 새 대상의 소속, 원본 불변성, 반복 paste의 ID 유일성을 검증한다.
- 같은 보표 다른 성부, 다른 마디, 다른 part 및 파트보→총보 전환을 포함한다. note/rest/chord와 가사·articulation 및 source span이 안전하게 연결되어야 한다.
- App에서 선택 주소, 삭제·undo/redo, native 저장·재열기, 지원되는 MusicXML export/reopen을 확인한다. mock 검증 외에 실제 renderer와 저장 파일도 확인한다.
- 동일 span을 덮어쓰는 paste, 일부 endpoint만 교체하는 paste, clipboard 복사 뒤 source 변경/삭제, 다른 문서로 전환한 paste를 감사한다.
- `sourceAddress` 등 추가했으나 사용하지 않는 metadata는 실제 필요성을 확인한다. broad refactor는 하지 않는다.
- 독립 객체 clipboard·cross-measure range·임의 tick anchor까지 완료했다고 쓰지 않는다. 이 계약들은 Required 후속 작업으로 유지한다.

## 5. 이어갈 전체 Required

- Native schema/lifecycle/recovery: portable 설정, 엄격한 migration/검증, atomic save, 백업 발견·선택·보존/정리, 실패·경쟁 조건.
- Span properties/rhythmic anchors: 임의 tick/rest/cross-staff endpoint, geometry 편집·충돌·저장·교환 계약.
- Object filters/clipboard: 가사·코드·셈여림·텍스트·span의 개별/목록/범위 선택, 음표와 독립적인 편집, 소속·anchor 재연결.
- Part layout/XML: 총보와 연결된 독립 제목·페이지·줄바꿈·조판, 구조 변경과 undo, 선택 파트 교환 및 원본 덮어쓰기 방지.
- Engraving: 마디 폭·밀도·페이지 맞춤·간격·자동 배치와 수동 override 우선순위 및 dense score 충돌.
- Concert view: 실음/기보음 보기와 입력·이조·재생·MusicXML/MIDI 일관성.
- MIDI/pitch-first: 장치 연결·재연결, step/chord 입력, duration-first와 pitch-first 상태·전환.
- Templates/styles, command search/custom shortcuts, workspace docking/size persistence, PNG/SVG page/part/range export.
- 기존 다성부·화음·잇단음표·가사·코드·반복·playback 전체 workflow 재감사.
- 문서의 Required 전체를 유지한다. 어려운 구현을 승인 없이 Post-V1/Research/QA-only로 바꾸지 않는다.

## 6. 지속 실행 루프

- 각 task에 ID, 부모 Required, 사용자 문제, 재현, 의존성, 수용 기준, 상태, 자동/수동 검증, 증거와 다음 행동을 유지한다.
- Ready 선택 → 실패 재현/테스트 → 구현 → 실제 workflow 검증 → 문서 갱신 → 다음 Ready 선택을 반복한다.
- 한두 slice, 테스트 통과, 큐 갱신, 진행 보고를 전체 종료 이유로 삼지 않는다. 발견한 누락은 등록만 하지 말고 우선순위에 따라 처리한다.
- umbrella는 전체 계약이 충족될 때만 Done이다. Ready가 비면 Partial·의존성·대표 악보·공식 기능표를 다시 감사한다.
- 한 task가 외부 앱/장비/권한에 막혀도 독립 작업은 계속한다. 승인 거절은 우회하지 않는다.
- `Selected model is at capacity` 같은 승인 서비스 오류는 제품 결함과 구분한다. 부분 적용·실행 프로세스를 확인하고 가능한 검증을 수행한다. 같은 차단으로 진전이 불가능하면 목표 도구의 연속 차단 판정 규칙을 따른다.

## 7. 검증과 증거

- MuseScore Studio 공식 handbook을 primary reference로 사용하고 URL·확인일·대상 버전/living handbook 여부를 기록한다. Finale 버전은 추측하지 않는다.
- 문서 해석, 실제 앱 관찰, mock, 실제 renderer, 디스크 파일 검증을 분리한다. 외부 fixture 출처나 수동 Pass를 만들지 않는다.
- solo·piano·ensemble·이조악기 fixture와 960/1400px에서 입력·선택·편집·undo/redo·저장·재열기·출력을 검증한다.
- 스크린샷의 클릭 영역·글자 잘림·겹침·키보드 접근성을 확인하고 PDF/PNG/SVG는 가능한 경우 렌더링한다. 실제 ink와 line box를 구분하되 실패를 기준 완화로 감추지 않는다.
- 관련 `typecheck`, targeted/full test, `build`, `verify:e2e`, `verify:visual-regression`, `verify:part-span-geometry`, MusicXML/MIDI fixture, save-policy/queue/site-content/diff gate를 실행한다.
- Electron 검증 중 `out`을 재빌드하지 않는다. 실제로 ERR_FILE_NOT_FOUND가 발생했던 경로다. 전체 App 테스트와 무거운 build/package 검증도 순차 실행한다.
- `package:dir` 완료 후 그 새 패키지에 `verify:package`를 실행한다. 최종 후보에서는 전체 관련 gate를 현재 변경 기준으로 다시 실행한다.
- 실행 명령·결과·실패·수정·재실행, 대상 커밋/미커밋 여부, artifact 경로를 evidence에 남긴다.
- 청감·물리 MIDI·외부 앱 GUI·OS 설치/서명/공증은 실제 수행 범위만 Pass로 기록한다.

## 8. 완료와 인계

- 모든 Required의 적용 가능한 입력·수정·삭제·undo·저장·재열기·출력 계약과 누락 감사가 통과해야 구현 완료다.
- 필수 수동/외부 검증까지 통과해야 public RC와 전체 목표 완료다. queue-empty나 verifier 통과만으로 complete 처리하지 않는다.
- 중단 시 worktree/branch/commit, 미완성 diff, 마지막 성공 검증, 실패·미확인 결과, 살아 있는 프로세스, 정확한 다음 task/명령을 남긴다.
- 사용자 중지와 실행 환경 제한을 존중하고 자동 재개나 무기한 실행을 보장하지 않는다. 커밋·푸시·머지·배포는 이번 후속 실행에서 별도 승인이 필요하다.
- 지금 실제 상태를 확인하고 첫 미완료 clipboard 계약부터 시작한다.

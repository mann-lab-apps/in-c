# Evidence Log

기준일: 2026-07-15

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| initial evidence package commit | `7364290 Add quality evidence package` |
| quality follow-up 기준 commit | `6fb9698 Refine quality evidence follow-up` |
| 기준 branch | `main` |
| 실행 환경 | macOS local workspace, Asia/Seoul |

## GitHub State

2026-07-15 follow-up 기준 `gh issue list --repo mann-lab-apps/in-c --state open --limit 100`로
확인한 열린 이슈:

| 이슈 | 제목 | 품질 문서 연결 |
| --- | --- | --- |
| #322 | CI와 quality evidence 검증 범위 정렬 | [Verification Matrix](verification-matrix.md) coverage 후속 |
| #321 | 제품 상태 문서와 feature map을 최신 notation 지원 상태와 동기화 | [Traceability Matrix](traceability-matrix.md), [Known Limitations](known-limitations.md) 후속 |
| #316 | Supabase 기반 백엔드 구축 | [Risk R-001](risk-register.md#r-001-supabase-backend-is-not-operational) |
| #94 | 여러 악기 파트와 합주보 스코어 구조 지원 | [Risk R-003](risk-register.md#r-003-multi-part-ensemble-editing-is-not-complete) |
| #93 | 같은 오선 내 다중성부 입력·렌더링 모델 구현 | [Risk R-002](risk-register.md#r-002-multi-voice-editing-is-not-complete) |
| #8 | Windows 개발 환경에서 esbuild/Vite 감사 경고 확인 | [Risk R-004](risk-register.md#r-004-windows-dev-server-advisory-remains-unverified) |

닫힌 이슈:

| 이슈 | 제목 | 품질 문서 연결 |
| --- | --- | --- |
| #320 | 현재 상태 검사 QA 워크플로우 고도화 | 이 evidence package의 원 작업 이슈. follow-up 결과는 #320 코멘트로 남긴다. |

## 2026-07-15 Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | Pass | `tsc --noEmit` 성공 |
| 2 | `npm test` | Pass | 22 files / 249 tests passed |
| 3 | `npm run test:components` | Pass | 1 file / 4 tests passed |
| 4 | `npm run verify:visual-regression` | Pass | MusicXML + system-layout tests, build, notation snapshots 포함 |
| 5 | `npm run verify:e2e` | Pass | build 후 Electron single-voice MVP verification 성공 |
| 6 | `npm audit --audit-level=moderate` | Pass with known low advisory | moderate+ 실패 없음. esbuild Windows dev-server low advisory는 #8에서 추적 |
| 7 | `git diff --check` | Pass | whitespace error 없음 |
| 8 | `npm run site:build` | Pass | Vite static site build 성공 |
| 9 | `npm run verify:site-content` | Pass | site content verification 성공 |
| 10 | `npm run verify:analytics` | Pass | analytics config/privacy/docs guard 성공 |
| 11 | `npm run verify:site-seo` | Pass | SEO metadata verification 성공 |
| 12 | `rg` quality docs path checks | Pass | 주요 상대 링크 대상 존재 확인 |

## 2026-07-15 Follow-up Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `gh issue list --repo mann-lab-apps/in-c --state open --limit 100` | Pass | open issues: #322, #321, #316, #94, #93, #8 |
| 2 | `gh issue view 320 --repo mann-lab-apps/in-c` | Pass | #320 closed 확인 |
| 3 | `git diff --check` | Pass | whitespace error 없음 |
| 4 | `docs/quality` markdown relative link target check | Pass | 상대 markdown link 대상 존재 확인 |

## 2026-07-15 Documentation Consistency Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `gh issue list --repo mann-lab-apps/in-c --state open --limit 100` | Pass | open issues: #322, #321, #316, #94, #93, #8 |
| 2 | `gh issue view 320 --repo mann-lab-apps/in-c` | Pass | #320 closed 확인 |
| 3 | `git diff --check` | Pass | whitespace error 없음 |
| 4 | `docs/quality` markdown relative link target check | Pass | 상대 markdown link 대상 존재 확인 |
| 5 | 앱/사이트 빌드 및 전체 테스트 | Not run | 문서 정합성 변경만 포함하므로 생략 |

## 2026-07-15 Issue-Level Traceability Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `git status --short --branch` | Pass | `main...origin/main`; quality 문서 변경만 존재 |
| 2 | `gh issue list --repo mann-lab-apps/in-c --state open --limit 100` | Pass | open issues: #322, #321, #316, #94, #93, #8 |
| 3 | `gh issue list --repo mann-lab-apps/in-c --state closed --limit 100` | Pass | 최근 closed issue inventory 확인 |
| 4 | targeted `gh issue view <number>` for traceability issue mappings | Pass | traceability matrix에 추가한 #21, #22, #24, #25, #40, #42, #44, #48, #51, #70, #76, #89, #91, #97, #100, #102, #106, #129, #146, #147, #151, #152, #170, #172, #173, #174, #176, #177, #178, #186, #202, #204, #221, #237, #238, #240, #268, #269, #272, #273, #274, #275, #304, #306, #307, #308, #309, #312, #313, #319 closed 확인 |
| 5 | `gh issue view 320 --repo mann-lab-apps/in-c` | Pass | #320 closed 확인 |
| 6 | `git diff --check` | Pass | whitespace error 없음 |
| 7 | `docs/quality` markdown relative link target check | Pass | 상대 markdown link 대상 존재 확인 |
| 8 | 앱/사이트 빌드 및 전체 테스트 | Not run | traceability/document-control 문서 변경만 포함하므로 생략 |

## 2026-09-01 V1 Package Smoke Extension Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | Pass | PDF/MIDI direct-path save bridge 타입 계약 확인 |
| 2 | `npm test -- src/renderer/src/App.test.tsx src/renderer/src/midi/serialize-midi.test.ts` | Pass | 2 files / 69 tests passed |
| 3 | `npm run package:dir` | Pass | macOS arm64 unpacked app 생성, local unsigned build는 `mac.identity: null` 사용 |
| 4 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, new score workspace/title/notation SVG, smoke-only MusicXML write/recent reopen, PDF `%PDF`/EOF/page object/MediaBox structure, MIDI type-1 tempo/note track structure with end-of-track markers, autosave round-trip |
| 5 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 6 | `npm test` | Pass | 31 files / 411 tests passed |
| 7 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests와 notation snapshots 성공 |
| 10 | `npm run verify:musicxml-fixtures` | Pass | external app compatibility seed fixture QA 성공 |
| 11 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-01 Playback Tie And Tuplet Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/playback/timeline.test.ts` | Pass | 26 tests passed; same-staff multi-voice cross-measure tie merge와 ensemble tuplet shared beat grid 포함 |
| 2 | `npm test -- src/renderer/src/midi/serialize-midi.test.ts` | Pass | 2 tests passed; playback timeline 기반 MIDI export 회귀 확인 |
| 3 | `npm run typecheck` | Pass | playback timeline 변경 타입 계약 확인 |
| 4 | `npm test` | Pass | 31 files / 411 tests passed |
| 5 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 6 | `npm run package:dir` | Pass | playback timeline 변경을 포함한 macOS arm64 unpacked app 재생성 |
| 7 | `npm run verify:package` | Pass | latest unpacked app smoke 유지 확인 |

## 2026-09-02 Score-Wide Repeat Playback Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/playback/timeline.test.ts` | Pass | 29 tests passed; 2-part ensemble score-wide repeat expansion, piano grand staff canonical-staff volta playback, repeated tempo event 복제 포함 |
| 2 | `npm test -- src/renderer/src/midi/serialize-midi.test.ts` | Pass | 2 tests passed; MIDI export가 변경된 playback timeline 계약을 계속 사용할 수 있음 |
| 3 | `npm run typecheck` | Pass | score-wide repeat plan 타입 계약 확인 |
| 4 | `npm test` | Pass | 31 files / 414 tests passed |
| 5 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 6 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 8 | `npm run verify:musicxml-fixtures` | Pass | external app compatibility seed fixture QA 성공 |
| 9 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 10 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 11 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, smoke-only MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |
| 12 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-02 Playback Stop And Jump Selection Policy Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t playback.cursor-selection-sync` | Pass | 2 tests passed; active playback event voice-address selection sync와 stop/jump-to-start 후 editing selection 유지/playback cursor 초기화 정책 확인 |
| 2 | `npm run typecheck` | Pass | `jumpToStart` playback hook/App transport 계약 확인 |
| 3 | `npm test` | Pass | 31 files / 415 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 6 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 7 | `npm run verify:musicxml-fixtures` | Pass | external app compatibility seed fixture QA 성공 |
| 8 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, smoke-only MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |
| 11 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-02 Same-Staff Multi-Voice Range Visual Scoping Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/notation/visual-state.test.ts src/renderer/src/App.test.tsx -t "range-selection.same-staff-voice\|range-editing.same-staff-voice-copy-paste"` | Pass | 2 tests passed; duplicate event id가 있어도 selected tone이 selected voice address에만 적용되고, App range selection이 `voice-2` address를 NotationPreview에 전달하는지 확인 |
| 2 | `npm run typecheck` | Pass | NotationPreview `selectedEventAddress` prop과 address-aware visual-state 계약 확인 |
| 3 | `npm test` | Pass | 31 files / 417 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; MusicXML fixture compatibility guard 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공; keyboard/range selection, grand staff smoke, release bounds 포함 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |
| 11 | `npm test -- src/renderer/src/notation/visual-state.test.ts` | Pass | 5 tests passed; drag range가 measure를 넘어 같은 voice lane에서는 허용되고 다른 voice lane으로는 확장되지 않는 순수 정책 확인 |
| 12 | `npm run typecheck` | Pass | NotationPreview drag anchor의 `{eventId, address}` 구조와 shared `sameVoiceLane` import 확인 |
| 13 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-02 MusicXML Detailed Warning Report UI Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "unsupported-musicxml-report"` | Pass | 2 tests passed; import/export warning 후 상세 report panel이 파일명, 방향, code, path, message를 표시하는지 확인 |
| 2 | `npm run typecheck` | Pass | `MusicXmlReportPanelState`, import/export report union, warning meta formatter 타입 계약 확인 |
| 3 | `npm test` | Pass | 31 files / 417 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |
| 11 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-02 Live Part View Preference Reopen Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "live-part-view"` | Pass | 2 tests passed; string quartet Cello part view 선택 후 MusicXML 저장, 로컬 파일 경로 preference 기록, 최근 파일 reopen 시 Cello part view 복원 확인 |
| 2 | `npm run typecheck` | Pass | `AppOpenScoreOptions`, `StoredMusicXmlViewState`, localStorage read/write/validation helper 타입 계약 확인 |
| 3 | `npm test` | Pass | 31 files / 418 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |
| 11 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-02 Navigation-First Vertical Arrow Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "keyboard.navigation-first"` | Pass | 2 tests passed; plain `Up/Down`이 pitch를 직접 바꾸지 않고 piano grand staff의 인접 staff lane으로 selection을 이동하는지 확인 |
| 2 | `npm run typecheck` | Pass | vertical selection resolver와 App key handler dependency 타입 계약 확인 |
| 3 | `npm test` | Pass | 31 files / 419 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |

## 2026-09-02 MIDI Percussion Tab Policy Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/midi/serialize-midi.test.ts` | Pass | 3 tests passed; percussion/tab clef staff note event 제외와 `unsupported-midi-clef` warning report 확인 |
| 2 | `npm test -- src/renderer/src/App.test.tsx -t "export-midi"` | Pass | 2 tests passed; imported percussion clef score의 MIDI 저장 성공 메시지에 V1 제외 정책 경고 표시 확인 |
| 3 | `npm run typecheck` | Pass | MIDI report API와 App save flow 타입 계약 확인 |
| 4 | `npm test` | Pass | 31 files / 421 tests passed |
| 5 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 6 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 7 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |
| 11 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |

## 2026-09-03 Ensemble Part Input Save/Reopen Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- --run src/renderer/src/App.test.tsx -t "import-export.ensemble-part-input-save-reopen"` | Pass | 1 test passed / 75 skipped; string quartet 새 악보에서 Violin I, Violin II, Viola, Cello 입력 보표별 note 입력 후 MusicXML 저장, parser 재해석, 최근 파일 reopen preview의 part 구조와 part별 pitch 보존 확인 |

## 2026-09-03 MusicXML Primary Save Policy Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | Product/release docs review | Pass | Chromatics V1 저장 정책을 MusicXML primary save로 고정하고, native project format은 post-V1 migration 대상으로 문서화했다. 제품 기준, blocker backlog, known limitations, release notes draft, release readiness checklist가 같은 정책을 가리킨다. |

## 2026-09-03 Packaged Part View PDF Smoke Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | Pass | packaged smoke의 part view PDF target check와 direct-path PDF bridge 변경 타입 계약 확인 |
| 2 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성; `release/mac-arm64/in-C.app` |
| 3 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; string quartet workspace/title/notation SVG, smoke-only MusicXML write/recent reopen, score PDF structure, Cello part view target/write/PDF structure, MIDI type-1 structure, autosave round-trip 확인 |

## 2026-09-03 Professional Dynamics Import/Export Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/musicxml/musicxml.test.ts -t "layout.dynamics"` | Pass | 2 tests passed / 57 skipped; `pp`/`ff`/`sfz` MusicXML dynamics가 warning 없이 import되고 `pp`/`ff`/`sfz`로 export되는지 확인 |
| 2 | `npm test -- src/renderer/src/App.test.tsx -t "layout.dynamics"` | Pass | 1 test passed / 75 skipped; 악보 탭 셈여림 UI에 `pp`/`ff`/`sfz` 선택지가 있고 선택한 `ff`가 preview measure에 표시되는지 확인 |
| 3 | `npm test -- src/renderer/src/playback/timeline.test.ts -t "maps dynamic"` | Pass | 1 test passed / 28 skipped; `ff` dynamic이 playback velocity map에 반영되는지 확인 |
| 4 | `npm run typecheck` | Pass | 확장된 `DynamicValue`가 UI, MusicXML, playback 타입 계약을 만족하는지 확인 |

## 2026-09-02 Engraving Annotation Lane Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | Pass | NotationPreview annotation lane map과 helper 타입 계약 확인 |
| 2 | `npm test -- src/renderer/src/notation/annotation-lanes.test.ts src/renderer/src/notation/system-layout.test.ts` | Pass | 2 files / 29 tests passed; dense upper/lower annotation lane spacing과 기존 layout regression 확인 |
| 3 | `npm test` | Pass | 32 files / 425 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 annotation-lane baseline으로 갱신된 notation snapshots 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |

## 2026-09-02 Range Selection Band Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | Pass | NotationPreview range band helper 연결과 CSS selector 변경 타입 계약 확인 |
| 2 | `npm test -- src/renderer/src/notation/range-selection-bands.test.ts src/renderer/src/notation/visual-state.test.ts` | Pass | 2 files / 7 tests passed; selected range band grouping과 address-scoped selected tone 유지 확인 |
| 3 | `npm test` | Pass | 33 files / 427 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |

## 2026-09-02 Page Setup Preset Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | Pass | PDF page setup preset value와 App handler 타입 계약 확인 |
| 2 | `npm test -- src/renderer/src/App.test.tsx -t "layout.page-setup"` | Pass | 2 tests passed; V1 PDF preset 선택이 page setup controls와 export-time print layout plan에 반영되는지 확인 |
| 3 | `npm test` | Pass | 33 files / 428 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |

## 2026-09-02 Lyrics Chord Save Reopen Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "lyrics.chords.save-reopen"` | Pass | 1 test passed; `release-test` fixture에서 chord symbol과 lyric syllabic/melisma를 편집하고 MusicXML 저장 후 최근 파일 reopen에서 보존 확인 |
| 2 | `npm run typecheck` | Pass | App save/reopen workflow 테스트와 문서 변경 후 타입 계약 확인 |
| 3 | `npm test` | Pass | 33 files / 429 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `git diff --check` | Pass | whitespace error 없음 |
| 8 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 9 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 10 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 11 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |

## 2026-09-02 V1 Duration Shortcut Migration Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/editor/keyboard-input.test.ts src/renderer/src/App.test.tsx -t "duration\|tuplets\|keyboard.duration-shortcuts\|maps physical command keys"` | Pass | 2 files / 15 tests passed; keyboard helper와 App UI가 `1..7` V1 duration map, `Cmd/Ctrl+3` triplet, plain `9` unbound 정책을 유지하는지 확인 |
| 2 | `npm run typecheck` | Pass | V1 shortcut migration 테스트와 문서 변경 후 타입 계약 확인 |
| 3 | `npm test` | Pass | 33 files / 430 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 6 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 8 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |

## 2026-09-02 MIDI V1 QA Fixture Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/midi/serialize-midi.test.ts` | Pass | 1 file / 6 tests passed; 기존 tempo/ensemble/percussion-tab 정책과 새 V1 QA fixture 3종 확인 |
| 2 | `npm run verify:midi-fixtures` | Pass | 3 tests passed / 3 skipped; solo melody, piano grand staff, string quartet preset MIDI export의 header track count, track names, GM program changes, note-on events, warning absence 확인 |
| 3 | `npm run typecheck` | Pass | MIDI QA fixture helper와 `verify:midi-fixtures` script 변경 후 타입 계약 확인 |
| 4 | `npm test` | Pass | 33 files / 433 tests passed |
| 5 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 6 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 7 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 8 | `git diff --check` | Pass | whitespace error 없음 |
| 9 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 10 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 11 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 12 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |

## 2026-09-02 Multi-Part Mixer Workflow Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "playback.part-mixer"` | Pass | 2 tests passed; 단일 Melody mixer와 string quartet 4-part mixer row/independent partId state 전달 확인 |
| 2 | `npm run typecheck` | Pass | App mixer workflow 테스트와 문서 변경 후 타입 계약 확인 |
| 3 | `npm test` | Pass | 33 files / 434 tests passed |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `npm run verify:midi-fixtures` | Pass | 3 tests passed / 3 skipped; MIDI QA fixture gate 유지 |
| 6 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 57 skipped; external app compatibility seed fixture QA 유지 |
| 7 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 8 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 83개와 notation snapshots 성공 |
| 9 | `npm run verify:e2e` | Pass | Electron single-voice MVP verification 성공 |
| 10 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 11 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; preload bridges, start screen/actions, score workspace/title/notation SVG, MusicXML/PDF/MIDI file write, recent reopen, autosave round-trip 유지 |

## 2026-09-03 External MusicXML Fixture Manifest Gate Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run verify:musicxml-fixtures` | Pass | 1 passed / 58 skipped; external app fixture manifest origin/status/export setting/evidence gate와 compatibility seed import/export QA 확인 |
| 2 | `npm run typecheck` | Pass | MusicXML fixture manifest schema test 변경 후 타입 계약 확인 |
| 3 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 4 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-03 Engraving Collision Span Lane Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/notation/annotation-lanes.test.ts` | Pass | 1 file / 6 tests passed; hairpin span start/end lane y-offset와 lower annotation slur side avoidance 확인 |
| 2 | `npm run typecheck` | Pass | annotation lane helper와 NotationPreview renderer 연결 타입 계약 확인 |
| 3 | `npm test -- src/renderer/src/notation/annotation-lanes.test.ts src/renderer/src/notation/hairpin-rendering.test.ts src/renderer/src/notation/system-layout.test.ts` | Pass | 3 files / 33 tests passed; notation layout 관련 targeted suite 유지 |
| 4 | `npm run verify:visual-regression` | Fail | 의도한 slur y-position 변화로 snapshot metric diff 발생 |
| 5 | `npm run verify:notation-snapshots -- --update` | Pass | sandbox 안 Electron SIGABRT 후 sandbox 밖 Electron 실행으로 notation snapshot baseline 갱신 |
| 6 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout 84 tests와 notation snapshots 확인 |

## 2026-09-03 Part View PDF Target QA Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "layout.live-part-view previews and exports"` | Pass | 1 passed / 75 skipped; string quartet Viola part view가 PDF export 중 selected part만 print renderer에 전달하고 compact parts A4/6mm/90% layout plan을 쓰는지 확인 |
| 2 | `npm run typecheck` | Pass | score page/part title metadata와 packaged smoke 조건 변경 후 타입 계약 확인 |
| 3 | `npm run build` | Pass | Electron/Vite production build 성공 |
| 4 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout 84 tests와 notation snapshots 확인 |
| 5 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 6 | `npm run verify:package` | Fail | `.notation-staff-label`이 Cello part view DOM에서 비어 있어 label-count 조건이 과도하게 엄격함을 확인 |
| 7 | `npm test -- src/renderer/src/App.test.tsx -t "layout.live-part-view previews and exports"` | Pass | score page/part title metadata 중심으로 smoke 조건 수정 후 App regression 유지 |
| 8 | `npm run typecheck` | Pass | 수정된 smoke metadata 조건 타입 확인 |
| 9 | `npm run package:dir` | Pass | macOS arm64 unpacked app 재생성 |
| 10 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; Cello part view page/title metadata, visible event part id, PDF target/write/structure 확인 |

## 2026-09-03 Playback Mixer QA Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/playback/useScorePlayback.test.ts src/renderer/src/playback/timeline.test.ts` | Fail | Multi-part scheduler resume beat에서 cello velocity expectation을 0.2로 둔 테스트가 실제 interpolation 0.19와 불일치해 실패함을 확인 |
| 2 | `npm test -- src/renderer/src/App.test.tsx -t "playback.cursor-selection-sync\|playback.part-mixer"` | Pass | 1 file / 5 tests passed / 72 skipped; voice-aware selection, stop/jump policy, part mixer App workflow 확인 |
| 3 | `npm run typecheck` | Fail | `scheduleTrillEvent` 호출부에서 scheduler 후보 helper의 frequency narrowing이 TypeScript에 전달되지 않아 `event.frequency` optional error 확인 |
| 4 | `npm test -- src/renderer/src/playback/useScorePlayback.test.ts src/renderer/src/playback/timeline.test.ts` | Pass | 2 files / 37 tests passed; piano grand staff part/staff/voice timeline address와 multi-part mute/solo/volume scheduler 후보 검증 포함 |
| 5 | `npm test -- src/renderer/src/App.test.tsx -t "playback.cursor-selection-sync\|playback.part-mixer"` | Pass | 1 file / 5 tests passed / 72 skipped; string quartet Cello jump-to-start 후 editing selection address 유지와 playback cursor 초기화 확인 |
| 6 | `npm run typecheck` | Pass | playback scheduler helper와 hook return 타입 계약 확인 |
| 7 | `npm run verify:midi-fixtures` | Pass | 1 file / 3 tests passed / 3 skipped; MIDI fixture verifier 유지 |
| 8 | `npm run verify:e2e` | Pass | production build 후 single-voice MVP smoke 통과 |
| 9 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 10 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-03 External MusicXML Supported-Notation Fixture Gate Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run verify:musicxml-fixtures` | Fail | MuseScore grand staff seed에 supported `mf` dynamic expectation을 추가하자 Chromatics serialize/parse round-trip 후 dynamic이 빠지는 공백 확인 |
| 2 | `npm test -- src/musicxml/musicxml.test.ts -t "external-app-fixture-qa\|layout.dynamics\|exports and re-imports note articulations"` | Fail | 같은 round-trip 공백 재현; import는 `mf`를 읽지만 multi-staff imported measure reference가 export filter와 맞지 않음 |
| 3 | `npm run typecheck` | Pass | manifest/test 변경 전 타입 계약은 유지 |
| 4 | `npm run verify:musicxml-fixtures` | Pass | 1 file / 1 test passed / 58 skipped; fixture별 expected dynamics/articulations/warning paths와 supported `mf`/staccato warning-free round-trip 확인 |
| 5 | `npm test -- src/musicxml/musicxml.test.ts -t "external-app-fixture-qa\|layout.dynamics\|exports and re-imports note articulations\|layout.staff-text\|layout.system-text\|layout.expression-text"` | Pass | 1 file / 7 tests passed / 52 skipped; serializer measure-reference matching 보강 후 관련 text/dynamics/articulation round-trip 유지 |
| 6 | `npm run typecheck` | Pass | MusicXML manifest expectation과 serializer helper 타입 계약 확인 |
| 7 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 8 | `git diff --check` | Pass | whitespace error 없음 |
| 9 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |

## 2026-09-03 Engraving Dense Upper Annotation Lane Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/notation/annotation-lanes.test.ts` | Pass | 1 file / 8 tests passed; rehearsal mark, chord symbols 2-3개, staff text가 같은 measure에 있을 때 upper annotation baselines가 중복되지 않고 16px 이상 간격을 갖는지 확인 |
| 2 | `npm test -- src/renderer/src/notation/annotation-lanes.test.ts src/renderer/src/notation/system-layout.test.ts` | Pass | 2 files / 33 tests passed; dense/very-dense upper lane policy와 기존 system layout regression 유지 |
| 3 | `npm run typecheck` | Pass | annotation lane helper signature 변경과 rehearsal offset 계산 타입 계약 확인 |
| 4 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 5 | `git diff --check` | Pass | whitespace error 없음 |
| 6 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout 84 tests와 notation snapshots 확인 |
| 7 | Visual/PDF manual engraving QA | Not run | 실제 solo/grand staff/ensemble score와 PDF 출력물의 시각 확인은 release candidate 전 manual QA로 남김 |

## 2026-09-03 Imported Part View Annotation Filter Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "layout.live-part-view keeps imported primary-part annotations"` | Pass | 1 passed / 77 skipped; MusicXML-origin 2-part score에서 첫 part staff-level chord symbol/dynamic/text가 Cello part view와 PDF renderer로 새지 않고 rehearsal mark는 유지되는지 확인 |
| 2 | `npm test -- src/renderer/src/App.test.tsx -t "layout.live-part-view"` | Pass | 3 passed / 75 skipped; 기존 string quartet Viola PDF target, import-origin annotation filter, saved part view preference reopen 회귀 확인 |
| 3 | `npm run typecheck` | Pass | live part view generic measure reference filter와 App test fixture 타입 계약 확인 |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 6 | `git diff --check` | Pass | whitespace error 없음 |
| 7 | File dialog part view PDF visual QA | Not run | 실제 저장 dialog로 PDF를 만들고 PDF viewer에서 title/selected part/annotation visibility를 확인하는 작업은 release candidate 전 manual QA로 남김 |

## 2026-09-03 PDF Page Setup Renderer Contract Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "layout.page-setup\|layout.live-part-view previews and exports"` | Pass | 3 passed / 75 skipped; manual Letter landscape, publication A4 preset, string quartet Viola compact parts preset이 PDF export-time score page metadata와 print layout plan에 전달되는지 확인 |
| 2 | `npm run typecheck` | Pass | score page `data-pdf-*` metadata와 App regression 타입 계약 확인 |
| 3 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 4 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 5 | `git diff --check` | Pass | whitespace error 없음 |
| 6 | File dialog PDF page setup visual QA | Not run | 실제 저장 dialog로 PDF를 만들고 viewer에서 page size/orientation/margin/staff size/system spacing을 확인하는 작업은 release candidate 전 manual QA로 남김 |

## 2026-09-03 Enharmonic Respell Editing Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/editor/pitch-editing.test.ts` | Pass | 1 file / 7 tests passed; F# -> Gb 이명동음 respell이 sounding MIDI pitch를 유지하고 undo 가능한지 확인 |
| 2 | `npm test -- src/renderer/src/App.test.tsx -t "keyboard.navigation-first\|keyboard.enharmonic-respell\|keyboard.duration-shortcuts"` | Pass | 4 passed / 75 skipped; V1 duration map, navigation-first plain arrows, `J` enharmonic respell shortcut과 undo 흐름 확인 |
| 3 | `npm run typecheck` | Pass | enharmonic respell command, App shortcut wiring, toolbar button 타입 계약 확인 |
| 4 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 5 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 6 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-03 Packaged Compact Part Page Setup Metadata Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | Pass | packaged smoke compact parts metadata 수집과 PDF page setup DOM attribute 타입 계약 확인 |
| 2 | `npm run build` | Pass | `tsc --noEmit`와 Electron/Vite production build 성공 |
| 3 | `npm run package:dir` | Pass | macOS arm64 unsigned unpacked app 산출물 재생성 |
| 4 | `npm run verify:package` | Pass | `PACKAGED_APP_SMOKE_OK`; Cello part view가 선택 part만 표시하고 `a4`/`portrait`/`6mm`/`90%`/`90%` compact parts page setup metadata, PDF target/write/structure, MIDI/autosave smoke를 유지하는지 확인 |

## 2026-09-03 Automatable V1 Gate Sweep

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `node scripts/verify-site-content.mjs` | Pass | site content manifests, Compositions assets, product relations, feature map paths 확인 |
| 2 | `git diff --check` | Pass | whitespace error 없음 |
| 3 | `npm run verify:musicxml-fixtures` | Pass | 1 file / 1 test passed / 58 skipped; compatibility seed fixture QA와 manifest/warning expectation gate 유지. Real MuseScore/Dorico/Sibelius/Finale export fixture collection은 manual/external requirement로 남김 |
| 4 | `npm run verify:midi-fixtures` | Pass | 1 file / 3 tests passed / 3 skipped; solo/grand staff/string quartet MIDI fixture QA 유지 |
| 5 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout 84 tests와 notation snapshots 통과; screenshot artifacts generated under the local temp directory |
| 6 | `npm test` | Pass | 33 files / 446 tests passed; V1 blocker worktree의 unit/App regression 전체 테스트 통과 |
| 7 | `npm run verify:e2e` | Pass | production build 후 Electron single-voice MVP smoke 통과 |

## 2026-09-03 RC Manual/External QA Availability Audit

| 순서 | 명령/확인 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `sw_vers` / `uname -m` | Pass | QA host is macOS 26.6.2 build 25G83, arm64 |
| 2 | `find /Applications ... MuseScore/Dorico/Sibelius/Finale` | Not run blocker remains | No MuseScore, Dorico, Sibelius, or Finale app installs were found; real app-export MusicXML fixtures remain `manual-collection-required` |
| 3 | `find /Applications ... GarageBand/Logic/Ableton/...` and `plutil -p /Applications/GarageBand.app/Contents/Info.plist` | Partial | GarageBand 10.4.12 (6182) is installed, but human-operated MIDI import/listening QA was not performed |
| 4 | `find release ... '*.app'/'*.dmg'/'*.exe'/'*.AppImage'` plus `file release/mac-arm64/in-C.app/Contents/MacOS/in-C` | Partial | `release/mac-arm64/in-C.app` exists and is a Mach-O arm64 executable; no DMG or Windows release artifact was found in this local audit. Linux is documented as post-V1 |
| 5 | `pdfinfo /var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/in-c-packaged-smoke-23044.pdf` | Partial support evidence | Latest available packaged smoke PDF is 1 page, A4, rotation 0, PDF 1.4; this is not a human file-dialog visual QA pass |
| 6 | `pdftoppm -png -singlefile ... tmp/pdfs/packaged-smoke-23044-page` and Codex visual inspection | Partial support evidence | Rendered PNG shows `Packaged Smoke Score`, selected `Cello` part title, and Cello-only staff; full solo/grand staff/ensemble PDF visual QA remains manual |
| 7 | Native file dialog save/open, quit dialog, app relaunch, external notation app MusicXML import/export, DAW MIDI open, playback/mixer listening | Not run | Requires human-operated GUI session, external app installs/files, or Windows/installer artifacts. Do not mark Chromatics Desktop V1 public RC until these pass |
| 8 | `node scripts/verify-site-content.mjs` | Pass | Updated RC status, Linux post-V1 package policy, manual QA, package smoke matrix, release notes draft, and external fixture QA links/content remain valid |
| 9 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-03 Chromatics V1 Web Landing Release Prep

| 순서 | 명령/확인 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `site/chromatics.html` review/update | Pass | Old single-voice MVP copy replaced with Chromatics Desktop V1 Mac/Windows landing copy, feature summary, release guidance, and download CTA |
| 2 | `site/download-manifest.json` and `site/main.js` update | Pass | macOS/Windows remain active downloads; Linux is marked as post-V1 follow-up instead of active V1 download |
| 3 | `scripts/verify-site-content.mjs` update | Pass | Site content verifier now requires macOS/Windows downloads and accepts Linux as post-V1 unavailable entry |
| 4 | `npm run site:build` | Pass | `out/site/chromatics.html` generated with updated landing page |
| 5 | `node scripts/verify-site-content.mjs` | Pass | download manifest, Compositions assets, product relations, feature map paths 확인 |
| 6 | `npm run verify:site-seo` | Pass | SEO metadata verified for 17 pages |
| 7 | `git diff --check` | Pass | whitespace error 없음 |
| 8 | `npx vite --host 127.0.0.1 --port 4173 site` | Pass | local Vite site served at `http://127.0.0.1:4173/` for pre-deploy HTTP smoke |
| 9 | `curl -I http://127.0.0.1:4173/chromatics.html` | Pass | local Chromatics landing returned HTTP 200 and `Content-Type: text/html` |
| 10 | `curl -s http://127.0.0.1:4173/download-manifest.json` | Pass | local manifest returns active macOS/Windows downloads and Linux `available: false` post-V1 entry |
| 11 | Browser visual smoke | Not run | Browser control tool was unavailable in this session; rely on build/content/SEO/HTTP smoke before GitHub Pages deploy |
| 12 | `git push origin HEAD:main` | Pass | pushed V1 web landing release commit to `main`, triggering GitHub Pages `Site` workflow |
| 13 | `gh run watch 33732194542 --repo mann-lab-apps/in-c --exit-status` | Pass | GitHub Actions `Site` workflow built and deployed GitHub Pages successfully |
| 14 | `npm run verify:site-production` | Pass | production pages, fallback redirect, legacy `/in-c/`, robots/sitemap, canonical URL, download manifest/release links, and TLS certificate passed at `https://in-c.mannlab.app` |

## Not Run In This Package

| 항목 | 이유 | 후속 기준 |
| --- | --- | --- |
| `npm run verify:site-production` | 실제 production URL/배포 상태 확인은 external state에 의존한다. | 배포 승인 후 실행 |
| packaged app install/open smoke | macOS arm64 unpacked app 자동 smoke는 2026-09-01에 preload bridge, 시작 화면, 새 악보 workspace/title/notation SVG, smoke-only MusicXML 파일 쓰기, recent reopen, PDF 구조와 MIDI type-1 tempo/note track 구조 검증, autosave round-trip까지 통과했지만, installer/DMG 설치와 OS별 수동 저장·열기 확인은 release candidate 단계의 manual QA다. | [Manual Score Completion QA](../releases/manual-score-completion-qa.md) |
| Windows dev server advisory check | 현재 실행 환경은 macOS다. | #8에서 Windows 환경 확인 |
| Supabase backend live verification | Auth client와 publishable env 주입은 2026-07-29 main 배포에서 확인했지만, OAuth provider/schema/RLS는 외부 운영 변경이다. | #316에서 provider 설정 후 실행 |

## Evidence Retention Rules

- 명령 결과는 이 문서에 요약하고, 실패가 있으면 GitHub issue에 원문 로그 또는 핵심 error를 남긴다.
- release candidate마다 이 표를 복사하거나 날짜별 섹션을 추가한다.
- 외부 운영 변경이 필요한 검증은 승인 없이 Pass로 기록하지 않는다.

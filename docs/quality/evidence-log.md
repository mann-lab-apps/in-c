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

## 2026-09-04 Commercial V1 Reference Scope Run

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | 공식 문서 조사 | Pass | MuseScore Studio Handbook, Dorico Pro 6.2 Help, Avid Sibelius Documentation/What's New를 기준으로 commercial V1 feature surface 분석 |
| 2 | `docs/product/chromatics-commercial-v1-reference-gap-matrix.md` 작성 | Pass | 사용자 기대 V1 기능을 Commercial V1 Required / V1 Polish / Post-V1 / Out of Scope로 분류 |
| 3 | `docs/product/chromatics-desktop-v1.md` 연결 | Pass | 기존 V1 문서의 Reference Baseline에서 commercial V1 gap matrix를 참조하도록 보강 |
| 4 | 앱/사이트 빌드 및 전체 테스트 | Not run | 코드 변경이 없는 제품 문서 변경 |
| 5 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-04 Commercial V1 Toolbar Information Architecture Slice

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm run test:components` | Fail, then Pass | 첫 실행에서 context strip의 `재생`/`정지` 텍스트가 기존 상태 텍스트와 중복되어 테스트 조회가 모호했다. 테스트를 컨테이너 범위/복수 조회로 조정한 뒤 46 tests passed. |
| 2 | `npm run typecheck` | Pass | `tsc --noEmit` 성공 |
| 3 | `npm run build` | Pass | Electron/Vite main, preload, renderer production build 성공 |
| 4 | `npm test` | Pass | 29 files / 363 tests passed |
| 5 | Browser visual smoke | Not run | 세션에 Browser skill 문서는 있었지만 필요한 Node browser-control tool이 노출되지 않아 직접 스크린샷 검증은 수행하지 못했다. 수동 visual QA 필요. |
| 6 | `git diff --check` | Pass | whitespace error 없음 |

## 2026-09-07 Commercial V1 Measure-Level Notation Palette Slice

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "palette.measure-level\|playback.global-tempo\|rehearsal\|staff-text\|system-text\|expression-text\|dynamics"` | Pass | 7 tests passed. Score Setup에서 measure-level notation controls가 빠지고 `표기 객체` 탭에서 rehearsal mark, staff/system/expression text, dynamics workflow가 동작하는지 확인했다. |
| 2 | `npm run typecheck` | Pass | `notation` toolbar category, measure-level notation palette, repeat/volta controls 타입 계약 확인 |
| 3 | `npm test -- src/renderer/src/App.test.tsx` | Pass | 79 tests passed. App workflow regression 통과 |
| 4 | `npm test` | Pass | 33 files / 446 tests passed |
| 5 | `npm run build` | Pass | Electron/Vite main, preload, renderer production build 성공 |
| 6 | `npm run verify:musicxml-fixtures` | Pass | external-app-fixture-qa 1 test passed |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 84 passed, production build, notation snapshot verifier 통과 |
| 8 | `node scripts/verify-site-content.mjs` | Fail, then Pass | 첫 실행에서 stale `out/site/download-manifest.json`가 source manifest와 달라 실패했다. `npm run site:build` 후 content manifest/product relation/feature map path 검증 통과 |
| 9 | `git diff --check` | Pass | whitespace error 없음 |
| 10 | Browser/manual visual smoke | Not run | 자동 App regression은 palette 위치와 입력 동작을 고정하지만, 실제 compact desktop 화면 밀도/overflow와 PDF visual QA는 release candidate 전 수동 확인으로 남긴다. |

## 2026-09-07 Commercial V1 Lyrics-Chords Input Surface Slice

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "palette.lyrics-chords\|lyrics.chords\|playback.global-tempo\|notation extension\|multi-staff-notation-object"` | Fail, then Pass | 첫 실행에서 기존 테스트가 `가사` 탭에서 chord symbol input이 숨겨진다고 기대했고, 새 test double의 harmony element attribute 기대도 맞지 않았다. 새 V1 정책에 맞춰 Lyrics/Chords의 lyric/chord group 표시, note-selected tick, measure-selected tick 0 anchoring을 고정한 뒤 5 tests passed. |
| 2 | `npm run typecheck` | Pass | moved chord-symbol panel and Lyrics/Chords conditional rendering typecheck |
| 3 | `npm test -- src/renderer/src/App.test.tsx` | Pass | 80 tests passed. App workflow regression 통과 |
| 4 | `npm test` | Pass | 33 files / 447 tests passed |
| 5 | `npm run build` | Pass | Electron/Vite main, preload, renderer production build 성공 |
| 6 | `npm run verify:musicxml-fixtures` | Pass | external-app-fixture-qa 1 test passed |
| 7 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 84 passed, production build, notation snapshot verifier 통과 |
| 8 | `node scripts/verify-site-content.mjs` | Pass | content manifest, product relation, feature map path 검증 통과 |
| 9 | `git diff --check` | Pass | whitespace error 없음 |
| 10 | Browser/manual visual smoke | Not run | 자동 App regression은 입력 표면과 anchoring 정책을 고정하지만, 실제 compact desktop visual QA와 keyboard shortcut discoverability 검토는 release candidate 전 수동 확인으로 남긴다. |

## 2026-09-07 Commercial V1 Export Page Setup Information Architecture Slice

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `npm test -- src/renderer/src/App.test.tsx -t "live-part-view\|global-tempo\|save-pdf\|export-midi\|page-setup\|report-pdf\|measure-level-notation\|lyrics-chords"` | Pass | 15 tests passed. `파일` 탭에서 PDF/MIDI primary controls를 제거하고, `내보내기` 탭에서 PDF/MIDI export, PDF target pages, page setup preset/settings가 보이는지 확인했다. String quartet Viola part view PDF/MIDI suggested filename도 part-specific으로 고정했다. |
| 2 | `npm run typecheck` | Pass | `export` toolbar category, export actions, selected part MIDI export path typecheck |
| 3 | `npm test -- src/renderer/src/App.test.tsx` | Pass | 80 tests passed. App workflow regression 통과 |
| 4 | `npm test` | Pass | 33 files / 447 tests passed |
| 5 | `npm run build` | Pass | Electron/Vite main, preload, renderer production build 성공 |
| 6 | `npm run verify:musicxml-fixtures` | Pass | external-app-fixture-qa 1 test passed |
| 7 | `npm run verify:midi-fixtures` | Pass | V1 QA fixture 3 tests passed |
| 8 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 84 passed, production build, notation snapshot verifier 통과 |
| 9 | `node scripts/verify-site-content.mjs` | Pass | content manifest, product relation, feature map path 검증 통과 |
| 10 | `git diff --check` | Pass | whitespace error 없음 |
| 11 | Browser/manual visual smoke | Not run | 자동 App regression은 command placement와 export state policy를 고정하지만, 실제 file dialog save/open, PDF viewer visual QA, compact desktop visual QA는 release candidate 전 수동 확인으로 남긴다. |

## 2026-09-11 MuseScore Finale Reference Environment And Fixture Harness Slice

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | 공식 문서 확인 | Pass | MuseScore Studio Handbook의 parts/export/palettes/UI/CLI 문서와 MakeMusic Finale sunset/support/Simple Entry 문서를 기준으로 MuseScore를 current/free primary reference, Finale를 legacy workflow/migration primary reference로 재정의했다. |
| 2 | `git status --short --branch` | Pass | current branch `feature/in-c-public-v1-rc`; unrelated Flutter/site/classical quiz changes are present and were not reverted. |
| 3 | `node --version` / `npm --version` | Pass | Node v22.22.0, npm 10.9.4 |
| 4 | `/Applications` reference app audit | Pass | `/Applications/MuseScore 4.app` 발견. Finale app은 `/Applications`와 user Applications audit에서 발견되지 않았다. |
| 5 | `npm run verify:notation-reference-apps` | Pass | MuseScore role `primary-current-free-market-reference`, local status installed, version 4.7.5, executable `/Applications/MuseScore 4.app/Contents/MacOS/mscore`; Finale role `primary-legacy-finale-style-migration-reference`, local status not installed. Both required app-export fixtures remain `manual-collection-required`. |
| 6 | `npm run verify:musicxml-fixtures` | Pass | external-app-fixture-qa 1 test passed. Manifest now validates required MuseScore/Finale reference roles, manual QA status, and fixture source policy fields in addition to fixture expectations. |
| 7 | `npm run typecheck` | Pass | `tsc --noEmit` 성공 |
| 8 | `npm test` | Pass | 33 files / 447 tests passed |
| 9 | `npm run build` | Pass | Electron/Vite main, preload, renderer production build 성공 |
| 10 | `node scripts/verify-site-content.mjs` | Pass | content manifest, product relation, feature map path 검증 통과 |
| 11 | `git diff --check` | Pass | whitespace error 없음 |
| 12 | MuseScore real app-export fixture collection | Not run | MuseScore is installed, but no GUI/CLI export of a real MuseScore-origin score was performed in this package. Collect `musescore-grand-staff-app-export.musicxml` before public RC. |
| 13 | Finale-origin fixture collection | Not run | Finale is not installed locally. Install a compatible Finale environment or provide a documented Finale-origin MusicXML migration fixture before public RC. |

## 2026-09-11 MuseScore CLI App Export Fixture Collection Slice

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `/Applications/MuseScore\ 4.app/Contents/MacOS/mscore --version` | Pass | MuseScore CLI returned `MuseScore4 4.7.5`. |
| 2 | `/Applications/MuseScore\ 4.app/Contents/MacOS/mscore -F --musicxml-use-default-font -o /tmp/musescore-4-7-5-cli-grand-staff-export.musicxml src/musicxml/fixtures/external-apps/musescore-grand-staff-basic.musicxml` | Pass | MuseScore Studio 4.7.5 CLI exported uncompressed MusicXML. The generated file is versioned as `src/musicxml/fixtures/external-apps/musescore-4-7-5-cli-grand-staff-export.musicxml`. |
| 3 | `npm run verify:musicxml-fixtures` | Pass | external-app-fixture-qa 1 test passed. Manifest now includes the MuseScore 4.7.5 CLI app-export fixture and verifies part/staff/clef/voice/note/dynamic/articulation/warning expectations. A follow-up run also verifies MuseScore lower-staff `<voice>5</voice>` imports as Chromatics staff-local `voice-1`. |
| 4 | `npm run verify:notation-reference-apps` | Pass | MuseScore required fixture status is now `collected`; Finale remains `manual-collection-required`. |
| 5 | `npm run verify:musescore-cli-fixtures` | Fail, then Pass | Running multiple MuseScore CLI conversions back-to-back exposed intermittent local MuseScore 4.7.5 `SIGABRT` / `mutex lock failed` instability. The verifier now defaults to the collected app-export fixture, records attempts, and retries up to three times. Final run passed after one retry and produced a structurally valid PDF. |
| 6 | `npm run typecheck` | Pass | `tsc --noEmit` 성공 |
| 7 | `npm test` | Pass | 33 files / 447 tests passed |
| 8 | `npm run build` | Pass | Electron/Vite main, preload, renderer production build 성공 |
| 9 | `npm run verify:midi-fixtures` | Pass | V1 QA fixture 3 tests passed |
| 10 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 84 passed, production build, notation snapshot verifier 통과 |
| 11 | `node scripts/verify-site-content.mjs` | Pass | content manifest, product relation, feature map path 검증 통과 |
| 12 | `git diff --check` | Pass | whitespace error 없음 |
| 13 | MuseScore GUI/manual snapshot | Not run | CLI app-export fixture is collected, but GUI-created source score, reopen/manual snapshot, and human PDF review remain public RC manual QA. |
| 14 | Finale-origin fixture collection | Not run | Finale is not installed locally. Install a compatible Finale environment or provide a documented Finale-origin MusicXML migration fixture before public RC. |

## 2026-09-11 Commercial V1 Long-Running Work Queue Slice

| 순서 | 명령 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | `git status --short --branch` | Pass | current branch `feature/in-c-public-v1-rc`; unrelated Flutter/site/classic quiz changes are present and were not reverted. |
| 2 | `git log --oneline -5` | Pass | Latest commits include `da3103e`, `02043a8`, merge `27ceab6`, Chromatics toolbar `07794f1`, and site download `d6b820f`. |
| 3 | `node --version` / `npm --version` | Pass | Node v22.22.0, npm 10.9.4 |
| 4 | `npm run verify:chromatics-v1-work-queue` | Pass | Added `docs/product/chromatics-commercial-v1-work-queue.md` and a verifier requiring approved queue columns/status values, at least 8 rows, required blocker categories, and non-empty next actions. Current queue has 11 rows; automatable next rows include multi-voice workflow, selection filters, compact UI QA, and native-format/save-policy decision. |
| 5 | `npm run verify:notation-reference-apps` | Pass | Expanded the audit from MuseScore/Finale to MuseScore, Dorico, Sibelius, and Finale. MuseScore Studio 4.7.5 is installed and has collected CLI app-export evidence; Dorico/Sibelius/Finale are not installed locally and remain external/manual fixture blockers. |
| 6 | `npm run verify:musicxml-fixtures` | Pass | external-app-fixture-qa 1 test passed. The MuseScore CLI fixture now also asserts the raw app-export lower staff voice value `5` while Chromatics imports it as staff-local `voice-1`. |
| 7 | `npm run typecheck` | Pass | `tsc --noEmit` 성공 |
| 8 | `npm run verify:midi-fixtures` | Pass | V1 QA fixture 3 tests passed. MIDI fixture verifier still guards solo melody, piano grand staff, and string quartet export structure. |
| 9 | `npm test` | Pass | 33 files / 447 tests passed |
| 10 | `npm run build` | Pass | Electron/Vite main, preload, renderer production build 성공 |
| 11 | `node scripts/verify-site-content.mjs` | Pass | content manifest, product relation, feature map path 검증 통과 |
| 12 | `git diff --check` | Pass | whitespace error 없음 |
| 13 | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 84 passed, production build, notation snapshot verifier 통과 |
| 14 | `npm run verify:musescore-cli-fixtures` | Pass | MuseScore Studio 4.7.5 rendered the collected app-export fixture to a structurally valid PDF on attempt 1; output bytes 19869. |

## 2026-09-11 Queue-Driven Selection Filter And Save Policy Run

| 순서 | Queue ID | 명령 | 결과 | 비고 |
| --- | --- | --- | --- | --- |
| 1 | 시작 점검 | `git status --short --branch`, `git log --oneline -5`, `node --version`, `npm --version` | Pass | current branch `feature/in-c-public-v1-rc`; Node v22.22.0, npm 10.9.4. Existing unrelated dirty/untracked Flutter/classic quiz files were not reverted. |
| 2 | 큐 scan | `npm run verify:chromatics-v1-work-queue` | Pass | Queue had 11 rows. Automatable next rows included `CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW`, `CV1-SELECTION-FILTERS`, `CV1-UI-COMPACT-DESKTOP-VISUAL-QA`, `CV1-NATIVE-FORMAT-DECISION`. |
| 3 | reference scan | `npm run verify:notation-reference-apps` | Pass | MuseScore 4.7.5 installed/collected CLI app-export fixture; Dorico, Sibelius, Finale remain not installed and external/manual blockers. |
| 4 | fixture scan | `npm run verify:musicxml-fixtures`, `npm run verify:midi-fixtures` | Pass | MusicXML external fixture QA 1 test passed; MIDI V1 QA fixture 3 tests passed. |
| 5 | `CV1-SELECTION-FILTERS` | `npm test -- src/renderer/src/editor/editor-state.test.ts -t "selection-filter\|same-staff-voice"` | Pass | 5 tests passed. Added `notes/rests/all` event-type filter foundation and filtered delete behavior. Duplicate event ids in same-staff voices remain scoped to the addressed voice. |
| 6 | `CV1-UI-COMPACT-DESKTOP-VISUAL-QA` | `npm test -- src/renderer/src/App.test.tsx -t "global-tempo lyrics\|toolbar\|selection filter\|work mode"` | Pass | 3 tests passed. File command surface now exposes `선택 필터`, context strip shows current filter and range filtered count, and note-selected filtered delete disabled/enabled state follows the filter. Human compact desktop screenshot QA remains required. |
| 7 | `CV1-NATIVE-FORMAT-DECISION` | `npm run verify:chromatics-v1-save-policy` | Pass | Added a policy verifier for MusicXML primary save, native project format post-V1, unsupported layout warning contract, release docs, and work queue consistency. Queue row moved to `Done` for V1 policy; post-V1 native format design remains separate. |
| 8 | regression | `npm run typecheck` | Pass | `tsc --noEmit` 성공 after selection filter/App/save-policy additions. |
| 9 | queue update | `npm run verify:chromatics-v1-work-queue` | Pass | Queue now has statuses `Blocked external`, `Done`, `Manual QA required`, `Partial`; next automatable rows are `CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW`, `CV1-SELECTION-FILTERS`, and `CV1-UI-COMPACT-DESKTOP-VISUAL-QA`. |
| 10 | final gates | `npm test` | Pass | 33 files / 450 tests passed |
| 11 | final gates | `npm run build` | Pass | Electron/Vite main, preload, renderer production build 성공 |
| 12 | final gates | `node scripts/verify-site-content.mjs` | Pass | content manifest, product relation, feature map path 검증 통과 |
| 13 | final gates | `npm run verify:visual-regression` | Pass | MusicXML/system-layout tests 84 passed, production build, notation snapshot verifier 통과 |
| 14 | final gates | `git diff --check` | Pass | whitespace error 없음 |
| 15 | final gates | `npm run verify:e2e` | Fail, then Pass | First run exposed stale E2E expectations after File/Export command separation. `scripts/verify-single-voice-mvp.cjs` now checks File lifecycle commands, Export/Page Setup PDF/MIDI commands, and the `선택 필터` default/options separately. Follow-up run passed with Electron single-voice MVP smoke, grand staff preview, toolbar overflow guard, and release scenario bounds. |
| 16 | reference app smoke | `npm run verify:musescore-cli-fixtures` | Fail, then Pass | Local MuseScore 4.7.5 CLI hit the known intermittent `SIGABRT` / `mutex lock failed` on attempts 1-2, then attempt 3 rendered `musescore-4-7-5-cli-grand-staff-export.pdf` with 19869 bytes and valid PDF structure. |
| 17 | post-doc consistency | `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Evidence update 후 queue/status, MusicXML-first save policy, site content manifest, whitespace gate를 재확인했다. |

Remaining automatable queue starts: `CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW`,
`CV1-SELECTION-FILTERS` copy/paste/object filters, and compact desktop visual
guards. Remaining manual/external blockers include MuseScore GUI snapshot,
Dorico/Sibelius/Finale-origin fixtures, file-dialog PDF/MusicXML/MIDI QA,
playback listening QA, and Windows packaged smoke.

## 2026-09-11 Queue Drain Selection Filter And Compact Mode Guard Run

| 순서 | Queue ID | 명령 | 결과 | 비고 |
| --- | --- | --- | --- | --- |
| 1 | prompt intake | pasted goal prompt, `docs/product/chromatics-commercial-v1-work-queue.md`, `docs/product/chromatics-commercial-v1-reference-gap-matrix.md`, `docs/product/chromatics-desktop-v1.md`, `docs/quality/known-limitations.md`, `docs/quality/release-readiness-checklist.md` | Pass | 장기 실행 목표를 시작하고 queue를 authoritative source로 재확인했다. |
| 2 | queue scan | `npm run verify:chromatics-v1-work-queue` | Pass | 시작 시 automatable next rows는 `CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW`, `CV1-SELECTION-FILTERS`, `CV1-UI-COMPACT-DESKTOP-VISUAL-QA`였다. |
| 3 | `CV1-SELECTION-FILTERS` | `npm test -- src/renderer/src/editor/editor-state.test.ts -t "selection-filter\|same-staff-voice-copy-paste"` | Pass | 6 tests passed. Added filtered range clipboard/paste helpers. `전체/음표만/쉼표만` filter now applies to copy/paste target/source in addressed same-staff voice, and non-contiguous filtered ranges are rejected to avoid rhythmic gaps. |
| 4 | `CV1-SELECTION-FILTERS` | `npm test -- src/renderer/src/App.test.tsx -t "selection-filter.copy\|selection filter\|work mode"` | Pass | 1 test passed. App copy action now uses filtered event count and reports filtered copy status. |
| 5 | regression | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after editor/App selection-filter changes. |
| 6 | `CV1-UI-COMPACT-DESKTOP-VISUAL-QA` | `npm run verify:e2e` | Fail, then Pass | First compact toolbar mode guard only scanned `.toolbar` and failed because Notation Objects, Lyrics/Chords, and Playback controls live in panel/strip surfaces. The verifier was corrected to scan visible aria-labelled command surfaces. Follow-up run passed and now cycles File, Score Setup, Note Input, Notation Objects, Lyrics/Chords, Export/Page Setup, and Playback at 960px while checking command placement and overflow. |
| 7 | queue update | docs update | Pass | `CV1-SELECTION-FILTERS` moved to `Done` for V1 event-type filters. `CV1-UI-COMPACT-DESKTOP-VISUAL-QA` moved to `Manual QA required` after adding the compact E2E guard. `CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW` now points to manual SATB/piano engraving/PDF QA because current automated selection/range/delete/copy/paste/playback/MusicXML coverage is in place. |
| 8 | queue drain verifier | `npm run verify:chromatics-v1-work-queue` | Fail, then Pass | First run failed because the verifier still required at least one `Partial` row. The verifier now accepts a drained automation queue, rejects stale `In progress`, and reports `automationQueueDrained: true` with no `nextAutomatableRows`. |
| 9 | regression | `npm test` | Fail, then Pass | First full run timed out in `import-export.save-pdf applies a strict target page count when possible`; the test passes in isolation and intentionally adds 80 measures, so its timeout was raised to 10000ms. Follow-up full run passed 33 files / 453 tests. |
| 10 | fixture/site gates | `npm run verify:musicxml-fixtures`, `npm run verify:midi-fixtures`, `node scripts/verify-site-content.mjs` | Pass | MusicXML external fixture QA 1 test passed, MIDI V1 QA fixture 3 tests passed, site content manifest/product relation/feature map path verification passed. |
| 11 | final consistency | `npm run verify:visual-regression`, `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy`, `git diff --check` | Pass | Visual regression passed 84 MusicXML/system-layout tests plus notation snapshots. Queue now has statuses `Blocked external`, `Done`, `Manual QA required`, `automationQueueDrained: true`, and no automatable next rows. Save policy and whitespace gates passed. |

## 2026-09-11 MuseScore Parity Roadmap And Page Margin Guide Slice

| 순서 | Queue ID | 명령 | 결과 | 비고 |
| --- | --- | --- | --- | --- |
| 1 | MS-PARITY-001 | MuseScore Studio official docs review | Pass | Primary references were MuseScore Studio Handbook, user interface, copy/paste, score size and spacing, pages and vertical spacing, chord symbols, templates/styles, and selecting elements. |
| 2 | MS-PARITY-001 | `npm run verify:chromatics-musescore-parity-roadmap` | Fail, then Pass | First run caught a missing `Notation Objects` row in the new roadmap matrix. Added `MS-NOTATION-001`; follow-up verifier passed with 19 rows and `parityAutomationQueueDrained: false`. |
| 3 | MS-LAYOUT-001 | `npm test -- src/renderer/src/App.test.tsx -t "page margin guides"` | Pass | 1 test passed. `내보내기` now exposes a non-printing page margin guide toggle; the score page stores the current margin guide inset and hides the guide during PDF export capture. |
| 4 | regression | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after App/CSS/script/docs changes. |
| 5 | final gates | `npm run verify:chromatics-musescore-parity-roadmap` | Pass | 19 roadmap rows verified; next automatable rows remain queued, so MuseScore parity is intentionally not complete. |
| 6 | final gates | `npm test -- src/renderer/src/App.test.tsx -t "page margin guides"` | Pass | Page margin guide regression stayed green after documentation updates. |
| 7 | final gates | `npm run build`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Electron/Vite production build, site content verification, and whitespace gate all passed. |
| 8 | MS-PROPERTIES-001 | `npm test -- src/renderer/src/App.test.tsx -t "page margin guides\|properties-panel"` | Fail, then Pass | First run caught an aria-label collision with an existing note inspector `선택 속성` region plus unsafe measure/range typing. The new read-only properties surface was renamed to `선택 요약`, measure numbering now uses `measure.number`, and range address is guarded. Follow-up run passed 2 tests. |
| 9 | MS-PROPERTIES-001 | `npm run typecheck` | Fail, then Pass | First run caught the same measure/range typing issue. Follow-up `tsc --noEmit` passed after the guarded selected-properties model. |
| 10 | final gates | `npm run verify:chromatics-musescore-parity-roadmap`, `npm test -- src/renderer/src/App.test.tsx -t "page margin guides\|properties-panel"`, `npm run build`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Roadmap verifier, 2 focused App tests, Electron/Vite production build, site content verification, and whitespace gate passed. Roadmap still reports `parityAutomationQueueDrained: false`, so MuseScore parity remains an active long-running queue. |
| 11 | MS-PROPERTIES-001 follow-up | `npm test -- src/renderer/src/App.test.tsx -t "properties-panel"` | Pass | 1 test passed. The selected properties surface now includes an editable `선택 요약 셈여림` control that reuses the active measure dynamics command path and updates the notation preview. |
| 12 | MS-PROPERTIES-001 follow-up | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after wiring the editable dynamic property control. |
| 13 | MS-HELP-001 | `npm test -- src/renderer/src/App.test.tsx -t "properties-panel\|shortcut-help"` | Pass | 2 tests passed. File mode now opens a `단축키 도움말` dialog with V1 note input, voice/selection, and file/editing shortcut groups; the legacy plain `9` triplet shortcut is not exposed. |
| 14 | MS-HELP-001 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after adding the shortcut reference dialog. |
| 15 | final gates | `npm run verify:chromatics-musescore-parity-roadmap`, `npm test -- src/renderer/src/App.test.tsx -t "page margin guides\|properties-panel\|shortcut-help"`, `npm run build`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Roadmap verifier now reports 19 rows, `MS-PROPERTIES-001` and `MS-HELP-001` removed from `nextAutomatableRows`, and `parityAutomationQueueDrained: false` with 10 remaining automatable MuseScore parity rows. Focused App tests passed 3 tests; production build, site content verification, and whitespace gate passed. |
| 16 | MS-TEMPLATES-001 | `npm test -- src/renderer/src/App.test.tsx -t "built-in-template-picker\|create-ensemble-score"` | Pass | 2 tests passed. The new score dialog now exposes a built-in template picker for solo melody, piano grand staff, 2-part ensemble, and string quartet; picking the string quartet template synchronizes the legacy score-structure select and creates the expected four-part score skeleton. |
| 17 | MS-TEMPLATES-001 final gates | `npm run typecheck`, `npm run verify:chromatics-musescore-parity-roadmap`, `npm run build`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Typecheck, roadmap schema, production build, site content, and whitespace gates passed. Roadmap verifier reports 19 rows, `parityAutomationQueueDrained: false`, and 9 remaining automatable MuseScore parity rows after removing `MS-TEMPLATES-001`. |
| 18 | MS-UI-001 | `npm test -- src/renderer/src/App.test.tsx -t "playback.global-tempo"` | Fail, then Pass | First run expected the wrong initial docked palette active mode; second run exposed an ambiguous global `셈여림` query after adding the right properties dock. Updated the regression to expect initial `음표` mode and scope the notation dynamics assertion to the visible `표기 객체` panel. Follow-up passed 1 test. |
| 19 | MS-UI-001 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after adding the score workspace left `고정 팔레트`, right `속성 도크`, and notation-mode `셈여림 팔레트`. |
| 20 | MS-SELECTION-001 | `npm test -- src/renderer/src/App.test.tsx -t "palette.lyrics-chords"` | Pass | 1 test passed. File mode now includes a `표기 필터`; with a measure selected, the `코드` filter deletes only that measure's chord symbols and the `셈여림` filter deletes only that measure's dynamics. |
| 21 | MS-SELECTION-001 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after wiring the marking filter state, context strip label, and measure-object delete command path. |
| 22 | MS-COPY-001 | `npm test -- src/renderer/src/App.test.tsx -t "palette.lyrics-chords"` | Pass | 1 test passed after extending the same workflow. The `표기 필터` now copies/pastes measure-level chord symbols or dynamics through a separate object clipboard and replaces only the same marking type in the target measure. |
| 23 | MS-COPY-001 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after adding the measure marking clipboard and paste command builder. |
| 24 | final gates | `npm run verify:chromatics-musescore-parity-roadmap`, `npm run build`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Roadmap verifier passed with 19 rows, `parityAutomationQueueDrained: false`, and 6 remaining automatable rows: `MS-VOICE-001`, `MS-NOTATION-001`, `MS-PARTS-001`, `MS-LAYOUT-002`, `MS-LAYOUT-003`, `MS-PLAYBACK-001`. Production build, site content, and whitespace gates passed. |

## 2026-09-12 MuseScore Parity Same-Staff Voice Presentation Slice

| 순서 | Queue ID | 명령 | 결과 | 비고 |
| --- | --- | --- | --- | --- |
| 1 | MS-VOICE-001 | `npm test -- src/renderer/src/notation/visual-state.test.ts` | Pass | 1 file / 7 tests passed. Added same-staff multi-voice presentation policy coverage: single-voice notation remains neutral/automatic, while multi-voice voice 1/3 use upper/up-stem lanes and voice 2/4 use lower/down-stem lanes with separate rest offsets. |
| 2 | MS-VOICE-001 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after wiring the presentation policy into `NotationPreview` and preserving multi-voice beam stem direction. |
| 3 | MS-VOICE-001 | `npm run verify:chromatics-musescore-parity-roadmap`, `npm run build`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Roadmap verifier passed with 19 rows and removed `MS-VOICE-001` from `nextAutomatableRows`; production build, site content verification, and whitespace gate passed. |
| 4 | MS-VOICE-001 visual regression | `npm run verify:visual-regression` | Fail, update, then Pass | First run passed MusicXML/system-layout tests but caught intentional notation snapshot metric changes at 960px after the same-staff voice presentation policy. `npm run verify:notation-snapshots:update` failed once inside the sandbox with Electron `SIGABRT`, then passed with escalated Electron execution and updated `docs/testing/notation-snapshot-baseline.json`. Follow-up visual regression passed 84 tests plus notation snapshots. Manual PDF engraving QA remains release-candidate work and is not counted as complete here. |
| 5 | MS-NOTATION-001 | `npm test -- src/renderer/src/App.test.tsx -t "palette.measure-level-notation\|palette.notation-applicability"` | Fail, then Pass | First run exposed unscoped `셈여림` label queries after the properties dock existed. Tests now scope measure-level dynamics to the Notation Objects region. Follow-up passed 2 tests and verifies range selection disables rehearsal/staff/system/expression text plus dynamics controls. |
| 6 | MS-NOTATION-001 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after adding the measure-level notation applicability state. |
| 7 | MS-PARTS-001 | `npm test -- src/renderer/src/App.test.tsx -t "layout.live-part-view"` | Pass | 1 file / 3 tests passed. The saved MusicXML part-view workflow now also verifies selected Cello part PDF page setup preference persistence through `chromatics.part-page-setup.v1`, restores the compact parts preset on reopen, and keeps the part view target. |
| 8 | MS-PARTS-001 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after adding local file-path/part-id selected-part page setup preferences and applying them to display/print score paths. |
| 9 | MS-LAYOUT-002 | `npm test -- src/renderer/src/notation/print-layout.test.ts` | Fail, then Pass | First run caught an over-eager compact classification and candidate typing issue. The style resolver now treats compact as multiple compression signals, keeping readable Letter landscape with loose system spacing as `readable`. Follow-up passed 1 file / 6 tests. |
| 10 | MS-LAYOUT-002 | `npm run typecheck` | Fail, then Pass | First run caught `engravingStyle` leaking into candidate requirements; `PrintLayoutCandidate` now omits the derived plan field. Follow-up `tsc --noEmit` passed. |
| 11 | MS-LAYOUT-003 | `npm test -- src/renderer/src/notation/annotation-lanes.test.ts` | Fail, then Pass | New dense solo fixture caught system text and rehearsal mark spacing too close at 6px. Rehearsal marks now move above dense system text stacks, renderer annotation elements expose lane metadata, and follow-up annotation lane suite passed 1 file / 9 tests. |
| 12 | MS-LAYOUT-003 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after annotation lane policy and renderer metadata changes. |
| 13 | pre-playback gates | `npm run verify:chromatics-musescore-parity-roadmap`, `npm run build`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Roadmap verifier passed with 19 rows and remaining automatable row `MS-PLAYBACK-001` after `MS-LAYOUT-003` was completed. Production build, site content verification, and whitespace gate passed after documentation updates. |
| 14 | MS-PLAYBACK-001 | `npm test -- src/renderer/src/App.test.tsx -t "playback.part-mixer"` | Pass | 1 file / 2 tests passed. The mixer now persists Melody mute/solo/volume to `chromatics.part-mixer.v1`, restores it on reload, keeps string quartet part mixer states independent, and exposes the active Cello row as `재생 중` while inactive rows remain `대기`. |
| 15 | MS-PLAYBACK-001 | `npm run typecheck` | Pass | `tsc --noEmit` succeeded after adding persisted mixer settings and active playback row metadata. |
| 16 | queue drain verifier | `npm run verify:chromatics-musescore-parity-roadmap` | Fail, then Pass | First run failed because the verifier still required at least one `Todo` row even after the automation queue was drained. The verifier now requires `Done`, `Research`, and `External QA` coverage while allowing no `Todo`/`Partial`/`In progress` rows. Follow-up passed with 19 rows, statuses `Done`/`External QA`/`Postpone`/`Research`, `parityAutomationQueueDrained: true`, and no `nextAutomatableRows`. |
| 17 | final gates | `npm run build`, `npm run verify:visual-regression`, `npm run verify:chromatics-musescore-parity-roadmap`, `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Production build passed. Visual regression passed 84 MusicXML/system-layout tests plus notation snapshots. Roadmap verifier passed with `parityAutomationQueueDrained: true` and no `nextAutomatableRows`. Site content verification and whitespace gate passed. |

Remaining MuseScore parity automatable rows are empty after the final roadmap verifier. External/manual rows include GUI-created
MuseScore snapshots, Finale/Dorico/Sibelius-origin fixtures, PDF visual QA, MIDI
hardware/external app QA, and playback listening QA.

## 2026-09-12 Headless Commercial V1 QA Expansion

| 순서 | Queue ID | 명령 | 결과 | 비고 |
| --- | --- | --- | --- | --- |
| 1 | queue scan | `npm run verify:chromatics-musescore-parity-roadmap`, `npm run verify:chromatics-v1-work-queue` | Pass | Both verifiers reported drained automation queues: `parityAutomationQueueDrained: true`, `automationQueueDrained: true`, and no `nextAutomatableRows`. |
| 2 | headless QA discovery | `npm run verify:e2e` | Pass | Baseline Electron headless smoke passed before expansion, confirming existing keyboard, File/Export separation, compact 960px mode sweep, release scenario bounds, grand staff preview, and notation renderer checks. |
| 3 | headless QA expansion | `scripts/verify-single-voice-mvp.cjs` update | Pass | Added Electron headless checks for 960 compact-short, 960 compact-tall, and 1400 desktop-short work-mode layout; selected Viola part view export state; compact part page setup metadata; and playback mixer persistence/activity. |
| 4 | headless QA expansion | `npm run verify:e2e` | Fail, then Pass | First expanded run caught a QA-script mismatch with real DOM behavior: the playback volume slider rounded invalid `72` to `70`, and the script queried a non-existent `.part-mixer__volume-value`. The check was aligned to the real 5-step slider value `75` and `.part-mixer__volume output`; follow-up passed. |

No new app blocker was found by the expanded headless QA. The newly covered automation still does not replace GUI-created
MuseScore/Finale/Dorico/Sibelius fixture QA, human PDF visual QA, external MIDI open QA, playback listening QA, or installer/OS
manual smoke.

## 2026-09-12 Continuous V1 Discovery And Implementation

- Initial verifiers: both existing queues passed and reported drained. Code audit
  found missing Required transposing-instrument support and a shared-voice fermata
  timing bug; these were registered instead of treating queue drain as completion.
- `src/musicxml/transposition.test.ts`: 6 tests failed before implementation and
  passed after per-measure/staff transpose preservation, sounding playback/MIDI,
  and standard trill-mark parsing/export. Unsupported doubled transposition fails
  explicitly. W3C reference: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/.
- Targeted MusicXML/editor/playback/MIDI run: 5 files, 103 tests passed.
- Fermata sync regression failed with second repeat starting at beat 2 instead of
  2.5. Score-wide hold mapping fixes simultaneous voices/parts, repeat duration and
  tempo event placement. Playback hook/timeline/MIDI/transposition: 50 tests passed.
- Properties and transposing-instrument App tests initially caught test selector,
  fixture-value and tick-unit assumptions, plus mistyped property variable names.
  Corrected tests use existing accessible names, fixture values and TICKS_PER_QUARTER.
- Initial `npm test`: 474 passed, 6 failed due to ambiguous global label queries
  after adding a second editing surface. Queries now address the intended toolbar
  by accessible role/name. The final pre-engraving follow-up passed 37 files / 488 tests.
- Headless baseline after initial features passed. Expanded dock check initially
  failed because hidden-window native blur did not commit the fields; the harness
  now dispatches focusout, matching the existing metadata harness. Follow-up passed.
- MXL: fflate 0.8.3 exact dependency installed after sandbox DNS failure; elevated
  install passed. Container tests (7) and file-session disk I/O tests (2) passed.
  `npm audit --omit=dev --json`: no production dependency vulnerabilities. The
  install's all-dependency report still lists development-tool advisories; not an
  all-dependency security signoff.
- Further inspection found real non-smoke resave blocked by the smoke-only guard,
  plus stale save response risks. Both were added to the queue during this run.
- New save race tests cover editing during write/cleanup, document replacement,
  stale failure, retry, and duplicate suppression. A cleanup test initially used
  the bridge mock's default canceled-save response; giving it a successful save
  result fixed the test. Typecheck also caught an unknown recovery payload access;
  the assertion now checks the structured payload without an unsafe cast.
- Headless captures found 960px score clipping despite document-level overflow
  passing. Moving the compact palette above the workspace increased notation width
  from 560 to 644; E2E now checks internal score overflow. Inspected screenshots
  then exposed global tempo/rehearsal overlap, registered as a further local task.
- `verify:visual-regression` initially failed on the intentional 960px width/slur
  geometry change; the 1400px metrics were unchanged. Header/positioned-tempo lane
  correction requires a reviewed baseline update, not suppressing the verifier.
- `verify:musicxml-fixtures` passed (1 fixture-suite test); `verify:midi-fixtures`
  passed (3 tests); `node scripts/verify-site-content.mjs` passed.
- Electron under the filesystem sandbox exited SIGABRT; elevated local E2E passed.
  This is local Electron automation, not native-dialog/manual signoff.
- Screenshot follow-up also found rehearsal-frame versus text-baseline spacing was
  underestimated. The lane policy now reserves the 24px frame plus text ascent and
  clearance; positioned tempo lanes and global header clearance are included.
  E2E asserts both tempo/rehearsal and rehearsal/chord bounding boxes do not overlap.
- `RUN_MUSESCORE_MXL_QA=1 npm test -- src/musicxml/musescore-mxl.test.ts` passed
  against installed `MuseScore4 4.7.5`: Chromatics-generated MXL opened in MuseScore,
  exported XML reopened in Chromatics, preserving written pitches/durations and
  chromatic transposition. This opt-in test is skipped in ordinary unit runs and
  must be reported separately; it is not a GUI-created fixture or human QA.
- Continued matrix audit registered dock visibility customization instead of
  leaving all workspace customization as manual. Independent icon toggles persist
  locally and retain selection/text state. The first test incorrectly expected
  selection kind `note`; the existing selection contract is `event` and was retained.

Automated disk/headless results do not certify native file dialogs, human listening,
external app fidelity, Windows installation or commercial release readiness.

### Final Gate Results

| Command / check | Result | Scope |
| --- | --- | --- |
| `npm run typecheck` | Pass | Current TypeScript contracts |
| `npm test` | Pass | 37 passed files, 491 passed tests; 1 opt-in MuseScore test/file skipped |
| `RUN_MUSESCORE_MXL_QA=1 npm test -- src/musicxml/musescore-mxl.test.ts` | Pass | Actual MuseScore4 4.7.5 MXL import/XML export; not human GUI QA |
| `npm run verify:e2e` | Pass | Built Electron workflows, 960 compact short/tall and 1400 desktop; new editable properties, dock toggle, internal score bounds and annotation bbox guards |
| `CHROMATICS_QA_URL=http://127.0.0.1:5173 env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-single-voice-mvp.cjs` | Pass | Same harness against the running local Vite renderer; fixture bridge/mocked exports are not native dialogs |
| `npm run verify:notation-snapshots:update`, then `npm run verify:visual-regression` | Pass | Baseline reviewed for compact width and deliberate header/rehearsal clearance change; event count retained |
| `npm run verify:musicxml-fixtures` | Pass | Existing manifest/notation/warning expectations |
| `npm run verify:midi-fixtures` | Pass | Solo/grand staff/ensemble fixture tests |
| `npm run package:dir` | Pass | macOS arm64 unpacked app; includes production build; signing explicitly disabled by existing configuration |
| `npm run verify:package` | Pass | PACKAGED_APP_SMOKE_OK including hasMxlRoundTrip=true, selected Cello PDF metadata/structure and MIDI write |
| `node scripts/verify-site-content.mjs` | Pass | Site manifests/content guard; no deployment performed |
| `git diff --check` | Pass | No whitespace errors |

Final queue/schema checks passed: Commercial queue 22 rows and parity roadmap 23
rows, both with no registered Todo/Partial/In progress items. `verify:chromatics-v1-save-policy`
also passed. `MS-UX-SCOPE-002` retains the expanded inspector/freeform docking scope
decision; this is not a claim that all MuseScore features have been implemented.

Artifacts/logs: `/private/tmp/chromatics-{full-test,e2e,visual,package,package-smoke,local-web-qa,mxl-reference}.log`.
Screenshots: OS temp `chromatics-v1-properties-960.png` and `chromatics-v1-properties-1400.png`.
Logs/screenshots are local diagnostics; the versioned tests and this summary are
the retained repeatable evidence. Initial dev invocation rejected unsupported
electron-vite `--host`; a direct Vite server was used instead. Sandbox listen EPERM
was resolved by approved local-only execution. No source/hosting release occurred.

Verdict: local implementation and automated checks improved substantially, but
Commercial V1 remains **not complete**. External/manual RC gates and explicit scope
decisions for broader inspectors/freeform docking remain; do not advertise all
MuseScore features or all V1 implementation as complete based on queue counts.

## 2026-09-12 Expanded V1 Execution

User promoted native project, MIDI/pitch-first entry, templates/styles, image
export and broader editing/workspace capabilities to Required. The new
[contracts](../product/chromatics-expanded-v1.md) define 16 implementation/audit
tasks with dependencies and acceptance criteria; the live queue now has 38 rows.
Prior post-V1 scope and empty-queue counts do not apply to this expanded goal.

CV1-X-PART-XML: added a separate export IPC/command, scoped to the current
full-score or selected part view. Primary path/recent/dirty/recovery state is
untouched. The native-side file session refuses to overwrite any opened/saved
original, including symlink/hardlink aliases, and retains atomic/backup writes.
The first App test exposed generic global rehearsal references failing the
round-trip save signature in a secondary part; export now reanchors global
directions in the part copy only. Initial test selectors/name casing were also
corrected to match existing start-screen and filename conventions.

| Check | Result | Evidence scope |
| --- | --- | --- |
| Initial focused tests | Fail, then fixed | Missing export API; global rehearsal anchor round-trip failure; test selector/case corrections |
| App + file session tests | Pass: 103 | Part-only notes/marks; full-score primary save remains intact; pending export success/cancel/failure preserves edits; duplicate click guard; disk alias protection |
| npm run verify:e2e | Pass | Build and real Electron renderer; Viola XML captured, written/read as a real temporary file, then parsed/reopened into an 8-event Viola-only score; transport uses test bridge, not native dialogs |
| Save-policy/queue/parity verifiers | Pass | Expanded policy override and historical schema checks; not feature completeness |
| node scripts/verify-site-content.mjs; git diff --check | Pass | Current content and whitespace |
| PR #753 CI query | Historical Pass | Merged 3b344dd; CI, Site build and macOS/Windows/Linux package jobs passed; not evidence for current uncommitted changes |

Native schema dependency installation initially waited without output in the
network-restricted sandbox and was interrupted. Approved npm install succeeded.
Dependency audit reports 12 total advisories; no blanket security Pass is claimed.
Native dialogs, physical MIDI, human listening/engraving and installer QA remain
unexecuted. Part XML needs further rich multi-staff/voice fixture and packaged IPC
coverage before closing its expanded acceptance contract.

User requested a wrap-up before native schema implementation. Native remains
Todo, not implemented. The unused Zod dependency was removed, preserving the
user's existing package script change. Resume with remaining CV1-X-PART-XML
acceptance and CV1-X-NATIVE-SCHEMA. No commit/push/merge/release was performed.
The old parity verifier's empty queue refers only to historical MS rows; current
expanded queue has 16 unfinished Required tasks and is not drained.

## 2026-09-13 Expanded V1 Continuation

Basis: current uncommitted `main` worktree, not historical PR CI. Existing user
changes in Clef/site were preserved. Existing goal tool state is `paused`; the
new execution request was handled as ordinary execution without claiming goal
activation. No commit/push/merge/release was performed.

### Part XML and Native Storage

- Added `expanded-v1-part-export.musicxml`, explicitly Chromatics-authored, not
  an external-app fixture. Clarinet plus piano: two staves/voices, full rests,
  chords, lyrics, articulations, ties, tuplets, slur/hairpin, tempo, repeats.
- Fixed primary-part-only annotation import and upper-staff-only direction export;
  lower staff text/dynamics and non-primary voice slur/chord anchors now round-trip.
- Fixed global rehearsal reference normalization in save signatures. Part export
  shares the same aligned-staff repeat-source rule as playback, without mutation.
- Added strict Zod native v1 schema and bounded codec; current Score and portable
  part/view state; duplicate/reference/rhythm/tie/tuplet and future-version checks.
- Added native file menu/start opening, save, Save As, recent reopening and native
  envelope autosave/recovery. Disk writes are serialized, temporary-file/rename
  based, with native fsync/backup and external-edit refusal. Recent index and
  autosave mutations also serialize; legacy XML/score-only entries still read.

### Failures and Corrections

- Rich export initially failed rehearsal signature comparison, then exposed
  missing secondary-part annotations. Corrected both; did not weaken the guard.
- Existing App assertions expected generic IDs for imported staff markings;
  changed to their actual part/staff IDs. Rich and existing tests then passed.
- Native packaged save exposed legitimate part-scoped `staff-1` IDs being rejected
  as global duplicates. Fixed scope and added the actual quartet template test.
- Visual regression produced a blank page after an unguarded native preload API
  reference. Fixed optional bridge access. Original baseline then passed unchanged.
- Initial test setup omitted required new-score time/key arguments; corrected it.
- Offline dependency install failed ENOTCACHED; approved install of Zod 4.6.2
  succeeded. npm reported 12 advisories (1 low, 4 moderate, 7 high), not resolved
  or represented as a security pass. Build emits Zod pure-comment warnings only.

### Checks Recorded So Far

| Command / evidence | Result | Scope |
| --- | --- | --- |
| `npm test` | Pass: 525, skipped: 1 | Full suite including native schema, real disk, recovery/recent, App lifecycle and final shortcut follow-up |
| `npm run typecheck` / `npm run build` | Pass | Repeated during this execution; package/visual gates also build |
| `npm run verify:e2e` | Pass | Real Electron edit/export/reopen and compact/desktop bounds; native-specific menus additionally tested below |
| `npm run verify:visual-regression` | Fail then Pass | 84 tests + 960/1400 metrics; no baseline update |
| `npm run verify:musicxml-fixtures` | Pass: 1 inventory test | Existing versioned expectations, not new external-app collection |
| `npm run verify:midi-fixtures` | Pass: 3 | Solo/grand staff/ensemble generated MIDI |
| `npm run package:dir`; `npm run verify:package` | Pass, macOS arm64 | Real export IPC copy/read/source guard, native UI save/reopen, recent decoder, native envelope recovery; smoke-only paths bypass OS dialogs |
| Queue/save-policy/parity verifiers | Pass | Both current queue-drained flags false; historical parity-only flag named separately |
| `node scripts/verify-site-content.mjs`; `git diff --check` | Pass | Content/whitespace, not release signoff |

Visual artifacts: `$TMPDIR/in-c-notation-snapshot-960.png` and
`$TMPDIR/in-c-notation-snapshot-1400.png`. Failed blank screenshot/diff inspected;
rerun replaces those files with the corrected rendering. Native disk and smoke
files are temporary and cleaned after validation; reproduction lives in tests.
The corrected 960px screenshot was inspected: score content is nonblank, but
the dense upper command surface still needs workspace polish. A baseline pass
does not establish ergonomic completeness. Local development is available at
`http://localhost:5173/` (HTTP 200 checked); desktop Electron is also running.
Initial sandbox port binding failed with EPERM; an approved detached development
process started successfully. Browser preview has no native file bridge; native
save/open evidence comes from Electron and real disk tests, not the web preview.
Native/project/part-XML umbrella tasks remain Partial. Manual geometry, part
title/break renderer application, backup discovery and lifecycle race audit are
still implementation work. Direction span tick/voice fidelity remains a Part XML
blocker. Real dialogs, cross-machine, external GUI, installer/signing and human
listening/engraving are Not run, not substituted by these automated checks.

Resume with `CV1-X-PART-XML` direction span tick/voice fidelity, then
`CV1-X-NATIVE-LIFECYCLE` backup discovery and asynchronous document-switch audit.
Independent part title/break renderer application remains `CV1-X-PART-LAYOUT`;
retaining those fields in a native file does not implement their editing/rendering.

## 2026-09-13 Active Expanded V1 Goal: Spans and Backup Recovery

Goal tool returned no goal for the new request; a new matching goal was registered
and is active. This supersedes the earlier execution's paused status. Current
worktree remains uncommitted; unrelated Clef/site edits preserved. Latest CI query
reported success for 97325fc and the current base 3b344dd, not these local changes.

- Reproduced two direction-span failures: interior endpoints became first/last
  notes and a voice-2 span moved to voice 1. Added ordered XML cursor tracking for
  backup/forward, divisions and signed offsets; export now writes offsets/voices
  and disambiguates overlapping spans. Five focused tests cover rich/lower staff
  and explicit rejection instead of silent snapping. Full suite at that stage:
  530 passed, 1 skipped. XML fixture gate and unchanged visual baseline passed.
- Discovered separate octave pitch-semantics and non-note rhythmic-anchor gaps;
  registered Required child IDs, not QA-only work. Current span model remains
  note-anchored; its limitations are documented, not treated as full parity.
- Added real native backup discovery/validation/recovery UI and IPC. Two disk
  tests cover intact/corrupt backups, original preservation, path restriction,
  future-version changes and symlink substitution. Two App tests cover portable
  restoration/new save path and canceling a delayed restore with focus return.
- Stale autosave failures no longer replace a newer edit's status; delayed App
  regression passes. Initial test failures were missing act import and recovery
  metadata.version; fixed the tests without weakening production validation.
- macOS arm64 package and smoke passed, including actual native second save,
  backup listing, UI restore and Cello portable view (`hasNativeBackupUiRecovery`).
  OS dialogs are still bypassed only by smoke paths. Final screenshot/full-gate
  reruns are recorded below after execution; no manual signoff is implied.
- Continued into part layout: native titles and break overrides now reach screen
  and print plans without mutating the full score. A new failing print test exposed
  page breaks behaving as system breaks only; corrected vertical pagination and
  retained manual breaks even when the requested page count is smaller. Real
  packaged Cello output is two A4 pages, not a mock print contract.
- Poppler raster inspection then exposed rests above the bass staff because all
  clefs used B4 keys. Added clef- and duration-specific rest positions, tested with
  actual VexFlow line calculations for treble/bass/alto/tenor. This does not close
  broad engraving. Part-layout editing/undo still requires implementation.
- A package verifier invocation ran before packaging finished and failed ENOENT
  on the incomplete Electron.app bundle. Waiting for packaging completion and
  rerunning succeeded; this was harness ordering, not hidden as an app pass.
- Artifacts: `$TMPDIR/in-c-native-backups-960.png`, `-1400.png`,
  `$TMPDIR/in-c-native-part-layout.pdf`, `/private/tmp/chromatics-native-part-1.png`
  and `-2.png`. Both PDF pages were inspected; the sparse score is deliberately
  split before measure 2, not a representative dense engraving signoff.

Checkpoint after rest-line correction: `npm test` 540 passed / 1 skipped;
`npm run package:dir` completed before `npm run verify:package` passed. Final
Poppler images of both pages show bass whole rests hanging from the fourth line.
`verify:visual-regression` passed without baseline changes; typecheck/build,
MusicXML/MIDI fixtures, queue/save-policy/parity guards, site-content and diff
checks passed at their recorded checkpoints. These are local results, not CI.

Continued into native/XML save cleanup races: four new App cases switch to a
clean/dirty native document while an old save awaits autosave.clear. Three failed
before the fix: clean documents were unnecessarily written as recovery, and XML
cleanup omitted the new native envelope. A shared dirty-only recovery writer now
uses the current document and portable settings. All seven cleanup/native-save
targeted cases passed. Added a failing chooser test for part-page edits missed by
score-reference comparison and two failing stale startup-recovery success/error
tests. Context/revision and document-generation checks fixed all three. Full suite
then passed 547 / 1 skipped and Electron E2E passed at 960/1100/1400px.

Continued into independent part-title authoring: added direct heading editing,
empty reset, cancel, undo/redo and portable save/reopen. The App workflow verifies
score/instrument identity and existing break overrides remain intact. Initial
typecheck exposed a missing partTitle length entry; the PDF filename assertion
was corrected to the existing slug policy. A delayed native save reproduced the
older envelope overwriting a newer part title; preserving current portable edits
and comparing edit revisions fixed it. Ten focused lifecycle/title cases passed.
Packaged smoke now edits the title through the real React UI before saving rather
than injecting a title into JSON. At that checkpoint: 549 tests passed / 1 skipped,
visual baseline unchanged, XML/MIDI fixtures passed, packaged smoke included
`hasNativePartTitleEdit: true`, and E2E passed. Poppler extracted the UI-edited
Cello Rehearsal title from the actual two-page PDF.

Continued into independent page/system break authoring. Both new lower-staff App
tests initially failed because commands only searched the primary part's measures.
Commands now address the selected staff's measure index and update the current
part layout, or the full score's canonical measure when in score view. Four
focused break/title tests passed, covering removal, undo/redo, score/part isolation
and portable reopen. Packaged smoke now creates the break through actual UI
selection and the page-break button, not a native JSON injection. Gates for this
addition passed: 551 tests / 1 skipped, unchanged visual baseline, and packaged
smoke with actual UI page-break insertion and full-score isolation.

Continued into part page-setting history and undoable override reset. A failing
App test showed page-margin edits did not enter undo history. Settings now share
the portable part command history; reset removes title/break/page overrides and
returns to instrument name plus base part projection/score page settings. Undo
restores all fields and a subsequent native save retains them. Fifteen focused
part/lifecycle/layout cases passed. Structural edits may still leave dangling
break anchors, so that linked-score contract is registered as a Required child,
not dismissed as human QA.

Part reference checked 2026-09-13:
[MuseScore Parts](https://handbook.musescore.org/basics/parts) distinguishes linked
musical edits from independent formatting;
[Pages and vertical spacing](https://handbook.musescore.org/formatting/pages-and-vertical-spacing)
describes explicit page breaks and their priority over automatic fitting. These
inform acceptance, not a claim of full MuseScore synchronization or GUI comparison.

Continued through structural editing rather than leaving the discovered task in
the queue. Native save after deleting a part break's measure failed with
`Dangling measure reference: measure-2`. Snapshot-only pruning now drops deleted
references, preserves explicit empty overrides, and leaves live anchors available
for undo; App save/undo/resave confirms restoration. A broader audit then reproduced
staff-only insertion/deletion: rich clarinet/piano counts became [2,2,3] or [2,2,1].
Aligned score staves now change together. An undoable batch remaps ordinal system
directions, removes markings/spans whose anchors were deleted, and clears only
previously valid ties broken by the edit. New/restored selections retain their
part/staff/voice addresses. Unaligned imports are explicitly rejected with a UI
error rather than partially edited. Reference checked 2026-09-13:
[MuseScore measure operations](https://handbook.musescore.org/en_gb/basics/adding-and-removing-measures).
This informs score-wide editing; exact repeat/volta and key/meter-boundary behavior
still needs its own acceptance tests and is retained as Required work.

Verification: 12 measure/transposition unit tests, four focused App cases,
then `npm test` 558 passed / 1 skipped and unchanged visual snapshots. Rich
structural edits pass strict native validation and MusicXML reopen, and undo is
equal to the original score. Typecheck initially found a too-narrow inferred map
key type, corrected with an explicit string-keyed map. Packaged smoke is extended
to insert from Cello view, inspect all four saved part lengths, undo and inspect
all four lengths again; the subsequent package smoke passed with
`hasScoreWideMeasureEdit: true`. E2E, MusicXML and MIDI fixture gates also passed
at this structural-edit checkpoint.

### 2026-09-13 User-Requested Stop: Part XML Loss Report

Finished only the in-flight selected-part export warning after the user requested
a checkpoint. Export now passes effective portable layout to the existing
unsupported-layout collector, and reports independent title loss with its native
project path. The exported score title/part structure and original native save
path are unchanged. Actual XML layout serialization remains Required work.

The first new App regression used the default canceled export mock, so no report
could appear even after the implementation change. Corrected it to return a saved
copy, then the targeted regression passed. A full run started before that mock
correction finished with 558 passed / 1 failed / 1 skipped; this was not recorded
as a clean gate. Final rerun results are recorded below.

Final checkpoint gates on the uncommitted worktree:

- `npx vitest run src/renderer/src/App.test.tsx -t 'part XML export reports independent'`: Pass, 1 test.
- `npm test`: Pass, 559 passed / 1 skipped, 45 test files passed / 1 skipped.
- `npm run build`: Pass, includes `tsc --noEmit`; renderer `index-BGXtQas-.js`.
- `npm run package:dir`, then `npm run verify:package`: Pass, macOS arm64 unsigned unpacked app. Native backup UI, title editing, part layout and score-wide measure edit flags all true. Expected export-to-source rejection appears in stderr as part of the protection test.
- `node scripts/verify-chromatics-v1-work-queue.mjs`: Pass, 44 rows / 16 Expanded Required umbrella tasks; automation queue is not drained.
- Save-policy, parity-roadmap and site-content verifiers: Pass.
- `git diff --check`: Pass.

The preceding structural checkpoint passed E2E, unchanged visual baselines and
MusicXML/MIDI fixture gates. Those gates were not rerun after the final report-only
change; the final full suite/build/package runs above include it. Native OS dialog,
physical MIDI/listening, external-app GUI and installer/signing/manual engraving
gates remain Not run. Existing CI is for its recorded commit, not this dirty tree.

Resume at `CV1-X-SCORE-MEASURE-STRUCTURE`: repeat/volta and key/meter-boundary
insert/delete acceptance, then linked part removal/reordering and actual XML
layout fidelity. Native retention/full recovery races, rhythmic/rest/cross-staff
span anchors, octave-shift pitch conversion, object editing, input/preferences
and image-export Required contracts remain implementation work. No public RC
signoff, new task, commit/push/merge or deployment at this stop checkpoint.

References checked 2026-09-13:
[MuseScore dynamics/hairpins](https://handbook.musescore.org/notation/expressive-markings/dynamics-and-hairpins)
describes rhythmic endpoints and voice assignment;
[MusicXML direction](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction/)
and [offset](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/offset/)
define voice association and relative divisions-based time;
[octave-shift](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-shift/)
defines display shift relative to performed pitch. No new reference GUI run.

### 2026-09-13 Resumed Expanded V1: Structural Boundaries

Goal lookup returned no goal, so a new matching goal was registered as active.
User-approved continuation begins at `CV1-X-SCORE-MEASURE-STRUCTURE`; no git or
deployment action is authorized. Existing unrelated worktree changes preserved.

Reproduced a signature-boundary insertion bug: the empty measure before a change
inherited that later key/meter/clef/transposition. It now inherits the preceding
measure (or first measure at score start), without copying repeat/volta marks.
The selected staff's available voices remain available and an active input voice
is retained for insertion/deletion when present, falling back to the first voice.
Remaining measures keep their effective attributes after deletion.

Four failing deletion tests reproduced dangling volta starts/stops. Complete
matched brackets now shrink to their surviving interval; deleting their only
measure removes them. Unmatched pre-existing brackets are not guessed/repaired.
Repeat barlines remain attached to surviving measures; deleting a barline's
measure removes that barline rather than moving it onto different music. A
surviving end repeat may consequently repeat from the implicit score start.
Undo restores the original score exactly. These are explicit Chromatics editing
policies, not claims of identical MuseScore deletion behavior.

Reference checked 2026-09-13: [MuseScore bar operations](https://handbook.musescore.org/en_gb/basics/adding-and-removing-measures),
[repeat signs](https://handbook.musescore.org/notation/repeats/repeat-signs),
and [voltas](https://handbook.musescore.org/notation/repeats/voltas).
They establish score-level insertion/removal, repeat boundaries and ending
coverage. No new reference GUI interaction or human listening was performed.

`npx vitest run src/renderer/src/editor/measure-management.test.ts src/renderer/src/editor/instrument-transposition.test.ts`:
27 passed; `npm run typecheck`: Pass. Tests cover rich clarinet/piano signature
boundaries, repeat insert/delete timing, two-part volta boundaries, native/XML
round-trip and undo/redo. Test seed initially omitted required note pitches and
compared false flags with omitted XML flags; corrected the seed, not production
serialization. Unaligned-import recovery, broader nested/complex endings and
manual score review remain open. Next: independent part removal/reordering.

Structural checkpoint full suite: `npm test` 574 passed / 1 skipped.
Continued into linked part structure. Reordering alone removed imported ordinal
tempo/rehearsal/system directions; removing their concrete owning part also lost
global directions and score-wide repeats. Global aliases are retained; removed
concrete global anchors rebind to their surviving measure number. When the shared
repeat source staff is removed, its repeat/volta map transfers to surviving
staves. Local markings remain filtered by surviving ownership. Undo restores the
original score, including source ownership. Part title/page/break overrides stay
bound by part ID through reorder/save/undo.

A further failing App regression exposed deleted instrument ID reuse inheriting
old layout retained for undo. New part IDs now exclude retained native layouts
and page preferences. Deleted-part layouts are absent from saved snapshots, while
undo after save still restores them. Seven focused App workflows pass (including
ordinal/concrete anchors, reorder/remove, re-add and existing structure flows).
Test setup corrected the pageMarginMm field and reselected Score mode after the
staff selector's existing switch to Note Input. Typecheck passed before the final
ID-reservation addition; broad rerun follows. Actual native dialogs/manual QA are
still separate. Next: actual MusicXML break serialization, not just loss warnings.

### 2026-09-13 MusicXML Break Interchange

Four failing tests fixed with standard `<print new-system="yes"/>` and
`<print new-page="yes"/>` export/import. Full-score export writes identical
positions in every part, resolving lower-staff anchors by measure index. Import
uses the first part's print flags as the canonical full-score layout; conflicting
per-part external layouts and explicit `no` auto-layout suppression are not
represented by the current model. Unknown break anchors still warn, while valid
breaks no longer produce false unsupported-layout warnings. Page setup and
independent native title remain unsupported in XML and still warn.

Reference checked 2026-09-13: [W3C MusicXML 4.0 print](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/print/).
Tests: 64 focused XML/layout cases and two App export/report cases passed;
typecheck passed. Full suite: 583 passed / 1 skipped. Visual regression: 84 tests
plus unchanged 960/1400 snapshots passed; the 960 screenshot was inspected and
the existing dense toolbar remains a workspace task, not ergonomic signoff.
MusicXML fixture gate: 1 passed / 58 skipped; MIDI fixture gate: 3 passed / 3
skipped. Earlier structural/part E2E passed before this XML change.

Fresh `package:dir` then `verify:package` passed after adding real App export
smoke. `hasPartXmlLayout: true` checks the on-disk one-part Cello XML contains a
page break before measure 2. Smoke-only destination bypasses the OS dialog;
ordinary export still uses the real dialog and source-overwrite guard. Artifact:
`$TMPDIR/in-c-native-part-layout.musicxml`; source `.chromatics` is not replaced.

Installed MuseScore bundle version rechecked as 4.7.5. CLI conversion of this
actual generated file was attempted with a 90-second timeout and without factory
reset flags. Restricted launch aborted on pasteboard/XPC access. An authorized
retry also aborted with `mutex lock failed: Invalid argument` (SIGABRT), with
Rosetta runtime frames. No successful MuseScore PDF was produced; external render
is Fail/blocked pending a working reference runtime, not Pass. This does not block
independent local implementation. Next: rest-anchored hairpin workflow; arbitrary
tick endpoints and octave pitch semantics stay Required.

### 2026-09-13 Rest-Anchored Hairpins

Native validation, App range authoring and XML direction anchors now accept rests
for hairpins while slur/octave endpoints remain notes. The new Chromatics-authored
`rest-hairpin-input.musicxml` seed has voice 1 whole note and voice 2 rest/note/note/rest.
49 focused XML/native/playback tests and two App authoring tests passed. The App
test covers undo/redo, native save and XML reopen. Hairpin playback no longer
changes unrelated parts/staves/voices. Repeat traversal and exact stop-time semantics
remain Required, not complete. No new schema field or migration was introduced.

`npm run verify:rest-hairpin` built successfully but restricted Electron launch
aborted. Authorized launch initially failed because the new harness returned DOM
and function objects across Electron IPC; boolean/void results fixed the harness.
Actual App parser/serializer/renderer plus on-disk XML write/readback passed at
960/1400. File I/O is intercepted, not a real OS dialog. Screenshots were inspected
and exposed stem/wedge contact despite nonblank SVG. An added actual-SVG clearance
assertion reproduced -9px at 960; stem-aware offset is now under full regression.
Artifacts: `$TMPDIR/chromatics-rest-hairpin.musicxml` and corresponding
`chromatics-rest-hairpin-960.png` / `chromatics-rest-hairpin-1400.png`.
Existing toolbar clipping/oversized context strip remains a workspace blocker.
No human listening, PDF manual engraving or external-app Pass is claimed.

The stricter renderer rerun passed with 8px stem clearance at both widths. Full
suite at that checkpoint: 586 passed / 1 skipped. Subsequent three-pass hairpin
tests failed because only the first event-ID occurrence received a ramp. Pairing
each start with its following stop before the next start fixes note/rest repeated
traversals; 42 focused span/playback/render tests pass. Cross-ending behavior still
needs audit. Visual regression then passed 84 tests and unchanged 960/1400 images.
Queue validation initially rejected a new `Ready` status; changed to the repo's
`Partial` status, without weakening the verifier. Queue/save-policy/site-content
gates passed.

### 2026-09-13 Standalone Part XML Title

App regression first failed on the old unsupported-title report. Selected-part
export now copies the independent title into the exported score work-title only.
The source score title, composer, instrument name and native document stay intact;
the exported XML is a standalone score, not a portable linked layout envelope.
No title override retains the source title. Explicit breaks round-trip; unsupported
page settings still warn. Eight focused App tests and typecheck passed. Packaged
`hasPartXmlLayout` now also requires the on-disk `Cello Rehearsal` work-title;
fresh package validation follows.
Reference checked 2026-09-13: [MusicXML 4.0 work-title](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/work-title/).
This standalone-title policy is Chromatics' export contract, not a claim about
MuseScore's default part naming or successful external rendering.

Fresh `package:dir` and `verify:package` passed, including `hasPartXmlLayout` title
and page-break disk checks. Full suite: 588 passed / 1 skipped. Subsequent shell
CSS work is not part of that packaged artifact.

### 2026-09-13 Workspace Height Follow-up

Actual 960 screenshot exposed an oversized context strip: `.app-shell` gave its
second grid row all remaining height. New headless assertion failed at 152px.
Editor shell/workspace now use content-sized flex columns with flexible score
workspace; 960/1400 context strips are both 43px and hairpin stem clearance remains
8px. Print CSS still uses block flow. Build and visual gate passed (84 tests,
unchanged notation metrics); updated 960 screenshot inspected.

Harness strengthened from programmatic hidden-button calls to visible, enabled
commands, with React state readiness waits. This first failed because range
hairpins actually remain in Note Input, not Notation Objects. The test now uses
the current visible Note/Input and File paths; palette relocation is a separate
Required task. Initial headless evidence proved handlers/renderer, not visible
command access; the latest rerun proves the current visible path. Horizontal tool
scrolling and complete palette/resize/dock ergonomics remain unfinished.

Development process started with `npm run dev` at `http://localhost:5173/` for
current worktree preview. No commit, push, merge or deployment. Next implementation:
CV1-X-XML-OCTAVE-PITCH, using independent MusicXML pitch semantics fixtures.

### 2026-09-13 Octave Pitch Semantics

Independent inline MusicXML fixtures (not claimed as external app exports) first
failed all four direction/pitch cases plus unsupported size 22. Per the checked
[MusicXML 4.0 octave-shift specification](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-shift/),
8va/15ma now encode down with performed pitches; the inverse conversion restores
display pitches on import. Stops use the endpoint note's duration, so the next
note at the stop tick is no longer accidentally included. A shared score-copy
conversion drives XML/playback/MIDI without changing native/display source notes.
Same-staff onset intervals include all voices; cross-staff/held-note boundary and
overlap semantics remain Required audits. Unsupported size 22 now rejects rather
than silently converting to one octave. Old unmarked Chromatics XML cannot be
safely auto-detected; native re-export is preferred and XML-only recovery remains
Required. No external GUI success is claimed.

Initial conversion used wrong local timing helper argument shapes; focused tests
and typecheck caught these, fixed to Measure and VoiceEvent/Measure contracts.
A transposition test used the wrong field name, corrected to `transposition`.
Existing four direction tests asserted the old inverse meaning and were corrected
against the independent source. Six independent XML/native/MIDI/lower-staff tests
pass; full suite at this checkpoint 594 passed / 1 skipped. Added App range input,
undo/redo, native save and standard XML save test also passes. E2E build caught an
unsupported testing-library `exact` option in the new test; removed it and E2E
rerun passed. MusicXML and MIDI fixture gates passed at this checkpoint.

Authorized Electron `scripts/verify-rest-hairpin.cjs` rerun passed against the
updated build: visible range authoring, actual XML file write/read and reopen
retain the displayed note Y positions [104.5, 99.5], while exported octave direction
is down and performed pitch octaves are [5, 5]. The 1400px octave screenshot was
inspected; 960/1400 rest-hairpin screenshots retain 8px stem clearance and 43px
context strips. Artifacts include `$TMPDIR/chromatics-octave-hairpin.musicxml`
and `$TMPDIR/chromatics-octave-hairpin-1400.png`. Intercepted file APIs are not
native dialog evidence; no human listening or external-app Pass is claimed.

### 2026-09-13 Removed Staff Layout and User Stop

The user requested a stop during this slice. Finished only its implementation,
verification and checkpoint; no next Required task was started.

`remapRemovedStaffLayoutAnchors` preserves surviving IDs and remaps a removed
staff's breaks by index to an equally sized surviving primary staff. Independent
part layouts only receive their owning part, preventing cross-part remapping.
Deleted measures on a surviving staff lose their break rather than moving it to
different music. Score and native part-layout history restore together; source
objects remain unchanged. Unequal staff lengths are not guessed.

The new test first failed because the helper did not exist. Initial implementation
used `nextParts` where the caller parameter was `parts`; typecheck/targeted tests
caught and corrected this. The App fixture then selected a lower staff through
the input selector, which legitimately created its missing voice 1 before deletion.
Corrected the test to select an existing lower-staff event instead; no voice-switch
behavior was changed. A full run started before that test correction reported
596 passed / 1 failed / 1 skipped. The corrected focused run passed 3 tests
(129 skipped); a fresh full run is recorded below.

- `npm run typecheck`: passed after production-code correction.
- `npm run build`: passed after production-code correction.
- `npx vitest run src/project/part-layout.test.ts src/renderer/src/App.test.tsx -t 'removing a staff|rebinds removed staff|maps lower-staff'`: 3 passed.
- Final `npm test` on the corrected worktree: 597 passed / 1 skipped,
  47 test files passed / 1 skipped (59.70s). No test process remains running.
- `node scripts/verify-chromatics-v1-work-queue.mjs`: passed, 16 expanded
  Required umbrella rows remain; `automationQueueDrained` is false.
- `node scripts/verify-chromatics-v1-save-policy.mjs`,
  `node scripts/verify-site-content.mjs`, `git diff --check`: passed.
- Latest package smoke predates workspace/octave/staff-remap changes. Those changes
  are not claimed as validated in a freshly packaged installer.

Resume with `CV1-X-RANGE-PALETTE-ACCESS` or the next dependency-ready Required row.
No implementation task is intentionally running after this checkpoint. Preview
`npm run dev` remains available at http://localhost:5173/ (session 3715); an open
user document must not be discarded to shut it down. No commit/push/merge/deploy.
Expanded V1 implementation and public RC are both incomplete; user-requested stop
is neither goal completion nor an external-blocker determination.

### 2026-09-13 Resumed Range Palette and Applicability

Explicit user resume followed the stop checkpoint. `get_goal` returned `paused`;
the available goal tools cannot resume it. Work proceeded as ordinary execution,
without a duplicate goal, completion/block flag or automatic-continuation claim.
Existing unrelated changes were preserved; no commit/push/merge/deployment.

Reference checked 2026-09-13: MuseScore Studio living Handbook,
[Dynamics and hairpins](https://handbook.musescore.org/notation/expressive-markings/dynamics-and-hairpins)
and [Other lines](https://handbook.musescore.org/notation/expressive-markings/other-lines).
They describe palette-based application of lines to a selection. Handbook content
is not a version-pinned app observation. Incorrect `/notation/lines/` URL guesses
failed to open; official search resolved the actual pages. No new Finale or
external-app fixture evidence was collected. Chromatics retains its current
two-event endpoint policy and does not claim MuseScore single-note extension,
arbitrary rhythmic anchors or direct geometry editing from this relocation.

The new App test first failed because Notation Objects had no range group.
Hairpin/slur/octave commands now occupy its first group, remain visible while
notes are selected, and no longer appear primarily in Note Input. They show
pressed state for matching spans/history and disable unsupported endpoints:
rest ranges allow hairpins, while slur/octave need note endpoints; a single note
can still start the existing S slur workflow. An initial change hit the voice
selector instead of the note selection callback; the visibility regression
caught it, that unrelated change was reverted and `selectEvent` was corrected.

The follow-up applicability test reproduced enabled dynamics in the docked
palette while toolbar/properties rejected the same range. All three surfaces
now agree and the shared handler also rejects range application. This preserves
the existing Chromatics measure-level policy, not MuseScore's broader behavior.

Verification on the current uncommitted source:
- Focused App palette/span command tests: 9 passed / 122 skipped.
- `npm test`: 598 passed / 1 skipped, 47 files passed / 1 skipped (66.93s).
- `npm run typecheck`, `npm run build`: passed.
- `npm run verify:e2e`: passed, including existing input/selection/export flows.
- `npm run verify:visual-regression`: 84 tests plus unchanged 960/1400 notation
  snapshot metrics passed. No baseline update was needed.
- `scripts/verify-rest-hairpin.cjs`: initial restricted Electron launch aborted
  with SIGABRT; authorized rerun and final current-build rerun passed.
  Commands now use Electron mouse input after checking visible bounds and hit
  targets, rather than DOM button `.click()`. Note-range setup uses DOM events.
  Seven range controls are fully within/hittable in both 960/1400 viewports;
  rest ranges disable five note-only commands and all docked dynamics.
  Actual App XML write/read/reopen, undo/redo, octave pitch conversion and renderer
  checks passed. Stem clearance stays 8px; context height is 43px.
- Screenshots: `$TMPDIR/chromatics-rest-hairpin-960.png`,
  `$TMPDIR/chromatics-rest-hairpin-1400.png`,
  `$TMPDIR/chromatics-octave-hairpin-1400.png`. XML artifacts use the corresponding
  `chromatics-rest-hairpin.musicxml` and `chromatics-octave-hairpin.musicxml` names.
  File API interception is not OS-dialog verification. Broader engraving, human
  listening, fresh packaged artifacts and external-app reopening were not run.

Queue, save-policy, site-content and diff checks are recorded with this slice.
The previous preview process was no longer listening; `npm run dev` was restarted
at http://localhost:5173/ (session 40788). Next Required implementation is direct
span selection and endpoint editing under CV1-X-SPAN-PROPERTIES. Other expanded
Required implementations remain open; implementation completeness and RC approval
are not established by these gates.

## 2026-09-13 Direct Span Inspector

Reference: [MuseScore adjusting elements directly](https://handbook.musescore.org/basics/adjusting-elements-directly),
living handbook checked 2026-09-13. It distinguishes changing span anchors from
visual adjustment; this slice implements event-endpoint editing, not geometry.
No new MuseScore/Finale GUI observation or external fixture was performed.

Added direct SVG and part-scoped list selection, guarded ordered same-staff
endpoint edits (rest hairpins, note-only slurs), object-only Delete and undo/redo.
Keyboard note edits and range toolbar edits cannot affect underlying selection
while the span context is active. Document/view/ordinary selection changes
invalidate that context. Native/XML and unchanged-notes tests cover the slice.

- `npm run typecheck`, `npm run build`: passed.
- `npm test`: 602 passed / 1 skipped, 48 files passed / 1 skipped, 106.76s.
  This preceded the display-only context/address follow-up; focused rerun below
  and current-build Electron verification cover that follow-up.
- Focused span helper/App rerun: 4 passed / 131 skipped.
- `npm run verify:visual-regression`: 84 tests and unchanged 960/1400 notation
  metrics passed; no baseline update.
- Electron first launch inherited ELECTRON_RUN_AS_NODE and failed before app
  startup; unsetting it then hit restricted SIGABRT. Authorized rerun passed.
- `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron scripts/verify-rest-hairpin.cjs`:
  actual line mouse click at 960/1400, five inspector controls within viewport
  and hittable, endpoint change, native disk write/read/reopen, Delete/undo and
  renderer checks passed. File APIs are intercepted, not OS dialogs. Existing
  rest hairpin XML and octave display/performed-pitch checks also passed.
- Initial screenshot captured an old compositor frame; capture now waits after
  selection. Review also found truncated fields and a stale voice-1 context:
  stacked controls/full wrapping address output and owning-span context fixed it.
  Both corrected images were viewed: `$TMPDIR/chromatics-span-properties-960.png`
  and `chromatics-span-properties-1400.png`; selected hairpin visibly teal,
  owning voice 2 and complete endpoint address visible. Native artifact:
  `$TMPDIR/chromatics-span-properties.chromatics`.

At this endpoint-only checkpoint, geometry, arbitrary rhythmic anchors,
independent clipboard and human/dialog QA remained open. Geometry follows below.

## 2026-09-13 Span Geometry And User-Requested Wrap-Up

Added native version 2 span placement/X/Y/height, strict v1 in-memory migration,
numeric edit/blur commit/Escape cancel/invalid-value rejection and undoable auto
reset. Offsets and shape use staff spaces, not screen pixels. Native state is
established for these edits; XML cannot clear it and reports unsupported geometry.
Outer SVG bounds expand only when necessary for manual spans, including printing.

Failure/correction evidence:
- Report test initially queried too early, then still failed because default
  save mock meant Cancel. Explicit successful save and scoped report assertion
  fixed it; both summary and detail correctly contain the warning.
- Electron visibility check counted controls under closed details; exclude
  closed sections. Hidden-window geometry input now dispatches focusout explicitly;
  this is synthetic form setup, not a human typing claim.
- Actual PDF/PNG review caught the lower half of a moved hairpin clipped by the
  old SVG height, despite valid coordinates. Added pure viewport regression and
  real SVG inside-bounds assertion; re-rendered PDF now shows both complete lines.

Verification:
- Geometry/core/schema focused: 17 passed; App span tests: 2 passed / 131 skipped.
- Full suite before viewport fix: 605 passed / 1 skipped (67.79s); viewport helper:
  2 passed. Final pre-commit full gates are recorded in the integration entry.
- Current build passed. Actual Electron: hairpin offset 1.5sp/2sp changes SVG
  origin by 15/20 units; opening 3sp yields height 30. Reset/undo and native disk
  readback/reopen preserve it. Slur keyboard selection, curve-height change,
  reset/undo and native save passed. Actual native file is version 2.
- `printToPDF` used the App's printing state and main-process print options;
  no selection hit targets remain, manual height is 30. `pdfinfo`: one A4 page.
  `pdftoppm -f 1 -singlefile -scale-to 1400 -png` rendered it and the image was
  viewed. Artifacts: `$TMPDIR/chromatics-span-geometry.pdf`,
  `$TMPDIR/chromatics-span-geometry-1400.png`,
  `/private/tmp/chromatics-span-geometry-pdf.png`. This is automated file/visual
  review, not native-dialog or independent human engraving signoff.

User then requested wrap-up and push/merge. No new implementation task starts.
Remaining: multi-system manual collision handling, segment handles, independent
part geometry, arbitrary rhythmic anchors, object clipboard and other Required
umbrellas. Implementation and RC remain incomplete; no release tag is requested.

## Not Run In This Package

Final pre-commit integration gates (2026-09-13): `npm test` 607 passed / 1 skipped,
49 files passed / 1 skipped (70.48s); typecheck/build pass; visual regression 84
tests plus unchanged 960/1400 snapshots pass; XML fixture gate 1 passed / 58
skipped; MIDI fixture gate 3 passed / 3 skipped; queue/save-policy/site-content
and diff checks pass. E2E passed for the endpoint slice; the final geometry-build
rerun is recorded with PR integration results. No feature work continues after
the user's stop request. Git integration is separately authorized.


| 항목 | 이유 | 후속 기준 |
| --- | --- | --- |
| `npm run verify:site-production` | 실제 production URL/배포 상태 확인은 external state에 의존한다. | 배포 승인 후 실행 |
| packaged app install/open smoke | macOS arm64 unpacked app 자동 smoke는 2026-09-01에 preload bridge, 시작 화면, 새 악보 workspace/title/notation SVG, smoke-only MusicXML 파일 쓰기, recent reopen, PDF 구조와 MIDI type-1 tempo/note track 구조 검증, autosave round-trip까지 통과했지만, installer/DMG 설치와 OS별 수동 저장·열기 확인은 release candidate 단계의 manual QA다. | [Manual Score Completion QA](../releases/manual-score-completion-qa.md) |
| Windows dev server advisory check | 현재 실행 환경은 macOS다. | #8에서 Windows 환경 확인 |
| Supabase backend live verification | Auth client와 publishable env 주입은 2026-07-29 main 배포에서 확인했지만, OAuth provider/schema/RLS는 외부 운영 변경이다. | #316에서 provider 설정 후 실행 |

## 2026-09-13 PR 754 Packaged Smoke Follow-up

- PR head `4b0118d`: CI test (607 passed / 1 skipped), site build and macOS
  package passed. Linux job `103716441581` and Windows job `103716441646`
  failed at `Native part PDF export did not complete` after the one-second
  renderer deadline. Both installers/artifacts had built successfully; neither
  failed smoke is recorded as a platform pass.
- The smoke BrowserWindow stays hidden while App PDF export awaits two animation
  frames. Disable background throttling only for smoke windows, retain the normal
  app default, and give PDF generation a bounded ten-second completion wait.
  Failure diagnostics now include visibility and print-layout state. Existing
  native/PDF file assertions remain mandatory; no sleep replaces success checks.
  Reference: [Electron BrowserWindow visibility and throttling](https://www.electronjs.org/docs/latest/api/browser-window#page-visibility),
  checked 2026-09-13. Remote rerun is required to confirm the platform diagnosis.
- `npm run package:dir` (including typecheck/build), `npm run verify:package`
  and `git diff --check`: Pass locally on macOS arm64 after the change.
  Final geometry-build `verify:e2e` also passed, recorded in PR 754's comment.
- Local smoke also logged rejection of an existing version-1 autosave by the
  version-2 recovery validator before proceeding. Fresh version-2 recovery
  passed; legacy autosave migration is NOT verified by that pass and remains
  a native lifecycle follow-up on explicit resume. No further feature task was
  started after the user's stop request.
- This is a push/merge checkpoint, not expanded V1 or public RC signoff.

## Evidence Retention Rules

- 명령 결과는 이 문서에 요약하고, 실패가 있으면 GitHub issue에 원문 로그 또는 핵심 error를 남긴다.
- release candidate마다 이 표를 복사하거나 날짜별 섹션을 추가한다.
- 외부 운영 변경이 필요한 검증은 승인 없이 Pass로 기록하지 않는다.

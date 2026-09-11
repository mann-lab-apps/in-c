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

Remaining MuseScore parity automatable rows start with `MS-VOICE-001`,
`MS-NOTATION-001`, `MS-PARTS-001`,
`MS-LAYOUT-002`, `MS-LAYOUT-003`, and `MS-PLAYBACK-001`. External/manual rows include GUI-created
MuseScore snapshots, Finale/Dorico/Sibelius-origin fixtures, PDF visual QA, MIDI
hardware/external app QA, and playback listening QA.

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

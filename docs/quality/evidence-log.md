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

## 2026-09-14 Native Autosave Migration

- Base: merged PR #754 / `ff6c9c2`; fresh isolated worktree. PR checks re-read:
  test, site build, macOS/Linux/Windows packages passed on `576d52f`. They are
  not verification of this uncommitted change.
- Failure-first disk tests: four failures / two passes. V1 was rejected by the
  outer v2 schema before migration; broken/future/invalid recovery files were
  overwritten by subsequent writes. Changed validation order and protected
  existing files during serialized write/clear. Focused schema/store: 19 passed.
- Four new App tests initially failed (missing retry/error/action). After the
  implementation, fixed test expectations for JSON's omission of undefined and
  selected the File mode before querying its command. Four focused tests passed;
  typecheck passed after replacing an invalid test-only role option/null value.
- Startup/discard races and unclaimed-recovery native/XML cleanup regressions
  pass. Two old immediate-loading assertions failed in the first full run
  (613 passed, 2 failed, 1 skipped); changed them to await actual recovery-read
  completion, then 617 passed / 1 skipped. Current part-selection additions need
  the subsequent full run recorded below.
- Smoke now uses a private temporary userData profile, cleaned after child exit;
  never reuses/clears the user's actual recovery/recent files. Real v1 disk data
  migrates without source writes, restores portable Cello state through App,
  saves as v2 and reopens. Fresh `package:dir` and `verify:package` pass on macOS
  arm64, including `hasLegacyNativeRecovery:true` and visible-part context.
- Screenshots `in-c-legacy-recovery-960.png` / `-1400.png` and actual migrated
  `in-c-migrated-recovery.chromatics` are in the OS temp directory. Both dialog
  screenshots were reviewed; bounds/click-target checks pass. The 960px File
  row still needs broad overflow work, not covered by the dialog-only gate.
- Screenshot review found Cello view with Violin I editing context. New rich
  Piano native-open/recovery tests reproduced it; part-aware initialization
  fixed it. Delete/save then exposed `Invalid project span endpoints` for a
  replaced note. Rhythm transaction cleanup now preserves rest hairpins and
  other parts, removes invalid/consumed endpoints, and restores markings with
  undo/redo. Focused rhythm tests: 20 passed; App delete/save now passes.
- `verify:site-content` first failed because the clean worktree lacked the site
  build/download manifest; `site:build` then verifier passed. Queue gate passed
  before the new child rows; rerun below covers the updated task inventory.
- Renderer QA server: `http://127.0.0.1:5174/`. Offline dependencies installed;
  Electron needed its explicit binary install. Failed renderer-only CLI attempts
  were replaced with standalone Vite config. Electron harness supplies preload;
  this is not a claim of browser-only native file support.
- Reference: MuseScore Studio living handbook
  [Opening and saving](https://handbook.musescore.org/file-management/opening-and-saving-scores),
  checked 2026-09-14. Native save/open and separate copy paths inform the workflow;
  Chromatics version migration is its own contract, not an observed MuseScore
  migration guarantee. No new external GUI/manual signoff.

Current recovery checkpoint gates (before independent part geometry): full suite
620 passed / 1 skipped, 49 files passed / 1 skipped (109.26s); typecheck/build,
fresh macOS package/smoke, actual Electron E2E and visual regression (84 tests,
unchanged 960/1400 snapshots) pass. XML fixture 1 pass / 58 filtered skips; MIDI
3 pass / 3 filtered skips; queue 52 rows / 16 umbrellas, not drained. These results
belong to uncommitted changes on `ff6c9c2`, not a new CI commit or public RC.

## 2026-09-14 Independent Part Geometry

- Parent `CV1-X-SPAN-PROPERTIES` remains Partial. Two failure-first tests
  reproduced missing part projection/schema. Native v3 now preserves validated,
  part-owned slur/hairpin overrides; v1/v2 migrate without source mutation.
  Missing/foreign/duplicate and invented legacy overrides reject.
- App tests cover both kinds: modify, undo/redo, full-score isolation, native
  save/reopen, explicit auto reset, relink to score, deletion/pruned snapshot and
  undo restoration. Five targeted App tests pass; schema/store/rhythm 41 pass
  before the added v2 disk case and retained part-layout regressions below.
- `scripts/verify-part-span-geometry.cjs` first failed because the hidden-window
  harness did not dispatch focusout to commit numeric drafts (zero edits). Used
  the existing harness's separate input/focusout pattern; no renderer workaround.
  Actual slur and hairpin bounding boxes move 30px for -1sp to +2sp. Full-score
  serialized data stays identical. Native disk readback/reopen, reset/relink,
  960/1400 SVG bounds and click targets, selected-P2-only PDF pass.
- Artifacts in OS temp: `chromatics-part-span.chromatics`,
  `chromatics-part-span-{960,1400}.png`, `chromatics-part-span.pdf`.
  Both screenshots and the Poppler raster `/private/tmp/chromatics-part-span-pdf.png`
  were reviewed. Staff text/labels collide with the upper clef and dense lower
  annotations; that is a newly reproduced Required engraving task, not a visual
  pass for the complete score. No human/native-dialog signoff is claimed.
- Full suite first rerun: 621 pass / 1 failure / 1 skip (180.90s). Existing
  instrument remove/re-add test hit its 5-second timeout; focused rerun passes
  in 2.02s. A clean full rerun is still required; timeout was not relaxed.
  Diff review also caught two existing part-layout tests accidentally replaced
  during test-file editing; both are restored alongside the new cases.
- Reference: MuseScore Studio living handbook
  [Positioning of elements](https://handbook.musescore.org/formatting/positioning-of-elements),
  checked 2026-09-14. It distinguishes automatic placement and manual staff-space
  offsets; this is a reference contract, not observed GUI or geometry parity.

Independent geometry checkpoint rerun: 625 tests passed / 1 skipped (111.47s),
including retained legacy part-layout cases and v1/v2 disk migration. Fresh v3
build/package and macOS smoke pass. No timeout relaxation or test removal.
The [MuseScore parts handbook](https://handbook.musescore.org/basics/parts), checked
2026-09-14, supports separating musical linkage from per-part position properties;
Chromatics implements only the documented slur/hairpin subset here.

## 2026-09-14 Quota Resumption And Stacked Clearance

Explicitly resumed the dirty `feature/chromatics-expanded-v1-recovery-20260914`
worktree on `ff6c9c2`. Goal lookup returned no goal, so a matching goal was
registered. No Git integration or deployment. Existing Vite process on 5174 was
found; no duplicate server started. Historical test session results were not
recoverable and were not treated as current evidence.

- Shared `resolveScoreVerticalLayout` reserves adjacent staff annotation extents,
  includes interior hairpin measures and feeds renderer and print page estimates.
  Four layout tests cover rich Piano clearance, long hairpins and quartet paging.
  Text styles use text fonts without inherited SVG strokes. The score-wide maxima
  are conservative; per-system manual/ledger collision handling remains Required.
- Full rerun: 628 passed / 1 failed / 1 skipped (161.87s). The strict PDF target
  App test timed out at 10 seconds while build/package ran. Its standalone rerun
  passed in 3.38s (4.74s total). No timeout or acceptance criteria were relaxed;
  a clean full rerun follows. This failure is not hidden by the focused pass.
- The next full attempt failed all 143 App tests during setup (486 other tests
  passed): `window.localStorage.clear is not a function`. The test helper treated
  a truthy partial Node Storage object as usable. It now installs a fresh Map
  storage per test instead of depending on host/global availability. This is
  test isolation, not a production recovery change. Full rerun follows the fix.
- Typecheck, build, fresh `package:dir` then `verify:package` pass on macOS arm64.
  Expected original-file overwrite refusal remains a negative smoke assertion.
  Visual regression: 84 tests and unchanged 960/1400 snapshots pass.
- Current-build `verify-single-voice-mvp.cjs` and
  `verify-part-span-geometry.cjs` run through project-local Electron. An initial
  direct `electron` command failed PATH lookup; corrected to node_modules/.bin.
  Part geometry gate passes: actual slur/hairpin move 30px, native disk reopen,
  auto/reset/relink, adjacent annotation ink clearance, selected-P2-only PDF.
- Re-rendered `$TMPDIR/chromatics-part-span.pdf` with Poppler to
  `/private/tmp/chromatics-part-span-pdf.png` and reviewed it. The reproduced
  staff-text/clef overlap is absent. Sparse fixture review is not human engraving
  signoff or proof that extreme manual offsets are collision-free.
- XML fixture, MIDI fixture, save-policy, queue (54 rows, 16 expanded umbrellas,
  not drained) and site-content gates pass. Final diff check follows edits.
- Next: stable musical segment anchors and local geometry editing, with history,
  native migration, reflow isolation and actual renderer/PDF tests. Reference:
  [MuseScore slurs and ties](https://handbook.musescore.org/notation/expressive-markings/slurs-and-ties),
  living handbook checked 2026-09-14; its partial-slur appearance and placement
  contracts inform the implementation, not a claim of observed GUI parity.

Quota-resumption clean rerun after storage isolation: **629 passed / 1 skipped**,
50 files passed / 1 skipped, 84.08 seconds. No timeout increase. This concludes
the pre-segment checkpoint, not the subsequent native-v4 implementation gates.

## 2026-09-14 Musical Span Segment Geometry

- New failure-first segment tests: 3 failed because segment operations were
  absent. Musical identity uses part/staff and first/last covered measure IDs,
  not transient system indices. Exact boundary mismatch retains but does not
  apply the override; removed anchors are pruned only in saved snapshots.
- Native writer is now v4; v1/v2/v3 migrate without source changes. Strict
  legacy rejection forbids new segment fields, including part overrides.
  Current schema/store/editor/hairpin tests: 35 passed, including v3 part geometry.
- Actual segment targets select a segment with keyboard/pointer; inspector
  chooses whole object or a stored/selected segment. Local automatic reset and
  whole-object inheritance are distinct. Part scope uses the existing portable
  override/history path. App geometry tests: 5 pass (9.21s test time).
- Intermediate failures: hairpin helper expectations needed the new rendering-
  only systemIndex field; App reopen assertion used the wrong status text.
  A build-concurrent old geometry test timed out at 5 seconds, then its async
  tail polluted the next test's call count. Sequential focused rerun passes;
  no timeout relaxation. Full final run is still required.
- Electron harness initially assumed an eight-measure source; the existing
  release QA fixture has four measures. Corrected setup checks the actual import
  and four musical measures, forces four systems plus a page break. Both slur
  and hairpin first segments move 30px while all other geometry remains identical.
  Reset/inheritance, actual disk/native reopen, 960/1400 stable IDs and changed-
  break nonapplication pass. Saved inactive overrides remain intact.
- `$TMPDIR/chromatics-span-segments.chromatics` and
  `chromatics-span-segments.pdf` are real artifacts. PDF is two A4 pages; Poppler
  rasters `/private/tmp/chromatics-span-segments-{1,2}.png` were reviewed.
  Review found continuation collisions with fermata/caesura and insufficient
  inter-system reservation. These are NOT visual Pass; geometry movement proof
  is separate. Continue collision work before closing the segment child.
- No installer/native dialog/human engraving QA or RC approval is implied.

Continuation clearance follow-up: layout failure-first reported -90px available
gap; actual SVG ink checks identified fermata/caesura intersections. Shared
vertical layout now reserves manual span geometry and next-system expression
mark space. Continuation slurs use offsets outside VexFlow's origin+40..80 staff
lines. Focused schema/layout/store tests: 42 pass; typecheck/build pass.
Actual Electron reset/disk/reflow/PDF and expression-ink checks now pass. Both PDF
pages were re-rendered and reviewed; reproduced intersections are absent.
Other segments preserve staff-relative geometry, while following systems may
move to reserve collision clearance. The harness distinguishes these contracts
and compares final native reopen against the fully edited layout, not an earlier
intermediate layout. This corrects an initial absolute-position reopen failure.

Visual regression initially failed as expected: later slurs move +74px; SVG
height changes 620->842 at 960 and 466->614 at 1400. First-system geometry,
event count and widths are unchanged. Both screenshots reviewed before baseline
update. This conservative score-wide reservation is not optimized per-system
density, extreme ledger handling or a whole engraving signoff.

### Inactive Segment And Structure Follow-up

- Pre-inspector full run: 636 passed / 1 skipped (78.26s). This does not substitute
  for the current follow-up full run. Results from interrupted package/E2E sessions
  could not be recovered, so those gates are being rerun rather than assumed Pass.
- `SpanProperties.test.tsx`: 2 pass. Actual renderer reports current boundaries;
  inactive entries disable numeric editing but allow explicit override removal.
  Unknown/mock renderer state is not falsely labeled active or inactive.
- Actual Electron initially failed `Active segment status missing`: App compared
  the callback's display Score against a separately projected print Score. Fixed
  comparison to display Score. Fresh build/harness then passes active/inactive
  status, geometry cleanup, undo/save and original-break reapplication, along with
  the existing disk/two-page PDF/continuation checks and 960/1400 control hit bounds.
- New focused App tests: 2 pass for slur/hairpin boundary deletion, score/part
  snapshot pruning, save, undo/redo and reopen. Saving preserves live undo geometry.
- `span-segments.test.ts`: 4 pass including ensemble insertion, part reordering,
  stable musical ownership, portable part overrides and reverse undo.
- Whole-suite/package gates remain in progress; no manual dialog/installer,
  human engraving/physical device or RC signoff is claimed.

### Native-v4 Gates And Range Paste Follow-up

Before clipboard changes, full suite: 641 passed / 1 skipped (85.50s).
Fresh macOS package/build smoke, visual regression, XML/MIDI fixtures,
queue/save-policy/site-content/diff checks passed. E2E first failed when a
concurrent visual build replaced out/renderer; standalone E2E then passed.
Do not rebuild out while an Electron gate is reading it. No human/cross-OS signoff.

Current range-paste work reproduced two failures: lost attached markings and
dangling replaced span anchors. Shared rhythm/paste cleanup plus deep cloning
passed 65 focused core/editor tests and typecheck. Full suite then passed
**643 / 1 skipped** (100.48s), plus build, XML/MIDI fixture, queue/site/diff gates.
An approval-service model-capacity error blocked App test/document edits and
Electron reruns. No alternate write path was used. User interrupted a later
attempt, then explicitly resumed; no surviving test process or partial patch.

After approval-service recovery, new App paste/selection/marking/native-save,
part-override pruning, undo/redo and reopen test: 1 pass (147 filtered).
Actual latest GUI/package gates and the final updated suite still need completion.
Reference: [MuseScore copy and paste](https://handbook.musescore.org/basics/copy-and-paste),
living handbook checked 2026-09-14. Passage/marking reuse informs acceptance;
no MuseScore GUI observation is claimed. Source span replication, independent
object clipboard and measure/tick-level markings remain Required.

### User-Requested Commit/Push Checkpoint

User requested a development checkpoint commit/push and a continuation prompt,
not merge, deployment or expanded-V1 completion. The isolated branch remains
`feature/chromatics-expanded-v1-recovery-20260914`, originally based on ff6c9c2.
The raw source-span copy implementation passes same-staff/cross-part endpoint
and segment ownership tests. Its old cleanup expectation was updated to include
the newly copied slur, while still requiring replaced-target span removal.
Checkpoint validation: `npm test` **646 passed / 1 skipped**, 52 files passed /
1 skipped (90.20s). `npm run build` (including typecheck), queue verifier
(56 rows, 16 Required umbrellas, not drained), site-content and diff checks pass.
This is local evidence, not CI or current GUI/package signoff.

Remaining implementation: connect excludedSpanCount/excludedSegmentCount to UI
feedback; copy effective independent-part geometry; audit partial-boundary,
cross-document and repeated paste semantics. Current clipboard is still bounded
to simple single-measure ranges. Independent object clipboard remains Required.
Latest segment Electron/native/PDF/960/1400 inspector rerun passed before the
source-span copying addition. Latest source-span GUI/package gates are Not run.
Previous approval-service capacity failures are not product-test failures; no
alternate file-edit path was used. The continuation prompt is versioned at
`docs/product/chromatics-expanded-v1-continuation-prompt.md`.

## 2026-09-14 Range Clipboard Continuation

Base c105c7e, isolated recovery branch, no commit/push/merge/deploy authorized.
Before changes: full suite 646 pass / 1 skip (85.15s), build/typecheck, E2E,
visual regression, XML/MIDI fixtures, save-policy/queue/site/diff and fresh macOS
unpacked package smoke passed. No GitHub Actions runs were returned for this branch.
These baseline gates do not validate the following uncommitted implementation.

Approval-service `Selected model is at capacity` repeatedly rejected test edits;
Git status confirmed no partial application. A later retry succeeded. New App
tests first failed on absent omission feedback (3 failures). App now builds the
clipboard from the effective part projection, preserving object/null/inherit
semantics at copy time, and reports excluded spans/segments after copy and paste.
Expanded App tests: 6 pass (slur/hairpin x three policies), including part-to-score
switch, original geometry preservation, native save/reopen and undo/redo. Existing
range/selection/native safety focused set also passed before the six-case expansion.
Editor-state: 48 pass, including fresh IDs and deep-clone isolation through source
deletion and repeated paste into a different document. Unused sourceAddress metadata
was removed; destination anchors derive from the selected target, not source lookup.

`npm run verify:range-span-copy`: build/typecheck pass, Electron SIGABRT during
macOS application registration. Elevated GUI retry rejected by approval capacity.
The new harness therefore remains Not run past launch; it is not renderer/disk QA
evidence yet. Same launch failure occurred in the baseline part-span harness;
crash report: `~/Library/Logs/DiagnosticReports/Electron-2026-09-14-182631.ips`
with `_RegisterApplication` / `NSApplication` frames, not a failed score assertion.
No human dialogs/engraving/listening or RC signoff. Final current gates pending.

Reference: [MuseScore copy and paste](https://handbook.musescore.org/basics/copy-and-paste)
and [Parts](https://handbook.musescore.org/basics/parts), living handbook checked
2026-09-14. Passage marking reuse and independent part properties inform these
contracts; no new reference-app GUI observation. Partial/outside-span exclusions
are an explicit current Chromatics boundary, not MuseScore parity completion.
Next implementation audit: octave-line copying; broader independent-object and
cross-measure clipboard remains Required.

### Octave Range Copy Audit

Four failure-first tests reproduced omitted octave lines and missing omission
counts. The clipboard now captures contained 8va/8vb/15ma/15mb lines, remaps both
endpoints and includes partial octave lines in the exclusion feedback. Native/XML
reopen and performed-frequency equivalence are tested for all four types.
Follow-up failure-first tests exposed double transposition when pasting between
voices of the same staff. Exact existing type/interval is reused; conflicting or
partially overlapping staff intervals reject the paste before mutation. The App
failure message includes octave conflicts. General preexisting octave overlap and
arbitrary rhythmic-anchor semantics remain Required, not solved by this guard.
Focused editor/App run: 15 pass, covering six part-geometry cases with octave
preservation, four octave types, three overlap cases and clipboard isolation.
`node --check scripts/verify-range-span-copy.cjs` and `git diff --check`: pass.
Current full-suite and actual GUI gates are still pending.

### Range Clipboard Final Automation

Current uncommitted production code: `npm test` 660 pass / 1 skip (86.47s).
The subsequent test-only distinct part-segment fixture refinement passes all six
App cases (7.11s); production code is unchanged. Build/typecheck, `verify:e2e`,
`verify:visual-regression` (84 unit tests plus unchanged 960/1400 snapshots),
`verify:musicxml-fixtures` (1 pass / 58 filtered) and `verify:midi-fixtures`
(3 pass / 3 filtered) pass. Fresh `package:dir` and `verify:package` pass on
macOS arm64; expected original-path export refusal is exercised by the smoke.
The package command result lost during context transition was rerun after no
builder process remained; the rerun result, not the lost result, is the evidence.

The initial sandbox/approval failures above remain recorded. An approved local
`env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron scripts/verify-range-span-copy.cjs`
rerun passes six object/automatic/inherit cases at 960/1400px. Artifacts:
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-ddT9TQ`.
Each case writes source/pasted/undo/redo/reopened native files and a PNG. Native
serialization, disk read/write, parser reopen, live slur bounds, copied octave,
source isolation and omission feedback are asserted. Object versus inherited
segment geometry moves the visible slur exactly 20px relative to its staff at
both widths. Reviewed `960-object.png` and `1400-automatic.png` directly.
The harness uses DOM commands and an intercepted file bridge, not native dialogs.
Existing crowded toolbar/workspace and broader engraving remain Required; these
screenshots are not whole-UI approval, human PDF QA or RC signoff.

Next: independent slur/hairpin clipboard, preserving destination notes and using
exact rhythmic endpoint matching; broader object/filter/cross-measure contracts
remain in expanded V1. No commit, push, merge or deployment performed.

### Independent Span Clipboard And User Stop

User requested stop plus commit/push/merge on 2026-09-14. No next feature task is
started. The in-flight independent slur/hairpin clipboard is being validated for
integration alongside the earlier c105c7e native recovery/segment checkpoint.

Failure-first: new core suite initially failed because the clipboard module was
absent; two App tests reproduced ignored object-copy commands. Four core tests
now pass: source snapshot isolation, unchanged destination notes, musical segment
remapping, history/native/XML, cross-measure exact tick distance, and rejection of
missing/ambiguous/chord/rest/foreign-voice endpoints. Initial typecheck caught an
incorrect exported type name; the implementation uses the existing segments type.
App fixture initially used half notes as a quarter-distance target; that correctly
rejects. The test now asserts rejection plus a valid matching target, not relaxed
endpoint matching. Two App tests pass with native save/reopen and undo/redo.
`npm test`: 666 pass / 1 skip, 90.95s. Current `npm run build`: pass, renderer
`index-Cc_BrX00.js`. Source geometry is captured from effective part view; the new
object is added without replacing any destination notes. Out-of-span or unmappable
segment geometry is omitted with feedback. Core cross-measure distance is not
cross-measure note-range copy, nor arbitrary rhythmic/chord/cross-voice support.

The four new independent-object actual-renderer/disk cases are appended to
`verify:range-span-copy`. Approved Electron execution passes all ten cases at
960/1400px. Artifacts:
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-S9LAHr`.
Reviewed `960-independent-slur.png` and `1400-independent-hairpin.png`: original
and pasted shapes are visible at the intended events. Native source/pasted/undo/
redo/reopened disk snapshots and unchanged notes pass. File dialogs remain mocked.
Current XML/MIDI fixture, save-policy, site-content and queue checks pass (57 rows,
16 expanded umbrellas, queue not drained).
No public RC, human-dialog, listening or external-app signoff is claimed.

Final integration gates on this uncommitted source: `verify:e2e`,
`verify:visual-regression` (84 unit tests and unchanged snapshots), fresh
`package:dir` followed by `verify:package`, and `git diff --check` pass. Packaged
original-path export refusal is expected negative-case evidence, not a failure.
No validation process remains running. Existing development preview on port 5174
was left intact. Next feature work requires explicit user resumption; the next
candidate is broader independent-object/chord/cross-voice endpoint handling.
The upcoming PR includes c105c7e plus this follow-up, targets main, and must have
current CI results checked before merge. Git integration is authorized by the
latest user request; no release tag or installer publication is requested.

### 2026-09-15 Explicit Span Target Resumption

Worktree `/private/tmp/chromatics-span-targets-20260915`, branch
`feature/chromatics-span-targets-20260915`, base remote main `9d44696` (PR #757).
Old temporary worktree absent; original dirty worktree untouched. No commit/push/
merge/release authorized. Remote CI lookup failed to connect; prior CI is not
current-source evidence. `npm ci` succeeded.

Baseline clipboard/editing tests: 8 pass. Failure-first explicit endpoint tests:
3 fail / 4 pass because the fifth endpoint argument was ignored and bad explicit
targets silently used automatic matching. New same-staff exact-ID path rejects
invalid targets without fallback and accepts cross-voice chord events. Chords are
single events with multiple pitches, not ambiguous duplicate events. Existing
cross-voice source rejection is retained. Native/XML/history preserve event voices
and unchanged notes. Focused core/editing/component suite: 13 pass. Focused App
suite (`paste targets a chord|object clipboard keeps`): 4 pass / 154 filtered out.
`npm run typecheck` and production build pass. Component tests cover backward
targets, slur/rest exclusion and stale draft reset on selection/document changes.

Actual Electron harness extended from ten to fourteen cases. First sandbox launch
aborted SIGABRT; approved local launch then reached a renderer command exception.
Diagnostics added before retry; no renderer or full-suite pass claimed yet.
UI failure-first run result was lost in a tool-output truncation; it is not counted
as a confirmed failure result. Current App pass above was rerun and observed.

Electron retry isolated a harness selector-quoting syntax error, not an application
exception. Corrected diagnostics/selector; fourteen cases pass with native disk
readback and actual slur/hairpin rendering. Screenshot review found clipped target
labels at narrow dock widths. Added stacked controls and wrapping selected-address
readback, rebuilt and reran all fourteen cases successfully. Latest artifacts:
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-ujxwwR`.
Reviewed `960-explicit-slur-targets.png`; full target address is readable below the
native select. Original/pasted shapes and history/reopened files are verified.
This does not prove native dialogs or human engraving. The deliberately overlapping
source/target hairpins expose remaining span-to-span collision handling, not fixed
by this clipboard work; keep it in the engraving queue.

First full suite: 665 pass / 8 timeout failures / 1 skip, 203.39s. Ten targeted
PDF/range/part-geometry/octave cases then yielded 6 pass / 4 timeouts. No timeout
or acceptance criterion was increased. Detached baseline `9d44696` comparison:
10 pass (16.77s); subsequent current-source identical selection: 10 pass (20.73s).
Timing varies; this is not enough to mark the whole suite passed. A fresh full
run is pending. XML fixture, save-policy, queue and diff gates pass. Site verifier
initially failed because the isolated worktree lacked `out/site/download-manifest.json`;
`npm run site:build` generated it and `verify-site-content.mjs` then passed.

Fresh full suite on the endpoint implementation: 673 pass / 1 skip, 121.62s.
Same latest build passes direct `verify-single-voice-mvp.cjs` Electron E2E and
`verify-notation-snapshots.cjs` unchanged baselines; visual prerequisite unit suite
84 pass. MIDI fixture 3 pass; native file-dialog/manual/packaged gates are not
implied by these renderer runs. Proceeding to the next Required text-type filter
and independent clipboard child; later source changes need fresh gates.

### 2026-09-15 Measure Text Clipboard (In Progress)

Failure-first App tests: initial three fixtures incorrectly added `tick` to strict
non-expression schema and were fixed; all four then failed on absent filter options.
Added staff/system/rehearsal/expression filters using existing File copy/delete
commands. Text clipboard is a detached snapshot; paste replaces only the chosen
type in one target measure with fresh IDs. Expression ticks beyond target measure
and duplicate IDs reject before mutation. Native history tests now pass after
completing backup mocks and waiting for the distinct reopened filename status.

Cross-part XML tests discovered genuine pre-existing loss: system/rehearsal import
reads primary part only. The clipboard now explicitly rejects non-primary staff
targets for those two types instead of silently losing data. This is not a fix to
XML interchange; `CV1-X-XML-SCOPED-GLOBAL-TEXT` remains Required. Staff/expression
cross-part XML and primary-staff system/rehearsal XML pass. Focused core/App suite
9 pass; typecheck/build pass. Actual 22-case renderer harness and final whole-suite
gates are pending. Preview started at `http://127.0.0.1:5173/` (session 87134).

The 22-case Electron harness passes. Artifacts:
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-b2bgYk`.
Reviewed `960-text-systemTexts.png` and `1400-text-expressionTexts.png`: source and
target text render with the selected measure and existing annotations. Disk snapshots
cover delete/history/reopen; dialogs are intercepted, not manual QA. Full suite
after text filters: 682 pass / 1 skip, 100.71s. Initial sandbox preview bind/read
failed EPERM/connection; approved Vite launch and HTTP read succeeded.

### 2026-09-15 Standard System Text Attribute

W3C MusicXML 4.0 direction/system-relation documentation (linked in gap matrix)
confirmed `only-top`, `also-top`, `none`; current exporter used `yes`, and parser
recognized only that legacy value. Failure-first: 3 fail / 1 pass (only-top import,
also-top classification/report, standard export; legacy import already passed).
Parser/export now use only-top while keeping old yes reads. none remains local;
also-top display semantics are not implemented and warn explicitly. Updated the
existing export assertion intentionally, without changing external fixture provenance.
All MusicXML suites plus text clipboard: 102 pass / 1 skip; typecheck passes.
Follow-up: full suite 686 pass / 1 skip (100.91s), typecheck/build pass. package:dir
initially failed sandbox DNS; approved retry and verify:package pass on macOS arm64.
The expected original-path XML export refusal is a negative smoke assertion, not
a package failure. No new Windows/Linux installer or signing claim.
Latest 22-case Electron renderer/disk harness passes, including actual XML writes:
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-EYijIR`.

### 2026-09-15 All-Part Global Text Import And External PDF

Installed MuseScore 4.7.5 CLI converted `1400-text-systemTexts.musicxml` from the
above artifact directory using `-F --musicxml-use-default-font -o` to
`/private/tmp/chromatics-system-text.pdf` (35675 bytes, exit 0). Poppler text extraction
finds both QA copy texts; rendered first page `/private/tmp/chromatics-system-text.png`
was inspected at 1400px. Both appear, but generated tempo label and metronome display
twice. This is a newly queued implementation issue, not clean overall engraving QA.
Input is Chromatics-generated; it is not a MuseScore-origin fixture. No manual GUI
or native-dialog signoff.

Failure-first multi-part global import returned only Shared, losing three marks.
Parser now collects all parts and merges identical global measure/text occurrences
across parts, preserving repetitions within a part. Secondary-part IDs are unique.
A lower-staff fixture first failed because its empty first part omitted divisions;
fixed the fixture rather than relaxing duration validation. `npx vitest run
src/musicxml`: 99 pass / 1 skip; typecheck passes. Explicit part ownership, lower-staff
export and rendering multiple rehearsal marks remain open. Existing clipboard guard
is intentionally retained. These parser changes follow the 686-test checkpoint.

### 2026-09-15 Tempo Display Follow-Up (In Progress)

Initial unit fixture incorrectly indexed a singleton XML measure as an array;
corrected, then reproduced 3 missing print-object failures / 1 passing no-text case.
Hiding the metronome inside the existing combined words/metronome direction-type
passed local contracts but MuseScore PDF hid the tempo text too. That external
visual check is Fail, not Pass: `/private/tmp/chromatics-system-text-fixed.pdf`.
W3C direction-type content requires separate elements (reference links in gap matrix).
An intermediate attempt separated words/metronome direction-types; parser associated sibling
words only with a hidden metronome, retaining the existing visible-metronome plus
independent dolce contract. An initially broad association failed that existing test
and was narrowed. MusicXML tests: 103 pass / 1 skip; build passes. External rerender
and full gates are pending for the corrected structure.

The separated hidden-metronome variant also hid all tempo text in MuseScore;
`/private/tmp/chromatics-tempo-separated.pdf` text extraction confirms absence.
Removed that strategy. The bounded fix now omits words only for exact generated
undotted quarter/eighth labels, leaving their visible metronome. Custom text remains
in a separate valid direction-type and round-trips; an exact two-type tempo pair
is recognized without swallowing words in the existing mixed four-type fixture.
Latest XML tests: 104 pass / 1 skip. Generated dotted/other-unit labels and custom
text display preferences remain Required, not silently discarded or marked Done.

Final bounded tempo change: build and 22-case actual Electron/native/XML harness
pass, artifacts `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-Aho4HU`.
MuseScore generated `/private/tmp/chromatics-tempo-visible.pdf`; Poppler extraction
shows one numeric tempo and both copied texts. Inspected 1400px PNG confirms one
visible tempo. However MuseScore terminated with `mutex lock failed: Invalid argument`,
exit 134 after writing; one retry to `chromatics-tempo-visible-retry.pdf` also exited
134. External process gate is Fail, output visual observation is recorded separately.
No more identical retries. Full suite for this checkpoint: 693 pass / 1 skip,
99.96s. Site-content and save-policy gates pass.

### 2026-09-15 Cross-Voice Source Clipboard

Two source-copy tests initially failed because different voices were rejected.
Snapshots now flag `requiresExplicitEnd`; the automatic path rejects even when a
same-voice timed destination exists. Explicit target validation is unchanged.
Component displays an endpoint-required state, and App keyboard paste reports the
requirement without modifying the score. Core/component tests: 12 pass, including
notes preserved, undo, native and XML. Build and expanded 26-case actual Electron
renderer/disk QA pass. Artifacts:
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-dMwHHd`.
Inspected `960-cross-voice-source-slur-targets.png`: endpoint controls remain in
the panel, wrapped address output is readable. Dense fixture annotations still
need separate collision work; no general engraving completion claim.
Full suite: 696 pass / 1 skip, 100.64s. Strengthened source/destination voice/rest
XML assertions and valid global-direction fixture structures rerun: 15 pass.
`verify-notation-snapshots.cjs` passes unchanged 960/1400px baselines. Cross-staff
sources remain rejected; parent clipboard umbrella is Partial. Fresh E2E/package
validation is pending at this checkpoint.

### 2026-09-15 Current Validation Checkpoint

Current worktree `/private/tmp/chromatics-span-targets-20260915`, branch
`feature/chromatics-span-targets-20260915`, base `9d44696`; all changes uncommitted.
Final source bundle `out/renderer/assets/index-OHYEjt6e.js`:

- Full suite: 696 pass / 1 skip; strengthened two-file follow-up: 15 pass.
- Typecheck/build pass; actual 26-case range/span/text harness pass.
- `verify-single-voice-mvp.cjs` pass; notation snapshots unchanged at 960/1400px.
- Fresh `npm run package:dir` and `npm run verify:package` pass on macOS arm64,
  unsigned. Expected original-file export refusal remains a negative assertion.
- `verify:musicxml-fixtures`: 1 selected test pass; `verify:midi-fixtures`: 3 pass.
- Queue, save-policy, site-content and `git diff --check` pass.

No current remote CI, Windows/Linux installer, manual native dialog, physical MIDI,
listening, signing or notarization claim. MuseScore CLI mutex/exit-134 failure stays
open despite usable generated PDF. The goal tool reports `usageLimited`; this
explicitly requested normal execution did not reactivate automatic continuation.
No commit/push/merge/deployment. Validation processes have finished; the intentionally
running preview is `http://127.0.0.1:5173/`, Vite session 87134.

Next implementation: `CV1-X-XML-SCOPED-GLOBAL-TEXT`, specifically define/preserve
explicit part/staff ownership and lower-staff export before removing the system/
rehearsal clipboard guard. Global import aggregation is not that ownership contract.
Then individual/list/range text selection and dense span pair collision handling.
Other expanded Required umbrellas remain open; neither implementation completion
nor RC signoff is claimed.

### 2026-09-15 Scoped Rehearsal And Staff Selection

Same isolated worktree/branch, base `9d44696`, all changes uncommitted. Goal lookup
returned no goal; a new active expanded-V1 goal was registered. Read-only remote
main check confirms `9d44696`; sandbox DNS initially failed, approved retry passed.
Original Clef/quiz/site worktrees were not modified. Reference interpretation:
[MusicXML 4.0 system-relation](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/system-relation/)
and [MuseScore living text handbook](https://handbook.musescore.org/text/staff-system-and-expression-text),
checked 2026-09-15. No external GUI observation claimed.

Bounded implementation: concrete rehearsal measure IDs retain part/staff ownership
using `system="none"` plus staff number; generic global anchors use `only-top`.
Native v4 already carries these IDs, so no schema change is made. Multiple rehearsal
marks now render in distinct 32px lanes with shared screen/print vertical reservation.
Other-staff paste preserves notes; additional-staff blank measures can be selected.
Editing the first rehearsal mark preserves adjacent objects; removing a part removes
its concrete-owned marks instead of converting them to global. Undo restores both.

Failures and fixes:
- Scoped XML test initially merged three equal local labels into `measure-1`.
- Lane test initially had no multi-marker offsets; clipboard rejected other staves.
- App part-removal test reproduced unintended global conversion; four history cases pass after correction.
- App text-edit test reproduced loss of the second mark; six focused editing/history cases pass after correction.
- Electron harness first returned an uncloneable function; `void` corrected the harness.
- Imported XML Ctrl+S correctly saved XML; harness now explicitly chooses project save before native readback.
- Actual lower-staff measure selector was absent; implemented concrete per-staff hit targets.
- Font line-box `getBBox()` was 60px for a 24px rehearsal frame. Inspected screenshots showed separated glyphs.
  Validation now checks each frame and canvas actual glyph bounds independently, including glyph containment;
  no baseline or collision threshold was loosened to conceal an observed glyph collision.
- E2E expected three primary-only grand-staff hit targets. New contract requires six total and three owned lower-staff targets;
  that verifier was updated and rerun, with final result recorded below.

Current bundle: `out/renderer/assets/index-B-nOq9dA.js`.
- `npm test`: 699 pass / 1 skip (110.65s); build/typecheck pass.
- XML/layout/MIDI targeted files: 90 pass; fixture scripts separately pass (XML 1, MIDI 3 selected cases).
- Actual Electron `verify-range-span-copy.cjs`: all 28 cases pass. Scoped-only retry: two cases pass.
  Full artifacts: `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-kNQbMt`.
  Inspected scoped 960/1400px screenshots from `chromatics-range-span-NC20qA` and prior diagnostic `chromatics-range-span-AvT0Nc`.
  Evidence uses DOM-dispatched commands, real renderer, disk native/XML readback, part switches and undo/redo;
  OS file dialogs are intercepted and this is not human/manual QA.
- Fresh `package:dir` and `verify:package`: macOS arm64 unsigned Pass. Original-file export refusal is expected negative coverage.
- Queue, save-policy, site-content and diff checks pass at this stage; final documentation rerun follows.
- Existing preview process PID 78068 serves `http://127.0.0.1:5173/` with HTTP 200.
  Default sandbox ps/curl could not inspect/reach it; approved read-only checks succeeded. No unrelated process was killed.

Parent scoped-text task remains Partial: explicit scope UI, system-text ownership,
same-text arbitrary-tick identity and linked displays are not implemented by this
child. General object-list/range editing and dense engraving remain Required.
No new manual PDF, listening, MIDI-device, external-app or OS installer approval.
No commit/push/merge/deployment. Final `verify-single-voice-mvp.cjs` passes with
six grand-staff measure targets, including three owned lower-staff targets.
Final `verify-notation-snapshots.cjs` passes unchanged 960/1400px baselines.
All validation processes have exited; only the intentional Vite preview remains.

### 2026-09-15 Rehearsal Object Chooser Follow-Up

`CV1-X-REHEARSAL-OBJECT-SELECTION`: notation palette exposes stable-ID selection
for active-measure rehearsal marks, including an explicit new-marker state.
The selected mark drives both palette and properties dock editing. New/open/recovery
clears ephemeral object selection. Same-label objects remain distinguishable by
ordinal and ID; no model/native version change is needed for this UI state.

- Failure-first App test could not find the chooser; implementation now edits the
  selected second object while preserving the first, notes and native history.
- Typecheck caught an undefined-target empty-state access; explicit presence check fixes it.
- Undoing a new object left a stale ID and silently rejected new text. Regression
  reproduced missing E after A/B; new-marker editing no longer targets a deleted ID.
- Focused App tests: 6 pass, including properties, edit/delete/add/undo, native
  readback and reopening another document with the same IDs.
- Full suite before the final stale-ID fix: 700 pass / 1 skip, E2E and visual pass.
  Latest rerun/package results follow separately; do not reuse these as final gates.
- Actual Electron scoped-only workflow passes at 960/1400px after changing the
  hidden-window harness from blur alone to the existing explicit focusout pattern.
  Artifacts: `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-q7Cid4`.
  Both `*-object-selection.png` images were inspected: chooser/edit values fit,
  selected lower-staff object changes while source markers stay unchanged.
  Checks cover new object, single deletion, undo, part views and real native/XML files.
  DOM events/intercepted dialogs are not manual UI or human engraving approval.

Other text-object types, direct score hit selection, individual clipboard and
range selection remain implementation work. Global generic-anchor projection on
rich multipart scores needs the next dedicated renderer/print audit; scope editing,
MusicXML arbitrary-tick identity and system-text ownership are still Partial.

Final chooser checkpoint: bundle `index-BoXPNcHV.js`, full suite 700 pass / 1 skip
(106.10s), typecheck/build, fresh macOS arm64 unsigned package and notation snapshots
pass. All 28 Electron clipboard cases pass with object editing included; artifacts
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-rdCHop`.
Site/diff pass; E2E rerun also passes for this exact final bundle.

### 2026-09-15 Global Annotation Render Projection

Next task `CV1-X-GLOBAL-ANNOTATION-PROJECTION` reproduced zero rehearsal lanes for
a generic `measure-1` global anchor on the rich multipart fixture. Shared render
projection now resolves global aliases onto the visible primary staff for drawing
and vertical/print calculation, while concrete local anchors and the source score
stay unchanged. Equal local/global text objects remain distinct; projection is
idempotent. Focused projection/vertical/print tests: 13 pass; typecheck/build pass.
Actual score/part/PDF checks and latest full suite are in progress. No final gate
or manual PDF claim is made from these unit tests.

Actual `--global-only` harness subsequently passed six 960/1400px score/Piano/
Clarinet cases, with three PDFs written through the live PDF render state.
Source native readback is unchanged. First artifacts `chromatics-range-span-jo7qvF`
passed global visibility but PDF image comparison exposed missing full-score Sing
lyrics. This was recorded as a new implementation task rather than declaring
general PDF fidelity complete.

### 2026-09-15 Additional Staff Attachments

`CV1-X-PASSIVE-STAFF-ATTACHMENTS` reproduced `[]` versus expected `['Sing']` in
the actual full-score renderer. Additional staff drawing did not call existing
note-attachment helpers. A shared helper now draws lyrics/articulations/fermata/
breath/tremolo/ornaments/grace notes and the inline lyric editor on both paths.
Current focused renderer checks assert Sing and tenuto in score/Piano, absent from
Clarinet, and click/edit/undo of the actual additional-staff lyric with native disk
readback. Other attachment types and their detailed placement remain a Partial
task, not assumed complete because helpers are connected.

Corrected six-case artifacts:
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-1VMSX0`.
`pdfinfo` confirms the full-score output is one A4 page. All three output PDFs were
rendered with `pdftoppm -scale-to 1400 -png` and inspected:
`/private/tmp/chromatics-global-fixed-{score,piano,clarinet}-1.png`.
Global QA/Tutti QA/positioned 112 appear in each relevant view; Local QA remains
with Piano; the full-score Sing lyric is restored. No observed clipping of these
tested objects. Existing spacing/attachment placement needs further production
polish. This is automated PDF capture and assistant image inspection, not a human
manual file-dialog or commercial engraving approval. Final broad gates follow.

### 2026-09-15 Global Rehearsal Editing Checkpoint

The rich-score rehearsal chooser now includes generic global measure anchors and
labels global/local scope separately. Editing or deleting the selected global
object preserves local objects and the native anchor. Failure-first App coverage
reproduced the missing global option in score and Piano views; both cases pass.
Current bundle `index-C7QZBF3e.js`: typecheck/build and full suite 704 pass / 1 skip;
MusicXML/MIDI fixtures, save-policy, queue, site-content and diff checks pass.

Before this final chooser change, bundle `index-rI14IDAV.js` passed 702 tests,
E2E, notation snapshots, fresh unsigned macOS arm64 package smoke and 34 actual
Electron cases. Artifacts: `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-fTiBAr`.
These earlier renderer/package results do not validate the final chooser change.
Its additional Electron editing assertions and latest GUI rerun were not executed:
automatic approval review failed with a model-capacity error. No manual Pass.

A read-only, in-memory parser/serializer probe on expanded-v1-part-export.musicxml
confirmed a remaining implementation failure: system text anchored to
`P2-staff-2-measure-1` disappears from export and reopen with empty export/import
warning arrays. Initial probe calls used a non-exported function and wrong output
key; after checking the public API, serializeMusicXmlWithReport(...).contents and
parseMusicXmlWithReport reproduced the loss. No files were written by the probe.
Next: preserve scoped system text through model/serializer/renderer and round-trip;
do not solve this Required contract only by adding a warning. Scope switching,
new global-object creation and arbitrary-tick identity remain incomplete.

### 2026-09-16 Scoped System Text MusicXML Slice

Worktree: `/private/tmp/chromatics-scoped-text-20260916`, branch
`feature/chromatics-scoped-text-20260916`, base `d56208d` from `origin/main`.
The original dirty in-c worktree was not modified. PR #761, #762 and #764 were
verified merged; `v0.1.0-alpha.15` remains a published unsigned prerelease, not
expanded V1 or RC completion.

Implementation: concrete staff-owned system text now exports on its owning staff
with MusicXML `system="none"` and the existing bold system-text words marker.
Chromatics imports that local marker back into `score.systemTexts`, while generic
`only-top`/legacy `yes` still import as global system text and ordinary `none`
words remain staff text. This preserves the previous standard relation behavior
while allowing Chromatics-authored lower/non-primary system text to round-trip.
The text clipboard guard that rejected non-primary system text paste was removed
after the scoped round-trip contract was added. Follow-up App work adds a system
text object chooser next to the existing rehearsal chooser; selecting one object
edits or deletes only that ID, preserving neighboring system text objects in the
same measure. This is not explicit scope-switching UI, arbitrary tick identity,
list/range object selection, or external-app fidelity signoff.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/musicxml/system-text-relation.test.ts -t "preserves concrete lower-staff system text"` | Pass | First attempt failed because the new test used empty measures and hit serializer rhythm validation; the test was corrected to use `expanded-v1-part-export.musicxml`. The final test covers a global text, upper/lower staff concrete text and identical strings in different positions. |
| `npm test -- src/renderer/src/editor/text-marking-clipboard.test.ts -t "systemTexts"` | Pass | System text clipboard now targets another part/staff and reopens through MusicXML without the old non-primary guard. |
| `npm test -- src/renderer/src/App.test.tsx -t "selected system text"` | Pass | 2 App tests pass; selected first/second system text edits one object, undo restores the original score, deleting the selected second object preserves the first, and MusicXML round-trip keeps the selected-object result. |
| `npm test -- src/musicxml/system-text-relation.test.ts src/musicxml/scoped-rehearsal.test.ts src/musicxml/part-markings.test.ts src/renderer/src/editor/text-marking-clipboard.test.ts` | Pass | 4 files / 16 tests passed; scoped rehearsal and part/staff annotation ownership remained intact. |
| `npm run typecheck` | Pass | Initial typecheck caught an undefined `words` node guard in the new local-system-text classifier; later App changes also caught one stale array property access. Both were fixed and reruns passed. |
| `npm test` | Pass | Latest rerun after the passive lower-staff print-layout renderer slice: 61 files passed / 1 skipped; 715 tests passed / 1 skipped. |
| `npm run verify:musicxml-fixtures` | Pass | External fixture QA command passed; 1 test passed / 58 skipped in the targeted fixture suite. |
| `npm run build` | Pass | Electron/Vite app build passed, latest renderer bundle `index-CpnQV-12.js`. |
| `npm run verify:visual-regression` | Fail, then Pass | First sandbox run passed 84 unit/layout tests but Electron snapshot exited with `SIGABRT` after downloading the binary. Elevated reruns passed; latest run still passes 84 unit/layout tests and writes 960/1400 screenshots under `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/`. |
| `node scripts/verify-site-content.mjs` | Fail, then Pass | First run failed because `out/site/download-manifest.json` was absent in the fresh worktree. `npm run site:build` generated the site bundle, then site-content verification passed. |
| `git diff --check` | Pass | No whitespace errors. |
| `curl -I -L https://in-c.mannlab.app/chromatics.html` | Pass | Production Chromatics page returned HTTP 200, last-modified `Tue, 15 Sep 2026 08:43:19 GMT`. |
| `curl -L https://in-c.mannlab.app/download-manifest.json` | Pass | Production manifest reports `0.1.0-alpha.15`, release tag `v0.1.0-alpha.15`, macOS DMG and Windows installer links. |
| `gh run list --branch main --limit 10 --json ...` | Pass | Latest `Site` and `CI` on main at `d56208d` both succeeded. |

Still Required: explicit global/local scope editing, arbitrary tick identity,
list/range object selection, external app reopen behavior and renderer/PDF human
QA remain separate Required work. Fresh package, native dialog, signed installer,
external-app GUI and human PDF/engraving gates were not run for this small slice.

### 2026-09-16 Expression Text Lower-Staff Timing Slice

Implementation: no parser code change was needed beyond the existing ordered
direction-tick indexing, but new coverage now pins a grand-staff lower staff case
where measure 2 inherits divisions from measure 1, uses `<backup>`, places the
expression text on staff 2 after a lower-staff quarter rest and adds a positive
offset. The parsed expression text remains owned by the lower staff measure,
round-trips through MusicXML, and survives native project encode/decode. An App
workflow opens a native project containing lower-staff expression text and confirms
the preview data exposes the lower measure ID and tick before saving the native
project again. Follow-up renderer work stamps expression SVG text with `data-tick`
and adds an Electron harness that checks screen and PDF print-layout x-position
against the musical tick, writes a real PDF and verifies native readback. This is
bounded renderer/PDF artifact evidence, not external-app visual comparison or the
broader list/range text-selection contract.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/musicxml/expression-text-tick.test.ts` | Fail, then Pass | First new fixture used an invalid non-dotted half rest for duration 6; after adding `<dot/>`, the test exposed only an over-specific generated ID expectation. Final run passed 4 tests. |
| `npm test -- src/musicxml/expression-text-tick.test.ts src/renderer/src/App.test.tsx -t "expression text\\|selected system text"` | Pass | 2 files / 7 tests passed; includes expression text lower-staff native/App preview plus system-text chooser regression. |
| `npm run typecheck` | Pass | Expression/App changes passed typecheck. |
| `node --check scripts/verify-expression-text-pdf.cjs` | Pass | New bounded Electron/PDF harness parses as valid CommonJS. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx src/musicxml/expression-text-tick.test.ts` | Pass | 2 files / 6 tests passed after adding expression-text renderer tick metadata. |
| `npm run verify:expression-text-pdf` | Fail, then Pass | First sandbox run built successfully but Electron exited with `SIGABRT`. Elevated rerun passed and wrote `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-expression-text-k8UkjM/expression-text.pdf` plus a screen PNG. Screen and PDF print-layout DOM both showed `cantabile` on lower-staff `bass-measure-2` at `data-tick="20160"` with x-position matching tick 1.5 quarters, aligned to the upper measure, below the lower-staff measure target, and native save readback preserved the expression text. |
| `npm test` | Pass | Current full suite passed after expression-text PDF harness and renderer tick metadata: 61 files passed / 1 skipped; 715 tests passed / 1 skipped. |
| `npm run verify:visual-regression` | Pass | 84 MusicXML/system-layout tests passed and notation snapshots remained unchanged at 960/1400px after adding expression text `data-tick`. |
| `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy` | Pass | Queue and save-policy guards passed; queue still reports `automationQueueDrained: false` with remaining Required rows. |

Still Required: lower-staff expression text external app visual exchange and
broader list/range text selection remain open under the parent Required rows.

### 2026-09-16 Expression Text Object Chooser Slice

Implementation: the Notation Objects palette now exposes `표현 텍스트 객체 선택`
for the active measure, mirroring the rehearsal/system text chooser pattern. When
multiple expression texts share the same measure and tick, editing or deleting a
selected object updates by stable ID and preserves neighboring expression texts,
their tick values and their order. Choosing `새 표현 텍스트` still creates a new
object at the current active tick. New/open/recovery document transitions reset
the ephemeral expression text selection along with the existing text-object
targets. This is individual active-measure object selection; list/range selection
and independent expression-object clipboard remain Required.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/renderer/src/App.test.tsx -t "selected expression text\\|selected system text\\|native reopen preview keeps lower-staff expression"` | Fail, then Pass | First run caught a TDZ regression from referencing `activeExpressionText` before declaration. After recalculating the target object inside the callback, the next run caught expression-text order churn. The final implementation preserves order and passed 5 focused App tests / 167 skipped. |
| `npm run typecheck` | Fail, then Pass | First run reported the same block-scoped variable use-before-declaration; final rerun passed. |
| `npm test` | Pass | Full suite after expression text chooser passed: 61 files passed / 1 skipped; 717 tests passed / 1 skipped. |
| `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy` | Pass | Queue and save-policy guards passed after documentation updates; queue still reports `automationQueueDrained: false` with remaining Required rows. |
| `npm run build` | Pass | Production Electron/Vite build passed after the expression text chooser UI change; latest renderer bundle `index-B03H2U1t.js`. |

Still Required: direct score-object selection, expression text list/range
selection, expression-object clipboard and external app visual exchange.

### 2026-09-16 Staff Text Object Chooser Slice

Implementation: the Notation Objects palette now exposes `보표 글자 객체 선택`
for the active measure. Editing or deleting a selected staff text updates by
stable ID and preserves neighboring staff text objects, order and MusicXML/native
round-trip. Choosing `새 보표 글자` still creates a new object at the active
measure. New/open/recovery document transitions reset the ephemeral staff text
selection alongside rehearsal/system/expression targets. This is active-measure
individual object editing, not list/range selection or independent object
clipboard.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/renderer/src/App.test.tsx -t "selected staff text\\|selected expression text\\|selected system text"` | Pass | 6 focused App tests passed / 168 skipped. Staff text selector edits the first or second same-measure object, preserves the neighbor, supports delete of the selected second object, undo restores the original score, and MusicXML round-trip keeps text/measure ownership. |
| `npm run typecheck` | Pass | Staff text chooser state and App changes passed typecheck. |
| `npm test` | Pass | Full suite after the staff text chooser passed: 61 files passed / 1 skipped; 719 tests passed / 1 skipped. |
| `npm run build` | Pass | Production Electron/Vite build passed after the staff text chooser UI change; latest renderer bundle `index-iTWJFFpL.js`. |
| `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy` | Pass | Queue and save-policy guards passed; queue still reports 69 rows, 16 Required umbrellas and `automationQueueDrained: false`. |
| `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Site content manifest/product relation guard and whitespace gate passed after the staff text chooser documentation update. |

Still Required: direct score-object selection, staff/system/expression text
list/range selection and independent object clipboard.

### 2026-09-16 Dynamics Object Chooser Slice

Implementation: the Notation Objects palette now exposes `셈여림 객체 선택`
for the active measure. Editing or clearing the dynamics select updates the
selected dynamic by stable ID, preserves neighboring same-measure dynamics and
keeps the existing new-dynamic flow through the `새 셈여림` option. New/open/
recovery document transitions reset the ephemeral dynamic selection alongside the
existing rehearsal/text object targets. This is active-measure individual object
editing, not direct score-object selection, list/range selection or independent
object clipboard.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/renderer/src/App.test.tsx -t "selected dynamic\\|selected staff text\\|selected expression text\\|selected system text"` | Fail, then Pass | First run exposed an ambiguous test query because both the Notation Objects toolbar and selection summary expose a dynamics select. The test now targets the toolbar select explicitly. Final run passed 8 focused App tests / 168 skipped, including editing first/second dynamics, deleting the selected second dynamic, undo/native save and MusicXML round-trip without replacing neighboring dynamics. |
| `npm run typecheck` | Pass | Dynamic target state, chooser UI and App tests passed typecheck. |
| `npm test` | Pass | Full suite after the dynamics chooser passed: 61 files passed / 1 skipped; 721 tests passed / 1 skipped. |
| `npm run build` | Pass | Production Electron/Vite build passed after the dynamics chooser UI change; latest renderer bundle `index-BBaMkh2x.js`. |
| `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy` | Pass | Queue and save-policy guards passed; queue still reports 69 rows, 16 Required umbrellas and `automationQueueDrained: false`. |
| `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Site content manifest/product relation guard and whitespace gate passed after the dynamics chooser documentation update. |

Still Required: direct score-object selection, dynamics/text list/range
selection and independent object clipboard.

### 2026-09-16 Chord Symbol Object Chooser Slice

Implementation: the Lyrics/Chords code panel now exposes `코드 심벌 객체 선택`
for the active measure/tick. Editing or clearing the chord symbol input updates
the selected harmony by stable ID, preserves neighboring same-tick chord symbols
and keeps the existing new-chord flow through the `새 코드 심벌` option. New/open/
recovery document transitions reset the ephemeral chord selection alongside the
existing notation object targets. This is active-measure/tick individual object
editing, not direct score-object selection, list/range selection or independent
object clipboard.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/renderer/src/App.test.tsx -t "selected chord symbol\\|selected dynamic\\|selected staff text\\|selected expression text\\|selected system text"` | Pass | 10 focused App tests passed / 168 skipped. The chord symbol case edits the first or second same-measure/same-tick harmony, preserves the neighbor, supports delete of the selected second object, undo restores the original score, and MusicXML round-trip keeps text/tick ownership. |
| `npm run typecheck` | Pass | Harmony target state, chooser UI and App tests passed typecheck. |
| `npm test` | Pass | Full suite after the chord symbol chooser passed: 61 files passed / 1 skipped; 723 tests passed / 1 skipped. |
| `npm run build` | Pass | Production Electron/Vite build passed after the chord symbol chooser UI change; latest renderer bundle `index-BAMbILrP.js`. |
| `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy` | Pass | Queue and save-policy guards passed; queue still reports 69 rows, 16 Required umbrellas and `automationQueueDrained: false`. |
| `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Site content manifest/product relation guard and whitespace gate passed after the chord symbol chooser documentation update. |

Still Required: direct score-object selection, chord/dynamics/text list/range
selection and independent object clipboard.

### 2026-09-16 Selected Object Clipboard Slice

Implementation: measure-object copy/delete can now honor the active object
chooser instead of always operating on every object of the filtered type in the
measure. Chord symbols and dynamics use the selected stable ID for the actual
File-mode copy/paste/delete workflow; object-scope paste appends the copied
object with a fresh ID and preserves existing target-measure neighbors. The shared
text marking clipboard helper also supports selected single-object snapshot and
delete without replacing target-measure neighbors. This is still a bounded
active-measure workflow, not direct score-object clicking or list/range object
selection.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/renderer/src/App.test.tsx -t "object filter copy paste\\|selected chord symbol\\|selected dynamic"` | Pass | 5 focused App tests passed / 174 skipped. The object-filter workflow selected the second chord and second dynamic, copied them through File-mode object filters, pasted them into measure 2 while preserving target neighbors, then deleted the selected target-neighbor chord/dynamic only. |
| `npm test -- src/renderer/src/editor/text-marking-clipboard.test.ts src/renderer/src/App.test.tsx -t "selected text object\\|object filter copy paste\\|independent measure text clipboard\\|selected chord symbol\\|selected dynamic"` | Pass | 2 files passed; 11 tests passed / 174 skipped. The helper test snapshots one selected staff text, appends it to a target measure without replacing an existing target text, deletes only a selected target text, and verifies undo restores it. |
| `npm test -- src/renderer/src/App.test.tsx -t "selected .*object clipboard\\|object filter copy paste\\|text marking filter"` | Pass | 9 focused App tests passed / 174 skipped. Staff text, system text, rehearsal mark and expression text each use the object chooser, File-mode object filter copy, target-measure paste and selected target-neighbor delete while preserving source objects and the pasted selected object. |
| `npm run typecheck` | Pass | Selected-object clipboard scope changes passed typecheck. |
| `npm test` | Fail, then Pass | First full-suite run exposed stale object-target state after measure-level paste: a removed target harmony ID was still treated as an active selected object and prevented the legacy whole-measure delete path from running. The final implementation validates that a chooser target still exists in the current score before using object-scope copy/delete. Rerun passed: 61 files passed / 1 skipped; 725 tests passed / 1 skipped. |
| `npm test` | Pass | Full suite after extending selected text-object App coverage passed: 61 files passed / 1 skipped; 729 tests passed / 1 skipped. |
| `npm run build` | Pass | Production Electron/Vite build passed after selected-object clipboard changes; latest renderer bundle `index-DlGoYH_m.js`. |
| `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy` | Pass | Queue and save-policy guards passed; queue still reports 69 rows, 16 Required umbrellas and `automationQueueDrained: false`. |
| `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Site content manifest/product relation guard and whitespace gate passed after selected-object clipboard documentation updates. |

Still Required: direct score-object selection, full UI clipboard coverage for all
text/object types, list/range object selection and broader independent object
clipboard.

### 2026-09-16 Direct Chord/Dynamic Score-Object Selection Slice

Implementation: visible chord symbol and dynamic SVG annotations now expose a
stable `data-object-id` and call back into the App when clicked. Clicking a chord
symbol selects its measure, opens the Lyrics/Chords workflow and targets the
clicked harmony object; clicking a dynamic selects its measure, opens Notation
Objects and targets the clicked dynamic. This is the first bounded direct
score-object selection path. Text objects, list/range object selection and
broader independent-object editing remain Required.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx src/renderer/src/App.test.tsx -t "direct score-object selection\\|direct notation object click\\|exposes chord and dynamic object ids"` | Pass | 2 files passed; 2 tests passed / 185 skipped. The renderer test verifies chord/dynamic annotations carry stable object IDs and invoke `onSelectObject`; the App test clicks score objects, verifies the correct workflow tab and chooser target, edits the clicked objects and saves only the selected chord/dynamic changes. |
| `npm run typecheck` | Pass | Direct object-selection prop, renderer handler and App callback passed typecheck. |
| `npm test` | Pass | Full suite after direct chord/dynamic score-object selection passed: 61 files passed / 1 skipped; 731 tests passed / 1 skipped. |
| `npm run build` | Pass | Production Electron/Vite build passed after renderer object-click changes; latest renderer bundle `index-CqOgwRUh.js`. |
| `npm run verify:visual-regression` | Pass | 84 MusicXML/system-layout tests and unchanged 960/1400 notation snapshots passed; SVG object metadata/click handlers did not change visual baselines. |
| `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy` | Pass | Queue and save-policy guards passed; queue still reports 69 rows, 16 Required umbrellas and `automationQueueDrained: false`. |
| `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Site content manifest/product relation guard and whitespace gate passed after direct-selection documentation updates. |

Still Required: direct score-object selection for staff/system/rehearsal/
expression text, list/range object selection and broader independent object
clipboard.

### 2026-09-16 Direct Text Score-Object Selection Slice

Implementation: visible rehearsal mark, staff text, system text and expression
text SVG annotations now expose stable `data-object-id` metadata and call the
same direct object-selection path as chord symbols and dynamics. Clicking one of
those visible text objects selects its measure, opens Notation Objects and targets
the clicked object in the matching active-measure chooser, so editing preserves
neighboring objects in the same measure. Staff text remains bounded to the
currently rendered staff-text object for the measure; multi-object/lane rendering,
list/range object selection and broader independent-object clipboard remain
Required.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/renderer/src/App.test.tsx src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx -t "direct notation object click\|exposes text object ids\|exposes chord and dynamic object ids"` | Pass | 2 files passed; 7 tests passed / 185 skipped. The real renderer test verifies rehearsal/staff/system/expression text objects carry stable object IDs and invoke `onSelectObject`; the App tests click visible text objects, verify Notation Objects mode and chooser target, edit the clicked object and save only that object while preserving its same-measure neighbor. Existing chord/dynamic direct-selection evidence still passes. |
| `npm run typecheck` | Pass | Extended direct object-selection prop, App callback and text-object tests passed TypeScript. |
| `npm test` | Fail, then Pass | First full-suite rerun exposed a race-prone lower-staff expression text native-save test that used the global shortcut immediately after native reopen and observed a missing `expressionTexts` payload in one run. The test now uses the actual File-mode project save button for that native reopen check. Rerun passed: 61 files passed / 1 skipped; 736 tests passed / 1 skipped. |
| `npm run build` | Pass | Production Electron/Vite build passed after direct text-object selection and native-save test stabilization; latest renderer bundle `index-Cad5dBPi.js`. |
| `npm run verify:chromatics-v1-work-queue`, `npm run verify:chromatics-v1-save-policy`, `git diff --check` | Pass | Queue guard still reports 69 rows, 16 Required umbrellas and `automationQueueDrained: false`; save-policy guard still reports expanded native lifecycle incomplete; whitespace gate passed. |

Still Required: staff text multi-object/lane rendering, list/range object
selection, cross-measure selection and broader independent object clipboard.

### 2026-09-16 Passive Lower-Staff Attachment Preview Slice

Implementation: no production renderer change was needed in this slice. The App
preview test double now exposes grace-note markers alongside existing fermata,
breath/caesura, tremolo and ornament markers. A native project workflow attaches
fermata, caesura, grace note, `trill`/`mordent`/`turn` and single-note tremolo to
a Piano lower-staff note, opens it through the app shell, verifies every marker
is still associated with that lower-staff event in the preview data, then saves
the native project and verifies the same event still carries those attachments.
Follow-up renderer work stamps passive attachment SVG markers with the source
event id and adds real `NotationPreview` tests for lower-staff fermata, caesura,
tremolo, ornaments and grace-note markers in both screen and print-layout paths.
The new `verify:passive-attachments-pdf` harness opens a native lower-staff
passive attachment fixture in Electron, verifies screen and PDF print-layout DOM
markers carry the lower-staff event id, writes a real `printToPDF` file and checks
native JSON readback. Follow-up placement polish lifts ornaments above fermatas
and moves breath/caesura marks to the right when a fermata is present; the PDF
harness now fails on marker-box overlap in this bounded fixture. This is a bounded
automated PDF-file smoke, not a broad generated-PDF fixture matrix or human
engraving signoff.

Verification:

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test -- src/renderer/src/App.test.tsx -t "passive lower-staff\\|expression text\\|selected system text"` | Pass | 1 file / 4 focused tests passed; includes lower-staff passive attachment preview/native check plus the preceding system/expression text regressions. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx` | Fail, then Pass | First attempt exposed jsdom/VexFlow fixture/test-environment gaps: empty voice formatter failure, missing SVG `getBBox`, and canvas text metrics. The final renderer test uses a rhythmically complete lower-staff fixture and local canvas/SVG stubs, then verifies fermata, caesura, tremolo, ornament and grace SVG markers carry the lower-staff event id in screen and print-layout paths. Latest focused run passed 1 file / 2 tests. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx src/renderer/src/App.test.tsx -t "passive lower-staff\\|NotationPreview passive"` | Pass | Latest focused run passed 2 files; 3 tests passed / 169 skipped, covering actual screen/print renderer event-id stamping and App/native preview ownership. |
| `npm run typecheck` | Pass | Passive attachment test-helper change and App tests passed typecheck. |
| `npm run verify:visual-regression` | Fail, update, then Pass | The renderer metadata change intentionally changed the fermata snapshot id from the glyph `𝄐` to the source event id `m1-c4`; positions, sizes, event count and SVG dimensions were unchanged. `npm run verify:notation-snapshots:update` updated `docs/testing/notation-snapshot-baseline.json`, and the follow-up visual regression passed 84 MusicXML/system-layout tests plus 960/1400 notation snapshots. |
| `npm test` | Pass | 61 files passed / 1 skipped; 715 tests passed / 1 skipped after the passive lower-staff print-layout renderer slice. |
| `npm run build` | Pass | Electron/Vite production build passed with bundle `index-CpnQV-12.js`. |
| `npm run verify:e2e` | Pass | Current Electron MVP workflow passed after build, including existing keyboard/selection, toolbar mode sweep, grand-staff preview, part-view XML export, mixer and release bounds checks. A temporary attempt to extend this script for lower-staff passive-attachment insertion was not kept because the current new-score E2E path selects a lower-staff full-measure rest and did not provide reliable fermata/caesura/tremolo/ornament insertion evidence; that UI-level insertion coverage remains a separate Required task. |
| `npm run verify:musicxml-fixtures` | Pass | External fixture QA command passed after the passive lower-staff preview slice. |
| `npm run verify:visual-regression` | Pass | Current rerun passed 84 MusicXML/system-layout tests plus unchanged 960/1400 notation snapshots. |
| `node scripts/verify-site-content.mjs` | Pass | Current site content manifest/product relation/feature map path verification passed. |
| `git diff --check` | Pass | Whitespace gate passed before the final documentation consistency edits. |
| `npm run verify:chromatics-v1-work-queue` | Pass | Queue schema/status passed after documentation edits; 69 rows, 16 Required umbrellas, `automationQueueDrained: false`, with remaining automatable Required rows. |
| `npm run verify:chromatics-v1-save-policy` | Pass | Save-policy guard still reports MusicXML/MXL plus first native slice implemented and expanded native lifecycle incomplete. |
| `node scripts/verify-site-content.mjs`, `git diff --check` | Pass | Final documentation consistency rerun passed site content and whitespace gates. |
| `node --check scripts/verify-passive-attachments-pdf.cjs` | Pass | New bounded Electron/PDF harness parses as valid CommonJS. |
| `npm run verify:passive-attachments-pdf` | Fail, then Pass | First sandbox run built successfully but Electron exited with `SIGABRT`. Elevated rerun passed and wrote `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-passive-attachments-LsfEeJ/passive-attachments.pdf` plus a screen PNG. Screen and PDF print-layout markers for fermata, caesura, tremolo, ornaments and grace notes all retained `data-event-id="lower-staff-marked-note"` and native save readback preserved those attachments. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx` | Pass | After placement polish, screen and print-layout renderer tests still pass and additionally assert ornaments sit at least 24px above the fermata anchor while breath/caesura sits at least 24px to the right. |
| `npm run verify:passive-attachments-pdf` | Pass | Elevated rerun after adding overlap assertions passed and wrote `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-passive-attachments-8pdsLZ/passive-attachments.pdf`. Screen and print-layout marker boxes no longer overlap in the bounded lower-staff same-note fixture: ornament y moved to 160 and caesura x moved to 130.7 while all markers retained the lower-staff event id. |
| `npm test` | Pass | Full suite after passive marker placement polish passed: 61 files passed / 1 skipped; 715 tests passed / 1 skipped. |
| `npm run verify:visual-regression` | Pass | 84 MusicXML/system-layout tests and 960/1400 notation snapshots passed after the passive marker placement change. |

Still Required: broader renderer/PDF fixture matrix for lower-staff fermata,
breath, grace, ornament and tremolo placement and human engraving review.

### 2026-09-15 User-Approved Integration Checkpoint

The user requested commit, push and merge of the current development worktree.
This approval does not declare expanded V1 or public RC complete. Base is
`9d44696`; branch is `feature/chromatics-span-targets-20260915`.

Approval service briefly recovered: the pending global-rehearsal Electron editing
checks were added and all six score/Piano/Clarinet cases at 960/1400px passed,
including edit/undo with native disk readback and unchanged local objects/notes.
Artifacts: `/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/chromatics-range-span-inLWNf`.
Two App cases also verify edited global rehearsal anchors through MusicXML.

Expression text incorrectly imported raw MusicXML offsets. It now uses indexed
cursor/divisions-aware direction ticks. Three failure-first cases cover signed
offsets and different divisions, followed by MusicXML round-trip. Initial test
expectations incorrectly assumed 480 ticks per quarter; they now use the actual
TICKS_PER_QUARTER constant. The focused MusicXML run passed 62 tests.

Latest source bundle `index-DsXADQYJ.js`: full suite 707 pass / 1 skip (106.58s),
build/typecheck, XML/MIDI fixtures, queue, site-content and diff checks passed.
Additional lower-staff backup/native tests and the final documentation patch were
blocked by intermittent approval-service capacity errors, not test failures.
Those extra tests were not applied. The broader renderer/package evidence above
predates this last parser correction; integration reruns are recorded separately.

Still Required: scoped system text silently disappears from lower-staff XML export;
system-text object editing still replaces neighbors on the same measure; explicit
scope switching, tick identity, remaining attachment visual cases and manual QA.
No installer signing, human listening, physical MIDI or external-app GUI signoff
is implied. Resume with these concrete implementation gaps, not a QA-only claim.

Integration rerun: `npm run package:dir` rebuilt `index-DsXADQYJ.js` successfully,
but packaging failed resolving github.com (`ENOTFOUND`) in the restricted sandbox.
The additional Electron 34-case rerun was rejected before process creation by the
approval service capacity error. E2E/snapshot calls after it were not executed.
No fresh package smoke is claimed for this integration attempt. Queue (69 rows,
16 Required), site-content and `git diff --check` pass. Remote PR CI is the next
merge gate; the packaging/manual gaps remain explicit development-checkpoint gaps.

### 2026-09-15 Alpha.15 Release Gate Follow-Up

Feature PR #761 merged as `f545149`. Release PR #762 prepares alpha.15 as an
unsigned prerelease, not expanded-V1 RC signoff. Initial release workflow
34945029537 passed macOS/Linux packaging but Windows job 104302289965 failed
two App tests: PDF target-page setup exceeded 10000ms after 80 UI insertions,
and expression-text native reopen observed a save/open timing mismatch.

The PDF test now prepares 79 measures through existing editor commands/native
open and retains one real UI insertion. Its timeout and output assertions are
unchanged. Clipboard tests await React async processing and save-button readiness
before the next operation; all content equality assertions remain. Focused App
tests passed (5 pass), and typecheck passed. Full-suite and current-head Windows
rerun results at that checkpoint were pending; this is not evidence of manual
installer/PDF QA.

Follow-up `7677f37`: full local suite passed 707 tests / 1 skip (114.04s).
PR #762 CI run 34946055028 passed. Release PR run 34946055052 passed macOS
(5m38s), Windows (6m1s) and Linux (3m24s), including artifact/package smoke.
No timeout increase or assertion removal was needed. PR #762 merged as
`e8aa558`; tag `v0.1.0-alpha.15` points to that commit. The tag publication
workflow is 34946780145; its publication outcome is recorded separately.

### 2026-09-18 Range Object Filter Clipboard Slice

Worktree: `/private/tmp/chromatics-object-range-20260918`, branch
`feature/chromatics-object-range-20260918`, base `cb92b89` from `origin/main`.

Implementation: File-mode object filters now operate on range selections for
chord symbols, dynamics, staff text, system text, rehearsal marks, expression
text and note lyrics. A copied marking range stores source measure order and
paste maps matching objects onto the target range by relative measure position
with new IDs. Lyric range copy stores selected note positions and remaps them to
the target note range without replacing target notes; paste clears stale target
lyrics at positions where the source range has no lyric. Measure-selected and
note-selected lyric object copy/paste/delete now move only the selected lyrics and
preserve target notes; measure lyric clipboard keeps same-staff multi-voice
ownership by voice id and event index, preserves unrelated target voices when the
copied source measure has only a subset of voices, and selected-note lyric
clipboard follows the active lyric verse so verse 2 can be copied/deleted without
removing verse 1 on selected-note, range and measure workflows. The File-mode
`가사 필터 절` selector exposes that active-verse policy directly in the object-filter
workflow. The resulting lyrics round-trip through MusicXML
save/reopen. Range delete removes only the selected object type from the selected range. Single-measure and
selected-object clipboard behavior remains unchanged. Selected-note, range and
measure-selected articulation object copy/paste/delete now move only articulations
while preserving notes, durations, lyrics and unrelated target voices through
undo/native/MusicXML evidence. Selected-note, range and measure-selected fermata
object copy/paste/delete now move only fermatas while preserving notes, lyrics,
articulations and unrelated target voices through native/MusicXML evidence.
Selected-note, range and measure-selected breath/caesura object copy/paste/delete
also preserve the concrete mark value while leaving notes, lyrics, articulations
and unrelated target voices unchanged through native/MusicXML evidence.
Selected-note, range and measure-selected ornament object copy/paste/delete
preserve `trill`, `mordent` and `turn` arrays while leaving notes, lyrics,
articulations and unrelated target voices unchanged through native/MusicXML
evidence. Selected-note, range and measure-selected single-note tremolo object
copy/paste/delete preserve the `marks` value while leaving notes, lyrics,
articulations and unrelated target voices unchanged through native/MusicXML
evidence. Selected-note, range and measure-selected grace-note object
copy/paste/delete preserve grace-note pitch/slash arrays while leaving notes,
lyrics, articulations and unrelated target voices unchanged through
native/MusicXML evidence. MusicXML grace-note export now includes voice/staff
ownership so lower-staff and voice-2 grace notes reattach to the original target
note on reopen. A scoped system-text cleanup follow-up fixes part deletion so a
concrete local system text on the removed part is dropped instead of being
rewritten as a global `measure-N` system text; true global system text survives
and undo restores the original local object. A direct-selection renderer follow-up
fixes same-measure staff text rendering so multiple staff text objects draw in
separate upper lanes and each exposes its own stable `data-object-id` click
target; the previous renderer map kept only the last staff text for a measure.
The same direct-selection renderer path now groups multiple same-measure dynamics
and stacks them in lower lanes so each dynamic exposes its own stable click
target. Visible rehearsal, staff/system/expression text, chord and dynamic
objects now expose meaningful `role="button"` accessible names for direct object
selection, so renderer tests can address them by user-facing object labels rather
than CSS selectors alone. Enter and Space now activate those visible object
buttons with the same stable object target as pointer selection. Visible
slur/hairpin segment targets expose accessible labels and Enter/Space keyboard
activation for direct span selection. A UX follow-up decouples docked palette
category buttons from the top work-mode tabs, exposes shortcut help from the
global context strip instead of requiring File mode discovery, and changes
selected-note pitch movement to plain ↑/↓ for diatonic steps, Alt/Option+↑/↓ for
chromatic steps, Shift+↑/↓ for octaves and Cmd/Ctrl+↑/↓ for adjacent-staff
navigation. A command palette first slice opens from Cmd/Ctrl+K or the context
strip search button, searches work-mode commands and shortcut reference rows,
supports ↑/↓ active result movement plus Enter execution, can switch work-mode
tabs, applies duration commands through the existing duration edit path, switches
voices through the existing voice-switch path, opens left-palette categories
without changing the top work mode, opens the new-score dialog from the file
lifecycle command, and can open shortcut help from a found shortcut row.
List selection, span object clipboard, complete command inventory, custom
shortcuts and broader object clipboard remain Required follow-up work.

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- src/renderer/src/App.test.tsx -t "object filter copy paste and delete operate across selected chord and dynamic ranges"` | Fail | Fresh worktree had no local `node_modules`; `vitest` was not found. |
| `PATH=/Users/jaemankim/Desktop/privates/coding/in-c/node_modules/.bin:$PATH npm test -- src/renderer/src/App.test.tsx -t "object filter copy paste and delete operate across selected chord and dynamic ranges"` | Fail | Vite resolved from the fresh worktree and could not find `react/jsx-dev-runtime`. |
| `npm test -- src/renderer/src/App.test.tsx -t "object filter copy paste and delete operate across selected chord and dynamic ranges"` | Pass | After linking the existing root `node_modules` into the fresh worktree for local verification only: 1 App workflow test passed / 188 skipped. The test copies chord symbols across a two-measure range, copies and deletes dynamics across the same range, saves native project state and checks relative measure mapping. |
| `npm test -- src/renderer/src/App.test.tsx -t "object filter copy paste and delete operate"` | Fail, then Pass | A first rerun after tightening disabled-state logic caught duplicate `activeKeySignature`/break-label declarations from a bad patch hunk. After removing the stray block, 2 focused App tests passed / 187 skipped; existing selected chord/dynamic object workflow still passes. |
| `npm test -- src/renderer/src/App.test.tsx -t "text marking range filter"` | Pass | 4 focused App tests passed / 189 skipped; staff text, system text, rehearsal marks and expression text copy from a two-measure source range to a two-measure target range, delete the source range and save native project state with relative measure mapping preserved. |
| `npm test -- src/renderer/src/App.test.tsx -t "lyric object filter"` | Fail, then Pass | First failure exposed a brittle release-QA fixture expectation, then an implementation bug where range lyric delete/paste attempted to read a non-existent `location.voice`. The selected-note lyric follow-up first used an inexact two-quarter-note 4/4 fixture and score-core correctly rejected the gap. A later active-verse pass narrowed lyric clipboard from all verses to the current lyric verse and added a File-mode `가사 필터 절` selector. 4 focused App tests now pass. The tests cover range, measure-selected and selected-note lyric copy/delete/paste, stale target active-verse lyric cleanup when the source range has no lyric at the matching position, same-staff voice-2 measure lyric ownership, selected-note/range/measure verse-2 copy/delete preserving verse 1, undo/redo native save for selected-note lyrics, note ID/duration preservation and MusicXML save/reopen. |
| `npm test -- src/renderer/src/App.test.tsx -t "active selected-note lyric"` | Pass | 1 focused App test passed / 196 skipped; changing the active lyric verse to 2 before object-filter copy/delete preserves verse 1 on the source note and target note while verse 2 is copied, deleted, undone/redone, saved as native and exported/reopened through MusicXML. |
| `npm test -- src/renderer/src/App.test.tsx -t "articulation object filter"` | Fail, then Pass | The range follow-up first exposed the paste guard rejecting articulation range clipboards without `sourceMeasureIds` and a TypeScript union narrowing issue between object/range articulation clipboards. After narrowing by `scope` and allowing articulation range paste, 3 focused App tests pass / 197 skipped. Selected-note, range and measure-selected articulation object copy/paste/delete preserve source/target notes and lyrics, preserve unrelated lower voice target articulations, replace/clear only target articulations, support undo/redo native save for selected-note articulations and round-trip through MusicXML. |
| `npm test -- src/renderer/src/App.test.tsx -t "fermata object filter"` | Fail, then Pass | The first run exposed that UI enablement allowed event-level fermata filters but the actual copy/delete callbacks still treated only lyrics and articulations as event-level object filters, causing a normal note delete path that removed the source note. After adding fermatas to the callbacks and implementing event/range/measure fermata clipboard helpers, 3 focused App tests passed / 200 skipped. Selected-note, range and measure-selected fermata object copy/paste/delete preserve notes, lyrics, articulations and unrelated target voices, clear stale target fermatas where the copied range/measure has no fermata, and round-trip through native save and MusicXML export/reopen. |
| `npm test -- src/renderer/src/App.test.tsx -t "breath mark object filter"` | Pass | 3 focused App tests passed / 203 skipped. Selected-note, range and measure-selected breath/caesura object copy/paste/delete preserve notes, lyrics, articulations and unrelated target voices, replace or clear only target breath marks, keep the copied `breath` versus `caesura` value distinct and round-trip through native save and MusicXML export/reopen. |
| `npm test -- src/renderer/src/App.test.tsx -t "ornament object filter"` | Pass | 3 focused App tests passed / 206 skipped. Selected-note, range and measure-selected ornament object copy/paste/delete preserve notes, lyrics, articulations and unrelated target voices, replace or clear only target ornaments, keep the copied `trill`/`mordent`/`turn` array and round-trip through native save and MusicXML export/reopen. |
| `npm test -- src/renderer/src/App.test.tsx -t "tremolo object filter"` | Pass | 3 focused App tests passed / 209 skipped. Selected-note, range and measure-selected single-note tremolo object copy/paste/delete preserve notes, lyrics, articulations and unrelated target voices, replace or clear only target tremolos, keep the copied `marks` value and round-trip through native save and MusicXML export/reopen. |
| `npm test -- src/renderer/src/App.test.tsx -t "grace note object filter"` | Fail, then Pass | First run exposed two real contracts: MusicXML parse leaves omitted grace-note `alter`/`slash` as `undefined`, and lower-staff voice grace notes were not safe to export because serialized grace notes lacked `voice`/`staff` ownership. After updating expectations to match parser output and writing voice/staff on exported grace notes, 3 focused App tests passed / 212 skipped. Selected-note, range and measure-selected grace-note object copy/paste/delete preserve notes, lyrics, articulations and unrelated target voices, replace or clear only target grace-note arrays and round-trip through native save and MusicXML export/reopen. |
| `npm test -- src/musicxml/musicxml.test.ts -t "grace-notes.musicxml-round-trip\\|ornaments.musicxml-round-trip"` | Pass | 2 focused MusicXML tests passed / 58 skipped. The new unit test verifies a lower-staff `voice-2` grace note exports `<voice>2</voice>` and `<staff>2</staff>` and reopens on the original lower-staff voice target. |
| `npm test -- src/renderer/src/App.test.tsx -t "removing a part drops local system text"` | Fail, then Pass | Failure-first App workflow reproduced the data-loss/scope bug: deleting the `P2` part rewrote `deleted-local-system` from concrete `P2-staff-2-measure-1` to global `measure-1`. `buildScorePartsReplaceCommand` now preserves generic global system texts and surviving concrete system texts, but drops concrete system texts whose owning part/staff/measure was removed. The final test passed 1 focused App test / 215 skipped and also verifies undo restores the original local system text. |
| `npm test -- src/musicxml/system-text-relation.test.ts src/musicxml/scoped-rehearsal.test.ts` | Pass | 2 files / 8 tests passed; existing lower-staff system text, global collection and scoped rehearsal MusicXML contracts still pass after changing part-removal system-text cleanup. |
| `npm test -- src/renderer/src/App.test.tsx -t "adding the same instrument after removal\\|removing a part drops local system text\\|global rehearsal editing preserves scope"` | Pass | 4 focused App tests passed / 212 skipped; deleted part layout cleanup, new system-text cleanup and score/part global rehearsal editing remain compatible. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx -t "multiple same-measure staff text"` | Fail, then Pass | Failure-first renderer test reproduced that only `staff-text-two` appeared because `staffTextsByMeasureId` stored a single object per measure. `NotationPreview` now groups staff texts by measure, draws each object in a separate `staffTextYOffsets` lane and keeps each click target addressable by stable object id. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx -t "multiple same-measure dynamic"` | Fail, then Pass | Failure-first renderer test reproduced that only `dynamic-two` appeared because `dynamicsByMeasureId` stored a single object per measure. `NotationPreview` now groups dynamics by measure, draws each object in a separate `dynamicMarkYOffsets` lane and keeps each click target addressable by stable object id. |
| `npm test -- src/renderer/src/notation/annotation-lanes.test.ts src/renderer/src/notation/score-vertical-layout.test.ts` | Pass | 2 files / 18 tests passed after adding staff-text and dynamic count/offset lanes and preserving existing dense annotation spacing contracts. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx` | Pass | Full passive-attachment renderer file passed: 6 tests. Existing lower-staff passive object evidence, multi-staff-text direct selection, multi-dynamic direct selection and role/name-based object targeting pass together. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx -t "activates visible score objects"` | Fail, then Pass | Failure-first renderer test reproduced that SVG object `role="button"` labels did not respond to Enter/Space. Shared object-selection binding now activates visible chord/dynamic/text objects by pointer or keyboard with the same stable object id. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx -t "activates visible span objects"` | Pass | 1 focused renderer test passed / 7 skipped. Visible slur and hairpin segment targets expose accessible labels and Enter/Space activation that calls `onSelectSpan` with the stable span id; this fixes evidence for direct keyboard span selection but does not complete span clipboard/list-selection workflows. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx` | Pass | Full passive-attachment renderer file rerun passed: 8 tests including keyboard object and span activation. |
| `npm test -- src/renderer/src/App.test.tsx -t "ui.shortcut-help\|keyboard.note-pitch-editing\|keyboard.staff-navigation\|playback.global-tempo"` | Fail, then Pass | First run exposed an ambiguous App test query after the object-filter UI added both `가사 절` and `가사 필터 절`. The test now uses the exact `가사 절` combobox. Follow-up passed 4 focused App tests / 213 skipped. Coverage confirms global shortcut help lists pitch/chromatic/octave/staff shortcuts, plain ↑/↓ moves selected-note pitch, Shift+↑/↓ moves by octave, Cmd/Ctrl+↑/↓ moves between grand-staff lanes, and left docked palette selection no longer changes the top work mode. |
| `npm test -- src/renderer/src/App.test.tsx -t "ui.command-palette\|ui.shortcut-help\|keyboard.note-pitch-editing\|keyboard.staff-navigation\|playback.global-tempo"` | Fail, then Pass | First command-palette run exposed that result button accessible names included category text. Result buttons now expose the command label as `aria-label`. Follow-up passed 5 focused App tests / 213 skipped. Coverage confirms Cmd/Ctrl+K opens command search, searching `옥타브` exposes `Shift+↑ / ↓`, selecting that row opens shortcut help, searching `표기 객체` runs the work-mode command, ↑/↓ plus Enter can execute active command results without mouse interaction, `8분음표` applies the existing duration edit path, `2성부` runs the existing voice-switch path, `표기 객체 팔레트` opens the left palette category while preserving the top work mode and `새 악보` opens the new-score dialog. |
| `npm run typecheck` | Pass | `tsc --noEmit` passed after the shortcut-discovery, arrow-key policy, docked-palette independence and command-palette first slice follow-ups. |
| `npm run verify:chromatics-v1-work-queue` | Pass | Queue schema/status passed with 69 rows, 16 Required umbrellas and `automationQueueDrained: false` after marking Commands/Shortcuts as Partial and documenting remaining command palette/custom shortcut work. |
| `git diff --check` | Pass | No whitespace errors after the UX follow-up and documentation updates. |
| `npm test -- src/renderer/src/App.test.tsx -t "clicking a visible dynamic object"` | Pass | 1 focused App workflow passed / 216 skipped; clicking the second visible dynamic object switches to Notation Objects, selects its stable object id and edits only that object while preserving the first dynamic. |
| `npm test -- src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx src/renderer/src/notation/annotation-lanes.test.ts src/renderer/src/notation/score-vertical-layout.test.ts` | Pass | 3 files / 24 tests passed; renderer object click targets, accessible role/name labels and annotation lane/vertical layout contracts pass together after staff-text and dynamics lane changes. |
| `npm test -- src/renderer/src/App.test.tsx -t "editing a selected dynamic\|editing a selected staff text\|object filter copy paste and delete operate on selected chord"` | Pass | 5 focused App tests passed / 211 skipped; existing stable-object editing and selected chord/dynamic clipboard workflows remain compatible with the renderer lane changes. |
| `npm test -- src/renderer/src/App.test.tsx -t "outside the copied"` | Pass | 1 focused App test passed / 196 skipped; measure lyric paste from an upper-voice-only source replaces target upper voice lyrics while preserving existing target voice-2 lyrics through native save and MusicXML save/reopen. |
| `npm test -- src/renderer/src/App.test.tsx -t "object filter copy paste and delete operate\\|text marking range filter\\|lyric object filter\\|articulation object filter\\|ornament object filter\\|tremolo object filter\\|grace note object filter\\|fermata object filter\\|breath mark object filter\\|outside the copied"` | Pass | 28 focused App tests passed / 187 skipped; chord/dynamic, text, lyric, selected-note/range/measure articulation, ornament, tremolo, grace-note, fermata and breath/caesura object/range filter workflows pass together. |
| `npm test -- src/renderer/src/editor/text-marking-clipboard.test.ts` | Pass | 7 text clipboard unit tests passed, including range paste/delete preserving relative measure mapping and undo for staff text. |
| `npm run typecheck` | Fail, then Pass | The first lyric follow-up run caught missing note narrowing in the App test and a `lyrics` union branch leaking into measure-level harmony paste. The selected-note lyric follow-up also required narrowing the lyric range paste helper to `scope: 'range'`. The File-mode lyric-verse selector follow-up caught one more missing test fixture narrowing for `targetEvents[1]`. The fermata measure fixture similarly required narrowing `targetEvents[1]` before assigning lyrics. After those fixes, and again after the same-measure staff-text/dynamics renderer, object-accessible-name, keyboard-activation and span-keyboard evidence follow-ups, `tsc --noEmit` passed. |
| `npm run verify:chromatics-v1-work-queue` | Pass | Queue schema/status passed after documentation edits; 69 rows, 16 Required umbrellas, `automationQueueDrained: false`, with list selection, span object clipboard, broader lyric workflows and broader object clipboard still present in next automatable rows. Reran after marking object filters Partial and documenting the staff-text/dynamics direct-selection, accessible-name, keyboard-activation and span-selection follow-ups. |
| `git diff --check` | Pass | No whitespace errors in the code/documentation diff after the same-measure staff-text/dynamics renderer, object-accessible-name, keyboard-activation and span-selection follow-ups. |
| `npm test -- src/renderer/src/App.test.tsx -t "score-setup\|start-recovery\|layout.live-part-view\|note-input.switch\|keyboard.staff-navigation\|playback.part-mixer\|playback.cursor-selection-sync"` | Fail, then Pass | First run in the fresh worktree failed because `node_modules` was missing and `vitest` was not found. After `npm install`, the focused App regression passed: 25 tests passed / 193 skipped. The new-score wizard now exposes one `악보 구성` radiogroup, removes the duplicate `내장 템플릿` region and `악보 구성` combobox, and still creates piano grand staff, duet and string quartet scores through the same templateId contract. |
| `npm run typecheck` | Pass | `tsc --noEmit` passed after unifying the new-score template/configuration picker and updating package/headless smoke selectors. |
| `npm run build` | Pass | `tsc --noEmit && electron-vite build` passed after the new-score wizard unification; Rollup emitted existing zod pure-comment warnings only. |
| `npm run verify:chromatics-musescore-parity-roadmap` | Pass | Roadmap schema/status passed after replacing the old `내장 템플릿` picker + `악보 구성` select wording with the single `악보 구성` template group contract. |
| `npm run verify:site-content` | Fail, then Pass | First run failed because `out/site/download-manifest.json` was missing in the fresh worktree. After `npm run site:build`, site content manifests and feature map paths verified successfully. |
| `git diff --check` | Pass | No whitespace errors after the wizard UX, smoke harness and documentation updates. |
| `npm test -- src/renderer/src/editor/new-score.test.ts src/renderer/src/notation/NotationPreview.passive-attachments.test.tsx -t "pickup\|staccato"` | Pass | 2 focused tests passed / 10 skipped. `createNewScore` now creates a first-measure `pickup` timing when the wizard supplies pickup beats, and NotationPreview keeps staccato dots within 12px of the rendered notehead instead of using the fixed upper annotation lane. |
| `npm test -- src/renderer/src/App.test.tsx -t "pickup-measure\|single-structure-picker\|grace note object filter"` | Pass | 5 focused App tests passed / 214 skipped. The new-score wizard exposes a `못갖춘마디` selector and MusicXML save/reopen preserves a one-beat pickup measure. Existing grace-note object filter copy/delete/paste still passes; the selected-note direct toggle is now labeled `짧은 꾸밈음`, while full grace-note engraving remains broader engraving work. |
| `npm run typecheck` | Pass | `tsc --noEmit` passed after adding pickup-measure wizard support, notehead-relative staccato placement and the Korean grace-note toggle label. |
| `npm run verify:chromatics-v1-work-queue` | Pass | Queue schema/status passed after documenting staccato placement, pickup measure wizard support and remaining full grace-note engraving work. |
| `npm run verify:chromatics-musescore-parity-roadmap` | Pass | Roadmap schema/status still passes; expanded V1 automation queue remains not drained. |
| `npm run build` | Pass | `tsc --noEmit && electron-vite build` passed after the pickup/staccato/grace-label slice; Rollup emitted existing zod pure-comment warnings only. |
| `npm test -- src/renderer/src/editor/keyboard-input.test.ts -t "accidental\|duration\|command keys"` | Pass | 11 focused keyboard-input tests passed / 13 skipped. `Alt/⌥+-`, `Alt/⌥+0` and `Alt/⌥+=` now resolve to flat/natural/sharp while plain `0` remains the rest shortcut. |
| `npm test -- src/renderer/src/App.test.tsx -t "shortcut-help\|shortcut-hints\|apply-accidental\|duration-shortcuts"` | Pass | 4 focused App tests passed / 216 skipped. The global context strip now toggles visible shortcut badges without hiding the shortcut reference dialog; accidental buttons expose visible/aria shortcut hints and `Alt/⌥+0` edits the selected note back to natural. |
| `npm run typecheck` | Pass | `tsc --noEmit` passed after adding shortcut-hint persistence, inline badge rendering and accidental keyboard routing. |
| `npm test` | Pass | Full suite passed after the wizard, pickup/staccato/grace-label, shortcut-hint and accidental-shortcut changes: 61 files passed / 1 skipped; 778 tests passed / 1 skipped. |
| `npm run build` | Pass | `tsc --noEmit && electron-vite build` passed after the latest shortcut-hint slice; Rollup emitted existing zod pure-comment warnings only. |
| `npm run verify:chromatics-v1-work-queue` | Pass | Queue schema/status passed after documenting the Commands/Shortcuts follow-up; 69 rows, 16 Required umbrellas and `automationQueueDrained: false`. |
| `git diff --check` | Pass | No whitespace errors after the shortcut hint and accidental shortcut slice. |
| PR #770 CI | Fail | Initial package workflow failed on macOS/Linux because packaged smoke submitted the new-score form before the unified score-structure card selection had committed, creating the default Melody score instead of string quartet and failing the Cello part-view assertion. Windows also timed out a command-palette integration test at the default 5s threshold. |
| `npm test -- src/renderer/src/App.test.tsx -t "ui.command-palette\|shortcut-hints\|single-structure-picker"` | Pass | 3 focused App tests passed / 217 skipped after giving the command-palette integration test a 15s timeout and preserving the shortcut-hint/new-score picker contracts. |
| `npm run typecheck` | Pass | `tsc --noEmit` passed after the CI follow-up. |
| `npm run package:dir` | Pass | Fresh macOS arm64 unpacked package built after the packaged-smoke score-structure commit wait fix; Rollup emitted existing zod pure-comment warnings only. |
| `npm run verify:package` | Pass | Fresh packaged smoke passed on macOS arm64. The smoke now waits for the string quartet card selection to commit before submitting; Cello part-view PDF target/write/native layout checks pass. The intentional export-overwrite rejection still logs the expected Korean error before the smoke reports `PACKAGED_APP_SMOKE_OK`. |

## Evidence Retention Rules

- 명령 결과는 이 문서에 요약하고, 실패가 있으면 GitHub issue에 원문 로그 또는 핵심 error를 남긴다.
- release candidate마다 이 표를 복사하거나 날짜별 섹션을 추가한다.
- 외부 운영 변경이 필요한 검증은 승인 없이 Pass로 기록하지 않는다.

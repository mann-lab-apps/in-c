# Known Limitations

기준일: 2026-09-01

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| initial evidence package commit | `7364290 Add quality evidence package` |
| quality follow-up 기준 commit | `6fb9698 Refine quality evidence follow-up` |
| 기준 branch | `main` |

## Purpose

이 문서는 사용자, QA 담당자, 운영자가 현재 제품의 의도적 미지원 범위와 미완성 기능을
구분하도록 돕는다. Chromatics Desktop V1의 목표가 전문적인 악보 작업이 가능한
사보앱으로 상향되었으므로, 기본 전문 사보 workflow를 막는 항목은 release notes에
"제한"으로 남길 수 없고 V1 release blocker로 처리한다.

## Professional V1 Blockers Are Not Release Limitations

| 항목 | 내용 |
| --- | --- |
| 유형 | 릴리즈 정책 |
| 제한 | multi-voice, multi-part, part extraction/live part view, page setup, mixer, MIDI export, unsupported MusicXML warning처럼 전문 악보 작업의 기본 신뢰를 좌우하는 항목은 public V1에서 known limitation으로 남기지 않는다. |
| 사용자 영향 | 이 항목들이 미완성인 상태라면 Chromatics는 내부/비공개 QA 후보일 수는 있어도 전문 V1 public release 후보가 아니다. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#current-gap-against-professional-v1), [Feature Map](../product/feature-map.md) |

## Backend Is Not Live

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | #316 |
| 제한 | 공개 사이트 Auth client와 publishable env 주입은 적용되었지만, OAuth provider 설정, schema, RLS, 서버 데이터 운영은 아직 완료되지 않았다. |
| 사용자 영향 | provider 설정 전에는 소셜 로그인 버튼이 성공하지 않으며, 커뮤니티 데이터와 서버 CRUD가 필요한 기능은 현재 제품 범위 밖이다. |
| 문서 근거 | [Supabase Backend Plan](../product/supabase-backend-plan.md), [Risk R-001](risk-register.md#r-001-supabase-backend-is-not-operational) |

## Multi-Voice Editing Is Not Complete

| 항목 | 내용 |
| --- | --- |
| 유형 | 부분 지원 |
| 연결 이슈 | #93 |
| 제한 | 같은 staff 안에서 여러 독립 voice를 완전하게 입력/전환/편집하는 UX가 남아 있다. |
| 사용자 영향 | 복잡한 피아노/합창/대위적 악보 작성은 제한된다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | 단성부, chord notes, voice 1-4 toolbar/shortcut 전환, note input target 유지, same-staff voice 2 range delete/copy/paste, playback active event voice-aware selection/highlight, stop/jump 후 selection 유지 정책, address-scoped range visual highlight 첫 슬라이스, drag range anchor voice-lane guard, selected range band visual polish 첫 슬라이스, MusicXML voice stream import와 backup export 첫 슬라이스. |
| 문서 근거 | [Risk R-002](risk-register.md#r-002-multi-voice-editing-is-not-complete), [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#score-model) |

## Multi-Part Ensemble Editing Is Not Complete

| 항목 | 내용 |
| --- | --- |
| 유형 | 부분 지원 |
| 연결 이슈 | #94 |
| 제한 | 고급 표기가 포함된 저장/재열기, 출력까지 완성하는 workflow가 남아 있다. |
| 사용자 영향 | 합주보/앙상블 score authoring은 아직 안정 지원으로 보지 않는다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | 단일 part 중심 workflow, 새 악보 마법사의 piano grand staff/2-part/string quartet skeleton 생성, piano grand staff/multi-part stacked preview 첫 슬라이스, 추가 staff 이벤트 선택과 note input target 보존 첫 슬라이스, note toolbar의 입력 보표 전환 UI, plain `Up/Down`의 인접 part/staff/voice lane navigation 첫 슬라이스, `J` 이명동음 respell과 modifier 기반 diatonic/chromatic/octave transpose 회귀 검증, 악보 탭의 part/staff add/remove/rename 첫 슬라이스와 삭제 reference cleanup, 현재 보표 전체 음자리표 선택 첫 슬라이스, 악기 라이브러리 기반 part 생성 첫 슬라이스, multi-staff notation object anchoring 첫 슬라이스, MusicXML multi-staff/multi-part 구조와 기본 note/rest event round-trip, string quartet part별 입력 후 MusicXML 저장/최근 파일 재열기 App workflow 자동 검증 첫 슬라이스, multi-part playback addressing 일부. |
| 문서 근거 | [Risk R-003](risk-register.md#r-003-multi-part-ensemble-editing-is-not-complete), [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#score-model) |

## Part Extraction Or Live Part View Is Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | 총보에서 선택 part만 보는 live part view와 파트보 제목 첫 슬라이스는 있으나, 독립 파트보 레이아웃 polish와 file dialog 기반 실제 파트보 PDF visual QA가 아직 부족하다. |
| 사용자 영향 | 앙상블 리허설과 배포에 필요한 파트보 제작 신뢰도가 아직 충분하지 않다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | 총보 중심 렌더링 일부, MusicXML 기반 교환, 악보 탭의 총보/파트보 보기 전환, 선택 part만 표시하는 프리뷰, 파트보 제목 표시, part view를 PDF 출력 대상으로 쓰는 첫 구현, 파일 경로별 마지막 총보/파트보 선택을 로컬 preference로 저장/복원하는 V1 정책 첫 구현, App 테스트의 string quartet Viola part PDF print target/compact parts preset 검증, import-origin 2-part part view/PDF renderer에서 첫 part staff-level annotation이 다른 part로 새지 않는 회귀 검증, macOS arm64 unpacked packaged smoke의 string quartet Cello part page/title metadata, visible event part id, compact parts page setup metadata, PDF target/write/structure 검증. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#layout-and-engraving), [Feature Map](../product/feature-map.md) |

## Page Setup And PDF Settings Are Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | 페이지 크기, 방향, 여백, 보표 크기, 시스템 간격의 file dialog 기반 실제 PDF 출력 visual QA와 저장 파일 round-trip/preview polish가 아직 완료되지 않았다. |
| 사용자 영향 | 출력물 설정은 조절할 수 있지만, 실제 PDF 결과와 packaged app 출력에서 수업/리허설/소규모 출판 품질을 아직 충분히 입증하지 못했다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | PDF 변환 흐름, 기본 렌더링, 악보 탭 PDF page setup UI, default A4/rehearsal Letter/publication A4/compact parts preset 첫 구현, print layout planner 반영, PDF export renderer가 캡처하는 score page DOM의 normalized page setup metadata, manual Letter landscape/publication A4/compact parts preset renderer contract App 검증, packaged app 새 악보 총보 PDF와 Cello part view PDF 구조 및 compact parts page setup metadata smoke. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#layout-and-engraving), [Feature Map](../product/feature-map.md) |

## Native Project Format Is Post-V1

| 항목 | 내용 |
| --- | --- |
| 유형 | 명시적 제품 정책 |
| 제한 | Chromatics V1은 별도 전용 프로젝트 파일 포맷을 제공하지 않고 MusicXML을 primary save로 사용한다. |
| 사용자 영향 | MusicXML이 표현하지 못하는 일부 Chromatics 전용 layout/view 상태는 파일 자체에 들어가지 않으며, 저장/내보내기 warning과 release notes에서 안내한다. |
| 현재 가능 | MusicXML 저장/열기/최근 파일, autosave/recovery snapshot, 파일 경로별 part view preference, MusicXML export-side warning report. |
| migration path | post-V1 전용 프로젝트 포맷을 도입하면 기존 MusicXML을 먼저 import하고, 안전하게 매핑 가능한 로컬 preference만 migration한다. MusicXML에서 보존되지 않은 layout 데이터는 warning report를 기준으로 사용자가 재설정하도록 안내한다. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#document-lifecycle), [V1 Blocker Backlog](../product/chromatics-v1-blocker-backlog.md#v1-polish-after-blockers) |

## Professional Engraving Collision Avoidance Is Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | lyrics, dynamics, hairpins, slurs, chord symbols, rehearsal marks가 핵심 QA 악보에서 항상 읽을 수 있게 배치된다는 solo/grand staff/ensemble 시각 검증이 아직 완료되지 않았다. |
| 사용자 영향 | 복잡한 실전 악보에서 일부 표기 간격은 public V1 전 추가 polish와 visual/manual QA가 필요하다. |
| 현재 가능 | Same-staff voice rhythmic density 기반 measure width 보강, lyrics 아래 dynamic/hairpin/expression text lane stacking, system text/rehearsal/chord/staff text upper lane stacking 첫 구현, rehearsal mark와 여러 chord symbols 및 staff text가 같은 measure에 있을 때 chord/staff/rehearsal upper annotation baseline을 16px 이상 분리하는 dense lane 보강, hairpin span start/end lane y-offset 보정, lower annotation lane이 있는 slur의 above-side avoidance, `ppp/pp/p/mp/mf/f/ff/fff/sfz` dynamics UI/MusicXML/playback velocity 지원, `release-test` App workflow의 lyric syllabic/melisma와 chord symbol MusicXML 저장/재열기 보존 자동 검증. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#layout-and-engraving), [V1 Blocker Backlog](../product/chromatics-v1-blocker-backlog.md#release-blockers) |

## Windows Dev Server Advisory Is Unverified

| 항목 | 내용 |
| --- | --- |
| 유형 | 보안/개발 환경 미확인 |
| 연결 이슈 | #8 |
| 제한 | esbuild/Vite low severity advisory의 Windows dev server 영향이 실제 Windows에서 확인되지 않았다. |
| 사용자 영향 | production app build보다는 Windows 개발자 환경 안내에 영향이 있다. |
| 현재 가능 | macOS 기준 `npm audit --audit-level=moderate`는 통과한다. |
| 문서 근거 | [Windows Dev Audit](../security/windows-dev-audit.md), [Risk R-004](risk-register.md#r-004-windows-dev-server-advisory-remains-unverified) |

## Advanced Notation Exclusions

| 항목 | 내용 |
| --- | --- |
| 유형 | 고급 해석 미완성 |
| 연결 이슈 | #321에서 사용자-facing 상태 문서와 feature map 동기화 |
| 제한 | 최근 notation extension은 지원되지만, 일부 고급 해석은 현재 안정 지원 범위 밖이다. V1 필수 표기와 후속 고급 확장을 계속 분리해야 한다. |
| 사용자 영향 | 고급 사보 파일을 가져오거나 재생할 때 일부 표시는 보존되더라도 전문 engraving/playback까지 완전하다고 보장하지 않는다. V1 필수 표기와 discrete tempo map은 별도 지원 범위로 유지하고, text-only tempo curve처럼 해석이 필요한 항목은 후속 고급 playback으로 다룬다. |
| 현재 제외 | text-only tempo curve playback, octave-shift playback pitch transposition, actual repeated oscillator tremolo playback, two-note tremolo, mid-measure clef changes. |
| 현재 가능 | repeat barline/count 입력, score-wide repeat/volta playback expansion 자동 검증, system/expression text 입력/표시/MusicXML 보존, positioned tempo event BPM 입력/삭제와 tempo map playback 반영, repeated measure tempo event playback 반영, octave-shift 표시/MusicXML 보존, single-note tremolo slash 입력/표시/MusicXML 보존. |
| 문서 근거 | [Traceability Matrix](traceability-matrix.md#notation-editor), [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md) |

## Mixer And MIDI Export Are Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | part별 mute/solo/volume mixer의 실제 청감 QA와 MIDI export의 실제 DAW/notation app 열기 검증이 아직 완료되지 않았다. |
| 사용자 영향 | 여러 파트 악보를 확인하고 다른 음악 도구와 주고받는 전문 workflow가 제한된다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | 기본 playback, tempo control, tempo map playback, playback 탭 part mixer 첫 구현, string quartet App workflow의 part별 mute/solo/volume 독립 상태 전달 검증, multi-part scheduler 후보의 mute/solo/volume gain과 재시작 beat velocity interpolation 자동 검증, tie/tuplet/repeat timeline 자동 검증 일부, piano grand staff playback event의 part/staff/voice address 보존 회귀 검증, string quartet Cello playback event의 jump-to-start 후 selection 유지/cursor 초기화 App 검증, Standard MIDI File type 1 내보내기, multi-part MIDI track/channel/program 분리 첫 구현, percussion/tab staff를 V1 MIDI note output에서 제외하고 `unsupported-midi-clef` 경고를 표시하는 정책 첫 구현, `verify:midi-fixtures`의 solo melody/piano grand staff/string quartet MIDI header/track/program/note event 자동 검증. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#playback), [Feature Map](../product/feature-map.md) |

## MusicXML Warning And External Fixtures Are Missing

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | 실제 MuseScore/Dorico/Sibelius/Finale export-origin fixture 검증과 지원 표기 false positive warning 제거 범위 확장이 아직 부족하다. |
| 사용자 영향 | 외부 사보앱에서 가져온 파일의 손실 여부를 사용자가 신뢰하기 어렵다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | MVP subset과 최근 notation extension round-trip 테스트, MusicXML multi-staff/multi-part 구조와 기본 note/rest event round-trip, multi-staff imported score-level direction의 MusicXML 재저장 보존, import-side unsupported notation/direction warning report 첫 구현, export-side app layout data warning report 첫 구현, import/export 상세 report UI 첫 구현, `pp/ff/sfz` dynamics warning-free import/export 검증, MuseScore seed의 `mf` dynamic/staccato articulation warning-free import/export 검증, Dorico seed의 unsupported warning code/path snapshot 검증, MuseScore/Finale/Sibelius/Dorico compatibility seed fixture QA, fixture manifest의 origin/status/export setting/evidence/dynamics/articulation/warning path gate와 앱별 manual collection requirement 추적. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#import-and-export), [External MusicXML Fixture QA](external-musicxml-fixture-qa.md), [MusicXML MVP](../musicxml-mvp.md) |

## Production Deployment Smoke Is Separate

| 항목 | 내용 |
| --- | --- |
| 유형 | 운영 검증 미실행 |
| 연결 이슈 | 필요 시 후속 이슈 |
| 제한 | 이 package는 production URL, DNS, hosting 전환, GitHub Pages 비활성화 등을 수행하지 않는다. |
| 사용자 영향 | 실제 production release 전에는 별도 smoke evidence가 필요하다. |
| 문서 근거 | [Release Readiness Checklist](release-readiness-checklist.md#deployment-and-rollback), [Production Playbook](../operations/production-playbook.md) |

## Packaged Desktop Smoke Is Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 릴리즈 검증 미실행 |
| 연결 이슈 | V1 Slice Q 또는 release candidate QA |
| 제한 | macOS arm64 unpacked app의 자동 smoke는 새 악보 workspace 표시, bridge 기반 MusicXML 파일 쓰기/다시 열기, 총보 PDF와 Cello part view PDF 구조/target/page setup metadata 검증, MIDI type-1 tempo/note track 구조 검증까지 통과했지만, macOS/Windows packaged app에서 실제 file dialog, quit dialog, save/open/export 흐름은 아직 별도 수동 smoke가 필요하다. |
| 사용자 영향 | 개발 환경에서는 데이터 손실 방지 경로가 검증됐지만, Professional V1 public release 후보로 부르기 전에는 설치된 앱에서 새 악보 작성 -> 저장 -> 재실행 -> 열기 -> PDF/MusicXML/MIDI export를 확인해야 한다. |
| 현재 가능 | 새 악보/열기/최근 파일 전환 전 unsaved-change guard, clean open state, beforeunload guard, macOS arm64 `package:dir` 산출물의 preload bridge/start screen/start action/string quartet workspace/notation SVG/smoke-only MusicXML write/recent-open/score PDF structure/Cello part view page and title metadata/visible event part id/compact parts page setup metadata/PDF target and structure/MIDI type-1 structure/autosave 자동 smoke. Linux는 V1 public release target이 아니라 post-V1 follow-up target으로 분리했다. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#document-lifecycle), [Traceability Matrix](traceability-matrix.md#notation-editor) |

## Manual QA Is Still Required For Release Candidates

| 항목 | 내용 |
| --- | --- |
| 유형 | 수동 확인 |
| 연결 이슈 | 필요 시 QA 기록 이슈 |
| 제한 | 자동 E2E는 핵심 흐름을 검증하지만, 패키징된 앱에서 사람이 전문 악보 샘플을 완성하는 수동 QA를 대체하지 않는다. |
| 사용자 영향 | release candidate 전 solo score, piano grand staff score, 2-4 part ensemble score 작성과 PDF/MusicXML/MIDI export/reopen 확인이 필요하다. |
| 문서 근거 | [Manual Score Completion QA](../releases/manual-score-completion-qa.md) |

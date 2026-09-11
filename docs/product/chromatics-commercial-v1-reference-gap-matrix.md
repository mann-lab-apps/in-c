# Chromatics Commercial V1 Reference Gap Matrix

작성일: 2026-09-04  
상태: 공식 문서 기반 제품 범위 재정의 초안

## 목적

Chromatics Desktop V1의 기존 "개인용 MVP / public alpha" 범위를 상용 V1 후보로 다시 정의한다. 이 문서는 MuseScore Studio, Dorico Pro, Sibelius를 레퍼런스로 삼되, 소스코드나 커뮤니티 글이 아니라 공식 매뉴얼, 공식 도움말, 공식 릴리즈 문서에서 확인되는 기능 표면만 기준으로 삼는다.

상용 V1의 현실적인 목표는 "전문가가 모든 대편성 악보를 완성하는 앱"이 아니라, 아래 작업을 신뢰할 수 있게 끝내는 데 있다.

- solo, piano grand staff, 2-4 part ensemble 악보 작성
- 같은 보표 다성부, lyrics, chord symbols, dynamics, slur, hairpin, rehearsal mark, repeat/volta 등 핵심 표기 입력
- 총보와 파트보를 읽을 수 있는 레이아웃으로 출력
- MusicXML, PDF, MIDI로 교환
- 저장, 재열기, 최근 파일, 패키지 앱 QA까지 통과

## 공식 레퍼런스

### MuseScore Studio

| 확인한 공식 섹션 | Commercial V1에 주는 신호 |
| --- | --- |
| Handbook overview | 기본 앱 표면이 note input, selection, palettes, properties, parts, export, playback, customization으로 구성됨. |
| Create your first score | 새 악보, 저장, 클라우드 저장, PDF/MusicXML/MIDI export가 초보 첫 흐름에 포함됨. |
| Entering notes and rests | keyboard, mouse, MIDI keyboard, virtual piano 입력과 duration-first 입력이 기본 기대치임. |
| Input by duration mode | pitch-first 입력은 power-user workflow로 존재함. V1 필수라기보다 입력 polish 후보. |
| Working with multiple voices | 같은 보표 다성부, stem direction, rests 처리, voice 선택은 전문 사보의 핵심 기능임. |
| Selecting elements | single/list/range selection, keyboard navigation, overlap selection, selection filter가 편집 신뢰성의 기준임. |
| Copy and paste | lyrics, chord symbols, dynamics, articulations 같은 객체 복사와 selection filter가 필요함. |
| Parts | instrument별 part 자동 생성, custom part, part tab, part별 저장, part export/print가 기대됨. |
| File export | PDF, MusicXML, MIDI, part별 export가 실사용 교환 표면임. |
| Working with MusicXML files | MusicXML은 앱 간 교환 표준이지만 layout cleanup이 필요할 수 있음을 제품적으로 설명해야 함. |
| Page layout / score size and spacing | page size, margin, staff size, vertical spacing, page breaks, staff/system spacing 조정이 필요함. |

### Dorico Pro

| 확인한 공식 섹션 | Commercial V1에 주는 신호 |
| --- | --- |
| Dorico Pro Help overview | 제품 구조가 Setup, Write, Engrave, Play, Print 모드로 분리되어 있음. |
| Players, instruments, layouts, flows | part/player/layout 모델이 단순 staff 배열보다 상위 개념임. |
| Transposing instruments / layout transposition | concert pitch와 transposed layout은 small ensemble에서도 곧 필요해짐. |
| Note input / caret / popovers | 빠른 전문 입력은 keyboard-first, caret, popover, command surface가 중요함. |
| Voices / multiple voices | 한 보표에 여러 voice, voice color, stem/rest 정책이 필요함. |
| Note and rest grouping | beam, tie, rest grouping은 수동 입력보다 자동 notation option 품질이 중요함. |
| Filters / selecting and editing music | 객체 종류별 선택, voice filter, lyric/dynamic/text filter가 대량 편집의 기준임. |
| Engrave mode / engraving options | collision avoidance, note spacing, slur, lyric, dynamic 위치는 별도 engrave 품질 영역임. |
| Print mode / layouts panel | full score와 instrumental part를 layout 단위로 preview, print, export해야 함. |
| Export MusicXML / Import MIDI / Export MIDI | MusicXML과 MIDI는 flow/layout 단위 옵션과 expectation tracking이 필요함. |
| Cues / tablature / percussion | 전문 제품에는 있지만 Chromatics Commercial V1에서는 명시적으로 post-V1로 분리 가능함. |

### Sibelius

| 확인한 공식 섹션 | Commercial V1에 주는 신호 |
| --- | --- |
| Sibelius Documentation landing | 최신 Reference Guide, What's New, Read Me가 버전별로 관리됨. Chromatics도 release evidence를 버전별로 남겨야 함. |
| What’s New 2026.8 | line style, cross-staff tie, cross-staff notation, exporting/layout fixes가 여전히 핵심 개선 영역임. |
| What’s New 2026.5 | VST3, score subsets/parts sharing, bar rest visibility, dark theme, workflow fixes가 현대 기대치임. |
| What’s New 2025.4 | Dynamic Parts, score subsets, selection/copy-paste reliability, staff text voice assignment이 사용자 요구 기능으로 반복됨. |
| What’s New 2025.3 | lines, articulations, text, lyrics가 voice 변경 후 유지되는 것이 regression 기준임. |
| What’s New 2024.10 | Finale/Dorico/MuseScore-origin MusicXML import fidelity와 .mxl import가 migration 수요의 핵심임. |
| What’s New 2024.8 | loop playback, metronome, tempo scaling, cloud/mobile sharing은 V1 이후 확장 후보임. |
| What’s New 2023.5 / 2022.12 | independent dynamic parts, score subsets, independent layout/note spacing은 part view를 단순 필터보다 깊은 기능으로 봐야 함. |

## Commercial V1 판정 기준

| 등급 | 의미 |
| --- | --- |
| Commercial V1 Required | 돈을 받거나 public release candidate라고 부르려면 반드시 신뢰 가능해야 하는 기능. |
| V1 Polish | V1에 있으면 제품 감각이 올라가지만, 문서화된 제약과 우회가 있으면 첫 상용 배포에서 후속으로 보낼 수 있는 기능. |
| Post-V1 | 전문 제품에는 필요하지만 solo/piano/small ensemble 상용 V1 이후로 미뤄도 되는 기능. |
| Out of Scope | 현재 Chromatics Desktop의 제품 방향에서 제외할 기능. |

## 사용자 기대 V1 기능

| 영역 | 기능 | 판정 | 현재 Chromatics 상태 | 남은 gap |
| --- | --- | --- | --- | --- |
| Score setup | 새 악보, title/composer, clef/key/time/tempo, measure count | Commercial V1 Required | 기본 생성 흐름 있음 | 템플릿, metadata polish, 첫 화면 정리 필요 |
| Score setup | instrument/player/part 모델 | Commercial V1 Required | partId/staffId/voiceId 기반이 있음 | instrument picker, ordering, part label, transposition metadata polish |
| Score setup | piano grand staff | Commercial V1 Required | grand staff workflow 일부 있음 | 양손 입력 UX, brace/bracket, staff spacing, playback/export QA |
| Score setup | 2-4 part ensemble | Commercial V1 Required | string quartet 자동 QA 일부 있음 | part별 입력, 저장/reopen/export manual RC QA |
| Score setup | common transposing instruments | Commercial V1 Required | 확인 필요 | Bb/Eb/F instrument written/sounding pitch 정책 필요 |
| Input | duration-first keyboard note/rest input | Commercial V1 Required | 구현됨 | shortcut discoverability와 UI 정리 필요 |
| Input | mouse note input | Commercial V1 Required | 일부 있음 | hit target, accidental/octave prediction, undo/retry UX |
| Input | MIDI keyboard step input | V1 Polish | 없음/확인 필요 | 상용 V1 포함 여부 결정 필요 |
| Input | pitch-first input mode | V1 Polish | 없음/확인 필요 | MuseScore/Dorico 호환 power-user option |
| Input | chords and intervals | Commercial V1 Required | 일부 있음 | chord editing, selected note insertion, MusicXML reopen QA |
| Input | same-staff multi-voice | Commercial V1 Required | 첫 구현 및 일부 QA 있음 | rests/stems/collision/selection/copy/export polish |
| Input | tuplets and ties | Commercial V1 Required | triplet/tie/tuplet timing 일부 있음 | tuplets edit UI, nested/odd tuplets scope 결정 |
| Input | grace notes | V1 Polish | 확인 필요 | 없으면 known limitation으로 분리 |
| Editing | single/list/range selection | Commercial V1 Required | 구현 및 polish 일부 있음 | overlap object selection, voice/staff/part filter |
| Editing | copy/paste notes and attached markings | Commercial V1 Required | 일부 구현 | lyrics/chords/dynamics/slurs voice-aware paste regression |
| Editing | selection filters | Commercial V1 Required | 부족 | voice/object type filter가 필요 |
| Editing | undo/redo reliable editing history | Commercial V1 Required | 확인 필요 | compound edit, import/export, layout option change coverage |
| Editing | keyboard navigation-first policy | Commercial V1 Required | Up/Down 정책 변경됨 | shortcut help/preferences polish |
| Editing | transpose, octave shift, enharmonic respell | Commercial V1 Required | 일부 구현 | diatonic/chromatic UX, multi-selection QA |
| Notation | clef/key/time/tempo changes | Commercial V1 Required | 일부 구현 | mid-score change input/export/reopen QA |
| Notation | dynamics ppp-fff/sfz | Commercial V1 Required | 구현됨 | placement, playback gain, export warning QA 유지 |
| Notation | articulations | Commercial V1 Required | 일부 구현 | palette/input/export/reopen/collision QA |
| Notation | slurs, ties, hairpins | Commercial V1 Required | 일부 구현 | long-span collision, endpoints, MusicXML round-trip |
| Notation | lyrics | Commercial V1 Required | 구현 및 QA 일부 | verse handling, melisma, collision polish |
| Notation | chord symbols | Commercial V1 Required | 구현 및 QA 일부 | parsing breadth, slash chords, positioning/export QA |
| Notation | rehearsal marks and system text | Commercial V1 Required | 일부 구현 | automatic sequence, placement, export/reopen QA |
| Notation | repeats and volta | Commercial V1 Required | playback repeat slice 있음 | engraving, export/reopen, manual playback QA |
| Layout | page size/orientation/margins/staff size | Commercial V1 Required | PDF preset 첫 slice 있음 | print plan/export consistency, manual PDF visual QA |
| Layout | staff/system spacing | Commercial V1 Required | 일부 있음 | page fitting, part-specific spacing, visual QA |
| Layout | collision avoidance for text/lines/spans | Commercial V1 Required | annotation lane 일부 있음 | solo/piano/ensemble visual regression 확대 |
| Layout | style presets and engraving options | V1 Polish | 제한적 | 최소 "default/readable/compact part" preset 필요 |
| Parts | live part view | Commercial V1 Required | 첫 slice 있음 | selected part title/event-only rendering 더 강화 |
| Parts | part extraction PDF/MusicXML | Commercial V1 Required | PDF smoke 일부 있음 | full score vs part export matrix, file dialog manual QA |
| Parts | independent part layout persistence | Commercial V1 Required | preference workflow 첫 slice 있음 | per-part layout/page setup persistence 정책 |
| Parts | cues / condensing / score subsets | Post-V1 | 없음 | 상용 V1 이후로 명시 |
| File | native project format | Commercial V1 Required decision | MusicXML primary save policy 확정 | 상용 V1은 native format 도입 또는 위험 문서화 필요 |
| File | MusicXML import/export | Commercial V1 Required | 구현 및 compatibility seed verifier 있음 | MuseScore/Dorico/Sibelius/Finale 실제 fixture 수집 |
| File | unsupported MusicXML report | Commercial V1 Required | 상세 report UI 첫 slice 있음 | false positive warning 축소 지속 |
| File | PDF export | Commercial V1 Required | 구현 및 smoke 일부 있음 | 사람 기준 visual QA, signed packaged path QA |
| File | MIDI export | Commercial V1 Required | 구현 및 verifier 있음 | DAW/notation app external open QA |
| Playback | transport, cursor, stop/jump/restart | Commercial V1 Required | 자동 QA 일부 있음 | 실제 청감 QA, same-staff/multi-part regression 유지 |
| Playback | tempo map, repeats, volta | Commercial V1 Required | 일부 구현 | repeat-wide policy manual pass 필요 |
| Playback | mixer mute/solo/volume | Commercial V1 Required | 첫 slice 및 tests 있음 | packaged/manual ensemble QA |
| Playback | VST/sound libraries/audio export | Post-V1 | 없음 | 명시적으로 후속 |
| Packaging | macOS packaged app | Commercial V1 Required | unpacked smoke 일부 있음 | DMG, signing/notarization, file dialog QA |
| Packaging | Windows packaged app | Commercial V1 Required | 미실행 | installer/smoke/signing policy 필요 |
| Packaging | Linux support | V1 Polish | 정책 필요 | 지원/미지원 명확화 |
| Release | evidence log and release gates | Commercial V1 Required | 문서 있음 | 최신 실행 결과, manual Pass/Fail/Not run 정리 |
| UX | toolbar/ribbon/palette organization | Commercial V1 Required | 2026-09-04 첫 slice로 현재 작업 컨텍스트 strip과 compact inspector/panel layout을 추가함 | 상용 V1 전 Score Setup, Note Input, Notation Objects, Lyrics/Chords, Playback, Export/Page Setup을 더 명확히 분리해야 함 |
| UX | discoverability, shortcuts, command help | V1 Polish | 일부 shortcut migration | shortcut reference/preferences 필요 |
| UX | accessibility and localization | V1 Polish | 확인 필요 | 최소 keyboard focus/label QA |

## Commercial V1에서 반드시 줄여야 할 blocker

1. **전문 사보 UI 재정리**
   현재 기능이 많아졌지만 상단 controls가 한꺼번에 노출되어 난잡하다. MuseScore의 palette/properties, Dorico의 mode/panel, Sibelius의 ribbon/keypad처럼 기능을 작업 맥락별로 나눠야 한다. Commercial V1에서는 최소한 Score Setup, Note Input, Notation Objects, Lyrics/Chords, Playback, Export/Page Setup의 정보 구조를 다시 잡아야 한다.

   2026-09-04 첫 vertical slice로 현재 작업, 입력 모드, part/staff/voice 대상, 음가, 재생 상태를 보여주는 context strip을 추가하고, inspector/toolbar를 compact panel layout으로 정리했다. 아직 category naming, notation object palette, export/page setup 분리는 남아 있으므로 Commercial V1 UI blocker 전체가 완료된 것은 아니다.

2. **same-staff multi-voice production polish**
   같은 보표 다성부는 "있다"가 아니라 rests, stems, selection, copy/paste, playback, MusicXML, collision까지 한 workflow로 통과해야 한다.

3. **part view와 part export 신뢰성**
   part view가 총보 필터가 아니라 독립 파트보처럼 보이고 저장되어야 한다. 선택 part만 PDF/MusicXML/MIDI export되는지 자동 테스트와 manual QA가 모두 필요하다.

4. **외부 MusicXML fixture QA**
   MuseScore, Dorico, Sibelius, Finale-origin 실제 export fixture가 없으면 상용 V1 호환성 주장은 약하다. Compatibility seed는 유지하되 실제 앱 버전, export setting, warning snapshot, reopen screenshot/evidence를 versioned fixture로 관리해야 한다.

5. **engraving collision avoidance**
   lyrics, dynamics, hairpins, slurs, chord symbols, rehearsal marks가 한 시스템에서 겹치지 않아야 한다. 자동 layout test만으로 끝내지 말고 PDF visual manual QA를 release gate로 둔다.

6. **native project format 또는 상용 save policy**
   MusicXML primary save는 public alpha에는 가능하지만, 상용 V1에서는 앱 내부 상태, part layout, view preference, page setup, future migration을 보존하는 native format 필요성이 커진다. native format을 미루면 release notes에 "MusicXML-first, 일부 앱 전용 상태는 보존하지 않음"을 정직하게 써야 한다.

7. **packaged app release QA**
   macOS DMG/signing/notarization, Windows packaged smoke, 실제 file dialog save/open/export/quit/relaunch가 통과해야 한다. 자동 smoke와 사람이 클릭한 QA를 분리 기록한다.

## V1 Polish로 밀 수 있는 기능

- pitch-first input mode
- MIDI keyboard step input
- shortcut preferences/export
- advanced selection filters
- style presets beyond default/readable/compact
- dark mode/theme polish
- page text/header/footer tokens
- advanced guitar chord diagrams
- command palette/popover completion

## Post-V1로 명시해도 되는 기능

- large ensemble orchestral publishing
- condensing and advanced score subsets
- cues and automatic cue suggestions
- tablature, percussion kits, slash notation completeness
- VST/AU instrument hosting and audio export
- cloud sharing, collaboration, mobile editor
- OCR/scan import
- plugin/scripting ecosystem
- advanced contemporary notation and microtonality

## 다음 작업 추천 순서

1. Commercial V1 UX information architecture: 난잡한 상단 UI를 전문 작업 흐름 중심으로 재배치한다.
2. External MusicXML fixture collection: MuseScore, Dorico, Sibelius, Finale 실제 export fixture 1개씩 수집한다.
3. Same-staff multi-voice release score: piano grand staff fixture로 입력, layout, playback, export/reopen을 고정한다.
4. Part extraction release score: string quartet fixture로 selected part view/PDF/MusicXML/MIDI를 고정한다.
5. Manual PDF/playback/package QA: solo, piano, ensemble 세 악보를 release candidate evidence로 채운다.
6. Native format decision: 상용 V1 포함 여부를 결정하고 migration policy를 문서화한다.

## 출처

- MuseScore Studio Handbook: https://handbook.musescore.org/
- MuseScore Studio, Entering notes and rests: https://handbook.musescore.org/en_gb/basics/entering-notes-and-rests
- MuseScore Studio, Working with multiple voices: https://handbook.musescore.org/basics/working-with-multiple-voices
- MuseScore Studio, Parts: https://handbook.musescore.org/basics/parts
- MuseScore Studio, File export: https://handbook.musescore.org/en_gb/file-management/file-export
- MuseScore Studio, Working with MusicXML files: https://handbook.musescore.org/file-management/working-with-musicxml-files
- MuseScore Studio, Score size and spacing: https://handbook.musescore.org/en_gb/formatting/score-size-and-spacing
- Dorico Pro Help 6.2: https://www.steinberg.help/r/dorico-pro/6.2/en
- Dorico Pro, Export MusicXML dialog 6.1: https://www.steinberg.help/r/dorico-pro/6.1/en/dorico/topics/project_file_handling/project_file_handling_export_musicxml_dialog_r.html
- Avid Sibelius Documentation: https://kb.avid.com/pkb/articles/en_US/user_guide/Sibelius-Documentation-All
- Avid, What’s New in Sibelius: https://www.avid.com/resource-center/whats-new-in-sibelius

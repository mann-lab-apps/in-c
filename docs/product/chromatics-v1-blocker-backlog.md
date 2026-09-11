# Chromatics Professional V1 Blocker Backlog

작성일: 2026-09-01

## Purpose

이 문서는 Chromatics Desktop V1을 전문적인 악보 작업이 가능한 public release 후보로
끌어올리기 위한 release blocker 작업판이다. 기능 상태의 source of truth는
`docs/product/feature-map-data.js`이고, 제품 기준은 `docs/product/chromatics-desktop-v1.md`를
따른다.

V1 release blocker는 public V1에서 known limitation으로 남길 수 없다. 남길 수 있는 제한은
scan/OCR, VST, 실시간 협업, 웹 풀 에디터, 고급 tab/percussion처럼 전문 기본 workflow 밖의
post-V1 확장뿐이다.

## Done In This Pass

- 테누토와 마르카토를 `Articulation` 모델, MusicXML import/export, notation renderer,
  inspector option, Korean UI term에 추가했다.
- first/second endings는 기존 모델, MusicXML round-trip, renderer, measure context menu,
  repeat playback 경로가 확인되어 feature map 상태를 `지원`으로 정정했다.
- 같은 staff 안의 multi-voice MusicXML import/export 첫 슬라이스를 추가했다. `<voice>`
  값을 기준으로 voice별 event stream을 만들고, voice 1/2가 있는 measure를 내부
  round-trip할 수 있다.
- system layout의 measure width 계산이 모든 same-staff voice의 rhythmic density를 보도록
  보강했다. voice 2가 촘촘한 measure도 더 넓은 공간을 받는다.
- Professional engraving collision avoidance 첫 annotation-lane slice를 추가했다. NotationPreview는
  measure별 lyric line, dynamic, hairpin, expression text, system text, rehearsal mark,
  staff text, chord symbol 밀도를 계산해 위/아래 annotation lane을 분리하고, 필요한 경우
  system top/height 여유를 늘린다.
- Long-span object collision avoidance 보강 slice를 추가했다. Hairpin renderer는 span 시작/끝
  measure의 annotation lane 중 더 낮은 안전 y-offset을 사용해 끝마디 lyrics/dynamics와 겹치지
  않게 하고, slur renderer는 lower annotation lane이 있는 measure를 지나는 below slur를 above로
  피한다. Annotation lane unit test와 notation visual snapshot baseline이 이 변경을 고정한다.
- Dense upper annotation collision avoidance 보강 slice를 추가했다. 같은 measure에 rehearsal
  mark, 여러 chord symbols, staff text가 함께 있을 때 chord symbol lane을 staff text 위에서
  쌓고, chord symbol이 3개 이상이면 rehearsal mark도 위로 올려 각 upper annotation baseline이
  겹치지 않도록 한다. Annotation lane unit test는 16px 이상 간격을 고정한다.
- note toolbar에 voice 1-4 전환 UI를 추가하고 `V`, `Shift-V`, `Cmd/Ctrl+Alt+1..4`
  단축키로 active voice를 바꿀 수 있게 했다. 아직 없는 voice를 선택하면 같은 staff의 해당
  measure에 full-measure rest 기반 voice를 만들고, note input target과 selection이 새 voice
  address를 유지한다.
- core range editing에서 same-staff voice 2의 range delete와 copy/paste가 target voice만
  바꾸고 voice 1을 유지하는지 회귀 테스트를 추가했다.
- App paste flow에서 새로 붙여넣은 이벤트 selection이 결과 score의 target voice address를
  즉시 보존하도록 수정했다. 붙여넣기 직후 `ArrowLeft`가 voice 1로 튀지 않는 화면 회귀
  테스트를 추가했다.
- MusicXML export가 same-staff multi-voice measure에서 다음 voice 앞에 표준 `<backup>`을
  기록하도록 serializer를 순서 보존 출력으로 바꿨다. export/import 왕복 테스트가 voice별 음악
  내용과 backup marker 순서를 확인한다.
- playback hook이 active event를 `partId`, `staffId`, `measureId`, `voiceId`와 함께 노출하고,
  App이 재생 중인 이벤트를 해당 voice address로 selection에 반영한다. NotationPreview는
  playback highlight/playhead를 event id뿐 아니라 measure/voice 주소가 맞는 이벤트에만 표시한다.
- NotationPreview의 click/shift-click/drag range callback이 event id와 함께 voice address를
  App으로 전달하도록 확장했다. App selection/range 생성은 이 주소를 우선 사용하며,
  same-staff duplicate event id도 명시 voice address로 선택되는지 core 테스트로 보강했다.
- MusicXML import가 아직 보존하지 못하는 notation/direction을 `parseMusicXmlWithReport`로
  수집한다. unsupported articulation, technical, ornament, direction의 measure/note/path를
  warning report에 담고, 앱의 MusicXML 가져오기/최근 파일 다시 열기 완료 안내에 경고 개수와 대표
  항목을 표시하는 첫 슬라이스를 추가했다.
- MIDI export 첫 슬라이스를 추가했다. Renderer에서 playback timeline 기반 Standard MIDI File
  type 1 bytes를 생성하고, tempo track과 note/chord track을 분리해 전역 tempo, positioned tempo
  event, note on/off, chord pitches를 기록한다. App 파일 메뉴에는 MusicXML/PDF와 구분되는
  MIDI 내보내기 액션을 추가했고 Electron bridge는 `.mid/.midi` 저장 다이얼로그와 바이너리 파일
  쓰기를 처리한다.
- `npm run verify:visual-regression`이 승인된 Electron 실행 환경에서 clean pass했다. 현재
  notation snapshot baseline은 V1 gate로 사용할 수 있는 상태다.
- playback part mixer 첫 슬라이스를 추가했다. Playback 탭에서 part별 mute, solo, volume을
  조작할 수 있고, `useScorePlayback`은 part mixer gain 정책을 실제 oscillator scheduling에
  반영한다. 재생 중 mixer가 바뀌면 현재 beat에서 audio schedule을 다시 만든다.
- 4-part ensemble part mixer App workflow 검증을 추가했다. String quartet 새 악보에서 Violin I,
  Violin II, Viola, Cello mixer row가 모두 표시되고, 각 part의 mute/solo/volume 조작이 독립
  `partId` 상태로 playback hook에 전달되는지 확인한다.
- Playback / Mixer QA 보강 slice를 추가했다. Playback timeline은 piano grand staff에서
  같은 beat에 있는 right-hand voice 1, right-hand voice 2, left-hand voice 1 이벤트의
  `partId/staffId/measureId/voiceId` 주소를 유지하는지 확인하고, scheduler 후보 계산은
  multi-part mute/solo/volume 조합과 재시작 beat의 velocity interpolation을 자동 테스트로
  고정한다. String quartet Cello 재생 이벤트 선택은 jump-to-start 후에도 editing selection
  주소를 유지하고 playback cursor만 초기화되는지 App 회귀 테스트로 확인한다.
- PDF page setup 첫 슬라이스를 추가했다. `ScoreLayout.pageSetup`에 page size, orientation,
  margin, staff size, system spacing을 저장하고, 악보 탭의 PDF 설정 UI와 print layout planner,
  PDF `@page` CSS가 같은 값을 사용한다. Letter landscape, 여백, 보표 크기, 시스템 간격이
  export layout plan에 반영되는 자동 테스트를 추가했다.
- PDF page setup preset polish 첫 슬라이스를 추가했다. 악보 탭 PDF 설정은 `기본 A4`,
  `리허설 Letter`, `출판 A4`, `컴팩트 파트보` preset을 제공하고, preset 선택 시 page size,
  orientation, margin, staff size, system spacing을 한 번에 적용한다. Preset 값은 export-time
  print layout plan에 반영되는지 App 테스트로 확인한다.
- PDF page setup renderer metadata slice를 추가했다. 실제 PDF 캡처 대상인 score page DOM은
  normalized page size, orientation, margin, staff size, system spacing을 `data-pdf-*`
  metadata로 노출한다. App 테스트는 manual Letter landscape 설정, publication A4 preset,
  string quartet Viola compact parts preset이 PDF export-time renderer contract까지 전달되는지
  확인한다.
- system text와 expression text 첫 슬라이스를 추가했다. score-core 모델과 undoable command,
  악보 탭 입력 UI, NotationPreview 표시, MusicXML import/export 왕복, 텍스트 입력 중 notation
  shortcut 차단 테스트를 연결했다.
- tempo map playback을 연결했다. positioned tempo event는 measure/tick에서 score beat로
  변환되고, playback beat/seconds 변환과 scheduler 예약 시간은 tempo map을 기준으로 계산된다.
  첫 staff 밖 measure id에 붙은 tempo event도 timeline에 반영되도록 보강했다.
- MusicXML export-side warning report 첫 슬라이스를 추가했다. MusicXML이 보존하지 못하는
  앱 전용 layout 데이터(system/page break, PDF page setup)는 저장을 막지 않고 export report와
  저장 완료 안내에 경고로 표시한다.
- 새 악보 마법사의 professional structure 프리셋 첫 슬라이스를 추가했다. Solo melody,
  piano grand staff, 2-part ensemble, string quartet skeleton을 만들 수 있고, 각 part/staff는
  고유 measure id와 part 성격에 맞는 기본 clef를 갖는다.
- NotationPreview의 multi-staff stacked rendering 첫 슬라이스를 추가했다. Piano grand staff
  새 악보는 첫 화면에서 Piano/Staff 2 보표와 lower staff full-measure rest가 SVG로 표시되며,
  Electron smoke가 `score-setup.create-grand-staff-score`에 연결되어 있다.
- 추가 staff 이벤트 선택/입력 주소 보존 첫 슬라이스를 추가했다. Grand staff lower staff 이벤트는
  `partId/staffId`를 가진 clickable SVG event가 되고, note input mode에서 편집해도 staff-2
  선택 주소가 유지되는지 Electron smoke로 확인한다.
- MusicXML multi-staff/multi-part 구조와 기본 event round-trip 첫 슬라이스를 추가했다. Export는 여러
  `<score-part>/<part>`와 grand staff의 `<staves>`, note-level `<staff>`를 기록하고,
  import는 part/staff별 measure, clef, 기본 note/rest event를 다시 만든다. Grand staff lower
  staff note와 multi-part note round-trip은 `src/musicxml/musicxml.test.ts`에 연결되어 있다.
- Part/staff 입력 타깃 전환 UI 첫 슬라이스를 추가했다. Note toolbar의 "입력 보표" select로
  grand staff의 상/하단 staff 또는 앙상블의 각 part staff를 전환할 수 있고, selection과 note
  input cursor가 같은 measure index/tick의 target `VoiceAddress`를 유지한다. Grand staff
  하단 staff 입력과 2-part ensemble의 part 2 입력은 `src/renderer/src/App.test.tsx`에
  연결되어 있다.
- Part/staff add/remove/rename workflow 첫 슬라이스를 추가했다. `score-parts.replace`
  command는 part 구조를 undo 가능하게 교체하고 빈 part/staff를 거부한다. 악보 탭은 현재
  part 이름/약어 변경, 새 part 추가, 현재 part 삭제, 현재 part에 staff 추가, 현재 staff 삭제를
  제공하며, 삭제 시 orphan measure/event 기반 notation reference를 batch cleanup한다.
- 현재 보표 전체 음자리표 선택 첫 슬라이스를 추가했다. 악보 탭의 "현재 보표 음자리표"
  select는 active part/staff의 모든 마디 clef를 같은 preset으로 바꾸고, undo 가능한
  `staff-measures.replace` command와 상태 메시지, App acceptance test에 연결되어 있다.
- 악기 라이브러리 기반 part 생성 첫 슬라이스를 추가했다. 악보 탭의 "추가할 악기"
  select는 piano, strings, woodwind, voice/melody preset의 part 이름, 약어, 기본
  staff/clef skeleton을 사용해 새 part를 만들고 입력 보표를 새 part 첫 staff로 이동한다.
- Multi-staff notation object anchoring 첫 슬라이스를 추가했다. NotationPreview는 primary
  staff와 passive staff 모두에서 measure-attached rehearsal/staff/system/expression text,
  tempo, harmony, dynamics를 해당 measure id의 staff y 위치에 그리며, passive staff 이벤트도
  tie/slur/hairpin/octave-shift 좌표 맵에 등록한다. App 테스트는 lower staff measure id 저장을,
  Electron smoke는 lower staff SVG의 staff text/dynamic 위치를 검증한다.
- 외부 사보앱 호환 MusicXML fixture QA 첫 슬라이스를 추가했다. MuseScore, Finale, Sibelius,
  Dorico compatibility seed manifest와 fixture를 `src/musicxml/fixtures/external-apps/`에
  두고, part 이름, staff 수, clef, 기본 note event, voice 구조, unsupported warning을
  `npm run verify:musicxml-fixtures`로 검증한다. 실제 앱에서 export한 versioned fixture 수집과
  reopen/manual snapshot QA는 release candidate 전 남은 작업이다.
- 외부 사보앱 MusicXML manifest gate를 보강했다. 각 fixture는 origin, collection status,
  export settings, evidence link를 기록하고, MuseScore/Dorico/Sibelius/Finale 실제
  app-export fixture가 없으면 `requiredAppExports`에 `manual-collection-required`로 남는다.
  `npm run verify:musicxml-fixtures`는 seed/app-export 구분과 필수 수집 상태를 검증한다.
- 외부 사보앱 MusicXML fixture QA verifier를 dynamics/articulation/warning path까지 보도록
  보강했다. MuseScore grand staff compatibility seed는 지원 dynamic `mf`와 staccato
  articulation을 warning 없이 import/export round-trip하는지 확인하고, Dorico unsupported
  seed는 warning code뿐 아니라 정확한 MusicXML path snapshot을 검증한다. Multi-staff import에서
  `measure-1`로 들어온 score-level direction이 export 때 primary staff measure id와 맞지 않아
  빠지던 round-trip 공백도 serializer measure-reference matching으로 보강했다.
- Live part view 첫 슬라이스를 추가했다. 악보 탭에서 총보/파트보 보기 모드를 전환하고
  선택한 part만 NotationPreview와 PDF 출력 대상에 넘긴다. 표시용 score는 원본 score를
  변경하지 않고 해당 part의 measure/event에 연결된 notation object와 layout hint만 남긴다.
  파트보 모드에서는 선택 part 이름을 출력물 제목 영역에 함께 표시한다.
- MIDI multi-part channel/program 분리 첫 슬라이스를 추가했다. MIDI export는 tempo track과
  part별 note track을 나누고, V1 악기 preset 이름에 맞춰 Piano/Violin/Viola/Cello 등
  General MIDI program과 독립 channel을 기록한다.
- MIDI percussion/tab V1 정책 첫 슬라이스를 추가했다. Percussion clef와 tab clef가 있는
  staff는 V1 MIDI에서 해석하지 않고 해당 staff의 note event를 MIDI note track에서 제외하며,
  export 성공 메시지에 `unsupported-midi-clef` 경고와 위치를 표시한다. 일반 pitched staff는
  기존대로 MIDI에 포함된다.
- MIDI V1 QA fixture verifier 첫 슬라이스를 추가했다. `npm run verify:midi-fixtures`는
  solo melody, piano grand staff, string quartet preset 기반 score를 Standard MIDI File로
  내보내고 header track count, tempo/part track name, General MIDI program change, part/staff별
  note-on 이벤트, warning absence를 확인한다.
- Tie/tuplet playback 정확도 검증을 보강했다. Playback timeline은 같은 staff 안 multi-voice
  cross-measure tie를 직전 이벤트 순서가 아니라 voice별 pending tie로 병합하고,
  ensemble tuplet이 다른 part의 regular beat와 같은 score beat grid에 놓이는지 자동
  테스트로 확인한다.
- Repeat expansion의 score-wide playback 정책 첫 슬라이스를 추가했다. 반복/volta 표기가 있는
  canonical staff의 measure index 순서를 score-wide plan으로 만들고, 마디 수와 duration이
  일치하는 grand staff/ensemble의 다른 staff에도 같은 반복 순서를 적용한다. Repeated measure
  안의 tempo event도 반복 pass마다 timeline에 복제되며, 2-part ensemble과 piano grand staff
  volta 회귀 테스트로 확인한다.
- Playback stop/jump 후 selection/cursor 정책 첫 슬라이스를 추가했다. 재생 중 active event는
  voice address를 가진 editing selection으로 동기화하고, 정지 또는 처음으로 이동 후에는 편집
  selection을 마지막 재생 이벤트에 유지하면서 playback cursor/playhead highlight만 초기화한다.
  Playback toolbar에는 별도 "처음으로" transport button을 추가했다.
- Same-staff multi-voice range visual address scoping 첫 슬라이스를 추가했다. NotationPreview는
  selection address를 받아 event id뿐 아니라 part/staff/measure/voice가 일치하는 이벤트만
  selected tone으로 칠하고, SVG event에 part/staff/measure/voice data attribute를 일관되게
  남긴다. Drag/range callback이 넘긴 voice address가 visual highlight까지 유지되는지 App과
  notation visual-state 테스트로 확인한다.
- Same-staff drag range anchor가 event id만 보존하던 경로를 voice-lane scoped anchor로 보강했다.
  드래그 range는 여러 measure에 걸쳐 같은 part/staff/voice lane에서는 이어지고, 다른 voice/staff로
  넘어가면 range 확장을 만들지 않는다.
- Same-staff range/drag visual polish 첫 slice를 추가했다. 선택된 range는 system/staff별
  translucent dashed band로 묶어 보이고, band는 악보 이벤트 뒤에 깔리며 print/PDF에서는
  숨겨진다. Range band 계산은 selected event point를 system/staff 단위로 분리해 grand staff나
  multi-voice selection이 다른 staff처럼 보이지 않도록 한다.
- MusicXML warning 상세 report UI 첫 슬라이스를 추가했다. 가져오기/다시 열기/내보내기 성공 후
  warning이 있으면 상태 메시지 아래에 파일명, import/export 방향, warning code, measure/event
  또는 measure id, MusicXML path, message를 표시한다. Warning이 없는 새 악보 open/import/export는
  이전 report를 지운다.
- 실전 dynamics import/export false-positive 감소 첫 슬라이스를 추가했다. `ppp`, `pp`, `p`,
  `mp`, `mf`, `f`, `ff`, `fff`, `sfz`를 `DynamicValue`, 악보 탭 UI, MusicXML import/export,
  playback velocity map에 연결했고, `pp`/`ff`/`sfz` MusicXML이 warning 없이 round-trip되는지
  테스트로 확인한다.
- 저장된 part view workflow 정책 첫 슬라이스를 구현했다. MusicXML 파일 자체는 표준 교환 포맷으로
  유지하고, Chromatics 데스크탑은 파일 경로별 마지막 총보/파트보 선택을 로컬 preference로 기록한다.
  저장 후 같은 MusicXML을 최근 파일에서 다시 열면 유효한 part id의 part view가 복원되고, part가
  사라졌거나 preference가 없으면 총보로 연다.
- 4-part ensemble part-addressed 입력 -> MusicXML 저장 -> 최근 파일 재열기 App workflow 검증
  첫 슬라이스를 추가했다. String quartet 새 악보에서 Violin I, Violin II, Viola, Cello 각각의
  입력 보표에 음을 넣고, 저장된 MusicXML을 parser로 다시 읽어 part별 note가 보존되는지 확인한 뒤,
  최근 파일 reopen 후 preview의 part 구조와 part별 pitch evidence가 유지되는지 확인한다.
- Native project format V1 정책을 확정했다. V1 primary save는 MusicXML로 고정하고,
  전용 프로젝트 포맷은 post-V1 migration 대상으로 둔다. 로컬 전용 상태는 autosave/recovery,
  최근 파일 목록, 파일 경로별 part view preference로 제한하며, MusicXML이 보존하지 못하는
  layout/view 데이터는 warning/report와 release notes에 명확히 표시한다.
- V1 shortcut/editing polish에서 plain `Up/Down`을 navigation-first 정책으로 옮기는 첫 슬라이스를
  구현했다. Plain vertical arrow는 더 이상 pitch를 바꾸지 않고, grand staff/ensemble의 인접
  part/staff/voice lane에서 같은 measure index와 가장 가까운 tick의 이벤트로 selection을 이동한다.
  pitch 변형은 `Alt/Option+Up/Down`, `Shift+Alt/Option+Up/Down`, `Cmd/Ctrl+Alt/Option+Up/Down`
  조합으로 남긴다.
- V1 duration shortcut migration을 완료 정책으로 고정했다. Duration palette와 keyboard routing은
  `1=64th`, `2=32nd`, `3=16th`, `4=eighth`, `5=quarter`, `6=half`, `7=whole`을 사용하고,
  plain `9`는 더 이상 triplet 또는 duration shortcut으로 동작하지 않는다. Triplet은
  `Cmd/Ctrl+3`만 active shortcut으로 노출한다.
- Lyrics/chord symbols App workflow export/reopen 검증 첫 슬라이스를 추가했다. `release-test`
  fixture에서 코드 심벌과 선택 음표 가사, syllabic, melisma를 편집하고 MusicXML로 저장한 뒤 최근
  파일에서 다시 열어 가사와 코드 심벌이 프리뷰에 복원되는지 App 테스트로 확인한다.
- macOS packaged app smoke 첫 검증을 완료했다. `package.json`의 mac build config는
  로컬/프리릴리즈 package gate가 키체인 서명 대기에 걸리지 않도록 `identity: null`을
  명시하고, `npm run package:dir`은 `release/mac-arm64/in-C.app`을 생성한다.
  승인된 packaged executable 실행에서 `npm run verify:package`가 renderer preload bridge,
  시작 화면, 시작 action, 새 악보 생성 후 workspace/title/notation SVG 표시,
  non-dialog MusicXML 파일 쓰기, recent file 다시 열기, PDF 파일 생성과 `%PDF`/EOF/
  page object/MediaBox 구조, MIDI type-1 tempo/note track 구조와 end-of-track marker,
  autosave write/read/clear round-trip을 확인했다. 이 direct file path 저장 경로는 `--smoke-test` 실행과
  정해진 temp smoke 파일명에만 허용된다.
- macOS packaged app smoke에 string quartet Cello part view PDF target 검증을 추가했다.
  `--smoke-test` 실행에서 새 악보를 string quartet로 만들고, 악보 탭에서 Cello 파트보로
  전환한 뒤 visible notation event가 Cello part만 가리키는지 확인하고, 같은 direct-path
  PDF bridge로 파트보 PDF 파일 생성과 PDF 구조 검증을 통과한다.
- macOS packaged app smoke의 Cello part view PDF target 검증을 compact parts page setup
  metadata까지 확장했다. Packaged renderer는 Cello part view에서 `a4`/`portrait`/`6mm`/
  `90%` staff size/`90%` system spacing metadata를 score page DOM에 노출하고, smoke가 이를
  확인한다.
- Part view/PDF visual QA 보강 slice를 추가했다. PDF로 찍히는 score page DOM은 현재
  view mode와 selected part id를 `data-view-mode`/`data-part-id`로 노출하고, part title도
  selected part id를 갖는다. App 테스트는 string quartet Viola 파트보와 `컴팩트 파트보`
  preset으로 PDF export 중 print renderer가 Viola part만 받고 다른 part event를 포함하지
  않으며 A4 portrait/6mm/90% layout plan을 쓰는지 확인한다. Packaged smoke는 Cello part view의
  page/part title metadata와 visible event part id가 모두 Cello인지 확인한다.
- Import-origin part view annotation filter slice를 추가했다. MusicXML multi-part import에서
  첫 part 기준으로 들어온 staff-level chord symbol, dynamics, staff/expression text는 첫 part
  파트보에만 남기고, Cello 같은 다른 part view/PDF renderer에는 새지 않도록 App regression으로
  고정했다. Rehearsal mark, tempo, system text처럼 전 part에 필요한 global annotation은
  `measure-1` 형식의 imported generic measure reference도 선택 part의 measure number와 맞춰
  유지한다.
- RC 수동/외부 QA availability audit을 수행했다. 현재 macOS 26.6.2 arm64 환경에는
  `release/mac-arm64/in-C.app`과 GarageBand 10.4.12가 있지만, MuseScore/Dorico/Sibelius/Finale
  앱과 DMG/Windows/Linux release artifact는 확인되지 않았다. Latest packaged smoke PDF는
  Poppler로 A4 1페이지 렌더링까지 보조 확인했지만, 실제 file dialog save/open, PDF viewer
  사람 확인, DAW/notation app MIDI 열기, playback/mixer 청감 QA는 public RC 전 수동 evidence로
  남아 있다.

## Release Blockers

| 순서 | 영역 | 작업 | 현재 상태 | 완료 기준 |
| --- | --- | --- | --- | --- |
| 1 | Score model | same-staff multi-voice 입력/전환/편집 완성 | 부분 지원 | 한 staff 안의 voice 1-4를 키보드와 UI로 전환하고, selection/range/copy/paste/delete/playback/MusicXML이 voice address를 잃지 않는다. Voice 1-4 toolbar/shortcut 전환과 note input target 유지, preview click/shift-click/drag callback의 voice address 전달, core range delete/copy/paste의 addressed voice 보존, paste 직후 selection/navigation의 target voice 보존, playback active event의 voice-aware selection/highlight, stop/jump 후 selection 유지 정책, MusicXML voice별 stream import와 표준 backup export, address-scoped range visual highlight 첫 슬라이스, drag range anchor의 voice-lane guard, selected range band visual polish 첫 슬라이스가 완료되었다. 실제 앱 export MusicXML fixture 검증과 warning report, 충돌 없는 engraving UX가 남아 있다. |
| 2 | Score model | multi-part 총보와 multi-staff/grand staff workflow 완성 | 부분 지원 | 새 악보 wizard 또는 inspector에서 2-4 part ensemble과 piano grand staff를 만들고 편집/저장/재열기/렌더링할 수 있다. 새 악보 마법사 구조 프리셋으로 piano grand staff, 2-part ensemble, string quartet skeleton 생성 첫 슬라이스가 완료되었고, NotationPreview는 multi-staff stacked preview와 추가 staff 이벤트 선택/note input target 보존 첫 슬라이스를 제공한다. MusicXML은 multi-staff/multi-part 구조와 기본 note/rest event round-trip 첫 슬라이스를 지원한다. Note toolbar의 입력 보표 전환 UI는 selection/note input cursor의 part/staff address를 유지한다. 악보 탭 part/staff add/remove/rename 첫 슬라이스와 삭제 reference cleanup, 현재 보표 전체 음자리표 선택, 악기 라이브러리 기반 part 생성, multi-staff notation object anchoring, 외부 사보앱 compatibility seed fixture QA 첫 슬라이스, 4-part ensemble part별 입력 후 MusicXML 저장/최근 파일 재열기 App workflow 검증 첫 슬라이스가 완료되었다. Collision-aware engraving polish, 실제 앱 export fixture QA, packaged app manual QA는 남아 있다. |
| 3 | Layout | part extraction 또는 live part view 구현 | 부분 지원 | 총보에서 개별 파트보를 열람/출력하고, 총보 변경이 파트보에 반영된다. 악보 탭의 총보/파트보 보기 전환, 선택 part 프리뷰, 파트보 제목, part view PDF 출력 대상 연결 첫 슬라이스가 완료되었다. MusicXML 파일 경로별 마지막 총보/파트보 선택은 로컬 preference로 저장/복원하는 V1 정책 첫 슬라이스가 완료되었다. App 테스트는 string quartet Viola 파트보 PDF export 중 print renderer가 Viola part만 받고 compact parts preset layout을 쓰는지 확인한다. Import-origin 2-part App regression은 첫 part staff-level annotation이 다른 part view/PDF renderer로 새지 않고 rehearsal mark 같은 global annotation은 유지되는지 확인한다. Packaged smoke는 string quartet Cello 파트보로 전환해 score page/part title metadata와 visible event가 Cello part만 가리키는지 확인하고 part view PDF 파일 생성/구조 검증을 통과한다. 독립 파트보 레이아웃의 실제 시각 polish와 file dialog 기반 실제 파트보 PDF visual QA는 남아 있다. |
| 4 | Layout | page setup/PDF settings 구현 | 부분 지원 | page size, orientation, margins, staff size, system spacing이 UI와 PDF export에 반영된다. ScoreLayout page setup 모델, 악보 탭 PDF 설정 UI, print layout planner, PDF `@page` CSS 반영, V1 page setup preset polish 첫 슬라이스가 완료되었다. Score page DOM은 PDF export renderer가 캡처하는 normalized page setup metadata를 노출하고, App 테스트는 manual Letter landscape, publication A4, compact parts preset이 renderer contract까지 전달되는지 확인한다. Packaged smoke는 새 악보 총보와 Cello part view PDF의 header/EOF/page object/MediaBox 구조를 확인한다. file dialog 기반 실제 PDF visual QA, 저장 파일 round-trip 정책, preview polish는 남아 있다. |
| 5 | Layout | professional engraving collision avoidance 강화 | 부분 지원 | lyrics, dynamics, hairpins, slurs, chord symbols, rehearsal marks가 핵심 QA 악보에서 서로 읽을 수 없게 겹치지 않는다. Same-staff voice 2의 rhythmic density를 measure width에 반영하는 첫 슬라이스, measure annotation lane stacking 첫 슬라이스, hairpin span start/end lane y-offset, lower annotation lane이 있는 slur의 above-side avoidance slice, rehearsal mark/chord symbols/staff text dense upper lane spacing과 very-dense rehearsal offset slice가 완료되었다. 실제 solo/grand staff/ensemble QA 악보의 시각 검증과 더 복잡한 cross-system slur/manual PDF engraving polish는 남아 있다. |
| 6 | Notation objects | system text와 expression text 구현 | 지원 | 입력/편집/렌더링/MusicXML round-trip이 되고 텍스트 입력 중 notation shortcut이 실행되지 않는다. 시스템 텍스트는 measure-level, 표현 텍스트는 tick-level로 저장하고 MusicXML direction words로 왕복한다. 충돌 없는 세부 engraving polish는 blocker 5에서 계속 다룬다. |
| 7 | Playback | tempo map playback 구현 | 지원 | 마디 중간 tempo event와 score 중간 tempo change가 playback timeline에 반영된다. Positioned tempo event의 beat mapping, beat/seconds 변환, elapsed seconds -> beat 역변환, scheduler start/end time 계산이 자동 테스트로 연결되었다. Text-only rit./accel. curve playback은 post-V1 advanced interpretation으로 남긴다. |
| 8 | Playback | tie/tuplet/playback repeat 정확도 검증 | 부분 지원 | tie duration, tuplet timing, repeat expansion이 solo/grand staff/ensemble QA 악보에서 기대 beat와 일치한다. 단일 voice tie merge, triplet proportional beat, same-staff multi-voice cross-measure tie merge, ensemble tuplet shared beat grid, score-wide repeat expansion, canonical-staff volta 적용, repeated tempo event 자동 테스트가 완료되었다. Piano grand staff에서 같은 beat의 right-hand voice 1/2와 left-hand voice 1 playback event가 `partId/staffId/measureId/voiceId` 주소를 잃지 않는 회귀 테스트도 추가되었다. Grand staff/ensemble 실제 청감 QA는 남아 있다. |
| 9 | Playback | playback cursor와 editing selection sync 완성 | 부분 지원 | 재생 중 현재 event가 시각적으로 추적되고, stop/jump 후 selection과 cursor가 예측 가능하게 유지된다. 재생 중 active event -> voice-aware editing selection 동기화와 stop/jump-to-start 후 selection 유지/playback cursor 초기화 정책은 App 테스트로 고정되었다. String quartet Cello playback event에서도 jump-to-start 후 editing selection address는 유지되고 playback cursor만 초기화되는 회귀 테스트가 추가되었다. Grand staff/ensemble 실제 재생 QA와 더 긴 transport workflow 수동 검증은 남아 있다. |
| 10 | Playback | part별 mixer 구현 | 부분 지원 | part별 mute, solo, volume이 playback scheduler에 반영된다. Playback 탭 part mixer UI와 scheduler gain 정책 첫 슬라이스, string quartet 4-part App workflow의 독립 mute/solo/volume 상태 전달 검증이 완료되었다. Scheduler 후보 계산은 multi-part mute/solo/volume 조합, solo 우선순위, muted part 제외, 재시작 beat의 velocity interpolation을 자동 테스트로 고정한다. Solo/mute 조합의 실제 청감 확인과 packaged/manual playback QA는 남아 있다. MIDI export는 part별 channel/program 분리 첫 슬라이스가 완료되었다. |
| 11 | Import/export | MIDI export 구현 또는 V1 검증 | 부분 지원 | solo, grand staff, 2-4 part ensemble에서 MIDI export가 생성되고 주요 DAW/notation app에서 열 수 있다. Standard MIDI File type 1 생성, tempo map, note/chord events, Electron save bridge, App menu action, multi-part channel/program 분리, percussion/tab staff 제외와 `unsupported-midi-clef` 경고 정책, macOS arm64 unpacked packaged app의 direct-path MIDI type-1 tempo/note track 구조 smoke, solo/grand staff/string quartet `verify:midi-fixtures` 자동 QA 첫 슬라이스가 완료되었다. 실제 DAW/notation app 열기 검증과 file dialog/manual packaged QA가 남아 있다. |
| 12 | Import/export | unsupported MusicXML warning/report 구현 | 부분 지원 | 가져오기/내보내기에서 보존하지 못한 표기가 actionable report로 표시되고 조용히 손실되지 않는다. Import report 첫 슬라이스는 unsupported articulation/technical/ornament/direction의 measure, note, MusicXML path를 수집하고 App 상태 메시지로 대표 항목을 보여준다. Export-side report 첫 슬라이스는 MusicXML이 보존하지 못하는 앱 전용 layout 데이터(system/page break, PDF page setup)를 저장 완료 안내에 경고로 표시한다. Import/export 상세 report UI는 파일명, 방향, warning code, measure/event 또는 measure id, MusicXML path, message를 상태 메시지 아래에 보여준다. Dorico compatibility seed fixture가 unsupported notation/direction warning code/path를 검증한다. 실전 dynamics `ppp/pp/p/mp/mf/f/ff/fff/sfz`와 MuseScore seed의 `mf`/staccato는 warning 없이 import/export round-trip되도록 verifier에 고정되었다. 지원 표기의 false positive 제거 범위 확장과 실제 앱 export fixture 기반 report 검증은 남아 있다. |
| 13 | Import/export | 외부 사보앱 MusicXML fixture 검증 | 부분 지원 | MuseScore, Dorico, Sibelius, Finale-origin fixture의 import/export 결과와 warning이 기록된다. Compatibility seed manifest는 MuseScore grand staff, Finale string duet, Sibelius same-staff multi-voice, Dorico unsupported direction/technical notation을 `npm run verify:musicxml-fixtures`로 검증한다. Fixture manifest는 origin, collection status, export settings, evidence link, expected dynamics, articulations, warning codes, warning paths와 앱별 `manual-collection-required` 상태를 추적한다. Multi-staff imported score-level directions도 MusicXML round-trip에서 빠지지 않도록 serializer measure-reference matching이 보강되었다. 실제 앱에서 export한 versioned fixture 수집, 앱별 import/export result와 warning snapshot, 재가져오기/manual reopen 검증은 남아 있다. |
| 14 | QA | visual regression clean gate | 지원 | `npm run verify:visual-regression`이 clean pass하거나 의도적 baseline update가 기록된다. 2026-09-01 승인된 Electron 실행에서 clean pass했다. |
| 15 | QA | packaged app smoke | 부분 지원 | macOS/Windows packaged app에서 새 악보 작성, 저장, 재실행, 열기, PDF/MusicXML/MIDI export가 확인된다. macOS arm64 unpacked app은 `npm run package:dir`와 `npm run verify:package`로 preload bridge, 시작 화면, 시작 action, string quartet 새 악보 생성 후 workspace/title/notation SVG 표시, smoke-only non-dialog MusicXML 파일 쓰기, recent file 다시 열기, 총보 PDF와 Cello part view PDF 파일 생성/구조, Cello part view score page/part title metadata, visible event part id, compact parts page setup metadata, MIDI type-1 tempo/note track 구조, autosave round-trip smoke가 통과했다. 실제 file dialog 기반 저장/열기/export 수동 QA, installer/DMG artifact QA, Windows packaged smoke는 남아 있다. |

## V1 Polish After Blockers

- 전문 사보앱 호환 duration shortcut migration은 완료 정책으로 고정했다. `1..7`은 V1 duration map,
  triplet은 `Cmd/Ctrl+3`, plain `9`는 unbound다.
- plain `Up/Down` pitch edit을 navigation 우선 정책으로 이전한다. 첫 슬라이스는 plain vertical
  arrow가 grand staff의 인접 staff lane으로 selection을 이동하고 pitch edit을 하지 않는 App
  회귀 테스트로 고정했다.
- diatonic/chromatic/octave transpose와 enharmonic respell 실전 UX 첫 슬라이스를 완료했다.
  선택 음표는 `Alt/Option+Up/Down`, `Shift+Alt/Option+Up/Down`, `Cmd/Ctrl+Alt/Option+Up/Down`
  단축키로 각각 diatonic/chromatic/octave 이동을 수행하고, plain `J` 또는 note toolbar 버튼으로
  sounding pitch를 유지한 채 F# -> Gb 같은 이명동음 철자를 바꿀 수 있다. Pitch editing unit
  test는 MIDI pitch 보존과 undo를, App regression은 `J` shortcut과 undo 흐름을 고정한다.
- lyrics와 chord symbols는 `release-test` App workflow에서 입력/수정/export/reopen 보존을
  자동 검증한다. Solo/grand staff/ensemble 수동 QA 악보에서 file dialog 기반 입력/출력 확인은
  release candidate signoff에 남아 있다.
- native project format은 V1에서 제외하고 MusicXML primary save 정책으로 고정했다.
  전용 프로젝트 포맷은 post-V1 migration 대상으로 둔다.

## Verification Gate

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run verify:e2e`
- `npm run verify:visual-regression`
- `npm run package:dir`
- `npm run verify:package`

## Manual QA Scores

- solo score: 16-32마디, clef/key/time/tempo, dynamics, hairpin, slur, articulation,
  lyrics, chord symbols, repeat/volta 포함.
- piano grand staff score: multi-staff, same-staff multi-voice, ties, tuplets, page breaks 포함.
- 2-4 part ensemble score: part별 입력, part view/extraction, mixer, PDF/MusicXML/MIDI export 포함.

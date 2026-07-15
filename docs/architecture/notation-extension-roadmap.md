# Notation Extension Roadmap

작성일: 2026-07-14
업데이트: 2026-07-15

이 문서는 단성부 MVP 이후 큰 악보 기능을 한 번에 구현하지 않기 위한 설계 경계다.
각 기능은 모델, 렌더링, MusicXML, playback, undo/redo에 영향을 주므로 작은 slice로
나누어 진행한다.

## Tempo Marking And Tempo Map

관련 이슈: #229, #211

### Global tempo marking slice

- `TempoMarking`은 `bpm`, `beatUnit`, `dots`, `text`를 가진다.
- `beatUnit` 기본값은 `quarter`다.
- `dots`는 dotted quarter 같은 표시를 위해 0-2만 허용한다.
- `text`는 `Allegro`, `Andante`, `rit.`, `a tempo` 같은 빠르기말을 보존한다.
- playback은 우선 global tempo를 quarter-beat timeline으로 환산해 사용한다.
- MusicXML import/export는 `direction/words`, `metronome/beat-unit`,
  `beat-unit-dot`, `per-minute`, `sound tempo`를 보존한다.
- 2026-07-15 first slice: renderer 표시, MusicXML round-trip, dotted beat unit의
  quarter-BPM playback 환산을 구현했다.

### Tempo map later slice

- `TempoEvent`는 measureId, tick, bpm, beatUnit, dots, text를 가진다.
- 2026-07-15 first slice: MusicXML `offset` 기반 tick 위치를 보존하고,
  playback timeline에 `tempoEvents` metadata로 정렬한다.
- 다음 구현은 재생 중 tempo event를 실제 scheduler 속도 변화로 반영하는 것이다.
- `rit.`처럼 BPM 없는 text-only event는 표시-only로 보존하고 playback에는 반영하지 않는다.

## Clef Editing

관련 이슈: #265

- MVP 지원: treble G2, bass F4, alto C3, tenor C4.
- 첫 마디 clef와 measure-level clef change를 같은 `Measure.clef`로 유지한다.
- 중간 tick clef change는 후속 범위다.
- clef change는 pitch 자체를 바꾸지 않는다. 표시 위치만 바뀐다.
- MusicXML import/export는 `attributes/clef`를 measure 단위로 보존한다.
- UI slice: selected measure inspector에서 clef preset을 바꾼다.
- 2026-07-15 first slice: G/F/C/percussion clef import/export 제한을 풀고,
  renderer/system layout이 clef별 staff line mapping을 검증한다.

## Octave Lines

관련 이슈: #264

- 지원 표시: 8va, 8vb, 15ma, 15mb.
- 모델은 startEventId, endEventId, type, playbackAffectsPitch를 가진 score-level span이다.
- MVP 정책: 렌더링과 MusicXML 보존 우선, playback pitch 변경은 명시 옵션 전까지 보류.
- renderer는 staff 위/아래 line lane을 예약하고 system break에서 line을 분할한다.
- MusicXML은 `direction-type/octave-shift` start/stop으로 매핑한다.
- 2026-07-15 first slice: score-level span 모델, renderer bracket, MusicXML round-trip을
  구현했다. playback pitch shift와 편집 UI는 남아 있다.

## Tremolo

관련 이슈: #266

- 첫 지원은 single-note tremolo slash count 1-3이다.
- two-note tremolo는 beam/stem과 playback 해석이 커서 후속 범위다.
- 모델은 note-level `tremolo?: { type: 'single'; marks: 1 | 2 | 3 }`로 시작한다.
- playback은 실제 반복으로 풀지 않고 표시-only로 시작한다.
- MusicXML은 `ornaments/tremolo`를 import/export한다.
- 2026-07-15 first slice: note-level 모델, renderer slash 표시, MusicXML round-trip을
  구현했다. 입력 UI와 반복 재생 해석은 남아 있다.

## Repeats And Endings

관련 이슈: #92

- first slice: measure-level start repeat, end repeat, repeat count.
- second slice: first/second endings.
- playback timeline은 score order를 펼친 `PlaybackSegment[]`를 만든다.
- renderer는 barline에 repeat glyph를 붙이고, ending bracket은 별도 lane을 예약한다.
- MusicXML은 `barline/repeat`와 `ending`을 보존한다.
- malformed repeat는 playback에 반영하지 않고 표시/검증 warning으로 처리한다.
- 2026-07-15 first slice: measure-level start/end repeat 모델, renderer 표시,
  MusicXML round-trip을 구현했다. playback repeat expansion은 남아 있다.

## Multiple Voices On One Staff

관련 이슈: #93

- 기존 `Measure.voices` 배열을 실제 다중성부 모델로 사용한다.
- active voice는 editor selection에 포함한다.
- 기본 stem direction: voice 1 up, voice 2 down, 이후 voice는 explicit policy가 필요하다.
- same tick의 rest collision은 voice별 rest lane으로 조정한다.
- MusicXML import는 `voice` 번호와 `backup/forward`를 보존해야 한다.
- 단성부 exact rhythm test는 유지하고, voice별 rhythm exact test를 추가한다.
- 2026-07-15 first slice: renderer/system layout이 모든 voice를 vertical spacing에
  반영하는 회귀 테스트를 추가했다. MusicXML backup/forward와 편집 UX는 남아 있다.

## Multiple Parts

관련 이슈: #94

- existing `Score.parts` 구조를 사용하되 editor selection에 active part/staff를 명시한다.
- first slice는 read/render/import/export of two parts.
- editing slice는 part add/remove/rename command와 active part switching을 별도 구현한다.
- playback은 모든 parts의 events를 같은 beat timeline으로 merge한다.
- renderer는 system마다 part staves를 vertical stack으로 배치하고 part name/abbreviation lane을 둔다.
- 2026-07-15 first slice: playback timeline이 여러 part/staff event를 같은 beat
  timeline으로 병합한다. multi-part renderer와 MusicXML import/export는 남아 있다.

## Acceptance Fixture Plan

각 기능은 구현 전에 최소 fixture를 추가한다.

- `tempo-map.musicxml`: global tempo text + metronome + one later tempo direction.
- `clef-changes.musicxml`: G/F/C clef measure changes.
- `octave-lines.musicxml`: 8va and 8vb start/stop spans.
- `tremolo.musicxml`: single-note tremolo slash counts.
- `repeats.musicxml`: start/end repeat and repeated playback expectation.
- `multi-voice.musicxml`: two voices on one staff with different rhythms.
- `multi-part.musicxml`: two parts with simultaneous playback events.

Fixtures should parse without data loss before UI editing is added.

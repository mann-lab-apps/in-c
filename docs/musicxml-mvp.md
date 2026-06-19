# MusicXML MVP 지원 범위

작성일: 2026-06-19

## 지원하는 문서

- `score-partwise` MusicXML
- 단일 part
- 단일 staff
- 단일 voice (`voice` 1)
- 높은음자리표(G clef)
- 조표의 `fifths`와 major/minor mode
- 단순 박자표
- 음표와 쉼표
- whole, half, quarter, eighth, 16th, 32nd, 64th 길이
- 점음표
- 음높이 step, octave, alter -2부터 2
- 제목, 작곡가, part 이름과 약어

가져온 MusicXML은 먼저 `src/score-core` 모델로 변환된다. 화면 렌더링과
편집은 MusicXML 문서를 직접 수정하지 않고 score-core만 사용한다.

## 지원하지 않는 기능

- 여러 part 또는 여러 staff
- 여러 voice, `backup`, `forward`
- chord
- grace note
- tie, slur, tuplet
- beam, articulation, ornament, dynamics
- lyrics
- transposition
- percussion 및 tablature
- layout, print, page/system break
- MIDI 및 sound 정보
- compressed `.mxl`

지원하지 않는 구조는 조용히 삭제하지 않고 가져오기 또는 내보내기 오류로
알린다.

## 내보내기

내보내기는 MusicXML 4.0 `score-partwise` 문서를 생성한다. 각 measure에
divisions, 조표, 박자표, staff 수, clef를 기록해 독립적으로 읽을 수 있게 한다.
현재 divisions 값은 128이며, 지원하는 기본 길이와 점음표를 정수 duration으로
표현한다.

## Fixture

`src/musicxml/fixtures/single-part-treble.musicxml`은 단일 피아노 part,
높은음자리표, 4/4, C major, 음표·임시표·쉼표를 포함한다.

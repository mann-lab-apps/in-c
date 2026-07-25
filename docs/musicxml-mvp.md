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
- tie
- tuplet `time-modification`과 시작·종료 notation
- `implicit="yes"`인 못갖춘마디
- 온마디쉼표
- 음높이 step, octave, alter -2부터 2
- 제목, 작곡가, part 이름과 약어

가져온 MusicXML은 먼저 `src/score-core` 모델로 변환된다. 화면 렌더링과
편집은 MusicXML 문서를 직접 수정하지 않고 score-core만 사용한다.

## 지원하지 않는 기능

- 여러 part 또는 여러 staff
- 여러 voice, `backup`, `forward`
- chord
- grace note
- slur
- beam, articulation, ornament, dynamics
- lyrics
- transposition
- percussion 및 tablature
- layout, print, page/system break
- MIDI 및 sound 정보
- compressed `.mxl`

지원하지 않는 구조는 조용히 삭제하지 않고 가져오기 또는 내보내기 오류로
알린다.

가져오기는 MusicXML note 문서 순서를 그대로 renderer에 전달하지 않는다. 지원
범위 안에서는 각 note의 `<duration>`을 score-core tick으로 누적해 measure 안
`position.tick`을 만든다. 마디별 `attributes` 변경은 해당 measure부터
상태로 반영한다. `backup`과 `forward`처럼 문서 순서와 음악 시간 순서를
분리해서 해석해야 하는 구조는 MVP에서 가져오지 않고 명확한 오류로 안내한다.

## 내보내기

내보내기는 MusicXML 4.0 `score-partwise` 문서를 생성한다. 각 measure에
divisions, 조표, 박자표, staff 수, clef를 기록해 독립적으로 읽을 수 있게 한다.
divisions 값은 score-core의 `TICKS_PER_QUARTER`와 같은 13,440이며,
지원하는 기본 길이, 점음표와 tuplet 비율을 정수 duration으로 표현한다. 가져오기에서는
원본 divisions를 공통 tick으로 변환하고 note의 `type`과 `duration`이 서로
다르면 오류로 보고한다.

가져오기와 내보내기는 각 measure의 리듬 정합성을 검사한다. 일반 measure는
박자표 길이를 정확히 채워야 하며, 못갖춘마디는 `implicit="yes"`와 실제
duration을 통해 score-core의 pickup timing을 보존한다.

생성 후 조표를 변경할 때는 기존 음표의 실제 pitch 의미를 보존한다. 새 조표에서
암묵적으로 표현되지 않는 pitch는 명시 임시표로 기록하며, MusicXML export/import
round-trip 후에도 조표와 pitch 의미가 유지되어야 한다.

## Fixture

`src/musicxml/fixtures/single-part-treble.musicxml`은 단일 피아노 part,
높은음자리표, 4/4, C major, 음표·임시표·쉼표를 포함한다.

외부 사보 도구의 export 파일을 fixture 후보로 검토할 때는
[MusicXML 외부 샘플 후보와 반입 기준](quality/musicxml-external-sample-candidates.md)에
따라 출처, 라이선스, 예상 결과를 먼저 기록한다.

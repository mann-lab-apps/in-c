# 음표 입력 상태와 순차 커서

## 상태 분리

에디터는 다음 상태를 서로 독립적으로 관리한다.

- selection: 속성 확인과 일반 편집의 대상
- `NoteInputState`: 다음 음표 또는 쉼표를 입력할 시간 위치와 설정
- playback: 현재 재생 위치와 활성 이벤트

`NoteInputState`는 voice 주소, measure 내 tick, duration, note/rest mode와
accidental override를 가진다. tuplet 입력 중에는 아직 확정하지 않은 멤버를
로컬 버퍼로 함께 관리한다. 입력 커서는 selection 강조나 재생 playhead와
별도의 SVG 선으로 표시한다.

## 키보드 입력 라우팅

A-G 음높이 단축키는 활성 키보드 언어가 아니라 `KeyboardEvent.code`의
물리 키 위치를 기준으로 해석한다. 따라서 한글 두벌식 상태에서도 같은 키로
음표를 입력할 수 있다. 단, 텍스트 입력 요소와 IME 조합 중인 이벤트는
에디터 단축키가 처리하지 않는다.

- Select 모드: 선택된 음표의 음높이만 가장 가까운 옥타브로 변경한다.
- Note 모드: `NoteInputState` 위치에 새 음표를 입력하고 커서를 전진시킨다.
- Rest 모드: A-G를 처리하지 않는다. Note 도구를 명시적으로 선택해야 한다.

이 구분으로 selection 기반 수정은 입력 커서를 만들거나 이동하지 않으며,
새 음표 생성은 Note 모드에서만 일어난다.

## 순차 입력

입력은 현재 tick에서 시작하는 이벤트 슬롯을 리듬 편집 transaction으로
교체한다. 성공하면 선택한 duration의 tick만큼 커서를 전진시킨다.

- 마디 안에서는 같은 voice의 다음 tick으로 이동한다.
- 마디 끝에서는 다음 마디의 tick 0으로 이동한다.
- 마지막 마디 끝에서는 clef, key signature와 time signature를 상속한 빈
  마디를 생성한다.
- 음표 duration이 마디 경계를 넘으면 마디별 음표로 분할하고 타이로
  연결한다. 쉼표는 현재 마디 경계를 넘지 않는다.
- tuplet은 그룹의 모든 멤버가 입력될 때까지 score를 변경하지 않는다.
  마지막 멤버 입력 시 그룹 전체를 하나의 command로 확정한다.

마지막 마디 입력과 새 마디 생성은 `score.batch` command 하나로 묶인다.
따라서 undo/redo에서 입력 결과와 마디 생성이 함께 복원된다.

## History

에디터 history entry는 score undo command와 함께 편집 전 selection 및
`NoteInputState`를 저장한다. undo와 redo는 score, 선택, 입력 위치와 입력
설정을 같은 단계에서 복원한다.

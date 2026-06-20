# 단성부 리듬 편집 트랜잭션

## 불변식

사용자에게 노출되는 단성부 리듬 편집은 한 마디의 exact-fill 상태를 보존한다.

- 음표 삭제는 같은 위치와 길이의 쉼표로 치환한다.
- 이벤트를 짧게 만들면 해제된 시간 구간을 명시적인 쉼표로 채운다.
- 이벤트를 길게 만들면 바로 뒤에 연속된 쉼표만 소비한다.
- 뒤 음표를 침범하거나 마디 끝을 넘는 변경은 적용하지 않는다.
- 온마디쉼표 일부를 교체하면 남은 구간을 일반 쉼표로 분할한다.

## 원자적 command

`voice-events.replace` command는 대상 voice의 이벤트 배열 전체를 한 번에
교체한다. 적용 전에 변경된 measure를 `validateMeasureRhythm()`으로 검사하며,
exact 상태가 아니면 score를 변경하지 않는다.

undo command에는 변경 전 이벤트 배열 전체가 저장된다. 따라서 하나의 사용자
편집이 내부적으로 이벤트 교체, 쉼표 생성과 쉼표 분할을 함께 수행하더라도
history에는 한 단계로 기록된다. undo command를 적용하면서 반환된 역방향
command는 redo stack에 저장되므로 동일한 transaction을 한 단계로 다시
적용할 수 있다.

기존 `voice-event.insert`, `voice-event.remove`, `voice-event.replace`는
모델 조립과 저수준 작업을 위해 유지한다. 편집 UI는 리듬 불변식을 보장하는
`buildRhythmEditCommand()`와 `buildRhythmDeleteCommand()`를 사용한다.

## 선택 상태

리듬 편집은 선택 이벤트의 ID와 시작 tick을 보존한다. 삭제된 음표도 같은 ID의
쉼표가 되므로 선택이 시간 위치에서 사라지지 않는다. 에디터 history는 undo
command와 편집 전 selection을 함께 저장하고, undo 시 score와 selection을
동시에 복원한다.

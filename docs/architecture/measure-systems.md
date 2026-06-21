# 마디 관리와 시스템 줄바꿈

## 마디 편집

현재 선택 또는 입력 커서가 위치한 마디를 활성 마디로 사용한다.

- 추가는 활성 마디 바로 뒤에 빈 마디를 삽입한다.
- 새 마디는 앞 마디의 clef, key signature와 time signature를 상속한다.
- 삭제 후 다음 마디가 있으면 다음 마디로, 없으면 이전 마디로 이동한다.
- staff에는 항상 최소 한 마디가 남는다.
- 삽입과 삭제 후 `Measure.number`는 1부터 다시 매긴다.

마디 command와 selection/`NoteInputState`는 에디터 history 한 단계로
관리되므로 undo/redo 시 악보와 편집 위치가 함께 복원된다. score 변경 시
playback은 기존 정책에 따라 정지하고 처음 위치로 돌아간다.

## 반응형 시스템 배치

`createSystemLayout()`은 렌더러 폭과 마디 목록으로 시스템 배치를 계산한다.
VexFlow 객체와 독립적인 순수 계산이며 다음 규칙을 사용한다.

- 마디 최소 폭은 180px이다.
- 한 시스템에는 최대 4마디를 둔다.
- 폭이 좁아지면 마디를 압축하는 대신 다음 시스템으로 줄바꿈한다.
- 마지막 시스템도 앞 시스템과 같은 마디 폭을 사용한다.
- 시스템 수에 따라 SVG 높이를 늘린다.

각 시스템 시작에는 clef, key signature와 time signature를 다시 표시한다.
시스템 안에서 이 속성이 변경되는 마디도 해당 표기를 추가한다.

selection overlay와 input/playback cursor는 measure ID와 event ID를 통해
계산된 시스템 placement에 매핑된다. 창 크기가 바뀌면 전체 placement와
cursor 좌표를 다시 계산한다.

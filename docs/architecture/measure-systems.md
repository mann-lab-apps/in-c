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
- 모든 시스템은 마지막 마디 수와 관계없이 사용 가능한 전체 폭을 채운다.
- 시스템마다 마디 폭을 독립적으로 계산하며 다른 시스템의 열 위치에 맞추지
  않는다.
- 같은 시스템 안에서는 최소 폭을 먼저 확보하고, 남은 폭을 리듬 밀도에 따라
  배분한다.
- 시스템 수에 따라 SVG 높이를 늘린다.
- 시스템은 기본 위·아래 여백을 유지한다. 음표 머리와 기둥의 예상 경계가
  이 여백에 가까워지면 clef 기준 staff line 이동 거리만큼 위·아래 여백과
  다음 시스템 간격을 연속적으로 늘린다.
- 여백은 음표별로 누적하지 않는다. 같은 시스템의 가장 높은 음표가 위쪽
  여백을, 가장 낮은 음표가 아래쪽 여백을 결정한다.

각 시스템 시작에는 clef, key signature와 time signature를 다시 표시한다.
시스템 안에서 이 속성이 변경되는 마디도 해당 표기를 추가한다.

selection overlay와 input/playback cursor는 measure ID와 event ID를 통해
계산된 시스템 placement에 매핑된다. 창 크기가 바뀌면 전체 placement와
cursor 좌표를 다시 계산한다.

## 수동 시스템 나누기

문서 layout hint는 `Score.layout.systemBreakBeforeMeasureIds`에 저장한다.
각 ID는 해당 마디 앞에서 새 system을 시작하라는 의미다.

- 첫 마디 앞의 system break는 무시한다.
- 자동 줄바꿈은 계속 적용되며, 수동 break는 자동 capacity보다 먼저 system을
  끊는다.
- 수동 break로 만들어진 system도 기존 폭 배분 규칙을 사용해 마지막 마디가
  사용 가능한 전체 폭을 채운다.
- system break는 음악 시간, 재생, MusicXML 음표 의미를 바꾸지 않는 layout
  hint다.

현재 구현은 수동 system break만 지원한다. page break, page size, margin,
orientation, MusicXML print/layout round-trip은 별도 후속 범위로 둔다.

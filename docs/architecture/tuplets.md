# Tuplet 그룹과 입력

## 모델

각 이벤트의 `Duration.tuplet`은 실제 시간 비율을 저장한다.

```ts
{
  actualNotes: 3,
  normalNotes: 2
}
```

`Voice.tuplets`는 같은 비율을 공유하는 이벤트 ID의 순서와 그룹 범위를
저장한다. 비율과 그룹을 분리해 재생 시간 계산은 duration만으로 수행하고,
괄호·숫자·MusicXML 시작과 종료는 relation을 기준으로 처리한다.

유효한 그룹은 다음 조건을 모두 만족한다.

- 멤버 수가 `actualNotes`와 같다.
- 멤버는 같은 voice와 마디 안에서 시간 순서로 연속한다.
- 모든 멤버의 duration 비율이 그룹 비율과 같다.
- 한 이벤트는 하나의 tuplet 그룹에만 속한다.
- tuplet duration을 가진 이벤트는 반드시 완전한 그룹에 속한다.

## 입력

MVP UI는 3:2 셋잇단음표를 지원한다. 기본 음가가 8분음표라면 세 멤버가
4분음표 한 박자를 차지한다.

입력 중에는 음표·쉼표와 임시표 선택을 `NoteInputState`에 버퍼링한다.
세 번째 멤버가 입력되면 그룹 전체 시간 구간을 확보하고 세 이벤트 및
relation을 `voice-content.replace` command 하나로 확정한다.

- 완료 전 취소는 score를 변경하지 않는다.
- 음표와 쉼표를 섞을 수 있다.
- 점음표 tuplet, 중첩 tuplet과 마디 경계 초과는 현재 거부한다.
- 그룹 멤버 하나의 duration 변경처럼 relation을 깨뜨리는 편집은 거부한다.

## 출력

- VexFlow `Tuplet`이 숫자와 필요 시 괄호를 그린다.
- 3:2 음표 그룹은 자동 빔 계산과 함께 표시한다.
- 재생과 playhead는 duration의 실제 tick 비율을 사용한다.
- MusicXML은 각 멤버의 `time-modification`과 그룹 양끝의
  `notations/tuplet`을 함께 import/export한다.

모델은 `actualNotes`와 `normalNotes`를 일반 정수로 저장하므로 향후
5잇단·7잇단음표 입력 UI로 확장할 수 있다.

# 리듬 시간축과 마디 정합성

## 시간 단위

score-core는 음표와 쉼표의 위치 및 길이를 정수 tick으로 계산한다.

- 4분음표: `13,440` ticks
- 이벤트 시작 위치: `VoiceEvent.position.tick`
- 이벤트 길이: `durationToTicks(duration)`
- augmentation dot: 0개부터 셋점까지 지원하며 각 점은 직전 추가분의
  절반을 더한다.
- tuplet duration: 기본 음가에 `normalNotes / actualNotes` 비율을
  적용한다.
- 일반 마디 길이: `timeSignatureDurationTicks(timeSignature)`

이 해상도는 64분음표, 셋잇단음표와 일반적인 5·7잇단음표, 최대 3개의
augmentation dot을 부동소수점 오차 없이 표현한다. 정수 tick으로 환산되지
않는 duration은 score-core 경계에서 거부한다.

## 마디 불변식

일반 마디의 각 voice는 박자표가 요구하는 길이를 정확히 채워야 한다.

- 첫 이벤트는 tick `0`에서 시작한다.
- 인접 이벤트 사이에 암묵적인 gap이 없다.
- 이벤트 구간이 서로 overlap하지 않는다.
- 마지막 이벤트가 마디 끝을 넘지 않는다.
- 비어 있는 마디는 `fullMeasure: true`인 온마디쉼표로 표현한다.

`validateMeasureRhythm()`은 `exact`, `empty`, `gap`, `overlap`,
`overflow`, `invalid` 상태와 구체적인 문제 구간을 반환한다.

현재의 저수준 score command는 모델 이관을 위해 명시적 위치를 보존하지만,
편집 결과를 자동으로 쉼표 분할·병합하여 exact-fill로 만드는 책임은 후속
리듬 편집 트랜잭션 작업에서 구현한다. MusicXML export는 exact 상태가 아닌
마디를 거부한다.

## 박자표 변경 재정규화

생성 후 박자표 변경은 선택한 마디의 시간 길이를 바꾸는 편집이다. 이 편집은
기존 음표를 자르거나 뒤로 밀지 않는다.

- 기존 음표가 새 마디 길이를 넘으면 변경을 거부한다.
- 새 마디 끝을 넘는 뒤쪽 쉼표는 새 마디 끝까지만 다시 분해한다.
- 새 박자표에서 비는 시간이 생기면 명시적 쉼표로 채운다.
- 비어 있는 마디는 새 박자표에서도 `fullMeasure: true` 온마디쉼표 하나로
  유지한다.
- 적용 후 `validateMeasureRhythm()`과 `validateVoiceTuplets()`를 통과하지
  못하면 변경을 거부한다.

## 못갖춘마디

못갖춘마디는 `Measure.timing`을 다음과 같이 명시한다.

```ts
{
  type: 'pickup',
  durationTicks: TICKS_PER_QUARTER
}
```

validator, MusicXML과 playback은 박자표의 명목 길이 대신 이 값을 실제 마디
길이로 사용한다.

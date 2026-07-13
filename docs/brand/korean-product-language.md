# 한국어 제품 언어 기준

in-C의 1차 사용자는 한국 음악인이다. 앱 문구는 번역투보다 실제 작업 중에
바로 이해되는 표현을 우선한다.

## 기본 원칙

- 버튼과 상태 메시지는 사용자의 다음 행동이 분명하게 보이도록 쓴다.
- 내부 구현어를 화면에 그대로 노출하지 않는다.
- 같은 개념은 앱 전체에서 같은 이름으로 부른다.
- 문장은 짧게 쓰되, 오류 메시지는 막힌 이유와 해결 방향을 함께 알려준다.
- 단축키 표기는 `A-G`, `R`, `T`, `L`, `Esc`처럼 원문 키 이름을 유지한다.

## 용어

- `note`: 음표
- `rest`: 쉼표
- `duration`: 음가
- `whole`, `half`, `quarter`, `eighth`: 온음표, 2분음표, 4분음표, 8분음표
- `augmentation dot`: 점음표 또는 점
- `triplet`: 셋잇단음표
- `tie`: 타이
- `slur`: 슬러
- `measure`: 마디
- `voice`: 성부
- `key signature`: 조표
- `time signature`: 박자표

## 음악 UI 용어

편집기 메뉴, 툴바, 속성 패널, 상태 영역에 노출되는 핵심 음악 용어는
`src/renderer/src/editor/korean-music-terms.ts`의 값을 기준으로 쓴다.
`src/renderer/src/editor/korean-music-terms.test.ts`는 새 용어가 영어 구현어로
되돌아가지 않도록 보호한다.

| 개념 | UI 문구 |
| --- | --- |
| `articulation` 그룹 | 표현 기호 |
| `dynamic` | 셈여림 |
| `tempo` | 빠르기 |
| `rehearsal mark` | 연습표 |
| `staff text` | 보표 글자 |
| `fermata` | 페르마타 |
| `staccato` | 스타카토 |
| `accent` | 악센트 |
| `breath mark` | 숨표 |
| `caesura` | 중지표 |

## 원문 유지

다음 표현은 한글화하면 오히려 어색하거나 표준 파일/기술 이름이므로 원문을
유지한다.

- MusicXML
- PDF
- MIDI
- AI
- BPM
- in-C

## 메시지 톤

좋은 예:

- `음가를 4분음표로 바꿨습니다.`
- `선택한 음표 뒤에 이어진 쉼표 공간이 필요합니다.`
- `셋잇단음표 입력을 완료했습니다.`

피해야 할 예:

- `Duration changed.`
- `Invalid event.`
- `Tuplet failed.`

## 접근성 문구

`aria-label`과 `title`도 사용자에게 보이는 제품 언어로 간주한다. 아이콘
버튼은 한국어 동작 이름을 사용하고, 필요한 경우 괄호 안에 단축키를 붙인다.

예: `타이 추가 (L)`, `마디 삭제`, `한 옥타브 올리기`

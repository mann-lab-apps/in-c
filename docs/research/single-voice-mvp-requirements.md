# 단성부 악보 작성 MVP 요구사항

작성일: 2026-06-20

## 제품 목표

사용자가 빈 악보에서 시작해 단일 선율을 입력하고 수정한 뒤, 악보로 읽을 수
있는 결과를 MusicXML로 저장하고 다시 열며 재생할 수 있어야 한다.

MVP 완료 판단은 기능 개수보다 다음 시나리오의 완결성으로 한다.

> 높은음자리표, 조표, 박자표가 있는 8마디 단선율을 음표와 쉼표로 입력한다.
> 8분음표, 점음표, 임시표, 붙임줄을 사용하고 중간 내용을 수정한다.
> 악보가 올바르게 묶이고 마디가 정확히 채워진다. 저장 후 다시 열어도 같은
> 음악이 보이고 같은 길이와 pitch로 재생된다.

## 범위

포함:

- 단일 part
- 단일 staff
- 단일 voice
- 표준 오선보
- measure 단위 clef, key signature, time signature
- 기본 음표와 쉼표, 점음표, 임시표, tie
- 자동 stem, beam, barline, system wrapping
- MusicXML import/export
- 단순 playback

제외:

- chord
- 여러 voice
- 여러 staff와 여러 part
- tuplet
- grace note
- slur, articulation, dynamics, lyrics
- repeat, volta, coda
- transposing instrument
- percussion과 tablature

## P0: 모델과 리듬 불변식

### R1. 명시적인 시간 위치

각 voice event는 measure 안의 시작 위치와 실제 길이를 가져야 한다.

완료 기준:

- 시작 위치와 길이는 정수 index가 아니라 유리수 또는 고정 tick 단위로
  표현한다.
- 이벤트 정렬, 검색, 선택 이동, 재생은 시간 위치를 기준으로 한다.
- 중간 위치에 이벤트를 넣어도 뒤 이벤트의 시간 위치가 결정적이다.

### R2. measure 정합성

일반 measure는 박자표가 요구하는 길이만큼 정확히 채워져야 한다.

완료 기준:

- 이벤트 구간 사이에 암묵적인 gap이 없다.
- 이벤트 구간이 서로 겹치지 않는다.
- 편집 명령 후 measure 길이를 검증한다.
- 비어 있는 measure는 full-measure rest로 표현된다.
- pickup measure는 명시적인 irregular length로만 허용한다.

### R3. 음표와 쉼표 슬롯 교체

삭제와 입력은 시간을 제거하지 않고 리듬 슬롯을 보존한다.

완료 기준:

- 음표 삭제 시 같은 구간이 쉼표로 바뀐다.
- 쉼표에 음표 입력 시 같은 구간이 음표로 바뀐다.
- 현재 슬롯보다 짧은 길이를 입력하면 남은 구간이 유효한 쉼표로 분할된다.
- 슬롯보다 긴 입력은 허용 범위와 충돌 정책을 사용자에게 예측 가능하게
  적용한다.

### R4. duration 정규화

임의의 시간 구간을 표기 가능한 음표 또는 쉼표 길이 목록으로 변환할 수 있어야
한다.

완료 기준:

- whole부터 32nd까지와 점 하나를 우선 지원한다.
- 박자 구조를 고려해 읽기 쉬운 분할을 선택한다.
- 마디 경계를 넘는 note duration은 여러 음표로 나뉜다.
- 마디 경계를 넘는 rest는 각 마디 안에서 독립적인 쉼표로 나뉜다.

## P0: 입력과 편집

### E1. 선택 상태와 입력 상태 분리

`SelectionState`, `NoteInputState`, `PlaybackState`는 서로 독립적이어야 한다.

`NoteInputState` 최소 필드:

- 활성 여부
- part/staff/voice 주소
- measure와 tick 위치
- 선택 duration
- note/rest mode
- accidental override
- 마지막 입력 pitch 또는 octave 기준

완료 기준:

- 선택을 바꿔도 입력 모드 종료 여부가 명시적이다.
- 재생 커서가 이동해도 선택과 입력 커서가 바뀌지 않는다.
- undo/redo가 입력 위치를 복구한다.

### E2. 순차 음표 입력

음표 입력 후 입력 커서는 입력 duration만큼 다음 위치로 이동한다.

완료 기준:

- A-G로 pitch를 입력한다.
- R로 현재 슬롯을 쉼표로 바꾼다.
- 숫자키 또는 툴바로 duration을 선택한다.
- 입력 후 다음 유효 시간 위치가 강조된다.
- 마디 끝에서는 다음 measure로 이동한다.
- 악보 끝에서 입력하면 새 measure 생성 여부를 일관되게 처리한다.

### E3. pitch와 octave 결정

문자 입력은 음악적으로 가까운 octave를 선택해야 한다.

완료 기준:

- 첫 음표는 clef 기준의 기본 음역을 사용한다.
- 이후 입력은 이전 입력 pitch와 가장 가까운 diatonic pitch를 선택한다.
- 위/아래 diatonic 이동과 chromatic 이동을 구분한다.
- octave 위/아래 이동을 제공한다.

### E4. 임시표 편집

sharp, flat, natural을 입력하고 measure 문맥에서 올바르게 표시해야 한다.

완료 기준:

- accidental을 추가, 변경, 제거할 수 있다.
- 조표에 이미 포함된 accidental은 중복 표시하지 않는다.
- 같은 measure 안의 accidental 효력을 계산한다.
- natural로 이전 accidental을 취소할 수 있다.
- 새 measure에서 accidental 문맥을 초기화한다.

### E5. duration 변경

선택한 note/rest 길이 변경은 주변 리듬을 함께 정규화해야 한다.

완료 기준:

- 짧게 변경하면 남는 시간이 쉼표로 채워진다.
- 길게 변경하면 뒤쪽 슬롯을 소비하거나 거부하는 정책이 일관된다.
- 변경 결과가 measure 불변식을 깨뜨리지 않는다.
- 결과 전체가 하나의 undo transaction이다.

### E6. measure 관리

완료 기준:

- 현재 위치 뒤에 measure를 추가할 수 있다.
- 선택한 measure를 삭제할 수 있다.
- 마지막 measure 삭제 시 최소 한 measure는 남는다.
- 새 measure는 현재 clef, key signature, time signature를 상속한다.
- measure 번호와 선택 위치가 갱신된다.

### E7. undo와 redo

완료 기준:

- 입력, 삭제, duration 변경, accidental 변경, measure 추가/삭제가 각각 한 번의
  undo로 복구된다.
- 리듬 분할로 내부 이벤트가 여러 개 바뀌어도 하나의 history entry다.
- redo를 지원한다.
- 선택과 입력 커서가 함께 복구된다.

## P0: 사보

### N1. 기본 기호

완료 기준:

- clef, key signature, time signature, barline 표시
- whole부터 32nd note/rest 표시
- dot, accidental, ledger line 표시
- 자동 stem direction
- full-measure rest 표시

### N2. 자동 beam

완료 기준:

- eighth 이하 음표를 박자 단위로 자동 묶는다.
- 쉼표가 포함된 경우에도 박자 경계를 유지한다.
- time signature가 바뀌면 grouping 규칙을 다시 계산한다.
- 사용자 입력 순서가 아닌 시간 위치 순서로 beam을 만든다.

### N3. tie

완료 기준:

- 같은 pitch의 두 note를 tie로 연결하고 해제할 수 있다.
- 마디 경계 자동 분할 시 tie를 생성한다.
- tie chain은 렌더링, playback, MusicXML에서 같은 의미를 가진다.
- tie의 한쪽 note 삭제 시 관계가 유효하게 정리된다.

### N4. system layout

완료 기준:

- measure 수가 화면 폭을 넘으면 다음 system으로 줄바꿈한다.
- system마다 clef와 필요한 key/time 정보를 표시한다.
- 창 크기 변경 시 measure 배치를 다시 계산한다.
- 선택, 입력, 재생 커서가 system 이동 후에도 올바른 event를 가리킨다.

## P0: 파일과 재생 일관성

### I1. MusicXML 의미 보존

완료 기준:

- 지원하는 note/rest, duration, dot, accidental, tie, key/time/clef를
  import/export한다.
- 가져온 measure는 리듬 정합성 검사를 통과해야 한다.
- export 후 re-import한 score가 의미적으로 동등하다.
- 지원하지 않는 요소는 오류 또는 명시적인 warning으로 보고한다.

### I2. playback 의미 일치

완료 기준:

- 시간 위치와 duration을 기준으로 재생한다.
- rest는 침묵 구간으로 유지된다.
- tie chain은 음을 다시 attack하지 않고 이어서 재생한다.
- 편집 직후 timeline을 다시 계산한다.
- 재생 커서와 입력 커서는 독립적이다.

## P1: 사용성 보강

- clipboard copy/paste
- 여러 event 범위 선택
- Home/End와 measure 단위 탐색
- dotted duration 토글
- note preview sound
- 새 score 생성 대화상자
- 제목, 작곡가, 조표, 박자표 편집 UI
- zoom과 fit width
- unsaved change 표시

## MVP 승인 시나리오

다음 자동화 및 수동 시나리오가 모두 통과해야 한다.

1. 4/4 C major, 높은음자리표 8마디 score를 만든다.
2. quarter note 4개를 입력하면 입력 커서가 다음 마디로 이동한다.
3. 첫 마디 두 번째 quarter를 eighth 두 개로 교체한다.
4. note 하나를 삭제하면 동일 길이 rest가 남는다.
5. F sharp를 입력하고 다음 F에서 accidental 문맥을 확인한다.
6. dotted quarter와 eighth 조합으로 한 박자 구조를 완성한다.
7. 마지막 beat를 다음 마디까지 늘려 tie가 자동 생성되는지 확인한다.
8. measure 하나를 추가하고 하나를 삭제한다.
9. 주요 편집을 undo/redo하고 score와 입력 커서를 확인한다.
10. 여러 system으로 줄바꿈된 악보를 재생해 playhead를 확인한다.
11. MusicXML로 내보내고 다시 가져온다.
12. 원본과 round-trip score의 pitch, 시작 위치, duration, tie, measure 속성이
    동일한지 비교한다.

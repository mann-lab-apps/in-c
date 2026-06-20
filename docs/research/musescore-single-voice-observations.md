# MuseScore 단성부 사보 관찰

작성일: 2026-06-20

## 조사 목적

MuseScore Studio를 구현 템플릿으로 복제하지 않고, 단일 part, 단일 staff,
단일 voice 악보를 안정적으로 작성하기 위해 필요한 제품 동작과 도메인 경계를
추출한다.

이 문서는 로컬 `../references/musescore` 저장소를 읽기 전용으로 조사한
결과다. MuseScore 소스 코드, 에셋, 테스트 또는 생성 파일은 in-C로 복사하지
않는다.

조사 기준:

- branch: `main`
- commit: `683e08430c9eccedecfb5e1b541a65c52a0aaaf2`
- describe: `v4.0_alpha_2-21118-g683e08430c`

## 핵심 관찰

### 1. 선택과 음표 입력 위치는 서로 다른 상태다

MuseScore는 일반 선택 상태와 별도로 음표 입력 상태를 관리한다. 입력 상태에는
현재 시간 위치, staff와 voice, 선택한 길이, 쉼표 모드, 임시표, 입력 방식 등이
포함된다.

이 구분으로 다음 동작이 가능하다.

- 기존 음표를 선택해 속성을 편집한다.
- 선택 지점에서 음표 입력 모드를 시작한다.
- 음표를 입력하면 입력 커서만 다음 시간 위치로 이동한다.
- 선택 강조, 입력 커서, 재생 커서를 동시에 서로 다른 상태로 표시한다.
- undo/redo 시 악보 데이터뿐 아니라 입력 위치도 복구한다.

in-C는 현재 `EditorSelection`이 선택과 입력 대상을 함께 담당한다. 단성부 MVP를
위해서도 `SelectionState`와 `NoteInputState`를 분리해야 한다.

참고 영역:

- `src/engraving/dom/input.h`
- `src/engraving/dom/input.cpp`
- `src/notation/internal/notationnoteinput.h`
- `src/notation/internal/notationnoteinput.cpp`

### 2. 악보 시간축은 배열 순서가 아니라 명시적인 시간 위치를 기준으로 한다

MuseScore의 measure 안에는 같은 tick에서 수직 정렬되는 요소를 모으는 segment
개념이 있다. 음표와 쉼표는 특정 시간 위치의 chord/rest segment에 놓인다.

단성부만 지원하더라도 이 구조에서 얻어야 하는 요구사항은 분명하다.

- 각 이벤트는 measure 안의 시작 위치를 가져야 한다.
- 이벤트 배열 순서만으로 시작 시간을 추론하지 않는다.
- measure 길이는 박자표로 계산되는 기대 길이와 비교할 수 있어야 한다.
- 동일 시간 위치에 clef, key signature, time signature와 음표가 존재할 수 있다.
- 렌더링 좌표는 시간 위치에서 파생되며 도메인 모델에 저장하지 않는다.

in-C는 현재 voice의 이벤트 길이를 앞에서부터 합산해 시간 위치를 계산한다.
이 방식은 단순 예제에는 충분하지만 중간 삽입, 불완전 마디, 붙임줄 분할,
MusicXML의 명시적 위치를 다룰 때 모호해진다.

참고 영역:

- `src/engraving/dom/segment.h`
- `src/engraving/dom/measure.h`
- `src/engraving/dom/chordrest.h`

### 3. 음표와 쉼표는 동일한 리듬 슬롯을 차지한다

MuseScore는 음표 묶음과 쉼표를 공통적인 chord/rest 계층으로 다룬다. 둘 다
길이와 시간 위치를 가지며, 입력 시 기존 시간 구간을 다시 나누고 남는 구간을
쉼표로 채울 수 있다.

단성부 편집에서 필요한 의미는 다음과 같다.

- 음표를 삭제해도 measure의 시간이 사라지지 않고 같은 길이의 쉼표가 남는다.
- 쉼표 위치에 음표를 입력하면 해당 리듬 슬롯이 음표로 교체된다.
- 더 짧은 길이를 입력하면 남은 시간이 유효한 쉼표 조합으로 분할된다.
- 더 긴 길이를 입력하면 뒤 이벤트와 충돌하는 범위를 명시적으로 처리한다.
- measure를 비워도 full-measure rest라는 유효한 상태가 유지된다.

현재 in-C의 삭제 명령은 이벤트를 배열에서 제거하므로 measure가 부족한
상태가 될 수 있다. 이는 가장 먼저 고쳐야 할 모델 문제다.

참고 영역:

- `src/engraving/dom/chordrest.h`
- `src/engraving/dom/chord.h`
- `src/engraving/dom/rest.h`
- `src/engraving/editing/cmd.cpp`
- `src/engraving/editing/edit.cpp`

### 4. 입력은 replace, insert, add-to-chord를 구분한다

MuseScore는 같은 음표 입력이라도 기존 슬롯 교체, 시간 삽입, 현재 chord에
음 추가를 구분한다. in-C의 단성부 범위에서는 chord 추가는 제외해도 되지만,
replace와 insert의 차이는 필요하다.

- Replace: 현재 리듬 슬롯의 pitch 또는 note/rest 종류를 바꾼다.
- Insert: 현재 위치부터 시간을 밀어 새 이벤트를 삽입한다.
- Overwrite entry: 현재 슬롯을 입력 길이에 맞게 다시 분할한다.

단성부 MVP의 기본 입력은 overwrite 방식이 가장 예측 가능하다. 시간 삽입은
후속 기능으로 분리할 수 있다.

참고 영역:

- `src/engraving/editing/cmd.cpp`
- `src/notation/internal/notationnoteinput.cpp`

### 5. 마디 길이는 항상 검증되고 빈 구간은 쉼표로 정규화된다

MuseScore의 measure는 박자표와 실제 길이를 별도로 가진다. 리듬 편집 과정에는
gap 생성, 길이 변경, 쉼표 채우기, duration 분해가 반복적으로 사용된다.

단성부 MVP에서도 모든 편집 명령 이후 다음 불변식을 검사해야 한다.

```text
각 measure의 voice 1에서
이벤트 시간 구간은 겹치지 않고,
허용된 pickup measure가 아니라면
전체 길이 합이 measure 길이와 같다.
```

이 불변식이 없으면 화면, 재생, MusicXML 내보내기가 서로 다른 악보를
해석하게 된다.

참고 영역:

- `src/engraving/dom/measure.h`
- `src/engraving/dom/measure.cpp`
- `src/engraving/dom/durationtype.cpp`
- `src/engraving/editing/cmd.cpp`

### 6. 긴 길이는 표기 가능한 단위로 분해되고 필요하면 붙임줄로 연결된다

음악적 시간 길이와 화면에 표시할 음표 모양은 항상 일대일이 아니다. 박자
경계나 마디 경계를 넘어가는 길이는 여러 음표로 나뉘며 같은 pitch는
붙임줄로 연결된다.

단성부 MVP에는 최소한 다음이 필요하다.

- 마디를 넘는 음표 입력 시 자동 분할
- 동일 pitch의 연속 조각을 tie chain으로 연결
- 붙임줄 시작/끝을 독립 boolean보다 관계로 검증
- 재생 시 tie chain을 하나의 지속음으로 해석
- MusicXML에서 tie와 tied 의미를 함께 보존

현재 score-core의 `ties.start/stop`은 존재하지만 편집, 렌더링, 재생,
MusicXML 어느 흐름에도 완전히 연결되어 있지 않다.

참고 영역:

- `src/engraving/dom/durationtype.cpp`
- `src/engraving/editing/edit.cpp`
- `src/engraving/dom/tie.h`

### 7. pitch 입력은 현재 음역과 조표 문맥을 사용한다

문자 이름만 입력할 때 MuseScore는 이전 음표와 clef를 참고해 가까운 octave를
선택한다. 표기 pitch와 실제 sounding pitch, 조표에 따른 accidental 상태도
구분한다.

단성부 MVP에서는 다음 정도로 축소할 수 있다.

- A-G 입력 시 이전 음표와 가장 가까운 octave를 선택한다.
- 위/아래 이동은 diatonic과 chromatic을 구분한다.
- sharp, flat, natural을 명시적으로 설정하고 제거할 수 있다.
- 조표 안의 음은 불필요한 accidental을 표시하지 않는다.
- measure 안에서 accidental 효력과 natural 복원을 계산한다.

현재 in-C는 A-G 입력 시 기존 음표면 octave를 유지하고, 쉼표면 octave 4를
사용한다. 조표 문맥과 accidental 효력은 계산하지 않는다.

참고 영역:

- `src/engraving/editing/cmd.cpp`
- `src/engraving/dom/measure.cpp`
- `src/engraving/rendering/score/accidentalslayout.cpp`

### 8. 의미 모델과 사보 결과는 분리되어 있다

MuseScore의 beam, stem, accidental, rest, measure, system 배치는 도메인
요소에서 파생되는 layout 결과다. 모델은 사용자의 의미적 선택과 필요한
override를 보존하고, 실제 좌표와 자동 배치는 rendering 계층이 계산한다.

in-C도 같은 경계를 유지해야 한다.

- score-core에는 VexFlow 객체나 SVG 좌표를 저장하지 않는다.
- 자동 beam grouping은 박자표와 duration에서 계산한다.
- stem direction은 기본값 auto이며 사용자 override만 모델에 저장한다.
- system/page break는 악보 의미와 별도의 layout hint로 다룬다.
- renderer가 바뀌어도 MusicXML과 playback 의미가 바뀌지 않아야 한다.

참고 영역:

- `src/engraving/rendering/score/measurelayout.*`
- `src/engraving/rendering/score/chordlayout.*`
- `src/engraving/rendering/score/beamlayout.*`
- `src/engraving/rendering/score/accidentalslayout.*`
- `src/engraving/rendering/score/scorelayout.*`

### 9. undo는 사용자 동작 단위의 transaction이다

음표 하나 입력은 내부적으로 리듬 슬롯 분할, 쉼표 생성, tie 변경, 입력 커서
이동을 포함할 수 있다. MuseScore는 이를 하나의 사용자 동작으로 묶고 입력
상태까지 복구한다.

in-C의 command가 발전할 때도 다음 원칙이 필요하다.

- UI에서 직접 여러 command를 순서대로 실행하지 않는다.
- 도메인 service가 하나의 편집 transaction 결과를 만든다.
- undo는 생성·삭제·분할된 모든 이벤트와 입력 커서를 복구한다.
- redo를 지원할 수 있는 대칭적인 history entry를 만든다.

참고 영역:

- `src/engraving/editing/transaction/undostack.*`
- `src/notation/internal/notationundostack.*`
- `src/notation/internal/notationnoteinput.cpp`

### 10. 파일 가져오기는 문서 순서와 음악 시간 순서를 구분한다

MuseScore의 MusicXML importer는 구조 분석과 실제 도메인 생성을 분리한다.
MusicXML 문서 순서가 음악 시간 순서와 항상 같지 않기 때문이다.

단성부 MVP는 훨씬 단순하지만 다음 원칙은 유지해야 한다.

- 파싱 결과를 바로 renderer 객체로 만들지 않는다.
- MusicXML duration과 position을 score-core 시간축으로 정규화한다.
- 지원하지 않는 요소를 조용히 삭제하지 않는다.
- 가져온 measure도 동일한 리듬 불변식 검사를 거친다.
- export 후 re-import 의미 동등성을 fixture로 검증한다.

참고 영역:

- `src/importexport/musicxml/internal/import/importmusicxmlpass1.*`
- `src/importexport/musicxml/internal/import/importmusicxmlpass2.*`
- `src/importexport/musicxml/internal/musicxmlwriter.*`

## in-C에서 의도적으로 단순화할 부분

- 첫 목표는 단일 part, 단일 staff, 단일 voice다.
- chord, 다성부, cross-staff notation은 범위 밖이다.
- note entry method는 우선 note-name overwrite 방식 하나만 제공한다.
- C major와 4/4로 제한하지는 않지만, 조표와 박자표 변경은 measure 경계부터
  지원한다.
- 자동 사보는 VexFlow에 맡기되, score-core에서 리듬과 표기 의미를 먼저
  정확히 만든다.
- MuseScore의 클래스 구조나 command 구현을 그대로 재현하지 않는다.

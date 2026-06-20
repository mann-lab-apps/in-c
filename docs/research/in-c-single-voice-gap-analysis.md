# in-C 단성부 MVP 차이 분석

작성일: 2026-06-20

## 요약

현재 프로토타입은 기술 경로를 검증하는 데 성공했다.

- Electron 앱 실행
- score-core 기본 타입
- VexFlow SVG 렌더링
- event 선택과 간단한 교체 편집
- MusicXML 제한적 round-trip
- Web Audio 재생과 playhead

하지만 아직 “악보 편집기”의 핵심인 리듬 시간축과 measure 정합성이 없다.
기능을 개별적으로 더 붙이기 전에 score-core의 시간 모델과 편집 transaction을
강화해야 한다.

## 현재 상태

| 영역 | 현재 상태 | 핵심 문제 |
| --- | --- | --- |
| 시간 위치 | 이벤트 배열 순서와 길이 합으로 추론 | 중간 삽입과 명시적 tick을 표현할 수 없음 |
| measure 길이 | 검증하지 않음 | 부족하거나 넘치는 measure 생성 가능 |
| 삭제 | 이벤트를 배열에서 제거 | 삭제 후 시간이 사라지고 rest로 보존되지 않음 |
| 입력 위치 | selection을 입력 대상으로 사용 | 선택, 입력 커서, 재생 커서가 분리되지 않음 |
| 연속 입력 | 선택 요소 교체 중심 | 입력 후 다음 시간 위치로 진행하지 않음 |
| duration 변경 | event duration만 교체 | 주변 rest 분할과 충돌 처리가 없음 |
| pitch 입력 | 기존 octave 유지 또는 octave 4 | 근접 octave와 clef 문맥이 없음 |
| accidental | pitch alter를 직접 표시 | 조표와 measure accidental 문맥이 없음 |
| tie | 타입 필드만 존재 | 편집, 렌더링, 재생, MusicXML 연결 없음 |
| beam | VexFlow 기본 voice 배치만 사용 | 박자 기반 grouping 없음 |
| system layout | 모든 measure를 한 system에 배치 | 긴 악보가 폭 안에 압축됨 |
| measure 관리 | UI와 command 없음 | 빈 악보 확장 흐름이 없음 |
| undo | 역 command stack | 복합 편집, redo, 커서 복구가 없음 |
| MusicXML | 제한된 단일 voice subset | tie와 시간 위치 정규화 부족 |
| playback | 길이 합으로 timeline 생성 | tie와 불완전 measure 의미가 불안정 |

## 권장 구현 순서

### 1단계: 리듬 기반 score-core 재설계

가장 먼저 해결해야 한다.

산출물:

- `Rational` 또는 tick 기반 `TimePosition`
- event의 `start`와 `duration`
- measure capacity 계산
- overlap, gap, overflow validator
- duration decomposition
- full-measure rest와 pickup 표현

완료 후 기존 renderer, playback, MusicXML은 새 시간 모델을 사용하도록
마이그레이션한다.

### 2단계: 리듬 편집 transaction

산출물:

- replace slot with note/rest
- delete to rest
- split slot
- change duration with rest refill
- insert at time position
- compound history entry와 redo

UI는 여러 저수준 command를 조합하지 않고 이 service를 호출한다.

### 3단계: NoteInputState와 입력 커서

산출물:

- 선택과 독립적인 입력 위치
- 입력 시작/종료
- duration과 note/rest mode
- 입력 후 커서 전진
- 마디 끝 이동과 악보 끝 measure 추가
- undo/redo 시 입력 상태 복구

### 4단계: pitch와 accidental 문맥

산출물:

- 근접 octave 선택
- diatonic/chromatic/octave 이동
- key signature 적용
- measure accidental state
- sharp, flat, natural UI

### 5단계: tie, beam, system layout

산출물:

- tie 관계 모델과 마디 경계 자동 분할
- beat-aware beam grouping
- 여러 system으로 measure wrapping
- system 이동에도 유지되는 selection/input/playback cursor

### 6단계: 파일·재생 회귀 강화

산출물:

- tie MusicXML round-trip
- 명시적 시간 위치 MusicXML 변환
- tie-aware playback
- 편집 시나리오 fixture
- renderer/playback/export 의미 동등성 테스트

## 후속 GitHub 이슈 후보

### A. score-core 리듬 시간축과 measure validator 구현

우선순위: Blocker

- event start position 추가
- measure expected duration 계산
- gap/overlap/overflow 검증
- full-measure rest와 pickup 지원

### B. 단성부 리듬 편집 transaction 구현

우선순위: Blocker

- note/rest 슬롯 교체
- 삭제 시 rest 보존
- duration 변경 시 rest 분할 및 재채움
- 복합 undo/redo

### C. NoteInputState와 순차 입력 커서 구현

우선순위: High

- selection과 input cursor 분리
- 입력 후 자동 전진
- measure 경계 이동
- 악보 끝 measure 추가

### D. pitch·octave·accidental 입력 개선

우선순위: High

- 근접 octave 추론
- pitch 이동 명령
- accidental controls
- key/measure accidental 문맥

### E. 단성부 tie와 마디 경계 duration 분할 구현

우선순위: High

- tie 관계 모델
- 자동 note 분할
- VexFlow tie 렌더링
- MusicXML 및 playback 연결

### F. 박자 기반 beam grouping 구현

우선순위: High

- time signature별 grouping
- eighth 이하 자동 beam
- rest와 경계 처리

### G. measure 추가·삭제와 system wrapping 구현

우선순위: High

- measure commands
- 속성 상속
- responsive system layout
- cursor 위치 유지

### H. 단성부 end-to-end fixture와 회귀 테스트 추가

우선순위: High

- 8마디 승인 시나리오 fixture
- 편집 undo/redo
- MusicXML round-trip
- playback timeline
- renderer event mapping

## 의도적으로 보류할 항목

다음 항목은 위 기반이 안정된 뒤 별도 로드맵으로 다룬다.

- chord
- 다성부
- 여러 staff와 part
- tuplet
- grace note
- lyrics, articulation, dynamics
- 고급 page layout

이 항목들을 먼저 추가하면 현재 리듬 모델의 모호함이 더 넓게 퍼질 가능성이
높다.

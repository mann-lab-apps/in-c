# S-UTIL 클릭·차임과 스코어 연습 도구

현행: [Click main](../../../../../apps/in_c_click/lib/main.dart), [Chime main](../../../../../apps/in_c_chime/lib/main.dart), [Chime controller](../../../../../apps/in_c_chime/lib/chime_controller.dart). Flutter/iOS·Android scaffold. 공통 import 없음. sketch painter·원시색이 남아 있다. 루트 문서의 흡수 방향과 앱 README의 store target 설명이 달라 출시 전략은 D01 결정 필요. **컴포넌트 표시 계약은 이 결정과 독립적으로 작성한다.**

## 목표 표시 API (앱 내부)

```ts
// 플랫폼 중립 schema. Dart는 double/int/bool/enum과 ValueChanged 대응.
type MetronomeView = {bpm:number; minBpm:number; maxBpm:number;
  beats:number; currentBeat:number; running:boolean; pending:boolean;
  error?:string; accentIds:readonly number[]};
type ToneView = {pitchId:string; octave:number; referenceHz:number;
  volume:number; mode:'chime'|'drone'; running:boolean; pending:boolean; error?:string};
// onBpm(number), onMeter(id), onAccent(beatId), onStartStop(), onTapTempo()
// onPitch(id), onOctave(number), onReferenceHz(number), onVolume(number), onPlay(), onStop()
```

범위는 기존 controller 상수에서 공급하며 새 표준 BPM/Hz 범위를 이 문서가 발명하지 않는다. 표시 숫자는 유한값, currentBeat는1-based이며 멈춤은 running=false. tap tempo 추정·주파수 계산·오디오 자원·preferences는 엔진 책임.

| ID / 실제 연결 | 목표 anatomy·규칙 | 동작/예외 | 검증 |
| --- | --- | --- | --- |
| S-CLICK-01 TempoBoard · _BpmBoard/_TempoControls | display 숫자 + BPM label → −/입력/+ → tempo 표시. Number의 범위·단위, touch48 | draft 확정만 onBpm; step/범위는 엔진. Tap 버튼은 시간 이벤트를 controller로 전달 | 경계·잘못된 값·연타 중 처리·IME/키보드 |
| S-CLICK-02 MeterAccent | 박자 선택 → BeatIndicator → 강세 설정 버튼 | 시각 현재 박과 강세 편집 상태 분리. 진행 박은 timer 아닌 엔진 snapshot | running 중 박자 변경 정책 보존. 색 외 번호·강세 기호 |
| S-CLICK-03 Transport | 시작/정지 + 준비/오류 + 설정 | pending은 요청 중 실제 상태, running은 엔진 결과. 실패 시 정지/재시도 안내 | 빠른 연타에 엔진 다중 시작 없음. background 복귀 sync |
| S-CHIME-01 PitchBoard · _ToneBoard/_PitchGrid | note/octave numeric + pitch single-selection grid | 선택은 onPitch, 듣기 명령은 onPlay; 현재 앱 즉시 발음 정책이 있으면 adapter에서 명시 | 선택과 실제 sounding을 동일 상태로 낙관 갱신하지 않음 |
| S-CHIME-02 TuningControls | 기준Hz·옥타브·음량·tone color + 도움말 | Number/Slider/Segments 합성, 값 범위 기존 controller. volume drag는 host 정책 | invalid·음량0·음색변경·지속음 중 조절 |
| S-CHIME-03 DroneTransport | 단발/지속 mode → 발음/정지 → 상태 | 지속음 해제와 라우트 종료·오디오 interrupt를 engine에 연결 | 종료 뒤 tone 누수 없음, 재진입 시 상태 정합 |

차임은 **마이크 튜너가 아니다**. Chime 도입에 마이크 권한 UI나 입력 파워를 추가하지 않는다. 스코어의 실제 tuner는 [S-SCORE-06](score.md)에서 다룬다. 소리를 잘 들리게 하는 브랜드 효과음 추가는 범위 밖이다.

## 형태·합성·입력

소형 음악 도구는 neutral background + 큰 숫자·명확한 시작/정지. 기존 sketch 이중선·빗금은 기본 버튼 경계로 재도입하지 않는다. 필요한 장식은 상태/수치와 겹치지 않는 영역에 한정(제안). 넓은 화면은 숫자와 설정을 두 그룹, 좁은 화면은 세로. 200%에서 숫자 고정 높이/overflow를 검사한다.

UI 프레임 드롭이 엔진 BPM에 영향을 주면 실패다. sound output은 엔진, UI feedback animation은 feedback/panel 토큰. 음량 slider의 접근성 단위와 현재 note label을 제공하고 매 박 screen reader를 호출하지 않는다. touch와 키보드 target 정책은 C09/C10/C12/C38/C39.

## 이행과 수용

첫 이행은 read-only 숫자/상태→선택·Number→transport 순, controller·preferences·audio 파일은 변경하지 않는다. 기능 중복 정리는 별도 제품 결정으로 남긴다. Given tempo 변경, Then 기존 엔진 setter만 호출하고 음원 타이밍/저장값 보존. Given 재생 실패, Then running 표시가 성공으로 남지 않음. Given 종료/interrupt, Then 기존 정지 정책과 자원 해제 확인. 실제 소리·백그라운드·무음/오디오 세션은 실기기 별도.

앱별 `flutter analyze`와 관련 tests를 실행하고, 실제 UI 변경된 source.path에 대응하는 iOS manifest·scenes·manual·release_notes를 AGENTS.md대로 갱신한다. 이번 문서 작업은 이를 변경하지 않는다.

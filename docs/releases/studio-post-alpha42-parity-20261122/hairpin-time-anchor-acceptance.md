# 헤어핀의 독립적인 종료 박 수용 기준

## 승인한 제공 범위

MusicXML에서 가져온 같은 보표의 시간 끝점을 보존한다. 끝점에 마디 ID·성부 ID·마디 시작 기준 tick이 남으며 선의 선택·수동 배치·삭제·실행 취소를 지원한다. 시간 끝점이 있으면 Native v3로 저장하고 없으면 v2로 저장한다. 끝점 마디 삭제 또는 마디 길이 축소로 끝점이 무효가 될 때 변경을 거부하고 위치를 안내한다. 두 폭의 결과와 화음·재생 대조는 인계에 있다. [검증 인계](handoff.md#가져온-헤어핀의-독립-종료-박)

## 도입 전 동작

두 폭의 Studio에서 1.5박 종료를 가진 유효한 MusicXML이 가져오기 오류로 끝났다. 원래 열려 있던 악보·편집 상태와 Native 재저장 내용은 유지됐다. MuseScore 4.7.5에서 같은 입력을 압축 MusicXML로 변환할 때는 정상 종료했고 종료가 3박으로 이동했다. 그 사본을 Studio에서 열면 F4 시작에 연결됐다. 근거는 `out/parity-qa/hairpin-standard-offset-actual-20261124/results.json`과 `out/parity-qa/leading-rest-direct-midi-qjvyddwp/results.json`에 있다.

현재 Native의 헤어핀에는 시작·끝 이벤트 ID가 필요하다. 종료 역할은 그 이벤트의 시작 또는 길이 끝을 구분한다. 단일 성부 대조에서 E4가 끝나는 박과 F4가 시작하는 박이 같으면, 같은 `offset`과 성부만으로 두 역할을 식별할 수 없다. `wedge` 번호는 겹치는 선을 구별하고 ID는 문서 안에서 표식을 식별한다. 독립적인 1.5박은 `direction`의 위치로 표현할 수 있다. [MusicXML wedge](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wedge/) · [MusicXML direction](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction/) · [MusicXML offset](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/offset/)

## 최초 제공 범위 제안

시간 위치가 명확한 MusicXML에서만 새 끝점 형태를 만든다. 기존 시작 이벤트와 같은 보표의 마디·성부를 찾고, 마디 ID와 성부 ID 및 마디 시작 기준의 정수 tick을 보존한다. 화면에서는 위치와 성부를 속성에 표시한다. 선택, 선의 수동 배치, 선 삭제 및 실행 취소가 첫 제공 후보이며 시간 끝점의 직접 생성·끌기·음으로 다시 연결하기는 후속 범위다. Native v2의 기존 이벤트 끝점과 종료 역할에 새 해석을 적용하지 않는다.

살아 있는 마디의 번호가 바뀌면 끝점은 안정적인 마디 ID를 따라간다. 첫 정책 후보는 끝점이 있는 마디를 지우거나 끝점을 마디 밖으로 밀어내는 박자 변경을 적용 전에 거부하고 해당 마디와 위치를 알리는 것이다. 다른 후보는 영향받는 선을 미리 알리고 한 번의 실행 취소로 마디와 선을 함께 복원하는 구조 제거다. 현재 이벤트 끝점을 삭제하는 동작은 연결된 선을 함께 지우고, 쉼표의 길이 끝을 잃는 박자 변경은 거부한다. 이 두 경로의 실제 증거를 시간 끝점 정책의 대조군으로 사용한다. [편집·마디 구조 검증](handoff.md#박자음가와-마디-구조-변경의-헤어핀-끝점)

저장 형식 결정에는 두 경우가 있다. 기존 버전에 선택적 끝점 형태를 추가하면 구형 리더가 새 필드가 있는 파일을 스키마 검사에서 거부한다. 별도 형식 버전은 구형 리더가 버전 검사에서 먼저 거부하며 읽기·저장 호환 범위를 정해야 한다. 설치된 구형 앱용 파일에서 끝점 정보를 자동으로 삭제하는 경로는 이번 후보 범위에서 제외한다. 근거는 태그 리더의 기존 v2 대조 및 임의 v2 필드와 v3를 거부한 기록이다. 해당 실행은 기존 종료 역할 필드로 확인한 것이며 새 시간 주소 스키마는 구현 전이다. [태그 리더 검증](handoff.md#헤어핀-종료-위치-재현과-속성-패널앞꾸밈음-전환)

## Native 저장 후보의 비교 결과

alpha.42 태그 디코더에서 기존 v2 파일을 정상적으로 열었다. 이벤트 끝을 예시 시간 주소 `{measureId, voiceId, tick: 20160}`로 바꾼 v2는 `endTime` 미지원과 `endEventId` 누락을 보고했다. 같은 시간 주소의 v3는 지원하지 않는 버전 3을 보고했다. 세 입력의 해시는 유지됐다. 최신 시간 끝점 도입 전 빌드의 960×750 dark와 1400×750 light에서도 두 후보의 실패 안내, 기존 악보·이력·재저장 파일 보존과 일반 v2 재열기를 확인했다.

권장 저장안은 시간 끝점이 있는 악보만 v3으로 기록하고 나머지는 v2로 저장하는 방식이다. v2에 선택적 필드를 넣는 대안 역시 해당 필드가 있는 파일에는 업데이트된 앱이 필요하다. 이 비교 당시 저장 형식과 무효 주소 처리의 응답을 기다렸다. 후보 입력은 두 정책의 결과를 관측하기 위한 파일이다. [실제 검증 인계](handoff.md#시간-끝점-저장-후보와-다중-보표-박자-보호)

## 실행할 대조군

| 입력 | 4분음표 기준 마디 시작부터의 위치 | 도입 전 결과 | 시간 끝점 모델의 수용 기준 |
| --- | --- | --- | --- |
| `unmatched-1.musicxml`과 `unmatched-8.musicxml` | 20,160 tick, 1.5박 | 원본 42마디·보표 2·성부 7을 안내하고 악보 유지 | 같은 tick·보표·성부를 Native와 XML 재열기에서 복원하고 실제 선과 속성이 그 위치를 가리킨다. |
| `onset-1.musicxml`과 `onset-8.musicxml` | 26,880 tick, 2박 | 기존 이벤트 시작 | 이벤트 참조를 보존한다. |
| `release-1.musicxml`과 `release-8.musicxml` | 53,760 tick, 4박 | 기존 이벤트 길이 끝 | 이벤트 참조와 종료 역할을 보존한다. |
| `stop-before-e-offset.musicxml`과 `stop-after-e.musicxml` | 동일한 3박 | 둘 다 F4 시작 | 표준 위치만 있는 입력은 기존 음 시작 우선을 유지한다. 역할이 명시된 예제는 길이 끝과 음 시작을 구분한다. |
| `release.musicxml`과 `onset.musicxml`의 사용자 지정 9/16 | 새 마디 끝 30,240 tick | 길이 끝은 거부, 시작 끝점은 13,440 tick으로 유지 | 시간 주소가 마디 안에 남는 편집과 마디 밖으로 나가는 편집을 분리하는 대조로 사용한다. |

첫 세 행의 입력은 `out/parity-qa/hairpin-end-location-input-20261124/`에 있다. `out/parity-qa/review-hairpin-structural-edit-20261124.py`가 고정 XSD와 두 divisions의 tick 일치를 검증한다. 두 divisions의 현재 왕복을 확인하려면 `node_modules/.bin/vitest run src/musicxml/hairpin-file-order.test.ts -t 'preserves an independent hairpin ending'`을 실행한다. 네 번째 행의 원본은 `out/parity-qa/hairpin-standard-offset-20261124/`에 있고 마지막 행은 `out/parity-qa/hairpin-meter-split-after-20261124/960/`에 있다.

`out/parity-qa/hairpin-offset-order-input-20261124/`의 여섯 대조는 같은 위치의 커서 표현과 표현 불가능한 정밀도를 비교한다. `positive-1/8`은 아래 보표 성부 7의 첫 음 뒤에 양수 오프셋을 주고, `negative-1/8`은 두 번째 음 뒤에 음수 오프셋을 준다. 현행 앱에서 모두 42마디·보표 2·성부 7·20,160 tick으로 보고했다. `fractional-tick-1/8`은 정확히 20,160.1344 tick으로 환산되며 두 화면 폭에서 위치 표현 오류로 거부됐다. 시간 끝점 구현 뒤에는 양수·음수 대조가 같은 주소로 왕복하고 소수 tick 입력은 기존 거부를 유지해야 한다. [두 화면 폭의 실행 결과](handoff.md#musicxml-커서-오프셋의-15박-대조)

모델 승인 후에는 1.5박을 가로지르는 지속음과 그 앞뒤에서 타건하는 음을 같은 악보에 둔다. 내부 세기 곡선은 20,160 tick에서 끝나고, MIDI의 음높이·시작·지속이 유지되며 이후 음에 이전 곡선의 세기가 적용되지 않아야 한다. 재생 확인은 오프라인 WAV의 실제 세기 변화와 MIDI 타건 세기를 각각 기록한다. Native·MusicXML 재열기와 줄·페이지 이동에서 같은 마디·tick·조각 초점을 확인한다. 선 삭제를 한 번의 실행 취소로 되돌리고, 무효 주소의 안내에서 해당 마디와 박을 확인한다.

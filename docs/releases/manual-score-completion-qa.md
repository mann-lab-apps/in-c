# Manual Score Completion QA

작성일: 2026-07-13

## 목적

릴리즈 전 기능별 체크를 따로 누르는 대신, 사용자가 작은 악보 하나를 완성하는 흐름 안에서
주요 회귀를 확인한다.

## 준비

- 패키징된 앱 또는 릴리즈 후보 빌드
- 저장할 임시 폴더
- QA 기록용 이슈 또는 체크리스트
- 자동 bounds 검증과 같은 `src/musicxml/fixtures/release-qa.musicxml`

악보 파일별 공개 여부와 검증 역할은
[악보 예제·QA 자산 구분 기준](../testing/score-asset-inventory.md)을 따른다.

## 시나리오

| 단계 | 행동 | 기대 결과 | 실패 시 기록 |
| --- | --- | --- | --- |
| 1 | 새 악보를 만든다 | 기본 제목, 4/4, C major, full-measure rest가 보인다 | 시작 상태 스크린샷 |
| 2 | 제목, 작곡자, 빠르기를 설정한다 | 메타데이터가 미리보기와 저장 결과에 반영된다 | 입력값, 저장 여부 |
| 3 | 4-8마디 짧은 선율을 입력한다 | 음표와 쉼표가 마디 안에 정확히 배치된다 | 마디 번호, 이벤트 종류 |
| 4 | 음가 변경, 삭제, range 선택, 복사/붙여넣기를 사용한다 | 마디 길이가 유지되고 선택이 깨지지 않는다 | 선택 상태, 오류 메시지 |
| 5 | 붙임줄, 셋잇단음표, 페르마타, 숨표/중지표, 셈여림, 스타카토/악센트를 하나 이상 추가한다 | 표현 기호가 잘리지 않고 MusicXML에 보존된다 | 표현 종류, 위치 |
| 6 | 재생을 시작/정지/재시작한다 | 빠르기와 이벤트 진행이 크게 어긋나지 않는다 | 재생 위치와 증상 |
| 7 | 창을 일반 폭과 좁은 폭으로 바꾼다 | 마디 끝, 선택 표시, 첫 단 상단 요소가 잘리지 않는다 | 창 크기, 잘린 요소 |
| 8 | MusicXML로 저장하고 다시 가져온다 | 제목, 빠르기, 박자, 조표, 음표/쉼표, 주요 표현이 유지된다 | diff 또는 누락 항목 |
| 9 | [PDF로 변환](../product/pdf-conversion-guide.md)하고 파일을 연다 | PDF가 생성되고 열 수 있다 | 파일 경로, 변환 오류 |
| 10 | 앱을 다시 열어 복구/최근 파일 흐름을 확인한다 | 자동저장과 명시 저장이 혼동되지 않는다 | 표시 문구 |

## Fixture 기반 시각 확인

수동 입력 시나리오와 별개로 `src/musicxml/fixtures/release-qa.musicxml`을 열어 다음
위치를 확인한다.

- 첫 system 상단의 rehearsal mark와 fermata가 잘리지 않는다.
- 좁은 폭에서 마지막 마디선과 선택 표시가 오른쪽에서 잘리지 않는다.
- 셈여림표와 hairpin이 오선과 겹치지 않는다.
- MusicXML로 다시 저장하고 가져왔을 때 주요 표현이 유지된다.

## 파트보 PDF 수동 확인

자동 smoke는 string quartet Cello part view의 direct-path PDF target/write/structure와
App 테스트의 Viola part print target을 확인한다. Import-origin App regression은 첫 part의
staff-level chord symbol/dynamics/text가 다른 part view와 PDF renderer로 새지 않고 rehearsal
mark 같은 global annotation은 유지되는지 확인한다. Public release candidate 전에는 실제 file
dialog를 통해 아래 항목을 별도로 확인하고 근거를 남긴다.

2026-09-03 Codex availability audit: packaged smoke가 남긴 Cello part PDF를 Poppler로
렌더링해 A4 1페이지, score title, selected `Cello` part title, Cello-only staff가 보이는지
보조 확인했다. 이는 direct-path smoke artifact 검토이므로 file dialog 기반 사람 visual QA를
대체하지 않으며 아래 항목은 계속 `미실행`이다.

| 항목 | 기대 결과 | 결과 | 근거 |
| --- | --- | --- | --- |
| 2-4 part ensemble에서 Viola 또는 Cello 파트보 선택 | 화면 상태와 제목이 선택 part를 가리킨다. | 미실행 |  |
| PDF 설정 프리셋 `컴팩트 파트보` 적용 | A4 portrait, 좁은 여백, 축소된 staff size가 파트보에 적용된다. | 미실행 |  |
| file dialog로 파트보 PDF 저장 | 저장 dialog가 열리고 선택한 경로에 PDF가 생성된다. | 미실행 |  |
| 저장된 PDF 열기 | PDF 제목 영역에 score title과 selected part title이 보이고, 다른 part 보표/event가 보이지 않는다. | 미실행 |  |
| 총보로 되돌린 뒤 PDF 저장 | 총보 PDF에는 전체 part가 다시 보인다. | 미실행 |  |

## PDF Page Setup 수동 확인

App 테스트는 PDF export-time renderer가 score page DOM의 normalized page size, orientation,
margin, staff size, system spacing metadata를 받는지 확인한다. Public release candidate 전에는
실제 PDF viewer에서 아래 항목을 별도로 확인하고 근거를 남긴다.

2026-09-03 Codex availability audit: latest available packaged smoke PDF
`/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/in-c-packaged-smoke-23044.pdf`
was inspected with `pdfinfo`; it is one A4 page with no rotation and rendered to
PNG successfully. This is automated/direct-path support evidence only, not a
human file-dialog visual QA pass.

| 항목 | 기대 결과 | 결과 | 근거 |
| --- | --- | --- | --- |
| Letter landscape, 12mm margin, 90% staff size, 120% system spacing으로 총보 PDF 저장 | viewer의 page size/orientation과 시각 여백이 설정과 일치한다. | 미실행 |  |
| `출판 A4` preset으로 총보 PDF 저장 | A4 portrait, 12mm margin, 95% staff size, 125% system spacing이 눈에 띄는 왜곡 없이 적용된다. | 미실행 |  |
| `컴팩트 파트보` preset으로 선택 part PDF 저장 | A4 portrait, 6mm margin, 90% staff size, 90% system spacing이 파트보에 적용되고 제목/보표가 잘리지 않는다. | 미실행 |  |
| 목표 장수 1-2장 강제 설정 | 페이지 수가 기대 범위에 들어오며 readable floor 아래로 깨지지 않는다. | 미실행 |  |

## Playback/Mixer 수동 확인

자동 테스트는 timeline address, scheduler mute/solo/volume gain, stop/jump 후 selection
정책을 확인한다. 실제 오디오 출력과 사람이 듣는 part balance는 public release candidate 전
패키징된 앱에서 별도로 확인하고 근거를 남긴다.

2026-09-03 Codex availability audit: GarageBand 10.4.12 is installed under
`/Applications`, so it can be used for later MIDI open/listening checks, but no
human-operated GarageBand MIDI import or playback/mixer listening QA was
performed in this run. Keep the rows below as `미실행` until a person verifies
the audio result.

| 악보 | 행동 | 기대 결과 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| Solo score | 재생, 정지, 처음으로, 재시작을 반복한다 | tempo와 cursor 진행이 악보 이벤트와 크게 어긋나지 않고 selection이 예측 가능하게 유지된다. | 미실행 |  |
| Piano grand staff | 오른손/왼손이 모두 있는 구간을 재생하고 중간 정지/처음으로를 실행한다 | 양손 이벤트가 누락되지 않고 playback cursor와 editing selection address가 혼동되지 않는다. | 미실행 |  |
| 2-4 part ensemble | 각 part의 mute를 하나씩 켜고 끈다 | muted part는 들리지 않고 다른 part는 유지된다. | 미실행 |  |
| 2-4 part ensemble | 한 part solo, 여러 part solo, solo 해제를 순서대로 확인한다 | solo part만 들리고 solo 해제 후 전체 part가 다시 들린다. | 미실행 |  |
| 2-4 part ensemble | part별 volume을 낮춤/기본/높임으로 바꾼다 | scheduling 끊김 없이 상대 음량 변화가 들린다. | 미실행 |  |
| 2-4 part ensemble | 재생 중 stop/jump/restart와 part 선택을 반복한다 | playback cursor 초기화와 editing selection 유지 정책이 화면에서 일관된다. | 미실행 |  |

## 통과 기준

- 데이터 손상, 앱 중단, 저장/열기 실패가 없다.
- 화면 잘림은 release blocker인지 known issue인지 분류한다.
- 실패는 재현 단계, 파일, 스크린샷, OS, 앱 버전을 함께 기록한다.

## 릴리즈 체크리스트 연결

이 문서는 `docs/releases/checklist-template.md`의 사람이 점검 섹션에서 참조한다.

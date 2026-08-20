# Android 악보 뷰어 기능 맵

작성일: 2026-08-20

## 우선순위 기준

- MVP: 사용자 인터뷰의 핵심 불편을 검증하고 악보 뷰어로 공연에 쓸 수 있는 최소 범위.
- V1: MobileSheets 기본 기대치를 넓게 커버하기 위한 기능.
- V2: 고급 연주, 편집, 기기 연동 기능.
- Later: 협업, 크로스 플랫폼, 기관/팀 운영처럼 제품 검증 후 확장할 기능.

난이도는 Android 태블릿 앱 기준으로 낮음, 중간, 높음으로 표시한다.

## Feature Coverage Matrix

| 범주 | 기능 | 레퍼런스 기준 | 단계 | 난이도 | 주요 의존성/메모 |
| --- | --- | --- | --- | --- | --- |
| 라이브러리 | PDF 가져오기 | MobileSheets/Piascore 기본 | MVP | 중간 | Android Storage Access Framework, 로컬 사본 정책 |
| 라이브러리 | 제목/작곡가/태그/메모 | 양쪽 기본 | MVP | 낮음 | Room/SQLite |
| 라이브러리 | 최근 열기/즐겨찾기 | 기본 기대 | MVP | 낮음 | 로컬 DB |
| 라이브러리 | 제목/태그 검색 | 양쪽 기본 | MVP | 낮음 | 검색 index |
| 라이브러리 | 세트리스트 | 양쪽 기본 | MVP | 중간 | ordered score list |
| 라이브러리 | 북마크 | 양쪽 기본 | MVP | 낮음 | page anchor |
| 라이브러리 | collection | MobileSheets 지원 | V1 | 중간 | 세트리스트와 모델 분리 |
| 라이브러리 | 여러 라이브러리 | MobileSheets 지원 | V1 | 중간 | library switching |
| 라이브러리 | 고급 메타데이터 필드 | MobileSheets 강점 | V1 | 중간 | custom fields |
| 라이브러리 | 필터/group/rating | MobileSheets 지원 | V1 | 중간 | metadata model |
| 라이브러리 | 음성 검색 | MobileSheets 지원 | Later | 중간 | Android speech recognizer |
| 파일 | 이미지 파일 지원 | MobileSheets 지원 | V1 | 중간 | image import/render |
| 파일 | 텍스트/ChordPro 보기 | MobileSheets 지원 | V2 | 높음 | parser, renderer |
| 파일 | ChordPro transpose/capo | MobileSheets 지원 | V2 | 높음 | chord parser |
| 파일 | 한 곡에 여러 파일 연결 | MobileSheets 지원 | V1 | 중간 | score-file relation |
| 파일 | CSV index로 songbook 분할 | MobileSheets 지원 | V2 | 중간 | CSV import, page range |
| 파일 | 기존 폴더 직접 참조 | MobileSheets Android 지원 | V1 | 높음 | SAF persistent permission |
| 파일 | 클라우드 파일 가져오기 | 양쪽 지원 | V1 | 중간 | system picker 우선 |
| 파일 | PC companion app | MobileSheets 지원 | Later | 높음 | 별도 desktop app |
| 보기 | 1페이지 보기 | 양쪽 기본 | MVP | 중간 | PDF raster cache |
| 보기 | 2페이지 보기 | 양쪽 기본 | MVP | 중간 | tablet spread layout |
| 보기 | 세로 스크롤 | 양쪽 기본 | MVP | 중간 | page virtualization |
| 보기 | 가로 페이지 넘김 | 양쪽 기본 | MVP | 중간 | gesture, cache |
| 보기 | 반 페이지 넘김 | 양쪽 기본 | MVP | 중간 | viewport split |
| 보기 | 확대/축소/이동 | 양쪽 기본 | MVP | 중간 | transform, annotation 좌표 |
| 보기 | 마지막 위치 저장 | 기본 기대 | MVP | 낮음 | per-score setting |
| 보기 | page scaling | MobileSheets 지원 | V1 | 중간 | fit width/fullscreen |
| 보기 | landscape half-page policy | MobileSheets 지원 | V1 | 중간 | orientation rules |
| 보기 | image caching/prefetch | MobileSheets 지원 | MVP | 높음 | performance spike |
| 보기 | 수동 크롭 | 양쪽 지원 | V1 | 중간 | crop metadata |
| 보기 | 자동 크롭 | MobileSheets 지원 | V2 | 높음 | margin detection |
| 보기 | 페이지 회전 | 양쪽 지원 | V1 | 중간 | per-page transform |
| 페이지 정리 | 페이지 숨김 | 양쪽 지원 | V1 | 중간 | virtual page order |
| 페이지 정리 | 페이지 순서 변경 | 양쪽 지원 | V1 | 중간 | virtual order |
| 페이지 정리 | 페이지 복제 | 양쪽 지원 | V1 | 중간 | per-instance metadata |
| 페이지 정리 | 반복 페이지 삽입 | MobileSheets 지원 | V1 | 중간 | performance order |
| 페이지 정리 | link point/jump point | 양쪽 지원 | V1 | 중간 | tappable jump overlay |
| 페이지 정리 | smart button | MobileSheets 지원 | V2 | 높음 | action registry |
| PDF 링크 | link annotation 표시 | 사용자 차별화 | MVP | 중간 | PDF annotation parser |
| PDF 링크 | link tap 비활성화 | 사용자 차별화 | MVP | 중간 | viewer hit-test override |
| PDF 링크 | link 제거 사본 생성 | 사용자 차별화 | MVP | 높음 | PDF writer |
| PDF 링크 | visible watermark 제거 | 명시적 비목표 | Later | 높음 | 법적/윤리적 검토 필요 |
| 주석 | 펜 | 양쪽 기본 | MVP | 중간 | stroke model |
| 주석 | 형광펜 | MobileSheets 기본 | MVP | 중간 | blend/render |
| 주석 | 지우개 | 양쪽 기본 | MVP | 중간 | stroke hit-test |
| 주석 | 텍스트 | 양쪽 기본 | MVP | 중간 | text input/position |
| 주석 | 색상/두께 | 양쪽 기본 | MVP | 낮음 | tool preset |
| 주석 | undo/redo | 양쪽 기본 | MVP | 중간 | command stack |
| 주석 | 자동 저장 | MobileSheets 기본 | MVP | 중간 | persistence |
| 주석 | 스탬프 | 양쪽 지원 | V1 | 중간 | stamp assets |
| 주석 | 도형/화살표 | 양쪽 지원 | V1 | 중간 | vector shapes |
| 주석 | crescendo/piano staff | MobileSheets 지원 | V2 | 중간 | music-specific shapes |
| 주석 | favorite tool | MobileSheets 지원 | V1 | 낮음 | saved presets |
| 주석 | nudge tool | MobileSheets 지원 | V2 | 중간 | selection model |
| 주석 | 스타일러스 pressure | MobileSheets 지원 | V1 | 중간 | S Pen pointer data |
| 주석 | palm rejection | Piascore 지원 | V1 | 높음 | platform gesture tuning |
| 주석 | annotation layer | MobileSheets 강점 | V2 | 높음 | visibility/export model |
| 주석 | PDF embed/export | 양쪽 지원 | V2 | 높음 | PDF writer |
| 공연 | 공연 모드 | 양쪽 기본 | MVP | 낮음 | UI lock |
| 공연 | 세트리스트 연속 넘김 | 양쪽 기본 | MVP | 중간 | score boundary transition |
| 공연 | quick action box | MobileSheets 지원 | V1 | 중간 | shortcut/action system |
| 공연 | 곡별 보기 설정 | MobileSheets 지원 | V1 | 중간 | settings hierarchy |
| 공연 | 자동 스크롤 | 양쪽 기본 | V1 | 중간 | duration/scroll profile |
| 공연 | 고급 자동 스크롤 pause | MobileSheets 지원 | V2 | 높음 | page/measure cue |
| 음악 도구 | 메트로놈 | 양쪽 기본 | MVP | 중간 | low-latency audio |
| 음악 도구 | 튜너 | Piascore 참고/차별화 | MVP | 높음 | mic, pitch detection |
| 음악 도구 | 기준음/드론 | in C Chime와 연결 | V1 | 중간 | synth/audio engine |
| 음악 도구 | 음악 키보드 | Piascore 지원 | Later | 중간 | virtual instrument |
| 음악 도구 | 녹음기 | Piascore 지원 | Later | 중간 | recording permission/storage |
| 음악 도구 | 오디오 플레이어 | 양쪽 지원 | V1 | 중간 | local audio |
| 음악 도구 | A-B loop | MobileSheets 지원 | V2 | 중간 | time markers |
| 음악 도구 | tempo/pitch shift | MobileSheets 지원 | V2 | 높음 | DSP library |
| 외부 장치 | Bluetooth 페달 기본 넘김 | 양쪽 기본 | MVP | 중간 | HID key mapping |
| 외부 장치 | USB 페달 | MobileSheets 지원 | V1 | 중간 | key input mapping |
| 외부 장치 | 페달 action mapping | MobileSheets 강점 | V1 | 중간 | action registry |
| 외부 장치 | face gesture page turn | MobileSheets 지원 | Later | 높음 | camera/privacy |
| 외부 장치 | USB/Bluetooth MIDI | MobileSheets 지원 | V2 | 높음 | Android MIDI API |
| 외부 장치 | MIDI registration/linking | MobileSheets 지원 | Later | 높음 | device profiles |
| 동기화 | 로컬 백업/복원 | MobileSheets 기본 | V1 | 중간 | export package |
| 동기화 | 자동 DB 백업 | MobileSheets 참고 | V1 | 중간 | scheduled local backup |
| 동기화 | 클라우드 동기화 | MobileSheets 지원 | Later | 높음 | conflict model |
| 동기화 | 기기 간 페이지 전환 | 양쪽 지원 | Later | 높음 | Wi-Fi/Bluetooth session |
| 협업 | leader/follower tablet | MobileSheets 강점 | Later | 높음 | session control |
| 협업 | 주석 보존 sync | MobileSheets 강점 | Later | 높음 | merge/conflict rules |
| 설정/접근성 | 큰 터치 영역 | 태블릿 기본 | MVP | 낮음 | 공연 모드 UX |
| 설정/접근성 | TalkBack label | Android 기본 | MVP | 낮음 | semantics |
| 설정/접근성 | 다크/반전 표시 | Piascore 사용자 리뷰 참고 | V1 | 중간 | render filter |
| 설정/접근성 | 전역 gesture/action 설정 | MobileSheets 강점 | V1 | 중간 | action registry |

## MVP Coverage

MVP는 MobileSheets 전체 기능을 복제하지 않는다. 다만 Android 악보 뷰어로 인정받기
위한 기본기와 사용자 인터뷰에서 나온 차별점을 동시에 검증한다.

- PDF 가져오기와 로컬 라이브러리.
- 제목, 작곡가, 태그, 메모, 최근 열기, 즐겨찾기, 기본 검색.
- 1페이지, 2페이지, 세로 스크롤, 반 페이지, 확대/축소/이동.
- 저지연 페이지 넘김을 위한 image caching/prefetch spike.
- 세트리스트, 세트리스트 연속 넘김.
- 북마크.
- 펜, 형광펜, 지우개, 텍스트, 색상/두께, undo/redo, 자동 저장.
- 메트로놈.
- 크로매틱 튜너.
- PDF link annotation 탐지, 표시, 탭 비활성화, 제거 사본 생성.
- 공연 모드.
- Bluetooth 페달 기본 페이지 넘김.

## V1 후보

- collection, 여러 라이브러리, 고급 메타데이터 필드, 필터/group/rating.
- 이미지 파일 지원, 한 곡에 여러 파일 연결, 기존 폴더 직접 참조.
- cloud file import.
- 수동 크롭, 페이지 회전, 페이지 숨김/순서 변경/복제, 반복 페이지 삽입.
- link point/jump point.
- 스탬프, 도형/화살표, favorite tool, pressure sensitivity, palm rejection.
- quick action box, 곡별 보기 설정, 자동 스크롤.
- 기준음/드론, 오디오 플레이어.
- USB 페달, 페달 action mapping.
- 로컬 백업/복원, 자동 DB 백업.
- 다크/반전 표시, 전역 gesture/action 설정.

## V2 후보

- 텍스트/ChordPro 보기, transpose, capo.
- CSV index 기반 PDF songbook 분할.
- 자동 크롭.
- smart button.
- crescendo/piano staff, nudge tool, annotation layer.
- PDF annotation embed/export.
- 고급 자동 스크롤 pause.
- A-B loop, tempo/pitch shift.
- USB/Bluetooth MIDI.

## Later 후보

- 음성 검색.
- PC companion app.
- 음악 키보드, 녹음기.
- face gesture page turn.
- MIDI registration/linking.
- cloud library sync.
- 기기 간 페이지 전환.
- leader/follower tablet 협업.
- 주석 보존 sync.
- visible watermark 제거는 별도 법적/윤리적 검토 전까지 비목표로 유지한다.

## 결정 메모

- 첫 제품 검증은 Android 태블릿에서 한다.
- 원본 PDF는 기본적으로 보존한다.
- PDF link annotation 제거는 사용자가 확인한 사본에만 적용한다.
- MobileSheets와 기능 범주는 맞추되, UI와 상호작용을 그대로 복제하지 않는다.
- 튜너는 핵심 차별점이지만 악기별 튜너가 아니라 chromatic tuner부터 시작한다.

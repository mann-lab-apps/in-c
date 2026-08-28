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
| 라이브러리 | 제목/작곡가/태그/메모 | 양쪽 기본 | MVP | 낮음 | 2차 구현: SharedPreferences 기반 편집 UI, comma-separated 태그 |
| 라이브러리 | 최근 열기/즐겨찾기 | 기본 기대 | MVP | 낮음 | 로컬 DB |
| 라이브러리 | 제목/태그 검색 | 양쪽 기본 | MVP | 낮음 | 검색 index |
| 라이브러리 | 정렬/필터 | MobileSheets 지원 | MVP | 낮음 | 14차 구현: 최근 열기/제목/작곡가/가져온 날짜 정렬, 즐겨찾기/태그 필터 |
| 라이브러리 | 세트리스트 | 양쪽 기본 | MVP | 중간 | 2차 구현: ordered score list, 생성/이름 변경/삭제, 검색 추가, 제거/순서 이동, 첫 곡 열기 |
| 라이브러리 | 북마크 | 양쪽 기본 | MVP | 낮음 | 2차 구현: score별 page anchor, label rename, 목록 삭제 |
| 라이브러리 | collection | MobileSheets 지원 | V1 | 중간 | 21차 구현: 세트리스트와 분리된 score metadata, 편집/검색/필터 |
| 라이브러리 | 여러 라이브러리 | MobileSheets 지원 | V1 | 중간 | 구현됨: library profile별 scores/setlists/view/favorite preset 저장 key 분리, 생성/전환/이름 변경/비우기 |
| 라이브러리 | 고급 메타데이터 필드 | MobileSheets 강점 | V1 | 중간 | 22차 구현: 악보별 custom key/value field, 편집/검색/백업 round-trip |
| 라이브러리 | group/rating | MobileSheets 지원 | V1 | 중간 | 21차 구현: 편집/검색/필터/별점 정렬 |
| 라이브러리 | 음성 검색 | MobileSheets 지원 | Later | 중간 | Android speech recognizer |
| 파일 | 이미지 파일 지원 | MobileSheets 지원 | Partial | 중간 | 구현됨: JPG/PNG를 PDF 악보로 변환 등록, 원본 이미지를 reference linkedFiles로 보존, 연결 파일 이미지 원본 viewer. HEIC 변환은 후속 |
| 파일 | 여러 이미지 PDF 묶기 | 스캔 자료 처리 | Partial | 중간 | 22차 보강: 파일 picker에서 여러 JPG/PNG를 A4 PDF로 묶고 원본 이미지를 reference 파일로 연결 |
| 파일 | 외부 앱에서 PDF 열기/import | 국내 공유 흐름 | MVP | 중간 | 16차 구현: Android ACTION_VIEW/SEND PDF 수신, iOS document open URL bridge. iOS Share Extension은 후속 |
| 파일 | PDF 공유/export | 국내 공유 흐름 | MVP | 낮음 | 17차 구현: share_plus 기반 현재 PDF/원본 후보 공유, 필기 포함 PDF 사본 공유 |
| 파일 | 카메라 PDF 스캔 | 스캐너 앱 영역 | Later | 높음 | camera permission, edge detection, perspective correction, batch scan. MVP는 스캔 기능보다 스캔된 자료 처리 우선 |
| 파일 | 텍스트/ChordPro 보기 | MobileSheets 지원 | V2 | 높음 | parser, renderer |
| 파일 | ChordPro transpose/capo | MobileSheets 지원 | V2 | 높음 | chord parser |
| 파일 | 한 곡에 여러 파일 연결 | MobileSheets 지원 | V1 | 중간 | 21차 구현: linkedFiles metadata/backup round-trip, 관리 UI, viewer PDF 연결 파일 전환 |
| 파일 | CSV index로 songbook 분할 | MobileSheets 지원 | V2 | 중간 | CSV import, page range |
| 파일 | 기존 폴더 직접 참조 | MobileSheets Android 지원 | V1 | 높음 | 21차 spike 문서화: SAF persistent permission, iOS Files 제약 |
| 파일 | 클라우드 파일 가져오기 | 양쪽 지원 | V1 | 중간 | 22차 정책화: 별도 SDK 없이 system file picker provider 우선. 접근 실패 시 기기 내려받기 안내 |
| 파일 | PC companion app | MobileSheets 지원 | Later | 높음 | 별도 desktop app |
| 보기 | 1페이지 보기 | 양쪽 기본 | MVP | 중간 | 3차 구현: `pdfrx.layoutPages` 기반 가로 1페이지 배치, 페이지 간격 보정 |
| 보기 | 2페이지 보기 | 양쪽 기본 | MVP | 중간 | 4차 구현: 넓은 화면 tablet spread, 첫 페이지 단독 후 2-3 spread |
| 보기 | 세로 스크롤 | 양쪽 기본 | MVP | 중간 | 3차 구현: `pdfrx` 기본 세로 연속 layout, 좁은 화면 기본값 |
| 보기 | 가로 페이지 넘김 | 양쪽 기본 | MVP | 중간 | 2차 구현: 1페이지 mode에서 가로 page layout |
| 보기 | 반 페이지 넘김 | 양쪽 기본 | MVP | 중간 | 5차 구현: 곡별 저장, visible viewport 기반 반 페이지 이동, 2페이지 보기와 동시 사용 제한 |
| 보기 | 확대/축소/이동 | 양쪽 기본 | MVP | 중간 | `pdfrx` 기본 동작. 8차에서 annotation overlay를 page rect 기준으로 보강 |
| 보기 | 마지막 위치 저장 | 기본 기대 | MVP | 낮음 | per-score setting |
| 보기 | 곡별 보기 설정 | MobileSheets 지원 | MVP | 중간 | 5차 구현: displayMode, halfPageTurn 저장. 좁은 화면 2페이지 fallback |
| 보기 | 모바일 viewer AppBar 정리 | iPhone smoke test 보강 | MVP | 낮음 | 3차 구현: 좁은 화면 overflow menu, 핵심 action 우선 노출 |
| 보기 | 하단 페이지 컨트롤 자동 숨김 | iPhone smoke test 보강 | MVP | 낮음 | 3차 구현: 일반 모드 fade out, 터치 시 재표시, 공연 모드 유지 |
| 보기 | page scaling | MobileSheets 지원 | V1 | 중간 | 구현됨: fit page/fit width/fullscreen metadata와 viewer 적용 |
| 보기 | landscape half-page policy | MobileSheets 지원 | V1 | 중간 | 구현됨: orientation별 half-page step 정책, 같은 page top anchor 이동, page boundary에서만 lastPage persistence |
| 보기 | image caching/prefetch | MobileSheets 지원 | MVP | 높음 | 구현됨: balanced/large PDF render profile로 `pdfrx` rendering cache limit, memory cap, one-pass threshold 조정. 50-100페이지 실기기 계측 필요 |
| 보기 | 수동 크롭 | 양쪽 지원 | V1 | 중간 | 구현됨: 원본 보존 crop metadata, viewer mask, pageOrder instance별 crop override, crop metadata를 PDF CropBox/페이지 정리 적용 사본 metadata로 반영 |
| 보기 | 자동 크롭 | MobileSheets 지원 | V2 | 높음 | margin detection |
| 보기 | 페이지 회전 | 양쪽 지원 | V1 | 중간 | 구현됨: source page/virtual instance metadata 저장, badge 표시, 회전 metadata를 적용한 앱 내부 PDF 사본 생성 |
| 페이지 정리 | 페이지 숨김 | 양쪽 지원 | MVP | 중간 | 5차 구현: 원본 PDF 보존 metadata, navigation skip, 숨김 해제 |
| 페이지 정리 | 페이지 순서 변경 | 양쪽 지원 | V1 | 중간 | 구현됨: virtual order와 instance override metadata, 실제 PDF page tree 적용 사본 생성 |
| 페이지 정리 | 페이지 복제 | 양쪽 지원 | V1 | 중간 | 구현됨: virtual duplicate, duplicate별 crop/rotation override, 실제 PDF page tree 적용 사본 생성 |
| 페이지 정리 | 반복 페이지 삽입 | MobileSheets 지원 | V1 | 중간 | 구현됨: 빈 페이지 metadata와 실제 PDF page tree 적용 사본 생성 |
| 페이지 정리 | link point/jump point | 양쪽 지원 | V1 | 중간 | 구현됨: page jump point metadata, tappable overlay/list, rename/delete |
| 페이지 정리 | smart button | MobileSheets 지원 | V2 | 높음 | action registry |
| PDF 링크 | link annotation 표시 | 사용자 차별화 | MVP | 중간 | 구현됨: `pdfrx` link handler 영역 표시 |
| PDF 링크 | link tap 비활성화 | 사용자 차별화 | MVP | 중간 | 구현됨: URL tap 차단, 내부 destination 유지 |
| PDF 링크 | link 제거 사본 생성 | 사용자 차별화 | MVP | 높음 | 구현됨: `pdf_document`로 URL link annotation 제거 사본 생성, 원본 보존, 비PDF/손상 PDF 실패 안전장치와 partial output cleanup. 실제 CamScanner 샘플/compact rewrite 검증 필요 |
| PDF 링크 | visible watermark 제거 | 명시적 비목표 | Later | 높음 | 법적/윤리적 검토 필요 |
| 주석 | 펜 | 양쪽 기본 | MVP | 중간 | 8차 보강: `pdfrx.pageOverlaysBuilder` 기반 page rect overlay, normalized point 저장 |
| 주석 | 형광펜 | MobileSheets 기본 | MVP | 중간 | 8차 보강: page별 translucent stroke render |
| 주석 | 지우개 | 양쪽 기본 | MVP | 중간 | 8차 보강: page-local 좌표를 normalized hit-test로 변환해 stroke 단위 삭제 |
| 주석 | 텍스트 | 양쪽 기본 | MVP | 중간 | 18차 구현: page normalized position, 입력 dialog, render, edit/delete, undo |
| 주석 | 색상/두께 | 양쪽 기본 | MVP | 낮음 | 7차 구현: 검정/빨강/파랑/노랑, 두께 slider |
| 주석 | undo/redo | 양쪽 기본 | MVP | 중간 | 구현됨: 현재 페이지 마지막 stroke/text undo와 redo |
| 주석 | 자동 저장 | MobileSheets 기본 | MVP | 중간 | 7차 구현: stroke 종료/지우개 삭제 시 SharedPreferences 저장. 대량 stroke는 file-backed store 후속 |
| 주석 | 스탬프 | 양쪽 지원 | V1 | 중간 | 구현됨: stamp annotation tool, preset 저장, 화면 렌더/삭제/redo/export path. 전용 asset pack 고도화는 후속 |
| 주석 | 도형/화살표 | 양쪽 지원 | V1 | 중간 | 구현됨: rectangle/arrow annotation tool, hit-test/delete, redo, PDF export rendering |
| 주석 | crescendo/piano staff | MobileSheets 지원 | V2 | 중간 | music-specific shapes |
| 주석 | favorite tool | MobileSheets 지원 | V1 | 낮음 | 구현됨: favorite annotation tool preset 저장/복원, library profile별 분리 |
| 주석 | nudge tool | MobileSheets 지원 | V2 | 중간 | selection model |
| 주석 | 스타일러스 pressure | MobileSheets 지원 | V1 | 중간 | 구현됨: stylus pointer pressure를 normalized point metadata로 저장하고 화면/PDF export stroke width에 반영. Galaxy Tab S Pen QA 필요 |
| 주석 | palm rejection | Piascore 지원 | V1 | 높음 | 구현됨: stylus 입력 직후 touch gesture rejection window 1차 적용. Galaxy Tab S Pen/palm QA tuning 필요 |
| 주석 | annotation layer | MobileSheets 강점 | V2 | 높음 | visibility/export model |
| 주석 | 필기 포함 PDF 공유 | 양쪽 기본 기대 | MVP | 중간 | 19차 구현: 원본 보존, `pdf_document` stamp 기반 stroke/ASCII text 사본 생성. 한글/비ASCII text는 깨진 glyph 방지를 위해 제외 안내/fallback, font embedding은 후속 |
| 주석 | PDF annotation 객체 embed/export | 양쪽 지원 | V2 | 높음 | PDF 표준 annotation으로 편집 가능한 export/import |
| 공연 | 공연 모드 | 양쪽 기본 | MVP | 낮음 | 3차 구현: session local UI lock, 관리 action 숨김, 큰 페이지 컨트롤 유지 |
| 공연 | 세트리스트 연속 넘김 | 양쪽 기본 | MVP | 중간 | 2차 구현: viewer context 표시와 명시적 이전/다음 곡 이동 |
| 공연 | quick action box | MobileSheets 지원 | V1 | 중간 | 구현됨: 공연 모드 quick action overlay, 페달/키보드 toggle action 연결 |
| 공연 | 공연별 보기 preset override | MobileSheets 지원 | V1 | 중간 | 구현됨: 세트리스트별 viewer/action preset override, 곡별 설정 보존, 공연 preset template 생성/적용/삭제, 장비 profile metadata, metadata/full backup round-trip |
| 공연 | 자동 스크롤 | 양쪽 기본 | MVP | 중간 | 구현됨: 곡별 duration/start/end 저장, 세로 스크롤 기반 진행, page별 duration weight, 시작 cue, rehearsal mark 기반 cue point, pause marker, 반복 구간, BPM 기반 duration preset, 세트리스트 자동 다음 곡 진행, 수동 입력 시 정지 |
| 공연 | 고급 자동 스크롤 pause | MobileSheets 지원 | V2 | 높음 | measure 위치 기반 자동 감지와 page별 세부 timeline 편집은 후속 |
| 음악 도구 | 메트로놈 | 양쪽 기본 | MVP | 중간 | 19차 구현: visual metronome, BPM/박자 저장, 기본 OFF system click tick toggle. 저지연 audio/accent sound는 후속 |
| 음악 도구 | 튜너 | Piascore 참고/차별화 | MVP | 높음 | V1 후보 구현: `record` PCM stream, autocorrelation detector, median smoothing, profile별 no-signal debounce/confidence, octave jump 완화, note hysteresis, frequency-to-note/cents 계산, Concert/Bb Trumpet 표시, Chromatic/Bb Trumpet 감지 profile, A4 저장. 실기기 정확도/latency 검증 필요 |
| 음악 도구 | 기준음/드론 | in C Chime와 연결 | V1 | 중간 | 구현됨: tuner A4 기준을 공유하는 Android native sine tone/drone, 기준음/5도/옥타브 mode, 볼륨 저장/백업 round-trip. latency/iOS parity는 QA 필요 |
| 음악 도구 | 음악 키보드 | Piascore 지원 | Later | 중간 | virtual instrument |
| 음악 도구 | 녹음기 | Piascore 지원 | Later | 중간 | recording permission/storage |
| 음악 도구 | 오디오 플레이어 | 양쪽 지원 | V1 | 중간 | 구현됨: linked audio file import/share MIME, Android native MediaPlayer 재생/정지 bottom sheet. codec/latency/iOS parity는 QA 필요 |
| 음악 도구 | A-B loop | MobileSheets 지원 | V2 | 중간 | time markers |
| 음악 도구 | tempo/pitch shift | MobileSheets 지원 | V2 | 높음 | DSP library |
| 외부 장치 | Bluetooth 페달 기본 넘김 | 양쪽 기본 | MVP | 중간 | 6차 구현: Arrow/Page/Space logical key 기반 이전/다음 넘김. 실제 페달 검증 필요 |
| 외부 장치 | USB 페달 | MobileSheets 지원 | V1 | 중간 | 구현됨: keyboard/HID key input mapping path와 진단 로그. 실제 USB 페달 장비 QA는 blocker |
| 외부 장치 | 페달 action mapping | MobileSheets 강점 | V1 | 중간 | 구현됨: preset + input별 custom action dropdown, quick action/no-op/setlist action 저장 |
| 외부 장치 | face gesture page turn | MobileSheets 지원 | Later | 높음 | camera/privacy |
| 외부 장치 | USB/Bluetooth MIDI | MobileSheets 지원 | V2 | 높음 | Android MIDI API |
| 외부 장치 | MIDI registration/linking | MobileSheets 지원 | Later | 높음 | device profiles |
| 동기화 | 로컬 백업/복원 | MobileSheets 기본 | MVP | 중간 | 17차 구현: metadata-only JSON 유지, PDF 포함 전체 백업/복원 ZIP 추가 |
| 동기화 | 자동 DB 백업 | MobileSheets 참고 | V1 | 중간 | 구현됨: save mutation마다 active library profile별 metadata-only 자동 snapshot 저장/복원. OS background scheduled full backup은 후속 |
| 동기화 | 클라우드 동기화 | MobileSheets 지원 | Later | 높음 | conflict model |
| 동기화 | 기기 간 페이지 전환 | 양쪽 지원 | Later | 높음 | Wi-Fi/Bluetooth session |
| 협업 | leader/follower tablet | MobileSheets 강점 | Later | 높음 | session control |
| 협업 | 주석 보존 sync | MobileSheets 강점 | Later | 높음 | merge/conflict rules |
| 설정/접근성 | 큰 터치 영역 | 태블릿 기본 | MVP | 낮음 | 공연 모드 UX |
| 설정/접근성 | TalkBack label | Android 기본 | MVP | 낮음 | semantics |
| 설정/접근성 | 다크/반전 표시 | Piascore 사용자 리뷰 참고 | V1 | 중간 | 18차 구현: 곡별 표시 효과, 어두운 배경, viewer 전체 색상 반전 |
| 설정/접근성 | 베타 테스트 정보 | 테스터 전달 | MVP | 낮음 | 20차 보강: 앱 내 version/build, 주요 테스트 항목, 피드백 템플릿 복사, 외부 QA 체크리스트/known issues 문서 |
| 설정/접근성 | 전역 gesture/action 설정 | MobileSheets 강점 | V1 | 중간 | 구현됨: 새 악보 기본 viewer/action/pedal mapping 설정 UI, input diagnostic, metadata/backup round-trip |

## MVP Coverage

MVP는 MobileSheets 전체 기능을 복제하지 않는다. 다만 Android 악보 뷰어로 인정받기
위한 기본기와 사용자 인터뷰에서 나온 차별점을 동시에 검증한다.

- PDF 가져오기와 로컬 라이브러리.
- 제목, 작곡가, 태그, 메모, 최근 열기, 즐겨찾기, 기본 검색. 제목/작곡가/태그/메모
  편집은 2차 구현했고, 14차에서 정렬/즐겨찾기/태그 필터를 추가했다.
- 1페이지, 2페이지, 세로 스크롤, 반 페이지 넘김, 확대/축소/이동. 3차 구현에서 좁은 화면은
  세로 스크롤을 기본값으로 두고, 모바일 AppBar와 하단 페이지 컨트롤을 보강했다. 4차 구현에서
  넓은 화면 2페이지 spread와 visible viewport 기반 반 페이지 넘김을 추가했다. 5차 구현에서
  보기 모드와 반 페이지 넘김을 곡별 metadata로 저장한다.
- 페이지 숨김. 5차 구현은 원본 PDF를 수정하지 않고 hidden page metadata로 이전/다음 이동에서
  건너뛰는 방식이다.
- 저지연 페이지 넘김을 위한 render cache profile. 50-100페이지 스캔 PDF 실기기 계측은 QA에서
  확인한다.
- 세트리스트, 세트리스트 연속 넘김. 2차 구현은 검색 추가, 첫 곡 열기, viewer context
  표시, 명시적 이전/다음 곡 이동이다.
- 북마크. 2차 구현은 페이지 anchor 저장, 목록 이동, 이름 변경, 삭제다.
- 펜, 형광펜, 텍스트, 지우개, 색상/두께, 자동 저장. 7차 구현은 원본 PDF를 수정하지 않는
  normalized stroke overlay이며, 현재 페이지 마지막 stroke undo를 제공한다. 8차 보강에서
  `pdfrx` page rect 기반 overlay로 좌표 정합성을 높였다. 18차에서 텍스트 주석 생성/렌더/수정/삭제/undo를
  추가했고, 후속 보강에서 stroke/text redo까지 연결했다.
- 메트로놈. 6차 구현은 visual metronome, BPM/박자 저장, start/stop, accent beat 표시다.
- 크로매틱 튜너. 11차 구현은 `record` 기반 microphone PCM stream, autocorrelation pitch
  detector, median smoothing, no-signal debounce까지 붙였다. Android 태블릿 실기기 정확도/latency
  검증은 후속이다.
- PDF link annotation 탐지, 표시, 탭 비활성화, URL link 제거 사본 생성. `pdf_document` 기반으로
  URL link annotation 제거 뒤 page count를 재검증하고, 비PDF/손상 PDF 실패 시 partial output을
  남기지 않는다. 실제 CamScanner 샘플/compact rewrite 검증은 blocker다.
- 자동 스크롤. 곡별 duration/start/end/cue/pause marker/repeat section/page duration/cue point
  설정을 저장하고, 세로 스크롤 보기에서 weighted timeline 기반으로 진행한다. pause/resume과 현재
  메트로놈 BPM 기반 duration preset까지 1차 구현했다.
- 로컬 백업/복원. 14차 구현은 PDF 파일을 제외한 metadata-only JSON export/import였고, 17차에서
  PDF 파일을 포함한 전체 백업/복원 ZIP을 추가했다. 2026-08-28에는 save mutation마다 active
  library profile별 metadata-only 자동 snapshot을 남기고 복원할 수 있게 했다.
- 공연 모드.
  세트리스트별 viewer/action override와 quick action overlay에 더해 active library profile별
  공연 preset template catalog를 저장한다. viewer 공연 설정 sheet에서 현재 설정을 template으로
  저장하고, 저장된 template을 적용/삭제할 수 있으며 장비 profile metadata는 백업에 포함된다.
  실제 장비별 자동 추천은 QA blocker로 둔다.
- Bluetooth 페달 기본 페이지 넘김. 6차 구현은 key event 기반이며 실제 페달 장비 검증은
  후속이다.

## V1 후보

- HEIC 이미지 변환, 기존 폴더 직접 참조.
- iOS Share Extension이 필요한 출처 앱 대응.
- 카메라 PDF 스캔은 별도 스캐너 품질 기대가 생기므로 Later로 둔다.
- cloud file import.
- 실제 페이지 회전 live 렌더링과 per-instance crop/rotation override.
- palm rejection 실기기 튜닝.
- 로컬 오디오 플레이어 iOS parity와 codec/latency QA.

## V2 후보

- 텍스트/ChordPro 보기, transpose, capo.
- CSV index 기반 PDF songbook 분할.
- 자동 크롭.
- smart button.
- crescendo/piano staff, nudge tool, annotation layer.
- PDF annotation 객체 embed/export.
- 고급 자동 스크롤 measure 위치 자동 감지.
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
- 튜너는 핵심 차별점이지만 전체 악기별 튜너가 아니라 chromatic tuner와 Bb Trumpet 표시
  모드부터 시작한다. 1차 구현은 visual tuner, pitch math, `record` raw PCM stream, median
  smoothing, octave jump 완화를 고정했고, 실기기 정확도와 latency는 별도 검증한다.

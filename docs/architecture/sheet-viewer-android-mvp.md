# Android 악보 뷰어 MVP 구현 메모

작성일: 2026-08-20

## 구현 방향

제품명은 `Clef`로 둔다. 구현 위치는 `apps/in_c_sheet`를 유지하고 Android 전용 Flutter 앱으로
시작한다. 기존 `in_c_click`,
`in_c_chime`와 같은 앱 포트폴리오 구조를 따르되, PDF 렌더링은 Flutter widget만으로
직접 만들지 않고 `pdfrx`를 사용한다. `pdfrx`는 PDFium 기반이고 PDF viewing,
link handling, page layout customization, page manipulation 관련 확장 지점이 있어
향후 PDF link annotation 정리와 페이지 정리 기능으로 이어가기 좋다.

## 1차 MVP 포함 범위

- PDF 파일 선택.
- Android 외부 앱/파일 앱에서 PDF 공유 또는 열기.
- 앱 내부 문서 저장소에 PDF 사본 저장.
- JPG/PNG 이미지를 페이지별 PDF 악보로 묶어 라이브러리에 등록.
- 로컬 라이브러리 record 저장.
- 제목, 작곡가, 태그, 메모, 파일 경로, 최근 열기, 마지막 페이지, 즐겨찾기,
  북마크, 컬렉션, 그룹, 별점, 연결 파일, 곡별 보기 설정, 페이지 정리 metadata 필드.
- 제목, 작곡가, 태그, 컬렉션, 그룹, 별점, 메모 편집.
- 라이브러리 목록, 검색, 최근 열기/즐겨찾기 표시, 정렬/필터.
- V1 Polish quick access: 라이브러리 상단에서 고정, 즐겨찾기, 최근 연 악보를 별도 rail로 노출.
- 세트리스트 생성, 이름 변경, 삭제.
- 세트리스트 악보 검색 추가, 제거, 위/아래 순서 이동.
- 세트리스트 첫 곡 바로 열기.
- PDF viewer 화면.
- 이전/다음 페이지 이동.
- 현재 페이지/전체 페이지 표시.
- 마지막 페이지 저장.
- 현재 페이지 북마크 추가/해제, 이름 변경, 삭제.
- 북마크 목록에서 페이지 이동.
- 세트리스트 context에서 이전/다음 곡 이동과 현재 순서 표시.
- 보기 모드 1차: 1페이지식 가로 배치, 2페이지 태블릿 spread, 세로 스크롤.
- 곡별 보기 설정 저장: 보기 모드, 반 페이지 넘김, page scale, 렌더 프로필, 페달 mapping.
- 곡별 Polish 설정 저장: 페이지 넘김 애니메이션 강도, 공연 준비 안내, 화면 켜짐 확인,
  세트리스트 전환 확인/자동 이동, 공연 중 필기/메뉴/PDF 링크 허용 여부.
- 페이지 정리 1차: 현재 페이지 숨김/해제, 회전 metadata 저장, 회전 적용 사본 생성,
  virtual page order, 페이지 순서 변경/복제, jump point.
- V1 완성 페이지 metadata: 리허설 마크, crop preset, 빈 페이지 삽입 metadata,
  page visibility preset. 원본 PDF page tree는 수정하지 않는다.
- 파트/버전 관리 1차: `linkedFiles`에 role을 저장하고, 현재 악보와 연결 PDF 파일을
  전환한다. 이전 현재 파일은 연결 파일 metadata로 남긴다.
- PDF outline import 1차: PDF 내장 outline을 감지해 앱 bookmark 후보로 병합한다.
  동일 page bookmark는 중복 생성하지 않고, 외부 URL link 정책과 분리해 내부 이동만 다룬다.
- 악보별 structured notes: 공연, 리허설, 조율/악기, 편성 메모를 구분해 저장하고 검색 대상에
  포함한다.
- 세트리스트 리허설 UX 1차: 리허설 모드, 곡별 시작 page, 곡별 메모, 곡 사이 전환 대기
  시간을 setlist metadata로 저장한다.
- 여러 라이브러리 1차: library profile별 scores/setlists/library view/favorite annotation preset
  저장 key를 분리하고, 상단 switcher에서 생성/전환/이름 변경/비우기를 제공한다. 기본
  라이브러리는 기존 preference key를 유지해 과거 데이터와 호환한다.
- 라이브러리 bulk edit 1차: 검색/필터 결과에서 여러 악보를 선택해 태그 추가/제거,
  collection/group/rating, favorite/pinned metadata를 일괄 변경한다. 원본 파일 삭제는
  수행하지 않는다.
- 주석/필기 1차: 펜, 형광펜, 화살표, 사각형, 텍스트, 스탬프, 지우개, 색상/두께,
  page별 annotation 저장, undo/redo, favorite tool preset, page overlay 기반 좌표 정합성 보강.
- 메트로놈 1차: BPM, 박자, start/stop, accent beat visual 표시.
- 튜너 1차: `record` 기반 microphone PCM stream, autocorrelation pitch detector,
  frequency-to-note 계산, cents meter, A4 기준음 저장, viewer bottom sheet.
- 기준음/드론 1차: 튜너 A4 기준을 공유하고 Android native `AudioTrack` sine tone으로 기준음,
  5도, 옥타브 drone을 재생한다.
- 로컬 오디오 플레이어 1차: linked audio file을 앱 저장소에 복사하고 Android native
  `MediaPlayer`로 재생/정지한다.
- 하드웨어 키/Bluetooth/USB 페달 입력 1차: arrow, page, space, media key 기반 이전/다음
  페이지 넘김과 mapping preset.
- 공연 모드 1차: 뷰어 관리 액션 숨김, 큰 페이지 컨트롤, quick action overlay,
  immersive system UI, 공연 준비 안내, 잠금 정책 표시.
- 자동 스크롤 1차: 곡별 duration/start/end/cue 저장, 세로 스크롤 기반 시간 진행,
  pause/resume/stop, BPM 기반 duration preset, 수동 입력 시 정지.
- URL link annotation 탭 비활성화.
- PDF link annotation 영역 표시 토글.
- PDF URL link annotation 제거 사본 생성.
- 현재 PDF 공유/export.
- 로컬 metadata 백업/복원 1차.
- 기본 확대/축소/이동은 `pdfrx` viewer 동작에 맡긴다.

## 1차 MVP 제외 범위

- 상용급 튜너 정확도/latency 보장.
- Bluetooth/USB 페달 실기기별 HID key 검증.
- ChordPro/text.
- HEIC 이미지 변환.
- 클라우드 동기화.
- 계정/서버 저장.

## 기술 리스크

- `file_picker` 12.x는 API가 크게 바뀌었으므로 이후 예제/문서와 버전을 맞춰 봐야 한다.
- `pdfrx`는 자체 캐시와 progressive loading을 제공하지만, 실제 50-100페이지 스캔 PDF에서
  Android 태블릿 메모리/지연을 계측해야 한다.
- 앱 내부 사본 저장은 MVP에 안전하지만, MobileSheets처럼 기존 폴더를 직접 참조하는
  고급 사용성은 V1에서 별도 설계가 필요하다. 2026-08-28 기준으로 실제 library profile 저장소,
  collection/group/rating, linked file metadata를 먼저 구현했고, 기존 폴더 직접 참조는 SAF/iOS
  Files 권한 spike로 분리했다.
- PDF link annotation 제거 사본 생성은 `pdf_document`로 구현했다. 원본 PDF는 보존하고,
  현재 score의 filePath를 정리된 앱 내부 사본으로 교체한다. Incremental save 특성상 forensic
  수준의 원본 object 완전 삭제가 필요한 요구는 별도 compact/rewrite 검토가 필요하다.
- URL link annotation은 viewer layer에서도 차단한다. 제거 사본 생성은 사용자가 명시적으로
  실행한 경우에만 수행한다. PDF 내부 destination link는 허용하되 이동 후 숨김 page 보정과
  virtual page order cursor 동기화를 다시 수행한다.
- 페이지 숨김/회전 metadata는 원본 PDF를 수정하지 않는 앱 metadata다. 숨김 페이지는 navigation
  layer에서 건너뛰지만, 실제 PDF page tree는 그대로 유지된다. 사용자가 명시적으로 실행한 경우에만
  회전 metadata를 앱 내부 PDF 사본에 적용하고, 적용 전 PDF는 연결 파일 metadata로 보존한다.
- 수동 크롭은 원본 PDF를 수정하지 않는 global/page crop metadata로 저장한다. viewer에서는 page
  overlay에서 crop margin을 배경색으로 가려 보고, 사용자가 명시적으로 실행하면 crop metadata를
  실제 PDF CropBox로 적용한 앱 내부 사본을 만든다. 적용 전 PDF는 연결 파일 metadata로 보존한다.
- crop preset도 viewer metadata다. 모든 page, 홀수/짝수, cover 제외 scope를 저장하고 page별
  crop override를 만들 수 있다.
- 페이지 회전은 metadata 저장과 page overlay badge/pending action 표시를 먼저 수행하고, 필요하면
  `pdf_document`의 `PdfEditor.rotatePages`로 회전 적용 사본을 만든다. `pdfrx`의 low-level
  `PdfPageView`에는 `rotationOverride`가 있지만, 현재 `PdfViewer.file`/`PdfViewerParams`
  경로에서 page별 live 렌더 rotation hook을 안정적으로 주입하는 API는 확인되지 않았다.
- 메트로놈은 visual beat에 더해 기본 OFF `tick 소리` toggle을 제공한다. 1차 tick은 Flutter
  `SystemSoundType.click`을 사용하므로 accent/normal beat 음색 구분과 low-latency 보장은 후속이다.
- 튜너는 `record` 기반 raw PCM stream과 autocorrelation pitch detector까지 1차 구현했다.
  Android/iOS microphone permission도 선언했다. Median smoothing, 낮은 confidence 무시,
  no-signal debounce를 1차로 적용했지만 실기기 pitch 정확도, latency, 소음 환경 안정성은
  Android 태블릿에서 별도 검증해야 한다.
- Bluetooth/USB 페달은 1차에서 Flutter logical key event 기반으로 처리한다. 표준/반전/
  세트리스트 경계 이동 mapping preset을 제공한다. 실제 페달 모델별 HID key code와 Android
  focus 유지 여부는 실기기 검증이 필요하다.
- v1.1 준비로 viewer 입력 진단 bottom sheet를 추가했다. `Focus.onKeyEvent`에서 최근 key down
  event 20개를 기록하고 logical key id, physical HID usage, normalized input id, mapped action,
  timestamp를 복사할 수 있다. 실제 HID key capture로 mapping을 자동 저장하는 기능은 아직 아니다.
- 페이지 넘김 감각은 `pdfrx`의 `PdfViewerController.goToPage`/`goToArea`/`goToDest`
  duration을 사용해 없음/빠름/자연스러움으로 저장한다. 기본값은 기존 viewer 동작과 가장 가까운
  자연스러움이며, 대형 PDF나 페달 반복 입력이 민감한 곡은 없음 또는 빠름으로 낮출 수 있다.
- 세트리스트 전환은 기본적으로 확인 dialog를 띄우며, 사용자가 켠 경우 곡 마지막 페이지에서
  다음 페이지 입력을 다음 곡 이동으로 처리한다. 세트리스트 공연 중에는 실수로 악보별 마지막
  페이지가 덮어써지지 않도록 last page 저장을 보수적으로 제한한다.
- 반 페이지 넘김은 `SheetHalfPageTurnPolicy`로 orientation별 step을 계산한다. portrait는 기존에
  가까운 82%, landscape는 anchor 이탈을 줄이기 위해 66%를 사용한다. 같은 page 안에서는 top
  anchor로 viewport만 이동하고, page boundary를 넘는 경우에만 다음/이전 표시 page로 이동해
  lastPage persistence가 갱신된다.
- 세트리스트별 공연 보기 preset은 `SheetSetlist.viewerSettingsOverride`에 저장한다. display mode,
  page scale, 반 페이지 넘김, 곡 전환 확인, 곡 끝 자동 이동, 페달 mapping을 세트리스트로 열 때만
  곡별 `SheetScore.viewerSettings`보다 우선 적용하고, 곡 자체의 보기 설정은 보존한다.
- 공연 모드는 `SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky)`로 시스템 바
  방해를 줄인다. 별도 wake-lock/brightness 플러그인은 아직 추가하지 않았으므로, 화면 켜짐 유지는
  앱 내 안내와 기기 자동 잠금 설정 확인으로 처리한다.
- 자동 스크롤은 `pdfrx`의 continuous vertical layout과 `goToArea`를 사용한다. 1차는
  일정 시간 동안 시작 page top에서 끝 page bottom까지 선형 이동하는 방식이며, cue와
  pause/resume을 제공한다. Virtual page order가 있는 곡은 반복 순서를 정확히 따르지 못하므로
  자동 스크롤 시작을 막고 페달/수동 넘김을 안내한다. BPM preset은 현재 메트로놈 BPM과
  페이지당 16/32/64박 기준으로 durationSeconds를 계산한다. page별 duration은 후속으로 분리한다.
- 주석/필기 overlay는 `pdfrx`의 `pageOverlaysBuilder`를 사용해 실제 page rect 위에 붙인다.
  stroke point는 page별 normalized coordinate로 저장하고, pointer 입력과 렌더링은 page-local
  rect 기준으로 변환한다. `pdfrx`가 zoom/pan/1페이지/2페이지/세로 스크롤 layout을 처리한 뒤
  overlay도 같은 page box 안에서 이동하므로 기존 viewer-stack overlay보다 좌표 신뢰도가 높다.
- annotation layer는 현재 `SharedPreferences`에 score metadata로 저장한다. 리허설 메모 수준의
  stroke에는 충분하지만, stroke가 많아지면 SQLite 또는 file-backed annotation store로 이전해야
  한다.
- v1.1 준비로 `SheetAnnotationStorageReference`를 score metadata에 추가했다. 기본값은 inline이며,
  기존 `annotationLayer`를 그대로 읽고 저장한다. `file` mode는 external annotation JSON 파일의
  path/checksum/updatedAt/lastSaveStatus/lastSaveError를 기록할 수 있게 해 두었고, external 저장이
  실패해도 inline metadata를 잃지 않는 fallback을 전제로 한다.
- `SheetFileBackedAnnotationStore`는 file-backed store adapter 1차다. 저장/로드, missing file,
  checksum mismatch, corrupted JSON을 crash 없이 결과 객체로 돌려준다. 실제 기존 inline data의
  강제 migration은 아직 수행하지 않는다.
- 전체 백업 manifest는 external annotation file mapping을 담을 수 있다. metadata-only 백업은
  external ref metadata와 inline fallback layer를 함께 보존하는 전략으로 둔다.
- annotation 요약은 stroke/text/redo/point/estimated JSON bytes/storage mode/save status를 같은
  helper로 계산한다. 백업/export 안내와 QA debug info가 이 summary 기준을 공유한다.
- metadata 백업은 JSON으로 scores/setlists/tool settings/library view settings/global viewer action
  defaults를 저장한다. PDF 파일 bytes는 포함하지 않으므로 복원 뒤 기존 filePath가 접근 가능한지
  별도 확인이 필요하다.
- 자동 metadata 백업은 수동 export와 같은 `SheetLibraryBackup` JSON을 active library profile별
  SharedPreferences key에 저장한다. scores/setlists/metronome/tuner/library view/favorite annotation
  preset/global viewer defaults 저장 mutation 이후 최신 snapshot을 갱신하며, 프로필 비우기/삭제 시
  해당 profile snapshot도 제거한다.
- 자동 metadata 백업 복원은 파일 picker 없이 현재 active library profile의 최신 snapshot을
  `restoreMetadataBackupJson` 경로로 되돌린다. 라이브러리 백업 메뉴의 `자동 metadata 복원`에서
  명시 확인 후 실행한다. 이 snapshot도 PDF bytes를 포함하지 않으므로 전체 파일 복구는 PDF 포함 ZIP
  백업이 담당한다.
- 공유/import/export 1차는 Android-first로 시작했고, iOS document open bridge까지 보강했다.
  Android는 `ACTION_VIEW`, `ACTION_SEND`, `ACTION_SEND_MULTIPLE`의 `application/pdf`를 받아 native
  layer에서 cache file로 복사한 뒤 Flutter `MethodChannel`로 path/name을 전달한다. iOS는
  PDF document type을 등록하고 `SceneDelegate.scene(_:openURLContexts:)`와 legacy
  `AppDelegate.application(_:open:options:)`에서 PDF URL을 cache file로 복사해 같은
  `MethodChannel` payload로 전달한다.
- PDF 공유는 `share_plus` 13.3.0을 사용한다. 현재 score가 link-disabled 사본으로 교체된 경우
  현재 PDF와 원본 PDF를 공유 후보로 보여준다.
- 필기 포함 PDF 공유는 원본 PDF를 수정하지 않고 앱 내부 annotation layer를 새 PDF content로
  stamp한 임시 export 사본을 만든 뒤 공유한다. 이 사본은 앱 metadata 복원이 아니라 외부 전달용
  산출물이다.
- 이미지 PDF 변환은 Dart `pdf` 3.13.0으로 구현한다. 1차는 JPG/PNG만 지원하며, A4 portrait,
  흰 배경, 페이지당 이미지 1장, 비율 유지 정책을 사용한다. 22차 보강에서 변환된 PDF score에
  원본 JPG/PNG를 `reference` linkedFiles로 자동 보존한다. 연결 파일 목록에서 JPG/PNG는 원본
  이미지 viewer로 확대 확인할 수 있다. HEIC/HEIF는 iOS 사진 앱 흐름에서 중요하지만 pure Dart
  변환 제약이 있어 현재는 known-but-unsupported로 안내하고, 후속
  platform decode 또는 image package 검토가 필요하다.
- 표시 효과는 곡별 `SheetViewerSettings.displayEffect`로 저장한다. 1차는 일반/어두운 배경/색상
  반전을 제공한다. 색상 반전은 viewer 전체에 `ColorFiltered`를 적용하므로 PDF와 annotation
  overlay가 함께 반전된다.

## 공유/import/export 1차 구조

- 라이브러리의 `악보 추가` 버튼은 PDF 가져오기와 이미지를 PDF 악보로 묶기를 제공한다.
- `SheetLibraryStore.importPdfBytes`는 file picker, Android shared import, 테스트가 같은 내부 PDF
  사본 저장 경로를 타도록 만든다.
- Android `MainActivity`는 공유받은 PDF URI를 앱 cache의 `shared-imports/`에 복사하고, Flutter는
  이 임시 파일을 다시 앱 documents `scores/`로 복사해 score를 생성한다. 원본 shared URI와 cache
  임시 파일은 source of truth로 쓰지 않는다.
- iOS `ClefSharedImportBridge`는 security-scoped resource 접근을 시도하고, PDF URL을 cache의
  `shared-imports/`로 복사한다. Dart에는 cache path와 원본 표시 파일명을 전달해 scanner/date
  suffix 정리 로직이 정상 동작하게 한다.
- Dart shared import lifecycle은 initial shared files와 running app shared files를 모두 처리한다.
  같은 path가 중복 전달되면 한 번만 등록하고, import 중 이벤트가 들어오면 사용자에게 재시도를
  안내한다.
- 이미지 묶기는 사용자가 선택한 순서로 하나의 PDF를 생성한다. 파일 picker가 플랫폼별로 선택 순서를
  항상 보장하는지는 실기기에서 확인해야 한다.
- 파일명/제목 정리는 `SheetFileImportPolicy`에서 관리한다. `CamScanner`, `scan`, 날짜형 suffix,
  underscore/dash를 줄여 라이브러리 제목을 조금 더 읽기 좋게 만든다.
- 공유 파일명은 `작곡가 - 제목.pdf` 형식의 안전 파일명으로 만든다.
- 필기 포함 PDF 공유는 viewer 메뉴에서 실행한다. stroke와 텍스트 주석을 PDF content stream에
  stamp한 사본을 만들며, 원본 PDF와 앱 내부 annotation metadata는 그대로 보존한다.
- 1차 필기 포함 PDF export는 page cropBox 기준 normalized 좌표를 PDF 좌표로 변환한다. 텍스트는
  `pdf_document`의 base Helvetica 경로를 사용하므로 한글/비라틴 문자 font embedding은 후속이다.
  앱은 한글/비ASCII 텍스트 주석을 감지하고, 깨진 glyph를 PDF에 굽지 않도록 해당 텍스트를 제외한다.
  stroke 또는 ASCII text가 있으면 사본을 만들고 제외 개수를 안내한다. 한글 텍스트만 있는 경우에는
  원본 PDF 공유로 fallback한다.
- iOS 일반 Share Sheet에서 앱이 보이는지는 출처 앱의 document interaction/share extension 정책에
  따라 다를 수 있다. 이번 1차는 Files/document open URL bridge이며, 별도 iOS Share Extension은
  후속 검토 대상으로 둔다.
- Drive, iCloud, Dropbox 같은 cloud file provider는 별도 SDK를 붙이지 않고 system file picker와
  document open/share intent를 우선한다. provider URI가 아직 로컬에 내려받아지지 않았거나 권한이
  만료되어 접근할 수 없으면, 앱은 기기에 저장/다운로드 후 다시 가져오라는 오류 문구를 보여준다.

## 라이브러리 정렬/필터/백업 1차 구조

- `SheetScore`는 제목, 작곡가, 태그, 메모에 더해 collection, group, rating,
  linkedFiles metadata, custom key/value fields를 저장한다.
- collection은 세트리스트와 독립된 라이브러리 분류이고, group은 레슨/파트/연주회 같은
  보조 분류로 둔다.
- 여러 라이브러리는 `SheetLibraryProfile` catalog와 active profile preference로 관리한다.
  기본 라이브러리는 기존 scores/setlists/view/favorite preset key를 그대로 쓰고, 추가 profile은
  `clef_scores.<libraryId>`처럼 scoped key에 저장한다. profile 전환 시 controller는 해당 profile의
  scores/setlists/library view/favorite annotation preset을 다시 로드한다.
- 라이브러리 비우기는 악보 PDF 파일을 삭제하지 않고 profile metadata key만 지운다. 기존 폴더 직접
  참조와 profile별 파일 권한 정책은 SAF/iOS Files 권한 spike로 분리한다.
- rating은 0-5 정수로 저장하고 decode/copy 시 clamp한다.
- custom field는 악보별 `key`/`value` 문자열 목록이다. 빈 key/value와 중복 key는 저장 시
  제거하고, 검색 대상에는 key와 value가 모두 포함된다.
- linkedFiles는 한 곡에 여러 보조 파일을 연결하기 위한 모델이다. V1 완성 범위에서 role을
  추가해 full score, part, piano reduction, original, edited copy 같은 파트/버전 의미를
  저장한다. 라이브러리 metadata dialog에서 파일을 연결하고 viewer에서 PDF 연결 파일로 전환한다.
- `SheetLibraryViewSettings`에 sortMode, favoriteOnly, tagQuery, collectionQuery,
  groupQuery, minimumRating을 저장하며 library profile별로 분리된다.
- sortMode는 최근 열기, 제목, 작곡가, 별점, 가져온 날짜를 지원한다.
- 필터는 즐겨찾기, 태그 exact match, collection exact match, group exact match, 최소 별점을
  지원한다.
- 검색 query와 정렬/필터는 같은 `filteredScores` 경로에서 함께 적용하며, 검색 대상은 제목,
  작곡가, 태그, 컬렉션, 그룹, 메모, structured notes, custom field key/value다.
- 라이브러리 화면의 검색창 아래 chip bar에서 현재 정렬/필터를 조정한다.
- 라이브러리 AppBar의 전역 보기/입력 기본값 메뉴는 새로 가져오는 악보에 적용할 display mode,
  page scale, half page turn, performance keep-awake, pedal/action mapping을 저장한다. 곡별
  viewerSettings가 이미 있는 악보는 그대로 유지하고, 새 import/shared import/image import record에
  기본값을 입힌다.
- `SheetLibraryBackup`은 metadata-only JSON이다.
- 백업에는 scores metadata, setlists, metronome/tuner/tone settings, library view settings,
  global viewer action defaults가 포함된다. score 안의 viewer/page/annotation/auto scroll/PDF link
  sanitization metadata와 setlist별 viewer/action override도 함께 포함된다.
- PDF 파일 자체는 백업하지 않는다. 복원 dialog에서 이 제한을 명시한다.
- export는 `file_picker` saveFile을 먼저 시도하고, 실패하거나 취소되면 앱 내부 documents의
  `backups/` 폴더에 저장한다.
- restore는 JSON file picker로 선택한 백업을 현재 앱 metadata에 덮어쓴다. 지원하지 않는 version,
  invalid JSON, restore error는 crash 없이 안내한다.
- `SheetLibraryFullBackup`은 `clef-backup.json` manifest와 `scores/` PDF 파일을 ZIP으로 묶는다.
  metadata-only 백업 경로는 유지하고, PDF 포함 전체 백업은 별도 메뉴로 제공한다.
- 전체 백업 복원은 ZIP manifest의 score id별 file mapping을 앱 내부 documents `scores/` 폴더에
  새로 쓰고, score metadata의 filePath를 복원된 내부 경로로 다시 매핑한다. export 시 파일이
  이미 사라진 악보는 manifest에 missing으로 기록하고 metadata만 유지한다.
- 기존 폴더 직접 참조는 아직 구현하지 않는다. Android에서는 Storage Access Framework의
  persistent permission, iOS에서는 security-scoped resource와 Files provider 동작 차이를 따로
  검증해야 한다. 자세한 V1 후속 설계는
  [`docs/architecture/clef-v1-library-organization.md`](clef-v1-library-organization.md)에 둔다.

## PDF 링크 정리 1차 구조

- viewer에서는 `pdfrx` link handling으로 외부 URL tap을 차단하고, 내부 destination link는
  유지한다.
- 링크 영역 표시는 viewer action으로 켜고 끌 수 있다.
- 제거 사본 생성은 viewer의 페이지 정리 메뉴에서 실행한다.
- 실행 전 confirm dialog에서 원본 PDF를 보존하고 visible watermark를 제거하지 않는다는 점을
  안내한다.
- `SheetPdfLinkSanitizer`는 `pdf_document` 3.7.0으로 PDF를 열고 page별
  `PdfLinkAnnotation`을 검사한다.
- 제거 대상은 `PdfUriAction`을 가진 URL link annotation이다.
- 내부 `PdfGoToAction` link와 알 수 없는 link action은 제거하지 않는다.
- URL link가 없으면 사본 파일을 만들지 않고 “제거할 외부 URL 링크가 없음”으로 안내한다.
- URL link가 있으면 앱 내부 `scores/` 폴더에 정리된 사본을 저장하고, 현재 score의 `filePath`를
  새 사본 경로로 교체한다.
- score id, 북마크, 세트리스트 참조, 필기 metadata는 유지한다.
- `SheetScore.pdfLinkSanitization`에는 이전 파일 경로, 제거 URL link 개수, 생성 시각을 저장한다.
- 원본 PDF의 page content stream이나 visible watermark 이미지/텍스트는 수정하지 않는다.

## 북마크/세트리스트 1차 구조

- 북마크는 `SheetScore.bookmarks`에 pageNumber, label, createdAt으로 저장한다.
- 북마크 label은 자동으로 `N쪽`으로 생성하고, 목록에서 rename/delete할 수 있다.
- 빈 이름으로 저장하면 다시 `N쪽`으로 fallback한다.
- 세트리스트는 `SheetSetlist` 별도 모델로 저장한다.
- 세트리스트는 ordered score id list이며, 앱 load 시 삭제된 score 참조를 제거한다.
- 세트리스트에 악보를 추가할 때 제목, 작곡가, 태그, 메모 검색을 사용한다.
- 세트리스트 목록/상세에서 첫 곡을 바로 열 수 있다.
- 세트리스트 안에서 viewer를 열면 같은 setlist context를 유지하고, AppBar의 이전/다음 곡
  버튼으로 곡 단위 이동을 지원한다. viewer title 아래에는 `세트리스트 이름 · 2/8` 형식의
  현재 위치를 표시한다.

## 보기/공연 모드 1차 구조

- 보기 모드와 반 페이지 넘김은 `SheetScore.viewerSettings`에 곡별로 저장한다.
- 넓은 화면 기본값은 `1페이지`이며, `pdfrx`의 `layoutPages`로 페이지를 가로 배치한다.
- iPhone 같은 좁은 화면 기본값은 `세로 스크롤`로 둔다. 276페이지 PDF smoke test에서
  1페이지 가로 배치가 옆 페이지를 일부 노출하고 AppBar 여백을 압박했기 때문이다.
- 저장된 곡별 보기 설정이 `2페이지`여도 좁은 화면에서는 `세로 스크롤`로 fallback한다.
- `1페이지` 가로 배치는 페이지 사이 간격을 넓혀 옆 페이지 노출을 줄인다.
- `2페이지` 보기는 넓은 화면 전용으로 제공한다. `pdfrx.layoutPages`로 첫 페이지를 단독
  spread로 두고, 이후 `2-3`, `4-5`처럼 두 페이지씩 나란히 배치한다.
- 좁은 화면에서는 `2페이지` 선택 항목을 비활성화한다. iPhone에서 두 페이지가 지나치게
  축소되어 악보 판독성이 떨어지는 것을 막기 위한 정책이다.
- `세로 스크롤`은 `pdfrx` 기본 세로 연속 layout을 사용한다.
- 반 페이지 넘김은 곡별 toggle로 저장한다. 켜져 있으면 하단 이전/다음 버튼이
  현재 visible viewport를 기준으로 페이지 안에서 약 82% 높이만큼 이동하고, 페이지 끝에서는
  숨김 페이지를 건너뛰어 이전/다음 표시 페이지로 넘어간다.
- 반 페이지 넘김은 `2페이지` 보기와 동시에 사용하지 않는다. `2페이지` 전환 시 자동으로
  꺼지고, `2페이지` 상태에서는 메뉴 항목을 비활성화한다.
- orientation별 half-page step과 page boundary persistence는 1차 구현했다. zoom level별 더 정밀한
  상단/하단 anchor 보정은 후속 spike로 분리한다.
- 공연 모드는 viewer session local 상태로 둔다.
- 공연 모드 ON 시 북마크 편집, 보기 모드, PDF 링크 영역 표시 같은 관리 action을 숨기고
  페이지 컨트롤 크기를 키운다.
- 세트리스트 이전/다음 곡 이동과 페이지 컨트롤은 공연 모드에서도 유지한다.
- 좁은 화면 viewer AppBar는 뒤로가기, 현재 페이지 북마크, 세트리스트 이전/다음 곡,
  페이지 카운트를 우선 노출하고 북마크 목록, 보기 모드, PDF 링크 영역 표시, 공연 모드는
  overflow menu로 묶는다.
- 일반 모드 하단 페이지 컨트롤은 4초 후 자동으로 fade out하고 화면 터치 시 다시 표시한다.
  공연 모드에서는 큰 페이지 컨트롤을 계속 표시한다.

## 자동 스크롤/곡별 연주 설정 1차 구조

- `SheetScore.autoScrollSettings`에 곡별 자동 스크롤 설정을 저장한다.
- 저장 필드는 durationSeconds, startPage, endPage, cueSeconds다.
- 기본 duration은 240초이며, 설정은 30-3600초 범위로 clamp한다.
- BPM preset은 현재 메트로놈 BPM과 페이지당 16/32/64박 기준으로 durationSeconds를 계산한다.
- endPage가 0이면 문서 끝으로 해석한다. UI에서는 현재 문서 pageCount 안으로 normalize해
  저장한다.
- 자동 스크롤은 세로 스크롤 보기에서만 실행한다. 다른 보기 모드에서 시작하면 세로 스크롤로
  전환하고 반 페이지 넘김은 끈다.
- 시작 시 필기 모드는 자동으로 꺼진다. PDF pan/zoom pointer 입력과 자동 이동이 충돌하는 것을
  피하기 위한 정책이다.
- 진행은 500ms tick으로 계산하고 `PdfViewerController.goToArea`를 사용해 현재 visibleRect를
  이동한다.
- hidden page가 있으면 목표 page 계산은 숨김 페이지를 가장 가까운 표시 페이지로 보정한다.
  실제 scroll distance는 원본 PDF layout 기준이므로 숨김 page 영역을 완전히 제거하지는 않는다.
- 페이지 끝 또는 설정한 endPage에 도달하면 자동 정지한다.
- 하단 페이지 버튼, keyboard/pedal page turn, 보기 변경, 반 페이지 toggle, 필기 시작, 페이지
  숨김 같은 수동 조작이 들어오면 자동 스크롤을 정지한다.
- 공연 모드에서는 관리 action은 숨기되 자동 스크롤 start/stop 진입점은 유지한다.
- 메트로놈 BPM 기반 duration preset과 cue/pause/resume은 1차 구현했다. pause marker와 반복
  구간 진행은 후속이다.

## 페이지 정리 1차 구조

- `SheetScore.pageSettings`에 hiddenPages, pageRotations, global crop, virtual page order,
  jump points를 저장한다.
- 원본 PDF 파일은 기본적으로 수정하거나 재저장하지 않는다. 사용자가 명시적으로 선택하면 앱 내부
  적용 사본을 만들고, 적용 전 PDF는 연결 파일 metadata로 보존한다.
- 현재 페이지 숨김은 AppBar의 페이지 정리 메뉴에서 실행한다.
- 모든 페이지를 숨기는 상태는 허용하지 않는다.
- 현재 페이지를 숨기면 가장 가까운 다음 표시 페이지로 이동하고, 다음 페이지가 없으면 이전
  표시 페이지로 이동한다.
- 일반 이전/다음 페이지와 반 페이지 넘김은 hiddenPages를 건너뛴다.
- 마지막 페이지 저장은 실제 PDF page number 기준으로 유지한다.
- 페이지 카운트는 원본 PDF 기준으로 표시하고, 숨김 페이지가 있으면 `숨김 N` 보조 label을
  함께 표시한다.
- 숨김 페이지 관리는 bottom sheet에서 제공하며, 숨김 해제 후 해당 원본 페이지로 이동한다.
- 페이지 순서 변경은 기본적으로 virtual page order metadata로 저장한다. 사용자가 명시적으로
  실행하면 hidden/order/duplicate/blank insertion metadata를 실제 PDF page tree에 적용한 앱
  내부 사본을 생성한다.
- jump point는 source page에서 target page로 이동하는 앱 내부 링크다. 숨김 page를 source나
  target으로 삼는 jump point는 표시/추가하지 않는다.
- 회전은 page별 90도 단위 metadata를 저장한다. 현재 viewer 경로에서는 metadata만으로 page별
  live 렌더 rotation을 주입하지 않고, 사용자가 선택하면 회전 metadata를 적용한 앱 내부 PDF
  사본을 생성한다. 원본 PDF는 연결 파일 metadata에 `회전 적용 전 원본`으로 보존한다.

## 연주 보조/외부 입력 1차 구조

- 메트로놈 설정은 앱 전역 `SheetMetronomeSettings`로 저장한다.
- 저장 필드는 BPM과 박자다. BPM은 40-240 범위로 clamp한다.
- 지원 박자는 `2/4`, `3/4`, `4/4`, `6/8`이다.
- 1차 메트로놈은 viewer bottom sheet로 제공하고, 공연 모드에서도 열 수 있다.
- 현재 구현은 visual metronome이다. 첫 박은 accent color로 표시하고, 현재 beat와 마지막 beat
  시각을 보여준다.
- 메트로놈 tick은 기본 OFF `SystemSoundType.click`으로 제공한다. accent/normal beat 전용 asset과
  low-latency audio package 선택은 별도 검증 후 붙인다.
- 기준음/드론 설정은 앱 전역 `SheetToneSettings`로 저장한다. root concert MIDI note, drone
  mode, volume percent를 저장하고, 실제 재생은 Android `clef/tone_player` MethodChannel과
  native `AudioTrack` sine stream을 사용한다. iOS/미지원 플랫폼에서는 playback channel 없음으로
  안내한다.
- 로컬 오디오 플레이어는 악보별 `SheetLinkedFile`에 `mp3`, `wav`, `m4a`, `aac`, `flac`, `ogg`
  파일을 저장하고, viewer의 파트/버전 sheet에서 `clef/audio_player` MethodChannel을 통해 Android
  `MediaPlayer`로 연다. 별도 loop/tempo/pitch shift는 V2 범위다.
- 하드웨어 키 입력은 viewer body를 `Focus`, `Shortcuts`, `Actions`로 감싸 처리한다.
- 기본 매핑은 `ArrowRight`, `PageDown`, `Space`가 다음 페이지, `ArrowLeft`, `PageUp`,
  `Shift+Space`가 이전 페이지다.
- 키 입력은 하단 페이지 버튼과 같은 `_goToRelativePage` 경로를 사용한다. 따라서 반 페이지
  넘김과 hidden page skip 정책을 그대로 따른다.
- 세트리스트별 공연 보기 preset은 리허설 sheet에서 켜고 끈다. 켜면 보기 모드, page scale,
  반 페이지 넘김, 곡 전환 확인, 곡 끝 자동 이동, 페달 mapping이 세트리스트 context에만 적용된다.
- 세트리스트 마지막 페이지에서 자동으로 다음 곡으로 넘어가는 기능은 기본 OFF이며, 곡별 설정 또는
  세트리스트 preset에서 명시적으로 켠 경우에만 동작한다. 현재는 반복 구간/세트리스트 전체 자동
  진행 scheduler와는 연결하지 않는다.

## 튜너 1차 구조

- 튜너 설정은 앱 전역 `SheetTunerSettings`로 저장한다.
- 저장 필드는 A4 기준음, 표시 모드, 감지 profile, 선택 target MIDI이며, 기본값은 440Hz /
  `Concert` / `Chromatic` / target 없음이다.
- A4 기준음은 415-466Hz 범위로 clamp한다.
- 표시 모드는 `Concert`, Bb 악기, Eb 악기, Horn in F, bass clef/low instruments,
  violin/viola/cello/double bass, guitar/bass guitar를 제공한다. 감지된 frequency는 계속
  concert pitch로 계산하고, 표시 layer에서 written pitch로 transpose한다. 혼동을 줄이기 위해
  written pitch와 concert pitch를 함께 표시한다.
- 감지 profile은 `Chromatic`, `Bb Trumpet`, high winds/brass, low instruments, strings,
  guitar/bass를 제공한다. 표시 모드는 음 이름 표기 방식이고, 감지 profile은 detector range와
  안정화 threshold 정책이다.
- `SheetTunerPitch.detect`는 입력 frequency를 가장 가까운 chromatic note와 cents offset으로
  변환한다. 테스트 기준은 A4 440Hz, A#4 466.16Hz, C4 261.63Hz다.
- `SheetTunerPitchDetector`는 PCM16 mono sample을 4096 sample rolling window에 모아
  autocorrelation으로 pitch를 추정한다. Chromatic profile은 70-1200Hz, Bb Trumpet profile은
  concert E3-C6 중심 range를 사용한다.
- `SheetTunerInputService`는 `record` 7.1.1의 `AudioRecorder.hasPermission`과
  `AudioRecorder.startStream`을 사용한다. Stream 설정은 `pcm16bits`, mono, 44.1kHz,
  `streamBufferSize: 4096`이다.
- `SheetTunerReadingStabilizer`는 최근 5개 reading의 median frequency를 사용하고, 낮은
  confidence reading을 무시하며, profile별 no signal debounce 후 표시한다. 짧은 octave
  jump는 직전 안정 reading 근처로 접고, boundary 근처 note hysteresis로 label 깜빡임을
  줄인다.
- viewer AppBar와 좁은 화면 overflow menu에 튜너 진입점을 제공한다.
- 튜너는 viewer bottom sheet로 열리며, 공연 모드에서도 열 수 있다.
- 1차 UI는 현재 음 이름, 악기별 표시 profile, 감지 profile, concert pitch 보조 표시,
  target shortcut, cents meter, A4 기준음 slider, start/stop, signal/confidence 상태를 제공한다.
  Listening이 아닐 때는 테스트 주파수 slider로 visual tuner 계산을 확인할 수 있다.
- Android에는 `RECORD_AUDIO`, iOS에는 `NSMicrophoneUsageDescription`을 추가했다.
- permission denied, no signal, audio pipeline unavailable/error 상태는 crash 없이 안내한다.
- bottom sheet가 닫히면 stream subscription, recorder, detector를 정리한다.
- 패키지 선택과 남은 실기기 검증 항목은
  [`docs/architecture/sheet-viewer-tuner-spike.md`](sheet-viewer-tuner-spike.md)에 정리한다.

## 주석/필기 1차 구조

- `SheetScore.annotationLayer`에 앱 내부 annotation metadata를 저장한다.
- 원본 PDF 파일은 수정하거나 재저장하지 않는다.
- stroke 모델은 id, pageNumber, tool, color, width, normalized points, createdAt을 가진다.
- point는 x/y 모두 0.0-1.0 범위의 page normalized coordinate로 저장한다.
- `pdfrx` 조사 결과:
  - `PdfViewerController`는 현재 pageNumber, pageCount, visibleRect, pageLayouts,
    currentZoom, localToDocument/documentToLocal 변환 API를 제공한다.
  - `PdfViewerParams.pageOverlaysBuilder(context, pageRect, page)`는 page별 overlay를 실제
    viewer page rect 위에 배치한다.
  - drag stroke처럼 raw pointer stream이 필요한 입력은 overlay 내부 `GestureDetector`가
    pointer를 받는 방식이 가장 단순하다. 이 동안 PDF pan/zoom은 의도적으로 잠근다.
- 필기 overlay는 viewer 전체가 아니라 `pageOverlaysBuilder`에서 각 page rect 안에
  `Positioned.fill`로 렌더링한다.
- pointer 위치가 page overlay 내부일 때만 normalized point로 저장한다. page box 바깥 입력은
  무시한다.
- 렌더링은 normalized point를 page-local offset으로 환산해 그린다. 따라서 확대/축소/이동,
  1페이지 가로 layout, 2페이지 spread, 세로 스크롤에서 page와 annotation이 같이 움직인다.
- 지원 도구는 펜, 형광펜, 화살표, 사각형, 텍스트, 스탬프, 지우개다. undo/redo와 favorite tool
  preset을 제공한다.
- 텍스트 주석은 id, pageNumber, normalized position, text, color, fontSize, createdAt을 저장한다.
- 텍스트 도구를 선택한 뒤 page를 탭하면 입력 dialog를 띄우고, 입력한 텍스트를 해당 page 위치에
  렌더링한다.
- v1 RC에서는 annotation metadata를 기존 `SharedPreferences` 기반 score JSON에 유지한다.
  저장 안정성 보강은 stroke/text/point/redo 요약, export/backup 전 용량 안내, redoStack compact,
  저장 실패 snackbar 안내로 제한한다.
- v1.1 후보: SQLite 또는 file-backed annotation store migration, 실제 PDF annotation 표준
  embed/export, 큰 annotation layer의 incremental save 전략. v1에서는 원본 PDF와 기존 metadata
  구조를 흔들지 않는다.
- 텍스트 도구 상태에서 기존 텍스트 주석을 탭하면 수정/삭제 bottom sheet를 연다. 빈 문자열로
  수정하면 삭제로 처리한다.
- 지우개는 stroke 단위 hit-test 삭제로 구현한다. 1차 hit-test는 normalized segment distance와
  현재 도구 두께 기반 tolerance를 사용한다.
- 필기 모드 ON 상태에서는 해당 page overlay가 pointer를 받고, PDF pan/zoom 제스처는 잠시
  잠긴다. 일반 모드로 돌아가면 overlay는 paint만 하고 pointer는 PDF viewer가 다시 받는다.
- 2페이지 모드와 세로 스크롤 모드도 page별 overlay 렌더링을 사용한다. 필기 입력은 사용자가
  실제로 누른 pageNumber에 저장되며, draft stroke도 해당 page에만 표시된다.
- 저장은 stroke 종료 시점과 지우개 삭제 시점에 수행한다.
- 색상은 검정, 빨강, 파랑, 노랑 4종을 제공한다.
- 두께는 slider로 선택한다.
- 현재 페이지 마지막 stroke/text annotation undo를 제공한다.
- 공연 모드에서는 필기 모드를 자동으로 끄고 toolbar를 숨긴다.
- 필기 포함 PDF 공유는 별도 export 사본 생성으로 1차 지원한다. PDF 표준 annotation 객체로
  embed/export하거나, 앱 내부 annotation layer를 다시 편집 가능한 형태로 외부 PDF에 싣는 기능은
  후속이다.
- 텍스트 주석의 advanced style, 선택 이동/resize는 후속이다.
- 남은 리스크는 stylus pressure, palm rejection, PDF annotation embed 고도화, 대량 annotation 저장
  성능, 한글 PDF text font embedding, page별 rotation metadata를 실제 렌더링 transform에 반영하는
  부분이다.

## V1 뷰어 표시/페이지 정리 보강

- `SheetViewerSettings.displayEffect`는 곡별 저장이며 기본값은 `normal`이다. 좁은 화면에서도
  overflow menu에서 일반/어두운 배경/색상 반전을 선택할 수 있다.
- `SheetViewerSettings.pageScale`은 `fitPage`, `fitWidth`, `fullscreen` 중 하나로 저장한다.
  `fitWidth`는 현재 page width 기준 initial zoom을 계산하고, `fullscreen`은 viewer의 cover zoom을
  사용한다.
- `SheetViewerSettings.renderProfile`은 균형/대형 PDF preset을 저장한다. 대형 PDF preset은
  렌더 캐시와 one-pass threshold를 보수적으로 낮춰 페이지 넘김 중 blank render 가능성을 줄이는
  방향이다.
- `SheetPageSettings.crop`은 top/bottom/left/right normalized margin을 가진다. 각 margin은
  0.0-0.5 범위로 clamp하고, 가로/세로 합계가 0.8을 넘으면 비율을 유지한 채 줄인다.
- crop은 기본적으로 원본 PDF나 PDF page box를 변경하지 않는다. 1차는 악보 여백을 화면에서
  가려 보며, crop-to-fit 실행 시 crop 영역을 page rect로 계산해 해당 영역으로 이동/확대한다.
  사용자가 명시적으로 실행하면 crop metadata를 PDF CropBox로 적용한 앱 내부 사본을 생성한다.
- 회전 metadata는 page별 90/180/270도를 저장하고 page 위 badge와 viewer 상단 pending action으로
  상태를 표시한다. 실제 회전이 필요한 경우 `pdf_document` 기반 회전 적용 사본 생성으로 처리한다.
- 페이지 순서 변경/복제/반복 삽입은 기본적으로 원본 PDF를 재작성하지 않는 virtual page order로
  구현한다. 사용자가 명시적으로 실행하면 실제 PDF page tree 적용 사본을 만들고, 북마크/필기/redo
  stack/page별 crop/rotation/jump/rehearsal metadata를 새 page number로 재배치한다. 별도
  per-instance crop/rotation override는 후속이다.
- 북마크/필기/세트리스트는 적용 사본 생성 전에는 source page 기준을 유지하고, 공연 순서만
  virtual page order를 참조한다. 자동 스크롤은 source page 구간 기반이므로 custom virtual
  order가 있는 곡에서는 비활성화한다. instance별 다른 필기가 필요해지는 순간 annotation key
  정책을 분리한다.

## 베타 전달 polish

- 라이브러리 AppBar의 `테스트 정보`에서 앱 이름, version/build, 주요 QA 항목, 피드백에 포함할
  정보를 확인할 수 있다.
- `테스트 정보`는 Flutter 기본 `Clipboard`로 피드백 템플릿을 복사한다. 템플릿에는 앱
  version/build, 기기/OS, PDF 종류/페이지 수, 재현 단계, 기대/실제 결과, 오류 문구가 포함된다.
- version/build는 1차에서 `pubspec.yaml`의 `1.0.0+1`과 맞춘 compile-time constant로 표시한다.
  package metadata 자동 읽기는 후속으로 분리한다.
- 빈 라이브러리 화면은 PDF/JPG/PNG 가져오기 진입점과 테스트 항목 진입점을 제공한다.
- 검색어 또는 즐겨찾기/태그 필터 때문에 목록이 비면 `검색/필터 초기화` 액션을 제공한다.
- 주요 실패 문구는 테스터가 그대로 전달할 수 있게 다음 행동을 포함한다.
  - PDF import 실패: PDF 파일 여부와 외부 앱 접근 위치 확인.
  - 공유 PDF 파일 없음: 다시 가져오기 또는 전체 백업 복원.
  - viewer open 실패: 파일 삭제/손상 가능성과 다시 가져오기/복원.
  - PDF link 제거 실패: 원본 PDF는 유지됨.
  - 필기 포함 PDF export 실패: 원본 PDF와 앱 안 필기는 유지됨.
- 외부 테스터 체크리스트는 [`docs/qa/clef-tester-checklist.md`](../qa/clef-tester-checklist.md)에
  둔다.
- 베타 피드백 요청 메시지는
  [`docs/qa/clef-beta-feedback-message.md`](../qa/clef-beta-feedback-message.md)에 둔다.
- 배포 설정 점검:
  - Android applicationId/namespace는 `com.mannlab.clef`다.
  - Android는 `RECORD_AUDIO`, PDF `VIEW`/`SEND`/`SEND_MULTIPLE` intent-filter를 선언한다.
  - iOS Bundle ID는 `com.mannlab.inc.clef`, provisioning profile specifier는 `Clef`다.
  - iOS는 `public.pdf`/`com.adobe.pdf` document type과 `NSMicrophoneUsageDescription`을 선언한다.

## iOS smoke test 범위

- Android-first 제품 방향은 유지한다.
- iOS scaffold는 Flutter 기반 smoke test와 빠른 UX 확인을 위한 보조 타깃이다.
- 2026-08-21 iPhone 16 Pro / iOS 18.4 Simulator에서 276페이지 PDF import, open, render,
  page move를 수동 확인했다.
- PDF fixture를 Simulator에 넣을 때 `xcrun simctl addmedia`는 사진/동영상 중심이라 PDF
  import에는 적합하지 않다. 현재 수동 절차는 Simulator 창에 PDF를 drag-and-drop하거나
  Files 앱에서 접근 가능한 위치를 열고 앱의 PDF picker로 선택하는 방식이다.
- iOS smoke test는 UI/PDF viewer 회귀 확인용이며, Android Storage Access Framework,
  Galaxy Tab 성능, Bluetooth 페달 검증을 대체하지 않는다.

## 후속 분리 기능

- PDF link annotation 고도화: URL link 제거 사본 생성은 1차 구현했다. 실제 CamScanner 샘플,
  malformed PDF, compact/rewrite 방식의 완전한 object 제거는 추가 검증이 필요하다.
- 주석/필기 고도화: S Pen pressure, palm rejection, 도형/stamp, layer visibility,
  PDF embed/export 별도 spike 필요. 기본 stroke/text layer, text edit/delete와 page rect 기반
  overlay는 구현했다.
- 튜너 고도화: runtime microphone permission request와 raw PCM stream은 1차 구현했다.
  Median smoothing과 no-signal debounce도 1차 적용했다. Android 태블릿 실기기 pitch 정확도,
  latency, 추가 noise smoothing, YIN 비교, 외부 microphone 동작은 후속 검증이 필요하다.
- 메트로놈 오디오: timer/audio latency, tick sound asset/package, background 정책 확인 필요.
- 자동 스크롤 고도화: cue, pause/resume, BPM 기반 duration preset은 1차 구현했다. pause
  marker, 반복 구간, 세트리스트 전체 자동 진행은 후속이다.
- 공연 preset override: 세트리스트별 viewer/action override 저장, 복제, 백업/복원, viewer runtime
  적용을 1차 구현했다. 공연별 preset template 공유와 장비별 preset 추천은 후속이다.
- Bluetooth/USB 페달 고급 설정: 표준/반전/세트리스트 경계 이동 preset은 1차 구현했다. 실제 HID
  key mapping, 앱 foreground focus는 실기기 확인 필요하다. 사용자별 custom mapping UI와 input
  diagnostic log는 1차 구현했다.
- 페이지 크롭/정렬/복제: crop metadata, 화면 mask, crop-to-fit, 원본 PDF 보존형 virtual page
  order, 페이지 순서 변경/복제/반복 삽입, jump point, 회전/crop/page tree 적용 사본 생성은
  1차 구현했다. per-instance crop/rotation override는 후속이다.
- 카메라 PDF 스캔: edge detection, perspective correction, batch scan, 압축/품질 설정까지
  요구되어 별도 스캐너 앱 수준의 UX가 필요하다. MVP는 앱 내 스캔보다 외부 스캔 앱/사진 앱/파일
  앱에서 만든 PDF와 이미지를 악보로 잘 다루는 방향을 우선한다.
- ChordPro/text 파일 보기, HEIC 이미지 변환, 클라우드 동기화, 계정/서버 저장은 MVP 검증 후
  확장한다. metadata-only 로컬 백업/복원과 save mutation 기반 자동 metadata snapshot은 1차 구현했다.

수동 확인 절차:

공유/import/export는 별도 체크리스트
[`docs/qa/clef-share-import-export-qa.md`](../qa/clef-share-import-export-qa.md)를 함께 사용한다.

1. PDF 2개 이상을 import한다.
2. 라이브러리 카드의 편집 버튼에서 제목, 작곡가, 태그, 메모를 수정하고 검색에 반영되는지
   확인한다.
3. 라이브러리 검색창 아래 chip bar에서 최근 열기/제목/작곡가/가져온 날짜 정렬과 즐겨찾기/태그
   필터가 함께 적용되는지 확인한다.
4. metadata 백업을 export하고, 복원 dialog가 PDF 파일 제외 정책을 안내하는지 확인한다.
5. PDF 포함 전체 백업을 export하고 ZIP 저장 picker 또는 내부 fallback 안내가 동작하는지
   확인한다.
6. 전체 백업 복원 dialog가 현재 데이터를 덮어쓴다는 점을 안내하고, 복원 후 PDF 파일도 앱 내부
   경로에서 열리는지 확인한다.
7. viewer에서 현재 페이지를 북마크하고, 북마크 목록에서 rename/delete와 페이지 이동을
   확인한다.
8. 세트리스트를 만들고 검색으로 악보를 2개 이상 추가한다.
9. 세트리스트 상세 화면에서 악보 순서를 위/아래 버튼으로 바꾼다.
10. 세트리스트 목록/상세의 첫 곡 열기 버튼으로 viewer에 진입한다.
11. viewer AppBar에서 세트리스트 이름과 현재 순서가 보이는지 확인한다.
12. viewer AppBar의 이전/다음 곡 버튼으로 이동한다.
13. 보기 모드를 1페이지/세로 스크롤로 전환하고 페이지 이동이 유지되는지 확인한다.
14. 공연 모드를 켜서 관리 action이 숨겨지고 페이지 컨트롤이 커지는지 확인한다.
15. iPhone 폭에서 북마크 목록, 보기 모드, PDF 링크 표시, 공연 모드가 overflow menu에
    묶이는지 확인한다.
16. 일반 모드 하단 페이지 컨트롤이 자동으로 사라지고 화면 터치 시 다시 표시되는지 확인한다.
17. 넓은 화면에서 보기 모드를 `2페이지`로 전환하고 첫 페이지 단독, 이후 2장 spread가
    배치되는지 확인한다.
18. 좁은 화면에서 `2페이지` 보기 항목이 비활성화되는지 확인한다.
19. `반 페이지 넘김`을 켜고 하단 이전/다음 버튼이 페이지 안 viewport와 페이지 경계를
    오가는지 확인한다.
20. 보기 모드와 반 페이지 넘김을 변경한 뒤 viewer를 나갔다 다시 열어 곡별 설정이 복원되는지
    확인한다.
21. 페이지 정리 메뉴에서 현재 페이지를 숨기고 이전/다음 이동이 숨김 페이지를 건너뛰는지
    확인한다.
22. 숨김 페이지 관리에서 숨김을 해제하고 해당 페이지로 이동하는지 확인한다.
23. 현재 페이지 회전 metadata를 여러 번 저장해 90/180/270/기본 방향으로 순환하는지 확인한다.
24. 자르기 표시에서 위/아래/왼쪽/오른쪽 margin을 조정하고 화면에서 여백이 가려지는지 확인한다.
25. 보기 옵션에서 어두운 배경/색상 반전을 선택하고 곡을 다시 열어 설정이 복원되는지 확인한다.
26. PDF 링크 제거 사본 만들기를 실행해 원본 보존 안내 dialog와 진행 표시를 확인한다.
27. 링크 fixture에서는 제거 사본으로 교체되고, 링크가 없는 PDF에서는 변경 없이 안내되는지
    확인한다.
28. viewer에서 메트로놈을 열고 BPM, 박자, 시작/정지, accent beat 표시를 확인한다.
29. viewer에서 자동 스크롤을 열고 duration, 시작/끝 페이지를 조정한 뒤 시작한다.
30. 자동 스크롤이 세로 스크롤 보기로 전환되어 진행되고, 페이지 끝 또는 endPage에서 정지하는지
    확인한다.
31. 자동 스크롤 중 하단 페이지 버튼, Space/Arrow key 입력, 보기 모드 변경을 하면 자동
    스크롤이 정지하는지 확인한다.
32. viewer를 나갔다 다시 열어 곡별 자동 스크롤 설정이 복원되는지 확인한다.
33. viewer에서 튜너를 열고 A4 기준음, 테스트 주파수, note/cents meter가 갱신되는지 확인한다.
34. 튜너 start를 눌러 microphone permission prompt와 listening/no signal/error 상태가 crash 없이
    표시되는지 확인한다.
35. `ArrowRight`, `PageDown`, `Space`로 다음 페이지가 이동하는지 확인한다.
36. `ArrowLeft`, `PageUp`, `Shift+Space`로 이전 페이지가 이동하는지 확인한다.
37. 공연 모드에서 자동 스크롤/메트로놈/튜너 진입점과 키보드/페달 페이지 넘김이 유지되는지
    확인한다.
38. viewer에서 필기 모드를 켜고 펜/형광펜으로 stroke를 남긴 뒤 페이지를 나갔다 다시 열어
    복원되는지 확인한다.
39. 텍스트 도구로 page를 탭해 텍스트 주석을 추가하고, 기존 텍스트를 다시 탭해 수정/삭제가
    되는지 확인한다.
40. 지우개로 stroke 단위 삭제가 되는지 확인한다.
41. 색상, 두께, 마지막 필기 취소가 stroke/text 모두에 적용되는지 확인한다.
42. 확대/이동 후 필기 stroke와 텍스트가 PDF page와 함께 움직이는지 확인한다.
43. 2페이지 보기와 세로 스크롤에서 각 page에 남긴 annotation이 해당 page 위에만 표시되는지
    확인한다.
44. 필기/텍스트가 있는 악보에서 `필기 포함 PDF 공유`를 실행하고, 공유된 PDF 사본에 stroke/text가
    보이는지 확인한다.
45. 한글 텍스트 주석이 포함된 악보를 `필기 포함 PDF 공유`할 때 확인 안내가 표시되는지 확인한다.
46. 필기가 없는 악보에서 `필기 포함 PDF 공유`가 원본 공유로 fallback하는지 확인한다.

2026-08-21 2차 구현 검증 시점에도 연결된 Android emulator/device가 없어 수동 실행 검증은
진행하지 못했다. `flutter build apk --debug`, `flutter build appbundle`, `flutter build apk`로
Android debug APK, release AAB, release APK 생성은 확인했다. 현재 release 빌드는 별도
스토어 서명 설정이 아니라 기본 Android/Flutter signing 설정을 사용하므로 Play Console 제출
전 release signing 구성이 필요하다.

2026-08-21 3차 UX 보강 중 iOS Simulator 재실행에서 Xcode build는 성공했으나 설치 직전
Simulator가 Shutdown 상태로 바뀌어 launch가 한 차례 실패했다. 같은 날 이전 수동 smoke
test에서는 앱 첫 화면과 276페이지 PDF viewer가 정상 렌더링됐다.

2026-08-21 5차 보강 검증에서 `flutter devices` 기준 Android emulator/device는 연결되어
있지 않았다. iPhone 16 Pro / iOS 18.4 Simulator에서는 `flutter run`으로 앱 launch와 첫
화면 렌더링을 확인했다. PDF 열기 후 숨김/회전 메뉴의 수동 조작은 Android 태블릿 또는
추가 simulator manual pass에서 이어서 확인한다.

2026-08-21 주석/필기 좌표 보강 검증에서도 Android emulator/device는 연결되어 있지 않았다.
iPhone 16 Pro / iOS 18.4 Simulator에서는 `flutter run`으로 앱 launch와 첫 화면 렌더링을
확인했다. page overlay 기반 필기 stroke의 실제 악보 위 수동 입력 검증은 Android 태블릿 또는
PDF를 넣은 simulator manual pass에서 이어서 확인한다.

2026-08-22 튜너 1차 검증에서도 Android emulator/device는 연결되어 있지 않았다. iPhone 16 Pro /
iOS 18.4 Simulator를 부팅해 `flutter run`으로 앱 launch와 첫 화면 렌더링을 확인했다.
`simctl io`는 tap 입력을 제공하지 않아 튜너 bottom sheet 진입 자동 검증은 생략했고, PDF를
열어 튜너 버튼을 누르는 수동 확인은 Android 태블릿 또는 simulator manual pass에서 이어서
확인한다.

2026-08-22 튜너 microphone pipeline 1차 검증에서는 `record` 7.1.1 dependency를 추가하고
PCM16 stream, autocorrelation detector, runtime permission 상태 UI를 연결했다. Synthetic sine
test에서 A4 440Hz와 C4 261.63Hz가 기대 음 근처로 탐지되는 것을 확인했다. `flutter analyze`,
`flutter test`, `flutter build apk --debug`, `flutter build appbundle`, `flutter build apk`가
통과했고, iPhone 16 Pro / iOS 18.4 Simulator에서 앱 launch와 첫 화면 렌더링을 확인했다.
Android emulator/device는 연결되어 있지 않아 실제 microphone permission prompt, 입력 정확도,
latency, no signal 상태는 Android 태블릿에서 추가 확인해야 한다.

2026-08-22 Android 태블릿 실기기 검증 시도에서는 `flutter devices`와 `adb devices` 기준 연결된
Android device/emulator가 없었다. 대신 튜너 안정화 1차로 최근 5개 reading median smoothing,
낮은 confidence reading 무시, 4 frame no-signal debounce를 추가했다. `flutter analyze`와
튜너 단위 테스트는 통과했으며, 전체 Android 빌드와 수동 실기기 smoke flow는
[`docs/qa/sheet-viewer-android-tablet-smoke-test.md`](../qa/sheet-viewer-android-tablet-smoke-test.md)에
따라 태블릿 연결 후 이어서 확인한다.

2026-08-22 자동 스크롤 1차 검증에서는 곡별 auto scroll settings, 진행률/page 계산 helper,
controller persistence 테스트를 추가했다. `flutter pub get`, `dart format lib test`,
`flutter analyze`, `flutter test`, `flutter build apk --debug`, `flutter build appbundle`,
`flutter build apk`, `git diff --check`가 통과했다. iPhone 16 Pro / iOS 18.4 Simulator에서는
`flutter run`으로 앱 설치/launch와 첫 화면 렌더링을 확인했다. Android device/emulator는
연결되어 있지 않아 실제 태블릿에서 긴 PDF 자동 스크롤 체감, 공연 모드 중 start/stop,
Bluetooth/keyboard 수동 입력 시 정지 흐름은 추가 확인이 필요하다.

2026-08-22 기본 기대 기능 7차 보강 검증에서는 텍스트 주석, 라이브러리 정렬/필터,
metadata-only 로컬 백업/복원을 추가했다. `flutter pub get`, `dart format lib test`,
`flutter analyze`, `flutter test`, `flutter build apk --debug`, `flutter build appbundle`,
`flutter build apk`, `git diff --check`가 통과했다. iPhone 16 Pro / iOS 18.4 Simulator에서는
`flutter run`으로 앱 설치/launch와 첫 화면 렌더링을 확인했다. Android device/emulator는
연결되어 있지 않아 태블릿에서 텍스트 입력 UX, 백업 파일 저장 picker, 복원 후 PDF filePath
유효성은 추가 확인해야 한다.

2026-08-23 공유/import/export 보강에서는 iOS document open URL bridge,
Android shared import 표시 파일명 보존, Dart shared payload dedupe, 공유/import/export QA
체크리스트를 추가했다. `flutter analyze`, `flutter test`, `flutter build apk --debug`,
`flutter build appbundle`, `flutter build apk`, `flutter build ios --release --no-codesign`가
통과했다. 실제 Files/KakaoTalk/Drive/TestFlight 공유 흐름은
[`docs/qa/clef-share-import-export-qa.md`](../qa/clef-share-import-export-qa.md)에 따라 실기기에서
확인해야 한다.

2026-08-23 V1 내보내기/보존성 보강에서는 필기 포함 PDF 공유와 PDF 포함 전체 백업/복원 ZIP을
추가했다. 필기 포함 PDF는 원본 PDF를 수정하지 않고 `pdf_document` stamp API로 stroke/text를
새 사본에 굽는다. 전체 백업은 metadata-only JSON 백업과 별도로 `clef-backup.json` manifest와
`scores/` PDF 파일을 ZIP으로 묶는다. `flutter analyze`와 `flutter test`가 통과했으며, Android/iOS
빌드와 실기기 공유 결과는 이어서 확인한다. 1차 export의 텍스트 stamp는 base Helvetica 경로라
한글/비라틴 텍스트 주석의 PDF 내 실제 렌더링은 font embedding 후속 작업으로 남긴다.

2026-08-23 V1 뷰어 표시/페이지 정리 보강에서는 텍스트 주석 tap edit/delete, 한글/비ASCII 텍스트
주석 PDF 공유 안내, 곡별 표시 효과, crop metadata와 viewer mask, 회전 metadata badge를 추가했다.
`pdfrx` 2.4.7 조사 결과 low-level `PdfPageView.rotationOverride`는 있으나 현재 `PdfViewer.file`
사용 경로에서 page별 rotation을 직접 주입하는 안정 API는 확인되지 않아 실제 회전 렌더링은 후속
spike로 유지한다. 페이지 순서 변경/복제/반복 삽입은 원본 PDF 보존형 virtual page sequence
초안만 정리했다.

2026-08-23 베타 전달 polish에서는 앱 내 테스트 정보 화면, 빈 라이브러리 CTA, PDF viewer 오류
배너, 구체적인 import/share/export 실패 문구를 추가했다. 한글/비ASCII 텍스트 주석은 현재 PDF
font embedding 제약 때문에 export 사본에서 제외하고 개수를 안내한다. 한글 텍스트 주석만 있는
경우에는 원본 PDF 공유로 fallback한다. 메트로놈은 기본 OFF `tick 소리` toggle을 추가했으며,
Flutter system click sound 기반이라 accent 음색 구분과 latency 보장은 후속 검증 항목이다.
2026-08-28에는 튜너 sheet에 기준음/드론을 추가하고 Android `AudioTrack` sine playback 채널,
전역 tone 설정 저장, metadata/full backup round-trip을 연결했다. 이어서 linked audio file import와
Android `MediaPlayer` 기반 로컬 오디오 재생/정지를 추가했다.

2026-08-26 테스터 전달 polish에서는 테스트 정보 화면에 피드백 템플릿 복사 버튼을 추가하고,
검색/필터 때문에 라이브러리 결과가 비는 경우 초기화 액션을 제공했다. 외부 전달용 QA
체크리스트를 필수/선택/known issues 중심으로 재정리하고, TestFlight/APK 피드백 요청 메시지
초안을 별도 문서로 추가했다. Android/iOS bundle identity, microphone permission, PDF open/share
설정은 문서 기준으로 재확인했다.

2026-08-26 V1 라이브러리 조직화 보강에서는 collection/group/rating을 `SheetScore` metadata와
편집 UI에 추가하고, 검색/필터/별점 정렬에 반영했다. 또한 `SheetLinkedFile` 모델을 추가해
파트보/반주/레슨 자료 같은 보조 파일을 한 곡에 묶을 저장 구조를 만들었다. 2026-08-28에는
library profile별 실제 metadata 저장소 분리를 추가했다. 기존 폴더 직접 참조는 후속 V1 작업으로
남긴다.

2026-08-27 V1 악보앱 필수 기능 보강에서는 스캔/카메라 플로우를 제외하고 일반 악보앱 기준의
보기/정리/필기/공연/라이브러리 기능을 확장했다. 곡별 page scale과 대형 PDF 렌더 preset,
crop-to-fit, virtual page order, 페이지 복제, jump point, 회전 적용 사본 생성, annotation redo,
favorite annotation preset, 화살표/사각형/stamp, 자동 스크롤 cue/pause/resume, 공연 quick action
overlay, Bluetooth/USB 페달 mapping preset, 연결 파일 관리 UI, collection/group/rating facet 탐색,
PDF URL link tap 정책 보강을 추가했다. 원본 PDF는 계속 source of truth로 보존하고, URL 제거/회전
적용/필기 포함 export는 앱 내부 사본 또는 임시 export 사본으로 처리한다. 로컬 환경에는 `dart`와
`flutter` 실행 파일이 없어 `dart format`, `flutter analyze`, `flutter test`는 아직 실행하지 못했다.

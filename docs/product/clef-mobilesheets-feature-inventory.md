# Clef & Staff MobileSheets Feature Inventory

작성일: 2026-09-25

## 목적

MobileSheets의 주요 기능을 기능 인벤토리로 정리하고, Clef & Staff의 현재 반영 상태를
비교한다. 이 문서는 구현 지시가 아니라 다음 제품 판단을 위한 근거 문서다. 경쟁앱의
구체적인 UI, 문구, 아이콘, 에셋을 복제하지 않고 일반적인 악보앱 기능 패턴만 비교한다.

## 확인 범위

- Clef worktree: `/private/tmp/clef-mobilesheets-polish-20260925`
- Clef branch: `dev`
- Clef 기준 커밋: `85d046a fix: clarify Clef home quick access sections`
- Clef 앱: `Clef & Staff`
- Android applicationId: `com.mannlab.clef`
- Clef version: `1.0.0+25`
- MobileSheets 공식 자료 확인일: 2026-09-25
- 직접 관찰 기준: `docs/product/clef-mobilesheets-hands-on-analysis.md`의
  MobileSheets Trial `3.9.43 (Build 647)` Android emulator 기록

## 상태 정의

- `Implemented`: Clef에 코드/UI/model/test 또는 문서화된 로컬 검증 근거가 충분히 있다.
- `Partially Implemented`: 핵심은 있으나 MobileSheets 대비 깊이, UX, 플랫폼 parity, 실기기 검증이 부족하다.
- `Not Implemented`: 현재 Clef에 기능이 없다.
- `Intentionally Excluded`: Clef의 v1 제품 방향상 의도적으로 제외했거나, 일반 기능이 아닌 Clef 차별점으로 다른 선택을 했다.
- `Needs Device QA`: 코드상 경로는 있으나 실제 장비/오디오/스타일러스/페달 검증이 핵심이다.
- `Unknown`: MobileSheets 또는 Clef 상태를 근거 있게 확인하지 못했다.

## 근거 출처

- MobileSheets official site: https://www.zubersoft.com/mobilesheets/
- MobileSheets library features: https://www.zubersoft.com/mobilesheets/features/
- MobileSheets display features: https://www.zubersoft.com/mobilesheets/features/display/
- MobileSheets utility features: https://www.zubersoft.com/mobilesheets/features/utilities/
- MobileSheets annotation features: https://www.zubersoft.com/mobilesheets/features/annotations/
- MobileSheets file/storage features: https://www.zubersoft.com/mobilesheets/features/files/
- MobileSheets collaboration features: https://www.zubersoft.com/mobilesheets/features/collaboration/
- MobileSheets user guide PDF: https://zubersoft.com/mobilesheets/MobileSheets.pdf
- MobileSheets Google Play listing: https://play.google.com/store/apps/details?id=com.zubersoft.mobilesheetspro
- Clef feature map: `docs/product/sheet-viewer-feature-map.md`
- Clef hands-on comparison: `docs/product/clef-mobilesheets-hands-on-analysis.md`
- Clef v1.1 spike backlog: `docs/product/clef-v1-1-spike-backlog.md`

## 기능 인벤토리

| 영역 | MobileSheets 기능 | MobileSheets 근거 | Clef 현재 상태 | Clef 근거 | 상태 | 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| Library / Metadata | 대형 라이브러리와 빠른 검색/편집 | 공식 features는 SQLite 기반 대형 라이브러리와 캐시를 설명 | 로컬 metadata/store와 lazy rendering, 검색/필터/정렬, 저장 실패 복구가 있다 | feature map `라이브러리`, controller/store tests | Partially Implemented | Clef는 SharedPreferences 중심이라 초대형 라이브러리 성능은 별도 계측 필요 |
| Library / Metadata | 20개 이상 metadata field, custom field | 공식 features, user guide Library Management | 제목/작곡가/태그/메모/컬렉션/그룹/별점/custom field가 있다 | feature map `제목/작곡가/태그/메모`, `고급 메타데이터 필드` | Partially Implemented | Album/year/signature/source type 등 전용 schema와 tab은 없다 |
| Library / Metadata | Recent/Songs/Setlists/Collections/Artists/Albums/Genres 등 탭 | user guide Library Management | 홈 rail/facet 중심으로 `최근 악보`, 최근 세트리스트, 작곡가/custom field facet을 제공 | feature map, hands-on analysis | Partially Implemented | Clef는 탭 복제 대신 간결한 홈+facet 구조를 선택 |
| Library / Metadata | configurable tabs / display formatting | user guide 목차 `Configuring Tabs`, `Song Title Formatting` | 카드/리스트 표시와 파일명 fallback은 있으나 사용자 정의 title formatting은 없다 | feature map의 카드 식별성 기록 | Not Implemented | 파워유저 기능. v1에는 불필요하게 무거울 수 있음 |
| Library / Metadata | Filtering, alphabet list, voice search | official library page, user guide | 검색/정렬/facet/hidden facet search는 있다. alphabet jump와 음성 검색은 없다 | feature map `정렬/필터`, `음성 검색` | Partially Implemented | 음성 검색은 Later 후보 |
| Library / Metadata | Batch editing | user guide 목차, hands-on analysis | 선택 악보 일괄 정보 편집, 컬렉션 지정, 라이브러리 제거가 있다 | smoke tests, feature map | Implemented | MobileSheets식 과밀 메뉴 대신 선택 AppBar에 축약 |
| Library / Metadata | Multiple libraries | official library page | library profile 생성/전환/이름 변경/비우기/삭제와 실패 복구가 있다 | feature map `여러 라이브러리` | Implemented | 실제 대형 라이브러리 전환 성능은 QA 여지 |
| Library / Metadata | Import wizard metadata assignment | hands-on import wizard, official files page | 가져온 직후 nudge, `정보 정리 필요`, viewer 정보 편집, 일괄 편집이 있다 | hands-on analysis, recent quick access commit | Partially Implemented | 강제 wizard는 피하고 사후 정리 흐름으로 대체 |
| Library / Metadata | Duplicate handling | hands-on import flow | 원본 파일명 재가져오기 시 기존 악보 열기 안내가 있다 | feature map, controller tests | Implemented | 파일 내용 hash 수준의 중복 탐지는 별도 검토 |
| Import / File Management | PDF/image import | official files page | PDF, JPG, PNG import와 이미지 PDF 변환이 있다 | feature map `PDF 가져오기`, `이미지 파일 지원` | Implemented | HEIC/HEIF는 spike |
| Import / File Management | Text/ChordPro/docx import | official files page, Google Play listing | 텍스트/ChordPro/docx viewer/parser가 없다 | feature map `텍스트/ChordPro 보기` | Not Implemented | 음악 코드/가사 앱에 가까워지는 큰 범위 |
| Import / File Management | Text/ChordPro transpose/capo | official files page | 없다 | feature map `ChordPro transpose/capo` | Not Implemented | Chord parser와 renderer 필요 |
| Import / File Management | Multiple files per score | official files page | linkedFiles 관리와 viewer PDF 연결 파일 전환, audio linked file import가 있다 | feature map `한 곡에 여러 파일 연결`, tests | Implemented | 이미지/오디오/PDF 연결은 있음. UI 깊이는 QA 필요 |
| Import / File Management | Cloud import/export browser | official site and files page | 시스템 file picker/provider 우선, 별도 cloud SDK 내장은 없다 | feature map `클라우드 파일 가져오기` | Partially Implemented | Dropbox/Drive/OneDrive 내장 browser는 Later |
| Import / File Management | Direct file reference without copy on Android | official files page | 앱 내부 복사 정책이 기본이며 기존 폴더 직접 참조는 spike | spike backlog `기존 폴더 직접 참조` | Not Implemented | SAF/iOS Files 권한 정책 결정 필요 |
| Import / File Management | CSV index / songbook split | official files page | CSV/PDF 북마크 기반 songbook 곡 항목 생성이 있다 | feature map `CSV index로 songbook 분할` | Implemented | 물리 PDF 분할은 후속 |
| Import / File Management | File replacement / swapping files | user guide 목차 `Swapping Files` | 연결 파일 관리와 적용 사본 생성은 있으나 원본 파일 swap UX는 명확하지 않다 | feature map linked files/page organize | Partially Implemented | 실제 요구가 생기면 별도 UX 필요 |
| Import / File Management | Export/share/print | user guide, collaboration page | PDF 공유, 필기 포함 PDF 사본, backup ZIP이 있다. print 전용 UX는 없다 | feature map `PDF 공유/export` | Partially Implemented | iOS/Android print intent는 별도 판단 |
| Import / File Management | Backup/restore and automatic DB backup | official files page | metadata JSON, full ZIP, 자동 metadata snapshot/복원이 있다 | feature map `로컬 백업/복원`, `자동 DB 백업` | Implemented | OS background scheduled full backup은 Later |
| Import / File Management | PC companion app | official files page | 없다 | feature map `PC companion app` | Not Implemented | 별도 desktop app 영역 |
| Viewer / Performance | Single/two-page/half-page/vertical display modes | official site, display page, user guide | 1페이지, 2페이지, 세로 스크롤, 반 페이지 넘김이 있다 | feature map `보기` | Implemented | 2페이지 정책은 `표지 단독`/`1-2쪽부터`로 단순화 |
| Viewer / Performance | Page scaling / fit modes | display page | fit page/fit width/fullscreen metadata와 viewer 적용이 있다 | feature map `page scaling` | Implemented | 실제 악보별 기본값 QA 필요 |
| Viewer / Performance | Page ordering duplicate/rearrange/remove | display page | 숨김/순서/복제/빈 페이지/적용 사본이 있다 | feature map `페이지 정리` | Implemented | live rendered rotation은 spike |
| Viewer / Performance | Manual crop / automatic crop / rotation | display page | 수동 crop, 회전 metadata와 적용 사본은 있다. 자동 crop은 없다 | feature map `수동 크롭`, `자동 크롭`, `페이지 회전` | Partially Implemented | 자동 crop은 margin detection 필요 |
| Viewer / Performance | Image caching | display page | render cache profile과 memory cap이 있다 | feature map `image caching/prefetch` | Partially Implemented | 50-100페이지 실기기 계측 필요 |
| Viewer / Performance | Song overlay | display page | viewer `도구` 메뉴, toolbar, mini panel, tap zone hint가 있다 | feature map `이름으로 도구 찾기` | Implemented | Clef는 이름 있는 메뉴를 더 강조 |
| Viewer / Performance | Automatic scrolling | utilities page | 곡별 duration/cue/rehearsal mark 기반 자동 스크롤이 있다 | feature map `자동 스크롤` | Implemented | 측정 기반 세밀 timeline editor는 후속 |
| Viewer / Performance | Page slider / direct page jump | user guide Song Overlay | page navigation/control이 있다 | feature map `가로 페이지 넘김`, viewer tests | Partially Implemented | MobileSheets식 preview slider 깊이는 아직 직접 대조 전 |
| Viewer / Performance | Next song bar / setlist continuation | user guide 목차 | viewer context, 이전/다음 곡, 진행 배지가 있다 | feature map `세트리스트 연속 넘김` | Partially Implemented | MobileSheets와 같은 next song bar 표현은 아님 |
| Viewer / Performance | Performance mode | utilities page | 공연 모드와 quick action overlay가 있다 | feature map `공연 모드`, `quick action box` | Implemented | 실제 연주 중 오작동 방지 QA 필요 |
| Viewer / Performance | Two-tablet book mode | official site collaboration/display | 없다 | feature map `기기 간 페이지 전환`, `leader/follower tablet` | Not Implemented | 협업/동기화 영역 |
| Setlists / Collections | Setlist create/edit/delete/reorder | official library page, hands-on | 생성/이름 변경/삭제/reorder/직접 순서 입력/undo가 있다 | feature map `세트리스트` | Implemented | 긴 목록 drag는 Device QA |
| Setlists / Collections | Bulk add and create setlist from songs | hands-on | 선택 악보 세트리스트 추가와 새/기존 선택, 상세에서 검색 기반 다중 추가가 있다 | smoke tests, hands-on analysis | Implemented | action 발견성은 QA |
| Setlists / Collections | Collection management | official library page | collection metadata, 필터, bulk 지정, `보기` snackbar가 있다 | feature map `collection` | Implemented | MobileSheets group tab 깊이와는 다름 |
| Setlists / Collections | Recent setlists mixed with recent songs | user guide Recent tab, hands-on | `최근 악보`와 최근 세트리스트 rail을 분리해 제공 | hands-on analysis, quick access commit | Implemented | 의도적으로 구획 분리 |
| Setlists / Collections | Per-song setlist settings | MobileSheets release/history and feature patterns | 세트리스트별 score metronome override, viewer/action preset override가 있다 | feature map `공연별 보기 preset override`, `메트로놈` | Implemented | 전체 MobileSheets 설정 범위보다는 작음 |
| Setlists / Collections | Setlist merge | official library page | 목록 복사/복제는 있으나 merge 전용 UX는 없다 | feature map `세트리스트` | Not Implemented | 실제 사용 빈도를 본 뒤 결정 |
| Setlists / Collections | Setlist/song notes display | user guide 목차 | 곡별 시작 쪽/시간/메모가 세트리스트 상세, 목록 복사, viewer context, 공연 진행 badge에 표시된다 | feature map, main.dart viewer notes | Implemented | 긴 메모의 실제 거리 가독성은 DEVICE QA |
| Annotation | Pen/highlighter/text/eraser/stamps/shapes/arrows/hairpins/staff/grid | annotation page | 대응 도구 대부분이 있다 | feature map `주석` | Implemented | custom stamp pack 제외 |
| Annotation | Large stamp library and user-provided stamps | annotation page | 기본 음악 stamp와 도형만 제공 | feature map `스탬프/기본 도형` | Partially Implemented | 사용자 stamp import는 없음 |
| Annotation | Favorite annotation tools | annotation page | favorite annotation tool preset 저장/복원이 있다 | feature map `favorite tool` | Implemented | 실사용 발견성 QA 필요 |
| Annotation | Stylus pressure, stylus button shortcut, inactivity exit | annotation page | pressure/palm rejection은 있으나 stylus button/inactivity exit는 없다 | feature map `스타일러스 pressure`, `palm rejection` | Partially Implemented | S Pen 실기기 QA 필요 |
| Annotation | Undo/redo and autosave | annotation page | stroke/text undo/redo와 자동 저장이 있다 | feature map `undo/redo`, `자동 저장` | Implemented | 대량 stroke 성능은 file-backed migration 후보 |
| Annotation | Nudge tool | annotation page | 없다 | feature map `nudge tool` | Not Implemented | selection model 필요 |
| Annotation | Snipping/cut/copy/paste page content | annotation page | 없다 | feature map에는 명시적 구현 없음 | Not Implemented | PDF page bitmap 편집 영역 |
| Annotation | Annotation layers | annotation page | 기본 layer visibility/export flag는 있다. 다중 layer/keying은 없다 | feature map `annotation layer` | Partially Implemented | 다중 layer는 후속 |
| Annotation | Editable PDF annotation embed | annotation page | rendered stamp export fallback은 있으나 standard editable annotation export는 unsupported | spike backlog `PDF 표준 Annotation Embed/Export` | Partially Implemented | compatibility fixture 필요 |
| Music Tools | Metronome count-in/accent/subdivision/visual modes | utilities page | count-in, subdivision, accent, visual strip, Android native tick이 있다 | feature map `메트로놈` | Partially Implemented | 빠른 BPM 실제 오디오 균일성은 Device QA |
| Music Tools | Metronome page turn after measures / multiple visual modes | utilities page | 자동 스크롤과 metronome은 있으나 마디 수 기반 page turn/LED-circle-edge mode 선택은 제한적 | feature map `메트로놈`, `자동 스크롤` | Partially Implemented | 과한 설정 노출은 Clef 컨셉과 충돌 가능 |
| Music Tools | Audio tracks / backing tracks | utilities page | linked audio import와 Android MediaPlayer 재생/정지가 있다 | feature map `오디오 플레이어` | Partially Implemented | track list/markers/route/iOS parity는 남음 |
| Music Tools | A-B loop | utilities page | 없다 | feature map `A-B loop` | Not Implemented | audio timeline model 필요 |
| Music Tools | Tempo change / pitch shift | utilities page | 없다 | feature map `tempo/pitch shift` | Not Implemented | DSP library/license 필요 |
| Music Tools | Built-in chromatic tuner | 공식 자료에서는 MobileSheets chromatic tuner가 확인되지 않음 | Clef는 chromatic-only tuner와 pitch history chart가 있다 | feature map `튜너` | Implemented | Clef 차별점. 실제 정확도는 Device QA |
| Music Tools | Drone / reference tone | MobileSheets 공식 주요 기능으로는 확인하지 못함 | Clef는 tuner A4 기준 공유 drone/tone이 있다 | feature map `기준음/드론` | Implemented | Clef 차별점. 음량은 Device QA |
| Music Tools | Recorder / music keyboard | Piascore에는 있으나 MobileSheets 공식 주요 기능으로는 확인 제한 | Clef에는 없다 | feature map `녹음기`, `음악 키보드` | Not Implemented | MobileSheets gap이라기보다 악보앱 확장 후보 |
| External Control | Bluetooth/USB pedal action mapping | utilities page | key input/preset/custom mapping, 진단 로그, 로컬 keyboard substitute matrix가 있다 | feature map `Bluetooth 페달`, `페달 action mapping` | Needs Device QA | 실제 페달 장비 pairing/repeat/transport 검증이 핵심 |
| External Control | Touch action mapping | utilities page | tap zone hint와 action/pedal settings 일부가 있다 | feature map `전역 gesture/action 설정` | Partially Implemented | MobileSheets만큼 edge action matrix가 넓지는 않음 |
| External Control | MIDI actions and registration linking | official site, utilities page, manual | 없다 | feature map `USB/Bluetooth MIDI`, `MIDI registration/linking` | Not Implemented | 키보드 연주자 파워유저 기능 |
| External Control | Face gesture page turn | Google Play / official references | 없다 | feature map `face gesture page turn` | Not Implemented | camera/privacy 리스크 |
| External Control | Link points | utilities page | page jump point metadata와 tappable overlay/list가 있다 | feature map `link point/jump point` | Implemented | repeat 처리용 기본은 있음 |
| External Control | Smart buttons | utilities page | 없다 | feature map `smart button` | Not Implemented | action registry 필요 |
| External Control | Configurable quick action box | utilities page | 공연 모드 quick action overlay와 일부 toggle action이 있다 | feature map `quick action box` | Partially Implemented | 위치 이동/숨김/사용자 구성 폭은 작음 |
| Sync / Collaboration | Share score/setlist package | collaboration page | PDF/share/backup ZIP은 있으나 MobileSheets 전용 setlist package 공유는 없다 | feature map `PDF 공유/export`, `백업/복원` | Partially Implemented | 같은 라이브러리 사용자 간 PDF 없는 setlist 공유는 없음 |
| Sync / Collaboration | Export PDFs with annotations | collaboration page | rendered annotation PDF 사본 공유가 있다 | feature map `필기 포함 PDF 공유` | Implemented | editable annotation export는 미구현 |
| Sync / Collaboration | Library cloud synchronization | collaboration and files pages | 없다. 백업/복원과 system picker import만 있음 | feature map `클라우드 동기화` | Not Implemented | account/conflict/privacy 결정 필요 |
| Sync / Collaboration | Wi-Fi/Bluetooth leader-follower tablets | collaboration page | 없다 | feature map `leader/follower tablet` | Not Implemented | 공연 협업 영역 |
| Sync / Collaboration | Field-selective sync preserving annotations/settings | collaboration page | 없다 | spike backlog cloud sync | Not Implemented | conflict model 필요 |
| Sync / Collaboration | Cross-platform feature parity | official site | Android/iOS 모두 빌드하지만 기능 parity는 미검증 | app build history, QA docs | Partially Implemented | iOS 오디오/파일/share extension parity가 남음 |
| Settings / Discoverability | Settings categories | user guide Settings | 홈 `메뉴`, viewer `도구`, 일부 설정 sheet가 있다 | feature map `이름으로 도구 찾기` | Partially Implemented | MobileSheets식 split settings만큼 세분화하지 않음 |
| Settings / Discoverability | Icon glossary / long-press tooltip | user guide Icon Glossary, reference analysis | tooltips와 이름 메뉴를 병행한다 | reference analysis | Partially Implemented | glossary/help 문서형 화면은 없음 |
| Settings / Discoverability | Named menus as fallback to icon shortcuts | hands-on and Clef polish | 홈 `메뉴`, viewer `도구`, 필기 `필기 도구`가 있다 | feature map, tests | Implemented | 사용자 피드백 대응 완료 범위 |
| Settings / Discoverability | Configurable action box / advanced action routing | utilities page | 일부 quick action/pedal mapping은 있으나 전면 configurable action box는 아니다 | feature map `quick action box`, `전역 gesture/action 설정` | Partially Implemented | Clef는 단순성 우선 |
| Settings / Discoverability | First-run help / manual links | user guide intro describes help prompt | tester info와 tap zone hint는 있으나 full manual/help center는 없다 | QA checklist, main.dart | Partially Implemented | 내부테스트 이후 support/help surface 필요 |

## 요약

| 상태 | 개수 | 대표 기능 |
| --- | ---: | --- |
| Implemented | 26 | 세트리스트, PDF/image import, songbook CSV, 보기 모드, 페이지 정리, 필기 기본 도구, 튜너, 드론, 백업/복원 |
| Partially Implemented | 28 | 대형 라이브러리 성능, metadata depth, cloud import, crop/auto-crop, audio player, metronome depth, annotation layers, action box |
| Not Implemented | 18 | Text/ChordPro/docx, direct folder reference, companion app, two-tablet book mode, MIDI, face gesture, smart buttons, cloud sync |
| Intentionally Excluded | 0 | 이번 표에서는 명시적 제외보다 `Not Implemented` 또는 `Partially Implemented`로 분류 |
| Needs Device QA | 1 | Bluetooth/USB pedal action mapping |
| Unknown | 0 | 공식 자료 또는 기존 hands-on 문서로 1차 확인 완료 |

## MobileSheets 대비 큰 gap

1. Cloud/sync/collaboration: cloud library sync, field-selective sync, leader/follower tablets,
   same-library setlist sharing은 Clef에 없다.
2. Text/ChordPro/docx: MobileSheets는 텍스트/ChordPro를 악보 유형으로 다루지만 Clef는 PDF/image 중심이다.
3. Advanced external control: MIDI, face gesture, smart buttons, deeper touch action matrix는 없다.
4. Advanced audio: A-B loop, tempo/pitch shift, track markers는 없다.
5. Advanced annotation: custom stamps, nudge, snipping, multi-layer, editable PDF annotation export가 남아 있다.
6. Desktop/companion workflow: PC companion app과 Wi-Fi transfer는 없다.
7. Automatic crop/direct file management: manual crop과 internal copy policy는 있으나 MobileSheets식
   automatic crop, Android direct-reference library는 없다.

## Clef가 이미 충분히 커버하거나 다른 방향을 택한 영역

- 튜너와 드론은 MobileSheets 공식 기능보다 Clef가 더 분명한 차별점이다.
- 최근 악보와 최근 세트리스트는 MobileSheets처럼 한 Recent tab에 섞지 않고, Clef에서 별도 rail로 구분한다.
- import metadata는 MobileSheets처럼 강한 wizard를 강제하지 않고, 가져온 뒤 `정보 정리 필요`와
  `정보 편집`으로 부드럽게 정리하도록 둔다.
- 기능 발견성은 MobileSheets의 전통적인 icon/toolbar 밀도보다 Clef의 이름 있는 `메뉴`/`도구`
  fallback을 유지하는 편이 낫다.

## 다음 단계 후보

### v1.x에 흡수할 만한 낮은 위험 기능

| 항목 | 현재 처리 | 남은 확인 |
| --- | --- | --- |
| 최근 세트리스트/최근 악보 rail | `정보 정리 필요`, `최근 악보`, `최근 세트리스트`를 분리해 copy polish 완료. 최근 세트리스트는 진행 pill과 이어보기 곡명을 유지한다. | 휴대폰 세로, 태블릿 가로, 큰 글씨에서 거리 가독성은 실기기 QA. |
| 메트로놈 빠른 BPM | Android native click output 재사용, start 전 prepare, count-in phase, delayed tick phase, stale callback guard는 로컬 테스트로 보강됨. | 실제 오디오 균일성은 120/180/240 BPM, 4/4/6/8, subdivision, 이어폰/스피커/Bluetooth 별 실기기 QA. 오디오 기준 native scheduler는 현 버전 범위 밖. |
| 드론 음량/출력 route | `드론 음량`과 현재 퍼센트를 상시 표시하고, 기본 35%/clipping-safe gain 정책은 유지한다. 저장 응답과 재생 상태는 분리되어 있다. | 앱 음량, 기기 미디어 음량, 이어폰/스피커/연습실 출력 경로별 체감 확인. 결함 확정 전 자동 증폭하지 않는다. |
| 긴 PDF navigation | 기존 page picker grid에 현재/선택 page 표시, slider, 쪽 번호 직접 이동을 추가했다. 숨김 page는 기존 visible-page 보정 경로를 따른다. | 실제 긴 PDF에서 손가락 조작/스크롤 체감은 실기기 QA. thumbnail/outline navigation은 후속 후보. |
| 세트리스트 곡별 메모 표시 | 리허설 모드의 곡별 메모를 viewer 상단 context와 공연 진행 badge에도 노출한다. 저장 schema 추가 없이 기존 notes를 재사용한다. | 긴 메모가 악보를 가리지 않는지, 실제 공연 거리에서 한 줄 표시가 충분한지 DEVICE QA. |
| PDF print/share intent | 원본 PDF 공유와 필기 포함 PDF 공유는 구현됨. 전용 print action은 아직 명시 요구가 없다. | 사용자 요구가 올라오면 OS print/share sheet의 프린트 경로로 충분한지 먼저 확인하고, 별도 print action은 v1.1 후보로 검토. |

### v1.1 제품 기능 후보

- 자동 crop 또는 semi-auto crop.
- advanced audio player: A-B loop와 track marker부터 시작.
- custom stamp import보다 먼저 stamp set 관리/검색.
- field schema 확장: album/year/signature/source type을 Clef에 맞게 단순화.
- help/support surface: icon glossary가 아니라 작업별 이름 메뉴와 짧은 도움말 중심.
  홈 `메뉴`의 `도움말/피드백`에서 처음 쓰는 흐름, 앱/build 정보, 테스트 항목,
  피드백 템플릿 복사를 한곳에 묶는다.

### Later / Spike 후보

- Text/ChordPro/docx renderer와 transpose/capo.
- Android SAF direct folder reference와 iOS Files parity.
- MIDI registration/action.
- face gesture page turn.
- smart button/action registry.
- cloud sync/account/collaboration.
- companion app.
- editable PDF annotation export.

### Clef 컨셉상 신중히 볼 후보

- MobileSheets식 고밀도 settings/tab/action matrix.
- 모든 metadata field를 전면 tab으로 노출하는 구조.
- 여러 도구를 동시에 movable/resize floating panel로 띄우는 구조.
- 공연 중 실수 가능성이 큰 smart button/URL action.

# Clef & Staff MobileSheets Hands-On Analysis

확인일: 2026-09-07

## 범위

Clef & Staff v1 RC의 연주자 피드백을 기준으로 MobileSheets 실제 설치본을
Android 에뮬레이터에서 관찰했다. 이번 문서는 구현 지시가 아니라 제품 판단과
다음 작업 우선순위를 정리하기 위한 기록이다.

## 테스트 환경

| 항목 | 값 |
| --- | --- |
| Clef worktree | `/private/tmp/clef-competitor-ux-research` |
| Clef branch | `dev` |
| Clef 기준 커밋 | `476dd51 docs: refine Clef MobileSheets UX analysis` |
| Clef 설치본 | `com.mannlab.clef`, `1.0.0` / `versionCode=20` |
| MobileSheets 설치본 | `com.zubersoft.mobilesheetsfree` |
| MobileSheets 버전 | `3.9.43 (Build 647)` / `versionCode=647` |
| 기기 | Android Emulator `clef_rc_tablet_api35`, Pixel Tablet |
| OS | Android 15 |
| 해상도 | `2560x1600` |
| 입력 | ADB tap/long press, emulator touch |

## 스크린샷 기록

스크린샷은 임시 분석 근거로 `/private/tmp`에 저장했다. repo에는 binary screenshot을
추가하지 않았다.

| 화면 | 파일 |
| --- | --- |
| MobileSheets 홈/라이브러리 | `/private/tmp/mobilesheets_home.png` |
| Import 메뉴 | `/private/tmp/mobilesheets_import_1.png` |
| 시스템 파일 선택기 | `/private/tmp/mobilesheets_local_file.png` |
| Import settings wizard | `/private/tmp/mobilesheets_import_wizard.png` |
| Import 결과 | `/private/tmp/mobilesheets_after_import.png` |
| 다중 선택 | `/private/tmp/mobilesheets_multi_select.png` |
| 선택 overflow | `/private/tmp/mobilesheets_select_overflow.png` |
| 세트리스트 생성 | `/private/tmp/mobilesheets_create_setlist.png` |
| 세트리스트 탭 | `/private/tmp/mobilesheets_setlists_tab.png` |
| 세트리스트 상세 | `/private/tmp/mobilesheets_setlist_detail.png` |
| 세트리스트 편집 | `/private/tmp/mobilesheets_setlist_edit.png` |
| Viewer fullscreen | `/private/tmp/mobilesheets_viewer_fullscreen.png` |
| Viewer overlay | `/private/tmp/mobilesheets_viewer_overlay.png` |
| Metronome panel | `/private/tmp/mobilesheets_metronome.png` |
| Annotation toolbar | `/private/tmp/mobilesheets_annotation.png` |
| Settings | `/private/tmp/mobilesheets_settings.png` |
| Touch & Pedal settings | `/private/tmp/mobilesheets_touch_pedal_settings.png` |
| Recent after setlist | `/private/tmp/mobilesheets_recent_after_setlist.png` |

## 직접 관찰 비교

| 영역 | MobileSheets 직접 확인 | Clef 현재 상태 | UX gap | 가져올 패턴 | 버릴 패턴 | 추천 처리 | 우선순위 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 다중 선택 | long press로 선택 모드 진입. 상단 bar가 선택 수 `1`과 edit/copy/delete/share/overflow action으로 바뀌고, row checkbox가 선택 상태를 보여준다. | 선택 카드 강조, checkbox, 선택 수 app bar를 제공한다. | MobileSheets는 list row라 상태가 매우 명확하다. Clef card/grid에서는 tablet 거리에서 강조가 충분한지 QA 필요. | 선택 수 app bar, checkbox, overflow bulk action. | 모든 action을 한 줄에 과밀하게 노출하는 방식. | Clef는 현재 구조 유지. 선택 색/체크 크기만 실기기 QA 후 조정. | v1 QA |
| bulk setlist 추가 | 선택 overflow에 `Create Setlist from Songs`와 `Create Collection from Songs`가 있다. 이름 dialog 후 바로 세트리스트가 생성된다. | 선택 악보를 세트리스트에 추가하는 action과 새/기존 세트리스트 선택이 있다. | Clef는 기존 세트리스트 추가와 중복 skip 안내가 더 앱스럽지만, 발견성은 QA 필요. | 선택 후 setlist bulk action을 명확히 둔다. | collection까지 같은 레벨로 늘리는 복잡도. | 현재 반영 유지. action label이 눈에 들어오는지 확인. | v1 QA |
| setlist reorder | 세트리스트 상세는 `Load All`과 번호 목록. `EDIT` 진입 시 좌측 현재 세트리스트, 우측 전체 곡 split layout, 큰 drag/reorder handle, 삭제 버튼, save/cancel이 보인다. | drag handle reorder, 위/아래 보조 버튼, 번호 배지 직접 순서 입력을 제공한다. | 항목이 하나라 실제 drag feel은 제한적으로만 확인. 긴 목록 손가락 QA가 남았다. | 편집 모드 분리, 큰 reorder handle, 직접 위치 이동. | split pane 전체 곡 편집 UI는 v1에는 무겁다. | 긴 setlist에서 handle/input 경로를 QA한다. | v1 QA |
| 최근 목록 setlist | Recent 탭에 `TestSetlist`와 개별 곡 `mobilesheets trial store`가 함께 표시된다. 탭 카운트도 `Recent (2)`로 바뀐다. | 홈 최근 악보와 최근 세트리스트 rail을 분리해 제공한다. | MobileSheets는 한 리스트에 섞고, Clef는 구획을 나눈다. 둘 다 가능하지만 Clef는 카드 구분이 더 중요하다. | setlist가 최근 진입점에 반드시 노출되어야 한다. | song/setlist를 무표정한 동일 row로 섞는 방식. | Clef의 최근 세트리스트 rail 유지. 카드 badge/곡 수/최근 연 시간 QA. | v1 QA |
| 메트로놈 | viewer overlay에서 metronome icon을 누르면 우측 floating panel이 뜬다. Tempo, tap tempo, time signature, subdivision, sound FX, accent first beat, playback mode, volume, start가 한 패널에 있다. | tempo, 박자, subdivision, accent, tap tempo, count-in, 악보별 metronome snapshot, 세트리스트별 tempo override, visual/tick sound, viewer mini panel이 있다. | MobileSheets는 설정이 풍부하지만 panel이 크고 무겁다. Clef는 실제 audio route QA와 advanced cue/pattern UX가 남았다. | 악보를 보면서 켜고 조정 가능한 panel, audio/visual mode 구분, count-in, volume, 곡별/세트리스트별 저장. | 거대한 설정 panel과 과한 옵션 밀도. | v1은 소리/visual fallback QA. advanced cue/pattern은 v1.1 후보. | v1 QA, v1.1 |
| 튜너 | 앱 UI, 공식 기능 설명, APK 문자열 보조 확인에서 chromatic tuner는 확인되지 않았다. APK에는 audio pitch shift와 MIDI pitch bend 관련 문자열은 있으나 tuner UI 문자열은 잡히지 않았다. | Chromatic-only tuner와 pitch history chart를 제공한다. | MobileSheets 대비 Clef 차별점. 다만 전용 튜너앱급 정확도는 실기기 검증 필요. | 악보앱 안에서 빠르게 여는 간결한 튜너. | 악기별 preset을 다시 늘리는 방향. | Chromatic-only 유지. 실기기 정확도/latency만 QA. | v1 QA |
| 미니 패널 | viewer overlay 하단에 quick tool bar가 있고, metronome은 악보 위 우측 panel로 계속 떠 있다. | 고정형 tuner/metronome mini panel이 있다. | Clef mini panel이 악보를 가리는지, 페이지 tap과 충돌하는지 QA 필요. | viewer 안 tool panel. | 이동/크기 조절/여러 도구 동시 패널은 복잡하다. | v1은 고정형 유지. movable overlay는 spike. | v1 QA, Spike |
| page tap hint | viewer는 fullscreen으로 들어가며 중앙 탭 시 상/하 overlay가 나타난다. 좌/우 tap page turn은 1-page 샘플이라 충분히 검증하지 못했다. | tap zone hint와 page edge 안내가 있다. | MobileSheets는 첫 화면에서 explicit tap zone hint가 강하지 않고, 기존 사용자 문법에 기대는 느낌이다. | 중앙 탭 overlay, page count/title, bottom tool bar. | 첫 사용자가 설명 없이 알아서 배우는 방식. | Clef tap zone hint는 유지하는 편이 낫다. | v1 유지 |
| viewer background | full screen viewer는 검은 letterbox/주변부와 문서 흰 영역이 보인다. overlay는 회색 bar로 뜬다. | paper/white 계열 viewer background를 적용했다. | MobileSheets의 검은 배경은 집중감은 있지만 스캔 악보와 이질감이 있을 수 있다. | fullscreen 몰입, overlay 숨김. | 무조건 검은 배경 기본값. | Clef는 현재 paper/white 기본값 유지. | v1 유지 |
| 라이브러리 metadata | 상단 탭은 Recent/Songs/Setlists/Collections/Artists/Albums/Genres. 필터는 Search, Source, Key, Collection, Difficulty, Genre, Rating. metadata 미입력 row는 제목 아래 `-`로 보인다. | title/file/source filename/최근 시간/마지막 페이지를 카드에 노출한다. | MobileSheets는 metadata power가 강하지만, 빈 값이 예쁘진 않다. Clef가 더 친절해야 한다. | 파일명 기반 title 추정, metadata 필터, setlist/collection 축. | 빈 metadata `-`만 보이는 표현. | Clef는 metadata 미입력 card 식별성 계속 유지. | v1 유지, v1.1 |
| 필기/annotation | annotation mode에 pen, highlighter, text, stamp, eraser, line, select, layer, crop/cut, staff/grid, metronome, export/download, delete, settings, undo/redo가 한 줄에 있다. | pen/highlighter/eraser/text/stamp/arrow/rectangle, undo/redo, favorite tool preset, 기본 layer 표시/숨김과 export 포함/제외가 있다. | MobileSheets는 도구가 많지만 초보자에겐 부담스럽다. Clef는 S Pen pressure/palm rejection 실기기 튜닝과 다중 layer 고도화가 남았다. | undo/redo, favorite tool, 기본 shape/stamp, layer export flag처럼 자주 쓰는 도구만 전면에 둔다. | staff/grid/crescendo/custom stamp pack까지 v1에 넣는 것. | S Pen QA 후 pressure/palm tuning, 다중 layer/keying, music-specific shape를 v1.1 이후로 검토한다. | v1 QA, v1.1 |
| import/export | Import 메뉴에서 Local File, Dropbox, Google Drive, OneDrive, Nextcloud, Batch Import, Batch Audio Import, CSV or PDF Bookmarks를 제공한다. Import wizard는 title guess, auto crop, editor after import, duplicate behavior, setlist/collection/key/artist/composer/genre assignment를 제공한다. | PDF/image import, 가져오며 세트리스트 추가, 원본 보존, link sanitizer, backup/restore. | cloud browser, batch import, CSV bookmark import, import-time full metadata assignment는 Clef에 없다. | local file picker, duplicate policy, import 결과 dialog, import-time setlist assignment. | cloud provider 전부 내장, CSV songbook split을 v1에 넣는 것. | v1은 로컬 import+setlist assignment 유지. v1.1에서 batch/cloud/full metadata import 검토. | v1/v1.1/Later |
| 설정 구조 | split pane settings. About, Storage, Library, Display, Import, Touch & Pedal, Face Gesture, Text File, MIDI, Backup and Restore, Other가 보인다. Display와 Touch & Pedal에는 page animation, repeat, half-page, touch actions, overlay toggle, AirTurn direct mode, USB mouse 등 세부 옵션이 많다. | Clef는 주요 viewer/tuner/metronome/settings를 더 얕게 제공한다. | MobileSheets는 파워유저에게 좋지만 첫 사용자에게는 무겁다. | category split, touch/pedal action mapping, display mode preset. | 모든 세부 설정을 한 번에 노출. | v1.1에서 "고급 설정" 안에만 제한적으로 확장. | v1.1/Spike |

## 친구 피드백 기준 최종 판단

| 피드백 | MobileSheets 방식 | Clef 현재 반영 | 남은 문제 | 추천 액션 | v1/v1.1/Later |
| --- | --- | --- | --- | --- | --- |
| 여러 악보 선택 표시 | long press 후 checkbox와 선택 수 app bar로 명확히 표시. | 반영됨. 후속 hotfix에서 `최근` quick access 카드도 선택 모드에 참여하게 했다. | 실제 Android 태블릿 손가락 조작에서 강조가 충분한지. | 실기기 QA 후 색/체크 크기만 추가 조정. | v1 QA |
| 여러 악보 세트리스트 추가 | 선택 overflow에서 `Create Setlist from Songs`. | 반영됨. | action 발견성, 중복 skip copy. | 현재 유지. 안내 문구만 QA. | v1 QA |
| 세트리스트 drag reorder | edit mode에서 큰 drag handle과 split layout. | 반영됨. handle hit area를 44dp로 키웠고 번호 배지에서 직접 순서 입력도 제공한다. | 긴 목록 drag/input feel 미검증. | 실제 손가락 drag QA. | v1 QA |
| 최근 목록 세트리스트 | Recent에 setlist와 song이 함께 표시. | 반영됨. | Clef rail/card 구분 가독성. | 곡 수 badge와 최근 연 시간 확인. | v1 QA |
| 메트로놈 소리 | Audio and Visual mode, sound FX, volume, start button 제공. | 반영됨. 새 metronome settings는 기본 `소리 켬`이고, 꺼두면 `시각만` 상태를 표시한다. | 실제 기기 audio route/volume/무음 모드 QA 필요. | 실기기에서 소리와 visual fallback을 최우선 확인. | v1 QA |
| 메트로놈 리듬 설정 | time signature, subdivision, accent first beat, tap tempo 제공. | 반영됨. 0/1/2마디 count-in, 악보별 metronome snapshot, 세트리스트별 tempo override를 추가했다. | 실제 기기 audio route와 복잡한 cue/pattern UX는 남음. | v1은 충분. advanced cue/pattern은 v1.1. | v1 QA/v1.1 |
| 미니 튜너/메트로놈 | 악보 위 floating metronome panel. tuner는 확인되지 않음. | 반영됨. | Clef panel이 악보를 가리는지. | 고정형 유지, movable/resize는 spike. | v1 QA/Spike |
| 터치 페이지 넘김 | 중앙 탭 overlay. touch actions는 설정에서 따로 지정. | 반영됨. | 좌/우 page turn은 1-page 샘플이라 직접 검증 제한. | Clef tap zone hint 유지. | v1 유지 |
| 화면 여백/배경 | fullscreen viewer는 검은 주변부와 흰 page content. | 반영됨. | PDF마다 paper/white 취향 차이. | Clef 기본 paper/white 유지. | v1 유지 |

## 불분명한 항목

- MobileSheets의 실제 page edge 안내 문구는 1-page 샘플이라 확인하지 못했다.
- MobileSheets의 pedal 실장비 동작은 에뮬레이터/ADB 입력만으로 확인하지 못했다.
- MobileSheets의 metronome 실제 소리 품질과 latency는 에뮬레이터에서 체감 검증하지 않았다.
- MobileSheets의 hyperlink annotation 차단/팝업 정책은 이번 샘플로 확인하지 못했다.
- MobileSheets의 camera scan 기능은 이번 직접 관찰 범위에서 확인되지 않았다.

## 제품 판단

- Clef & Staff가 즉시 가져와야 할 것은 MobileSheets의 기능량이 아니라 선택 후 action,
  세트리스트, viewer overlay, 메트로놈 패널처럼 연주 흐름을 막지 않는 구조다.
- MobileSheets는 Android 악보앱 사용자에게 익숙한 전통적 패턴을 잘 갖고 있지만,
  첫 사용자에게는 화면 밀도와 설정량이 부담스럽다.
- Clef & Staff v1은 현재 피드백 hotfix 방향이 맞다. v1에서는 카드 식별성, 세트리스트,
  메트로놈 소리, page hint의 실제 태블릿 QA에 집중한다.
- v1.1은 display preset, pedal capture wizard, S Pen/stylus tuning, 다중 annotation layer와
  music-specific annotation shape를 우선 검토한다.
- cloud browser, batch import, CSV songbook split, MIDI, movable overlay, scanner/OCR,
  advanced annotation layer는 Spike 또는 Later로 두는 편이 안전하다.

## 다음 구현 후보

| 후보 | 근거 | 난이도 | 추천 |
| --- | --- | --- | --- |
| Metronome audio route QA | MobileSheets는 playback mode/volume을 명확히 노출하고, 사용자도 소리 안 남을 보고했다. Clef는 기본 `소리 켬`과 `소리`/`시각만` 상태 표시를 적용했다. | 중간 | 실기기 QA |
| Setlist card/rail 실기기 가독성 polish | MobileSheets Recent에 setlist가 직접 노출된다. Clef는 rail 방식이라 구분성이 중요하다. | 낮음 | v1 QA 후 필요 시 |
| Setlist reorder handoff QA | MobileSheets edit mode의 handle이 크다. Clef는 drag, 위/아래, 직접 순서 입력을 제공한다. | 낮음 | v1 QA 후 필요 시 |
| Advanced metronome cue/pattern | MobileSheets metronome은 곡 위 패널에서 상세 설정을 제공한다. Clef는 count-in, 악보별 metronome snapshot, 세트리스트별 tempo override를 추가했다. 복잡한 cue/pattern editor는 아직 없다. | 중간 | v1.1 |
| Import metadata assignment | MobileSheets import wizard에서 setlist/collection/key/artist/genre 지정 가능. Clef는 로컬 PDF/이미지 import 메뉴에서 세트리스트 추가 경로를 제공한다. | 중간 | v1.1 |
| Touch/Pedal capture wizard | MobileSheets Touch & Pedal Settings가 별도 action mapping을 제공한다. | 높음 | Spike |
| Annotation/stylus polish | Clef는 favorite tool preset과 기본 shape/stamp는 반영했다. MobileSheets 대비 S Pen 실기기 튜닝, 다중 layer, staff/grid/crescendo/custom stamp pack은 남아 있다. | 중간 | v1.1/Later |
| Full cloud/browser import | MobileSheets는 Dropbox/Drive/OneDrive/Nextcloud 내장. | 높음 | Later |

## 출처/근거

- 직접 실행: MobileSheets Trial `3.9.43 (Build 647)` on Android 15 emulator.
- 보조 확인: installed APK strings에서 metronome/audio pitch shift/MIDI pitch bend는 확인됐지만 tuner UI 문자열은 확인되지 않았다.
- 기존 문서 근거: `docs/product/sheet-viewer-reference-analysis.md`
- MobileSheets 공식 사이트: https://www.zubersoft.com/mobilesheets/
- MobileSheets User Guide: https://www.zubersoft.download/manuals/MobileSheets.pdf

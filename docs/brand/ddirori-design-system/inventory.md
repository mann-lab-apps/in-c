# 악보앱 컴포넌트 조사와 공유 경계

아래 추출 표의 줄 번호와 초기 스타일은 도입 당시 기록이다. 현재 실제 소비 여부와 남은 개별 스타일은 [시스템 감사](system-review.md)를 우선한다.

현재 main.dart에서 아래 30개 심벌을 찾아 필드·직접 지정 색·일부 배치 수치를 기록한다. [기계 추출 기록](evidence/component-inventory.json)은 재실행할 수 있다. private 심벌을 공통 패키지가 import하지 않고 공개 표시 API와 앱 adapter로 연결한다.

| 실제 심벌과 위치 | 역할과 기존 스타일 | 공통 API와 판단 | 앱에 남길 책임 | 회귀 확인 |
| --- | --- | --- | --- | --- |
| [_SearchField : 1271](../../../apps/in_c_sheet/lib/main.dart) | 검색과 외부 query 동기화; Theme / 기본 Material | DdiroriInput / DdiroriSearch / 추출 | TextEditingController 수명과 선택 보존은 입력 위젯; query와 검색 결과는 앱 | 입력·지우기·외부 query·한글 조합 |
| [_LibraryViewBar : 1502](../../../apps/in_c_sheet/lib/main.dart)<br>[_LibraryFacetExplorer : 1578](../../../apps/in_c_sheet/lib/main.dart)<br>[_LibraryFacetRow : 1674](../../../apps/in_c_sheet/lib/main.dart) | 정렬·필터·탐색; Theme / 기본 Material | DdiroriChoices / Toolbar / 합성 | SheetLibraryViewSettings와 facet 집계는 앱 | 즐겨찾기·태그·컬렉션·그룹·별점 조합 |
| [_LibraryProfileBar : 1363](../../../apps/in_c_sheet/lib/main.dart)<br>[_LibraryProfileSheet : 1408](../../../apps/in_c_sheet/lib/main.dart) | 작업 공간 선택; Theme / 기본 Material | Choices / 시트 helper / 합성 | profile 생성·이름·삭제와 저장은 앱 | 선택·취소·삭제 후 현재 profile |
| [_ScoreGrid : 3195](../../../apps/in_c_sheet/lib/main.dart)<br>[_ScoreTile : 3263](../../../apps/in_c_sheet/lib/main.dart) | 악보 목록·그리드·선택·보조 행동; Theme / 기본 Material | DdiroriItem + 앱 레이아웃 / 부분 추출 | SheetScore·metadata formatting·열기·공유는 앱 | 긴 제목·목록/그리드·favorite/pin·다중 선택 |
| [_QuickAccessBand : 2806](../../../apps/in_c_sheet/lib/main.dart)<br>[_QuickAccessScoreChip : 2928](../../../apps/in_c_sheet/lib/main.dart) | 최근·고정 악보 접근; Theme / 기본 Material | Choices / Item 합성 / 합성 | 최근/고정 목록·정렬은 controller | 항목 없음·긴 이름·실행 대상 |
| [_EmptyLibrary : 2374](../../../apps/in_c_sheet/lib/main.dart)<br>[_NoticeBanner : 1750](../../../apps/in_c_sheet/lib/main.dart) | 빈 상태와 안내; #fff0e8, #e7b599 | StatePanel / Banner / 추출 | 가져오기·다음 행동 callback은 앱 | 안내와 오류 구분·다음 행동·글자 확대 |
| [_ViewerLoadingBanner : 11139](../../../apps/in_c_sheet/lib/main.dart)<br>[_ViewerProblemBanner : 11215](../../../apps/in_c_sheet/lib/main.dart)<br>[_ViewerFileStatusBanner : 11179](../../../apps/in_c_sheet/lib/main.dart)<br>[_ViewerErrorBanner : 11198](../../../apps/in_c_sheet/lib/main.dart) | 대기·오류·파일 상태·복구; Theme / 기본 Material | Progress / StatePanel / Banner / 추출 | 파일 크기·경로·오류 원인 판정은 앱 | 큰 PDF 대기·누락·손상·진단 펼치기 |
| [_ScrollableAppBarActions : 10660](../../../apps/in_c_sheet/lib/main.dart)<br>[_AppBarActionSlot : 10707](../../../apps/in_c_sheet/lib/main.dart) | 좁은 화면의 행동 묶음; Theme / 기본 Material | Toolbar / IconButton / 합성 | 각 행동의 실행 조건은 viewer | keyboard focus·작은 폭·overflow |
| [_AnnotationToolbar : 11991](../../../apps/in_c_sheet/lib/main.dart) | 주석 도구·색·굵기·undo/redo; Theme / 기본 Material | DdiroriAnnotationTools / 표시 추출 | annotation enum adapter·펜 좌표·저장·layer/export는 앱 | 선택 도구·색·굵기·undo/redo enabled |
| [_ViewerControls : 12215](../../../apps/in_c_sheet/lib/main.dart)<br>[_PerformanceQuickActions : 12300](../../../apps/in_c_sheet/lib/main.dart)<br>[_PerformanceQuickActionButton : 12407](../../../apps/in_c_sheet/lib/main.dart) | 페이지와 공연 모드; #ffd54f | PageControls / Toolbar / IconButton / 표시 추출 | 페이지·setlist·pedal·공연 실행 상태는 앱 | 첫/끝 페이지·큰 조작·공연 모드에서 도구 숨김 |
| [_CropSlider : 11420](../../../apps/in_c_sheet/lib/main.dart)<br>[_NullableBoolControl : 3145](../../../apps/in_c_sheet/lib/main.dart) | 범위 값과 변경 없음 선택; Theme / 기본 Material | Number / Segments / 합성 | crop 적용·metadata null 의미는 앱 | 경계·step·변경 없음 유지 |
| [_LinkedAudioPlayerSheet : 13252](../../../apps/in_c_sheet/lib/main.dart)<br>[_MetronomeSheet : 15069](../../../apps/in_c_sheet/lib/main.dart) | 오디오 조작·BPM·박자; Theme / 기본 Material | Transport / Number / BeatIndicator / 표시 추출 | SheetAudioPlayer/Metronome·ticker·preferences는 기존 엔진 | 재생/정지·seek·BPM 경계·박자 |
| [_TunerMeter : 14720](../../../apps/in_c_sheet/lib/main.dart)<br>[_TunerLedStrip : 14793](../../../apps/in_c_sheet/lib/main.dart)<br>[_TunerStringTargetPanel : 14856](../../../apps/in_c_sheet/lib/main.dart)<br>[_TunerInputPowerBar : 15022](../../../apps/in_c_sheet/lib/main.dart) | 음정·신뢰도·목표·파워; Theme / 기본 Material | TunerMeter + Choices / SettingsRow / 미터 표시 추출, 나머지 합성 | SheetTunerFeedback·프로필·측정·noise floor는 앱 | 낮음/정확/높음·신호 없음·낮은 신뢰도·목표 변경 |

## 구현에서 확인한 계약

검색은 외부 query 변경을 didUpdateWidget에서 반영한다. LibraryViewBar는 Wrap과 ActionChip/FilterChip으로 상태를 나누고, ScoreGrid는 폭에 따라 목록과 그리드를 바꾼다. ViewerControls는 어두운 overlay와 별도 공연 모드 크기를 가진다. AnnotationToolbar의 색과 굵기는 문서 편집값이며 UI 테마로 대체하지 않는다.

현재 앱 루트의 seed 색과 화면 바탕, 검색의 흰색·반경·윤곽, NoticeBanner의 살구 계열, viewer overlay처럼 직접 지정한 값은 테마 교체만으로 모두 바뀌지 않는다. 이행 때 각 연결 지점의 상태와 의미를 확인한다.

## 다른 소비 환경

Chromatics의 App.tsx는 도구 분류·선택·dock을 소유한다. SpanProperties.tsx는 Score와 span endpoint/engraving 편집, NativeBackupsDialog.tsx는 Electron bridge와 복구 수명주기, NotationPreview.tsx는 VexFlow 렌더링을 담당한다. 공통 웹 패키지는 이 도메인을 import하지 않고 입력·도구·상태·modal의 문법만 제공한다.

Click과 Chime은 Flutter Material 테마와 별도 controller/preferences/audio를 가진다. 플레이의 catalog·녹음·트랙 구조, 커뮤니티의 feed·광고 표기는 각 앱에 남긴다. 자세한 적용 지점은 [도입 계획](adoption.md)을 따른다.

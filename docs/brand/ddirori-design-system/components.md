# 띠로리 공통 컴포넌트 API

현재 형태·간격·타이포의 기준과 토큰은 [컴포넌트 언어](component-language.md)를 따른다.

상태·slot·키보드·플랫폼별 상세 계약은 [컴포넌트 구축 계약](component-contracts.md)에 있다. 현재 구현과 후속 계약을 구분한다.

## 공개 진입점

Flutter는 `package:ddirori_ui/ddirori_ui.dart`, 웹은 `packages/ddirori_web/src/index.tsx`와 `styles.css`를 사용한다. 웹 스타일과 생성 토큰은 `.ddirori` 영역에 적용한다.

| 역할 | Flutter | React |
| --- | --- | --- |
| 의미 타이포 | ddiroriTextStyle(DdiroriTextRole) / TextTheme | Text as + variant |
| 테마 | ddiroriTheme, DdiroriStyle | .ddirori의 data-theme / data-density |
| 주요·보조·위험 행동 | DdiroriButton | Button |
| 이름 있는 아이콘 행동 | DdiroriIconButton | IconButton |
| 입력·검색 | DdiroriInput, DdiroriSearch | Input, Search |
| 단일·다중 선택 | DdiroriChoices, DdiroriSegments | Choices |
| 페이지 제목·행동 | DdiroriPageHeader, DdiroriAdaptiveActions | 카탈로그의 heading·action 조합 |
| 도구 그룹 | DdiroriToolbar | Toolbar |
| 메타정보 항목 | DdiroriItem | Item |
| 상태·요약 | DdiroriStatusBadge, DdiroriMetric, DdiroriMetricGroup | badge·metric 조합 |
| 안내·성공·주의·오류 | DdiroriBanner | Banner |
| 빈 상태·복구·진단 | DdiroriStatePanel | StatePanel |
| 확정·불확정 진행 | DdiroriProgress | Progress |
| 설정 행 | DdiroriSettingsRow | SettingsRow |
| 시트·확인창 | showDdiroriSheet / showDdiroriDialog | Dialog의 sheet 속성 |
| 숫자·범위 조절 | DdiroriNumber | NumberControl |
| 로고·바흐 | DdiroriMark / DdiroriBach | Mark / Bach |
| 페이지 이동 | DdiroriPageControls | PageControls |
| 주석 도구 | DdiroriAnnotationTools | 카탈로그의 Choices·Toolbar 합성 |
| 재생 조작 | DdiroriTransport | Transport |
| 재생 시간·진행 | DdiroriPlaybackProgress | Transport 내부 progress |
| 현재 박 | DdiroriBeatIndicator | BeatIndicator |
| 음정 표시 | DdiroriTunerMeter | TunerMeter |

Flutter의 `DdiroriSection`은 subtitle과 trailing을, `DdiroriItem`은 leading·trailing·actions와
selected·disabled를 지원한다. `DdiroriMenuButton<T>`은 이름 있는 메뉴 trigger를 제공한다.
세그먼트는 선택값과 아이콘을 매핑할 수 있다. 세부 시그니처와 기본값은 실제 공개 소스를
따른다.

## 행동

버튼의 callback은 Flutter에서 FutureOr, 웹에서 void 또는 Promise다. 실제 비동기 작업 동안 중복 실행을 막고 완료 뒤 복구한다. 외부 busy도 지원한다. 외부 disabled 또는 null callback은 실행되지 않는다. 실패를 제품 화면에서 보여주려면 onError를 연결하고 상태 배너·복구 행동을 제공한다.

주요 행동은 한 작업 그룹의 중심에 두고, 위험 행동은 명시적인 이름과 확인 흐름으로 구분한다. 아이콘에는 tooltip과 접근성 이름을 제공한다. 선택 상태는 selected/aria-pressed로 전달한다.

## 입력과 선택

입력의 value는 호출자가 소유한다. onChanged/onChange를 화면 상태에 반영하고, 바깥에서 바뀐 query도 동기화한다. 지우기는 빈 문자열을 전달한다. 오류는 설명과 연결하고 이전 값이 유효했다고 가정하지 않는다.

Choices는 선택 집합을 반환한다. 단일 선택 해제를 허용하지 않는 도구는 호출자가 빈 집합을 무시하거나 Segments의 정책을 사용한다. 여러 선택은 나머지 항목을 보존한다. Flutter의 NullableBoolControl은 앱의 '변경 없음' 의미를 adapter에서 명시적인 값으로 매핑한다.

Number는 min/max/step/unit과 외부 값을 받는다. 직접 입력은 범위와 유한한 수인지 검증하고 잘못된 값을 내보내지 않는다. Flutter 직접 입력은 완료 키로 확정하고, 웹은 Enter 또는 blur로 확정한다. 증감 버튼은 경계에서 비활성화된다.

## 목록과 도구

Item은 문자열·leading·trailing·보조 행동과 선택 callback을 받으며 Score나 Recording 모델을
import하지 않는다. disabled는 행과 자식 pointer를 함께 차단한다. 제목을 누르는 행동과
즐겨찾기·정보·다중 선택을 분리한다. 그리드 열 수는 카탈로그나 제품 레이아웃이 결정한다.

StatusBadge는 상태를 색만으로 전달하지 않고 아이콘과 문자열을 함께 제공한다. MetricGroup은
호출자가 제공한 수치를 최소 항목 폭에 따라 줄바꿈하며 집계 계산은 하지 않는다.

Toolbar는 줄바꿈 또는 Flutter의 scroll 옵션을 사용한다. 선택 도구는 pressed 상태, 실행 불가 도구는 실제 disabled를 가진다. 도구가 숨겨지는 모드에서는 접근성 트리에서도 빠지게 한다.

## 상태와 진행

Banner의 kind는 info/success/warning/error다. 오류는 화면 맥락을 잃지 않게 복구 행동을 함께 둔다. StatePanel의 진단 문자열은 펼쳤을 때만 보이며 사용자가 이해할 제목·설명과 분리한다.

Progress의 값이 없으면 불확정 로딩, 있으면 0~1의 실제 진행이다. 진행값을 추정하지 않는다. 웹은 progressbar를 한 번만 노출하고, Flutter는 별도 Semantics와 중복되지 않는 시각 영역을 사용한다.

## modal

Flutter 시트는 useSafeArea·키보드 inset·스크롤 가능한 본문을 제공한다. 다이얼로그도 긴 본문을 스크롤한다. 호출자는 callback에서 Navigator로 결과를 반환한다.

웹 Dialog는 open·onClose와 title을 받고 네이티브 dialog를 사용한다. Escape 닫기와 포커스 복귀는 카탈로그의 브라우저 검사에 포함한다. sheet는 같은 계약의 하단 배치다.

## 음악 패턴 계약

페이지 이동은 page/count와 callback만 받는다. 시작·끝에서 유효하지 않은 이동을 막고 공연 모드는 큰 조작을 제공한다. PDF 파일과 마지막 페이지 저장은 앱이 담당한다.

Transport는 재생 상태·위치·길이·buffered 위치·seek callback과 full/compact 변형을 받는다.
PlaybackProgress는 drag 종료 시 seek를 요청하고 실제 위치와 buffering 계산은 하지 않는다.
BeatIndicator는 현재 박을 표시할 뿐 자체 타이머가 없다. TunerMeter는 앱이 판정한 상태와
cents를 받고 음높이를 측정하지 않는다. 신호 없음에서는 이전 수치를 보여주지 않는다.

주석 색·굵기는 편집 도구의 값이며 저장된 문서 스타일을 브랜드 토큰으로 덮어쓰지 않는다.


현재 적용 범위·후속 순서는 [시스템 감사](system-review.md)를 따른다. [이전 라임 고도화 기록](refresh-2026-10-23.md)은 이력이다.

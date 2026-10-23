# 컴포넌트 구축 계약

2026-10-23. [기초 규칙](foundations.md)이 값의 기준, 이 문서가 구축 계약, [공개 API](components.md)가 현재 구현 목록이다. ‘후속’으로 표시한 API는 아직 존재하지 않는다. 컴포넌트가 파일·악보·녹음 모델을 import하지 않고 표시값·slot·callback을 받는 경계를 유지한다.

## 공통 계약

- 부모가 값·선택을 소유한다. callback은 요청이며 호출 뒤 실제 값을 추측해서 변경하지 않는다. 비동기 작업은 중복 실행을 잠그고 오류를 host에 전달한다.
- 상태 우선: disabled/busy는 실행 차단, 선택 의미는 보존. selected 면은 hover에서도 유지, pressed는 경계나 중립 피드백. focus는 별도 2px 신호다. 필드 오류의 메시지/경계는 포커스 중에도 남는다.
- 타이포는 textStyles 역할, 내부 치수는 control/layout, 색은 semantic 역할. variant를 색상 hex나 임의 여백 prop으로 대체하지 않는다.
- comfortable/compact는 정보 밀도다. touch48 조작 영역은 별도이며 큰 글씨에서 높이가 늘어난다. 32/36/48을 고정 height로 사용하지 않는다.
- 긴 한국어는 기본 줄바꿈. 핵심 실행명·오류·유일한 식별 제목은 자르지 않는다. 목록에서 2줄 제한이 필요하면 전체 이름을 상세 화면/접근성 이름으로 제공하고 제품별 계약에 명시한다.
- 아이콘은 이름이 있는 조작 또는 장식으로 구분. 장식은 semantics에서 제외. 글자/상태/형태가 색의 의미를 보완한다.
- 웹 Text의 `variant`는 외형, `as`는 문서 의미다. Flutter 역할 함수는 TextStyle만 반환하며 화면이 header/label semantics를 정한다.

## Button / IconButton

**문제:** 실행과 독립 토글. 화면 이동 탭·복잡한 선택 그룹을 실행 버튼으로 위장하지 않는다.

| 항목 | 계약 |
| --- | --- |
| anatomy / slots | root button, 선택적 leading icon, 필수 label, pending 표시. IconButton은 glyph+접근성 label |
| variant / density | primary/secondary/danger/quiet. 기본48, compact32, touch48. 실행 반경10, 도구8. 별도 size prop은 아직 없음 |
| 토큰 | action/onAction, interactionHover/Pressed, selection/onSelection, disabled/onDisabled, focus. 글자 action/label, control padding |
| 상태 | 선택 토글의 on/off 명시. busy가 중복 실행 차단. danger는 삭제 확인 문맥에서 사용; 선택 도구에 danger를 쓰지 않음 |
| 제어 | React onClick→void/Promise, Flutter onPressed→FutureOr; onError는 host 상태 안내. selected는 controlled |
| 접근성 | native button, Enter/Space; 토글만 aria-pressed/selected. IconButton label 필수. disabled는 키보드/포인터 모두 차단 |
| 긴 글자 | label Wrap/normal wrapping, 최소 높이. 빈 아이콘 버튼에 자동 생성한 의미 없는 이름 금지 |
| 플랫폼 / 확장 | Flutter native ripple/focus는 유지. 웹 title tooltip은 기본 보조 정보만 제공; 터치 설명 대체 불가. 사보 기보 glyph는 앱 slot |

현재 Flutter 선택 fill 및 disabled 우선순위를 보완했다. 웹 기존 selected prop 호환 유지. 일반 실행에 불필요한 aria-pressed를 새로 추가하지 않는다.

## Chip / 단일·다중 선택 / Segmented / Tab

**문제:** 조건 필터, 값 선택, 문서 영역 이동은 각각 다른 동작이다.

| 유형 | anatomy / 기본값 | 제어·키보드 | 구현 상태 |
| --- | --- | --- | --- |
| 필터 Chip | group, check slot, label. pill/14·500, 36/compact32/touch48 | 배열/Set + onChange, 다중은 다른 값 보존. Tab→Space/Enter | React Choices, Flutter DdiroriChoices |
| 단일 값 선택 | option label/icon, selected 표시, 반드시 하나면 empty 금지 | 값 집합과 정책. 현재 웹 Choices의 빈 집합은 host가 무시 | Flutter DdiroriSegments는 emptySelectionAllowed 정책. 웹 radio형 Segmented 후속 |
| Segmented 후속 웹 | radiogroup/radio, 모서리8, 고정 동료 집합 | roving tabindex, 좌우/Home/End, disabled 건너뜀, 필요시 수동확정 | 계약만 정의; 현재 Choices는 role=group/pressed 버튼임 |
| Tab 후속 | tablist/tab/tabpanel, active와 focus 구분 | 방향키·Home/End, aria-controls/selected, 지연 로딩은 수동 activation | 공통 API 없음. 필터로 대체 금지 |

선택 fill/check, disabled 의미 유지, focus 별도. 긴 label은 줄바꿈하고 그룹도 wrap한다. 모바일 필터가 많으면 앱이 우선 조건과 ‘더 보기’를 정한다. 음가/성부 mixed 값은 Studio adapter에서 처리하고 공통 null에 임의 의미를 부여하지 않는다. Flutter SegmentedButton은 native 키보드 동작을 사용하며 웹 radio와 완전 동일하다고 주장하지 않는다.

## Input / Search / Field

**문제:** 값과 설명·오류를 함께 전달. Placeholder는 label을 대신하지 않는다.

- Anatomy: field wrapper, label, input, clear/action slot, help/error. 반경10, 식별 border1, focus/error2, label gap6, 내부14(Flutter)/기존 웹12. 이 플랫폼 차이는 현재 유지한다.
- 본문16, label14/500, help14/400. surface/text/controlBorder/error/muted 사용. error는 help보다 우선하며 오류와 연결된 설명 ID/semantics를 제공한다.
- value/onChange 또는 value/onChanged 제어. clear는 빈 문자열을 요청. 입력 조합 중 host가 값 정규화·재정렬을 하지 않도록 한다. 숫자 확정/범위 검증은 별도 Number 계약.
- native textbox/searchbox, label association, aria-invalid, 설명 연결. 읽기전용은 읽을 수 있으나 disabled는 변경 불가. readOnly 스타일 variant는 후속.
- Flutter TextEditingController 수명·외부 값 동기화는 공통 위젯, query/filter는 앱. 한국어 IME 실기기 검수는 별도. multiline 편집기는 새로운 Textarea 계약으로 추가한다.

## ListItem / 악보·작품·녹음 행

**문제:** 식별 정보와 독립 행동. 모든 정보에 중첩 카드를 만들지 않는다.

- Anatomy: leading/checkbox, title, description, trailing, actions. itemTitle16/600, description14/400, padding16, 내부12, card radius12. 평면 목록 구분 variant는 후속; 현재 비교 화면의 flat 스타일은 카탈로그 전용이다.
- selected는 면+경계, selecting은 별도 checkbox. 제목 열기와 즐겨찾기·정보를 독립시킨다. actions를 행 전체 클릭 안에 중첩하지 않는다.
- onOpen/onTap와 onSelected 분리. Flutter enabled=false는 IgnorePointer와 ExcludeFocus로 자식 행동까지 차단. React Item에는 disabled prop이 아직 없으므로 disabled 행은 후속 API 확장 때 의미·키보드를 함께 구현한다.
- 긴 제목은 wrap; metadata는 description 역할. 핵심 작품 번호가 말줄임 뒤에 숨지 않는지 확인한다. 선택만 가능한 행에는 접근성 상태와 이름이 필요하다.
- Score는 페이지 수/thumbnail/즐겨찾기, Play는 작품/연주자/녹음/파일 상태를 문자열과 slot으로 변환한다. 권리·파일 읽기·큐 편집은 adapter 책임.

## Toolbar / 도구 그룹

**문제:** 관련 명령의 조밀한 배치. 기능을 숨기는 장식적인 도구 띠로 사용하지 않는다.

- root, named group, separator, control slots. tool radius8, padding8, group gap8, 그룹 사이16 권장. surfaceMuted/neutral border, 선택만 selection. 작은 glyph18/20과 label14.
- 현재 웹 Toolbar는 `role=group`이고 모든 버튼을 Tab으로 방문한다. `role=toolbar`를 선언하려면 후속 roving focus/방향키 동작을 구현한다. Flutter는 Wrap 또는 scroll 옵션과 native focus traversal.
- 입력·선택 대상·undo/redo 가능 여부는 host가 결정한다. 비활성 명령을 단순 opacity로만 처리하지 않는다.
- 좁은 폭에서는 group wrap 우선, 사보 연속 도구는 이름 있는 수평 스크롤 가능. 필수 명령 접근성과 focus가 잘리지 않아야 한다. 보이지 않는 panel은 접근성 트리에서도 제외한다.
- 실제 App.tsx의 도구 분류/선택 문맥/dock와 SpanProperties의 끝점/기하값을 공통 모델로 옮기지 않는다.

## Menu / Popover / Tooltip

**문제:** 일시적인 보조 선택/설명. 중요한 오류·필수 설명을 hover에만 숨기지 않는다.

- Anatomy: trigger, anchored surface, title(optional), items/content, dismiss. panel 반경16, 내부12, 항목 label14·min32/touch48, floating depth4, layer popover20/tooltip50.
- Menu는 항목 목록과 선택 callback, Popover는 임의 내용, Tooltip은 보조 텍스트다. active/open 상태는 제어 방식 하나로 일관되게 제공한다. 닫으면 trigger로 복귀하고 삭제된 trigger는 안전한 다음 항목으로 host가 연결한다.
- Menu: Arrow/Home/End, Escape, disabled 건너뜀, 이름 검색. Popover 내부 form은 menuitem으로 꾸미지 않는다. Tooltip은 focus와 hover, Escape로 닫고 pointer 이동을 방해하지 않으며 essential label을 대신하지 않는다.
- Flutter DdiroriMenuButton은 native PopupMenuButton, Tooltip은 native. 웹 공통 Menu/Popover/Tooltip API는 **후속**; 현재 IconButton.title은 완성된 Tooltip 구현이 아니다.
- portal을 만들면 색/밀도/글꼴 scope를 새 root에 전달한다. DOM 조상 밖으로 빠진 CSS 변수 상속을 가정하지 않는다. 긴 항목 wrap, 화면 끝 위치 보정과 확대 시 스크롤 검사 필요.

## Dialog / Sheet

**문제:** 사용자 결정을 요구하거나 좁은 화면에서 설정을 제공. 사소한 알림에 사용하지 않는다.

- Slots: title, close, scrollable body, actions. sectionTitle20/600, body16, panel radius16, padding24, dialog max560/sheet720, viewport margin16. Flutter native 내부 간격은 별도이며 key target 최소48.
- Surface는 중립, surfaceTint 없음. Flutter modal depth8, 웹은 top layer+경계로 구분한다. 기본 그림자를 억지로 같게 맞추지 않는다. layer30은 일반 stacking 기준이고 browser top layer 위에 z-index로 끼어들 수 없다.
- Web open/onClose, Flutter Navigator result. modal 밖 focus/inert 관리, Escape/Back, 닫고 trigger 복귀. 저장 실패면 본문/입력 유지. destructive confirm은 작업명으로 이름 붙인다.
- 200%에서 body 스크롤, actions wrap. Sheet는 safe area/keyboard inset. Flutter 시트 max85%는 현재 helper 정책. route 이동/키보드 실기기 QA는 별도.

## Banner / 상태 안내 / 빈 화면 / 로딩

**문제:** 결과와 다음 행동 전달. 성공·빈 상태·오류를 같은 문구로 처리하지 않는다.

- Anatomy: 상태 기호, 제목/본문, recovery action, 선택적 diagnostic. info/muted, success/warning/error 역할. 중립 면, border1/radius12, padding16, gap12. StatePanel은 좁은 본문 폭과 단일 주요 행동.
- Banner kind와 문자열은 host가 제공. error는 alert, 일반 안내 status. 계속 갱신되는 재생 시간은 live region으로 매 프레임 읽지 않는다.
- Progress undefined=null은 불확정, 확정값은 실제0~1만. 승인된 음형과1200ms, reduced motion 정지. 완료를 시간으로 추정하지 않는다. 작은 버튼 pending은 현재 정적 표시+‘처리 중’이며 별도 음형 애니메이션을 중첩하지 않는다.
- 바흐는 빈 상태/완료 보조 위치에 48~80 권장. 전문 도구에는 생략 가능. 기보·커서·필수 조작에 캐릭터를 넣지 않는다. 오류 원문/로컬 경로는 진단 영역에 분리한다.
- retry·파일 선택·권한 요청은 제품 callback, 서비스로 전송하는 로그는 UI 책임 밖이다.

## 서비스 식별 / 전환

**문제:** 같은 제품군의 다음 행동을 연결. 현재 없는 기능을 연결 가능한 것처럼 표시하지 않는다.

- ProductSignature: 기능 glyph, 모브랜드+역할명, description. screenTitle/description, glyph32. ServiceLink: signature+availability 안내+action.
- available/external/install/unavailable를 host가 판정. unavailable는 버튼 비활성; 외부/설치는 이름에 이동 성격을 명시한다. 대상 URL과 인증·작품 ID·권리 검사는 host 책임.
- 현재 공통 전환 안내 UI만 있고 전체 서비스 통합 탐색/로그인/딥링크가 완성된 것은 아니다. 키보드는 native button/link 계약, 이름만으로 서비스 식별 가능하게 한다.
- 공통 색·타입·상태를 유지하고 제품별 실루엣과 화면 밀도로 구분한다. 사보는 compact, 감상은 comfortable. 앱마다 다른 기본 글꼴·선택 규칙을 만들지 않는다.

## 구현자가 확인할 순서

원본 역할을 고른다 → 이 문서에서 동작 유형을 고른다 → 공개 API에 있는지 확인한다 → 없으면 최소 계약부터 구현한다 → controlled/disabled/keyboard/긴 글자/200%를 검증한다 → 실제 제품 adapter로 연결한다. 타입 안전성을 위해 웹은 생성된 DdiroriTextRole, Flutter는 생성 enum을 사용한다. Figma 대응은 [handoff](handoff.md)를 따른다.

# 컴포넌트 계약

공통 색과 크기는 [tokens.json](tokens.json)이 원본이다. 웹은 HTML/CSS 참조, Flutter는 Material 테마+도요 로딩 위젯을 제공한다. 아래의 조합 규칙까지 모두 독립 위젯으로 포장한 것은 아니다.

## 구성과 구현 범위

| 컴포넌트 | 핵심 규칙 | 현재 제공 |
| --- | --- | --- |
| Button | primary / secondary / ghost / danger, 최소 높이와 상태 | 웹 CSS, Flutter 버튼 테마 |
| Field · Search | 보이는 라벨, 안내·오류 연결, read-only 구분 | 웹 CSS, Flutter 입력 테마 |
| Checkbox · Toggle | 라벨 전체 선택 영역, 켜짐을 모양으로 표시 | 웹 예제, 네이티브 조합 규칙 |
| ModeSwitch | 선택 채움+윤곽+aria-pressed | 웹 CSS·예제, Flutter 조합 규칙 |
| Chip | 짧은 상태·필터, 삭제 가능한 경우 별도 이름 | 웹 CSS, 조합 규칙 |
| Card · ListItem | 제목 우선, 부가 행동과 열기 행동 분리 | 웹 CSS·예제, Flutter 카드 테마 |
| Toolbar | 명령을 의미별로 그룹화, 좁으면 래핑/오버플로 | 웹 CSS·예제 |
| Slider · Stepper | 값·단위 표시, 키보드와 숫자 입력 대안 | 웹 range 예제, Flutter slider 테마 |
| DoyoLoader | 모든 불확정 로딩에 둠칫 도요 | 웹 SVG/CSS, Flutter 위젯 |
| EmptyState | 비어 있는 이유와 다음 행동 | 웹 조합 예제 |
| Alert · Status | 상태 문구, 복구 행동, 원인 보존 | 웹 CSS·예제 |
| Dialog | 초점 진입·고정·복귀, Escape와 닫기 | 웹 네이티브 dialog 예제 |
| ScoreSurface | 문서·상태 오버레이·출력을 분리 | 웹 예제와 제품 명세 |
| Transport | 재생/정지·위치·템포를 분리 | 사보·연습 배치 예시, 오디오 미연결 |

## 버튼

주 행동은 한 작업 영역에서 하나를 우선한다. hover는 바탕 변화, pressed는 더 짙은 바탕, 키보드 focus는 3px 윤곽으로 구분한다. focus와 selected를 같은 상태로 취급하지 않는다.

disabled는 이유를 주변 문구로 설명할 수 있어야 한다. 전체 부모 opacity로 글자·진행 상태를 함께 흐리지 않는다. loading은 원래 버튼 폭을 가능하면 유지하고, 반복 실행을 막으며, 실행 중인 행동을 알리는 문구와 도요를 표시한다. 요청 식별·취소·중복 실행 방지는 실제 제품의 작업 상태에 연결한다.

삭제 같은 되돌리기 어려운 행동은 danger와 구체적인 대상 이름을 쓴다. 버튼 모양만 바꾼 채 기존 복구·확인 흐름을 없애지 않는다. Enter/Space로 실행하고, 아이콘 전용 버튼에는 접근 가능한 이름을 제공한다.

## 입력과 모드

라벨은 placeholder로 대체하지 않는다. 오류에는 `aria-invalid`와 안내 ID 연결을 쓰며 입력 값을 지우지 않는다. 읽기 전용은 복사 가능한 정보, 사용 불가는 실행 불가 상태로 구별한다. Flutter는 errorText·readOnly·enabled의 원래 의미를 유지한다.

독립적인 모드 버튼은 `aria-pressed`와 그룹 이름을 사용한다. `role=tablist`로 바꿀 경우 방향키·roving focus·tabpanel 연결까지 구현한다. 단순히 화살표 이벤트 일부를 붙이고 완성된 탭이라고 부르지 않는다. 현재 예제는 각 버튼을 Tab으로 방문한다.

## 목록·카드·피드백

열기는 제목 영역의 기본 행동이다. 즐겨찾기·옵션은 중첩 버튼 대신 별도 조작 영역으로 둔다. 파일 없음, 검색 결과 없음, 아직 가져오지 않음, 로딩 실패는 다른 상태다. 최초 빈 화면에 재시도만 제공하지 않는다.

성공은 `role=status`로 적절히 알리고, 긴급한 오류만 alert로 즉시 알린다. 반복 렌더마다 같은 문구를 보조기술에 다시 읽히지 않는다. 클라우드 기능이 없는 제품에 동기화 완료 표시를 만들지 않는다.

## 둠칫 도요 로딩: 필수

- 불확정 대기는 회전 링·기본 CircularProgressIndicator 대신 **DoyoLoader**를 쓴다. 시스템 파일 선택기 등 앱이 그리지 않는 OS 화면은 교체 대상이 아니다.
- 40 / 64 / 96 logical px 폭을 기본으로 하고, 문구를 함께 둔다. 기본은 64, 버튼·짧은 행은 40이다.
- 900ms 주기. 단색 몸통이 앞쪽으로 나왔다 낮아지고, 뒷다리는 발을 고정해 압축되며 앞다리는 펴진 채 조절된다. 새 전체를 회전시키는 스피너를 만들지 않는다.
- 전경은 현재 텍스트색이다. 밝은 화면은 코코아, 다크는 밝은 잉크, 주 행동 버튼 내부는 onAction이다.
- `prefers-reduced-motion` / `MediaQuery.disableAnimationsOf`에서는 애니메이션을 멈추고 정지 도요+문구를 유지한다.
- 진행률을 아는 작업은 도요 옆에 42% 같은 수치와 접근 가능한 진행 값을 둔다. 진행률을 모를 때 가짜 백분율을 만들지 않는다.
- 영향을 받는 영역에 busy 상태를 주고, 새 자체는 장식으로 숨기며 진행 문구를 알린다. Flutter 위젯은 하나의 live-region label로 묶는다. 부모가 이미 알리는 경우 중복 announcement를 피하도록 조합한다.
- 오래 걸리는 작업에는 실제 제공 가능한 취소·다시 시도·오류 설명을 둔다. 로딩 애니메이션이 오류 상태를 대신하지 않는다.
- 로딩을 없애기 위해 비동기 처리나 오디오 시간축을 CSS 애니메이션과 동기화하지 않는다.

웹은 [생성된 마크업](generated/loader-markup.html)을 상태 컨테이너 안에 삽입하고 [모션 CSS](generated/loader-motion.css)를 사용한다. [standalone SVG](assets/doyo-loader.svg)도 제공하지만 `img`로 삽입하면 부모 currentColor를 물려받지 않으므로 테마가 필요한 컴포넌트는 inline SVG를 우선한다.

Flutter 예:

```dart
const DoyoLoader(label: '악보를 불러오는 중')
```

주 행동색 배경에서는 `color: Theme.of(context).colorScheme.onPrimary`를 전달한다. 위젯은 상태를 표시하며 I/O·오디오를 시작하지 않는다.

## 문서와 접근성

ScoreSurface는 흰 지면과 원본 기보를 유지하고, 선택은 테두리·입력은 점선 caret·재생은 세로 cursor와 문구로 구별한다. 정적인 예제의 비율 좌표를 실제 악보 hit testing에 사용하지 않는다. 실제 렌더러의 문서/뷰 좌표 변환을 따른다.

키보드 초점, 200% 글자 크기, 터치 영역, 다크 대비, 긴 제목, 상태 announcement는 제품별 검수 항목이다. UI 아이콘의 역할을 로고 캐릭터에 맡기지 않는다.

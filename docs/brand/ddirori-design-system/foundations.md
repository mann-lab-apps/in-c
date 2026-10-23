# 띠로리 UI 기초 규칙

2026-10-23 시스템 고도화. 항목별 공식 근거와 채택/제외 판단은 [시스템 감사·레퍼런스](system-review.md), 구현 계약은 [컴포넌트 구축 계약](component-contracts.md)을 따른다. 아래 수치는 현재 구현 기준이며 후속 사용자 검증으로 조정할 수 있다.

> 현재 기준: [중립 바탕·여섯 강조색·콘텐츠 12색](color-system.md). 이전 라임·올리브 배경 시안은 승인된 방향이 아니다. 라임은 임시 강조색으로만 유지하며 대표색은 검토 중이다.

## 색의 역할

현재 값과 사용 범위는 [색상 시스템](color-system.md)을 따른다. UI 표면·행동과 선택·콘텐츠·상태·악보를 분리한다.

| 역할 | 밝은 테마 | 다크 테마 |
| --- | --- | --- |
| 기본 바탕 | #FFFFFF | #181818 |
| 표면 | #FFFFFF | #222222 |
| 보조 면 | #F5F5F5 | #2C2C2C |
| 본문 | #202020 | #F5F5F5 |
| 보조 글자 | #616161 | #B8B8B8 |
| 식별용 윤곽 | #808080 | #888888 |
| 임시 주요 행동 | #52651A | #D5ED70 |
| 임시 선택 면 | #F3F8DD | #303624 |

중립 바탕과 본문은 강조색을 바꿔도 유지한다. 일반 툴바·보조 면에는 `surfaceMuted`, 선택에는 `selection/onSelection`을 사용한다. 선택·오류는 색 외에 기호·문구·접근성 상태를 제공한다. 콘텐츠 면 위 글자는 `content.*Text`를 쓰며, 진한 선의 3:1 대비를 글자용으로 간주하지 않는다.

## 토큰

`color-system.json`이 색의 원본이다. `tools/build-palettes.mjs`가 후보와 활성 입력을 생성하며, `tokens.json`이 역할을 연결한다. `tools/build.mjs`는 이 과정을 포함하고 CSS·TypeScript·Dart와 콘텐츠 색을 생성한다. 생성 파일을 직접 수정하지 않는다.

원시값 → 의미 역할 → 컴포넌트 규칙을 사용하되 중간 테마 엔진을 새로 만들지 않는다. `@light.ink`는 생성 팔레트 참조, `$spacing.lg`는 tokens.json 내부 참조다. `textStyles.screenTitle.size → $typography.title`처럼 역할을 조합한다. 순환·누락 alias, 잘못된 숫자/곡선/글자 역할은 생성 중 실패한다. 배열과 -0.02 같은 정밀도를 보존한다.

CSS는 치수 px, 글자 크기 rem, 자간 em, 행간·굵기·layer는 단위 없는 값, duration은 ms로 생성한다. Dart는 logical pixel·행간 배수·자간 em 원본을 생성하고 TextStyle에서 size×tracking으로 변환한다. TypeScript는 `as const`와 `DdiroriTextRole`/`DdiroriColorRole`, Dart는 `DdiroriTextRole` enum을 생성한다. 기존 typography/control API는 삭제하지 않았다.

`info`는 중립 muted, `interactionHover`는 surfaceMuted, `interactionPressed`는 중립 pressed 면이다. 행동색 hover/pressed와 분리한다. 선택 fill 위에서 hover가 선택을 지우지 않는다. 작은 글자와 상태 아이콘의 대비는 실제 면과 검사한다. 장식 border와 disabled는 명시적으로 다른 역할이며 낮은 대비를 일반 텍스트에 재사용하지 않는다.

Flutter는 ColorScheme의 표면 층과 `surfaceTint: transparent`를 명시해 중립 면이 자동으로 물들지 않게 한다. CSS는 `.ddirori` 안에서 적용하며 독립 영역에는 `data-theme`와 `data-density`를 명시한다. 악보의 저장된 주석 색은 테마 변경으로 변환하지 않는다.

## 형태·글자·간격·상태

[컴포넌트 형태·간격·타이포 기준](component-language.md)을 현재 원칙으로 사용한다. 본문 16/400, 필터·레이블 14/500, 섹션 20/600, 화면 제목 24/700이다. 본문 행간 1.5, 컨트롤 1.4, 제목 1.3을 사용한다. 웹 글자는 rem으로 생성하고 Flutter는 TextScaler를 따른다.

기본 간격은 4·8·12·16·24·32이며 아이콘/레이블 내부에 6을 허용한다. 필터는 캡슐, 주요 실행은 모서리 10, 분할 도구는 8이다. 포인터 필터 높이 36, compact 32, 터치 조작 영역 48을 구분한다. 큰 글씨에서는 최소 높이를 넘어 확장한다.

선택은 옅은 면·체크·semantics로 표시한다. 키보드 포커스는 2px 링으로 구분하고 선택 밑줄·중첩 그림자를 사용하지 않는다. 입력 윤곽의 대비와 disabled 동작 차단을 유지한다. 모달의 포커스 제한과 닫은 뒤 복귀는 기존 브라우저 dialog / Flutter Navigator 계약을 따른다.

웹은 동봉 Pretendard Variable과 system-ui, Flutter는 플랫폼 글꼴 또는 소비 앱 등록 글꼴을 쓴다. [폰트 라이선스](assets/FONT-LICENSE.txt)는 OFL이다. 악보 기보 글꼴과 좌표에는 UI 타이포를 적용하지 않는다. 긴 한국어 제목은 줄바꿈하고 BPM·시간은 자릿수 폭이 안정적인 숫자를 우선한다.

### 의미 타이포와 문서 의미

| textStyles 역할 | 크기/굵기/행간 | 자간 | Flutter 대응 |
| --- | --- | --- | --- |
| screenTitle | 24/700/1.3 | -0.02em | titleLarge |
| sectionTitle | 20/600/1.3 | -0.02em | titleMedium |
| itemTitle | 16/600/1.3 | 0 | titleSmall |
| body | 16/400/1.5 | 0 | bodyLarge/Medium |
| description | 14/400/1.5 | 0 | bodySmall |
| label | 14/500/1.4 | 0 | labelLarge/Medium |
| action | 16/600/1.4 | 0 | 버튼 기본. compact 14 예외 |
| caption | 12/500/1.4 | 0 | labelSmall |
| display | 32/700/1.3 | -0.02em | displaySmall; 작업 면에는 제한 |
| numeric | 16/500/1.4 | 0, tabular | ddiroriTextStyle(numeric) |

웹 `Text as="h3" variant="screenTitle"`은 h3 의미를 보존한다. `variant`로 문서 heading 수준을 추측하지 않는다. Flutter는 `Text(style: ddiroriTextStyle(...))` 또는 TextTheme를 사용하고 화면 제목에 `Semantics(header: true)`를 host가 적용한다. 기존 모든 제목의 semantics를 이행 완료한 것은 아니다.

연속 문단은 기본16 간격, 설명과 관련 label은6, 섹션 제목과 내용은12를 사용한다. 글자 스타일 자체에는 margin을 넣지 않는다. 긴 작품명은 단어 경계 줄바꿈을 우선하고 URL/긴 영문 토큰만 필요시 중간 줄바꿈한다. 편집 필드는 가로 스크롤 가능한 native 입력을 유지한다. 한 줄 말줄임은 보조 정보에 제한하고 전체 값을 볼 경로를 둔다. 단축키는 플랫폼 기호와 label14 또는 caption12, 숫자는 tabular로 정렬한다.

### 레이아웃·입력·플랫폼

| 관계 | 기준 / 토큰 | 예외와 적용 상태 |
| --- | --- | --- |
| 화면 좌우 | pageGutter16 / pageGutterWide32 | Score 실제 외곽에 연결 |
| 목록·섹션 | rowPadding16 / itemGap12 / sectionGap24, wide32 | 공통 Item·Section 일부 연결; 개별 화면 별도 |
| 좁은 내부 | labelGap6 / spacing.sm8 | label/아이콘과 그룹을 구분 |
| 문서 외 UI 폭 | contentMax1120 | Score 좁은 폭 max640은 기존 제품 예외 |
| 패널 | panelWidth280 / panelMin240 | 새 UI 기본. Studio 기존 dock200~360은 사용자 가변 폭 예외 |
| 모달 | dialogWidth560 / sheetWidth720 / dialogPadding24 | 웹 연결, Flutter native 배치 별도 |
| 전환 기준 | medium600 / wide960 / workspace1280 | 컨테이너 가용 폭 기준. 기존 Score720·카탈로그700/1100은 후속 이행 |

600 이상에서 보조 열 검토, 960 이상에서 넓은 여백, 1280 이상에서 양쪽 작업 패널을 기본 검토한다. 단순 미디어쿼리 수치보다 실제 본문 최소폭과 긴 글자를 먼저 확인한다. CSS 변수는 media query 조건으로 바로 쓸 수 없으므로 빌드/TS 값을 쓰거나 대응 상수를 명시한다. 새 시스템 검증 페이지의 960 조건은 원본과 브라우저 검사에서 확인한다.

입력 방식은 웹 pointer/any-pointer 정보와 기능, Flutter host의 touch 설정으로 결정한다. 기본 touch=true; 키보드가 연결됐다는 이유만으로 터치 target을 줄이지 않는다. 펜 환경도 최소48을 유지하고 정밀 기보 좌표와 UI target을 혼합하지 않는다. Flutter Material 기본 chip tap target/ink/route와 웹 native control 동작은 플랫폼별 차이로 유지한다.

### 형태·깊이·레이어

실행/입력10, 도구8, 카드12, 패널/시트16, 필터pill을 사용한다. 선택을 강조할 때 ring·shadow·밑줄을 동시에 추가하지 않는다. 정보 구획은 여백/1px 경계가 기본이며 floating 요소만 깊이를 갖는다. Flutter elevation flat0/floating4/modal8은 logical elevation이다. 웹 dialog는 native top layer와 border로 표현하며 이 숫자를 CSS px 그림자로 번역하지 않는다. 웹 별도 popover shadow는 구현 시 시각 검증이 필요하다.

일반 stacking은 base0 → sticky10 → popover20 → modal30 → notice40 → tooltip50이다. 현재 layer 토큰은 후속 overlay 구축 계약으로 생성되며 모든 기존 요소가 소비하는 것은 아니다. modal 안 popover/tooltip은 해당 modal의 subtree/overlay에 올린다. native dialog top layer와 Flutter Navigator의 실제 표시 순서를 z-index로 대체하지 않는다. 모달 밖 알림이 focus를 훔치면 안 된다.

### 상태 우선순위

disabled/busy는 실행을 막고 selected의 접근성 의미는 보존한다. selected fill과 check는 hover에서도 유지한다. pressed는 잠깐의 경계/중립 면, focus는 독립2px 링이다. 오류 필드는 error border와 설명을 유지하며 focus도 보인다. Flutter의 selected 버튼·아이콘, disabled 항목의 자식 키보드 진입을 공통 구현에서 처리한다. 메뉴/탭의 미구현 키보드 계약은 [구축 계약](component-contracts.md)에 구분했다.

## 모션과 소리

피드백 120ms, 패널 180ms, 음형 로딩 주기 1200ms를 기준으로 한다. 로딩의 세 머리만 밝기 순서로 반응하고 연결선·점·접점은 유지한다. 축소 모션에서는 정지형으로 바뀐다. 확정 진행은 호출자가 제공한 실제 진행값만 사용한다.

easing.standard=(0.2,0,0,1), exit=(0.4,0,1,1). 웹 버튼 feedback에 standard를 연결했다. exit는 후속 overlay 구현용 기준이며 현재 Flutter route 곡선을 교체하지 않았다. reduced motion에서 웹 transition/음형과 Flutter Item opacity transition을 정지한다. 스케일 변화·바운스는 기본 피드백에 쓰지 않는다.

앱 시작·로딩에 소리를 자동 재생하지 않는다. 새 시작음·알림음·햅틱은 이벤트와 사용자 설정, 무음 환경을 먼저 정한 후 추가한다. 메트로놈·튜너의 실제 오디오 시간과 UI 모션은 다른 책임이다.

## 악보와 아이콘

악보 지면 #FFFFFF와 표기 #202020은 다크 UI에서도 유지한다. 주석 검정·빨강·행동색·노랑, 성부·재생 위치는 문서 의미이므로 브랜드 변경으로 저장된 색을 변환하지 않는다.

로고는 최신 기본형과 24·32용 소형 좌표를 사용한다. 앱 아이콘은 플랫폼 마스크가 적용되도록 사각 원본을 관리하고, 심벌과 바흐의 여백을 맞춘다. 현재 제품별 기능 실루엣과 음형·바흐 배치는 [브랜드 시각 규칙](../ddirori-brand-system/visual-identity.md)을 따른다. 바흐를 입력·연주·공연 도구의 필수 조작 요소로 사용하지 않는다.

기능 아이콘은 small16/tool18/default20/large24, 새 선형 SVG 기준 stroke1.75를 제안한다. Material glyph·기보 폰트·브랜드 음형의 선을 이 값으로 변형하지 않는다. 광학 중심과 baseline을 실제16/20/24 크기에서 확인한다. 바흐는 빈 상태/완료48~80, 작업 면에서는 생략 가능하다. 손그림 빗금/이중선은 소개·컬렉션 그림에만 쓰고 input 경계·기보·focus에는 넣지 않는다.

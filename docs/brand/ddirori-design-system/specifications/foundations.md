# F-01 구현 기초 규칙

설계: 현행 유지 + 명시한 목표 예외. 값 정본은 [tokens.json](../tokens.json), 색 원본은 [color-system.json](../color-system.json). 모든 현재 값·참조·단위는 [토큰 부록](token-reference.md)에 있다. 실제 연결 여부는 컴포넌트 명세와 CSS/Theme을 확인한다. 생성된 값이 있다는 것만으로 위젯이 사용한다고 가정하지 않는다.

## F-COLOR 역할과 상속

`color-system → build-palettes → palette-pilot → tokens → build → CSS/TS/Dart` 순이다. `$`는 tokens 내부 alias, `@`는 palette 입력 참조다. generated 파일을 원본으로 편집하지 않는다. 테마의 `brand`는 브랜드 자산용, `action/onAction`은 행동, `selection/onSelection`은 선택, `success/warning/error`는 의미 상태다. 콘텐츠 12색과 score 색은 별도다.

| 부위 | 역할 | 규칙·실패 조건 |
| --- | --- | --- |
| 화면/작업 패널 | background/surface/surfaceMuted + text/muted | 중립 면. 강조색 후보 전환으로 전체 바탕을 tint하지 않음 |
| 선택 | selection/onSelection + check/selected 의미 | hover가 선택 의미를 없애지 않음. focus와 별도 |
| 필수 입력 윤곽 | controlBorder, error, focus | 장식 border로 대체하지 않음. error와 focus를 동시에 식별 |
| 비활성 | disabled/onDisabled | 실행과 keyboard 진입도 차단. 일반 도움말에 낮은 대비를 전용하지 않음 |
| 악보 | score.paper/notation, annotation*, voice*, playhead | 지면·저장된 주석 스타일은 theme 변경으로 덮어쓰지 않음 |
| 그림·주석 팔레트 | 콘텐츠 fill/stroke/text 쌍 | 선 대비를 글자 대비 통과로 보고하지 않음 |

웹은 `.ddirori[data-theme][data-density]` 경계다. 중첩 밀도만 바꿀 때 `Density`를 사용한다. 새 `.ddirori` root는 색을 재설정할 수 있다. Flutter는 ThemeData + DdiroriStyle로 전달하며 surfaceTint 투명 정책을 유지한다. overlay가 조상 바깥으로 이동한다면 theme/density 전달이 필요하다. 웹 현재 native top layer는 DOM 조상을 유지한다.

제품 검증 목표: 일반 글자 4.5:1, 큰 글자 3:1, 필수 그래픽/경계 3:1. WCAG에서 큰 글자는 18pt 또는 굵은14pt 이상이다. Ddirori focus는 3:1 식별 목표와 2px 독립 윤곽을 쓴다. inactive/장식 예외를 별도 기록하고 면·색 쌍을 명시한다. 접근성 전체 적합 판정은 이 수치 검사만으로 하지 않는다.

## F-TYPE 글자·단위

`textStyles`가 크기/굵기/행간/자간의 조합 정본이다. 현재 screenTitle24/700, sectionTitle20/600, itemTitle16/600, body16/400, description14/400, label14/500, action16/600, caption12/500, display32/700, numeric16/500. 세부 행간·자간은 부록 참조.

웹 font size는 rem(기준16), tracking은 em, line-height는 무단위다. Flutter size는 logical pixel, height는 배수, letterSpacing은 size×tracking이다. TextScaler를 우회하지 않는다. 숫자 BPM/시간은 tabular figures를 우선한다. 폰트가 제공하지 않는 숫자 폭 보장은 실제 fallback로 검사한다. 웹은 동봉 Pretendard Variable + system-ui, Flutter는 플랫폼 글꼴 또는 앱 제공 라이선스 TTF/OTF. 아이콘·기보 glyph를 일반 본문 폰트로 대체하지 않는다.

제목 외형과 의미를 분리한다. React Text는 기본 span이며 heading은 as로 명시한다. Flutter Text만 놓았다고 heading semantics가 생기지 않는다. 화면 제목의 읽기 순서를 먼저 정한다. 한국어 작품 제목은 가능한 어절로 줄바꿈, URL/연속 영문만 필요한 경우 anywhere. 보조 정보에만 한 줄 말줄임을 쓰고 전체 값 확인 경로를 둔다. 입력은 native 가로 스크롤/IME를 유지한다. 입력 중 조합 문자열을 normalize/trim하지 않는다. 제출 시 검증은 host가 소유한다.

## F-LAYOUT 치수와 입력 환경

spacing4/8/12/16/24/32와 내부 labelGap6을 사용한다. pageGutter16/wide32, sectionGap24/wide32, rowPadding16, itemGap12, contentMax1120, panel280/min240, dialog560/sheet720, 기본 breakpoint600/960/1280이다. `min-height`이며 큰 글자에서 늘어난다. 개별 fixed height로 텍스트를 자르지 않는다.

comfortable control48/font16/gap12, compact32/14/8. 터치 target48은 포인터 compact와 별개 제약이다. 1280px 태블릿에서도 터치 영역을 줄이지 않는다. Flutter touch 기본 true, compact pointer는 명시적으로 touch:false. 웹 coarse pointer는 CSS min-height 규칙을 따른다. 실제 장치의 혼합 입력은 제품 QA 대상이다.

구조는 `외곽 > 제목(12 간격) > 그룹(24) > field(label 6/control/help 6)`이다. 폭 부족 시 보조 행동을 다음 행으로 보내고 주 행동명을 축약하지 않는다. 긴 표는 표 영역만 가로 스크롤; 일반 폼은 페이지 가로 스크롤 금지. safe area와 가상 키보드 inset은 host viewport/route가 소유한다. 실제 Score720 전환과 Studio 가변 dock200~360은 기존 제품 예외로 유지하고 새 숫자를 강제하지 않는다.

## F-SHAPE / F-LAYER

control radius10, tool8, card12, panel16, pill999. border1, focus2/offset2. 아이콘16/18/20/24와 stroke1.75는 기본 규격이며 기보 glyph는 문서 단위(sp)다. 클릭 영역과 보이는 glyph 크기를 구분한다. 아이콘 optical alignment는 중심·baseline을 실제 글꼴과 확인하며 SVG path를 억지 확대해 맞추지 않는다.

flat0/floating4/modal8은 Flutter elevation이며 CSS shadow px가 아니다. 평면 레이아웃은 여백·경계 우선. native top layer와 Navigator의 순서를 숫자 z-index만으로 대체하지 않는다. base0/sticky10/popover20/modal30/notice40/tooltip50은 의미 순서다. 모달 안 popup은 같은 modal subtree/route 맥락에서 유지하고 바깥 focus를 열지 않는다. 위치 알고리즘·최대높이는 각 overlay 계약을 따른다.

## F-MOTION / F-AUDIO

feedback120ms, panel180ms, loader1200ms, standard(0.2,0,0,1), exit(0.4,0,1,1). 현재 exit 토큰은 모든 native route 전환에 연결된 것은 아니다. reduced motion에서는 pulse/불필요한 transition을 정지한다. progress의 값은 실제 완료 비율만; 소리·네트워크 시간 추정으로 성공률을 만들지 않는다.

사운드/햅틱 공통 API는 현재 없음(목표 정책). 기본 UI 알림은 무음이고 명시적 사용자 설정이 있는 경우만 짧은 피드백을 사용한다. 연주/재생/녹음 맥락의 알림은 오디오를 방해하지 않게 host가 억제한다. 무음 설정을 우회하지 않고 진동도 유일한 성공 정보로 쓰지 않는다. 메트로놈 엔진과 UI 애니메이션의 시간 원본을 분리한다.

## F-COPY / F-DOCUMENT

행동은 `저장`, `다시 시도`, `파일 찾기`처럼 결과가 분명한 동사. 오류는 원인·유지된 내용·가능한 다음 행동을 짧게 쓴다. `성공!`만으로 무엇이 저장됐는지 숨기지 않는다. 날짜는 제품 locale/timezone에서 포맷하며 원본 timestamp를 UI 문자열로 저장하지 않는다. 시간 Duration과 실제 날짜를 구분한다. 알 수 없는 값은 `—`/`연도 미상`, 진행 미상은 불확정 상태로 표시한다.

악보 출력은 문서 지면·기보 단위와 엔진 출력 계약을 따른다. UI 200% 확대가 저장 PDF·주석 좌표를 바꾸면 실패다. 바흐는 빈 상태·반응을 보강하며 오류 복구 문구를 대신하지 않는다. 로딩 음형은 승인 geometry를 참조하고 64/64/점32 연결선·점·접점을 임의 단순화하지 않는다.

검증: 원본 alias/생성 --check, 대비 검사, typography 실제 fallback, 390/840/1440 폭·100/200%·light/dark·touch/compact 대표 조합. 값 변경 시 영향받는 컴포넌트·소비 앱·제품 캡처 기준을 함께 검토한다.

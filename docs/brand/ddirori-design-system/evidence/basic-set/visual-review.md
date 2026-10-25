# 기본 세트 시각 검토

2026-10-24. React 브라우저와 Flutter 실제 위젯의 fixture 화면을 확인했다. 소스 앱이나 스토어 스크린샷으로 간주하지 않는다.

확인한 대표 캡처:
- catalog-light.png: 중립 배경, 섹션 위계, 기본 실행/선택/대기 상태, 입력 레이블.
- composition-0-390-light.png / flutter-0-390-light.png: 악보함의 긴 제목, 선택, 메타데이터, 독립 보조 행동.
- composition-1-390-light.png / flutter-1-390-light.png: 작품·녹음 목록과 재생 조작.
- composition-2-1440-dark.png / flutter-2-390-dark.png: 필드·설정·알림·오류 문맥.
- composition-3-1440-dark.png / flutter-3-390-dark.png: 조밀한 사보 도구와 숫자/성부 선택.

검토 후 수정:
1. 목록의 메뉴 버튼에 작품명 전체를 반복해 좁은 화면에서 버튼이 지나치게 커졌다. 접근성 이름에는 제목을 유지하고, 시각 레이블은 ‘더 보기’로 단순화했다.
2. 웹 사보 예제의 중첩 `.ddirori`가 다크 테마를 밝게 재설정했다. 색을 상속하는 Density wrapper로 분리하고 모든 폭/테마/확대 조합에 회귀 검사를 추가했다.
3. Flutter 초기 캡처에 Material 아이콘 폰트가 빠져 사각형으로 보였다. 실제 Material 폰트와 Pretendard를 로드해 다시 촬영했다. debug banner도 캡처에서 제외했다.
4. 넓은 화면의 설정 폼은 읽기와 입력의 시선 이동을 줄이도록 max560을 사용한다. 모바일에서는 가용 폭을 사용한다.
5. 팔레트 전환 직후의 중간 transition 색이 캡처에 남지 않도록 브라우저 캡처 시 유한 애니메이션을 완료시킨다. reduced motion 동작은 별도 검사한다.

회귀로 확인한 동작 수정:
- Dialog의 Tab/Shift+Tab 순환을 명시해 모달 밖으로 포커스가 빠지는 경우를 막았다.
- 메뉴를 빠르게 다시 열면 이전 문자 검색 버퍼가 남던 문제를 닫기 시 초기화했다.
- Popover/Tooltip은 top layer에서 DOM 조상의 테마를 유지하고 작은 화면의 경계를 보정한다.

남은 경계: 앱 전체 이행, 실제 파일·권한·오디오, 실기기 입력/VoiceOver, 대표색 승인. native Flutter 컨트롤과 웹을 픽셀 단위로 같게 만들지는 않는다.

## 웹 Select 열린 상태 보완 · 2026-10-24

문제: 공통 Select의 닫힌 필드만 스타일이 적용되고 열린 옵션은 macOS native 메뉴여서 폭·글꼴·모서리가 분리되어 보였다.
범위: React 공통 Select와 이를 사용하는 기본 카탈로그. 기존 토큰·Flutter·소비 앱·iOS 메타데이터는 변경하지 않는다.

| 수용 조건 | 검증 근거 |
| --- | --- |
| 열린 목록의 폭·면·테마를 공통화 | browser.json의 Select width/surface 검사, select-light.png·select-dark.png |
| 탐색과 값 확정 분리, Escape 취소·Tab 이동·외부 클릭 유지 | basic.test.tsx와 browser.json의 Select 키보드/포커스 검사 |
| disabled·빈 옵션·오류·required 검증 보존 | basic.test.tsx Select 검사 |
| 좁은 폭·확대·터치 선택 | browser.json의 390px/200%·touch, select-mobile-200.png |

열린 목록은 입력창 바로 아래(공간이 부족하면 위)에 배치한다. 작은 체크로 확정한 값을 표시하고, 활성 항목의 경계는 별도로 표시한다. 목록 모서리는 control radius, 행 간격은 density를 따른다. 화면 안에 머무르며 긴 목록은 자체 스크롤한다. 과도한 둥근 macOS 메뉴와 큰 그림자는 사용하지 않는다.

이번 보완은 로컬 React 테스트·타입/빌드·Chromium 브라우저로 검증한다. 실기기·VoiceOver·Safari 검증이나 원격 CI 실행을 의미하지 않는다.

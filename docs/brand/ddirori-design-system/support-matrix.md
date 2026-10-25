# 지원 환경과 수동 검수

확인일 2026-10-25. 현재 저장소의 Electron 42.4.1과 Flutter 3.47.2를 검증 대상으로 삼는다. 배포 중인 앱의 OS 최소 버전을 올리지 않는다. React 컴포넌트의 실제 제품 소비자는 Electron이며 Flutter web은 React Popover를 사용하지 않는다.

React Select/Menu/Popover/Tooltip은 `HTMLElement.prototype.showPopover`, Dialog는 `HTMLDialogElement.prototype.showModal`을 필요로 한다. 구형 브라우저 fallback은 없다. 공식 근거: [MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API), [MDN showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal). Popover의 세부 기능별 호환성은 다르므로 단순한 “최신 브라우저” 문구를 지원 보증으로 쓰지 않는다. 새로운 웹 서비스 도입은 실제 지원 브라우저에서 feature detection과 이 문서의 keyboard/overlay 검증을 먼저 수행한다. API가 없는 대상은 native select/dialog 대안 또는 검증한 polyfill을 마련하기 전 해당 컴포넌트 도입을 막는다. 지원 버전을 검사 편의를 위해 올리지 않는다.

Flutter 참고: [공식 접근성 지침](https://docs.flutter.dev/ui/accessibility). 읽기 이름·순서, TextScaler·keyboard inset·48px 터치 영역을 widget test로 검사하더라도 실제 보조기기 경험을 보장하지 않는다.

| 미실행 대상 | 재현·기대 결과 | 담당 / 차단 범위 |
| --- | --- | --- |
| iPhone/iPad VoiceOver | Play 파일 작업→내부 메타데이터 편집→필드·저장·취소 탐색. label/현재 출처/오류가 읽히고 저장 중 입력·Back 차단, 성공 후 원래 목록으로 이동 | iOS QA. 해당 제품 출시 검수, 저장소 공통 도입은 가능 |
| Android TalkBack | 같은 흐름, 200% 글자와 키보드 표시. 모든 필드·취소·재시도에 도달하고 오류를 읽을 수 있음 | Android QA. 해당 제품 출시 검수 |
| macOS 실제 한글 IME | Studio 표기 객체→배치·형상. 조합 중 Enter는 전역 명령 없음, 최종 확정 한 번 후 undo 한 번 | Studio QA. 해당 플랫폼 출시 검수. 합성 composition 이벤트 테스트는 실물 IME 증거 아님 |
| 실제 Safari/iOS Safari | React catalog `?components`의 Select 탐색/Enter/Tab/Escape, dialog 안 popup, 200%·viewport 끝·스크롤. 포커스 복귀·popup 노출·잘림 없음 | 웹 도입 담당. Safari를 지원하는 웹 제품 도입 전 필요; 현재 Electron 도입을 막지 않음 |
| 실제 저장 실패/기기 재생 | Play 로컬 파일 선택·재생 중 메타데이터 편집, 취소/저장 후 큐·위치 유지. 디스크 저장 실패 후 draft 재시도와 재실행 시 값 확인 | Play QA. 실제 I/O·오디오 출시 검수; widget repository double을 기기 증거로 쓰지 않음 |

밝음/어두움·좁은 폭·큰 글자·long text·keyboard·popup 자동화 결과는 이번 [검증 기록](evidence/shared-baseline-2026-10-25/README.md)에서 분리한다. 실제 Safari/VoiceOver/TalkBack 검수나 접근성 전체 적합을 선언하지 않는다.

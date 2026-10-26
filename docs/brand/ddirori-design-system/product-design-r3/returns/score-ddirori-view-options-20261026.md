# Score R3 · 좁은 화면 보기 옵션

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션`.
- `showDdiroriSheet`, `DdiroriBanner`, `DdiroriSection`, `DdiroriItem`으로 빠른 접근, 읽기와 연습, 필기, 페이지 편집, 공유와 진단을 구획했다.
- 기존 설정·편집·공유·진단 action과 enabled 조건은 `_handleViewerMenuAction` 및 기존 controller에 그대로 남긴다. `모든 도구` adapter는 `DdiroriIconButton`을 기존 `IconButton`과 같은 action 계약으로 변환한다.
- 390px fixture의 실제 PDF widget 회귀에서 보기 옵션 → 파트/메모/북마크/표시·맞춤/페달/렌더링 경로와 PDF document identity를 확인했다.
- 실제 iOS scroll 감각, VoiceOver heading 순서, 펜·페달·오디오 품질은 확인하지 않았으며 Device QA로 남긴다.

## 후속 적용 · 넓은 화면 페이지 정리

- `모든 도구` 안의 페이지 정리도 일반 `ListTile` 대신 `DdiroriItem`과 `DdiroriMenuButton`으로 표시했다.
- 기존 메뉴 action과 document-ready 비활성 정책은 유지한다. 실제 page metadata 저장·원본 PDF 보존·적용 사본 생성은 이 UI 변경으로 검증 범위를 넓히지 않는다.

## 후속 적용 · 입력 진단

- 실제 화면: `모든 도구 → 페이지 정리 → 입력 진단`.
- 입력 진단은 `showDdiroriSheet`, `DdiroriBanner`, `DdiroriSettingsRow`, `DdiroriItem`, `DdiroriButton`으로 최근 입력·현재 viewer·로그 복사·직접 설정 진입을 같은 sheet 계약 안에 표시한다.
- 실제 PDF widget 회귀는 빈 진단 sheet 진입과 PDF document identity를 확인한다. Bluetooth/USB 페달·키보드의 key/HID 해석, VoiceOver, 큰 글씨와 재시작 뒤 설정 동작은 Device QA로 남긴다.

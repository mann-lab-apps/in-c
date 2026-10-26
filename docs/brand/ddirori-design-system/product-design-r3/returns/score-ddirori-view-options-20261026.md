# Score R3 · 좁은 화면 보기 옵션

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션`.
- `showDdiroriSheet`, `DdiroriBanner`, `DdiroriSection`, `DdiroriItem`으로 빠른 접근, 읽기와 연습, 필기, 페이지 편집, 공유와 진단을 구획했다.
- 기존 설정·편집·공유·진단 action과 enabled 조건은 `_handleViewerMenuAction` 및 기존 controller에 그대로 남긴다. `모든 도구` adapter는 `DdiroriIconButton`을 기존 `IconButton`과 같은 action 계약으로 변환한다.
- 390px fixture의 실제 PDF widget 회귀에서 보기 옵션 → 파트/메모/북마크/표시·맞춤/페달/렌더링 경로와 PDF document identity를 확인했다.
- 실제 iOS scroll 감각, VoiceOver heading 순서, 펜·페달·오디오 품질은 확인하지 않았으며 Device QA로 남긴다.

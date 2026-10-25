# 공유 기준 검증 · 2026-10-25

현재 작업 결과와 커밋 정보를 기록하는 위치다. 이전 evidence는 덮어쓰지 않는다.

시작 HEAD: `44f8b2a5`. 기존 미커밋 DS 코드·명세·카탈로그·Score 적용·메타데이터를 검토해 포함한다. 당시 파일별 SHA-256과 worktree 목록은 `out/ddirori/shared-baseline/start.json`에 보존했다. 다른 Chromatics 작업 트리는 유지한다.

## 수용 조건

| 계약 | 증거 |
| --- | --- |
| 같은 저장소에서 실제 패키지 연결 | root file dependency, Studio production build, React/Flutter starter |
| Play 실패 draft·재시도·중복·취소·복귀 | library_management_test, metadata_edit_dialog_test |
| Studio 자동/0·IME·Escape·단일 commit·undo | SpanProperties.test, 실제 App.test의 geometry/native history |
| 공통 상태·키보드·popup | shared package tests, basic-set browser run |
| Score 영향 | 전체 Score analyze/test |
| 정본 일치 | token check, API snapshot, specifications, catalog build |
| 배포 계약 | Play/Score YAML check; 스토어·기기 촬영 미실행 |

검증 로그는 실행 후 이 폴더에 수록한다. 원격 CI는 push 후 별도 기록한다. 실기기·Safari·VoiceOver·TalkBack·실물 IME는 [수동 검수](../../support-matrix.md)를 따른다.

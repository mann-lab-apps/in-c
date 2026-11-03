# 띠로리 Studio alpha.39 — 릴리즈 인계

준비일: 2026-11-03 KST. 사용자가 커밋·푸시·릴리즈를 승인했다.

- 기능 checkpoint: `841b1ec7`.
- 버전 checkpoint: `d9990fd16b5ced39c28f67f35c681f55b9daba65`.
- 변경 불가 태그/릴리즈 소스: `v0.1.0-alpha.39` → `188d4ef40422a221e64a97c6afc78e00000d1c94`.
- 브랜치: `feature/studio-desktop-brand-20261103`.
- preflight: https://github.com/mann-lab-apps/in-c/actions/runs/41654893255 — Windows/Linux package:dir·실제 native smoke PASS, 게시 없음.
- Release workflow: https://github.com/mann-lab-apps/in-c/actions/runs/41655425462 — 사용자 일단락 요청 시점: 세 플랫폼 test:all 실행 중, 아직 release not found. 자동 게시 workflow는 취소하지 않았으며 실제 최신 상태 재조회 필요.

원본 작업 공간·다른 worktree·사용자 설치 앱을 바꾸지 않았다. 이전 alpha.38 태그와 게시 파일도 유지한다. 이번 게시를 main 병합이나 사이트 배포로 해석하지 않는다.

## 검증 구분

기능 checkpoint의 로컬 전체 검사(3,811+Node5)와 실제960/1400/native/PDF/OS 이름·아이콘 검토는 ../studio-desktop-brand-20261103/handoff.md에 보존한다. 그때의 alpha.38 ad-hoc 검증본을 alpha.39 서명 배포 파일로 재사용하지 않는다. alpha.39 버전/identity focused7·typecheck·tag 일치·공백 검사가 통과했다. 태그 소스의 플랫폼별 전체 검사·패키징·서명/공증·smoke와 게시 파일 다운로드 결과는 이 폴더의 후속 JSON으로 기록한다.

초기 feature commit에서 generated source.patch의 필수 문맥 공백이 --check에 잡혔으나 명령열이 중단되지 않았던 실수는 preflight.md에 기록했다. 원문 bytes는 보존했고 해당 증거 경로 하나에만 whitespace 형식을 명시했다. 제품 소스 검사는 비활성화하지 않았다.

## 설치·지원 범위

macOS에서는 기존 in-C를 종료하고 DMG의 ‘띠로리 Studio’를 Applications로 복사한 뒤 새 이름의 앱을 실행한다. 파일명이 달라 기존 앱이 남을 수 있다. 기존 userData/sessionData 경로, appId, 확장자·schema·설정 키는 유지한다. 실제 기존 앱을 덮어쓰거나 사용자 데이터로 업그레이드를 시험한 승인은 아니다.

Windows는 미서명으로 SmartScreen 안내가 표시될 수 있다. 외부 MuseScore GUI/MIDI·청음·물리 IME·OS 파일 dialog·스크린리더·실기기는 수행한 범위를 넘겨 승인하지 않는다. 한 마디/보표 박자표·현재 꾸밈음 표기·화음 선택 등 지원 경계는 authored release notes를 따른다. Commercial V1/RC 전체 완료가 아니다.

사이트 다운로드 manifest와 PR790은 이번 작업에서 수정하지 않았다. 기존 검증 자료를 현재 게시 성공으로 덮어쓰지 않는다.

## 사용자 요청에 따른 일단락

목표 관리 도구는 `goal: null`을 반환했다. 활성 목표를 새로 만들거나 릴리즈를 완료 처리하지 않았다. 이 대화의 추가 구현·검증 대기는 종료한다. 이미 승인받아 시작한 GitHub workflow는 외부에서 계속 실행되며 모든 gate가 성공하면 자동 게시한다. 사용자가 릴리즈 취소를 지시한 것은 아니므로 workflow를 취소하지 않았다. 다음 작업은 새 workflow/tag 생성이 아니라 현재 실행과 게시 여부 조회부터 시작한다. 관측 시점 snapshot은 session-stop.json을 따른다.

로컬에 준비한 helper는 out/release-qa/verify-publication-alpha39.py, verify-published-mac-alpha39.py다. 존재를 확인한 뒤 사용한다. out/brand-qa/piano-offline-muted.mjs는 기존 assertion을 보존한 음소거 QA copy이며 내부 재생 관측은 청음 승인이 아니다. out/release-qa/alpha39-release-notes-final.md에는 기존 in-C 종료 후 새 이름 앱을 설치하는 안내를 준비했으나 아직 GitHub release body에 적용하지 않았다. 사이트·main 병합은 계속 별도 범위다.

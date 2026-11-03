목표: 띠로리 Studio alpha.39의 릴리즈 후속 검증을 완결한다.
이미 시작한 CI와 게시 상태부터 확인하고, 다운로드·서명·실행·인계를
슬라이스 단위로 연속 처리한다. 새 릴리즈를 중복 생성하지 않는다.

## 목표 상태와 실행
- 실제 목표모드 실행 및 구현 요청이다. 현재 목표부터 조회한다.
- 마지막 종료 시 goal:null이었다. 일치하는 active 목표가 있으면 이어가고,
  목표가 없거나 이전 목표가 완료됐으면 이 목표를 생성한다.
- 다른 미완료 목표를 덮어쓰지 않는다. 지원되지 않는 재개를 성공했다고 말하지 않는다.
- 각 슬라이스의 검증·문서화 후 다음 실행 가능한 작업으로 진행한다.
- 사용자 중지·도구 제한을 따른다. 목표 상태·로컬 프로세스·GitHub 실행을 구분한다.
- 턴 종료 뒤 자동 실행을 보장하지 않는다. 실제 상태를 주기적으로 알린다.

## 위치와 보호
- worktree: /Users/jaemankim/Desktop/privates/coding/worktrees/studio-desktop-brand-20261103
- branch: feature/studio-desktop-brand-20261103
- 원본 /Users/jaemankim/Desktop/privates/coding/in-c 및 다른 worktree는 수정하지 않는다.
- AGENTS.md, Git 상태·HEAD·worktree·실행 프로세스부터 확인한다.
- env/secret 파일과 iOS metadata는 읽거나 수정하지 않는다.
- 사용자 설치 앱·실행 중 Electron·live out을 교체하거나 종료하지 않는다.
- reset/checkout/stash/clean/force push 금지. 기존 변경·실패 로그를 보존한다.

## 승인과 불변 기준
- 사용자는 이 버전의 커밋·푸시·릴리즈를 승인했다. 같은 작업의 후속 검증을 이어간다.
- 새 버전·다른 릴리즈·main 병합·사이트/다운로드 manifest 변경은 자동 승인으로 확대하지 않는다.
- 버전: 0.1.0-alpha.39.
- 태그: v0.1.0-alpha.39.
- 태그 소스: 188d4ef40422a221e64a97c6afc78e00000d1c94.
- 기능 checkpoint: 841b1ec7. 버전 checkpoint: d9990fd1.
- 이후 docs-only 커밋이 있을 수 있다. 현재 branch HEAD와 태그를 혼동하지 않는다.
- alpha.38과 alpha.39 태그·게시 자산은 이동/삭제/덮어쓰기하지 않는다.

## 먼저 읽을 인계
- docs/releases/studio-alpha39-20261103/handoff.md
- 같은 폴더의 session-stop.json, preflight.md, preflight-matrix.json
- docs/releases/notes/v0.1.0-alpha.39.md
- docs/releases/studio-desktop-brand-20261103/handoff.md
- docs/product/studio-desktop-feedback-backlog-20261103.md
- 과거 manifest·uncommitted 표기·검증 당시 버전을 현재 상태로 재작성하지 않는다.

## 현재 체크포인트
- 기능/버전/사전검증 커밋은 위 브랜치로 푸시됐다.
- alpha.39 태그도 푸시됐다. 원본 작업 공간의 dirty 변경은 포함한 것이 아니다.
- Windows/Linux package:dir와 실제 packaged smoke 사전검증은 PASS:
  https://github.com/mann-lab-apps/in-c/actions/runs/41654893255
- 정식 Release workflow는 종료 관측 시 세 플랫폼 test:all 실행 중이었다:
  https://github.com/mann-lab-apps/in-c/actions/runs/41655425462
- 당시 gh release view는 release not found였다. 이후 결과는 반드시 재조회한다.
- GitHub 작업은 취소하지 않았다. 모든 gate가 통과하면 자동 게시한다.
- 로컬 기능 전체 검사3,811+Node5와 OS 이름/아이콘 검토는 이전 alpha.38 검증본 기준이다.
- alpha.39 로컬 version/identity7·typecheck·태그 일치·공백 검사와 사전 패키징은 통과했다.
- 정식 태그의 전체 검사·서명/공증·게시·다운로드 PASS는 아직 주장하지 않는다.

## 슬라이스 1: 현재 CI·게시 상태 확정
1. Git/프로세스와 정확한 태그 소스를 확인한다.
2. 위 workflow와 GitHub release를 조회한다. 진행 중이면 중복 실행하지 않는다.
3. macOS/Windows/Linux 전체 검사·패키징·artifact/native smoke,
   macOS 서명/공증과 publish 결과를 각각 기록한다.
4. 실패하면 원래 로그를 보존하고 실제 원인을 분리한다.
   새 근거 없이 재실행하거나 assertion·timeout·baseline을 약화하지 않는다.
5. 같은 소스의 일시적 인프라 실패만 해당 실패 job을 재시도한다.
   소스 수정이 필요하면 별도 후속 checkpoint에서 수정·검증하고,
   새 버전 필요성을 구체화한다. 기존 태그를 고쳐서 통과시키지 않는다.

## 슬라이스 2: 게시 자산·체크섬
- 게시 여부를 확인한 뒤에만 다운로드한다. 새 release create를 중복 실행하지 않는다.
- macOS universal DMG/ZIP, Windows setup/portable, Linux AppImage,
  SHA256SUMS.txt의 실제 이름·크기·digest·다운로드 SHA256을 대조한다.
- 새 이름의 prefix는 Ddirori-Studio다. 과거 in-C 파일명을 가정하지 않는다.
- 정상 완료한 다운로드만 성공 근거로 쓴다. alpha.38/로컬 ad-hoc 파일과 구분한다.
- 준비한 out/release-qa/verify-publication-alpha39.py는 존재·내용을 확인한 뒤 재사용한다.

## 슬라이스 3: 실제 배포 macOS 앱
- 다운로드한 DMG를 읽기 전용으로 열고 실제 Info.plist·버전·앱 ID·이름·아이콘을 검사한다.
- CFBundleName/CFBundleExecutable 정규화 일치, arm64/x86_64,
  codesign deep/strict·stapler·Gatekeeper를 확인한다.
- 자체 프로세스·임시 프로필로 프로젝트·복구·백업·XML/MIDI/PDF smoke를 실행한다.
- 가능한 경우 음소거한 짧은 offline sample/worker QA도 실행한다.
  프로그램 조작·12초 관측을 실제 포인터/청음/장시간 종료 승인으로 설명하지 않는다.
- out/release-qa/verify-published-mac-alpha39.py와
  out/brand-qa/piano-offline-muted.mjs를 확인하고 재사용한다.
- 사용자 앱·캐시·설정을 초기화하지 않는다. 자체 프로세스와 mount는 종료·분리한다.

## 슬라이스 4: 릴리즈 문구·인계·커밋
- 기존 in-C 종료 후 새 이름 앱을 설치하는 안내가 필요한지 확인한다.
  out/release-qa/alpha39-release-notes-final.md는 준비본이며 아직 게시 적용 전이었다.
- 게시 결과와 실제 검증만 release notes/handoff에 반영한다.
- 태그 소스·CI·게시 URL·해시·실패·skip·미검증을 기록한다.
- 후속 evidence는 브랜치에 커밋·푸시하되 태그를 이동하지 않는다.
- git diff --check와 관련 문서 검사를 실행한다.
- 사이트 PR790·production manifest·main 병합은 이번 범위에서 변경하지 않는다.

## 완료와 후속 범위
- 모든 필수 릴리즈 gate와 실제 게시/다운로드 검증이 끝났을 때만 이 목표를 완료한다.
- 대기 중인 CI·확인하지 않은 산출물을 PASS로 표시하지 않는다.
- 꾸밈음 발음·총보 박자표 전파·사용자 지정 박자·부분 화음 모델 등 제품 확장은
  릴리즈 검증과 섞지 말고 다음 후보로 정리한다.
- 실제 사용자 악보·외부 MuseScore·청음·물리 IME·OS 파일 dialog·스크린리더·실기기는
  수행한 범위만 보고한다. Commercial V1/RC 전체 완료라고 말하지 않는다.

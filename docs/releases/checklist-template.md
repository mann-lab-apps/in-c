# 릴리즈 체크리스트 템플릿

릴리즈 후보를 배포하기 전에 이 문서를 릴리즈 PR, 이슈, 또는
`docs/releases/checklists/v{version}.md`로 복사해서 사용한다. 항목은 일부러
중복될 수 있다. 자동 테스트가 통과했더라도 Codex 점검과 사람 점검에서 같은
기능을 다시 확인하면 릴리즈 위험을 줄일 수 있다.

## 릴리즈 정보

- 버전:
- 이전 태그:
- 릴리즈 태그:
- 릴리즈 날짜:
- 점검 위치:
- 담당:

## 원칙

- 기존 태그는 재사용하지 않는다. 문제가 있으면 다음 prerelease 버전으로 올린다.
- 앱 릴리즈 태그는 `main`에서만 만든다.
- 모든 필수 체크가 완료된 뒤 `v{package.json version}` 태그를 push한다.
- 미서명 prerelease 상태에서는 macOS Gatekeeper와 Windows SmartScreen 안내를
  숨기지 않는다.

## 릴리즈 후보 준비

- [ ] 배포할 버전을 정한다. 예: `0.1.0-alpha.4`
- [ ] `package.json`과 `package-lock.json`의 version이 같다.
- [ ] 릴리즈 커밋에는 버전 변경만 포함한다.
- [ ] 릴리즈 커밋 메시지는 `Prepare 0.1.0-alpha.N` 형식이다.
- [ ] 태그 이름은 `v0.1.0-alpha.N` 형식이다.
- [ ] `npm run verify:release-tag -- v0.1.0-alpha.N`이 통과한다.
- [ ] `git status --short --branch`에서 의도하지 않은 변경이 없다.

## 자동 테스트로 확인

로컬 또는 CI에서 명령을 실행하고 결과를 기록한다.

- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run verify:mvp`
- [ ] `npm run package:dir`
- [ ] `npm run verify:package`
- [ ] `npm run site:build`
- [ ] GitHub Actions `CI` workflow가 통과했다.
- [ ] GitHub Actions `Release` workflow의 macOS, Windows, Linux package job이 모두
  통과했다.
- [ ] GitHub Actions `Site` workflow가 통과했다.

## Codex가 점검

Codex는 테스트 결과와 저장소 상태를 기준으로 릴리즈 위험을 확인한다.

- [ ] `git log v{previous}..HEAD --oneline`으로 릴리즈 범위를 요약했다.
- [ ] `git diff --name-only v{previous}..HEAD`로 변경 범위를 확인했다.
- [ ] 새 기능 또는 큰 변경에 대응하는 테스트가 추가되어 있는지 확인했다.
- [ ] `TODO`, `FIXME`, 임시 fallback, 오래된 버전 문자열을 검색했다.
- [ ] `site/download-manifest.json`의 버전, 태그, URL, 파일명이 최신 릴리즈와
  맞는지 확인했다.
- [ ] `site/main.js`의 fallback 릴리즈 정보가 최신 버전과 어긋나지 않는지 확인했다.
- [ ] `docs/distribution.md`의 배포 절차가 현재 workflow와 맞는지 확인했다.
- [ ] `README.md`의 검증, 패키징, 웹사이트 안내가 현재 스크립트와 맞는지 확인했다.
- [ ] `SHA256SUMS.txt`가 Release artifact 전체를 포함하는지 확인했다.
- [ ] artifact 이름이 `scripts/verify-release-artifacts.cjs`의 기대값과 맞는지
  확인했다.
- [ ] Release notes 초안이 이전 릴리즈 이후 변경을 과장하거나 누락하지 않는지
  확인했다.

## 사람이 점검

사람이 실제 제품과 배포 표면을 확인한다.

- [ ] 패키징된 앱을 직접 실행했다.
- [ ] 새 악보 생성, 저장, 다시 열기를 확인했다.
- [ ] MusicXML 가져오기와 내보내기를 실제 파일로 확인했다.
- [ ] 음표, 쉼표, duration 변경, range 선택, 삭제, 복사/붙여넣기를 확인했다.
- [ ] slur, hairpin, fermata, breath mark, caesura, dynamic, articulation, rehearsal
  mark, staff text, tempo marking을 대표 악보에서 확인했다.
- [ ] playback 시작, 정지, 재시작을 확인했다.
- [ ] 최소 지원 폭과 일반 desktop 폭에서 악보가 깨지지 않는지 확인했다.
- [ ] 다운로드 페이지에서 macOS, Windows, Linux 버튼이 실제 GitHub Release artifact로
  연결되는지 확인했다.
- [ ] `SHA256SUMS.txt` 다운로드 링크가 동작하는지 확인했다.
- [ ] macOS/Windows 미서명 경고 안내 문구가 보이는지 확인했다.
- [ ] GitHub Release가 prerelease로 표시되는지 확인했다.
- [ ] GitHub Pages 배포 후 공개 사이트에서 새 버전이 보이는지 확인했다.
- [ ] GA4 또는 분석 설정을 유지할지 끌지 결정했고, 설정이 의도와 맞다.

## 배포 실행

- [ ] 릴리즈 커밋을 `main`에 반영했다.
- [ ] `git tag v0.1.0-alpha.N`
- [ ] `git push origin main v0.1.0-alpha.N`
- [ ] Release workflow가 prerelease를 생성했다.
- [ ] Release artifact와 `SHA256SUMS.txt`를 확인했다.
- [ ] `site/download-manifest.json`을 새 릴리즈 정보로 갱신했다.
- [ ] 사이트 변경을 `main`에 반영했다.
- [ ] Site workflow 배포 완료를 확인했다.

## 릴리즈 후 확인

- [ ] Release 페이지에서 각 artifact 다운로드를 확인했다.
- [ ] 공개 다운로드 페이지에서 각 OS 버튼을 확인했다.
- [ ] checksums 링크를 확인했다.
- [ ] 사용자에게 알려야 할 설치 주의사항이나 known issue를 정리했다.
- [ ] 다음 릴리즈로 넘길 문제를 이슈로 남겼다.

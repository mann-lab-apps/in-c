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
- 릴리즈 판정: `대기`

## 결과 표기

- `통과`: 확인했고 릴리즈를 막지 않는다.
- `실패`: 릴리즈를 막는 문제가 확인됐다.
- `대기`: 아직 실행할 수 없거나 순서상 나중에 확인한다.
- `차단`: 외부 조건이나 결정이 필요해 진행하지 못한다.

하나라도 `실패`가 남아 있으면 태그를 만들지 않는다. `대기` 항목은 릴리즈 순서상
나중에 확인해야 하는 항목인지, 실제로 릴리즈를 막는 항목인지 판단을 적는다.

## 실패 항목

- [ ] 없음 또는 이슈 링크와 처리 방침을 적는다.

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

## 로컬 사전 자동화

태그를 만들기 전에 로컬에서 실행할 수 있는 명령을 확인한다.

- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run verify:mvp`
- [ ] 릴리즈 QA 시나리오의 visual regression 또는 bounds 검증이 통과했다.
  - 기본 확인: `npm run verify:mvp`의 `releaseScenarioBounds` 결과에서 clipping,
    system right overflow, horizontal viewport overflow가 없어야 한다.
- [ ] `npm run package:dir`
- [ ] `npm run verify:package`
- [ ] `npm run site:build`

## 원격 사전 자동화

태그를 만들기 전, release branch push 또는 PR에서 확인할 수 있는 GitHub Actions를
확인한다.

- [ ] GitHub Actions `CI` workflow가 통과했다.

## 태그 이후 Release 자동화

현재 release workflow는 `v*` 태그 push 이후 native artifact를 만들고 GitHub
prerelease를 게시한다. 이 단계는 릴리즈 전에는 최종 확인할 수 없다.

- [ ] GitHub Actions `Release` workflow의 macOS, Windows, Linux package job이 모두
  통과했다.
- [ ] Release artifact와 `SHA256SUMS.txt`가 게시됐다.
- [ ] Release workflow가 실패하면 태그를 재사용하지 않고 다음 prerelease 버전으로
  넘어갈지 결정했다.

## 릴리즈 후 사이트 자동화

GitHub prerelease가 생성된 뒤 다운로드 manifest를 갱신하고 확인한다.

- [ ] GitHub Actions `Site` workflow가 통과했다.
- [ ] 공개 다운로드 페이지가 새 prerelease를 가리킨다.

## Codex가 사전 점검

Codex는 테스트 결과와 저장소 상태를 기준으로 릴리즈 위험을 확인한다.

- [ ] `git log v{previous}..HEAD --oneline`으로 릴리즈 범위를 요약했다.
- [ ] `git diff --name-only v{previous}..HEAD`로 변경 범위를 확인했다.
- [ ] 새 기능 또는 큰 변경에 대응하는 테스트가 추가되어 있는지 확인했다.
- [ ] `TODO`, `FIXME`, 임시 fallback, 오래된 버전 문자열을 검색했다.
- [ ] `docs/distribution.md`의 배포 절차가 현재 workflow와 맞는지 확인했다.
- [ ] `README.md`의 검증, 패키징, 웹사이트 안내가 현재 스크립트와 맞는지 확인했다.
- [ ] artifact 이름이 `scripts/verify-release-artifacts.cjs`의 기대값과 맞는지
  확인했다.
- [ ] Release notes 초안이 이전 릴리즈 이후 변경을 과장하거나 누락하지 않는지
  확인했다.

## 배포 후 Codex 재점검

GitHub Release와 사이트 배포가 끝난 뒤 Codex가 다시 확인한다.

- [ ] `site/download-manifest.json`의 버전, 태그, URL, 파일명이 최신 릴리즈와
  맞는지 확인했다.
- [ ] `site/main.js`의 fallback 릴리즈 정보가 최신 버전과 어긋나지 않는지 확인했다.
- [ ] `SHA256SUMS.txt`가 Release artifact 전체를 포함하는지 확인했다.

## 사람이 점검

사람은 기능을 따로따로 누르기보다 작은 악보 하나를 완성하면서 점검한다.

- [ ] 패키징된 앱을 직접 실행했다.
- [ ] `release-test` 새 악보를 만들고 제목, 작곡자, 빠르기를 설정했다.
- [ ] 4-8마디 안에서 음표, 쉼표, duration 변경, 삭제, range 선택,
  복사/붙여넣기를 사용해 짧은 선율을 완성했다.
- [ ] 완성 중 이음줄, 셈여림선, 늘임표, 숨표 또는 중지표, 셈여림,
  스타카토/악센트, 연습표, 보표 글자 중 이번 릴리즈에서 중요한 표현을
  대표로 추가했다.
- [ ] 재생을 시작, 정지, 재시작하며 빠르기와 표현이 크게 어긋나지 않는지
  확인했다.
- [ ] 창을 일반 데스크톱 폭과 좁은 폭으로 바꿔 보며 마디 끝, 커서, 선택 표시,
  붙임줄/이음줄이 잘리지 않는지 확인했다.
- [ ] 첫 단 상단의 빠르기표, 늘임표, 표현 기호 같은 요소가 잘리지 않는지
  확인했다.
- [ ] 완성한 악보를 MusicXML로 저장하고 다시 가져와 음악 의미와 주요 표현이
  유지되는지 확인했다.
- [ ] 같은 악보를 PDF로 변환하고 결과 파일이 열리는지 확인했다.
- [ ] 앱을 다시 열어 자동저장 복구 또는 최근 MusicXML 진입 흐름이 혼동 없이
  보이는지 확인했다.
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

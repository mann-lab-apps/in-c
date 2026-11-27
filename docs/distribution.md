# 데스크톱 패키징과 배포

## 지원 산출물

- macOS: universal DMG와 ZIP
- Windows: x64 NSIS installer와 portable EXE
- Linux: x64 AppImage

초기 prerelease는 미서명으로 배포했으나, macOS release job은 Developer ID
Application 인증서와 App Store Connect API key가 GitHub Actions secret에
등록된 경우 앱 서명과 notarization을 수행한다. Windows code signing은 아직
후속 작업이며 SmartScreen 경고가 표시될 수 있다.

## 로컬 패키징

현재 운영체제의 unpacked 앱을 만들고 실행을 확인한다.

```bash
npm run package:dir
npm run verify:package
```

운영체제별 설치 파일은 해당 운영체제에서 생성한다.

```bash
npm run package:mac
npm run package:win
npm run package:linux
```

산출물은 `release/`에 생성된다. 파일 이름은 제품명, 버전, 운영체제와
아키텍처를 포함한다.

패키징 전에는 `npm ci`로 빌드 의존성까지 설치한다. Electron 메인·프리로드가
실행 중 불러오는 패키지는 `dependencies`에 둔다. Studio 렌더러 번들이나
사이트 빌드에서만 사용하는 패키지는 `devDependencies`에 둔다. 렌더러에
번들된 외부 라이브러리의 라이선스는 배포 앱의 리소스 디렉터리 아래
`licenses/`에 포함한다.

패키지 빌드 뒤 `npm run verify:package-content`로 앱의 ASAR와 라이선스를
검사한다. 이 검사는 명시된 실행 의존성 누락, 잠금 파일에서 빌드 전용인
모듈의 유입, 라이선스 누락 또는 원본과의 차이를 감지한다. Release 사전검증과
정식 패키징에서도 실행한다.

## GitHub Release

배포 전에 [`docs/releases/checklist-template.md`](releases/checklist-template.md)를
릴리즈 PR이나 이슈에 복사하고 모든 필수 항목을 확인한다.

후보 브랜치의 소스 SHA를 고정한다. 변경이 경로 필터에 해당하면 PR의
`Release` 검사에서 세 플랫폼의 테스트·패키징·기본 실행을 확인할 수 있다.
`Verify pull request release artifacts`는 세 플랫폼 패키징이 끝난 뒤 게시와
같은 다운로드·파일 집합 검증·체크섬 생성을 실행한다. 이 작업은 읽기 전용이며
검사 로그에 체크섬을 남긴다.
Windows·Linux 기본 실행만 확인할 때는 수동 실행의 `tag=preflight`를 사용한다.
두 플랫폼은 실행 요청에 기록된 커밋 SHA를 체크아웃한다. 각 작업의
`Verify preflight commit`에서 실제 체크아웃과 요청 SHA를 대조한다.
PR 검사와 사전검증에서는 게시 작업을 건너뛴다. PR의 macOS 패키지는
Developer ID 서명과 공증을 생략한다.

정식 Release는 `Resolve release source`에서 실행에 사용할 커밋을 한 번 확정한다.
PR은 head SHA, 태그 push와 후보 수동 실행은 이벤트 SHA, 기존 태그를 선택한
수동 실행은 해당 태그의 커밋을 사용한다. 테스트·패키징·게시 작업은 이 SHA를
체크아웃한다. 게시 직전에는 원격 태그를 다시 가져와 같은 커밋을 가리키는지
확인한다. 태그가 없거나 커밋이 다르면 게시 작업이 실패한다.

게시 승인 뒤에는 후보 SHA를 가리키는 `release/*` 브랜치에서 `Release`를
수동 실행한다. `tag`에 `package.json` 버전과 일치하는 새 태그를 입력하고
`candidate=true`를 선택한다. 워크플로가 세 플랫폼의 테스트·패키징·기본 실행과
macOS 서명·공증을 마친 뒤 후보에 태그를 만들고 GitHub 프리릴리즈를 게시한다.
게시 작업은 세 플랫폼의 산출물을 각각의 디렉터리에 내려받는다. 패키지
설정이 요구하는 플랫폼별 파일 집합을 확인한 뒤 새 게시 디렉터리에 복사한다.
누락·중복·예상 밖 파일, 빈 파일, 일반 파일이 아닌 항목은 체크섬을 만들기 전에
차단한다.
게시 파일과 `SHA256SUMS.txt`를 내려받아 확인한다.

워크플로 실패 시 먼저 실행 SHA와 태그·릴리즈·산출물의 실제 상태를 조회하고
실패 로그를 보존한다. 기존 태그가 있으면 후보 SHA와 일치하는지 확인한다.
소스를 수정한 후보에 이전 태그를 옮기지 않는다. 태그 push도 `Release`를
시작하므로 후보 수동 실행과 별도 태그 push를 같은 릴리즈에 병행하지 않는다.

## 버전과 브랜치 운영

- 기능과 버그 수정은 이슈별 브랜치에서 작업하고 PR로 `dev`에 squash merge한다.
- `dev`는 다음 릴리즈 후보를 통합하고, 검증된 릴리즈 후보만 `main`에 반영한다.
- 초기 배포 단계에서는 `0.1.0-alpha.N` prerelease를 사용하고, 사용자에게
  전달할 빌드가 생길 때마다 `N`을 1씩 올린다.
- 릴리즈 커밋은 `Prepare 0.1.0-alpha.N` 형식으로 `package.json`과
  `package-lock.json` 버전만 포함한다.
- 릴리즈 태그는 반드시 `v0.1.0-alpha.N` 형식으로 만들고, 태그는 해당
  릴리즈 커밋을 가리킨다.
- 태그는 재사용하지 않는다. 문제가 있으면 다음 alpha 버전으로 새 릴리즈를
  만든다.
- 게시 파일 검증 뒤 공식 `ddirori.com/studio/`의 다운로드 매니페스트와
  정적 대체 링크를 `mann-lab-apps/ddirori`에서 갱신한다. 이전 안내의
  `site/download-manifest.json`을 갱신해야 하면 해당 사이트의 배포 범위를 적용한다.

## 설치 경고

릴리즈 후보의 설치·실행·저장·열기 결과는
[`패키지 앱 운영체제별 smoke matrix`](quality/package-app-smoke-matrix.md)에 기록한다.

### macOS

macOS release artifact는 Developer ID 서명과 notarization을 적용한다. 로컬
패키징이나 pull request package gate처럼 signing secret을 사용할 수 없는
환경에서는 Gatekeeper 경고가 표시될 수 있다.

### Windows

미서명 prerelease는 SmartScreen 경고가 나타날 수 있다. 파일 이름과
`SHA256SUMS.txt`를 확인한 뒤 실행하도록 안내한다.

### Linux

AppImage에 실행 권한을 부여한다.

```bash
chmod +x in-C-*.AppImage
./in-C-*.AppImage
```

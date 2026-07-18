# 데스크톱 패키징과 배포

## 지원 산출물

- macOS: universal DMG와 ZIP
- Windows: x64 NSIS installer와 portable EXE
- Linux: x64 AppImage

macOS 태그 릴리즈는 Developer ID 서명과 notarization 환경 변수가 없으면
패키징 전에 실패한다. Windows code signing 인증서는 아직 설정하지 않았으므로
Windows SmartScreen 경고가 표시될 수 있다.

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

로컬 macOS 패키징은 Developer ID 인증서와 notarization 환경 변수가 있는 경우에만
서명 및 공증된다. 릴리즈용 환경을 미리 확인하려면 다음 명령을 실행한다.

```bash
npm run verify:macos-signing-env
```

## macOS 서명과 공증

GitHub Actions에서 macOS 릴리즈를 만들려면 Developer ID Application 인증서와
notarization credential을 repository secret으로 등록한다.

필수 서명 secret:

- `MACOS_CSC_LINK`: Developer ID Application 인증서 `.p12` 파일 또는 base64 값
- `MACOS_CSC_KEY_PASSWORD`: `.p12` 인증서 비밀번호

notarization은 다음 세 조합 중 하나를 완성해야 한다. App Store Connect API key
방식을 권장한다.

- `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
- `APPLE_KEYCHAIN`, `APPLE_KEYCHAIN_PROFILE`

태그 또는 workflow dispatch 릴리즈에서는 `npm run verify:macos-signing-env`가 먼저
실행된다. secret이 없으면 unsigned macOS artifact를 게시하지 않고 Release workflow가
실패한다.

게시된 macOS artifact를 설치한 뒤에는 다음 명령으로 서명과 공증을 확인한다.

```bash
codesign --verify --deep --strict --verbose=2 /Applications/in-C.app
spctl --assess --type execute --verbose /Applications/in-C.app
xcrun stapler validate /Applications/in-C.app
```

## GitHub Release

배포 전에 [`docs/releases/checklist-template.md`](releases/checklist-template.md)를
릴리즈 PR이나 이슈에 복사하고 모든 필수 항목을 확인한다.

`package.json` 버전과 같은 `v` 접두사 태그를 push하면 Release workflow가
시작된다.

```bash
npm version 0.1.0-alpha.2 --no-git-tag-version
git add package.json package-lock.json
git commit -m "Prepare 0.1.0-alpha.2"
git tag v0.1.0-alpha.2
git push origin main v0.1.0-alpha.2
```

macOS, Windows와 Linux job은 각각 네이티브 패키지를 만들고 packaged app
smoke test를 실행한다. macOS job은 태그 릴리즈에서 서명 및 notarization secret도
검증한다. 세 job이 모두 성공해야 prerelease가 생성된다.
Release에는 설치 파일과 `SHA256SUMS.txt`가 함께 게시된다.

Release workflow는 `v*` 태그를 만든 뒤에야 native artifact를 검증할 수 있다.
따라서 릴리즈 전에는 로컬 검증과 PR/브랜치 CI를 사전 게이트로 사용한다. 태그 후
Release workflow가 실패하면 태그를 재사용하지 않고 다음 alpha 버전으로 새
prerelease를 만든다.

이미 존재하는 태그는 GitHub Actions의 `Release` workflow dispatch에서도
선택할 수 있다. package version과 태그가 다르면 게시 전에 실패한다.

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
- 릴리즈가 생성된 뒤 다운로드 페이지의 `site/download-manifest.json`을
  새 태그와 산출물 정보로 갱신하고 `main`에 반영한다.

## 설치 경고

### macOS

macOS 릴리즈는 Developer ID 서명과 notarization을 요구한다. Gatekeeper 경고가
나타나면 release workflow의 macOS package log에서 signing, notarization, stapling
단계를 확인한다.

### Windows

미서명 prerelease는 SmartScreen 경고가 나타날 수 있다. 파일 이름과
`SHA256SUMS.txt`를 확인한 뒤 실행하도록 안내한다.

### Linux

AppImage에 실행 권한을 부여한다.

```bash
chmod +x in-C-*.AppImage
./in-C-*.AppImage
```

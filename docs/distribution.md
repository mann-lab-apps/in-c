# 데스크톱 패키징과 배포

## 지원 산출물

- macOS: universal DMG와 ZIP
- Windows: x64 NSIS installer와 portable EXE
- Linux: x64 AppImage

첫 공개 버전은 prerelease이며 코드 서명과 macOS 공증을 적용하지 않는다.
따라서 macOS Gatekeeper와 Windows SmartScreen이 경고를 표시할 수 있다.
정식 배포 전에 Developer ID와 Windows code signing 인증서를 GitHub Actions
secret으로 추가하고 이 문서를 갱신한다.

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

## GitHub Release

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
smoke test를 실행한다. 세 job이 모두 성공해야 prerelease가 생성된다.
Release에는 설치 파일과 `SHA256SUMS.txt`가 함께 게시된다.

이미 존재하는 태그는 GitHub Actions의 `Release` workflow dispatch에서도
선택할 수 있다. package version과 태그가 다르면 게시 전에 실패한다.

## 설치 경고

### macOS

미서명 prerelease는 Finder에서 Control-click 후 `Open`을 선택해야 할 수
있다. 정식 배포에서는 Developer ID 서명과 notarization을 적용한다.

### Windows

미서명 prerelease는 SmartScreen 경고가 나타날 수 있다. 파일 이름과
`SHA256SUMS.txt`를 확인한 뒤 실행하도록 안내한다.

### Linux

AppImage에 실행 권한을 부여한다.

```bash
chmod +x in-C-*.AppImage
./in-C-*.AppImage
```

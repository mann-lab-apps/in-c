# Desktop brand contract — 2026-11-03

Base: 653497ac7a7fa692db430a1420040ed6fd6bf253; isolated feature/studio-desktop-brand-20261103. No commits, remote writes, version change or notarization upload authorized.

| Acceptance | Evidence planned | Initial |
| --- | --- | --- |
| Visible name 띠로리 Studio in native window, app menu, bundle and installer | renderer/native package checks | Pending |
| Existing in-C userData and Chromium session paths preserved before ready | startup adapter tests and isolated appData harness | Pending |
| Current blue pencil asset, not unapproved v8 | source manifest/hash, generated icon inspection | Pending |
| com.mannlab.inc, project/MusicXML payloads and preference keys unchanged | package inspection, native smoke/full tests | Pending |
| macOS DMG, executable and icon coherent | readonly local DMG, captures | Pending |
| Build/verification scripts follow current package metadata | script regression, package smoke | Pending |
| Windows/Linux display metadata retain upgrade identity | metadata checks; actual OS runtime only if available | Pending |

Current source asset: original workspace docs/brand/ddirori-brand-system/assets/icon-studio.svg, SHA256 2e3421f000035f5a0dfa62944a5a1fc10e54a31d0921fc02485d76443cdc0085. Current visual-identity.md specifies blue #A5D8FF and functional pencil silhouette; v8 remains a review candidate. User explicitly requests this desktop migration; this does not approve final brand/store rollout.

Display name uses the user's requested mixed Korean/English 띠로리 Studio; English artifact stem uses documented Ddirori Studio as Ddirori-Studio. Keep package name, appId, Windows/Linux executable identifiers, Linux desktopName and storage keys. macOS bundle/executable follow the visible Unicode name. Published alpha.38 and site PR #790 remain unchanged.

Electron app docs prefer productName and derive userData from app name; startup must explicitly retain appData/in-C for userData and sessionData before changing display name. NSIS GUID derives from appId (unchanged). References: https://www.electronjs.org/docs/latest/api/app/ and https://www.electron.build/v26/docs/nsis/ . Installed builder source confirms productFilename also controls the macOS bundle/executable, so do not set a global legacy executableName that would keep in-C.app.

## 구현 후 로컬 검토

macOS 이름/아이콘/데이터 계약은 실제 DMG/Finder/창/앱 메뉴/About/Dock과 격리 프로필/mounted smoke에서 확인했다. Windows/Linux는 metadata 검사이며 실제 설치/실행은 미검증이다. 검토한 capture와 source/artefact 해시는 handoff.md, source.json, artifacts.json을 따른다. 초기 Pending 행은 최초 수용 기준 기록으로 남긴다. 최신 전체 gate: Vitest364파일/3,811검사 PASS, 외부 opt-in1파일/1검사 skip, Node 도구5검사 PASS (551.42초, 입력/빌드1,026개 변경 없음).

| 최종 로컬 수용 | 결과 |
| --- | --- |
| macOS 표시명·아이콘·실제OS/설치 이미지 | PASS: Finder DMG/창/OS 메뉴/About/Dock, 격리 실행/읽기 전용 mount |
| 기존 데이터·프로젝트·IPC·기술식별자 | PASS: startup/unit, 이전 임시 profile, native/full packaged smoke |
| 입력·음가·키·꾸밈음·한 마디 박자표·슬러 | PASS: focused/실제960·1400/native·undo·PDF·전체 gate |
| Windows/Linux | metadata PASS, 실제 OS 설치/실행 미검증 |
| 배포·업그레이드 | 미수행: 별도 승인·버전·서명/공증·universal 검증 필요 |

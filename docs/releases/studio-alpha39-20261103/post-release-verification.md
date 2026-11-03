# 띠로리 Studio alpha.39 게시 후 검증 — 2026-11-04 KST

alpha.39의 게시·다운로드·서명·격리 실행 검증을 완료했다. 새 릴리즈나 태그는 만들지 않았다. 이 문서는 이전 `session-stop.json`의 진행 중 관측을 대체해 쓰는 것이 아니라, 이후에 확인한 결과를 추가한 기록이다.

- 릴리즈: https://github.com/mann-lab-apps/in-c/releases/tag/v0.1.0-alpha.39
- 게시 시각: 2026-11-04 00:10:57 KST (`2026-11-03T15:10:57Z`). prerelease이며 draft가 아니다.
- 불변 태그 소스: `188d4ef40422a221e64a97c6afc78e00000d1c94`.
- 작업 브랜치: `feature/studio-desktop-brand-20261103`; 검증 시작 HEAD `67a549bde50c5028715f18a17ff4317910f6f473`.
- 태그 이후 HEAD의 차이는 인계 문서뿐이었다. 런타임·아이콘·패키징 입력은 태그와 동일했다. [소스 대조](post-release-source.json).
- 아래 자료는 이번 브랜치의 후속 evidence이며 게시 바이너리 소스 커밋과 구분한다. 제품 소스·버전·기준 이미지는 변경하지 않았다.

## CI gate

[기존 Release 실행](https://github.com/mann-lab-apps/in-c/actions/runs/41655425462)의 macOS·Windows·Linux 패키지 및 publish job이 모두 success다. 중복 dispatch/create나 재시도는 하지 않았다. 플랫폼별 전체 검사·패키징·artifact/native smoke, macOS Developer ID 서명·공증/stapler가 통과했다.

| 플랫폼 | Vitest | Node-native | 실행 범위 |
| --- | --- | --- | --- |
| macOS | 364파일 통과 / 1파일 skip, 3,811검사 통과 / 1검사 skip | 5통과 | CI Universal 패키지, Developer ID·공증, 실제 packaged smoke |
| Windows | 364파일 통과 / 1파일 skip, 3,811검사 통과 / 1검사 skip | 5통과 | Windows CI의 패키징·artifact 검사·실행 smoke |
| Linux | 364파일 통과 / 1파일 skip, 3,789검사 통과 / 23검사 skip | 5통과 | Linux CI의 패키징·artifact 검사·xvfb 실행 smoke |

Linux의 추가 22개 skip은 `xmllint` 가용성으로 조건부 실행되는 XSD 사례다. 외부 MuseScore opt-in 1검사도 skip이다. skip을 XSD/외부 호환성 PASS로 계산하지 않는다. 로컬 alpha.38의 과거 전체 결과를 alpha.39의 결과로 대체하지 않았으며 이번에는 태그 CI의 실제 결과를 확인했다. 제품 변경이 없는 게시 후 검사이므로 로컬 build/test:all을 불필요하게 다시 실행하지 않았다.

근거: [전체 CI 상태](release-ci.json), [플랫폼 결과](ci-platform-results.json), [선별한 실제 로그](ci-gate-summaries.json), [Linux skip](ci-linux-skips.txt). 자격 증명 준비 단계의 로그/값은 수집하지 않았다.

## 게시 파일

공개된 파일 6개, 합계 **925,513,584 bytes**를 내려받았다. 이름 집합·크기·GitHub SHA256 digest·다운로드 SHA256을 모두 대조했고, 바이너리 5개의 값은 `SHA256SUMS.txt`와도 일치했다. 실제 URL·개별 크기·전체 해시는 [publication.json](publication.json)에 있다.

- `Ddirori-Studio-0.1.0-alpha.39-mac-universal.dmg`
- `Ddirori-Studio-0.1.0-alpha.39-mac-universal.zip`
- `Ddirori-Studio-0.1.0-alpha.39-windows-x64-setup.exe`
- `Ddirori-Studio-0.1.0-alpha.39-windows-x64-portable.exe`
- `Ddirori-Studio-0.1.0-alpha.39-linux-x86_64.AppImage`
- `SHA256SUMS.txt`

ZIP을 macOS `ditto -x -k`로 임시 위치에 풀어 실제 파일명이 ‘띠로리 Studio.app’인지, 실행 파일 경로·버전·ID·아이콘이 정상인지 확인했다. ZIP과 DMG의 `app.asar` 및 ICNS가 각각 동일하다. 실제 실행 검사는 아래 DMG에서 했다. [ZIP 기록](published-mac-zip.json), [컨테이너 대조](mac-container-equivalence.json).

Python `zipfile`의 첫 추가 probe는 한글 경로 assertion에서 실패했다. ZIP 경로 bytes는 UTF-8/NFD지만 UTF-8 flag가 없어 Python 기본 CP437 해석에서는 글자가 깨졌다. 이를 숨기거나 기대 이름을 완화하지 않고 macOS 실제 추출 결과로 별도 검증했다. 해당 패키지를 수정하지 않았다. 다른 ZIP 소비자의 이름 해석은 미검증이며 향후 배포 도구 개선 후보다. [원 관찰](zip-path-observation.json).

## 다운로드한 macOS 앱

다운로드한 DMG를 읽기 전용으로 mount하여 검사한 뒤 분리했다. 사용자 앱 설치·종료·캐시 초기화·프로필 이주는 하지 않았다.

- 표시명 `띠로리 Studio`, 버전 `0.1.0-alpha.39`, bundle ID `com.mannlab.inc`.
- `CFBundleName`과 `CFBundleExecutable`이 NFD로 byte 일치하고 실제 실행 파일이 존재한다. 표시명은 NFC다.
- Universal 실행 파일의 `arm64`, `x86_64` 모두 확인했다. 이 Mac에서 실제 실행한 것은 host arm64이며 Intel 실기기 실행 승인은 아니다.
- ICNS는 검증된 `build/icon.icns`와 byte 일치한다. SHA256: `9b8a6f98c6d369432727bc7508ca4441e4f830fd1c155635a74cd4f5b809db20`.
- `codesign --verify --deep --strict` 통과. Developer ID Application / Team `ZRA4DHHKQ4`, hardened runtime 및 stapled ticket 확인.
- `xcrun stapler validate` 통과, Gatekeeper는 `accepted / source=Notarized Developer ID`.
- 새 임시 userData/sessionData의 실제 배포 main/preload/renderer에서 시작 화면·native 저장/재열기·복구·백업·파트 배치·MusicXML/MXL·MIDI·PDF smoke를 통과했다. OS 파일 대화상자는 smoke adapter이며 물리 입력이 아니다.
- MusicXML 원본 경로 덮어쓰기를 거부한 로그의 Error는 의도한 보호 검사의 일부다. 이후 `hasExportCopyRoundTrip` 및 전체 smoke가 통과했다.
- PDF는 의도한 파트 페이지 나누기가 있는 A4 2쪽이다. 실제 두 페이지를 Poppler로 렌더링해 제목·빠르기·쉼표·페이지 나누기를 직접 검토했다. 이 간단한 fixture를 밀집 악보 전체 조판 승인으로 확대하지 않는다.
- 960/1400px 백업 dialog 캡처, ICNS preview 및 피아노 화면을 직접 검토했다. Retina 이미지 폭과 논리 창 폭은 구분했다.

근거: [macOS 결과](published-mac.json), [codesign](codesign.txt), [서명 identity](signing-identity.txt), [stapler](stapler.txt), [Gatekeeper](gatekeeper.txt), [native smoke](smoke.txt), [이미지/PDF 검토](outputs-reviewed.json).

검증 helper가 요청한 `TMPDIR`와 달리 Electron smoke의 출력은 macOS OS temp에 남았다. 임시 userData/sessionData 격리는 유지됐다. 알려진 QA 파일 네 개만 이번 실행 시작/종료 사이의 mtime을 확인한 뒤 복사했다. 실제 출력 위치·해시를 결과에 기록했으며 다른 사용자 파일을 탐색하거나 이전 파일을 최신 성공 증거로 재사용하지 않았다.

## 음소거 피아노 관측

실제 다운로드 앱의 1,000음 synthetic fixture에서 HTTP(S)를 차단하고 외부 입력을 무시한 채 프로그램으로 12초간 실행했다. 최종 오디오 출력을 QA adapter에서 음소거했다.

- worker 준비 330ms, 첫 샘플 시작 591ms.
- 관측된 source 생성 44개, 최대 동시 6개, near-late start 0.
- 문서 title `Piano QA — 1000 generated notes — 띠로리 Studio`와 bridge appName 확인.
- 12초 종료 시 source 6개가 active인 것은 중간 관측이며, 이후 정지·자체 프로세스 종료했다. 자연 종료/장시간 메모리/청음 검증은 아니다.
- CDP/프로그램 조작이며 실제 포인터·물리 오디오 장치 검증이 아니다.

[실제 결과](reviewed/results-12s.json), [실행 로그](piano.txt). [cleanup.json](cleanup.json)에서 자체 프로세스와 mount가 남지 않았음을 확인했다. 임시 ZIP 추출본은 Applications 설치가 아니다.

## 릴리즈 안내·후속 경계

기존 in-C를 종료하고 새 이름 앱을 Applications로 복사하라는 안내를 기존 릴리즈 본문에 추가했다. 이름이 달라 이전 앱이 남을 수 있으며 기존 ID·프로젝트·설정·복구 경로는 유지한다. 릴리즈 ID·태그·제목·게시 시각·자산 ID/크기/digest/수정 시각은 변경 전후 동일하다. [본문 변경 기록](release-notes-update.json), [이전 본문](publication-notes-before.md), [게시 본문](publication-notes.md).

원본 작업 공간·다른 worktree·사용자 설치 앱·alpha.38/39 태그·자산·main·사이트 PR790·production manifest·iOS metadata는 수정하지 않았다. 이번 source는 기존 태그 그대로이고 커밋/푸시는 evidence만 추가한다.

물리 IME·OS 파일 dialog·스크린리더·청음·실제 사용자 악보·외부 MuseScore·실기기·실제 기존 앱 교체 업그레이드는 미검증이다. Windows/Linux는 CI 실행과 공개 다운로드 무결성까지이며 대화형 설치나 실제 기기 사용 승인으로 표현하지 않는다. Intel 앱 실행은 아키텍처 포함 검사와 구분한다.

다음 제품 후보는 꾸밈음 내부 재생/MIDI, 총보/이후 마디 박자표 적용·사용자 지정 박자, 구성음 선택·부분 화음 모델 등이다. 별도 범위 결정 없이 이번 릴리즈 검증에 추가하지 않았다. ZIP UTF-8 flag와 smoke 출력 수집의 이식성도 검증 도구 후보로 남긴다. Commercial V1/RC 전체 완료가 아니다.

정확히 사용한 QA helper와 해시는 [verification-tools.json](verification-tools.json), 사본은 `verification-scripts/`에 보존했다. 결과 폴더는 기존 evidence를 덮어쓰지 않고 사용하며, 이미 받은 파일을 삭제하거나 `--clobber`로 재다운로드해 재현하지 않는다.

마지막 로컬 typecheck, roadmap23행/work-queue48행 verifier, 공백 검사, JSON·링크·도구/검토 이미지 해시 대조가 통과했다. [로컬 검사](local-checks.json). 문서 verifier 통과는 제품 parity 전체 완료를 뜻하지 않는다.

첫 staged 공백 검사는 `hdiutil` 원본 출력의 줄 끝 공백을 잡아 커밋 전에 중단됐다. 원문을 [attach-raw.json](attach-raw.json)에 손실 없이 보존하고 읽기용 `attach.txt`만 정리한 뒤 staged 검사를 통과했다. [관찰과 조치](evidence-format-observation.json). 제품이나 Git 공백 검사 정책을 바꾸지 않았다.

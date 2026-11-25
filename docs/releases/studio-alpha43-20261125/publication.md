# 띠로리 Studio alpha.43 게시 결과

- `v0.1.0-alpha.43`를 2026-11-25 12:23:58 KST에 프리릴리즈로 게시했다. [GitHub 프리릴리즈](https://github.com/mann-lab-apps/in-c/releases/tag/v0.1.0-alpha.43)
- 기준은 `v0.1.0-alpha.42`의 `82ba969c26464b95b4ae5a3c51cca785ddf32c44`다. 게시 태그는 후보 소스 `b090426b1ae2f86f881408c5b9650da208c2d9ef`를 가리킨다.
- 총보의 한 마디 박자표, 마디 지우기·제거, 구간 복사와 파트보 묶음 쉼표, 읽기 전용 실음 보기, MusicXML 교환과 헤어핀 종료 위치, 선택형 앞꾸밈음과 피아노 재생을 포함한다. [게시된 릴리즈 노트](https://github.com/mann-lab-apps/in-c/releases/tag/v0.1.0-alpha.43)

## 후보 검증과 CI

- 게시 alpha.42와 후보 앱에서 일반 v2를 열 수 있었다. 새 종료 역할·앞꾸밈음 설정이 들어간 v2와 독립 종료 박이 들어간 v3는 후보에서 왕복했고, alpha.42에서는 열기 오류와 원본 보호를 확인했다. 후보의 기존 v2 백업 복구도 통과했다.
- 첫 후보의 로컬 전체 검사는 Vitest 7,759건·Node 5건 통과, 외부 opt-in 1건 건너뜀이다. 고정 입력 6,604개가 독립 검사에서 일치했다.
- 첫 게시 실행의 Windows 2/4는 CRLF에 의존하는 시험 입력 가공에서 실패했다. 시험 코드의 줄바꿈 처리만 교정했고, LF·CRLF 집중 검사 각 39건과 MusicXML 집중 검사 2,261건을 통과했다. [첫 실패 로그](https://github.com/mann-lab-apps/in-c/actions/runs/45528861345/job/138918879569)
- 수정 후보는 Windows·Linux 사전검증과 세 플랫폼의 분할 검사 12개, 도구 검사, 패키징·산출물·패키지 실행 및 Publish를 통과했다. [사전검증](https://github.com/mann-lab-apps/in-c/actions/runs/45533077524) · [게시 실행](https://github.com/mann-lab-apps/in-c/actions/runs/45534380570)

## 공개 파일 다운로드

배포 파일 5개와 체크섬 파일을 직접 내려받아 GitHub 자산의 크기와 SHA-256을 확인했다. 배포 파일의 SHA-256은 공개 체크섬과도 일치했다.

| 다운로드 | 바이트 | SHA-256 |
| --- | ---: | --- |
| [Ddirori-Studio-0.1.0-alpha.43-linux-x86_64.AppImage](https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.43/Ddirori-Studio-0.1.0-alpha.43-linux-x86_64.AppImage) | 160,329,594 | `0f7a6cc496c9b4b451b07eb2051fc3e679419e996ad460dad49e7bd200072b4d` |
| [Ddirori-Studio-0.1.0-alpha.43-mac-universal.dmg](https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.43/Ddirori-Studio-0.1.0-alpha.43-mac-universal.dmg) | 252,498,597 | `eff02c375fdca2de08990be9b4d788f170903b8c374e27dbfe5a779a3ef38d4d` |
| [Ddirori-Studio-0.1.0-alpha.43-mac-universal.zip](https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.43/Ddirori-Studio-0.1.0-alpha.43-mac-universal.zip) | 252,030,566 | `8d0d742af6a3b717787729a46a23797b6fd1bf37c1461717c88e0895ccd184b1` |
| [Ddirori-Studio-0.1.0-alpha.43-windows-x64-portable.exe](https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.43/Ddirori-Studio-0.1.0-alpha.43-windows-x64-portable.exe) | 130,754,185 | `98f3a9b4850c9818e6dc4fd5ae225b1282fad43cc1e80d733aa563d505a37f38` |
| [Ddirori-Studio-0.1.0-alpha.43-windows-x64-setup.exe](https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.43/Ddirori-Studio-0.1.0-alpha.43-windows-x64-setup.exe) | 130,966,737 | `f6676b55be65457373988774cb97dfab37ab1f016c98a19d31b9aeee9f2d45a6` |
| [SHA256SUMS.txt](https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.43/SHA256SUMS.txt) | 585 | `7b18cb6d06fd35c63b4666f690bbf9bd0e6108083bc1b27a2e41282fa9c98960` |

- macOS DMG를 읽기 전용으로 마운트했다. 앱 이름·아이콘·버전·ID `com.mannlab.inc`, Universal `arm64`·`x86_64`를 확인했다.
- Developer ID 서명, `codesign --deep --strict`, `stapler validate`와 Gatekeeper 평가가 통과했다. 임시 프로필에서 앱을 실행해 Native 저장·복구·백업, MusicXML/MXL·MIDI·PDF와 자동 저장 smoke를 확인했다. 마운트는 검증 뒤 분리했다.
- macOS 실행은 로컬 arm64에서 확인했다. Windows·Linux 실행은 CI 환경에서 확인했다. 대화형 설치와 실제 OS 파일 대화상자, Intel Mac 실기기, 물리 오디오 청취는 미검증 범위다. 외부 편집기 재저장은 이번 게시 검증에서 별도로 실행하지 않았다.

## 공개 다운로드 사이트

- 다운로드 페이지와 매니페스트의 버전·출시일·세 플랫폼 링크·체크섬·릴리즈 노트 링크를 갱신했다. 프로젝트 형식 v3와 새 필드가 있는 v2의 호환 범위도 안내한다. [공개 다운로드](https://in-c.mannlab.app/chromatics.html)
- 로컬 빌드와 콘텐츠·SEO·이벤트·앱 안내 검사를 통과했다. 원격 사이트 빌드와 PR의 CI 통과 뒤 사이트 두 파일을 `main`의 `2812a2584ec5e371c2577d6959ffb574923ba397`에 병합했다. [사이트 PR](https://github.com/mann-lab-apps/in-c/pull/793)
- 병합 SHA에서 GitHub Pages 빌드와 배포가 통과했다. 운영 페이지 본문, 매니페스트, 버전과 날짜, 세 플랫폼 버튼, 체크섬과 릴리즈 노트 링크를 게시 자산과 대조했다. 운영 검사 7개가 통과했다. [Pages 배포](https://github.com/mann-lab-apps/in-c/actions/runs/45543899428)
- 공개 매니페스트 SHA-256은 `f68c85ed07aaf46222d6cc8dab8f89b0935f29e9c0c95b049914bdad8a686be7`이고 공개 다운로드 페이지 응답의 SHA-256은 `483d50b1e027c943482b95c160917b482673d9b55ff52d5d87915f2134ef1d47`다. [공개 매니페스트](https://in-c.mannlab.app/download-manifest.json)

## 증거 위치

- 후보 작업 트리의 `out/release-qa/alpha43/`에 고정 입력, 최초 실패 로그, 후보 검사, 게시 검증, macOS 패키지 실행 및 운영 사이트 결과를 보존했다.

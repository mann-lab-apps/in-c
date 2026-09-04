# 패키지 앱 운영체제별 smoke matrix

macOS와 Windows용 V1 릴리즈 후보가 설치·실행·저장·열기의 기본 흐름을
막지 않는지 빠르게 확인하는 수동 검증 기준이다. `smoke`는 주요 기능이 바로
막히지 않는지만 확인하는 검증을 뜻한다. 확인하지 않은 항목은 `미실행`으로 남긴다.
Linux는 V1 public release target이 아니라 post-V1 follow-up target이며, 별도 Linux
artifact가 공식 target으로 승격될 때 이 matrix에 포함한다.

## 인수 기준

- macOS와 Windows에서 확인할 산출물과 준비 조건을 구분할 수 있다.
- 각 운영체제에서 설치, 첫 실행, MusicXML 저장, 저장 파일 다시 열기를 확인한다.
- 결과를 `통과`, `실패`, `미실행`으로 판정하고 근거를 남길 수 있다.
- 미서명 prerelease의 운영체제 경고를 제품 오류와 구분한다.
- Linux는 V1 후속 정책으로 분리되어 public V1 RC 판정의 필수 OS gate가 아님을 기록한다.

## 실패 가능한 검증 기준

- macOS 또는 Windows 중 하나라도 확인 절차나 기록 칸이 없으면 실패다.
- 실제 배포 산출물과 다른 파일 형식이나 실행 방법을 안내하면 실패다.
- 저장 성공만 확인하고 저장한 MusicXML을 다시 여는 절차가 없으면 실패다.
- 버전, 산출물 이름, 결과 근거 없이 `통과`로 기록할 수 있으면 실패다.
- 이 문서의 상대 링크가 존재하지 않거나 `git diff --check`가 실패하면 실패다.

## 공통 준비

1. 같은 버전과 commit SHA로 만든 운영체제별 릴리즈 후보를 준비한다.
2. 배포된 파일이면 `SHA256SUMS.txt`와 checksum을 비교한다.
3. 기존 설치와 자동저장 복구본이 결과에 영향을 주지 않도록 테스트 조건을 기록한다.
4. 저장할 임시 폴더와 짧은 파일 이름을 준비한다.

서명되지 않은 prerelease는 운영체제 보안 경고가 나타날 수 있다. 승인된 QA 환경에서만
[데스크톱 패키징과 배포](../distribution.md)의 운영체제별 안내를 따른다.

## 운영체제별 준비

| 운영체제 | 확인 산출물 | 설치·실행 준비 |
| --- | --- | --- |
| macOS | universal DMG 또는 ZIP | DMG 앱을 Applications에 복사하거나 ZIP을 푼다. 미서명 경고가 나오면 경고 내용과 Control-click `Open` 사용 여부를 기록한다. |
| Windows | x64 NSIS installer 또는 portable EXE | installer 설치 또는 portable EXE 실행 방식을 기록한다. SmartScreen 경고가 나오면 경고 내용과 실행 여부를 기록한다. |
| Linux | V1 후속 target | V1 public release target이 아니다. post-V1에서 x64 AppImage를 공식 산출물로 승격하면 `chmod +x in-C-*.AppImage`로 실행 권한을 준 뒤 AppImage를 실행하고 배포판/데스크톱 환경을 기록한다. |

## 공통 smoke 시나리오

각 운영체제에서 아래 순서대로 확인한다.

| 단계 | 행동 | 기대 결과 | 실패 시 근거 |
| --- | --- | --- | --- |
| 1. 설치 | 해당 운영체제의 산출물을 설치하거나 푼다. | 파일 손상 또는 설치 중단 없이 준비된다. | 산출물 이름, 오류 문구 |
| 2. 첫 실행 | 앱을 실행하고 시작 화면을 확인한다. | 프로세스가 중단되지 않고 시작 화면이 보인다. | 실행 방법, 오류 화면 또는 로그 |
| 3. 저장 | 새 악보에 제목과 음표 하나 이상을 입력하고 MusicXML로 저장한다. | 지정한 폴더에 `.musicxml` 파일이 생기고 성공 안내가 보인다. | 입력 내용, 저장 위치 종류, 오류 문구 |
| 4. 다시 열기 | 앱에서 방금 저장한 MusicXML을 연다. | 제목과 입력한 음표가 다시 표시된다. | 재현 단계, 파일 첨부 가능 여부, 누락 내용 |
| 5. 다시 실행 | 앱을 닫고 다시 실행한다. | 정상 종료·재실행되고 최근 파일 또는 파일 열기로 작업을 다시 찾을 수 있다. | 종료 방식, 재실행 증상 |

더 넓은 편집 기능은 [Manual Score Completion QA](../releases/manual-score-completion-qa.md)에서
별도로 확인한다. 이 문서는 운영체제별 패키지의 기본 진입 흐름만 판정한다.

## 판정 기준

- `통과`: 해당 운영체제의 다섯 단계가 모두 기대 결과와 같고 근거가 있다.
- `실패`: 설치·실행·저장·다시 열기·재실행 중 하나라도 사용자 흐름을 막는다.
- `미실행`: 확인하지 않았거나 결과 근거가 없다.

macOS 또는 Windows 중 하나라도 `실패` 또는 `미실행`이면 V1 desktop package gate를
`통과`로 기록하지 않는다.
보안 경고를 거쳐 정상 실행했다면 경고를 known limitation으로 기록하고 제품 동작과
분리해 판정한다.

## Evidence 기록 양식

```markdown
## 패키지 앱 smoke: YYYY-MM-DD

- 앱 버전:
- 기준 브랜치/commit SHA:
- 확인자:

| 운영체제/버전 | 산출물 이름 | 설치 | 첫 실행 | 저장 | 다시 열기 | 다시 실행 | 판정 | 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| macOS |  | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 |  | 로그 또는 스크린샷 |
| Windows |  | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 | 통과/실패/미실행 |  |  |
| Linux | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 public release target 아님 |

- 전체 판정: 통과 / 실패 / 미실행
- 보안 경고 또는 운영체제별 차이:
- 후속 이슈:
```

## 패키지 앱 smoke: 2026-09-01

- 앱 버전: 0.1.0-alpha.9
- 기준 브랜치/commit SHA: dc9bf16
- 확인자: Codex

| 운영체제/버전 | 산출물 이름 | 설치 | 첫 실행 | 저장 | 다시 열기 | 다시 실행 | 판정 | 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| macOS arm64 | `release/mac-arm64/in-C.app` | 통과 | 통과 | 부분 통과 | 부분 통과 | 미실행 | 부분 통과 | `npm run package:dir`, `npm run verify:package`; `PACKAGED_APP_SMOKE_OK` confirmed app name, preload bridges, start screen/actions, new score workspace/title/notation SVG, smoke-only non-dialog MusicXML file write, recent file reopen, PDF `%PDF`/EOF/page object/MediaBox structure, MIDI type-1 tempo/note track structure with end-of-track markers, and autosave write/read/clear round-trip. |
| Windows |  | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 |  |
| Linux | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 public release target 아님. |

- 전체 판정: 미실행
- 보안 경고 또는 운영체제별 차이: macOS local unpacked package uses unsigned build with `mac.identity: null` for automated smoke; installer/DMG and Windows packages were not verified. Linux is post-V1.
- 후속 이슈: release candidate에서 실제 file dialog 기반 MusicXML/PDF/MIDI 저장, 사람이 확인하는 PDF/MIDI 산출물 열기, MusicXML 다시 열기, 앱 종료/재실행을 OS별로 확인한다.

## 패키지 앱 smoke: 2026-09-03

- 앱 버전: 0.1.0-alpha.9
- 기준 브랜치/commit SHA: local V1 blocker worktree
- 확인자: Codex

| 운영체제/버전 | 산출물 이름 | 설치 | 첫 실행 | 저장 | 다시 열기 | 다시 실행 | 판정 | 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| macOS arm64 | `release/mac-arm64/in-C.app` | 통과 | 통과 | 부분 통과 | 부분 통과 | 미실행 | 부분 통과 | `npm run package:dir`, `npm run verify:package`; `PACKAGED_APP_SMOKE_OK` confirmed app name, preload bridges, start screen/actions, string quartet workspace/title/notation SVG, smoke-only non-dialog MusicXML file write, recent file reopen, score PDF structure, Cello part view page/title metadata, visible event part id, compact parts page setup metadata, PDF target/write/structure, MIDI type-1 tempo/note track structure, and autosave write/read/clear round-trip. |
| Windows |  | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 | 미실행 |  |
| Linux | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 후속 | V1 public release target 아님. |

- 전체 판정: 미실행
- 보안 경고 또는 운영체제별 차이: macOS local unpacked package uses unsigned build with `mac.identity: null` for automated smoke; installer/DMG and Windows packages were not verified. Linux is post-V1.
- 후속 이슈: release candidate에서 실제 file dialog 기반 MusicXML/PDF/MIDI 저장, 사람이 확인하는 총보/파트보 PDF와 MIDI 산출물 열기, MusicXML 다시 열기, 앱 종료/재실행을 OS별로 확인한다.

## RC 수동/외부 QA availability audit: 2026-09-03

- 환경: macOS 26.6.2 arm64
- 기준 브랜치/commit SHA: `dc9bf16` plus local V1 blocker worktree changes
- 확인자: Codex

| 항목 | 결과 | 근거 | 다음 action |
| --- | --- | --- | --- |
| macOS packaged artifact | 부분 확인 | `release/mac-arm64/in-C.app` exists, Mach-O arm64 executable, 342M. Automated unpacked smoke is documented above. | 실제 DMG/installer artifact를 만들고 설치/첫 실행/file dialog 저장/열기/재실행을 사람이 확인한다. |
| 외부 MusicXML 앱 | 미실행 | `/Applications`에서 MuseScore, Dorico, Sibelius, Finale 앱이 발견되지 않음. | 각 앱 또는 실제 export `.musicxml` fixture를 준비해 versioned fixture로 추가한다. |
| MIDI 외부 앱 | 미실행 | GarageBand 10.4.12가 설치되어 있으나, 사람 조작 GUI 세션으로 MIDI import/listening을 수행하지 않음. | solo/grand staff/ensemble MIDI를 GarageBand 또는 주요 DAW/notation app에서 열고 결과를 기록한다. |
| PDF viewer 보조 확인 | 자동 보조 확인 | latest available packaged smoke PDF는 `pdfinfo` 기준 A4 1페이지/rotation 0이고 Poppler PNG render에 성공했다. | 실제 file dialog로 총보/파트보 PDF를 저장하고 viewer에서 사람이 visual QA를 수행한다. |
| Windows packaged smoke | 미실행 | 현재 실행 환경은 macOS arm64이며 Windows artifact/OS session 없음. | Windows x64 installer 또는 portable EXE에서 설치/첫 실행/save/open/export smoke를 수행한다. |
| Linux release policy | V1 후속 | Chromatics Desktop V1 public release target is macOS and Windows; Linux is post-V1 unless explicitly promoted with an AppImage artifact and OS smoke evidence. | post-V1에서 Linux artifact를 만들면 별도 AppImage smoke matrix를 추가한다. |

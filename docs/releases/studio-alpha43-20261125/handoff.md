# 띠로리 Studio alpha.43 후보

게시·공개 다운로드 검증은 [게시 결과](publication.md)에 기록했다.

## 소스 범위

- 소스 작업 트리 `studio-post-alpha42-parity-20261122`, 기준 태그 `v0.1.0-alpha.42`, 기준 SHA `82ba969c26464b95b4ae5a3c51cca785ddf32c44`. 별도 후보 브랜치 `release/studio-alpha43-20261125`에 수정 149개, 추가 45개, 삭제 1개를 반영했다.
- 변경 목록과 해시는 `out/release-qa/alpha43/source-manifest.json`에 기록했다. SHA-256은 `7e59613069487d789e62fb115f7cc14bf3456d2aced9bc8e129c28da356e30b2`다. 원본 작업 트리와 격리 후보의 고정 입력 6,602개가 일치했다. 추가한 릴리즈 자료는 후보 작업 트리에 있다.
- 직전 전체 회귀는 Vitest 797파일·7,759건과 Node 5건 통과, 외부 opt-in 1건 건너뜀이다. 이전 인계의 `live-piano-settings-full-clean-20261125` 영수증과 독립 입력 검사를 대조했다.
- 준비 시점에 GitHub의 게시된 최신 프리릴리즈와 로컬 패키지 버전은 alpha.42였다. 후보 버전과 후보 커밋 SHA는 승인된 버전 변경과 커밋에서 확정한다.

## 로컬 검증

- `npm ci`와 `git diff --check`, 로드맵·작업 큐·백로그·사용설명서 검사 4종 통과. 기존 태그와 현재 패키지 버전의 일치도 확인했다.
- macOS arm64의 격리 `package:dir`은 타입·생산 빌드를 포함한다. 서명·공증 없이 생성한 로컬 앱에서 `verify:package`가 통과했다. 프로젝트 및 백업 복구, MXL·MIDI·PDF, 파트보 범위, 자동 저장을 실제 패키지 smoke로 확인했다.
- 게시된 alpha.42 DMG는 다운로드 체크섬과 Developer ID 서명을 확인하고 읽기 전용으로 마운트했다. 실제 구형 패키지 smoke가 통과했다. 게시 파일에 포함된 리더는 960×750 dark·1400×750 light에서 일반 v2를 생성하고, 종료 역할·앞꾸밈음 설정 v2와 독립 종료 박 v3를 거부하면서 열린 악보와 원본 파일을 보존했다. 후보는 같은 두 폭에서 네 파일의 열기·재저장과 기존 v2 백업 복구를 통과했다. 결과는 `published-alpha42-reader/results.json`과 `native-candidate-b/results.json`에 있다.
- 후보의 두 폭에서 유지음·믹서·지연 요청·루프·독립 헤어핀 재생을 확인했다. MusicXML XSD 6건이 통과했고, 직전 Native·MusicXML·MIDI 바이트와 PDF 래스터가 일치했다. `candidate-live-boundaries/results.json`, `candidate-pedal-resume/results.json`, `candidate-release-outputs-verified/results.json`, `outputs-reviewed.json`에 검증 결과가 있다.
- 프로젝트·MusicXML·재생 집중 회귀는 225파일·2,737건 통과, 외부 1건 건너뜀이다. Studio R3와 고정 캔버스 조판 검사도 통과했다. 통합 smoke의 음가 확대, PNG 선택 컨트롤, 피아노 두 보표, 마디 내용 지우기와 구조 제거는 현재 UI 동작을 검사하도록 보강했다. 최종 통합 smoke와 두 폭의 마디 키 검사가 통과했다. 초기 실패와 최종 통과 로그는 `mvp*.log`에 보존했다.
- 후보 패키지와 오프라인 사용설명서의 표시 버전을 alpha.43에 맞췄다. 버전과 lockfile 외의 패키지 설정은 기준 태그와 일치한다.
- 로컬 검증 산출물은 `out/release-qa/alpha43/`에 모은다. 같은 소스에 대한 이전 결과와 후보 패키지의 실행 결과를 각각 기록한다.

## 배포 순서

1. 승인된 버전과 후보 SHA를 고정한다. 승인된 후보 브랜치 푸시 후 동일 SHA의 Windows/Linux `preflight` 결과를 확인한다.
2. 게시 승인을 확인하면 `.github/workflows/release.yml`에서 `release/*` 브랜치의 `candidate=true` 경로를 사용한다. 검증과 패키징 뒤 태그 생성과 GitHub 프리릴리즈 게시가 이어진다. 이전 alpha.42에도 이 경로를 사용했다. [alpha.42 Release 실행](https://github.com/mann-lab-apps/in-c/actions/runs/44945782399)
3. 게시된 다섯 파일과 `SHA256SUMS.txt`를 직접 다운로드해 해시와 설치 정보를 확인한다. 사이트 작업은 별도 승인 범위에서 검증된 게시 파일을 기준으로 진행한다.

## Windows 테스트 픽스처 교정

- 첫 후보 `7dd39f661fe4c4b8afe091a3d8d21efcb06af989`는 로컬 전체 Vitest 7,759건·Node 5건을 통과했다. 독립 검사에서 고정 입력 6,604개가 일치했다. Windows/Linux 사전검증도 통과했다. [첫 사전검증](https://github.com/mann-lab-apps/in-c/actions/runs/45528484894)
- 첫 게시 워크플로의 Windows 2/4에서 `hairpin-file-order.test.ts`의 5건이 실패했다. CRLF 체크아웃에서는 테스트가 LF에 의존한 줄 일치를 찾지 못해 비교 XML에 중복 종료 표식을 남겼다. 원본 실패 로그를 보존했고 로컬에서도 같은 CRLF로 5건을 재현했다. [실패 작업](https://github.com/mann-lab-apps/in-c/actions/runs/45528861345/job/138918879569)
- 테스트의 픽스처 가공용 줄바꿈을 정규화하고 LF와 CRLF 원본에서 종료 연결·재생과 MIDI가 같은지 검사한다. 두 줄바꿈의 집중 검증이 각각 39건 통과했다. 제품 소스와 사용설명서·릴리즈 노트의 내용은 첫 후보와 같다. 새 후보는 세 플랫폼의 전체 검사와 패키징을 다시 거친다.

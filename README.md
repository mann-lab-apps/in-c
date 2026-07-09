# in C

쉽고 유연한 악보 편집기.

첫 버전은 단성부 악보 작성과 MusicXML 가져오기·내보내기에 집중합니다.

## 디렉토리 구조

- `src/main`: Electron main process.
- `src/preload`: Electron과 renderer를 잇는 보안 preload bridge.
- `src/renderer`: 앱 UI.
- `src/score-core`: 악보 도메인 모델과 편집 command.
- `src/engraving`: 사보 렌더링 adapter.
- `src/playback`: 재생 스케줄링과 오디오 연동.
- `src/io`: MusicXML 가져오기·내보내기와 파일 I/O.
- `docs/research`: 레퍼런스 조사와 제품 판단 기록.
- `docs/product`: 사용자 여정과 현재 제품 기준. 현재 기능 상태는
  [`docs/product/feature-map.md`](docs/product/feature-map.md), Gherkin 인수
  시나리오는 [`docs/product/acceptance`](docs/product/acceptance), AI Agent 협업
  절차는 [`docs/product/agent-workflow.md`](docs/product/agent-workflow.md)에
  정리합니다.
- `docs/architecture`: 아키텍처와 기술 설계 기록. MusicXML 우선 저장
  전략은 [`docs/architecture/project-file.md`](docs/architecture/project-file.md),
  브랜치 운영 전략은
  [`docs/architecture/branch-strategy.md`](docs/architecture/branch-strategy.md)에
  정리합니다.

## 레퍼런스 경계

MuseScore는 이 저장소 밖에 읽기 전용 아키텍처 레퍼런스로 둡니다.

`../references/musescore`

MuseScore의 소스 코드, asset, 생성 파일, 테스트를 이 프로젝트 안으로 복사하지
않습니다.

## 개발

의존성을 설치합니다.

```bash
npm install
```

개발 모드로 데스크톱 앱을 실행합니다.

```bash
npm run dev
```

## 검증

```bash
npm test
npm run build
npm run verify:mvp
```

`verify:mvp`는 공통 8마디 단성부 fixture를 Electron에서 열어 desktop과
최소 지원 폭의 SVG 이벤트 매핑을 검사한다.

TypeScript를 검사합니다.

```bash
npm run typecheck
```

앱 bundle을 빌드합니다.

```bash
npm run build
```

## 패키징

현재 운영체제용 unpacked app을 만들고 패키징된 renderer smoke test를 실행합니다.

```bash
npm run package:dir
npm run verify:package
```

네이티브 installer와 GitHub prerelease 절차는
[`docs/distribution.md`](docs/distribution.md)에 정리되어 있습니다. macOS와
Windows 서명 인증서를 설정하기 전까지 release artifact는 unsigned 상태입니다.

## 웹사이트

공개 소개와 다운로드 페이지는 `site/`에 있습니다.

```bash
npm run site:dev
npm run site:build
```

페이지는 `site/download-manifest.json`에서 prerelease 다운로드 metadata를
읽습니다. 첫 GitHub Release가 게시되기 전에는 플랫폼 버튼이 존재하지 않는
installer 파일 대신 저장소 release 목록으로 연결됩니다.

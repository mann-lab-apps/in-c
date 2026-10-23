# in C

in C는 공연·연주회 홍보를 위한 서비스입니다.

현재 공개 웹사이트의 역할은 in C 공연·연주회 홍보 시스템 안에 어떤 서비스 범주가 있는지
소개하고, 공연·연주회 홍보 문의를 받는 것입니다. Click과 Chime은
별도 제품으로 소개하지 않고 Clef & Staff의 연습 기능 범주에 포함합니다.

## 현재 공개 표면

- `site/`: in C 공연·연주회 홍보 서비스 소개, 문의, 개인정보 페이지를 담습니다.
- `src/`: Electron 기반 Chromatics 데스크탑 사보앱.
- `apps/in_c_sheet`: Clef & Staff. 악보 열람과 연습 흐름을 맡는 앱입니다.
- `apps/in_c_click`: Clef & Staff에 흡수되는 메트로놈 기능 실험입니다.
- `apps/in_c_chime`: Clef & Staff에 흡수되는 기준음·드론 기능 실험입니다.

## 현재 공개 사이트에서 다루지 않는 것

- authentication / shared account
- cloud storage / backup / sync
- cross-app data sharing
- social graph / community feed / messaging
- recommendation engine
- self-serve advertiser dashboard
- payment infrastructure for promotion
- Columns / reading content

공연·연주회 홍보 문의는 이메일 기반으로 받고, 대시보드·결제·캠페인 리포트는 별도 고지 전까지
공개 기능으로 제공하지 않습니다.

## 디렉토리 구조

- `src/main`: Electron main process.
- `src/preload`: Electron과 renderer를 잇는 보안 preload bridge.
- `src/renderer`: Chromatics 앱 UI.
- `src/score-core`: 악보 도메인 모델과 편집 command.
- `src/musicxml`: MusicXML 가져오기, 내보내기, fixture 검증.
- `src/project`: 프로젝트 파일과 파트 레이아웃 스키마.
- `site`: 공개 웹사이트와 정적 실험 표면.
- `apps`: Flutter 기반 독립 C 앱.
- `docs/product`: 제품 판단, 기능 경계, 검증 기록.
- `docs/architecture`: 아키텍처와 기술 설계 기록.

## 개발

의존성을 설치합니다.

```bash
npm install
```

개발 모드로 데스크톱 앱을 실행합니다.

```bash
npm run dev
```

웹사이트를 실행합니다.

```bash
npm run site:dev
```

## 검증

```bash
npm test
npm run build
npm run site:build
npm run verify:site-content
npm run verify:site-seo
```

TypeScript만 검사할 때는 다음 명령을 사용합니다.

```bash
npm run typecheck
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

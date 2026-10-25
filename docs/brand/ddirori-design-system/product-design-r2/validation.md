# R2 검증 기록

2026-10-25. 시안과 디자인 인계 검증이다. 제품 R2 적용·실기기·사람 대상 사용성 검증 완료를 뜻하지 않는다.

## 소스와 동시 작업

- 착수 HEAD `6bb5f027cfa5df3a78094a97699c6c5a84c9f0c1`, 최종 관찰 `827ad18203e673b1e923d00cbcf0fd7f3af755d7`.
- 진행 중 서비스 작업이 Score `c1ced312`, Studio `d126a8d6`, Play `623a091c`로 커밋됐다. 이번 작업이 만든 커밋이 아니다. 초기 dirty 파일이 커밋된 사실을 되돌리지 않았다.
- 소유 변경: R2 폴더, `packages/ddirori_web/catalog/product-r2.{html,tsx,css}`, `product-r2.config.ts`, 디자인 시스템 README의 R2 진입 링크. 제품/shared API/iOS metadata는 편집하지 않았다.
- 기존 세 worktree 경로/branch를 유지했다. R1 manifest·기존 설계·시안을 재생성하지 않았다. 서비스 반환 폴더는 해당 작업의 커밋으로 갱신됐으며 초기와 같다고 주장하지 않는다.
- 최초 캡처 도중 Play 소스가 변경돼 최종 재촬영했다. 세 서비스 최종 캡처의 입력 해시는 실행 전후 일치했다. `evidence/*-capture-source.json`이 실제 기준이다. Score fixture JSON 안의 `implementation_commit: uncommitted`는 기존 테스트의 고정 label이며 이번 소스 revision 판정에 사용하지 않는다.
- 공통 Item.flat/trailing 등 미커밋 의존 소스는 [revision.json](revision.json)에 별도 고정했다. 이후 달라지면 새 작업의 원인을 조사하고 재검토한다.

## 직접 실행 결과

| 검사 | 결과·범위 |
| --- | --- |
| Web package typecheck | 통과. 이번 R2 entry 포함 |
| 독립 R2 Vite build | 통과. `product-r2.config.ts`, R1 outDir 미사용 |
| Play R1 actual widget test | 19개 통과. 현재 실제 화면·controller, 합성 데이터/파일·오디오 adapter |
| Score R1 actual widget test | 28개 통과. 현재 library/선택·실패/복구·뷰어 파일실패; 성공 PDF engine 실행 증거 아님 |
| Studio isolated Vite + Electron | 최종 dock/theme/text/save/native/XML matrix 통과, 입력 해시 안정. 중간 간헐 실패는 아래에 별도 보존 |
| R2 built preview browser | 핵심 상호작용, 18 layout·18 state 조합, console error 없음. [결과](evidence/review/results.json) |
| 시각 확인 | 실제 Play 목록/현재 재생, Score 목록/실패, Studio 속성 및 R2 좁은/넓은·dark·PDF 도구 배치 직접 확인 |
| 링크·revision | 로컬 문서/빌드 경로와 독립 manifest 검사. R1 manifest 재생성 없음 |

R2 browser: 녹음B 탐색 중A 재생, 악장 선택/큐 상태, keyboard seek 확정, palette 변경 후 위치 유지, 실제 PDF raster 페이지 이동, 주석/연습/공연/도구 숨김, dialog focus 복귀, Studio undefined/0/invalid/Escape/합성 IME/undo, 메모리 저장 실패·재시도, dock focus 복귀, actual image 로딩. Play/Score/Studio ×320/840/1440 ×light/dark,390px 상태 조합. reduced-motion에서는 기존 음형 animation none. CSS zoom200%는 브라우저 레이아웃 stress이며 OS 글자 확대 검증이 아니다. Flutter 실제 캡처의 textScale2와 별개다.

## Studio 간헐 실패를 최종 통과와 구분

기존 Electron harness의 합성 composition → Escape →99→blur 뒤 `aria-invalid === true` assertion이 중간 실행에서 반복 실패했다. DOM99/validity=false인데 React 오류 표시가 갱신되지 않았다. 기다림·재포커스·새 선택·insertText를 별도 진단했으나 원인을 확정하지 않았다. 최종 동일 assertion은 통과했다. [실패 로그](evidence/studio-capture-synthetic-failure.log), [최종 로그](evidence/studio-capture.log), [audit](evidence/studio/r2-audit.json).

R2 캡처 helper는 이 assertion을 try/catch로 **기록하고 이후 독립 캡처를 수집하되, 실패가 하나라도 있으면 마지막에 nonzero 종료**한다. assertion 조건을 완화하지 않았다. 최종 audit 실패 배열은 비어 있다. 최종 통과로 앞선 실패를 소거하지 않으며 [review T04](review.md)의 제품/검증 도구 원인 분리 작업으로 인계한다. 실제 물리 IME 입력을 검증했다고 하지 않는다.

Studio 서비스 반환이 보고한 root `npm test` 실패(7files/12tests),960px responsive notation wrap 차이도 [review T03](review.md)에 남겼다. 이번 R2가 root 전체 검사를 다시 실행해 통과시킨 것이 아니다. 서비스 반환의607개 등 테스트 수를 이번 직접 실행 수에 더하지 않았다. Electron PDF는 workspace print이고 OS 인쇄 대화상자 검증이 아니다.

## 캡처 출처·환경

- Play: 실제 Flutter widget, 기존 R1 fixture,320/390/1024 및 textScale1/2,light/dark. 파일명에 조건 표시. 캡처는1x raster, 엔진 I/O 합성. 실제 product test를 수정하지 않고 출력 환경 변수만 R2로 지정.
- Score: 실제 Flutter widget, `adoption_pilot` pilot-0/1/2·missing PDF 경로.320/390/840,scale1/2,light/dark. 각 JSON에 조건. 테스트를 task out 폴더로 복사해 capture destination과 상대 import만 변경했고 원본은 보존했다.
- Flutter 글꼴: Pretendard `/tmp/ddirori-brand-tools/Pretendard.ttf`, MaterialIcons `/opt/homebrew/Caskroom/flutter/3.47.2/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf`. 테스트 font loader를 사용. 실제 파일 SHA256은 `evidence/fonts.json`. 실제 native font fallback 검증은 아님.
- Studio: 실제 renderer를 R2 task outDir에 별도 build. Electron isolated userData, fixture `release-test`, Melody/hairpin. native score serializer와 MusicXML 실제 코드, OS file bridge만 메모리 fixture.1400×1000 dock207/280/360 light/dark,960px enlarged chrome. 상세 metric/runtime는 `evidence/studio/*.json`. 기보 영역은 실제 capturePage crop.
- Score R2 지면: `apps/in_c_sheet/test-fixtures/pdfs/short-score.pdf`,3pages. Poppler로 긴 변1400px의 PNG를 렌더해 `evidence/score-page-{1,2,3}.png`. 원본 hash는 manifest. PDF skill에 따라 실제 렌더 결과를 확인했다. 정적 raster이지 pdfrx 성공 실행 증거가 아니다.
- Browser R2: 실제 common React UI, Chrome headless 독립 profile. 외부 파일/오디오/마이크에 접근하지 않는 메모리 예제. 사용자의 열린 브라우저는 조작하지 않았다. 정확한 browser version/실행일은 results.json.

## 재실행

```sh
npm run typecheck --prefix packages/ddirori_web
# packages/ddirori_web 디렉터리에서
npx vite build --config product-r2.config.ts
# 저장소 루트에서 정적 결과 제공
python3 -m http.server 8095 --bind 127.0.0.1
# http://127.0.0.1:8095/docs/brand/ddirori-design-system/product-design-r2/preview/catalog/product-r2.html
```

```sh
# 저장소 루트. 환경에 설치된 실제 경로로 치환 가능
DDIRORI_PLAYWRIGHT=/tmp/ddirori-brand-tools/node_modules/playwright \
DDIRORI_BROWSER='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
DDIRORI_REVIEW_URL='http://127.0.0.1:8095/docs/brand/ddirori-design-system/product-design-r2/preview/catalog/product-r2.html' \
node docs/brand/ddirori-design-system/product-design-r2/verify-review.cjs

DDIRORI_BRAND_FONT=/tmp/ddirori-brand-tools/Pretendard.ttf \
DDIRORI_MATERIAL_FONT=/opt/homebrew/Caskroom/flutter/3.47.2/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf \
python3 docs/brand/ddirori-design-system/product-design-r2/capture-current.py play
# 같은 font 환경으로 score도 실행
python3 docs/brand/ddirori-design-system/product-design-r2/capture-current.py studio
python3 docs/brand/ddirori-design-system/product-design-r2/revision.py
```

캡처/리뷰 재실행은 R2 evidence를 갱신한다. 기존 manifest 검사가 실패하면 원인을 검토하고 새 검증 후에만 `revision.py --write`로 새 R2 기준을 기록한다. 미래 서비스 인계에서는 역사적 R2를 자동 재고정하지 않는다.

## 미실행·남은 판단

실제 PDF 성공 경로·annotation 좌표/gesture·페달, 물리 IME, 실기기 오디오/파일 권한/VoiceOver·스크린리더, 사용자 관찰은 이번 범위에서 미실행. R2 시안은 해당 엔진 검증을 대체하지 않는다. Play 소형 재생 strip의 항상 표시 범위, Score 가로화면 옵션 panel/sheet, Studio 명령 빈도와960px reflow는 제품 구현·사용자 판단으로 확인한다. 대표색·브랜드·launcher 선택은 보류 상태를 유지한다.

# R1 검증 기록

2026-10-25. source baseline `6bb5f027`. 디자인 구현·검토 자료 검증이며 앱 R1 이행/사용자 승인/실기기 출시 검수가 아니다.

| 실행 | 결과·범위 | 증거 |
| --- | --- | --- |
| shared React/catalog TypeScript + 별도 Vite build | 통과. 기존 preview를 덮지 않고 R1/preview 생성 | evidence/build.log |
| Play `flutter test test/brand_pilot_test.dart` |5개 통과. 실제 앱 위젯320/390/1024·dark/light·text2.0, fixture·폰트 주입 | evidence/play-test.log, play-*.png |
| Score `flutter test test/adoption_pilot_test.dart` |23개 통과. 실제 selection/저장대기/Back/실패/retry/가져오기 취소·복구 등 | evidence/score-test.log |
| Score 캡처 목적지만 변경한 별도 harness |23개 통과, 실제 앱 소스 그대로.6색/선택/light/dark·주요 상태. 과거 evidence 보존 | evidence/score-capture.log, score-capture-source.json, actual-score-*.png |
| built Studio isolated Electron | 입력0→undo 자동값 복원,207px panel overflow 없음·실제 shared CSS 확인 | evidence/actual-studio-electron.json/png, studio-test.log |
| 리뷰 Chromium 자동화 | 저장 pending Escape 차단, 실패 draft·retry, 취소 focus 복귀, 검색/초기화, viewport840/390/320,200% CSS zoom stress, reduced motion, named/blind/mono/grayscale | evidence/review-checks.json, proposal-*.png |
| 토큰 대비 |60쌍 통과. 색과 텍스트/경계 역할에 한정 | evidence/contrast.json |

시각 확인: 실제 Play 첫 화면·작품 행, 실제 Score 악보함, Studio 실제 panel, 시안의 세 앱/팔레트 light·dark/실패 dialog/320px/Studio 상세/아이콘을 이미지로 확인. 첫 리뷰에서 공통 CSS 순서에 의해 flat row가 카드처럼 보이는 문제를 확인해 **리뷰 composition scope**에서 수정했다. 앱·공통 package API는 수정하지 않았다. Play 캡처의 MaterialIcons 폰트 누락도 로더 환경변수를 주입해 다시 캡처했다.

브라우저 자동화 첫 시도는 search input을 textbox role로 찾다가 중단됐다. 실제 semantic role searchbox로 고쳐 전체 검사를 재실행해 통과했다. 이는 시안 동작 결함이 아니라 검사 selector 수정이다.

## 재현

```sh
npm run dev --prefix packages/ddirori_web -- --port 8091 --strictPort
npm run build --prefix packages/ddirori_web -- --outDir ../../docs/brand/ddirori-design-system/product-design-r1/preview
# 환경에 설치된 Playwright와 Chromium을 지정하거나 기본 의존성을 사용한다.
DDIRORI_PLAYWRIGHT=/path/to/node_modules/playwright DDIRORI_BROWSER=/path/to/chrome node docs/brand/ddirori-design-system/product-design-r1/verify-review.cjs
node docs/brand/ddirori-design-system/product-design-r1/contrast-check.cjs
# Score 실제 capture: DDIRORI_BRAND_FONT=<TTF>, DDIRORI_MATERIAL_FONT=<Flutter MaterialIcons-Regular.otf> 지정
python3 docs/brand/ddirori-design-system/product-design-r1/capture-score.py
```

Play capture는 해당 앱 cwd에서 `DDIRORI_BRAND_CAPTURE=true`, `DDIRORI_BRAND_CAPTURE_OUTPUT=<R1/evidence 절대경로>`, 위 두 폰트 변수로 `flutter test test/brand_pilot_test.dart`. Studio는 root `scripts/verify-ddirori-studio.cjs`; output은 out/ddirori/shared-baseline에서 R1 evidence로 복사. 기존 harness 증거와 제품 fixture 차이는 current-audit에 기록.

폰트: 리포지토리 PretendardVariable.woff2의 TTF 변환본을 Flutter test용으로 사용, MaterialIcons는 설치된 Flutter artifact. 테스트 환경 Flutter3.47.2; 브라우저 실제 버전은 review-checks.json, Electron은 actual-studio-electron.json에 기록. 웹200% CSS zoom은 browser page zoom/OS 글자200%의 대체 검증이 아니다. CSS zoom 전체 페이지 촬영의 반복 합성 현상을 피하려고 해당 캡처는 viewport 범위로 제한했다. 실제 Flutter 테스트의 textScale2.0은 별도 증거다.

## 미검증·한계

- 사람 대상 아이콘 용도 인식·팔레트 선호: 미실시. 검증 질문만 준비.
- 실제 iOS/Android 기기·VoiceOver/TalkBack·물리 IME·파일 권한·오디오·PDF/주석 엔진 동선: 이번 미실시. Studio 파일 bridge·OS dialog/메뉴·export 미검증.
- 웹 시안은 실제 공통 React 컴포넌트 사용. 정적 Paper·fake save/play/selection은 도메인 구현의 증거가 아님.
- 전체 contrast/accessibility audit·색각 사용자 시험을 통과했다고 주장하지 않음. 회색조와 토큰 수치·키보드 회귀에 한정.
- 기존 공통 Item의 작은 checkbox target·compact host와 touch policy는 실제 플랫폼 이행 때 다시 검증. 시안의 24px checkbox가 Flutter48px target을 증명하지 않는다.
- 현재 제품 코드와 iOS YAML 불변. 메타데이터 check는 이번 디자인 전용 변경에는 실행하지 않았고 서비스 구현 계약에 포함했다.
- 최종색·브랜드명·런처·배포·commit/push는 이번 작업에서 확정/실행하지 않았다. 기존 worktree3개 보존.

## 동시 작업 경계

마무리 중 별도 작업에서 웹 Item flat/trailing API와 관련 문서·카탈로그·검사가 추가됐다. 이 작업에서는 해당 파일을 수정하거나 되돌리지 않았다. 리뷰를 최신 공유 소스에서 다시 build/검증했고 실제 의존 파일 해시를 revision.json에 별도 기록했다. 기준 HEAD만으로 미커밋 공유 소스를 재현할 수 없으므로 서비스 구현 전 manifest와 현재 API를 대조한다. R1 자체는 새 Item props를 요구하지 않는다.

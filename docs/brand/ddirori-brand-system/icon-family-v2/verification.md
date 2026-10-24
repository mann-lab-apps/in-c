# 검증·재현·인계

2026-10-24. 이번 기록은 [baseline](evidence/baseline.json)을 기준으로 한다. 과거 adoption-pilot/specifications evidence를 갱신하지 않았다.

## 실행 결과

| 검사 | 명령·근거 | 결과 |
| --- | --- | --- |
| Studio 입력 재현 | `npm test -- src/renderer/src/SpanProperties.test.tsx` · [red](evidence/studio-red.log) | 수정 전3실패. 조합 Enter blur, Escape 전파, 중복 commit 재현 |
| 입력 수정·기존 domain 경계 | `npm test -- src/renderer/src/SpanProperties.test.tsx src/renderer/src/editor/span-editing.test.ts` · [green](evidence/studio-green.log) | 7통과 |
| 실제 App 회귀 | `npm test -- src/renderer/src/App.test.tsx src/renderer/src/SpanProperties.test.tsx src/renderer/src/editor/span-editing.test.ts` · [로그](evidence/product-tests.log) | 140통과 |
| 루트 타입 | `npm run typecheck` · [로그](evidence/typecheck.log) | 통과 |
| 생성 자산 | `node docs/brand/ddirori-brand-system/icon-family-v2/tools/verify.mjs` · [결과](evidence/verification.json) | 477검사·375 PNG, 임시 폴더 재생성 일치, ICNS/ICO 디코딩, iOS 치수, Android safe zone |
| CI용 계약 | `node docs/brand/ddirori-brand-system/icon-family-v2/tools/check-contract.mjs` | 466개 export hash·원본 링크·18개 검토 raster 통과 |
| 리뷰 UI | `node docs/brand/ddirori-brand-system/icon-family-v2/tools/verify-review.mjs` · [브라우저](evidence/browser.json) | 197검사. 4색 조건×4마스크×6크기, 이름/회색조/기억 과제, 이미지 decode, 390px·글자200% |
| 명세 | `DDIRORI_SPEC_REPORT=docs/brand/ddirori-brand-system/icon-family-v2/evidence/specifications.json node docs/brand/ddirori-design-system/tools/verify-specifications.mjs --skip-flutter` · [결과](evidence/specifications.json) | API/링크/React 예제/194토큰/생성물 일치. Flutter는 변경 없어 이번 재실행 제외 |
| 보존 | verification.json preservation | 시작 파일2,021개 중2,013개 불변. 허용한 문서6개·CI1개·Studio1개만 변경 |

GitHub 기존 CI가 전체 npm test를 실행하므로 새 Studio 테스트도 해당 경로에 포함된다. design-system.yml web job에는 무의존성 아이콘 계약 검사를 추가했다. **원격 CI는 실행하지 않았다.** 플랫폼 패키지 설치·서명·배포·스토어 업로드도 수행하지 않았다.

## 로컬 재현

저장소 루트에서:

```sh
# 후보만 생성. 기존 앱 폴더를 바꾸는 apply 옵션은 없다.
node docs/brand/ddirori-brand-system/icon-family-v2/tools/build.mjs
node docs/brand/ddirori-brand-system/icon-family-v2/tools/verify.mjs
node docs/brand/ddirori-brand-system/icon-family-v2/tools/check-contract.mjs

# 리뷰 서버를 실행한 터미널은 유지하고, 별도 터미널에서 브라우저 검사 실행
python3 -m http.server 8076 --bind 127.0.0.1
# 별도 터미널:
node docs/brand/ddirori-brand-system/icon-family-v2/tools/verify-review.mjs
```

리뷰 URL: `http://127.0.0.1:8076/docs/brand/ddirori-brand-system/icon-family-v2/`.

기존 격리 QA 환경의 `@resvg/resvg-js`, Playwright, Pillow를 재사용했다. 프로젝트 dependency/lockfile은 변경하지 않았다. 환경을 옮길 때:
- `DDIRORI_BRAND_TOOLS`: 도구 package.json/node_modules 및 venv가 있는 폴더. 기본 `/tmp/ddirori-brand-tools`.
- `DDIRORI_PYTHON`: Pillow가 설치된 Python 실행 파일. 기본 도구 폴더의 `venv/bin/python`.
- `DDIRORI_BROWSER_PATH`: 브라우저 실행 파일. 기본 macOS Google Chrome.
- `DDIRORI_ICON_REVIEW_URL`: 이미 실행한 리뷰 서버의 페이지 URL.
- `build.mjs --out <새 폴더>`: 독립 내보내기. `verify.mjs`는 임시 폴더를 만들어 재생성 비교 후 해당 임시 폴더만 삭제한다.

라이브 서버·실기기가 없는 CI에서도 check-contract는 Node 내장 모듈만으로 동작한다. 새 도구 버전으로 export가 달라지면 도구 버전과 원인을 검토하고 기록한다. 기존 PNG를 자동 baseline으로 승격하지 않는다.

## 시각 검수와 회귀 기준

[evidence/reviewed-raster-baseline.json](evidence/reviewed-raster-baseline.json)은 **에이전트의 내부 시각 검토 기준**이다. 사용자 브랜드 승인·스토어 승인과 구분한다. generator는 이 파일을 수정하지 않는다. 16/24/64 단색9장과 후보색별128px9장을 독립 hash로 비교한다. SVG/palette/source 또는 export만 갱신해 지나갈 수 없으며 변경된 픽셀은 재검토 사유가 된다.

직접 확인한 화면:
- [추천 세트](evidence/family-preview.png): 세 앱의 면·틈·시각 무게, Score0.92/Studio1.08·x=-5 보정 후.
- [작은 크기](evidence/size-preview.png): 16·24에서 small 적용, 32 이상 regular. Play의 틈·책의 중앙·편집 도구의 사선이 남음.
- [단색·이름 숨김](evidence/comparison-blind-gray.png): 색이 없어도 외곽이 다름. 실제 정답률 검사는 아님.
- [Android 근사](evidence/comparison-adaptive.png): 실제 adaptive export의 크롭·전경. 기기 인증 아님.
- [데스크톱 전체](evidence/review-desktop.png), [390px·글자200%](evidence/review-mobile.png): 줄바꿈·설정·이미지·조작 접근 가능. 큰 비교 이미지 영역의 스크롤은 의도적.
- 밝음/어두움/복잡한 배경 비교는 comparison-light/dark/wallpaper.png로 보존.

기하 검사에서 A의 보정 전후 차이를 수치로 측정했지만 각 앱의 면적을 억지로 같게 만들지 않았다. Studio는 사선 때문에 상대적으로 가벼운 면, Score는 넓은 두 면이 유지된다. B는 작은 크기에서 윤곽 정보가 많아 우선안에서 제외했다. 일반 메모/독서/진행 아이콘으로 읽힐 가능성은 사용자 검증의 대상이다.

## 아직 미검증

| 항목 | 실제 확인 절차·판정 |
| --- | --- |
| 한국어 IME·외부 키보드 | 실제 Electron에서 형상 필드 편집→조합 Enter→확정 Enter→Escape. 조합 도중 blur/command0, 확정1회, 취소 때 선택 유지. 합성 DOM 이벤트는 실제 IME 대체가 아님 |
| iOS·Android 런처 | 선택된 후보만 별도 빌드에 적용 후 홈·검색·작은 앱 목록·dark/tinted/themed·OEM mask 확인. 잘림·식별·색 바뀜 기록 |
| macOS/Windows/Linux | ICNS·ICO·PNG를 실제 패키지에 적용하고 Dock/작업표시줄/앱 목록 비교. 이번 container 디코딩만으로 OS 표시 통과 주장 금지 |
| Icon Composer | SVG 레이어를 가져와 실제 플랫폼 appearance를 검사하고 .icon 생성. 현재는 재료만 제공 |
| 보조기술 | 제품에서 아이콘과 제품명이 중복 낭독되지 않는지, 기능 버튼 대체 시 이름/상태가 맞는지 VoiceOver/TalkBack 확인 |
| 사용자 식별 | 앱 역할을 들은 후 이름 없는3아이콘 매칭, 3초 노출 후 회상, 자유 연상. 특히 Studio↔Score 혼동과 일반 메모/독서 연상 기록. 참여자 데이터 아직 없음 |
| 대표색 | 3후보를 실제 홈 화면·워드마크·바흐·제품 UI와 비교한 후 결정. 6색 원본·기본 라임은 현재 유지 |

## 되돌림·승격 경계

Studio 변경은 SpanProperties의 local input 이벤트 처리 hunk와 테스트로 한정된다. 데이터 역변환이 없다. 새 후보 폴더는 앱에서 import하지 않는다. CI step·문서 링크·후보 파일의 제거/승격은 이전 미커밋 작업과 분리한다. 파일 전체 checkout/reset으로 이전 작업을 지우지 않는다.

아이콘 승인 뒤에는 후보 geometry를 기존 운영 자산 생성 경로로 승격하고 source→export→플랫폼 적용을 검증한다. 같은 작업에서 영향받는 iOS manifest와 촬영 계획을 갱신한다. 승인 전 현재 생성기를 `--apply`로 실행하거나 이 후보를 실제 런처에 복사하지 않는다.

# 검증·재생성·미실시 범위

2026-10-24. 검토 후보 제작의 증거이며 사용자 승인·제품 적용·출시 검수와 구분한다.

## 재생성

```sh
node docs/brand/ddirori-brand-system/icon-family-v5/tools/build.mjs
node docs/brand/ddirori-brand-system/icon-family-v5/tools/verify.mjs
node docs/brand/ddirori-brand-system/icon-family-v5/tools/verify-review.mjs
git diff --check
```

- `DDIRORI_BRAND_TOOLS`: 기본 `/tmp/ddirori-brand-tools`, 기존 Resvg·Playwright를 재사용.
- `DDIRORI_PYTHON`: 기본 해당 폴더의 `venv/bin/python`. Pillow는 PNG 색상 모드·sRGB·컨테이너 포장·검사에 사용하며 그림 편집 도구로 사용하지 않음.
- `DDIRORI_BROWSER_PATH`: 기본 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- `DDIRORI_ICON_REVIEW_URL`: 기본 `http://127.0.0.1:8076/docs/brand/ddirori-brand-system/icon-family-v5/`.
- 기존8076 서버를 재사용했다. 서버가 없으면 저장소 루트에서 `python3 -m http.server 8076 --bind 127.0.0.1` 실행.
- `build.mjs --out <빈 임시 폴더>`는 독립 재생성. 출력 파일 목록과 해시가 동일해야 함.

제품 의존성·lockfile은 변경하지 않았다. 사용 가능한 연결 브라우저 실행 도구가 없어 기존 독립 Playwright 검증 경로를 재사용했다.

## 자동 검사

[자산 검사 기록](evidence/verification.json), [브라우저 검사 기록](evidence/browser.json), [시작 파일 해시](evidence/baseline.json).

최종 결과: 자산 검사 520개, 리뷰 화면 검사 76개 통과. 문서의 로컬 링크와 `git diff --check`도 통과했다.

- 생성493개 파일의 해시와 독립 재생성 결과 일치.
- 375개 PNG 크기·알파·색상 모드·sRGB, iOS Contents.json 크기, Google Play32-bit PNG·512px·용량, ICO 다중 프레임, ICNS 프레임 디코드 검사.
- A/B ×3앱 ×기본/소형의12개 마스터가 외부 참조·필터·이미지 임베드 없이 편집 가능한지 확인.
- 래스터의 경계·면적·중심을 측정하고 고립된 조각을 검사. 기본 Play는 음반 테두리·중앙의2개 연결 영역, Score는2개 페이지, Studio는1개 연결 영역이 의도된 구조다. 소형 Play는1개 영역.
- 두 방향의6개 adaptive 전경이 중앙66dp 안전 원 안에 들어가는지 검사.
- 검토 후 별도로 기록한 래스터 해시와 비교. 생성기는 이 기준을 갱신하지 않음.
- 리뷰의3색 설정(단색/공통 블루/앱별 색) ×4마스크 ×6크기 =72조합에서9개 이미지 로드와 실제 표시 크기 검사.
- 이름 숨김 후 이미지 접근성 이름 유지, 실제 측정값3행 표시, 390px/200% 글자 확대에서 페이지 넘침, 브라우저·리소스 오류 검사. 총76개 리뷰 검사.
- 시작 파일의 변경은 최신 후보를 안내하는 상위 문서3곳만 허용. v2·v3·v4 자산, 기존 제품·메타데이터·토큰, 다른 작업과 HEAD를 보존.

이번 기능 심벌에는 이전 음형의 빔 개수 계약을 적용하지 않는다. 원본 모브랜드 음형은 변경하지 않았다.

## 직접 본 결과

[추천 세트](evidence/family-preview.png), [소형 비교](evidence/sizes.png), [이름 없는 흑백](evidence/comparison-blind-gray.png), [색 비교](evidence/color-comparison.png), [구조 가이드](evidence/construction.png), [모바일](evidence/review-mobile.png), [적응형](evidence/comparison-adaptive.png).

A의 Studio는 기존 두 물체에서 하나의 면으로 모였고, 같은 방향의 내부 음표가 Score와 연결감을 준다고 판단했다. B는 음악으로 먼저 읽히지만 쓰기 의미가 약하고 다른 두 앱보다 가늘다. 소형은 기능의 외곽 차이를 남기면서도16px의 세부 의미까지 보장하지 않는다.

이는 assistant의 시각 검토다. 실제 사용자 식별·기억 테스트 결과가 아니다. [래스터 기준](evidence/reviewed-raster-baseline.json)에도 이 구분을 기록했다. 향후 조형 변경 시 새 이미지를 검토하고 이유를 남긴 뒤 별도 기준을 의도적으로 갱신한다. 이전 버전의 기준은 수정하지 않는다.

## 미실시

- 사용자 식별 테스트, 실제 홈 화면·테마 아이콘·Dock 설치, VoiceOver/TalkBack 검수.
- Xcode asset compilation, Android resource compilation, Icon Composer .icon 제작, Electron 패키징.
- 원격 CI, 스토어 제출, 커밋·푸시·배포.

Apple용 SVG 레이어는 입력 후보이고 웹 마스크는 근사다. PNG/컨테이너 디코드 검사가 OS 설치 승인을 대신하지 않는다. 제품 코드·실제 런처가 바뀌지 않아 제품 테스트 전체와 iOS 메타데이터 생성 파이프라인은 반복 실행하지 않았다.

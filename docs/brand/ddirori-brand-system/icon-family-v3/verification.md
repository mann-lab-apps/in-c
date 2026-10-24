# 검증과 재현

2026-10-24. 후보 아이콘·리뷰 화면 검증이다. 앱 설치·릴리스 검증이 아니다.

## 실행

제품 의존성을 바꾸지 않고 기존 독립 도구를 재사용했다.

```sh
node docs/brand/ddirori-brand-system/icon-family-v3/tools/build.mjs
node docs/brand/ddirori-brand-system/icon-family-v3/tools/verify.mjs
node docs/brand/ddirori-brand-system/icon-family-v3/tools/verify-review.mjs
git diff --check
```

- `DDIRORI_BRAND_TOOLS`: 기본 `/tmp/ddirori-brand-tools`, `@resvg/resvg-js`·Playwright 설치 위치.
- `DDIRORI_PYTHON`: 기본 위 폴더의 `venv/bin/python`, Pillow 사용. 그림 편집이 아니라 PNG 색상 모드·sRGB 및 ICO·ICNS 포장용이다.
- `DDIRORI_BROWSER_PATH`: 기본 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- `DDIRORI_ICON_REVIEW_URL`: 기본 `http://127.0.0.1:8076/docs/brand/ddirori-brand-system/icon-family-v3/`.
- 서버가 없으면 저장소 루트에서 `python3 -m http.server 8076 --bind 127.0.0.1`로 연다. 현재는 기존 서버를 재사용했다.
- 별도 재생성은 `build.mjs --out <빈 임시 폴더>`를 사용한다. 파일 목록·해시까지 같아야 한다.

최종 실행: 자산·구조·보존 검사 **538개**, 리뷰 브라우저 검사 **246개** 통과. PNG **375개**를 검사했다.

## 자동 검사 범위

[자산 검사 원본](evidence/verification.json) · [브라우저 검사 원본](evidence/browser.json)

- 490개 제작 자산의 해시와 독립 재생성 결과 일치, 375개 PNG의 크기·불투명도·색상 모드 검사.
- 12개 마스터(A/B × 3앱 × 기본/소형)에서 이미지 임베드·필터·외부 참조·clip 없이 편집 가능한 path인지 검사.
- 실제 래스터의 x80·x130 수직 스캔에서 각각 네 빔·세 빔 확인. 역할명 개수만으로 음가 검증을 대신하지 않음.
- 세 머리 각각을 따로 렌더링하여 기둥 상단 픽셀이 머리 안에 덮이는지 확인. 마지막 기둥은 y100부터204까지 연결됨을 검사.
- 모든 마스터의 여백·경계와 두 방향 여섯 adaptive 레이어의 66dp 원형 안전 영역 확인.
- 실제 AppIcon.appiconset 크기, Google Play RGBA+sRGB+512px+용량, ICO 다중 프레임, ICNS PNG 프레임 디코드 확인.
- 다섯 색 설정 × 네 마스크 × 여섯 크기 = 120조합에서 12개 비교 이미지의 로드와 실제 표시 크기 검사.
- 이름 숨김 시 이미지 접근성 이름 유지, 3초 타이머, 참고 이미지 로드, 390px/200% 글자 확대에서 페이지 수평 넘침, 브라우저·리소스 오류 검사. 큰 이미지 비교 영역은 내부 스크롤을 허용한다.
- 시작 당시 2,518개 기존 파일 해시를 비교한다. 허용된 변경은 최신 후보 안내를 추가한 문서 세 곳뿐이다. v2 자산·검증 기록, 제품·메타데이터, 다른 작업은 보존한다.

## 직접 본 항목

[추천 세트](evidence/family-preview.png), [두 방향·이전 자산 비교](evidence/comparison-light.png), [축소](evidence/size-preview.png), [흑백·이름 숨김](evidence/comparison-blind-gray.png), [안전 영역](evidence/comparison-adaptive.png)을 실제로 확인했다. 페이지와 모바일 캡처는 검증 도구가 저장한다.

A는 머리 부분의 기능 차이가 깔끔하고 B는 아래쪽 선 밀도가 높았다. 16px에서는 빔을 세거나 세 앱의 기능을 구분하기 어렵다. 24px에서도 Studio·Score의 차이는 충분한지 사용자 검증이 필요하다. 기둥 접점과 점 분리는 큰 원본과 래스터 검사를 함께 확인했다.

시각 검토 후 [별도 래스터 기준](evidence/reviewed-raster-baseline.json)을 저장한다. 이는 **assistant 내부 검토 기록**이며 사용자 승인이나 출시 승인이 아니다. 생성 도구는 이 기준을 갱신하지 않는다. 후속 조형 변경은 이미지 재검토와 변경 이유를 남긴 뒤 의도적으로 새 기준을 만든다. v2 기준은 그대로 남긴다.

## 수정한 검증 중 발견 사항

- A Play 머리의 왼쪽 경계와 Studio 펜촉–기둥 접점을 조정해 기둥 상단 노출을 없앴다.
- 390px/200% 글자 확대에서 128px 세 아이콘 줄이 페이지를 밀어내던 문제를 내부 스크롤로 해결했다.
- 타이머 테스트를 위해 멈춘 브라우저 시계가 전체 페이지 캡처의 반복 타일을 유발했다. 시계를 재개하고 다음 렌더 프레임을 기다린 뒤 다시 촬영한다. 최종 캡처를 직접 확인한다.

## 미실시와 인계

- 사용자 식별·기억 테스트, 실제 홈 화면·테마 아이콘·VoiceOver·TalkBack·Dock 설치 검증은 미실시.
- Icon Composer .icon 제작·Xcode asset compilation·Android resource compilation·Electron 패키징·원격 CI는 미실시.
- SVG 레이어는 Apple용 입력 후보다. 현행 시스템의 입체·유리 효과를 웹 미리보기로 검증했다고 주장하지 않는다.
- 리뷰 페이지의 select는 이 정적 비교 도구의 브라우저 기본 제어다. 제품 공통 Select 구현을 이 작업에서 변경한 것이 아니다.
- 제품 코드·엔진·공통 컴포넌트가 바뀌지 않아 해당 테스트 전체를 반복하지 않았다. iOS 메타데이터도 변경하거나 검증 완료 상태를 다시 쓰지 않았다.
- 최종 승인 후 제품 적용, 실기기 검사, 스토어 캡처·메타데이터 갱신을 별도 작업으로 수행한다.

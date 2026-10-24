# 레퍼런스의 사실·관찰·적용

2026-10-24 직전 조사에서 읽은 공식 자료와 실제 아이콘을 재사용했다. 이번 제작은 새로운 시장 조사나 사용자 조사가 아니다.

## Google Workspace

- [2020년 공식 발표](https://workspace.google.com/blog/product-announcements/introducing-google-workspace): 네 가지 색의 아이콘으로 연결된 제품군을 표현한다는 설명.
- [2026년 5월 공식 개편 발표](https://workspaceupdates.googleblog.com/2026/05/introducing-fresh-visual-identity-for-Google-Workspace-app-icons.html): 제품군의 일관성과 각 앱의 더 뚜렷한 정체성을 함께 목표로 명시.
- [최신 공식 자산](https://knowledge.workspace.google.com/admin/getting-started/brand-your-internal-communications-with-google-workspace): 직접 본 Gmail 다색 M, Meet 노란 카메라, Docs 파란 문서, Sheets 초록 표, Slides 노란 화면. 둥근 표현과 색의 전이는 공유하지만 주조색·외곽은 다르다는 관찰.

띠로리 적용 판단: 기능별 큰 윤곽을 유지하면서 그리는 방법을 맞춘다. 공통 심벌이나 같은 색 분할을 강제하지 않는다. 구글의 그라데이션·색 조합·심벌은 복제하지 않는다. Workspace의 관찰을 구글 전체의 단일 규칙으로 일반화하지 않는다.

## 카카오

[카카오톡](https://apps.apple.com/kr/app/id362057947), [카카오맵](https://apps.apple.com/kr/app/id304608425), [카카오페이](https://apps.apple.com/kr/app/id1464496236), [카카오 T](https://apps.apple.com/kr/app/id981110422), [카카오뱅크 공식 가이드](https://www.kakaobank.com/view/about/brand/resource)를 참고했다. 같은 날 수집한 [공식 스토어 자산과 URL](../icon-family-v2/reference-sources.json)은 이전 조사 폴더에 보존되어 있다.

- 사실: 카카오뱅크는 B와 I의 결합, 지정색, 심벌 배치의 시각 보정과 여백을 공개한다.
- 관찰: 여러 앱에서 노랑이 가족성을 만들지만 말풍선·핀·B·T는 각각 다르다. 카카오 T처럼 배경과 전경의 색 배치가 다른 사례도 있다.
- 적용 판단: 초기 세 앱은 공통 배경색·잉크색으로 묶고, 기능을 구분하는 큰 윤곽을 유지한다. 상하좌우 수학적 정중앙만으로 맞추지 않고 시각적 무게를 본다.

카카오 전체에 동일한 내부 제작 규칙이 있다고 단정하지 않는다. 노랑·말풍선·로고의 모양·스토어 입체 효과를 그대로 채택하지 않는다.

## 플랫폼

직전 작업에서 확인한 [Apple·Android·Google Play 공식 규칙과 적용 경계](../icon-family-v3/references.md)를 재사용한다. 플랫폼 파일 규격 검증과 실제 OS 설치·효과 검증은 별개다. 이번에도 Icon Composer .icon, Xcode/Android 리소스 컴파일, Electron 패키징을 수행하지 않았다.

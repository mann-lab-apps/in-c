# 자산 출처와 변경 기준

- 브랜드 입력: docs/brand/ddirori-design-system/palette-pilot.json의 brand, light, darkProposal. 이전 파랑은 visuals/palette.json에 보존한다.
- 음형 기본·소형·아이콘: docs/brand/ddirori-visuals/round-4/의 해당 SVG. 음가·점·머리 접점을 그대로 읽는다.
- 바흐: docs/brand/ddirori-visuals/round-3/bach-surprised.png. 이전 대화에서 image_gen으로 만든 승인 얼굴을 복사했다. 이번 공통 시스템 작업에서 새로 생성하거나 재해석하지 않았다.
- 글꼴: ddirori-visuals/fonts/PretendardVariable.woff2 및 동봉 OFL. 복사한 [FONT-LICENSE.txt](FONT-LICENSE.txt)를 함께 보존한다.
- 로딩: 승인된 음형의 타원 머리 밝기만 바꾸는 코드 모션. SVG와 Flutter·React 모두 같은 기본 좌표를 사용한다. reduced motion은 정지형이다.
- 카탈로그 악보 자리 영역: 직접 작성한 오선·단순 음표 도식. 실제 PDF·기존 연주 영상·상업 악보 이미지가 아니다.

생성 명령은 tools/build.mjs이며 생성 파일을 손으로 편집하지 않는다. assets/manifest.json은 검사 도구가 실제 파일 해시를 계산해 만든다. 플레이·스코어의 아이콘 패키지는 브랜드 제작 도구로 갱신한다. 실제 스토어 제출은 별도다.

현재 Flutter의 바흐는 brand-system에서 생성한 네이티브 벡터, React는 같은 SVG를 사용한다. 이 폴더의 bach-surprised.png는 승인 이미지 비교·호환용 원본이다. 현재 자산 사용은 [브랜드 규칙](../../ddirori-brand-system/visual-identity.md)을 따른다.

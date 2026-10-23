# 자산 출처와 사용 범위

2026-10-21 기준. 이 폴더와 evidence의 자산은 기러기 디자인 시스템 제안용이다.

| 자산 | 출처·제작 방식 | 조건과 범위 |
| --- | --- | --- |
| 기러기 원형·제품 심벌·타일·비교 보드 | 이번 작업에서 `tools/build.py`로 작성한 벡터 | 최종 상표 독점성·기존 로고와의 비유사성을 보증하지 않음 |
| 비행 포즈·기러기 떼·비행 보드 | 같은 생성 스크립트에서 직접 구성한 두 포즈와 일곱 개체의 배치 | 특정 책 표지·삽화·타사 그래픽을 복제하지 않음 |
| 워드마크 | 직접 구성한 텍스트 + 기러기 심벌 | Pretendard 필요. 커스텀 레터링은 후속 작업 |
| PretendardVariable.woff2 | [공식 v1.3.9 배포](https://github.com/orioncactus/pretendard/tree/v1.3.9/packages/pretendard/dist/web/variable/woff2) | SIL OFL 1.1. [동봉 라이선스](fonts/LICENSE.txt). 수정하지 않은 원본 배포 파일 |
| practice-score.svg | 직접 만든 12마디 단선율·4/4 예제. 저장소의 VexFlow 5로 조판 후 글자를 경로로 변환 | 외부 작곡가·출판사 악보를 복제하지 않음. 기호의 조판 품질은 상용 악보 검수 결과가 아님 |
| 음악 기호·악보 표기 글자 | VexFlow 배포의 Bravura·Academico 글꼴을 생성 과정에서 사용 | SVG에는 글리프 경로가 남고 음악 폰트 바이너리는 배포하지 않음. 렌더링 코드의 [VexFlow 라이선스](VEXFLOW-LICENSE.txt) 동봉 |
| 확인용 PNG | Chromium으로 SVG와 독립 목업을 렌더링 | 실제 앱·실기기·스토어 촬영 결과가 아님 |
| 기존 AI 기러기 컨셉 보드 | 대화 중 생성된 로컬 PNG를 참고 | 새 결과에 원본 PNG를 복사하지 않았고 제품 아이콘은 벡터로 새로 구성 |
| Figma 레퍼런스 | [공식 자료 링크](../foundation.md) | 타사 로고·화면 이미지·아이콘·글꼴을 자산에 포함하지 않음 |

음악 폰트의 문서 출력과 폰트 파일 재배포는 별개다. 향후 음악 글꼴 바이너리를 제품에 번들할 경우 [Bravura 공식 OFL](https://github.com/steinbergmedia/bravura/blob/master/LICENSE.txt) 등 해당 배포의 라이선스와 고지 파일을 따로 확인한다. 이번 작업은 제품에 폰트를 설치하거나 음악 렌더러를 교체하지 않았다.

검증 도구는 별도의 `/tmp` 환경에 설치한 Playwright, Chromium과 fonttools/brotli를 사용했다. 제품 package.json·lockfile에는 의존성을 추가하지 않았다. [해시 목록](manifest.json)은 자산 파일의 실제 SHA-256을 기록한다.

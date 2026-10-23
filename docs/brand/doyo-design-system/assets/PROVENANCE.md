# 자산 출처

2026-10-22 · 도요 디자인 시스템 참조 구현

| 자산 | 출처 | 상태 |
| --- | --- | --- |
| 선택한 로고·배너 | [도요 시안](../../doyo-visuals/README.md), 기본 image_gen | 래스터 컨셉, 최종 상표용 벡터 아님 |
| doyo-loader.svg / still.svg | v4 실루엣을 참고해 직접 작성한 loader-geometry.json | 로딩용 코드 네이티브 벡터. 승인 시안의 자동 추적/정확한 복제라고 주장하지 않음 |
| loader-motion.css / Flutter painter | 공통 geometry와 motion 수치 기반 직접 구현 | 웹/Flutter에서 같은 동작 의도, 렌더러별 미세한 차이 가능 |
| PretendardVariable.woff2 | 기존 중립 글꼴 자산을 원본 그대로 복사 | [공식 v1.3.9](https://github.com/orioncactus/pretendard/tree/v1.3.9/packages/pretendard/dist/web/variable/woff2), [동봉 OFL](fonts/LICENSE.txt) |
| practice-score.svg | 앞선 시스템에서 직접 만든 12마디 단선율 예제 | VexFlow로 조판한 중립 예제 재사용. 이번에는 기보 색만 #202020으로 통일 |
| 음악 글리프 | VexFlow의 Bravura·Academico를 기존 생성 시 사용 | SVG 경로. 음악 폰트 바이너리 미포함. [라이선스](VEXFLOW-LICENSE.txt) 동봉 |
| evidence PNG | 독립 HTML/CSS/JS 목업을 Chromium으로 렌더링 | 실제 앱·실기기·스토어 캡처 아님 |

기러기 로고·아이콘·팔레트는 가져오지 않았다. 글꼴과 창작 악보 예제만 출처와 함께 재사용했다. 타사 브랜드 자산을 복사하지 않았다. 해시는 검증 도구에서 실제 파일을 읽어 생성한다.

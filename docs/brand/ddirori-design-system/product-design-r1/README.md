# Play · Score · Studio 화면 설계 R1

> 2026-10-25 설계 방향 갱신: 이 revision은 화면 탐색·검토 이력이다. 서비스 UX의 필수 구현 명세로 사용하지 않는다. 각 서비스는 자신의 UX 레퍼런스로 설계하고 [공통 테마 확장 기준](../service-theme-contract.md)을 따른다. 이미 반영된 동작의 변경은 해당 앱에서 검증한다.

2026-10-25. **디자인 시안과 구현 계약 완료 / 실제 제품 적용은 인계 대기.** 대표색·브랜드명·런처 확정 아님.

기준 source commit: `6bb5f027cfa5df3a78094a97699c6c5a84c9f0c1`. 디자인 revision은 `product-design-r1`과 [revision.json](revision.json)의 SHA-256 파일 집합으로 식별한다. 서비스 작업은 적용 당시 이 문서의 commit도 함께 기록한다. 미커밋 상태에서는 미래 commit을 만들어 쓰지 않는다. 마무리 중 별도 공통 Item 작업이 들어와 의존 소스 해시도 분리 기록했다. R1이 해당 변경을 소유하거나 공통 API를 확정한 것은 아니다.

## 검토 화면

저장소 루트에서:

```sh
npm run dev --prefix packages/ddirori_web -- --port 8091 --strictPort
# http://127.0.0.1:8091/?products
```

- [실행 화면](http://127.0.0.1:8091/?products): 세 앱 / 동일 화면 세 팔레트 / 한 앱 상세·상태 / 아이콘 모드.
- [독립 빌드](preview/index.html?products): HTTP로 제공하면 사용 가능. file://에서 모듈 실행을 보장하지 않는다.
- [세 앱 밝은 화면](evidence/proposal-family-light.png), [팔레트 밝은 화면](evidence/proposal-palettes-light.png), [팔레트 다크](evidence/proposal-palettes-dark.png).
- [Score 실패](evidence/proposal-score-save-error.png), [성공](evidence/proposal-score-save-success.png), [뷰어 배치](evidence/proposal-score-viewer.png), [Studio 상세](evidence/proposal-studio-wide.png).

`packages/ddirori_web/catalog/product-review.tsx`는 실제 `@ddirori/ui`를 사용한다. 비교 전용 CSS는 **앱 배치 adapter 제안**이며 공통 패키지 API 변경이 아니다. 리스트 카드 대신 평평한 행을 합성했다. 아이콘은 최신 v8 SVG 원본을 사용한다. `ProductGlyph`의 기존 자산을 v8로 교체했다고 주장하지 않는다.

실제 제품: Flutter 위젯 캡처 / Electron 실제 renderer. 디자인 시안: 공통 React UI + 메모리 fixture. 정적 표현: Paper SVG. 저장은 첫 실패·다음 성공의 예제, 재생 시간은 수동, PDF·주석·사보·파일 시스템은 미연결. 세 앱의 프레임 테두리와 R1 footer는 리뷰용이며 실제 제품 장식이 아니다.

## 제안

**첫 구현은 Score 악보함 → 선택 → 일괄 편집.** 이미 공통 목록 adapter와 비동기 저장·취소·실패 테스트가 있어 시각 변경과 동작 보존을 분리해 검증하기 쉽다. 빈번한 악보 찾기·열기를 먼저 개선하고, 뷰어 엔진은 유지한다.

대표색은 **바이올렛 우선 검토**, 파랑·코럴을 대안으로 남긴다. 중립 작업 면은 공통으로 유지한다. 선택된 색이 아직 없으므로 현재 `color-system.json`의 active lime은 변경하지 않았다. 바흐는 첫 빈 화면에 한 번, 나머지 상태는 행동과 설명을 우선한다.

| 문서 | 역할 |
| --- | --- |
| [current-audit.md](current-audit.md) | 실제 제품 대조, 공통 적용 범위·차이 |
| [screen-contract.md](screen-contract.md) | 위계·배치·반응형·상태·브랜드 표현 |
| [score.md](score.md) | 첫 흐름 상세 계약·수용 조건 |
| [play.md](play.md) | 라이브러리·재생 화면 인계 |
| [studio.md](studio.md) | 편집 chrome·속성 패널 인계 |
| [palette-icons.md](palette-icons.md) | 후보 축소·역할색·아이콘 검증 자료 |
| [handoff-review.md](handoff-review.md) | 구현 결과 반환·세 앱 재검토 |
| [validation.md](validation.md) | 실제 수행 검사·한계·재현 |

기초 토큰·공통 API·도메인 계약은 [shared-baseline](../shared-baseline.md), [specifications](../specifications/README.md), [support-matrix](../support-matrix.md)를 계속 사용한다. R1은 화면 구성의 추가 계약이다. 구형 브랜드 reference 문서의 따뜻한 바탕 제안보다 현재 neutral color system과 이 R1을 우선한다. 신규 외부 레퍼런스 조사는 하지 않았다. 기존 당근·카카오/네이버·MUI·Excalidraw 원칙을 실제 현재 화면의 문제에 적용했다.

남은 사용자 판단: 대표색 후보, Score 우선 적용 순서, 아이콘 무레이블 용도 인식. 사람 대상 테스트와 미래 서비스 구현 결과 검토는 아직 진행하지 않았다.

# Product design R2 · 핵심 음악 작업 화면

> 2026-10-25 설계 방향 갱신: 이 revision은 화면 탐색·검토 이력이다. 서비스 UX의 필수 구현 명세로 사용하지 않는다. 각 서비스는 자신의 UX 레퍼런스로 설계하고 [공통 테마 확장 기준](../service-theme-contract.md)을 따른다. 이미 반영된 동작의 변경은 해당 앱에서 검증한다.

2026-10-25. **실제 구현 검토 + 핵심 화면 설계 완료, 제품 R2 적용 대기.** 최종색·런처·브랜드명 승인 아님. R1과 별도 revision이며 이전 manifest/evidence를 갱신하지 않는다.

## 열기

```sh
npm run dev --prefix packages/ddirori_web -- --port 8094 --strictPort
# http://127.0.0.1:8094/catalog/product-r2.html
# 별도 빌드 (packages/ddirori_web에서)
npx vite build --config product-r2.config.ts
```

[실행 화면](http://127.0.0.1:8094/catalog/product-r2.html) / [독립 빌드](preview/catalog/product-r2.html) / [검증 기록](validation.md).

- **세 앱 실제 구현:** 이번 현재 소스에서 새로 촬영한 Flutter widget / Electron renderer. 확대 원본 링크 제공.
- **실제 ↔ 제안:** 현재 목록·재생·속성 화면과 R2 핵심 작업 확장을 비교. 동일 데이터·동일 화면의 픽셀 diff가 아님. 동일 화면에서 고칠 부분은 review.md의 backlog로 구분.
- **핵심 작업 시안:** 실제 @ddirori/ui Item.flat/trailing, Tabs, Select, Input, Slider, Dialog 등을 사용. 상태·테마·기존 lime와 후보3색 전환.

시안 저장/재생은 메모리 상태이며 엔진·파일·마이크 미연결. Score 지면은 실제 `apps/in_c_sheet/test-fixtures/pdfs/short-score.pdf` 3페이지를 Poppler로 렌더링했다. PDF 링크·zoom·주석 좌표 변환은 구현하지 않았다. Studio 지면은 실제 renderer의 기보 영역 캡처이며 편집 가능한 악보가 아니다. Play 데이터는 기존 작품 구조를 설명하는 합성 fixture. 현재 큐 편집/순서 변경 기능을 만들지 않았다.

## 추천 순서

1. **Play의 현재 재생과 탐색을 분리**: 탐색 중인 녹음을 바꿔도 실제 큐/위치/현재 악장은 그대로 두고, 조작 영역의 접근을 유지한다. 긴 작품 정보 반복을 줄이는 효과가 즉시 보이고 기존 재생 adapter를 활용할 수 있다.
2. **Score viewer chrome 정리**: 실제 PDF 엔진을 유지하면서 읽기/주석/연습 도구의 역할을 분리. 공연의 기존 허용 정책·페이지/주석을 보존해야 하므로 지면·제스처 회귀 동반.
3. **Studio 입력/선택 구분**: neutral chrome는 이미 R1에서 개선됨. 기존 분류·명령은 유지하고 ‘다음 입력’과 ‘선택한 표기’ 맥락을 명시한다.

Score 악보함 R1의 남은 정보 위계 조정은 viewer 작업 전에 작은 별도 수정으로 처리할 수 있다. 대표색은 결정하지 않았고 리뷰 기본값은 기존 trial lime다.

| 자료 | 내용 |
| --- | --- |
| [review.md](review.md) | 실제 화면 관찰·상태·우선순위 backlog |
| [play.md](play.md) | 작품/녹음/악장/큐 및 seek 계약 |
| [score.md](score.md) | PDF·주석·연습·공연 도구 계약 |
| [studio.md](studio.md) | 입력·속성·dock·draft/undo 계약 |
| [shared-and-handoff.md](shared-and-handoff.md) | 공통 재사용·확장 판단·반환 절차 |
| [validation.md](validation.md) | 실행/미실행·소스 확인·검증 명령 |
| [revision.json](revision.json) | 실제 기준 HEAD + 의존 파일/설계 해시 |

기초는 기존 [명세](../specifications/README.md), [R1 화면 계약](../product-design-r1/screen-contract.md), [지원 환경](../support-matrix.md), [문체](../../ddirori-brand-system/voice.md), [모션](../../ddirori-brand-system/motion.md)을 따른다. 이번에는 외부 레퍼런스를 추가하지 않았다. 이미 정한 원칙과 실제 제품의 화면·코드로 구체적인 설계 판단이 가능했다.

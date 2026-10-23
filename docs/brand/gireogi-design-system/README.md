# 기러기 디자인 시스템 제안 v1

2026-10-21 · 설계 제안 · 제품 미적용 · 모브랜드와 제품명은 가칭

함께 날아가는 기러기 떼를 브랜드의 대표 장면으로 삼고, 날개·깃·머리에서 파생한 형태와 청록·크림의 공통 팔레트로 음악 제품군을 묶는다. 작은 로고는 한 마리로 축약하고, 앱 아이콘은 각 부분으로 구분한다. 악보를 보는 앱은 큰 조작 영역과 안정적인 페이지 이동을, 악보를 만드는 앱은 촘촘한 도구와 명확한 편집 상태를 기준으로 삼는다.

**추천은 A안인 면과 여백의 체계다.** 단색에서도 한 장의 날개, 두 겹의 깃, 길쭉한 깃대, 마주 보는 머리, 대칭 날개가 구분된다. 기러기의 귀여움은 로고·빈 화면·일러스트에 두고, 악보와 반복 작업 영역은 조용하게 유지한다.

![함께 날아가는 기러기 떼](evidence/flock-board.png)

## 먼저 확인할 결과

- [실행 가능한 디자인 리뷰 목업](preview/index.html): 브랜드, 악보함, 악보 보기, 사보, 컴포넌트. 상단에서 테마를 전환한다.
- [기러기 떼와 비행](flock-and-motion.md): 대표 장면, 두 비행 포즈, 무리 구성과 모션. [제품군 형태·팔레트 보드](evidence/family-board.png).
- [악보앱 라이브러리](evidence/library-mobile-light.png), [태블릿 악보 보기](evidence/reader-tablet-light.png), [주석과 연습 도구](evidence/reader-annotation-dark.png).
- [사보 기본 화면](evidence/editor-default-light.png), [선택 상태](evidence/editor-selected-dark.png), [선택·입력·재생의 구분](evidence/editor-states-light.png).
- [아이콘 두 계열 비교](evidence/icon-comparison.png), [32·48·64px 검토](evidence/small-icons.png), [형태의 파생](evidence/derivation-board.png).

프로젝트 루트에서 `python3 -m http.server 8043 --bind 127.0.0.1`을 실행하고 다음 주소를 연다.

```text
http://127.0.0.1:8043/docs/brand/gireogi-design-system/preview/
```

목업은 독립적인 HTML/CSS/JS다. 실제 앱·계정·사용자 파일에 접근하지 않는다. 라이브러리 검색·즐겨찾기·정렬, 보기/주석 전환, 페이지 번호 이동, 연습 패널, 사보 선택·입력·재생 표시·패널 접기를 체험할 수 있다. 음원 재생·실제 사보 편집·PDF 가져오기·저장은 연결하지 않았다. 예제 페이지는 동일한 창작 악보를 반복 사용하며 페이지 넘김 품질을 증명하지 않는다.

## 적용할 때 읽는 순서

| 문서 | 결정하는 것 |
| --- | --- |
| [브랜드와 레퍼런스](foundation.md) | 인상, 근거, 실제 기능과 제안의 경계 |
| [형태와 아이콘](iconography.md) | 원형, 파생 규칙, 단색과 마스크, 캐릭터 |
| [기러기 떼와 비행](flock-and-motion.md) | 무리 중심의 대표 장면, 비행 자산, 모션 사용 범위 |
| [토큰과 글꼴](tokens.md) / [원본 JSON](tokens.json) | 색상·상태·밀도·모드·플랫폼 대응 |
| [컴포넌트](components.md) | 크기·상태·키보드·터치·복구 규칙 |
| [Clef & Staff](clef.md) | 악보함·열람·주석·연습의 배치와 동선 |
| [Chromatics](chromatics.md) | 입력·선택·속성·출력과 좁은 창 정책 |
| [제품군 전체](product-family.md) | 다른 서비스의 공통점과 차이 |
| [기존 시스템에서의 이행](migration.md) | 유지할 원칙, 대응표, 적용 순서 |
| [검증과 남은 질문](validation.md) | 측정, 캡처, 검증 한계, 사용자 확인 |
| [Figma로 옮기는 방법](handoff.md) | 라이브러리 구조·변수·컴포넌트 명명 |

## 범위와 자산

기존 [브랜드 기준](../brand-foundation.md), [토큰](../design-tokens.md), [상태 지침](../component-guidelines.md), [테마 후보](../design-theme-candidates.md), [자산 목록](../asset-inventory.md)은 그대로 유지한다. 이 폴더는 그 기준을 대체했다고 선언하지 않는 후속 설계안이다. 현재 공개명 `in C`, `Clef & Staff`, `Chromatics`, 패키지와 출시용 아이콘도 변경하지 않았다.

`assets/`의 SVG는 편집 가능한 원본이다. `*-a.svg`가 추천 심벌, `*-b.svg`가 비교 계열, `*-tile.svg`가 마스크 적용 예시, `*-mono.svg`와 `*-inverse.svg`가 단색·역상이다. PNG는 [evidence](evidence/)에 있으며, [검증 기록](evidence/validation.json)은 실제 렌더링 작업에서 생성한다. SVG 워드마크는 편집 가능한 텍스트이며 함께 제공한 Pretendard 설치가 필요하다. 최종 상표용 커스텀 레터링이나 출시용 플랫폼 아이콘 패키지는 아니다.

명세·벡터 생성은 `python3 docs/brand/gireogi-design-system/tools/build.py`, 브라우저 검증은 [검증 문서](validation.md)의 명령을 따른다. 저장소의 패키지 의존성은 추가하지 않았다.

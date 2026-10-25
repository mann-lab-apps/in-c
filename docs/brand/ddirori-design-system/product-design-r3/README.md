# Product Design R3 · 첫 음악에서 다음 도구로

> 2026-10-25 설계 방향 갱신: 이 revision은 화면 탐색·검토 이력이다. 서비스 UX의 필수 구현 명세로 사용하지 않는다. 각 서비스는 자신의 UX 레퍼런스로 설계하고 [공통 테마 확장 기준](../service-theme-contract.md)을 따른다. 이미 반영된 동작의 변경은 해당 앱에서 검증한다.

2026-10-25. **서비스 연결·첫 사용 경험의 설계 revision**. 제품 구현은 서비스별 후속 작업이다. 브랜드명·대표색·런처 선택을 추가 확정하지 않는다. R1/R2의 명세·manifest·시안·검증 자료를 보존한다.

## 추천 여정

1. **Studio → Score: 만든 PDF로 연습하기.** Studio의 실제 PDF 저장과 Score의 실제 PDF 가져오기를 사용자가 파일로 연결한다. 데스크톱→모바일의 기기 간 전달은 별도 사용자 행동이며 자동 전송이 아니다.
2. **Play → Score: 듣던 음원을 악보에 연결하기.** Play의 앱 관리 음원 사본을 내보내고, Score의 기존 악보 정보에서 연결 파일로 추가한다. WAV/MP3/M4A/FLAC/OGG의 선택 확장자 교집합을 출발점으로 하며 실제 codec 재생은 별도 기기 검사다.

Score → Play의 ‘관련 녹음 바로 찾기’는 공통 작품/녹음 ID·검색 진입 계약이 없어 보류했다. 두 서비스의 제목이 같다고 자동 연결하지 않는다. [가능성 조사](capabilities.md)와 [연결 상세 계약](connections.md)을 함께 읽는다.

각 앱의 첫 성취는 Play **파일 가져오기→작품·녹음·악장 정리→실제 재생**, Score **PDF 추가→지면 열기→첫 주석 저장**, Studio **새 악보→첫 음표→프로젝트 파일 저장**이다. 파일 선택이나 저장 요청 자체를 성취로 계산하지 않는다.

## 실행

```sh
# packages/ddirori_web 디렉터리에서
npx vite --config product-r3.config.ts
# http://127.0.0.1:8096/catalog/product-r3.html
npx vite build --config product-r3.config.ts
```

[실행 시안](http://127.0.0.1:8096/catalog/product-r3.html) · [독립 빌드](preview/catalog/product-r3.html) · [검증 기록](validation.md).

- 전체 여정: 세 앱 첫 성취와 두 연결의 위치를 비교한다.
- 첫 사용: 신규/기존/중단 후 복귀/Score 외부 PDF 추가 완료, 실패·취소·부분 결과를 검토한다.
- 서비스 연결: 수동 파일 전달, 미설치·설치 확인 불가·파일/형식/접근 실패, 도착 후 복귀를 검토한다.

실제 `@ddirori/ui`를 사용한 **메모리 시안**이다. 실제 chooser·파일·오디오·PDF/기보 엔진·앱 설치·딥링크는 연결하지 않았다. PDF는 기존 로컬 fixture의 정적 raster이며 보표는 코드로 그린 설명용 SVG다. ‘도착 화면 검토’와 검토 조건은 리뷰 도구다. 제품에 같은 버튼을 구현하라는 요구가 아니다. 단계를 자동 재생하는 소개 슬라이드는 사용하지 않는다.

## 명세

| 문서 | 내용 |
| --- | --- |
| [source-index.md](source-index.md) | 실제 소스 파일·함수 위치와 조사 해시 |
| [capabilities.md](capabilities.md) | 현재 기능·플랫폼·파일 수명·공통 ID/라우팅의 조사 근거 |
| [journeys.md](journeys.md) | 전체 여정 지도·첫 성취·선정 이유·관찰 지점 |
| [connections.md](connections.md) | PDF·음원 수동 전달과 미지원 직접 연결 계약 |
| [first-play.md](first-play.md) | 가져오기·정리·첫 재생 및 부분/분석 대기 |
| [first-score.md](first-score.md) | PDF·뷰어·주석, 외부 수신·재방문 |
| [first-studio.md](first-studio.md) | 새 문서·첫 입력·실제 프로젝트 저장 |
| [copy-and-brand.md](copy-and-brand.md) | 문구·용어·바흐·모션·샘플 정책 |
| [implementation.md](implementation.md) | 책임 구분·현재와 목표 mapping·우선순위·반환 절차 |
| [user-validation.md](user-validation.md) | 미실행 사용자 관찰 계획과 남은 판단 |
| [validation.md](validation.md) | 수행/미실행 검사·실행 방법·동시 작업 보존 |
| [revision.json](revision.json) | R3 설계·의존성·산출물 해시와 실제 기준 |

기존 [상태 패턴](../specifications/patterns.md), [지원 환경](../support-matrix.md), [공유 기준](../shared-baseline.md), [R2](../product-design-r2/README.md), [문체](../../ddirori-brand-system/voice.md), [모션](../../ddirori-brand-system/motion.md)을 따른다. 새 외부 레퍼런스 조사는 추가하지 않았다. 이번 질문은 현재 소스·플랫폼 설정과 기존 원칙으로 판단할 수 있었다.

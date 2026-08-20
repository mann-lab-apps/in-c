# 앱 포트폴리오와 유통 전략 리서치 노트

작성일: 2026-08-16

## 목적

이 문서는 GPT/웹 리서치 대화에서 나온 외부 근거와 전략 판단을 모아둔다.

현재 in C의 앱 전략은 “음악가에게 필요한 서비스를 만들고, 살아남는 도구를
포트폴리오와 유입 지면으로 쌓는다”는 방향이다. 다만 이 전략은 공연 홍보 MVP의
대체물이 아니라, in C가 지속적으로 접근할 수 있는 owned distribution과 팬 기반을
만드는 보조 트랙으로 다룬다.

더 상위의 가치 검증은
[`작품 × 한 사람 Proof of Value`](../product/work-to-person-proof-of-value.md)에서
다룬다. 앱 포트폴리오는 그 가치를 곧바로 증명하는 도구라기보다, in C가 사람들과
반복적으로 만날 수 있는 접점을 만드는 전략이다.

## 핵심 판단

### 1. 무료 음악 앱은 MVP 자체보다 distribution infrastructure에 가깝다

현재 가장 직접적인 in C의 사업 가설은 “클래식 공연/연주회를 실제 잠재 관객에게
효과적으로 연결할 수 있는가”이다. 무료 음악 앱부터 만들면 다음 검증 단계가 앞에
추가된다.

- 음악가 접촉
- 반복 문제 발견
- 앱 개발
- 앱 배포
- 사용자 확보
- 앱 사용자에게 in C/공연 맥락 노출
- 공연 홍보 효과 검증

따라서 앱 포트폴리오는 “공연 홍보 MVP의 대체 경로”가 아니라, 실제 캠페인을 해본 뒤
audience 접근/owned channel 부족이 병목으로 드러날 때 강해지는 distribution 전략으로
본다.

일반 커뮤니티나 SNS에 공연 정보를 푸시하는 방식은 in C의 핵심 검증으로 보지 않는다.
그 실험은 “외부 채널에서 광고 소재와 타기팅이 먹히는가”에 가까우며, in C가 만들려는
관점/도구/콘텐츠 기반 관계를 검증하지 못한다. in C다운 검증은 앱, Columns, 블로그,
YouTube 등을 통해 이미 in C의 팬이 된 사람들에게 공연 맥락이 자연스럽게 받아들여지는지
확인하는 쪽이다.

### 2. 투트랙 구조로 관리한다

Track A는 in C Marketing이다.

- 공개 공연 Dark Knight
- 실제 공연 Beta
- Pull 발생 여부 확인
- Paid Pull 검증

Track B는 MannLab/in C Apps다.

- 음악가 접촉
- 반복 문제 발견
- 초소형 앱 또는 서비스 제작
- 실제 사용 검증
- 살아남은 도구만 발전

Track B에서 성공한 도구는 Track A의 owned distribution channel이 된다.

### 3. 앱 내부의 in C 노출은 작고 자연스러워야 한다

앱은 사용자의 반복 문제를 먼저 해결해야 한다. in C 배너/링크는 다음 정도로 제한한다.

- 상단 배너: “Click에 필요한 기능이 있나요?”
- 상단 CTA: “기능 제안”
- 연결: `https://in-c.mannlab.app/utility-apps.html?source=in-c-click#utility-app-form`
- 하단 제안 배너는 두지 않는다.

앱을 공연 홍보 서비스처럼 보이게 만들지 않는다. 반대로 앱이 in C와 완전히 끊어진
유틸리티처럼 보이는 것도 피한다.

## 콘텐츠/유통 리서치 근거

### 1. Columns 원본은 in C에 둔다

Google Search Central은 중복 또는 유사 콘텐츠가 여러 URL에 있을 때 검색 결과에 보여줄
대표 URL, 즉 canonical URL을 선택한다고 설명한다. Google은 사이트 운영자가 선호하는
canonical URL을 지정할 수 있도록 `rel="canonical"`, sitemap, 내부 링크 일관성 등의
신호를 권장한다.

전략 반영:

- Columns의 canonical home은 in C 자체 사이트로 둔다.
- Velog에는 전문 복제보다 요약과 원문 링크를 우선한다.
- 동일 글을 여러 플랫폼에 올리더라도 in C URL을 대표 원본으로 관리한다.
- sitemap과 canonical meta를 in C 기준으로 관리한다.

### 2. 네이버도 단일 대표 URL과 고유한 제목/설명을 중시한다

네이버 서치어드바이저는 같은 내용이라면 되도록 단일 호스트명과 단일 URL을 사용하고,
여러 주소가 필요하면 대표 주소로 301 redirect하거나 `rel="canonical"`을 지정하라고
안내한다. 또한 페이지별 고유한 제목과 설명문을 작성하라고 안내한다.

전략 반영:

- “한국 서비스니까 네이버 블로그부터”라는 선행 투자는 하지 않는다.
- 자체 사이트의 URL, title, description, OG title/description을 먼저 정돈한다.
- 네이버 블로그는 Dark Knight/콘텐츠 실험에서 네이버 검색 또는 VIEW audience가 실제
  병목으로 확인될 때 추가한다.
- 네이버 서치어드바이저와 사이트맵 제출은 in C 자체 사이트 운영의 기본 체크리스트로
  편입한다.

### 3. Instagram/YouTube/Velog는 원본 저장소가 아니라 유통 표면이다

대화에서 정리한 역할은 다음과 같다.

- in C Columns: 원본/세계관/공용어
- Instagram: 한 문장, 한 주장, 한 질문을 카드나 짧은 영상으로 유통
- YouTube: Columns의 실전편, 실제 곡과 공연에 적용
- Velog: 기존 계정의 유통 mirror, 요약과 원문 링크 중심
- Naver Blog: 필요 확인 후 추가하는 검색 실험 채널

전략 반영:

- `Foundation -> 실제 작품 -> 실제 공연 -> Community` 흐름을 in C 안에서 연결한다.
- Columns는 별도 브랜드나 별도 사이트로 분리하지 않는다.
- 앱 배너는 이 루프의 입구 역할만 한다.

## in C Click에 반영할 기본 전략

`in C - Click`은 완성형 메트로놈 브랜드라기보다, in C가 음악가의 반복 문제를 실제로
해결할 수 있는지 확인하는 첫 도구다.

운영 원칙:

- 앱 자체의 효용이 먼저다.
- 광고, 로그인, 결제, 서버 저장은 첫 MVP에서 제외한다.
- in C 배너는 작고 자연스럽게 둔다.
- 앱 내부 피드백은 “서비스 제안”보다 “이 앱에 필요한 기능 제안”으로 표현한다.
- 공연 정보는 앱 사용자에게 푸시하지 않는다. 앱은 팬 기반과 허락된 반복 접점을 만드는
  표면으로 둔다.
- 성과가 있으면 다음 도구로 확장하고, 반응이 약하면 빠르게 중단한다.

확인할 지표:

- 설치/실행
- 반복 사용
- BPM/박자/첫 박 강조 사용 패턴
- 상단 기능 제안 배너 클릭
- 실제 기능 제안 제출

## 다음 작업 후보

- in C 사이트의 Columns canonical/OG/sitemap 정책 점검
- 앱 상단 배너 클릭 이벤트 정의
- 기능 제안 링크의 UTM 또는 event payload 정의
- `in C - Click` 스토어 설명에서 앱/서비스/도구 표현 정리
- Velog mirror 운영 원칙 문서화

## 참고 출처

- Google Search Central: canonical URL과 중복 URL 통합
  - https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
  - https://developers.google.com/search/docs/crawling-indexing/canonicalization
- Naver Search Advisor: 단일 URL, canonical, 제목/설명문, 웹마스터 도구
  - https://searchadvisor.naver.com/guide/seo-basic-create
  - https://searchadvisor.naver.com/guide/markup-content
  - https://searchadvisor.naver.com/guide/content-basic
  - https://searchadvisor.naver.com/start

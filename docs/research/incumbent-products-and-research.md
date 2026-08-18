# 업계 강자와 선행 시도 리서치

작성일: 2026-08-18

## 목적

이 문서는 in C가 검증하려는 `Distribution Gap`, `zero-decision distribution`,
`relevant reach`, `공연 발견`, `관객 개발` 가설을 이미 시도한 제품과 연구를 정리한다.

핵심 질문은 다음이다.

```text
이미 강자들이 가진 자산으로도 왜 이 문제가 완전히 풀리지 않았는가?
```

## 결론

강자들은 이미 각자의 층에서 꽤 강하다.

- KOPIS는 공연 정보와 통계의 공적 원천이다.
- 대형 티켓 플랫폼은 예매, 결제, 좌석, 검색, 랭킹을 장악한다.
- Club Balcony, Bachtrack, Operabase는 클래식 전문 발견과 신뢰를 다룬다.
- Eventbrite Boost, Meta, 당근, 네이버, 카카오는 간편 홍보와 지역/관심 타게팅을 제공한다.
- Tessitura, Spektrix, The Audience Agency, MHM은 기관 관객 데이터와 세그먼트를 다룬다.

따라서 in C가 정면으로 만들면 안 되는 것은 `일반 티켓팅`, `대형 공연 검색`,
`기관용 CRM`, `범용 광고관리자`다.

남는 빈칸은 다음에 가깝다.

```text
한국의 학생/소규모 클래식 활동 주최자가 복잡한 광고관리자나 대형 예매 플랫폼을 쓰지 않고,
이미 클래식에 관심이 있는 relevant audience에게 작고 신뢰 가능하게 노출되는 self-serve 흐름
```

다만 이 빈칸은 공개 자료로 확정할 수 없다. 강자가 안 풀었다는 사실은 기회일 수도 있지만,
시장성이 작거나 운영비가 맞지 않기 때문일 수도 있다.

## 먼저 버려야 할 문제를 찾는다

업계 강자 리서치의 목적은 `우리가 이길 수 있는 틈`을 억지로 찾는 것이 아니다.
먼저 이미 충분히 해결된 문제를 골라내는 것이다.

다음 조건을 만족하면 in C가 굳이 풀 필요 없는 문제로 본다.

- 고객이 이미 쓰는 대안이 있고, 불만이 약하다.
- 대안 사용 과정이 충분히 쉽고, 고객이 추가 단순화를 위해 돈을 낼 이유가 약하다.
- 대안의 결과 지표가 충분히 명확하고 신뢰된다.
- in C가 더 잘하려면 데이터, 예산, 영업망, 브랜드 신뢰 중 강자가 가진 자산이 필요하다.
- 작은 세그먼트에서만 불편이 보이지만, 반복 구매나 확장 가능성이 약하다.

반대로 다음 조건이 반복되면 아직 풀리지 않은 문제일 수 있다.

- 고객이 대안을 알지만 쓰지 않는다.
- 쓰지 않는 이유가 가격보다 `귀찮음`, `결정 피로`, `효과 불신`, `내 공연과 안 맞음`이다.
- 대안은 노출을 제공하지만, 고객은 `누구에게 닿았는지` 이해하지 못한다.
- 대안은 대형 공연/기관에는 맞지만 학생 공연, 소규모 리사이틀, 무료 공연에는 과하다.
- 고객이 직접 광고를 집행하는 대신 작은 금액으로 맡기고 싶어 한다.

따라서 다음 리서치는 `기회 증명`보다 `제외 증명`을 먼저 한다.

```text
이미 해결됐다면 버린다.
해결됐는데 고객이 못 쓰고 있다면 왜 못 쓰는지 본다.
해결되지 않은 작은 반복 문제가 남아 있을 때만 in C 가설로 올린다.
```

## 강자 맵

| 층 | 대표 플레이어 | 이미 푸는 문제 | 강한 자산 | in C에 주는 의미 |
| --- | --- | --- | --- | --- |
| 공적 데이터 | KOPIS | 공연 DB, 예매/매출 통계, 공연시설/기획제작사 DB, OpenAPI | 법/제도 기반 데이터 수집, 공신력, API | 공연 원천 데이터는 직접 만들기보다 활용 후보로 본다. 단, 자체발권/무료/학교/교회/동호회 long-tail은 별도 확인이 필요하다. |
| 대형 예매 | NOL 티켓, YES24 티켓, 티켓링크, 멜론티켓, SAC 등 | 예매, 결제, 좌석, 환불, 랭킹, 상세페이지 | 구매 직전 트래픽, 결제 인프라, 공연장/기획사 관계 | in C는 예매 플랫폼이 아니라 예매 전 discovery/맥락/홍보 보조로 둔다. |
| 클래식 전문 멤버십/기획 | Club Balcony/Credia 등 | 클래식 애호가 대상 정보, 예매 혜택, 멤버십, 기획공연 | 충성도 높은 회원, 브랜드 신뢰, 기획 역량 | 고관여 클래식 팬 대상 모델의 국내 선행 사례다. 소규모 공연 self-serve distribution과는 다르다. |
| 클래식 전문 발견/미디어 | Bachtrack | 클래식/오페라/무용 공연 검색, 리뷰, 프리뷰, 광고/스폰서십 | 구조화된 listing, 편집 품질, SEO, 글로벌 독자 | `공연 발견 + 전문 편집 + 광고 BM`이 성립할 수 있다는 강한 선행 사례다. 다만 self-posting이 아니라 편집 운영이 핵심이다. |
| 공연예술 전문 DB/산업 | Operabase | 공연/아티스트/단체 DB, 캐스팅, visibility report, ticket link | 글로벌 공연 데이터, 전문가 네트워크, 프로필/가시성 지표 | `visibility report`와 `search appearance`는 in C 깃발 리포트의 직접 참고 대상이다. |
| 기관용 CRM/티켓팅 | Tessitura, Spektrix | 티켓팅, CRM, 멤버십, 기부, 세그먼트, 캠페인 자동화 | 기존 관객 데이터, 기관 업무흐름, 리포팅 | 대형 기관의 retained audience 운영 문제를 푼다. in C가 초기부터 갈 곳은 아니다. |
| 관객 세그먼트/리서치 | The Audience Agency, Audience Spectrum, MHM Culture Segments | 관객 조사, 세그먼트, 지역 시장/잠재시장 분석 | 설문/티켓 데이터, 문화소비 세그먼트 체계 | in C의 타게팅은 나이/지역만이 아니라 문화자본, 정보소비, 동기 기반으로 진화해야 한다. |
| 범용 이벤트 플랫폼 | Eventbrite | 이벤트 생성, 티켓팅, 이메일, 소셜 광고, 마켓플레이스 노출 | 이벤트 공급자 네트워크, 구매자 트래픽, 마케팅 툴 | `등록 즉시 홍보 도구`의 좋은 레퍼런스다. 단 한국 클래식 long-tail과 직접 같지는 않다. |
| 범용 광고 플랫폼 | Meta Boost, 당근 광고, 네이버 지역소상공인/플레이스광고, 카카오 채널 메시지 | 쉬운 지역/관심/팔로워 홍보, 예산 설정, 성과 지표 | 압도적 audience, 광고 기술, 지역/관심 데이터 | in C의 경쟁자는 이들보다 싼 광고가 아니라, 클래식 맥락을 이해한 더 작은 결정 단위여야 한다. |
| 취향/문화생활 커뮤니티 | 문토, 캔고루, 타임티켓 등 | 취향 모임, 전시/공연 정보, 할인/사전등록, 푸시 | 넓은 문화생활 audience, 할인/모임 경험 | 라이트 문화생활 discovery의 선행 사례다. 클래식 전문성과 공급자 홍보 리포트는 별도다. |

## 가설별 선행 시도

### 1. 공연 발견 문제

이미 시도한 제품:

- Bachtrack: 클래식 공연/오페라/무용의 구조화 검색과 리뷰.
- Operabase: 공연, 아티스트, 단체, 작품, 티켓 링크 검색.
- KOPIS/PlayDB/대형 예매처: 국내 공연 정보 검색과 랭킹.
- Club Balcony: 클래식 애호가 대상 공연 정보와 예매 혜택.

시사점:

- `공연 정보가 흩어져 있다`는 문제는 이미 여러 층에서 풀고 있다.
- in C가 단순 공연 목록 앱이면 강자와 충돌한다.
- 남는 질문은 `학생/소규모/무료/자체발권 공연까지 relevant audience에게 닿는가`다.

직접 확인할 것:

- 최근 30개 소규모 클래식 공연이 KOPIS, PlayDB, Club Balcony, 예매처, 공연장 사이트,
  Instagram 중 어디에 노출되는지 표본 조사한다.
- 공연자가 직접 수정/등록/홍보 성과 확인을 할 수 있는지 확인한다.

### 2. 간편 홍보와 zero-decision distribution

이미 시도한 제품:

- Eventbrite Boost: 이벤트 생성 후 이메일, 소셜 광고, 마켓플레이스 광고를 같은 대시보드에서 실행.
- Meta Boost: 게시물을 간단히 홍보하고 예산/대상/성과를 확인.
- 당근 광고: 지역을 직접 선택하거나 주변 범위를 추천받아 동네 광고 집행.
- 네이버 플레이스/지역소상공인 광고: 지역 기반 검색/콘텐츠 노출.
- 카카오톡 채널 메시지: 채널 친구에게 메시지형 광고 발송.

시사점:

- `홍보를 쉽게 만든다`는 문제는 범용 광고 플랫폼이 이미 상당히 잘 푼다.
- 그러나 범용 플랫폼은 클래식 공연의 작품 맥락, 관객 관심도, 소규모 공연자의 심리적 부담,
  결과 리포트 언어를 기본적으로 이해하지 않는다.
- in C의 차별점 후보는 광고 설정 UI가 아니라 `클래식 공연 등록 -> 관련 관객에게 신뢰 가능한 작은 노출 -> 이해 가능한 리포트`다.

직접 확인할 것:

- 소규모 공연자에게 Meta/당근/네이버 광고를 써본 적이 있는지 묻는다.
- 안 썼다면 이유가 비용인지, 방법을 몰라서인지, 귀찮아서인지, 효과를 믿지 않아서인지 분리한다.
- 기존 광고관리자를 보여주고 `직접 할 수 있음 / 누가 해주면 좋음 / 안 하고 싶음`을 나눈다.

### 3. relevant audience와 관객 개발

이미 시도한 제품/연구:

- Tessitura/Spektrix: 티켓 구매, 멤버십, 기부, 교육, 캠페인 데이터를 한 CRM에서 묶어 세그먼트와 자동화를 제공.
- The Audience Agency/Audience Spectrum: 문화 소비와 지역 기반 세그먼트.
- MHM Culture Segments/Audience Atlas: 문화예술 장르별 현재/이탈/잠재 시장과 심리 기반 세그먼트.
- 공연예술 소비 연구: 문화자본, 경제자본, 사회자본, 정보자본이 공연예술 소비에 영향을 준다는 관점.

시사점:

- 성숙한 기관 시장에서는 `관객 데이터 -> 세그먼트 -> 캠페인`이 이미 정석이다.
- in C가 초기부터 CRM을 만들면 너무 무겁다.
- 초기에는 세그먼트 모델보다 `작품/악기/지역/관심/전공 여부` 같은 손으로 설명 가능한 타게팅부터 검증한다.

직접 확인할 것:

- audience segment를 자동화하기 전에 수동으로 3개 그룹만 만든다.
- 예: 피아노 전공/취미 피아노/근처 문화생활 관심자.
- 같은 공연을 세 그룹에 보여주고 클릭, 저장, 공유, 문의 차이를 본다.

### 4. 클래식 앱과 audience engagement

선행 연구:

- 영국 심포니 오케스트라의 social-media-enabled app 사례 연구는 클래식 앱이 관객 engagement와 audience development를 어디까지 도울 수 있는지 보되, 기술결정론을 경계한다.
- 젊은 관객 대상 클래식 공연 앱 연구는 앱이 입문 경험에 도움을 줄 수 있지만, 공연장 안에서의 사용은 부적절하게 여겨질 수 있고 더 나은 대안도 있다고 본다.
- 최근 systematic review는 젊은 관객에게 디지털 마케팅, 소셜 미디어, 숏폼, 상호작용, 접근성, 사회적 관련성이 중요해졌다고 본다.

시사점:

- 앱 자체가 audience development를 자동으로 해결하지 않는다.
- in C가 앱을 만들더라도 핵심은 `기술`이 아니라 `작품/공연이 사람에게 자기 일처럼 느껴지는 개입`이다.
- 유틸 앱은 audience development 제품이라기보다 반복 접점과 허락된 관계를 만드는 distribution technology로 둔 기존 판단이 유지된다.

직접 확인할 것:

- 앱 설치 수가 아니라 in C 맥락 노출 후 실제 공연/작품 행동이 생기는지 본다.
- 앱 안에서 공연 푸시를 바로 넣기보다 기능 제안, Columns, 작품 프리뷰로 낮은 마찰의 연결을 먼저 본다.

## in C가 피해야 할 정면승부

- KOPIS 대체 공연 DB 만들기.
- NOL/YES24/티켓링크와 같은 예매 인프라 만들기.
- Bachtrack처럼 대규모 편집 미디어를 처음부터 운영하기.
- Tessitura/Spektrix 같은 기관용 CRM 만들기.
- Meta/네이버/당근보다 더 좋은 범용 광고관리자 만들기.

## in C가 파고들 수 있는 빈칸

1. 소규모 클래식 공급자용 self-serve promotion
2. 복잡한 광고관리자 없는 `zero-decision distribution`
3. 관객 보장이 아니라 `relevant reach`와 이해 가능한 반응 리포트
4. 공연 정보가 아니라 작품/사람/지역/관심 맥락이 붙은 노출
5. 대형 예매처에 올라가기 전 또는 올라간 뒤에도 발견되지 않는 long-tail 공연
6. 음악가가 홍보 판단을 덜고 작품/교육/연주 준비에 집중하는 경험

## 다음 경쟁 리서치 설계

### P0: 국내 강자 표본 30건

최근 30개 클래식 공연을 뽑아 다음을 확인한다.

| 공연 | 규모 | 예매처 | KOPIS | PlayDB | Club Balcony | 공연장 | SNS | 검색 노출 | 직접 홍보 흔적 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |

목적은 시장 대표성을 입증하는 것이 아니라, 소규모 공연이 어느 층에서 빠지는지 찾는 것이다.

### P0: 공연자 광고 사용 경험

공연자 5명에게 묻는다.

- 최근 공연에서 유료 광고를 썼는가?
- Meta, 당근, 네이버, 카카오, 예매처 광고 중 무엇을 고려했는가?
- 고려하지 않았다면 왜인가?
- 광고 세팅을 직접 할 수 있다고 느꼈는가?
- 누군가 1만-10만원 범위에서 대신 해주고 결과를 정리해준다면 맡길 의향이 있는가?

### P1: 강자 제품 사용 플로우 캡처

다음 제품의 공급자 관점 플로우를 캡처한다.

- Eventbrite event creation -> marketing tools
- Meta boost post
- 당근 피드광고 만들기
- 네이버 플레이스/지역소상공인 광고
- KOPIS 공연 검색/API
- Bachtrack listing/business model
- Operabase profile/visibility report

각 플로우마다 기록한다.

- 공급자가 해야 하는 결정 수
- 필요한 자료
- 최소 비용
- 리포트 지표
- 클래식/소규모 공연 맥락 지원 여부

## 출처

- 예술경영지원센터, [공연예술통합전산망](https://www.gokams.or.kr/12_policy/policy01.aspx).
- KOPIS, [KOPIS 소개](https://kopis.or.kr/mob/cs/csInfo.do).
- 공공데이터포털, [예술경영지원센터 공연예술통합전산망 공연목록 OpenAPI](https://www.data.go.kr/data/15097805/openapi.do).
- NOL Universe, [인터파크 티켓의 NOL 티켓 개편 보도자료](https://nol-universe.com/newsroom/pressRelease/detail?prNo=2315), 2025-03-07.
- Club Balcony 기업정보, [Arts & Culture Membership service 소개](https://www.incruit.com/company/1684075332/).
- Bachtrack, [About us](https://bachtrack.com/about-us), 2024-11-19.
- Bachtrack, [About our business model](https://bachtrack.com/de_DE/about-our-business-model), 2024-11-15.
- Operabase Help Center, [Organisation FAQs](https://help.operabase.com/knowledge/en/general-faqs-1).
- Operabase Help Center, [Visibility Report](https://help.operabase.com/knowledge/en/visibility-report).
- Eventbrite, [Event marketing tools built for organizers](https://www.eventbrite.com/organizer/features/event-marketing-platform/).
- Eventbrite Help Center, [Promote your event](https://www.eventbrite.com/help/en-us/articles/577412/).
- Meta for Business, [Boost a Facebook post](https://www.facebook.com/business/pages/boost-post).
- 당근비즈니스 가이드, [피드광고 만들기](https://businessdaangn.gitbook.io/business.daangn/ads-lite/create/native).
- 네이버, [광고 서비스 소개](https://www.navercorp.com/service/advertisement).
- 카카오비즈니스 가이드, [메시지 만들기](https://kakaobusiness.gitbook.io/main/ad/moment/messagead/channelmessage/new).
- Tessitura, [About us](https://www.tessitura.com/about).
- Spektrix, [CRM for arts organizations](https://www.spektrix.com/en-us/platform-crm/).
- The Audience Agency, [Audience Spectrum Now Digs Deeper](https://theaudienceagency.org/en/news/audience-spectrum-now-digs-deeper), 2022-04-21.
- Morris Hargreaves McIntyre, [Audience Atlas](https://www.mhminsight.com/en_us/engaging-new-audiences/audience-atlas/).
- 남정미·유소이, [공연장 및 예술단체에서 제공하는 SNS 품질특성이 고객만족, 구전의도 및 구매의도에 미치는 영향](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001801900), 예술경영연구, 2013.
- 김지후·이해민·진현정, [공연예술 소비에 문화, 경제, 사회, 정보자본이 미치는 영향 분석](https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003009397), 한국콘텐츠학회 논문지, 2023.
- Crawford et al., [Is there an app for that?](https://www.tandfonline.com/doi/abs/10.1080/1369118X.2013.877953), Information, Communication & Society, 2014.
- Merino Ruiz, [Classical music and audience development](https://thesis.eur.nl/pub/55489), Erasmus University Thesis Repository, 2020.

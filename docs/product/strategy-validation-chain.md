# in C 전략 가설과 Validation Chain

작성일: 2026-08-18

## 목적

이 문서는 GPT 대화 아카이브에서 나온 in C의 사업 가설, Cold Start, 깃발 BM,
PMF 신호, Distribution Gap 검증 순서를 실행 판단에 쓸 수 있게 압축한 정리다.

첨부 대화는 참고 자료로만 사용한다. 문서 안의 수치와 외부 사례는 별도 출처 확인 전까지
확정 사실이 아니라 working hypothesis 또는 검증 후보로 다룬다.

## 현재 전략 요약

in C는 단순 공연 정보 집약 앱도, 원치 않는 광고 노출 플랫폼도 아니다. 현재 방향은
다음 네 가지를 함께 검증하는 것이다.

1. 클래식을 재미있고 부담 없이 접하게 만든다.
2. 이미 음악/클래식에 관심 있는 사람과 반복 접점을 만든다.
3. 관련 공연, 콩쿠르, 마스터클래스, 레슨/클래스 등을 자연스럽게 발견시킨다.
4. 공급자가 기존 관계망 밖의 relevant audience에 쉽게 도달하게 한다.

노출 정책의 핵심 원칙은 돈을 많이 냈다고 같은 사람에게 더 자주 밀어붙이지 않는 것이다.
유료 노출은 사용자 신뢰를 훼손하지 않는 별도 슬롯과 명확한 표시 안에서 다룬다.

## Customer Vision과 Our Vision

Customer Vision v0:

```text
클래식 관련 정보와 홍보를 일일이 신경 쓰지 않아도 필요한 것은 놓치지 않고 쉽게
처리되어, 작품과 배움에 집중할 수 있다.
```

Our Vision v0:

```text
클래식에 관심 있는 사람과 클래식 활동이 자연스럽게 발견되고 연결되는 생태계를 만든다.
```

두 비전은 겹치지만 같지 않다. 고객은 "나를 귀찮게 하지 말고 음악에 집중하게 해줘"에
가깝고, in C는 "클래식 생태계의 발견과 연결 구조를 더 잘 만들자"에 가깝다.

따라서 핵심 질문은 다음이다.

```text
Our Vision을 실현하면 Customer Vision도 실현되는가?
```

현재 답은 대체로 그렇지만 역은 아니다. Customer Vision을 달성하기 위해 반드시
Community, Utility, Chromatics, YouTube가 필요한 것은 아니다. 이들은 고객 비전을
전달하기 위해 현재 선택한 방법이다.

## Distribution Gap 가설

핵심 가설:

```text
한국 클래식 시장은 공연정보가 부족해서 연결되지 않는 것이 아니라, 공급자가 이미
대량의 홍보정보를 생산하고 있음에도 그것이 기존 관계망과 각 채널에 흩어진 채
잠재적 관심자에게 효율적으로 전달되지 않는 distribution problem을 가지고 있다.
```

기존 채널의 한계 후보:

| 채널 | 역할 | 한계 후보 |
| --- | --- | --- |
| Instagram/Facebook | 빠른 게시와 팔로워 홍보 | 팔로워와 알고리즘 의존 |
| 카톡/지인 | 강한 관계망 도달 | 기존 관계망 밖으로 나가기 어려움 |
| 포스터/전단/현수막 | 오프라인 노출 | 비용, 타게팅, 측정 한계 |
| 커뮤니티/카페/게시판 | 관심자 밀집 가능성 | 안정적인 self-service distribution 권한은 아님 |
| 예매사이트/공연장 | 구매 직전 discovery | long-tail 공급자가 직접 제어하기 어려움 |

빈칸은 `relevant audience가 존재하는 곳`과 `누구나 자기 활동을 쉽게 알릴 수 있는 곳`이
분리되어 있을 가능성이다.

2026-08-18 1차 선행증거 검토에서는 공연 공급, 관람 수요, 비용/시간/정보 장벽,
공연 선택에서 정보/마케팅 요인의 중요성은 공개 통계와 연구로 일부 보강됐다. 다만
`기존 관계망 밖 relevant audience에 충분히 닿지 못한다`와 `공급자가 reach 확장에
돈을 낸다`는 여전히 직접 검증이 필요하다.

## Cold Start 우회 전략

in C의 Cold Start는 하나의 채널이 반드시 성공해야 하는 구조가 아니라, 가장 싸게 반복
접촉 가능한 relevant audience를 만드는 채널을 찾는 실험이다.

| 채널 | 역할 | 성공 신호 |
| --- | --- | --- |
| YouTube / Columns | 라이트·잠재 클래식 관심자와 콘텐츠 관계 형성 | 반복 조회, 저장, 공유, 공식 링크 클릭 |
| 무료 Utility apps | Store organic acquisition으로 음악 관련 사용자를 확보 | 설치, 반복 실행, in C 연결 클릭 |
| Chromatics | 적극적인 음악가와 반복 사용 접점 확보 | 악보 생성, 저장, 재사용, 피드백 |

셋 모두 성공할 필요는 없다. 특정 채널이 relevant audience를 낮은 비용으로 모으지
못하면 다른 채널로 대체한다.

## 깃발 BM 가설

깃발 BM은 관객 보장 상품이 아니라 relevant reach 확장 상품이다.

- 기본 지역/기본 노출은 무료로 둔다.
- 공급자가 더 넓은 지역이나 더 관련 있는 관심층에 도달하고 싶을 때 깃발을 구매한다.
- 공연뿐 아니라 콩쿠르, 마스터클래스, 오디션, 캠프, 레슨/클래스 등으로 확장 가능하다.
- in C가 직접 책임질 수 있는 지표는 실제 노출, 클릭, 저장, 공유, 문의 같은 반응이다.
- 관객 증가와 예매 증가는 강한 성공 증거지만, 첫 판매물이 반드시 보장해야 할 결과는 아니다.

가격은 고정 숫자가 아니라 검증 도구다. 무료, 1천원대, 1만원 안팎, 수만원, 10만원 이상
구간에서 어떤 고객이 어떤 범위와 결과 기록에 돈을 내는지 확인한다.

## 부트스트랩 운영 기준

외부 투자 유치보다 지속 가능한 1인/소규모 운영을 우선한다.

- 낮은 운영비
- organic distribution
- 계속 하고 싶은 사업
- 흑자 가능성
- 참여자 모두에게 이익이 되는 BM

재료비가 낮은 IT 서비스라면 연매출 1-2억원도 1인 기업으로 충분히 의미 있는 규모로
본다. 추가 BM은 억지로 미리 만들지 않고, 반복 사용과 지불의사가 확인된 뒤 도입한다.

## Utility Optionality

무료 유틸 앱은 in C에 과도하게 종속시키지 않고 optionality를 유지한다.

```text
Build -> Grow -> Test relevance -> Hold / Sell / Kill
```

| 앱 성과 | in C 적합도 | 판단 |
| --- | --- | --- |
| 높음 | 높음 | Hold, distribution 자산 |
| 높음 | 낮음 | Sell, 매각 후보 |
| 낮음 | 높음 | 개선 또는 니치 검토 |
| 낮음 | 낮음 | Kill |

Utility는 고객 비전 자체가 아니라 distribution technology다. 실패하더라도 Customer
Vision은 유지하고 다른 접점을 찾는다.

## PMF 신호

현재 in C는 pre-PMF다. PMF는 트래픽이나 기능 수가 아니라 반복 행동으로 판단한다.

강한 신호 후보:

- 사용자가 relevant한 클래식 활동을 반복 발견한다.
- 공급자가 다음 활동도 반복 등록한다.
- 깃발을 반복 구매한다.

결제 해석:

```text
첫 결제 = WTP
두 번째 결제 = Value
반복 결제 = 강한 PMF 신호
```

실제 관객 증가 자체는 필수조건이 아니라 강한 outcome으로 둔다.

## Validation Chain

현재 검증 체인은 다음 순서다.

```text
Problem -> Audience -> Distribution -> Payment
```

| 단계 | 질문 | 직접 검증 방법 |
| --- | --- | --- |
| Problem | 공급자와 잠재관객 사이에 실제 distribution gap이 있는가? | 공연자 인터뷰, 기존 홍보 reach 관찰, missed discovery 질문 |
| Audience | 콘텐츠/무료도구로 relevant audience를 저비용 확보할 수 있는가? | YouTube, Columns, Utility, Chromatics 데이터 |
| Distribution | 확보 audience에게 relevant한 클래식 활동을 보여주면 meaningful response가 생기는가? | 수동 노출, 클릭/저장/공유/문의 기록 |
| Payment | 공급자가 그 reach 확장에 실제 돈을 내는가? | 무료 PoC 후 유료 재구매 제안, 깃발 결제 실험 |

## 이미 선행증거가 있는 것과 직접 검증할 것

선행증거가 어느 정도 있는 항목:

- KOPIS 기준 2025년 전체 공연시장은 공연건수 23,608건, 티켓예매수 24,777,471매,
  티켓판매액 약 1.73조 원 규모다.
- 보도 기준 2025년 서양음악(클래식)은 공연건수 8,378건, 공연회차 10,813회,
  티켓예매수 약 333만 매, 티켓판매액 약 836억 원으로 집계됐다.
- 문화예술 관람에서 비용, 시간, 정보 부족은 실제 장벽으로 관찰된다.
- 클래식 공연 선택요인 연구에서는 정보적 요인과 마케팅 요인이 구매의사에 영향을
  줄 수 있는 요인으로 다뤄졌다.
- 공연장/예술단체 SNS 연구에서는 정보품질이 고객만족, 구전의도, 구매의도와 연결되는
  보조 근거가 확인됐다.
- 공급자는 실제로 공연 홍보를 한다는 행동 증거를 공개 SNS 표본에서 관찰할 수 있다.

직접 검증 가치가 높은 항목:

1. Latent audience: 평소 찾지 않지만 relevant한 공연을 접하면 관심을 보이는가?
2. Distribution gap: 공급자가 기존 관계망 밖 relevant audience에 충분히 닿지 못하는가?
3. Audience creation: YouTube, Utility, Chromatics로 relevant audience를 실제 확보할 수 있는가?
4. Distribution conversion: 확보 audience가 공연, 콩쿠르, 마스터클래스에 meaningful response를 보이는가?
5. Monetization: 공급자가 reach 확장에 실제 돈을 내는가?

## 검증 아이디어

### 관객 missed discovery

질문:

```text
최근 1년 동안 공연이 끝난 뒤에야 알게 되어 "미리 알았으면 가봤을 텐데"라고 생각한
클래식 공연이 있었나요?
```

또는 최근 종료된 실제 공연 포스터 4개를 보여준다.

- 무료 피아노 독주회
- 1만원 실내악
- 무료 대학 연주회
- 2만원 오케스트라

각 공연마다 확인한다.

- 공연 존재를 알고 있었는가?
- 몰랐다면 공연 전에 우연히 봤을 경우 어떤 반응이었을까?
- 실제 관람을 꽤 고려 / 관심은 생김 / 자세히 봤을 것 / 별 관심 없음 / 전혀 관심 없음

### 공급자 reach

가능하면 실제 공연 홍보 Instagram Insights를 확인한다.

- follower reach
- total reach
- non-follower reach
- 저장, 공유, 프로필 방문, 링크 클릭

여러 음악가에서 기존 follower 중심 reach가 반복되는지 확인한다.

## Build 전 질문

새 아이디어는 바로 만들지 않고 다음 질문을 먼저 통과한다.

1. 이게 사실이라는 기존 증거가 이미 있는가?
2. 사람들이 실제로 그렇게 행동하는 것을 관찰할 수 있는가?
3. 제품 없이 이 가설만 따로 검증할 수 있는가?
4. 수동으로 흉내 낼 수 있는가?
5. 어떤 결과가 나오면 이 가설을 버릴 것인가?

지향 순서:

```text
가설 -> 기존 증거 확인 -> 실제 행동 관찰 -> 제품 없는 검증 -> 수동 concierge -> 그래도 모르겠으면 Build
```

## 다음 액션 후보

1. 기존 공개조사/학술자료를 `이미 검증 / 부분 검증 / 직접 검증 필요`로 분류한다.
2. 디시인사이드 등 공개 커뮤니티에서 latent demand와 missed discovery를 작게 관찰한다.
3. 메트로놈, YouTube, Columns, Chromatics 실제 audience 데이터를 축적한다.
4. 실제 공연 하나를 수동으로 relevant audience에 노출한다.
5. 결과 리포트 후 다음 공연의 유료 제안 또는 깃발 결제를 검증한다.

## 관련 문서

- [in C 제품 포지셔닝](positioning.md)
- [Q3 공연홍보 Concierge MVP](promotion/q3-concierge-mvp.md)
- [공연홍보 캠페인 기록과 결과 리포트 템플릿](promotion/campaign-record-report-template.md)
- [Distribution Gap 선행증거와 직접 검증 항목](../research/distribution-gap-evidence.md)
- [Concert Promotion Market Research](../research/concert-promotion-market.md)
- [음악 유틸앱 실험 방향성](util-app-experiment-plan.md)
- [in C 식 클래식 애자일](classical-agile.md)

# 검증 데이터 코딩 가이드

작성일: 2026-08-19

## 목적

이 문서는 인터뷰와 수동 매칭 결과를 일관된 값으로 기록하기 위한 가이드다. 자유서술은
`notes`에 남기되, 최종 집계에 쓰는 칸은 아래 값을 우선 사용한다.

## 공통 값

| 값 | 의미 |
| --- | --- |
| `yes` | 명확한 긍정 |
| `conditional` | 조건부 긍정 또는 애매한 긍정 |
| `no` | 명확한 부정 |
| `unknown` | 확인하지 못함 |
| `not_asked` | 질문하지 않음 |

## 공급자 값

`would_register_again`:

- `yes`: 같은 공간이나 방식이 있으면 다시 올리겠다고 말함
- `conditional`: 가격, 공개 범위, 신뢰, 결과 조건이 맞으면 가능하다고 말함
- `no`: 다시 올릴 이유가 약하다고 말함

`wtp_range`:

- `0`
- `under_10000`
- `10000_30000`
- `30000_50000`
- `50000_100000`
- `over_100000`
- `unknown`

`skip_reason`은 복수 값을 세미콜론으로 연결한다.

- `time`
- `cost`
- `dont_know_how`
- `low_trust`
- `annoying`
- `awkward`
- `not_needed`
- `other`

## 수요자 값

`push_acceptance`:

- `yes`: 핏이 맞으면 푸시/DM을 받아도 된다고 말함
- `conditional`: 빈도, 채널, 정보 유형 조건이 필요함
- `no`: 맞아도 알림은 싫다고 말함

`info_itself_useful`:

- `yes`: 실제 참여 여부와 별개로 정보 자체가 유용하다고 말함
- `conditional`: 특정 유형이나 빈도에서만 유용하다고 말함
- `no`: 갈 마음이 없으면 정보도 유용하지 않다고 말함

`likely_action`은 복수 값을 세미콜론으로 연결한다.

- `click`
- `save`
- `share`
- `inquire`
- `attend`
- `ignore`
- `unknown`

## 공급 정보 값

`type`:

- `concert`
- `lesson`
- `recruiting`
- `competition`
- `masterclass`
- `audition`
- `notice`

`public_scope`:

- `public`: 누구에게 보내도 되는 공개 정보
- `semi_private`: 조건이 맞는 사람에게만 공유해야 하는 정보
- `private`: 이번 실험에서 발송하지 않음

`level`은 복수 값을 세미콜론으로 연결할 수 있다.

- `beginner`
- `hobby`
- `student`
- `major`
- `professional`

## 채널 관찰 값

`channel-audit.csv`는 공개적으로 확인 가능한 표본만 기록한다. 계정 주인의 비공개 지표,
닫힌 카톡방, 비공개 커뮤니티 원문은 기록하지 않는다.

채널별 `*_found`:

- `yes`: 해당 채널에서 확인됨
- `no`: 검색했지만 확인되지 않음
- `unknown`: 확인하지 못함
- `not_applicable`: 해당 유형에 맞지 않음

`scale`:

- `student`
- `small`
- `mid`
- `large`
- `unknown`

`self_service_path_found`:

- `yes`: 공급자가 직접 등록/수정/홍보할 수 있는 경로가 명확함
- `conditional`: 가능해 보이나 승인, 기관 관계, 비용, 절차가 필요함
- `no`: 공급자 직접 등록/성과 확인 경로를 찾기 어려움
- `unknown`: 확인하지 못함

`result_metrics_available`:

- `yes`: 노출, 클릭, 저장, 공유, 문의 같은 결과 지표를 공급자가 확인할 수 있음
- `conditional`: 일부 채널 안에서는 보이나 공연/레슨/구인 성과로 해석하기 어려움
- `no`: 공개 정보상 확인 어려움
- `unknown`: 확인하지 못함

`small_supplier_fit`:

- `yes`: 학생/소규모 공급자가 현실적으로 쓸 수 있어 보임
- `conditional`: 가능하지만 비용, 설정, 신뢰, 절차 부담이 있음
- `no`: 대형 기관/기획사에 더 맞아 보임
- `unknown`: 확인하지 못함

`observed_gap`:

- `yes`: 대체재가 있어도 relevant audience, self-serve, 측정, 소규모 적합성 중 빈칸이 관찰됨
- `partial`: 일부 빈칸이 있으나 대체재가 상당 부분 해결함
- `no`: 기존 대체재로 충분해 보임
- `unknown`: 판단 보류

## 발송 로그 값

`opened_or_replied`, `clicked`, `saved`, `shared`, `inquired`, `continue_request`:

- `yes`
- `no`
- `unknown`

`negative_reaction`:

- `none`: 부정 반응 없음
- `unclear`: 왜 보냈는지 모르겠다는 반응
- `too_many`: 빈도 부담
- `bad_fit`: 매칭이 틀림
- `privacy`: 공개/전달 방식 부담
- `annoying`: 알림 자체가 싫음

## 집계 규칙

긍정으로 세는 값:

- 공급자 등록 의향: `would_register_again`이 `yes` 또는 `conditional`
- 공급자 유료 의향: `wtp_range`가 `10000_30000`, `30000_50000`, `50000_100000`,
  `over_100000`
- 수요자 알림 유용성: `push_acceptance`가 `yes` 또는 `conditional`
- 지속 수신 허용: `keep_receiving_intent`가 `yes` 또는 `conditional`
- 대체재 빈칸 관찰: `observed_gap`이 `yes` 또는 `partial`
- 약한 행동: `clicked`, `saved`, `shared`, `inquired` 중 하나가 `yes`
- 강한 부정: `negative_reaction`이 `too_many`, `bad_fit`, `privacy`, `annoying`

주의:

- `conditional`은 긍정으로 세되, 최종 판단에서는 조건을 반드시 적는다.
- 예의상 한 말처럼 보이는 반응은 `yes`로 올리지 말고 `conditional` 또는 `unknown`으로 둔다.
- 수요자가 실제 공연에 가지 않아도 `save`, `share`, `click`, `continue_request`가 있으면
  알림 유용성의 약한 증거로 본다.

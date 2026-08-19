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
- 약한 행동: `clicked`, `saved`, `shared`, `inquired` 중 하나가 `yes`
- 강한 부정: `negative_reaction`이 `too_many`, `bad_fit`, `privacy`, `annoying`

주의:

- `conditional`은 긍정으로 세되, 최종 판단에서는 조건을 반드시 적는다.
- 예의상 한 말처럼 보이는 반응은 `yes`로 올리지 말고 `conditional` 또는 `unknown`으로 둔다.
- 수요자가 실제 공연에 가지 않아도 `save`, `share`, `click`, `continue_request`가 있으면
  알림 유용성의 약한 증거로 본다.

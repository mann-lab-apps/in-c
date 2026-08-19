# in C 서비스 구조 검증 운영 패킷

작성일: 2026-08-19

## 목적

이 폴더는 in C의 서비스 구조를 제품 없이 검증할 때 쓰는 기록 템플릿이다. 핵심은
인터뷰와 수동 매칭을 진행하면서 다음 질문에 답할 수 있는 증거를 남기는 것이다.

```text
공급자는 정보를 올릴 이유가 있고, 수요자는 정말 맞는 정보라면 알림 자체를 유용하게
느끼며, 공연/레슨/구인/공고가 같은 관심 그래프 위에서 흐를 수 있는가?
```

## 파일

| 파일 | 용도 |
| --- | --- |
| `supplier-interviews.csv` | 공급자 5명 인터뷰 요약 |
| `demand-interviews.csv` | 수요자 10명 인터뷰 요약 |
| `opportunity-inventory.csv` | 공연 3개, 레슨 3개, 구인 3개 공급 정보 목록 |
| `matching-participants.csv` | 수동 매칭 대상 15명의 관심 조건 |
| `dispatch-log.csv` | 2주 동안 보낸 정보와 반응 기록 |
| `final-judgement.md` | 1차 판단과 버릴 영역/남길 영역 정리 |

## 기록 원칙

- 실명, 연락처, 인스타그램 ID, 카카오톡 ID, 단체방 이름, 미공개 홍보비 원문은 이
  폴더에 기록하지 않는다.
- 원문 답변은 레포 밖에 보관하고, 이 폴더에는 익명 요약과 선택지만 남긴다.
- 사람은 `S-001`, `D-001`, `M-001`처럼 기록한다.
- 공급 정보는 `O-001`처럼 기록한다.
- 민감한 구인/레슨 정보는 제목을 일반화하고 공개 범위를 `semi_private`로 둔다.
- 빈칸은 억지로 추정하지 않고 `unknown` 또는 `not_asked`로 남긴다.

## 실행 순서

1. `supplier-interviews.csv`에 공급자 5명 인터뷰를 기록한다.
2. `demand-interviews.csv`에 수요자 10명 인터뷰를 기록한다.
3. `opportunity-inventory.csv`에 공급 정보 9개를 모은다.
4. `matching-participants.csv`에 수동 매칭 대상 15명의 조건을 기록한다.
5. 2주 동안 정말 맞는 정보만 보내고 `dispatch-log.csv`에 반응을 남긴다.
6. `final-judgement.md`에서 성공/실패 신호를 집계하고 네 가지 결론 중 하나를 고른다.

## 판정 요약

`final-judgement.md`의 결론은 아래 중 하나로만 둔다.

| 판단 | 기준 |
| --- | --- |
| 이미 해결됨 | 기존 인스타/당근/카톡방/예매처/커뮤니티로 충분함 |
| 문제는 있으나 플랫폼 구조 약함 | 불편은 있지만 공연/레슨/구인이 하나로 묶이지 않음 |
| 알림/매칭 구조 가능성 있음 | 핏 맞는 알림이 유용하고 공급자도 올릴 이유가 있음 |
| 플랫폼 가능성 강함 | 등록, 알림, 반응, 재등록/유료 의향이 함께 반복됨 |

## 관련 문서

- [in C 서비스 구조 수동 검증 워크북](../service-structure-validation-workbook.md)
- [다음 검증 계획](../next-validation-plan.md)
- [Distribution Gap 선행증거와 직접 검증 항목](../../../research/distribution-gap-evidence.md)
- [업계 강자와 선행 시도 리서치](../../../research/incumbent-products-and-research.md)

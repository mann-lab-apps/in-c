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
| `channel-audit.csv` | 공개 공연/레슨/구인 정보 30건의 대체재 노출 관찰 |
| `channel-audit-observations.md` | 공개 채널 관찰 결과 해석 메모 |
| `recruiting-tracker.csv` | 공급자/수요자 섭외 진행 상태 |
| `daily-runbook.md` | 2주 검증 일일 실행 체크리스트 |
| `opportunity-inventory.csv` | 공연 3개, 레슨 3개, 구인 3개 공급 정보 목록 |
| `matching-participants.csv` | 수동 매칭 대상 15명의 관심 조건 |
| `dispatch-log.csv` | 2주 동안 보낸 정보와 반응 기록 |
| `fieldwork-scripts.md` | 섭외 메시지, 인터뷰 진행, 후속 질문 스크립트 |
| `coding-guide.md` | CSV에 넣는 선택값과 집계 기준 |
| `scorecard.csv` | 성공/실패 신호를 숫자로 옮기는 집계표 |
| `current-validation-snapshot.md` | 현재까지 증명된 것과 사람 데이터가 필요한 항목 |
| `substitute-positioning.md` | 대체재 대비 버릴 영역과 남길 검증 영역 |
| `decision-matrix.md` | 인터뷰/수동 매칭 결과를 최종 판단으로 연결하는 기준 |
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
3. `channel-audit.csv`에 공개 표본 30건의 대체재 노출 상태를 기록한다.
4. `recruiting-tracker.csv`로 섭외 상태를 관리한다.
5. `opportunity-inventory.csv`에 공급 정보 9개를 모은다.
6. `matching-participants.csv`에 수동 매칭 대상 15명의 조건을 기록한다.
7. 섭외와 인터뷰 문구가 필요하면 `fieldwork-scripts.md`를 사용한다.
8. 매일 진행이 흐트러지면 `daily-runbook.md`를 보고 다음 행동을 고른다.
9. 2주 동안 정말 맞는 정보만 보내고 `dispatch-log.csv`에 반응을 남긴다.
10. `coding-guide.md` 기준으로 선택값을 정리한다.
11. `scorecard.csv`에 성공/실패 신호를 집계한다.
12. `decision-matrix.md` 기준으로 행동 증거와 의견 증거를 분리한다.
13. `final-judgement.md`에서 네 가지 결론 중 하나를 고른다.

## 집계 방식

CSV를 채운 뒤에는 `scorecard.csv`의 `actual`, `status`, `evidence_notes`를 채운다.
`status`는 `pass`, `weak`, `fail`, `unknown` 중 하나로 둔다.

- `pass`: 기준을 충족하고 근거가 명확하다.
- `weak`: 방향은 맞지만 표본이나 행동 증거가 약하다.
- `fail`: 기준을 충족하지 못했거나 반대 증거가 강하다.
- `unknown`: 질문하지 않았거나 기록이 부족하다.

최종 판단은 `pass` 개수만으로 자동 결정하지 않는다. 특히 `conditional`로 기록한 긍정은
어떤 조건이 붙었는지 `final-judgement.md`에 반드시 옮긴다.

CSV를 채운 뒤 아래 명령으로 scorecard 초안을 생성할 수 있다.

```bash
npm run validation:ops
```

`scorecard.csv`까지 갱신하려면 아래처럼 실행한다.

```bash
npm run validation:ops -- --write-scorecard
```

`cross_type_interest_graph`는 스크립트가 약한 행동이 발생한 공급 정보 유형을 기준으로
보조 판정한다. 실제로 같은 관심 기준으로 묶였는지는 `final-judgement.md`에서 사람이
다시 확인한다.

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

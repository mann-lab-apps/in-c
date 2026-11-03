# 승인된 계약으로 테스트 이행

사용자가 승인한 press 즉시 중단을 검증한다. 과거 테스트·실패 로그·828 시안은 다시 쓰지 않는다. 현재 파일의 기대값 변경은 다음 의미 변경에 한정한다.

| 검사 | 이전 의미 | 승인된 의미와 보존 대조군 |
| --- | --- | --- |
| hook overlay press | 실제 root scroll을 본 뒤 중단 | root UI press 직후, 움직임·release/cancel·blur와 무관하게 중단. root press 없는 scroll/내부 canvas click은 유지 |
| track/release frame | pending frame 안에서만 후보 유지 | frame 시간·새 일반 focus와 무관하게 수동 유지. 공개 following toggle로 재개 |
| SVG focus restore | automatic 여부로 pending 후보 유지/취소 | 두 경우 모두 이미 확정된 press 소유권 유지. 공개 following toggle은 실제 reveal 복구 |
| App 선택 | 무이동 root click 유지 | 무이동 native root click 중단. 내부 도크 클릭 대조군은 실제 dock target으로 전송해 유지 |
| App 입력 | native drag 뒤 중단 | drag와 무이동 click 모두 중단. 원본·caret·기존 history는 보존 |
| App dock resize | classic gutter만 검사 | overlay 무이동 press도 추가. 일반 내용 클릭은 실제 body target으로 유지 |

jsdom의 0 크기 기본값을 실제 native hit로 간주하지 않고, 각 native 사례에 body paint box와 root scroll range를 명시했다. 일반 내용·도크·body 밖 root·버튼·secondary/middle button·range 없음·horizontal range·dispose 대조군은 새 단위 15개에 포함된다.

수정 전 새 단위는 4실패/11통과였다. 관련 계약 전체의 red-b는 18실패/161통과였다. observer만 이행한 뒤 green-a는 12파일/179검사 및 typecheck PASS다. 기존 assertion을 삭제/완화하지 않고 승인된 시점과 복귀 계약을 더 명시적으로 검사했다. 새 App 입력/도크 사례는 각 1개다.

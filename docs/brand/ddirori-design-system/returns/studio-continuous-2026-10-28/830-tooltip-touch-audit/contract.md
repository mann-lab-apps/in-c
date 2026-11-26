# 830 — 터치 진단 화면의 Tooltip 소유권

829의실제1400캡처에caesura설명이보인다. 이것만으로잔류버그라고판정하지않는다. C30은focus/hover와설명영역안의pointer읽기를허용한다. native mouse로popover를조작한뒤CDP touch로스크롤한혼합입력이므로,정지한마우스밑으로trigger가이동했거나focus가남아있을수있다.

동일826제품·임시악보에서실제mouse move/over와touch를기록하고open tooltip의trigger/host/실제focus/:hover/마지막pointer/기하경계를대조한다. 설명owner가있으면정상현행으로기록한다. native mouse를설명/trigger밖의실제canvas padding으로옮기면hover-only설명이닫혀야한다. focus-owned설명은기존Escape계약으로닫고focus를보존한다. 실제hit·visibility·신뢰입력을유지하며DOM click/hidden호환경로를추가하지않는다.

이는별도Tooltip계약검사다. 829의1400 nested-touch movement실패를대체하거나PASS로바꾸지않는다. 먼저재현/관찰하고결함이확인된경우만기존공통계약범위에서수정한다. API확장이나touch전용UX정책은임의추가하지않는다.

# Clef & Staff Store Screenshot Checklist

App Store와 Play Console에 올리는 스크린샷은 실사용 기능을 보여주는 자료이며,
디버그 캡처나 빈 화면을 제출용으로 사용하지 않는다.

## Capture Gate

- `Clef & Staff` 앱 이름과 배포 대상 bundle/package가 맞는 빌드에서 캡처한다.
- Flutter `DEBUG` banner가 보이면 제출용으로 사용하지 않는다.
- 빈 viewer, 빈 필기 canvas, 맥락 없는 튜너 단독 화면은 제출용으로 사용하지 않는다.
- iPhone과 iPad는 각각 최소 3장 이상 준비한다.
- 같은 기능을 반복하지 않고, 홈/악보 보기/필기 또는 연습 도구를 나누어 보여준다.
- 개인정보, 실제 테스터 이름, 실제 파일 경로, 저작권이 불명확한 악보는 노출하지 않는다.
- 한국어 metadata와 공개 페이지 문구가 현재 App Store Connect 설명과 충돌하지 않는지 확인한다.

## Recommended Set

### iPhone

1. 홈/라이브러리: 검색, 필터, 최근 세트리스트가 보이되 좌우가 잘리지 않는 화면.
2. 악보 보기: 샘플 PDF가 실제로 렌더링되고 page turn/도구 메뉴 맥락이 보이는 화면.
3. 튜너 또는 메트로놈: chromatic tuner chart나 메트로놈 mini panel이 악보앱 맥락 안에서 보이는 화면.

### iPad

1. 홈/라이브러리: 태블릿 폭에서 악보 카드, 최근 항목, 정보 정리 rail이 구분되는 화면.
2. 악보 보기/2페이지 또는 page navigation: PDF가 충분히 크게 보이는 화면.
3. 필기: 펜/형광펜/도형/스탬프 toolbar와 실제 주석이 함께 보이는 화면.

## Reject Examples

- 화면 오른쪽 위에 `DEBUG` ribbon이 보이는 캡처.
- toolbar만 있고 악보 또는 주석 내용이 없는 연한 빈 화면.
- 튜너 card 하나만 너무 작게 중앙에 놓여 앱의 핵심 용도를 알기 어려운 화면.
- rail/card가 화면 밖으로 반쯤 잘려 주요 텍스트를 읽기 어려운 화면.
- 심사용 샘플이 아닌 개인 악보, 채팅 캡처, 파일 경로가 노출된 화면.

## Remaining Manual QA

스크린샷이 좋아 보여도 실제 품질 검증을 대체하지 않는다. 빠른 BPM 메트로놈 청감,
드론 음량, 실제 페달, 마이크/튜너 정확도, stylus 필기감, 장시간 연주 안정성은
별도 DEVICE QA로 남긴다.

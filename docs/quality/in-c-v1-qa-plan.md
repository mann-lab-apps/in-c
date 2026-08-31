# in C V1 QA Plan

## Smoke Flow

1. 앱을 처음 실행하고 onboarding sheet가 뜨는지 확인한다.
2. 관심 mood, context, 악기, 선호 플랫폼, 지역을 선택한다.
3. Today에서 30초 듣기 preview sheet를 연다.
4. 저장, reaction, 전체 듣기 link-out을 실행한다.
5. Work Detail로 이동해 metadata와 추천 shelf를 확인한다.
6. 추천 작품을 열고 recommendation click event가 쌓이는지 확인한다.
7. My Music에서 저장 작품과 reaction history를 확인한다.
8. Concerts에서 관련 공연, sponsored label, 예매처 link-out을 확인한다.
9. promotion card를 save/dismiss하고 우선순위가 낮아지는지 확인한다.

## Catalog QA

- Catalog Ops 화면에서 error count가 0인지 확인한다.
- listening moment 부족, 외부 link 부족, 악보 link 부족 값이 0인지 확인한다.
- program match 값이 expected program items와 같은지 확인한다.
- preview link coverage는 낮을 수 있으나, 공개 전 target 작품부터 순차 보강한다.

## Regression

- Clef library import, PDF opening, score detail, practice bridge가 깨지지 않았는지 확인한다.
- in C shell이 Clef 기본 앱 진입을 막지 않는지 확인한다.
- local 저장 상태가 앱 재시작 후 유지되는지 확인한다.
- 외부 플랫폼 link-out 실패 시 앱이 crash하지 않는지 확인한다.

## Release Risks

- 실제 KOPIS API 연동은 API key, rate limit, 필드 mapping을 운영 환경에서 확인해야 한다.
- 실제 preview playback은 플랫폼별 native channel 구현과 provider preview URL 정책 검증이 필요하다.
- 공연 광고 집행 전에는 sponsor disclosure 문구와 광고 심의 기준을 별도 확인한다.

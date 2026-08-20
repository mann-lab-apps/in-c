# Android 악보 뷰어 GitHub Issue 초안

작성일: 2026-08-20

## 1. Android 악보 뷰어 레퍼런스 분석

제목: Android 악보 뷰어 레퍼런스 분석 및 MVP 범위 정의

본문:

```markdown
## 배경

사용자 인터뷰에서 Galaxy 악보 앱 사용 중 내장 튜너 부재와 CamScanner류 PDF
하이퍼링크 제거 불가가 불편으로 확인되었다. Android 우선 신규 악보 뷰어 앱을
기획하기 위해 Piascore와 MobileSheets를 공식 문서/스토어 설명 기준으로 분석한다.

## 작업

- Piascore 기능 분석
- MobileSheets 기능 분석
- MobileSheets 기본 기능 coverage matrix 작성
- Android 차별화 포인트 정리
- MVP/V1/V2/Later 범위 분리

## 산출물

- `docs/product/sheet-viewer-reference-analysis.md`
- `docs/product/sheet-viewer-feature-map.md`
- `docs/product/sheet-viewer-mvp.md`

## 완료 기준

- 기능 범주별 비교표가 있다.
- MVP 범위와 비목표가 명확하다.
- PDF link annotation과 튜너가 차별화 기능으로 반영되어 있다.
```

## 2. Android PDF 뷰어 MVP

제목: Android PDF 악보 뷰어 MVP 구현

본문:

```markdown
## 배경

신규 악보 뷰어의 핵심은 공연 중 끊기지 않는 PDF 보기다. MobileSheets 기본 기대치에
맞춰 1페이지, 2페이지, 세로 스크롤, 반 페이지 넘김을 MVP에 포함한다.

## 작업

- PDF 가져오기
- 로컬 라이브러리 등록
- 1페이지 보기
- 2페이지 보기
- 세로 스크롤 보기
- 반 페이지 넘김
- 확대/축소/이동
- 마지막 위치 저장
- 대형 PDF 캐시/prefetch 정책 spike

## 완료 기준

- 100페이지 PDF에서 페이지 넘김이 체감상 끊기지 않는다.
- 마지막으로 본 페이지가 재실행 후 복원된다.
- Android 태블릿 화면에서 1페이지/2페이지/세로/반 페이지 보기 전환이 가능하다.
```

## 3. 내장 튜너

제목: 악보 화면 내장 크로매틱 튜너 MVP

본문:

```markdown
## 배경

사용자는 Android 악보 앱 안에 튜너가 없는 점을 아쉬움으로 언급했다. Piascore는
music tools에 chromatic tuner를 포함하므로, Android 악보 뷰어의 차별점으로 내장
튜너를 제공한다.

## 작업

- 마이크 권한 요청 흐름
- 실시간 pitch detection spike
- 현재 음 이름 표시
- cents 편차 표시
- A4 calibration 설정
- 악보 화면 overlay 또는 side sheet UI
- 소음 환경 기본 테스트

## 완료 기준

- 악보를 보다가 튜너를 열고 닫아도 페이지 상태가 유지된다.
- 단음 입력에서 현재 음과 cents 편차가 안정적으로 표시된다.
- 권한 거부 시 앱이 악보 뷰어 기능을 계속 사용할 수 있다.
```

## 4. PDF 링크 제거/비활성화

제목: PDF link annotation 탐지 및 제거 사본 생성

본문:

```markdown
## 배경

CamScanner류 PDF 오른쪽 하단 워터마크 영역에 홈페이지 링크가 걸려 있고, 사용자는
Galaxy 악보 앱에서 이 하이퍼링크를 제거할 수 없어 불편을 겪었다. visible watermark
제거는 비목표로 두고, link annotation 제거/비활성화에 집중한다.

## 작업

- PDF link annotation parser 후보 조사
- 페이지별 링크 영역 표시
- 뷰어에서 링크 탭 비활성화
- 선택한 link annotation 제거
- 원본 보존 및 사본 PDF 생성
- CamScanner류 샘플 PDF 확보 후 회귀 테스트

## 완료 기준

- 링크가 있는 PDF에서 페이지별 링크 영역을 확인할 수 있다.
- 사용자가 링크 탭 비활성화를 켜면 악보 화면에서 외부 URL이 열리지 않는다.
- 선택한 링크를 제거한 사본 PDF를 생성한다.
- 원본 PDF는 수정하지 않는다.
```

## 5. 주석/필기

제목: Android 태블릿 기본 주석/필기 MVP

본문:

```markdown
## 배경

악보 뷰어의 기본 기대 기능으로 리허설 메모와 공연 표시를 위한 필기가 필요하다.
MVP에서는 PDF 자체를 수정하지 않고 앱 내부 주석 레이어로 저장한다.

## 작업

- 펜
- 형광펜
- 지우개
- 텍스트
- 색상/두께 선택
- undo/redo
- 자동 저장
- 확대/회전/페이지 전환 후 좌표 보존
- S Pen 기본 입력 테스트

## 완료 기준

- 사용자가 PDF 위에 필기하고 재실행 후 같은 위치에서 확인할 수 있다.
- undo/redo가 stroke 단위로 동작한다.
- 원본 PDF는 수정되지 않는다.
```

## 6. 세트리스트/공연 모드

제목: 세트리스트와 공연 모드 MVP

본문:

```markdown
## 배경

MobileSheets는 세트리스트와 공연 중 안정적인 페이지 넘김을 핵심 기능으로 제공한다.
신규 앱도 공연 사용성을 MVP에서 검증해야 한다.

## 작업

- 세트리스트 생성/이름 변경/삭제
- 악보 추가/제거/순서 변경
- 세트리스트 순서대로 곡 사이 넘김
- 공연 모드 UI
- 실수 탭 방지
- Bluetooth 페달 기본 이전/다음 페이지 넘김

## 완료 기준

- 사용자가 10개 악보 세트리스트를 만들고 순서대로 넘길 수 있다.
- 공연 모드에서 편집 UI가 숨겨지고 큰 페이지 넘김 영역이 동작한다.
- Bluetooth 페달 1종 이상에서 이전/다음 페이지 넘김이 동작한다.
```
